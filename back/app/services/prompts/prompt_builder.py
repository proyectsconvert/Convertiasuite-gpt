import logging
from typing import Optional

from app.domain.contracts import PromptContract
from app.schemas.chat import UserRole
from .prompt_templates import BASE_IDENTITY_PROMPT, DOMAIN_PROMPTS

logger = logging.getLogger(__name__)


class PromptBuilder:


    DOMAIN_ROLE_MAPPING = {
        UserRole.code.value: "dev",
        UserRole.vision.value: "bi",  
        UserRole.analysis.value: "bi",  
        UserRole.reasoning.value: "dev",  
        UserRole.ocr.value: "bi",  
        UserRole.medical.value: "dev",  
        UserRole.gemma_small.value: "dev",
        UserRole.gemma_medium.value: "dev",
    }

    @staticmethod
    def build_with_contract(
        user_message: str,
        contract: PromptContract,
        conversation_history: Optional[list[dict]] = None,
        context: Optional[str] = None,
    ) -> str:
        sections = []

        sections.append(BASE_IDENTITY_PROMPT)

        domain_key = PromptBuilder.DOMAIN_ROLE_MAPPING.get(contract.role, "dev")
        domain_prompt = DOMAIN_PROMPTS.get(domain_key, "")
        if domain_prompt:
            sections.append(domain_prompt)

        sections.append(contract.to_system_prompt_section())

        if context:
            sections.append(f"""
CONTEXT / INFORMACIÓN ADJUNTA:
{context}

Usa esta información para responder la pregunta del usuario.
""")

        if conversation_history:
            sections.append(PromptBuilder._format_history(conversation_history))

        sections.append(f"""
USER MESSAGE (responde a esto):
{user_message}
""")

        final_prompt = "\n".join(sections)

        logger.debug(
            f"Built prompt for role={contract.role}, length={len(final_prompt)}"
        )

        return final_prompt

    @staticmethod
    def build_simple(
        user_message: str,
        role: str = UserRole.default.value,
        context: Optional[str] = None,
    ) -> str:
        contract = PromptContract.for_role(role)
        return PromptBuilder.build_with_contract(
            user_message=user_message,
            contract=contract,
            conversation_history=None,
            context=context,
        )

    @staticmethod
    def _format_history(history: list[dict]) -> str:
        if not history:
            return ""

        formatted = "\nCONVERSATION HISTORY:\n"

        # Limitar a últimos 10 mensajes para evitar contexto muy largo
        recent = history[-10:]

        for msg in recent:
            role = msg.get("role", "unknown").upper()
            content = msg.get("content", "")

            if len(content) > 500:
                content = content[:500] + "..."

            formatted += f"{role}: {content}\n"

        return formatted

    @staticmethod
    def get_template_for_role(role: str) -> Optional[str]:
        domain_key = PromptBuilder.DOMAIN_ROLE_MAPPING.get(role, "dev")
        return DOMAIN_PROMPTS.get(domain_key)
