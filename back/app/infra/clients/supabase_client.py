from supabase import create_client, Client
from app.core.config import Settings


class SupabaseClient:
    def __init__(self):
        settings = Settings()
        
        self.anon: Client = create_client(
            settings.supabase_url,
            settings.supabase_key
        )

        self.admin: Client = create_client(
            settings.supabase_url,
            settings.supabase_service_key
        )

    def get_client(self, admin: bool = False) -> Client:
        """Get anon or admin client"""
        return self.admin if admin else self.anon

