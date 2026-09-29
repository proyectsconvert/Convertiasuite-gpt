import logging

from fastapi import APIRouter, Depends

from app.dependencies.auth import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/group-chats", tags=["group-chats"])
