from app.domain.interfaces.memory_repository import IMemoryRepository

class CompositeMemoryRepository(IMemoryRepository):
    """
    Redis = cache caliente (TTL ~4h)
    Supabase = fuente de verdad permanente
    """
    def __init__(self, cache: IMemoryRepository, db: IMemoryRepository):
        self._cache = cache
        self._db = db

    async def create_session(self, user_id: str, title: str) -> str:
        session_id = await self._db.create_session(user_id, title)  # persiste primero
        await self._cache.create_session(user_id, title)            # luego cachea
        return session_id

    async def get_messages(self, session_id: str) -> list:
        # 1. Intenta Redis
        cached = await self._cache.get_messages(session_id)
        if cached:
            return cached

        # 2. Cache miss → va a Supabase
        messages = await self._db.get_messages(session_id)
        if messages:
            # 3. Repobla Redis para la próxima vez
            await self._cache.save_messages(session_id, messages)

        return messages or []

    async def save_messages(self, session_id: str, messages: list) -> None:
        # Escribe en ambos siempre
        await self._cache.save_messages(session_id, messages)  # rápido
        await self._db.save_messages(session_id, messages)     # durable

    async def delete_session(self, user_id: str, session_id: str) -> None:
        await self._cache.delete_session(user_id, session_id)
        await self._db.delete_session(user_id, session_id)

    async def get_session_list(self, user_id: str) -> list:
        # Las sesiones siempre desde Supabase (fuente de verdad)
        # Redis no es confiable para listas completas
        return await self._db.get_session_list(user_id)