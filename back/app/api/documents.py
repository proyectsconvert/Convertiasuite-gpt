import logging
import re
from uuid import UUID
import io
from datetime import datetime
from typing import Any, Dict, Optional, Union
from pydantic import BaseModel
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, Request
from fastapi.responses import StreamingResponse
from app.dependencies.auth import get_current_user
from app.services.document_processing.document_manager import DocumentManager
from app.services.storage_service import upload_file_to_supabase
from app.services.document_generation.document_generator import DocumentGenerator
from app.domain.entities.document_content import DocumentContent
from app.domain.interfaces.memory_repository import IMemoryRepository
from fastapi import Response


def matches_document_filters(
    doc,
    search=None,
    type=None,
    tag=None,
    area=None,
    user=None,
    date_from=None,
    date_to=None,
    current_user=None,
):
    if search:
        needle = search.lower()
        haystack = " ".join(
            [
                getattr(doc, "filename", "").lower(),
                doc.parsed_content.to_searchable_text().lower(),
                " ".join(getattr(doc, "tags", [])).lower(),
            ]
        )
        if needle not in haystack:
            return False

    if type and getattr(doc.type, "value", None) != type:
        return False

    if tag and tag not in {t.lower() for t in getattr(doc, "tags", [])}:
        return False

    if area:
        area_value = str(doc.metadata.get("area", "")).lower()
        current_area = str((current_user or {}).get("area", "")).lower()
        if area.lower() not in area_value and area.lower() not in current_area:
            return False

    if user:
        user_value = str(doc.metadata.get("user", "")).lower()
        current_name = str((current_user or {}).get("name", "")).lower()
        if user.lower() not in user_value and user.lower() not in current_name:
            return False

    if date_from:
        try:
            if doc.created_at < datetime.fromisoformat(date_from):
                return False
        except ValueError:
            pass

    if date_to:
        try:
            if doc.created_at > datetime.fromisoformat(date_to):
                return False
        except ValueError:
            pass

    return True


logger = logging.getLogger(__name__)

_document_generator: Optional[DocumentGenerator] = None


def get_document_generator() -> DocumentGenerator:
    global _document_generator
    if _document_generator is None:
        _document_generator = DocumentGenerator()
    return _document_generator


router = APIRouter(prefix="/api/documents", tags=["documents"])


def get_document_manager(request: Request) -> DocumentManager:
    return request.app.state.document_manager


def get_memory_repo(request: Request) -> IMemoryRepository:
    return request.app.state.memory


def _remove_system_export_json_blocks(content: Any) -> Any:
    if not isinstance(content, str):
        return content

    cleaned = re.sub(
        r"<<<\s*SYSTEM[_ ]?EXPORT[_ ]?JSON\s*>>>[\s\S]*?<<<\s*END[_ ]?SYSTEM[_ ]?EXPORT[_ ]?JSON\s*>>>",
        "",
        content,
        flags=re.IGNORECASE,
    )
    cleaned = re.sub(
        r"<<<\s*SYSTEM[_ ]?EXPORT[_ ]?JSON\s*>>>[\s\S]*$",
        "",
        cleaned,
        flags=re.IGNORECASE,
    )
    return cleaned.strip()


