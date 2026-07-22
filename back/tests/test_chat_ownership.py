import os
import sys
import unittest
from unittest.mock import AsyncMock, MagicMock
from fastapi import HTTPException

# Add parent dir to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.api.chat import get_chat_history

class TestChatOwnership(unittest.IsolatedAsyncioTestCase):
    async def test_get_chat_history_not_found(self):
        memory_repo = MagicMock()
        memory_repo.get_session = AsyncMock(return_value=None)
        
        with self.assertRaises(HTTPException) as ctx:
            await get_chat_history(
                session_id="session-123",
                current_user={"id": "user-456"},
                memory_repo=memory_repo
            )
        self.assertEqual(ctx.exception.status_code, 404)

    async def test_get_chat_history_unauthorized(self):
        memory_repo = MagicMock()
        memory_repo.get_session = AsyncMock(return_value={"session_id": "session-123", "user_id": "other-user"})
        
        with self.assertRaises(HTTPException) as ctx:
            await get_chat_history(
                session_id="session-123",
                current_user={"id": "my-user"},
                memory_repo=memory_repo
            )
        self.assertEqual(ctx.exception.status_code, 403)
        self.assertEqual(ctx.exception.detail, "No tienes permiso para acceder a esta sesión")

    async def test_get_chat_history_authorized(self):
        memory_repo = MagicMock()
        memory_repo.get_session = AsyncMock(return_value={"session_id": "session-123", "user_id": "my-user"})
        memory_repo.get_messages = AsyncMock(return_value=[])
        
        response = await get_chat_history(
            session_id="session-123",
            current_user={"id": "my-user"},
            memory_repo=memory_repo
        )
        self.assertEqual(response.session_id, "session-123")
        self.assertEqual(response.messages, [])

if __name__ == "__main__":
    unittest.main()
