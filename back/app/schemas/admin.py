from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime

class InviteUserRequest(BaseModel):
    email: EmailStr
    name: Optional[str] = None
    role: str = "user"  # "admin" | "user"
    area: Optional[str] = None
    functional_role: Optional[str] = None
    password: Optional[str] = None  # Si se especifica, se crea directamente; si no, se envía invitación por email.

class CreateCampaignRequest(BaseModel):
    campaign_name: str
    description: Optional[str] = None
    is_active: bool = True
    tracking_format: Optional[dict] = None
    pricing_config: Optional[dict] = None
    platform_config: Optional[dict] = None

class UpdateCampaignRequest(BaseModel):
    campaign_name: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None
    tracking_format: Optional[dict] = None
    pricing_config: Optional[dict] = None
    platform_config: Optional[dict] = None

class CampaignResponse(BaseModel):
    campaign_id: str
    campaign_name: str
    description: Optional[str] = None
    is_active: bool
    tracking_format: Optional[dict] = None
    pricing_config: Optional[dict] = None
    platform_config: Optional[dict] = None

class AddCampaignMemberRequest(BaseModel):
    user_id: str
    campaign_role: str = "agent"  # agent, kam, quality_analyst, back_office

class UpdateCampaignMemberStatusRequest(BaseModel):
    is_active: bool

class CampaignMemberResponse(BaseModel):
    member_id: str
    campaign_id: str
    user_id: str
    campaign_role: str
    is_active: bool
    joined_at: str
