from fastapi import Depends

from app.dependencies.chat_deps import (
    get_llm_provider,
    get_memory_repo,
    get_document_manager,
    get_intent_classifier,
    get_rag_repository,
    get_campaign_repository,
)
from app.infra.clients.tts_client import QwenTTSClient
from app.services.audio.calls.transcription_service import transcribe_audio
from app.services.chat.storage_service import upload_file_to_supabase
from app.services.voice.voice_service import VoiceService
from app.services.voice.voice_chat_service import VoiceChatService


def get_voice_service(
    llm_provider=Depends(get_llm_provider),
    memory_repo=Depends(get_memory_repo),
) -> VoiceService:
    return VoiceService(
        transcriber=transcribe_audio,
        tts_client=QwenTTSClient(),
        llm_provider=llm_provider,
        memory_repo=memory_repo,
        storage=upload_file_to_supabase,
    )


def get_voice_chat_service(
    llm_provider=Depends(get_llm_provider),
    memory_repo=Depends(get_memory_repo),
    document_manager=Depends(get_document_manager),
    intent_classifier=Depends(get_intent_classifier),
    rag_repository=Depends(get_rag_repository),
    campaign_repository=Depends(get_campaign_repository),
) -> VoiceChatService:
    return VoiceChatService(
        llm_provider=llm_provider,
        memory_repo=memory_repo,
        document_manager=document_manager,
        intent_classifier=intent_classifier,
        rag_repository=rag_repository,
        campaign_repository=campaign_repository,
    )