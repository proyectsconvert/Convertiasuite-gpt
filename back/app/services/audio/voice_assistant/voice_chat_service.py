from __future__ import annotations

from app.schemas.chat import ChatRequest
from app.services.chat.chat_service import process_chat
from app.dependencies.chat_deps import (
    resolve_user_access_context,
    resolve_agent_context,
    classify_query_safely,
    log_agent_query,
)


class VoiceChatService:
    def __init__(
        self,
        *,
        llm_provider,
        memory_repo,
        document_manager,
        intent_classifier,
        rag_repository,
        campaign_repository,
    ):
        self._llm = llm_provider
        self._memory = memory_repo
        self._docs = document_manager
        self._classifier = intent_classifier
        self._rag = rag_repository
        self._campaigns = campaign_repository

    async def handle_message(
        self, *, user_id: str, user_role: str, message: str, call_id: str | None
    ) -> str:
        access_context = await resolve_user_access_context(user_id, self._campaigns)
        agent_context = await resolve_agent_context(user_id, self._campaigns)

        chat_request = ChatRequest(
            message=message,
            user_role=user_role,
            session_id=call_id,
        )

        _stream, _model, session_id, rag_info = await process_chat(
            chat_request,
            self._llm,
            self._memory,
            user_id=user_id,
            document_manager=self._docs,
            intent_classifier=self._classifier,
            rag_repository=self._rag,
            access_context=access_context,
            campaign_context=agent_context,
            agent_mode=bool(agent_context),
        )

        if agent_context:
            category = await classify_query_safely(self._classifier, message)
            await log_agent_query(
                self._campaigns,
                user_id=user_id,
                campaign_id=agent_context["campaign_id"],
                campaign_role=agent_context["campaign_role"],
                query_text=message,
                query_category=category,
                rag_used=rag_info.get("used", False),
                rag_sources=rag_info.get("sources", []),
            )

        return session_id