from abc import ABC, abstractmethod
from typing import Optional
from datetime import datetime


class IAIGeneratedFilesRepository(ABC):

    @abstractmethod
    async def save_ai_file(
        self,
        session_id: str,
        user_id: str,
        file_type: str,          
        storage_path: str,
        file_name: str,
        metadata: Optional[dict] = None,
        expires_at: Optional[datetime] = None,
    ) -> str:                    
        pass

    @abstractmethod
    async def get_ai_files(
        self,
        session_id: str,
        file_type: Optional[str] = None,
    ) -> list[dict]:
        pass

    @abstractmethod
    async def get_ai_file_by_id(
        self,
        file_id: str,
    ) -> Optional[dict]:
        pass

    @abstractmethod
    async def soft_delete_ai_file(
        self,
        file_id: str,
        user_id: str,            
    ) -> bool:
        pass