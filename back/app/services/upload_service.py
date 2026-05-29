import logging
from typing import Optional
from uuid import UUID
from fastapi import UploadFile, HTTPException
from app.services.Files_Processor.file_processor import FileProcessorFactory
from app.services.Files_Processor.document_manager import DocumentManager
from app.domain.interfaces.attachment_repository import IAttachmentRepository

logger = logging.getLogger(__name__)


class UploadService:
    def __init__(self, document_manager: DocumentManager, attachment_repo: IAttachmentRepository):
        self.document_manager = document_manager
        self.attachment_repo = attachment_repo

    async def process_upload(
        self,
        file: UploadFile,
        session_id: Optional[str],
        user_id: str,
    ) -> dict:
        parser_fn, attachment_type = FileProcessorFactory.get_parser(file.filename, file.content_type)
        if not parser_fn:
            raise HTTPException(
                status_code=400,
                detail="Formato de archivo no soportado (use PDF, Word, Excel, CSV, TXT, MD, JSON o imágenes PNG/JPG/JPEG/WEBP)",
            )

        try:
            contents = await file.read()
            extracted_text = parser_fn(contents)

            if attachment_type == "image":
                truncated_text = extracted_text
            else:
                max_characters = 32000
                truncated_text = extracted_text[:max_characters]

                if len(extracted_text) > max_characters:
                    truncated_text += "\n[... Archivo truncado por exceso de tamaño. Use herramientas de resumen o divida en secciones. ...]"

            if session_id:
                # Save to document store via DocumentManager
                try:
                    await self.document_manager.process_document(
                        file_content=contents,
                        filename=file.filename,
                        session_id=UUID(session_id),
                        user_id=UUID(user_id),
                        tags=[attachment_type],
                        metadata={"upload_source": "chat"},
                    )
                except Exception as doc_err:
                    logger.warning(f"Failed to process document in store: {doc_err}")

                # Save attachment to chat_attachments table
                storage_path = f"attachments/{session_id}/{file.filename}"
                await self.attachment_repo.save_attachment(
                    session_id=session_id,
                    storage_path=storage_path,
                    file_name=file.filename,
                    mime_type=attachment_type,
                    file_size=len(contents),
                    extracted_text=truncated_text,
                )

            logger.info(
                "Archivo procesado exitosamente por UploadService",
                extra={
                    "user_id": user_id,
                    "uploaded_filename": file.filename,
                    "session_id": session_id,
                    "length": len(truncated_text),
                    "attachment_type": attachment_type,
                },
            )

            return {
                "filename": file.filename,
                "attachments": [{"filename": file.filename, "type": attachment_type}],
                "extracted_context": truncated_text,
                "attachment_type": attachment_type,
            }

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error processing upload: {e}")
            raise HTTPException(
                status_code=500,
                detail=f"Error al procesar el archivo: {str(e)}",
            )
