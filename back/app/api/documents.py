import logging
from uuid import UUID
import io
from typing import Any
from pydantic import BaseModel

from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, Request
from fastapi.responses import StreamingResponse
from app.dependencies.auth import get_current_user
from app.services.Files_Processor.document_manager import DocumentManager
from app.services.File_generator.file_generator import FileGeneratorService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/documents", tags=["documents"])


def get_document_manager(request: Request) -> DocumentManager:
    return request.app.state.document_manager


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
    """Delete a document."""
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
    """Get list of supported file formats."""
    return {
        "types": [t.value for t in document_manager.get_supported_types()],
        "extensions": document_manager.get_supported_extensions(),
    }


class GenerateFileRequest(BaseModel):
    filename: str
    format: str
    content: Any


@router.post("/generate")
async def generate_document(
    request: GenerateFileRequest,
    current_user: dict = Depends(get_current_user),
):
    """Generate a downloadable document in various formats."""
    format_lower = request.format.lower()
    filename = request.filename

    # Standardize filename extensions
    if format_lower == "pdf" and not filename.endswith(".pdf"):
        filename += ".pdf"
    elif format_lower in ["word", "docx"] and not filename.endswith(".docx"):
        filename += ".docx"
    elif format_lower in ["excel", "xlsx"] and not filename.endswith(".xlsx"):
        filename += ".xlsx"
    elif format_lower == "csv" and not filename.endswith(".csv"):
        filename += ".csv"
    elif format_lower == "json" and not filename.endswith(".json"):
        filename += ".json"
    elif format_lower == "md" and not filename.endswith(".md"):
        filename += ".md"
    elif format_lower == "txt" and not filename.endswith(".txt"):
        filename += ".txt"

    try:
        if format_lower == "pdf":
            file_bytes = FileGeneratorService.generate_pdf(request.content)
            media_type = "application/pdf"
        elif format_lower in ["word", "docx"]:
            file_bytes = FileGeneratorService.generate_docx(request.content)
            media_type = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        elif format_lower in ["excel", "xlsx"]:
            file_bytes = FileGeneratorService.generate_excel(request.content)
            media_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        elif format_lower == "csv":
            file_bytes = FileGeneratorService.generate_csv(request.content)
            media_type = "text/csv"
        elif format_lower == "json":
            file_bytes = FileGeneratorService.generate_json(request.content)
            media_type = "application/json"
        elif format_lower == "md":
            file_bytes = FileGeneratorService.generate_md(request.content)
            media_type = "text/markdown"
        elif format_lower == "txt":
            file_bytes = FileGeneratorService.generate_txt(request.content)
            media_type = "text/plain"
        else:
            raise HTTPException(
                status_code=400,
                detail=f"Formato no soportado: {request.format}"
            )

        headers = {
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Access-Control-Expose-Headers": "Content-Disposition"
        }

        return StreamingResponse(
            io.BytesIO(file_bytes),
            media_type=media_type,
            headers=headers
        )

    except Exception as e:
        logger.error(f"Error generating document {filename}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error al generar el archivo: {str(e)}"
        )
