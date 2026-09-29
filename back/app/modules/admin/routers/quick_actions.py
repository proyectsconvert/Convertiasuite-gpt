"""
Admin — Router de Quick Actions
================================
CRUD de acciones rápidas del Widget Olivia.
Extraídas de api/admin.py.
"""
import logging
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.dependencies.auth import require_admin
from app.infra.clients.supabase_client import SupabaseClient

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin", tags=["admin-quick-actions"])


class QuickActionBase(BaseModel):
    label: str
    description: str
    prompt: str
    icon: Optional[str] = None
    color: Optional[str] = None
    icon_color: Optional[str] = None
    is_active: bool = True
    order_index: int = 0


class QuickActionCreate(QuickActionBase):
    pass


class QuickActionUpdate(BaseModel):
    label: Optional[str] = None
    description: Optional[str] = None
    prompt: Optional[str] = None
    icon: Optional[str] = None
    color: Optional[str] = None
    icon_color: Optional[str] = None
    is_active: Optional[bool] = None
    order_index: Optional[int] = None


@router.get("/quick-actions")
async def get_quick_actions(current_user: dict = Depends(require_admin)):
    try:
        supabase = SupabaseClient().db
        resp = supabase.table("quick_actions").select("*").order("order_index").execute()
        return {"status": "success", "actions": resp.data or []}
    except Exception as e:
        logger.error(f"Error fetching quick actions: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/quick-actions")
async def create_quick_action(
    action: QuickActionCreate,
    current_user: dict = Depends(require_admin),
):
    try:
        supabase = SupabaseClient().db
        resp = supabase.table("quick_actions").insert(action.model_dump()).execute()
        return {"status": "success", "action": resp.data[0] if resp.data else None}
    except Exception as e:
        logger.error(f"Error creating quick action: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/quick-actions/{action_id}")
async def update_quick_action(
    action_id: str,
    action: QuickActionUpdate,
    current_user: dict = Depends(require_admin),
):
    try:
        supabase = SupabaseClient().db
        update_data = action.model_dump(exclude_unset=True)
        update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
        resp = supabase.table("quick_actions").update(update_data).eq("action_id", action_id).execute()
        return {"status": "success", "action": resp.data[0] if resp.data else None}
    except Exception as e:
        logger.error(f"Error updating quick action: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/quick-actions/{action_id}")
async def delete_quick_action(
    action_id: str,
    current_user: dict = Depends(require_admin),
):
    try:
        supabase = SupabaseClient().db
        supabase.table("quick_actions").delete().eq("action_id", action_id).execute()
        return {"status": "success"}
    except Exception as e:
        logger.error(f"Error deleting quick action: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
