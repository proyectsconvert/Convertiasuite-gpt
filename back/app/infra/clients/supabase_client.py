from supabase import create_client, Client
from app.core.config import Settings


class SupabaseClient:
    def __init__(self):
        settings = Settings()

        self._anon: Client = create_client(
            settings.supabase_url,
            settings.supabase_key
        )

        self._admin: Client = create_client(
            settings.supabase_url,
            settings.supabase_service_key
        )

    @property
    def anon(self) -> Client:
        return self._anon

    @property
    def admin(self) -> Client:
        return self._admin