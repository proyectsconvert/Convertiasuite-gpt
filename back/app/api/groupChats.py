import json
import logging
from pathlib import Path
from typing import List, Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.dependencies.auth import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/group-chats", tags=["group-chats"])
