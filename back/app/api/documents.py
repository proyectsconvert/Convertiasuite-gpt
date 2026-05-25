"""
Document upload and management API endpoints.
"""

import logging
from uuid import UUID

from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, Request
from app.dependencies.auth import get_current_user
from app.services.document_manager import DocumentManager

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/documents", tags=["documents"])


def get_document_manager(request: Request) -> DocumentManager:
    """Dependency: Get document manager from app state."""
    return request.app.state.document_manager


@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    session_id: str = None,
    tags: list[str] = None,
    current_user: dict = Depends(get_current_user),
    document_manager: DocumentManager = Depends(get_document_manager),
):
    """
    Upload and process a document.

    Supported formats: PDF, DOCX, XLSX, CSV, TXT

    Args:
        file: Document file
        session_id: Associated chat session (required for context)
        tags: Optional tags

    Returns:
        Document metadata
    """
    try:
        if not session_id:
            raise HTTPException(status_code=400, detail="session_id is required")

        # Read file
        content = await file.read()
        if not content:
            raise HTTPException(status_code=400, detail="File is empty")

        # Check file size (max 50MB)
        max_size = 50 * 1024 * 1024
        if len(content) > max_size:
            raise HTTPException(status_code=413, detail="File too large")

        # Check if file type is supported
        if not document_manager.processor_factory.is_supported(file.filename):
            supported = document_manager.get_supported_extensions()
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported file type. Supported: {', '.join(supported)}",
            )

        # Process document
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
    """Get all documents in a session."""
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
