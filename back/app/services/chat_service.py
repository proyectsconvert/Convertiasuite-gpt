from click import prompt

from app.security.input_sanitizer import sanitize_input
from app.security.output_guard import sanitize_output
from app.services.model_router import route_model
from app.domain.interfaces.llm_provider import ILlmProvider
from app.domain.interfaces.memory_repository import IMemoryRepository
from app.core.model_config import MODELS, DEFAULT_MODEL_KEY
from app.domain.entities.message import Message
from app.services.prompts.prompt_templates import build_prompt
import uuid
from datetime import datetime

from app.domain.interfaces import llm_provider


def get_messages_key(session_id: str) -> str:
    return f"chat:messages:{session_id}"


async def process_chat(
    request,
    llm_provider: ILlmProvider,
    memory_repo: IMemoryRepository,
):
    clean_input = sanitize_input(request.message)

    if not clean_input:
        raise ValueError("Input vacío")

    model_key = route_model(
        message=clean_input,
        user_role=request.user_role,
        has_attachment=request.has_attachment,
    )

    session_id = request.session_id or str(uuid.uuid4())
    messages_key = get_messages_key(session_id)

    messages = await memory_repo.get(messages_key) or []
    messages = [Message.from_dict(m) if isinstance(m, dict) else m for m in messages]

    # append user message
    messages.append(Message(
        id=str(uuid.uuid4()),
        role="user",
        content=clean_input,
        timestamp=datetime.now(),
    ))

    # Build prompt using template
    prompt = build_prompt(messages, model_key)

    stream = llm_provider.generate_stream(messages, model_key)

    async def wrapped_stream():
        full_response = ""

        async for chunk in stream:
            safe_chunk = sanitize_output(chunk)
            full_response += safe_chunk
            yield safe_chunk

            # Periodic persistence to avoid loss
            if len(full_response) % 200 == 0:
                await memory_repo.set(messages_key, [m.to_dict() for m in messages])

        # Save assistant message
        messages.append(Message(
            id=str(uuid.uuid4()),
            role="assistant",
            content=full_response,
            timestamp=datetime.now(),
        ))

        await memory_repo.set(messages_key, [m.to_dict() for m in messages])

    return wrapped_stream(), MODELS[model_key]["model"], session_id


async def get_sessions(user_id: str, memory_repo):
    return await memory_repo.get_session_list(user_id)


async def create_session(user_id: str, title: str, memory_repo):
    return await memory_repo.create_session(user_id, title)


async def delete_session(user_id: str, session_id: str, memory_repo):
    await memory_repo.delete_session(user_id, session_id)