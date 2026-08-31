from app.infra.clients.supabase_client import SupabaseClient

BUCKET_NAME = "ai_files"


class RagStorageClient:
    def __init__(self, supabase_client: SupabaseClient):
        self.client = supabase_client

    def download(self, storage_path: str) -> bytes:
        return self.client.admin.storage.from_(BUCKET_NAME).download(storage_path)
