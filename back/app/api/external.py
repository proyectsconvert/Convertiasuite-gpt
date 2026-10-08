from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
import logging
import uuid
import time
import asyncio
from datetime import datetime, UTC
from typing import Optional

from app.services.audit.api_audit_service import log_api_request

# Importamos la validación de API Key y las dependencias de Chat
from app.dependencies.auth import verify_api_key
from app.api.chat import (
    process_chat,
    get_llm_provider,
    get_memory_repo,
    get_document_manager,
    get_intent_classifier,
    get_rag_repository,
    get_campaign_repository,
    log_agent_query,
    classify_query_safely
)
from app.schemas.chat import ChatRequest

logger = logging.getLogger(__name__)

# Creamos el router asegurando que TODOS sus endpoints pasen por la validación de API Key
router = APIRouter(
    prefix="/v1/external",
    tags=["external-api"],
    dependencies=[Depends(verify_api_key)]
)

# Namespace fijo para derivar UUIDs B2B determinísticos
_B2B_NAMESPACE = uuid.UUID("a1b2c3d4-e5f6-7890-abcd-ef1234567890")


class ExternalChatResponse(BaseModel):
    status: str = Field(..., description="Estado de la petición (ej. 'success')")
    session_id: str = Field(..., description="ID de la sesión de chat (UUID). Envíalo en futuros mensajes para continuar el hilo.")
    response: str = Field(..., description="Respuesta generada por el agente de Inteligencia Artificial.")
    timestamp: str = Field(..., description="Fecha y hora UTC en que se generó la respuesta (ISO 8601).")


class ExternalChatRequest(BaseModel):
    session_id: Optional[str] = Field(
        None,
        description="ID de la sesión para continuar una conversación existente. Si se omite, se crea una nueva."
    )
    end_user_id: str = Field(
        ...,
        description="Identificador único del usuario final en tu plataforma (ej. número telefónico o ID de base de datos)."
    )
    message: str = Field(
        ...,
        description="Mensaje de texto enviado por el usuario."
    )
    campaign_id: Optional[str] = Field(
        None,
        description="ID de la campaña en OlivIA para cargar las Skills y contextos específicos."
    )
    department_id: Optional[str] = Field(
        None,
        description="ID de departamento para forzar un contexto específico (opcional)."
    )

    class Config:
        json_schema_extra = {
            "example": {
                "end_user_id": "cliente_54321",
                "message": "Hola, ¿pueden darme información sobre mis deudas?",
                "campaign_id": "8f7d6e5c-4b3a-2109-8765-43210fedcba9",
                "department_id": None
            }
        }


async def _ensure_b2b_user_exists(
    supabase_admin,
    user_id: str,
    tenant_id: str,
    end_user_id: str,
) -> None:
    """
    Garantiza que el usuario B2B exista en auth.users antes de crear una sesión.

    La tabla chat_sessions tiene una FK: user_id → auth.users(id).
    Los usuarios externos B2B no pasan por el login de Supabase, por lo que
    los registramos aquí de forma automática con un email ficticio estable.
    La operación es idempotente: si el usuario ya existe, no hace nada.
    """
    try:
        fake_email = f"b2b_{user_id}@external.olivia.internal"

        supabase_admin.auth.admin.create_user({
            "id": user_id,
            "email": fake_email,
            "email_confirm": True,
            "user_metadata": {
                "type": "b2b_external",
                "tenant_id": tenant_id,
                "end_user_id": end_user_id,
            },
        })
        logger.info(
            "Usuario B2B creado en auth.users user_id=%s tenant_id=%s end_user_id=%s",
            user_id, tenant_id, end_user_id,
        )
    except Exception as e:
        err_msg = str(e)
        # "already exists" / duplicado → comportamiento esperado en peticiones posteriores
        if any(kw in err_msg.lower() for kw in ("already", "duplicate", "23505")):
            logger.debug("Usuario B2B ya existe en auth.users user_id=%s (OK)", user_id)
        else:
            # Cualquier otro error lo registramos pero NO bloqueamos el flujo;
            # el peor caso es que create_session falle con FK y se maneje arriba.
            logger.warning(
                "No se pudo garantizar usuario B2B en auth.users user_id=%s error=%s",
                user_id, err_msg,
            )


