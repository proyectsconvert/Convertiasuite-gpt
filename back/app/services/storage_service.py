import logging

logger = logging.getLogger(__name__)

async def upload_file_to_supabase(
    memory_repo, session_id: str, filename: str, file_bytes: bytes, content_type: str
) -> str:
    """Uploads a file to Supabase storage in ai_files bucket and returns the public URL."""
    try:
        supabase_client = None
        if hasattr(memory_repo, "db") and hasattr(memory_repo.db, "client"):
            supabase_client = getattr(memory_repo.db, "client")
        elif hasattr(memory_repo, "client"):
            supabase_client = getattr(memory_repo, "client")

        if supabase_client and hasattr(supabase_client, "admin"):
            bucket = "ai_files"
            storage = supabase_client.admin.storage
            path = f"{session_id}/{filename}"
            try:
                storage.from_(bucket).upload(path, file_bytes)
            except Exception:
                import io as _io
                _buf = _io.BytesIO(file_bytes)
                try:
                    storage.from_(bucket).upload(path, _buf)
                except Exception:
                    try:
                        storage.create_bucket(bucket)
                        storage.from_(bucket).upload(path, file_bytes)
                    except Exception as e:
                        logger.warning(f"Failed to upload file to storage: {e}")
            
            return storage.from_(bucket).get_public_url(path)
    except Exception as e:
        logger.error(f"Error procesando subida a Supabase: {e}", exc_info=True)
    return ""
