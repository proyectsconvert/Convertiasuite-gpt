from datetime import datetime
from typing import Optional, List
from app.domain.entities.message import Message


class ChatSession:
    def __init__(
        self,
        id: str,
        title: str,
        messages: List[Message],
        model: str,
        created_at: datetime,
        updated_at: datetime,
        favorite: bool = False,
        folder: Optional[str] = None,
    ):
        self.id = id
        self.title = title
        self.messages = messages
        self.model = model
        self.created_at = created_at
        self.updated_at = updated_at
        self.favorite = favorite
        self.folder = folder

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "title": self.title,
            "messages": [m.to_dict() for m in self.messages],
            "model": self.model,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
            "favorite": self.favorite,
            "folder": self.folder,
        }

    @classmethod
    def from_dict(cls, data: dict) -> "ChatSession":
        created_at = data.get("created_at")
        if isinstance(created_at, str):
            created_at = datetime.fromisoformat(created_at)
        updated_at = data.get("updated_at")
        if isinstance(updated_at, str):
            updated_at = datetime.fromisoformat(updated_at)
        messages = [Message.from_dict(m) for m in data.get("messages", [])]
        return cls(
            id=data["id"],
            title=data["title"],
            messages=messages,
            model=data["model"],
            created_at=created_at,
            updated_at=updated_at,
            favorite=data.get("favorite", False),
            folder=data.get("folder"),
        )