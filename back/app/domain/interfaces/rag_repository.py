from abc import ABC, abstractmethod


class IRagRepository(ABC):

    @abstractmethod
    async def get_pending_sources(self) -> list[dict]:
        pass

    @abstractmethod
    async def replace_chunks(
        self,
        source_id: str,
        chunks: list[tuple[str, dict, list[float]]],
        source_updated_at: str,
    ) -> None:
        pass

    @abstractmethod
    async def search(self, query_embedding: list[float], k: int = 5) -> list[dict]:
        pass
