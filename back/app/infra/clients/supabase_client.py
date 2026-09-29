from supabase import create_client, Client
from app.core.config import Settings


class SupabaseClient:
    def __init__(self):
        settings = Settings()

        self._anon: Client = create_client(settings.supabase_url, settings.supabase_key)

        self._service: Client = create_client(
            settings.supabase_url, settings.supabase_service_key
        )

    @property
    def db(self) -> Client:
        """Cliente anon — respeta Row Level Security. Usar por defecto."""
        return self._anon

    @property
    def anon(self) -> Client:
        return self._anon

    @property
    def service(self) -> Client:
        return self._service

    @property
    def admin(self) -> Client:
        return self._service