@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    session_id: Optional[str] = Form(None),
    tags: Optional[list[str]] = Form(None),
    current_user: dict = Depends(get_current_user),
    document_manager: DocumentManager = Depends(get_document_manager),
):
    try:
        content = await file.read()
        if not content:
            raise HTTPException(status_code=400, detail="File is empty")

        max_size = 50 * 1024 * 1024
        if len(content) > max_size:
            raise HTTPException(status_code=413, detail="File too large")

        if not document_manager.processor_factory.is_supported(file.filename):
            supported = document_manager.get_supported_extensions()
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported file type. Supported: {', '.join(supported)}",
            )

        history = [
            {
                "version": 1,
                "action": "uploaded",
                "timestamp": datetime.utcnow().isoformat(),
                "summary": "Archivo cargado desde la interfaz",
            }
        ]

        session_uuid = UUID(session_id) if session_id else None

        document = await document_manager.process_document(
            file_content=content,
            filename=file.filename,
            session_id=session_uuid,
            user_id=UUID(current_user["id"]),
            tags=tags or [],
            metadata={
                "upload_source": "api",
                "version": 1,
                "history": history,
                "area": current_user.get("area") or "",
                "user": current_user.get("name") or current_user.get("email") or "",
            },
        )

        if not document:
            raise HTTPException(status_code=500, detail="Failed to process document")

        return {
            "id": str(document.id),
            "filename": document.filename,
            "type": document.type.value,
            "word_count": document.parsed_content.word_count,
            "sections": len(document.parsed_content.sections),
            "tables": len(document.parsed_content.tables),
            "created_at": document.created_at.isoformat(),
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Document upload error: {str(e)}")
        raise HTTPException(status_code=500, detail="Document processing failed")


@router.get("/")
async def list_user_documents(
    search: Optional[str] = None,
    type: Optional[str] = None,
    tag: Optional[str] = None,
    area: Optional[str] = None,
    user: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    document_manager: DocumentManager = Depends(get_document_manager),
):
    try:
        documents = await document_manager.document_repository.get_by_user(
            UUID(current_user["id"])
        )

        filtered = []
        for doc in documents:
            if matches_document_filters(
                doc,
                search=search,
                type=type,
                tag=tag,
                area=area,
                user=user,
                date_from=date_from,
                date_to=date_to,
                current_user=current_user,
            ):
                filtered.append(doc)

        return {
            "count": len(filtered),
            "documents": [
                {
                    "id": str(doc.id),
                    "filename": doc.filename,
                    "type": doc.type.value,
                    "word_count": doc.parsed_content.word_count,
                    "created_at": doc.created_at.isoformat(),
                    "updated_at": doc.updated_at.isoformat(),
                    "tags": doc.tags,
                    "metadata": doc.metadata,
                    "preview_text": (doc.parsed_content.text or "")[:800],
                    "version": doc.metadata.get("version", 1),
                    "history": doc.metadata.get("history", []),
                }
                for doc in sorted(filtered, key=lambda d: d.created_at, reverse=True)
            ],
        }
    except Exception as e:
        logger.error(f"Error retrieving user documents: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve documents")


@router.get("/session/{session_id}")
async def get_session_documents(
    session_id: str,
    search: Optional[str] = None,
    type: Optional[str] = None,
    tag: Optional[str] = None,
    area: Optional[str] = None,
    user: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    document_manager: DocumentManager = Depends(get_document_manager),
):
    try:
        documents = await document_manager.document_repository.get_by_session(
            UUID(session_id)
        )

        filtered = []
        for doc in documents:
            if matches_document_filters(
                doc,
                search=search,
                type=type,
                tag=tag,
                area=area,
                user=user,
                date_from=date_from,
                date_to=date_to,
                current_user=current_user,
            ):
                filtered.append(doc)

        return {
            "count": len(filtered),
            "documents": [
                {
                    "id": str(doc.id),
                    "filename": doc.filename,
                    "type": doc.type.value,
                    "word_count": doc.parsed_content.word_count,
                    "created_at": doc.created_at.isoformat(),
                    "updated_at": doc.updated_at.isoformat(),
                    "tags": doc.tags,
                    "metadata": doc.metadata,
                    "preview_text": (doc.parsed_content.text or "")[:800],
                    "version": doc.metadata.get("version", 1),
                    "history": doc.metadata.get("history", []),
                }
                for doc in sorted(filtered, key=lambda d: d.created_at, reverse=True)
            ],
        }
    except Exception as e:
        logger.error(f"Error retrieving documents: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve documents")


@router.get("/{document_id}")
async def get_document_details(
    document_id: str,
    current_user: dict = Depends(get_current_user),
    document_manager: DocumentManager = Depends(get_document_manager),
):
    try:
        document = await document_manager.document_repository.get_by_id(
            UUID(document_id)
        )
        if not document or document.user_id != UUID(current_user["id"]):
            raise HTTPException(status_code=404, detail="Document not found")

        return {
            "id": str(document.id),
            "filename": document.filename,
            "type": document.type.value,
            "word_count": document.parsed_content.word_count,
            "created_at": document.created_at.isoformat(),
            "updated_at": document.updated_at.isoformat(),
            "tags": document.tags,
            "metadata": document.metadata,
            "preview_text": (document.parsed_content.text or "")[:2000],
            "sections": [
                section.title for section in document.parsed_content.sections[:10]
            ],
            "version": document.metadata.get("version", 1),
            "history": document.metadata.get("history", []),
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving document details: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve document")


@router.get("/{document_id}/download")
async def download_document(
    document_id: str,
    current_user: dict = Depends(get_current_user),
    document_manager: DocumentManager = Depends(get_document_manager),
):
    try:
        document = await document_manager.document_repository.get_by_id(
            UUID(document_id)
        )
        if not document or document.user_id != UUID(current_user["id"]):
            raise HTTPException(status_code=404, detail="Document not found")

        file_name = (
            document.filename.rsplit(".", 1)[0]
            if "." in document.filename
            else document.filename
        )
        ext = ".txt"
        if document.type.value in {"md"}:
            ext = ".md"
        elif document.type.value in {"json"}:
            ext = ".json"

        content = document.parsed_content.to_searchable_text().encode("utf-8")
        headers = {
            "Content-Disposition": f'attachment; filename="{file_name}{ext}"',
            "Access-Control-Expose-Headers": "Content-Disposition",
        }
        return StreamingResponse(
            io.BytesIO(content), media_type="text/plain", headers=headers
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error downloading document: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to download document")


@router.delete("/{document_id}")
async def delete_document(
    document_id: str,
    current_user: dict = Depends(get_current_user),
    document_manager: DocumentManager = Depends(get_document_manager),
):
    try:
        success = await document_manager.delete_document(
            UUID(document_id), UUID(current_user["id"])
        )

        if not success:
            raise HTTPException(
                status_code=404, detail="Document not found or unauthorized"
            )

        return {"message": "Document deleted"}
    except Exception as e:
        logger.error(f"Error deleting document: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to delete document")


@router.get("/supported-formats")
async def get_supported_formats(
    document_manager: DocumentManager = Depends(get_document_manager),
):
    return {
        "types": [t.value for t in document_manager.get_supported_types()],
        "extensions": document_manager.get_supported_extensions(),
    }


class GenerateFileRequest(BaseModel):
    filename: str
    format: str
    content: Union[DocumentContent, Dict[str, Any], str, Any]
    session_id: Optional[str] = None


class GenerateAndAddArtifactRequest(BaseModel):
    filename: str
    format: str
    content: Union[DocumentContent, Dict[str, Any], str, Any]
    session_id: str
    message_id: Optional[str] = None


_MEDIA_TYPES: dict[str, str] = {
    "pdf": "application/pdf",
    "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "word": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "excel": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "ppt": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "powerpoint": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "csv": "text/csv",
    "json": "application/json",
    "md": "text/markdown",
    "txt": "text/plain",
}

_EXT_MAP: dict[str, str] = {
    "word": ".docx",
    "docx": ".docx",
    "excel": ".xlsx",
    "xlsx": ".xlsx",
    "xls": ".xlsx",
    "pptx": ".pptx",
    "ppt": ".pptx",
    "powerpoint": ".pptx",
    "pdf": ".pdf",
    "csv": ".csv",
    "json": ".json",
    "md": ".md",
    "txt": ".txt",
}


@router.post("/generate")
async def generate_document(
    request: GenerateFileRequest,
    current_user: dict = Depends(get_current_user),
    memory_repo: IMemoryRepository = Depends(get_memory_repo),
    document_manager: DocumentManager = Depends(get_document_manager),
):

    format_lower = request.format.lower()
    filename = request.filename

    ext = _EXT_MAP.get(format_lower, f".{format_lower}")
    if not filename.endswith(ext):
        filename += ext

    media_type = _MEDIA_TYPES.get(format_lower)
    if not media_type:
        raise HTTPException(
            status_code=400, detail=f"Formato no soportado: {request.format}"
        )

    try:
        generator = get_document_generator()

        cleaned_content = _remove_system_export_json_blocks(request.content)
        file_bytes = generator.generate(cleaned_content, fmt=format_lower)

        # If session provided, attempt to upload bytes to Supabase storage and save metadata
        if request.session_id:
            try:
                public_url = await upload_file_to_supabase(
                    memory_repo, request.session_id, filename, file_bytes, f"application/{format_lower}"
                )
            except Exception as e:
                logger.warning(f"Error while attempting storage upload: {e}")

        # Save to document store via DocumentManager for user access and RAG
        try:
            await document_manager.process_document(
                file_content=file_bytes,
                filename=filename,
                session_id=UUID(request.session_id) if request.session_id else None,
                user_id=UUID(current_user["id"]),
                tags=["generated", format_lower],
                metadata={"upload_source": "generation"},
            )
        except Exception as doc_err:
            logger.warning(f"Failed to save generated document to store: {doc_err}")

        # Save AI-generated file metadata to database if session_id is provided
        file_id = None
        if request.session_id:
            try:
                storage_path = f"ai_files/{request.session_id}/{filename}"
                file_id = await memory_repo.save_ai_file(
                    session_id=request.session_id,
                    user_id=current_user["id"],
                    file_type=format_lower,
                    storage_path=storage_path,
                    file_name=filename,
                    metadata={
                        "generated_at": datetime.utcnow().isoformat(),
                        "generator": "DocumentGenerator",
                    },
                )
                logger.info(
                    f"AI-generated file saved: file_id={file_id}, filename={filename}",
                    extra={
                        "user_id": current_user["id"],
                        "session_id": request.session_id,
                    },
                )
            except Exception as db_err:
                logger.warning(
                    f"Failed to save AI file metadata to database: {db_err}",
                    extra={
                        "generated_filename": filename,
                        "session_id": request.session_id,
                    },
                )

        headers = {
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Access-Control-Expose-Headers": "Content-Disposition",
        }

        if file_id:
            headers["X-File-ID"] = file_id

        return StreamingResponse(
            io.BytesIO(file_bytes),
            media_type=media_type,
            headers=headers,
        )

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error generating document '{filename}': {e}")
        raise HTTPException(
            status_code=500, detail=f"Error al generar el archivo: {str(e)}"
        )


@router.post("/generate-with-artifact")
async def generate_and_add_artifact(
    request: GenerateAndAddArtifactRequest,
    current_user: dict = Depends(get_current_user),
    memory_repo: IMemoryRepository = Depends(get_memory_repo),
    document_manager: DocumentManager = Depends(get_document_manager),
):
    format_lower = request.format.lower()
    filename = request.filename

    ext = _EXT_MAP.get(format_lower, f".{format_lower}")
    if not filename.endswith(ext):
        filename += ext

    if format_lower not in _MEDIA_TYPES:
        raise HTTPException(
            status_code=400, detail=f"Formato no soportado: {request.format}"
        )

    try:
        generator = get_document_generator()
        cleaned_content = _remove_system_export_json_blocks(request.content)
        file_bytes = generator.generate(cleaned_content, fmt=format_lower)

        # Save to document store via DocumentManager for user access and RAG
        try:
            await document_manager.process_document(
                file_content=file_bytes,
                filename=filename,
                session_id=UUID(request.session_id) if request.session_id else None,
                user_id=UUID(current_user["id"]),
                tags=["generated", format_lower],
                metadata={"upload_source": "generation"},
            )
        except Exception as doc_err:
            logger.warning(f"Failed to save generated document to store: {doc_err}")

        # Save AI-generated file metadata to database
        file_id = None
        try:
            storage_path = f"ai_files/{request.session_id}/{filename}"
            file_id = await memory_repo.save_ai_file(
                session_id=request.session_id,
                user_id=current_user["id"],
                file_type=format_lower,
                storage_path=storage_path,
                file_name=filename,
                metadata={
                    "generated_at": datetime.utcnow().isoformat(),
                    "generator": "DocumentGenerator",
                    "message_id": request.message_id,
                },
            )
            # File ID can be used to construct download URL if needed
            logger.info(
                f"AI file saved: file_id={file_id}, filename={filename}",
                extra={"session_id": request.session_id},
            )
        except Exception as db_err:
            logger.warning(
                f"Failed to save AI file metadata: {db_err}",
                extra={"filename": filename},
            )

        # Construct download URL if we saved metadata
        download_url = None
        if file_id:
            download_url = f"/api/documents/ai-file/{file_id}/download"

        # Return artifact metadata for frontend to add to message artifacts
        return {
            "success": True,
            "artifact": {
                "id": file_id or str(datetime.utcnow().timestamp()),
                "filename": filename,
                "type": format_lower,
                "size": len(file_bytes),
                "created_at": datetime.utcnow().isoformat(),
                "downloadUrl": download_url,
            },
            "message": "Document generated successfully. Use the artifact info to add to message artifacts.",
        }

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error generating document with artifact: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate document")


@router.get("/ai-file/{file_id}/download")
async def download_ai_file(
    file_id: str,
    current_user: dict = Depends(get_current_user),
    memory_repo: IMemoryRepository = Depends(get_memory_repo),
    request: Request = None,
):
    try:
        record = await memory_repo.get_ai_file_by_id(file_id)
        if not record:
            raise HTTPException(status_code=404, detail="File not found")

        # Ensure ownership
        if str(record.get("user_id")) != str(current_user["id"]):
            raise HTTPException(
                status_code=403, detail="Not authorized to access this file"
            )

        storage_path = record.get("storage_path") or ""
        # Expect storage_path like 'ai_files/{session_id}/{filename}'
        if storage_path.startswith("ai_files/"):
            parts = storage_path.split("/", 2)
            # bucket = 'ai_files', path = '{session_id}/{filename}'
            bucket = parts[0]
            path = storage_path[len(bucket) + 1 :]
        else:
            # default fallback
            bucket = "ai_files"
            path = storage_path

        # Try to use Supabase client if available on memory_repo
        supabase_client = None
        # Composite repository delegates to .db
        if hasattr(memory_repo, "db") and hasattr(memory_repo.db, "client"):
            supabase_client = getattr(memory_repo.db, "client")
        elif hasattr(memory_repo, "client"):
            supabase_client = getattr(memory_repo, "client")

        if supabase_client and hasattr(supabase_client, "admin"):
            try:
                storage = supabase_client.admin.storage
                # Attempt to download
                data = storage.from_(bucket).download(path)
                # The download may return bytes or a response-like object
                if isinstance(data, (bytes, bytearray)):
                    file_bytes = bytes(data)
                else:
                    # Try to read content attribute
                    file_bytes = getattr(data, "content", None) or getattr(
                        data, "raw", None
                    )
                    if file_bytes is None:
                        # If client returns a tuple (content, error)
                        try:
                            file_bytes = data[0]
                        except Exception:
                            file_bytes = None

                if not file_bytes:
                    raise Exception("No data returned from storage download")

                filename = record.get("file_name") or "download"
                media_type = "application/octet-stream"
                headers = {
                    "Content-Disposition": f'attachment; filename="{filename}"',
                    "Access-Control-Expose-Headers": "Content-Disposition",
                }
                return StreamingResponse(
                    io.BytesIO(file_bytes), media_type=media_type, headers=headers
                )
            except Exception as e:
                logger.warning(
                    f"Failed to download from storage for file_id={file_id}: {e}"
                )

        # If storage download failed, return 404
        raise HTTPException(status_code=404, detail="File not available for download")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error downloading AI file {file_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to download AI file")
