"""
services/document_generation/__init__.py
-----------------------------------------
Capa de Escritura (DocumentContent → File).
Exporta la fachada principal DocumentGenerator.
"""
from app.services.document_generation.document_generator import DocumentGenerator

__all__ = ["DocumentGenerator"]
