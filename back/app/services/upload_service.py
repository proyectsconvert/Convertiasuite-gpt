import logging
from typing import Optional
from uuid import UUID
from fastapi import UploadFile, HTTPException
from app.services.document_processing.document_manager import DocumentManager
from app.domain.interfaces.attachment_repository import IAttachmentRepository

logger = logging.getLogger(__name__)


class UploadService:
    def __init__(
        self, document_manager: DocumentManager, attachment_repo: IAttachmentRepository
    ):
        self.document_manager = document_manager
        self.attachment_repo = attachment_repo

    async def process_upload(
        self,
        file: UploadFile,
        session_id: Optional[str],
        user_id: str,
    ) -> dict:
        filename_lower = file.filename.lower()
        is_image = filename_lower.endswith((".png", ".jpg", ".jpeg", ".webp")) or (
            file.content_type and file.content_type.startswith("image/")
        )

        try:
            contents = await file.read()
            if is_image:
                import base64

                extracted_text = base64.b64encode(contents).decode("utf-8")
                attachment_type = "image"
            else:
                processor = (
                    self.document_manager.processor_factory.get_processor_by_extension(
                        file.filename
                    )
                )
                if not processor:
                    raise HTTPException(
                        status_code=400,
                        detail="Formato de archivo no soportado (use PDF, Word, Excel, CSV, TXT, MD, JSON o imágenes PNG/JPG/JPEG/WEBP)",
                    )
                parsed_content = await processor.parse(contents, file.filename)
                extracted_text = parsed_content.text

                ext = (
                    file.filename.rsplit(".", 1)[1].lower()
                    if "." in file.filename
                    else ""
                )
                if ext in ("docx", "doc"):
                    attachment_type = "word"
                elif ext in ("xlsx", "xls"):
                    attachment_type = "excel"
                else:
                    attachment_type = processor.supported_type.value

            if attachment_type == "image":
                truncated_text = extracted_text
            elif attachment_type in ("csv", "excel"):
                # Los archivos tabulares se procesan por chunks en chat_service.py.
                # Aquí pasamos el texto completo sin truncar.
                # Solo aplicamos un cap de seguridad extremo para evitar OOM en casos anómalos.
                safety_cap = 500_000  # ~125K tokens — límite de emergencia
                if len(extracted_text) > safety_cap:
                    logger.warning(
                        "Archivo tabular excede el cap de seguridad (%d chars). "
                        "Truncando a %d chars. Considera dividir el archivo.",
                        len(extracted_text),
                        safety_cap,
                    )
                    truncated_text = extracted_text[:safety_cap]
                else:
                    truncated_text = extracted_text
            else:
                # Documentos no tabulares (PDF, DOCX, TXT, etc.)
                max_characters = 60_000  # ampliado desde 32K
                truncated_text = extracted_text[:max_characters]

                if len(extracted_text) > max_characters:
                    logger.warning(
                        "Documento '%s' truncado de %d a %d chars.",
                        file.filename,
                        len(extracted_text),
                        max_characters,
                    )
                    truncated_text += "\n[... Documento extenso: solo se procesaron los primeros fragmentos. ...]"

            try:
                await self.document_manager.process_document(
                    file_content=contents,
                    filename=file.filename,
                    session_id=UUID(session_id) if session_id else None,
                    user_id=UUID(user_id),
                    tags=[attachment_type],
                    metadata={"upload_source": "chat"},
                )
            except Exception as doc_err:
                logger.warning(f"Failed to process document in store: {doc_err}")

            if session_id:
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
