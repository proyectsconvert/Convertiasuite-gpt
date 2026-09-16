from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from app.dependencies.auth import get_current_user
from fastapi import Request

def get_campaign_repository(request: Request):
    return request.app.state.campaign_repository
from app.infra.repositories.supabase.campaign_repository import (
    SupabaseCampaignRepository as CampaignRepository,
)


router = APIRouter(
    prefix="/admin/qa",
    tags=["Analytics"],
)


ALLOWED_ROLES = ["admin", "quality_analyst"]


from app.dependencies.auth import require_admin_or_qa

async def get_scoped_campaign_id(
    request: Request,
    campaign_id: Optional[str] = Query(
        None,
        description="ID de la campaña",
    ),
    current_user: Dict[str, Any] = Depends(require_admin_or_qa),
) -> Optional[str]:
    """
    Valida el rol y resuelve el campaign_id que realmente debe
    usarse en la consulta.

    - admin o QA: puede pedir cualquier campaign_id, o None (todas).
    """
    user_role = (current_user.get("role") or "").lower()
    functional_role = (current_user.get("functional_role") or "").lower()

    if user_role == "admin" or "qa" in functional_role or "quality" in functional_role:
        return campaign_id
        
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="No tienes permiso para acceder a esta sección.",
    )


@router.get(
    "/summary",
    response_model=Dict[str, Any],
)
async def get_qa_summary(
    campaign_id: Optional[str] = Depends(get_scoped_campaign_id),
    days: int = Query(
        30,
        ge=1,
        le=365,
        description="Ventana de días",
    ),
    repo: CampaignRepository = Depends(get_campaign_repository),
):
    return await repo.get_qa_summary(
        campaign_id=campaign_id,
        days=days,
    )


@router.get(
    "/categories",
    response_model=List[Dict[str, Any]],
)
async def get_qa_categories(
    campaign_id: Optional[str] = Depends(get_scoped_campaign_id),
    days: int = Query(
        30,
        ge=1,
        le=365,
        description="Ventana de días",
    ),
    repo: CampaignRepository = Depends(get_campaign_repository),
):
    return await repo.get_category_distribution(
        campaign_id=campaign_id,
        days=days,
    )


@router.get(
    "/top-queries",
    response_model=List[Dict[str, Any]],
)
async def get_top_queries(
    campaign_id: Optional[str] = Depends(get_scoped_campaign_id),
    category: Optional[str] = Query(
        None,
        description="Filtrar por categoría",
    ),
    days: int = Query(
        30,
        ge=1,
        le=365,
        description="Ventana de días",
    ),
    limit: int = Query(
        30,
        ge=1,
        le=100,
        description="Límite de registros",
    ),
    repo: CampaignRepository = Depends(get_campaign_repository),
):
    return await repo.get_top_querys(
        campaign_id=campaign_id,
        days=days,
        limit=limit,
    )


@router.get(
    "/insights",
    response_model=List[Dict[str, Any]],
)
async def get_qa_insights(
    campaign_id: Optional[str] = Depends(get_scoped_campaign_id),
    repo: CampaignRepository = Depends(get_campaign_repository),
):
    insights: List[Dict[str, Any]] = []

    # 1. Análisis por categoría

    categories = await repo.get_category_distribution(
        campaign_id=campaign_id,
        days=30,
    )

    for category in categories:
        if (
            category["percentage"] > 40.0
            and category["category"] != "Sin categoría"
        ):
            insights.append(
                {
                    "id": f"brecha_cat_{category['category']}",
                    "level": "high",
                    "title": (
                        "Alta concentración en categoría "
                        f"{category['category']}"
                    ),
                    "finding": (
                        f"La categoría '{category['category']}' "
                        f"representa el {category['percentage']}% "
                        "del total de consultas."
                    ),
                    "recommendation": (
                        "Revisar la documentación RAG asociada a "
                        f"'{category['category']}' o programar "
                        "capacitación de refuerzo para los agentes."
                    ),
                }
            )

    # 2. Reiteración de preguntas

    top_queries_7d = await repo.get_top_querys(
        campaign_id=campaign_id,
        days=7,
        limit=10,
    )

    for query in top_queries_7d:
        if query["count"] >= 30:
            query_text = query["query_text"]

            insights.append(
                {
                    "id": f"brecha_query_{hash(query_text)}",
                    "level": "medium",
                    "title": "Frecuencia crítica en consulta específica",
                    "finding": (
                        f"La consulta '{query_text[:60]}...' "
                        f"se repitió {query['count']} veces "
                        "en los últimos 7 días."
                    ),
                    "recommendation": (
                        "Agregar una acción rápida al Widget Olivia "
                        "o actualizar el script operativo de la campaña."
                    ),
                }
            )

    # 3. Análisis de tasa RAG

    summary = await repo.get_qa_summary(
        campaign_id=campaign_id,
        days=30,
    )

    if (
        summary["total_queries"] > 10
        and summary["rag_rate"] < 50.0
    ):
        insights.append(
            {
                "id": "brecha_rag_low",
                "level": "info",
                "title": "Baja tasa de resolución vía RAG",
                "finding": (
                    f"Solo el {summary['rag_rate']}% de las consultas "
                    "utilizaron fuentes RAG de la base de conocimiento."
                ),
                "recommendation": (
                    "Verificar la ingesta de documentos en la campaña "
                    "y la actualización de los chunks de conocimiento."
                ),
            }
        )

    return insights


@router.get("/audit-log", response_model=Dict[str, Any])
async def get_audit_log(
    campaign_id: Optional[str] = Depends(get_scoped_campaign_id),
    agent_id: Optional[str] = Query(None, description="ID del agente"),
    category: Optional[str] = Query(None, description="Categoría"),
    date_from: Optional[str] = Query(None, description="Fecha inicial ISO"),
    date_to: Optional[str] = Query(None, description="Fecha final ISO"),
    page: int = Query(1, ge=1, description="Número de página"),
    limit: int = Query(50, ge=1, le=200, description="Registros por página"),
    repo: CampaignRepository = Depends(get_campaign_repository),
):
    return await repo.get_audit_log(
        campaign_id=campaign_id,
        agent_id=agent_id,
        category=category,
        date_from=date_from,
        date_to=date_to,
        page=page,
        limit=limit,
    )