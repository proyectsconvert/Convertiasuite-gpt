from datetime import datetime
from typing import Optional


class Message:
    def __init__(
        self,
        id: str,
        role: str,
        content: str,
        timestamp: datetime,
        attachments: Optional[list] = None,
        artifacts: Optional[list] = None,
    ):
        self.id = id
        self.role = role
        self.content = content
        self.timestamp = timestamp
        self.attachments = attachments or []
        self.artifacts = artifacts or []

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "role": self.role,
            "content": self.content,
            "timestamp": self.timestamp.isoformat(),
            "attachments": self.attachments,
            "artifacts": self.artifacts,
        }

    @classmethod
    def from_dict(cls, data: dict) -> "Message":
        timestamp = data.get("timestamp")
        if isinstance(timestamp, str):
            timestamp = datetime.fromisoformat(timestamp)
        return cls(
            id=data["id"],
            role=data["role"],
            content=data["content"],
            timestamp=timestamp,
            attachments=data.get("attachments", []),
            artifacts=data.get("artifacts", []),
        )