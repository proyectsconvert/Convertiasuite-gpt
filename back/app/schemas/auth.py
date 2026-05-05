from pydantic import BaseModel, EmailStr
from typing import Any


class UserInfo(BaseModel):
    """User information returned after authentication"""
    id: str
    email: str
    name: str
    role: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserInfo