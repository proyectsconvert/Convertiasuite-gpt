from pydantic import BaseModel, EmailStr


class UserInfo(BaseModel):
    id: str
    email: str
    name: str
    role: str
    area: str | None = None
    functional_role: str | None = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserInfo


class ProfileUpdateRequest(BaseModel):
    name: str | None = None
    area: str | None = None
    functional_role: str | None = None
