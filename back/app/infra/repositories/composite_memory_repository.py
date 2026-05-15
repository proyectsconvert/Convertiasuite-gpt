from app.domain.interfaces.memory_repository import IMemoryRepository


class CompositeMemoryRepository(IMemoryRepository):
    def __init__(
        self,
        cache: IMemoryRepository,
        db: IMemoryRepository,
    ):
        self._cache = cache
        self._db = db

    async def create_session(
        self,
        user_id: str,
        title: str,
        session_id: str | None = None,
    ) -> str:

        session_id = await self._db.create_session(
            user_id=user_id,
            title=title,
            session_id=session_id,
        )

        await self._cache.create_session(
            user_id=user_id,
            title=title,
            session_id=session_id,
        )

        return session_id

    async def get_messages(
        self,
        session_id: str,
    ) -> list:

        cached = await self._cache.get_messages(session_id)

        if cached is not None:
            return cached

        messages = await self._db.get_messages(session_id)

        if messages:
            await self._cache.save_messages(
                session_id=session_id,
                messages=messages,
            )

        return messages or []

    async def save_messages(
        self,
        session_id: str,
        messages: list,
    ) -> None:

        await self._cache.save_messages(
            session_id=session_id,
            messages=messages,
        )

        await self._db.save_messages(
            session_id=session_id,
            messages=messages,
        )

    async def delete_session(
        self,
        user_id: str,
        session_id: str,
    ) -> None:

        await self._cache.delete_session(
            user_id=user_id,
            session_id=session_id,
        )

        await self._db.delete_session(
            user_id=user_id,
            session_id=session_id,
        )

    async def get_session_list(
        self,
        user_id: str,
    ) -> list:

        return await self._db.get_session_list(user_id)

    async def get_session(
        self,
        session_id: str,
    ) -> dict | None:

        return await self._db.get_session(session_id)

    async def update_session(
        self,
        session_id: str,
        title: str,
    ) -> None:

        await self._cache.update_session(
            session_id=session_id,
            title=title,
        )

        await self._db.update_session(
            session_id=session_id,
            title=title,
        )

    async def get_context_window(
        self,
        session_id: str,
        window_size: int,
    ) -> list:

        cached = await self._cache.get_context_window(
            session_id=session_id,
            window_size=window_size,
        )

        if cached is not None:
            return cached

        messages = await self._db.get_context_window(
            session_id=session_id,
            window_size=window_size,
        )

        if messages:
            await self._cache.save_messages(
                session_id=session_id,
                messages=messages,
            )

        return messages or []