@router.post(
    "/chat",
    response_model=ExternalChatResponse,
    summary="Enviar mensaje a OlivIA",
    description=(
        "Procesa un mensaje de texto de un usuario externo y devuelve la respuesta "
        "generada por la Inteligencia Artificial. "
        "Requiere pasar el token en el header `X-API-Key`."
    ),
)
async def external_chat(
    request: ExternalChatRequest,
    http_request: Request,
    current_tenant: dict = Depends(verify_api_key),
    llm_provider=Depends(get_llm_provider),
    memory_repo=Depends(get_memory_repo),
    document_manager=Depends(get_document_manager),
    intent_classifier=Depends(get_intent_classifier),
    rag_repository=Depends(get_rag_repository),
    campaign_repository=Depends(get_campaign_repository),
):
    request_start = time.perf_counter()
    api_key_id = str(current_tenant["id"])
    tenant_id = str(current_tenant["id"])
    session_id_out = None
    full_response = ""
    status_code = 500
    error_detail = None

    try:
        # Convertimos la petición externa al formato interno que espera process_chat.
        # Los usuarios externos no tienen perfil interno, se usa el rol predeterminado.
        internal_request = ChatRequest(
            message=request.message,
            session_id=request.session_id,
            user_role="default",
        )

        # UUID v5 estable derivado del par (tenant_id, end_user_id).
        # Garantiza aislamiento por tenant y continuidad de sesiones entre llamadas.
        internal_user_id = str(
            uuid.uuid5(_B2B_NAMESPACE, f"b2b_{tenant_id}_{request.end_user_id}")
        )

        # Registra el usuario B2B en auth.users si aún no existe,
        # para satisfacer la FK chat_sessions.user_id → auth.users(id).
        # Ruta: CompositeMemoryRepository → db (SupabaseMemoryRepository) → client (SupabaseClient) → admin
        supabase_admin = memory_repo.db.client.admin
        await _ensure_b2b_user_exists(
            supabase_admin, internal_user_id, tenant_id, request.end_user_id
        )

        # Contexto de campaña si el integrador especifica una
        agent_context = None
        if request.campaign_id:
            agent_context = {
                "campaign_id": request.campaign_id,
                "campaign_role": "bot_externo",
                "campaign_name": "API Externa",
                "campaign_data": {},
            }

        # Ejecutamos el motor de chat de OlivIA
        stream, model, session_id_out, rag_info = await process_chat(
            internal_request,
            llm_provider,
            memory_repo,
            user_id=internal_user_id,
            document_manager=document_manager,
            intent_classifier=intent_classifier,
            rag_repository=rag_repository,
            access_context={"tenant_id": tenant_id},
            campaign_context=agent_context,
            agent_mode=bool(agent_context),
        )

        # Endpoint B2B síncrono: consumimos el stream y devolvemos texto completo
        full_response = ""
        async for chunk in stream:
            if chunk:
                full_response += chunk

        # Registramos la interacción si pertenece a una campaña
        if agent_context:
            query_category = await classify_query_safely(intent_classifier, request.message)
            await log_agent_query(
                campaign_repository,
                user_id=internal_user_id,
                campaign_id=agent_context["campaign_id"],
                campaign_role=agent_context["campaign_role"],
                query_text=request.message,
                query_category=query_category,
                rag_used=rag_info.get("used", False),
                rag_sources=rag_info.get("sources", []),
            )

        status_code = 200
        result = {
            "status": "success",
            "session_id": session_id_out,
            "response": full_response,
            "timestamp": datetime.now(UTC).isoformat(),
        }

        # Registrar en la tabla auditora (no bloqueante)
        asyncio.create_task(log_api_request(
            api_key_id=api_key_id,
            endpoint="/v1/external/chat",
            method="POST",
            status_code=status_code,
            end_user_id=request.end_user_id,
            internal_user_id=internal_user_id,
            campaign_id=request.campaign_id,
            department_id=request.department_id,
            session_id=session_id_out,
            duration_ms=int((time.perf_counter() - request_start) * 1000),
            message_preview=request.message,
            response_preview=full_response,
            ip_address=http_request.client.host if http_request.client else None,
            user_agent=http_request.headers.get("user-agent"),
        ))

        return result

    except Exception as e:
        error_detail = str(e)
        logger.error(f"Error procesando chat B2B externo: {e}", exc_info=True)

        # Registrar el error en auditoría también
        asyncio.create_task(log_api_request(
            api_key_id=api_key_id,
            endpoint="/v1/external/chat",
            method="POST",
            status_code=500,
            end_user_id=request.end_user_id,
            campaign_id=request.campaign_id,
            department_id=request.department_id,
            duration_ms=int((time.perf_counter() - request_start) * 1000),
            message_preview=request.message,
            error_detail=error_detail,
            ip_address=http_request.client.host if http_request.client else None,
            user_agent=http_request.headers.get("user-agent"),
        ))

        raise HTTPException(
            status_code=500,
            detail="Error interno procesando la solicitud externa",
        )
