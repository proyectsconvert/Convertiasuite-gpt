import logging
from uuid import UUID
import io
from datetime import datetime
from typing import Any, Dict, List, Optional, Union
from pydantic import BaseModel
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, Request
from fastapi.responses import StreamingResponse
from app.dependencies.auth import get_current_user
from app.services.document_processing.document_manager import DocumentManager
from app.services.document_generation.document_generator import DocumentGenerator
from app.domain.entities.document_content import DocumentContent
from app.domain.interfaces.memory_repository import IMemoryRepository

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


@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    session_id: str = None,
    tags: list[str] = None,
    current_user: dict = Depends(get_current_user),
    document_manager: DocumentManager = Depends(get_document_manager),
):
    try:
        if not session_id:
            raise HTTPException(status_code=400, detail="session_id is required")

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

        document = await document_manager.process_document(
            file_content=content,
            filename=file.filename,
            session_id=UUID(session_id),
            user_id=UUID(current_user["id"]),
            tags=tags or [],
            metadata={"upload_source": "api"},
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


@router.get("/session/{session_id}")
async def get_session_documents(
    session_id: str,
    current_user: dict = Depends(get_current_user),
    document_manager: DocumentManager = Depends(get_document_manager),
):
    try:
        documents = await document_manager.document_repository.get_by_session(
            UUID(session_id)
        )

        return {
            "count": len(documents),
            "documents": [
                {
                    "id": str(doc.id),
                    "filename": doc.filename,
                    "type": doc.type.value,
                    "word_count": doc.parsed_content.word_count,
                    "created_at": doc.created_at.isoformat(),
                }
                for doc in documents
            ],
        }
    except Exception as e:
        logger.error(f"Error retrieving documents: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve documents")


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
    message_id: Optional[str] = (
        None
    )


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

        file_bytes = generator.generate(request.content, fmt=format_lower)

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
        file_bytes = generator.generate(request.content, fmt=format_lower)

        # Save AI-generated file metadata to database
        file_id = None
        download_url = None
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

        # Return artifact metadata for frontend to add to message artifacts
        return {
            "success": True,
            "artifact": {
                "id": file_id or str(datetime.utcnow().timestamp()),
                "filename": filename,
                "type": format_lower,
                "size": len(file_bytes),
                "created_at": datetime.utcnow().isoformat(),
            },
            "message": "Document generated successfully. Use the artifact info to add to message artifacts.",
        }

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error generating document with artifact: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate document")
