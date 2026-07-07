import asyncio
import base64
import json
import logging
from datetime import datetime, UTC
from uuid import UUID

from app.domain.interfaces.memory_repository import IMemoryRepository
from app.infra.repositories.redis.cache_repository import RedisCacheRepository
from app.services.document_generation.document_generator import DocumentGenerator
from app.services.document_processing.document_manager import DocumentManager

logger = logging.getLogger(__name__)

STATUS_QUEUED = "queued"
STATUS_PROCESSING = "processing"
STATUS_COMPLETED = "completed"
STATUS_FAILED = "failed"


async def run_document_generation_worker(
    cache_repo: RedisCacheRepository,
    document_manager: DocumentManager,
    memory_repo: IMemoryRepository,
    stop_event: asyncio.Event,
) -> None:
    generator = DocumentGenerator()

    while not stop_event.is_set():
        job_id = None
        try:
            job_id = await cache_repo.pop_document_job(timeout=5)
            if not job_id:
                continue

            job = await cache_repo.get_document_job(job_id)
            if not job:
                logger.warning("Document generation job missing metadata: %s", job_id)
                continue

            await cache_repo.update_document_job(
                job_id,
                status=STATUS_PROCESSING,
                updated_at=datetime.now(UTC).isoformat(),
            )

            content_json = await cache_repo.get_document_job_content(job_id)
            if content_json is None:
                raise ValueError("Missing queued document content")

            content = json.loads(content_json)
            file_bytes = generator.generate(content, fmt=job["format"])
            if not file_bytes:
                raise ValueError("Generated document is empty")

            file_id = None
            storage_path = None
            if job.get("session_id"):
                try:
                    await document_manager.process_document(
                        file_content=file_bytes,
                        filename=job["filename"],
                        session_id=UUID(job["session_id"]),
                        user_id=UUID(job["user_id"]),
                        tags=["generated", job["format"], "async"],
                        metadata={"upload_source": "generation_async"},
                    )
                except Exception as e:
                    logger.warning(
                        "Failed to save async generated document to store: %s", e
                    )

                try:
                    storage_path = f"ai_files/{job['session_id']}/{job['filename']}"
                    file_id = await memory_repo.save_ai_file(
                        session_id=job["session_id"],
                        user_id=job["user_id"],
                        file_type=job["format"],
                        storage_path=storage_path,
                        file_name=job["filename"],
                        metadata={
                            "generated_at": datetime.now(UTC).isoformat(),
                            "generator": "DocumentGenerator",
                            "async": True,
                        },
                    )
                except Exception as e:
                    logger.warning("Failed to save AI generated file metadata: %s", e)

            await cache_repo.save_document_job_file(job_id, file_bytes)
            await cache_repo.update_document_job(
                job_id,
                status=STATUS_COMPLETED,
                file_id=file_id,
                storage_path=storage_path,
                updated_at=datetime.now(UTC).isoformat(),
            )
            logger.info("Document generation job completed: %s", job_id)

        except Exception as e:
            logger.exception("Document generation worker failed for job_id=%s", job_id)
            if job_id:
                await cache_repo.update_document_job(
                    job_id,
                    status=STATUS_FAILED,
                    error=str(e),
                    updated_at=datetime.now(UTC).isoformat(),
                )
        finally:
            await asyncio.sleep(0.1)
