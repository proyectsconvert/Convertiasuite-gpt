from pydantic import BaseModel, EmailStr
from typing import Optional

class InviteUserRequest(BaseModel):
    email: EmailStr
    name: Optional[str] = None
    role: str = "user"  # "admin" | "user"
    area: Optional[str] = None
    functional_role: Optional[str] = None
    password: Optional[str] = None  # Si se especifica, se crea directamente; si no, se envía invitación por email.
