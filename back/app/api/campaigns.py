import logging
from fastapi import APIRouter, Depends, HTTPException, Request
from app.dependencies.auth import require_admin
from app.infra.clients.supabase_client import SupabaseClient
from app.schemas.admin import (
    CreateCampaignRequest,
    UpdateCampaignRequest,
    CampaignResponse,
    AddCampaignMemberRequest,
    UpdateCampaignMemberStatusRequest,
    CampaignMemberResponse,
)

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/admin/campaigns",
    tags=["campaigns"],
)


@router.get("/")
async def get_campaigns(
    current_user: dict = Depends(require_admin),
):
    """Get all campaigns"""
    try:
        supabase = SupabaseClient().db
        
        res = supabase.table("campaigns").select("*").execute()
        
        campaigns = [
            CampaignResponse(
                campaign_id=c["campaign_id"],
                campaign_name=c["campaign_name"],
                description=c.get("description"),
                is_active=c.get("is_active", True),
                tracking_format=c.get("tracking_format"),
                pricing_config=c.get("pricing_config"),
                platform_config=c.get("platform_config"),
            )
            for c in res.data
        ]
        
        return {"status": "success", "campaigns": campaigns}
    except Exception as e:
        logger.error(f"Error fetching campaigns: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to fetch campaigns")


@router.post("/")
async def create_campaign(
    body: CreateCampaignRequest,
    request: Request,
    current_user: dict = Depends(require_admin),
):
    try:
        supabase = SupabaseClient().db
        
        campaign_data = {
            "campaign_name": body.campaign_name,
            "description": body.description,
            "is_active": body.is_active,
            "tracking_format": body.tracking_format,
            "pricing_config": body.pricing_config,
            "platform_config": body.platform_config,
            "created_by": current_user["id"],
        }
        
        res = supabase.table("campaigns").insert(campaign_data).execute()
        
        if not res.data:
            raise HTTPException(status_code=400, detail="Failed to create campaign")
        
        campaign = res.data[0]
        
        return {
            "status": "success",
            "campaign": CampaignResponse(
                campaign_id=campaign["campaign_id"],
                campaign_name=campaign["campaign_name"],
                description=campaign.get("description"),
                is_active=campaign.get("is_active", True),
                tracking_format=campaign.get("tracking_format"),
                pricing_config=campaign.get("pricing_config"),
                platform_config=campaign.get("platform_config"),
            ),
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating campaign: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to create campaign")


@router.put("/{campaign_id}")
async def update_campaign(
    campaign_id: str,
    body: UpdateCampaignRequest,
    current_user: dict = Depends(require_admin),
):
    try:
        supabase = SupabaseClient().db
        
        # Build update data with only non-None values
        update_data = {}
        if body.campaign_name is not None:
            update_data["campaign_name"] = body.campaign_name
        if body.description is not None:
            update_data["description"] = body.description
        if body.is_active is not None:
            update_data["is_active"] = body.is_active
        if body.tracking_format is not None:
            update_data["tracking_format"] = body.tracking_format
        if body.pricing_config is not None:
            update_data["pricing_config"] = body.pricing_config
        if body.platform_config is not None:
            update_data["platform_config"] = body.platform_config
        
        update_data["updated_at"] = "now()"
        
        res = (
            supabase.table("campaigns")
            .update(update_data)
            .eq("campaign_id", campaign_id)
            .execute()
        )
        
        if not res.data:
            raise HTTPException(status_code=404, detail="Campaign not found")
        
        campaign = res.data[0]
        
        return {
            "status": "success",
            "campaign": CampaignResponse(
                campaign_id=campaign["campaign_id"],
                campaign_name=campaign["campaign_name"],
                description=campaign.get("description"),
                is_active=campaign.get("is_active", True),
                tracking_format=campaign.get("tracking_format"),
                pricing_config=campaign.get("pricing_config"),
                platform_config=campaign.get("platform_config"),
            ),
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating campaign: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to update campaign")


@router.delete("/{campaign_id}")
async def delete_campaign(
    campaign_id: str,
    current_user: dict = Depends(require_admin),
):
    try:
        supabase = SupabaseClient().db
        
        res = (
            supabase.table("campaigns")
            .delete()
            .eq("campaign_id", campaign_id)
            .execute()
        )
        
        if not res.data:
            raise HTTPException(status_code=404, detail="Campaign not found")
        
        return {"status": "success"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting campaign: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to delete campaign")


@router.get("/{campaign_id}/members")
async def get_campaign_members(
    campaign_id: str,
    current_user: dict = Depends(require_admin),
):
    try:
        supabase = SupabaseClient().db
        
        # Verify campaign exists
        campaign_res = (
            supabase.table("campaigns")
            .select("campaign_id")
            .eq("campaign_id", campaign_id)
            .execute()
        )
        
        if not campaign_res.data:
            raise HTTPException(status_code=404, detail="Campaign not found")
        
        # Get members
        res = (
            supabase.table("campaign_members")
            .select("*")
            .eq("campaign_id", campaign_id)
            .execute()
        )
        
        members = [
            CampaignMemberResponse(
                member_id=m["member_id"],
                campaign_id=m["campaign_id"],
                user_id=m["user_id"],
                campaign_role=m["campaign_role"],
                is_active=m.get("is_active", True),
                joined_at=m["joined_at"],
            )
            for m in res.data
        ]
        
        return {"status": "success", "members": members}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching campaign members: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to fetch campaign members")


@router.post("/{campaign_id}/members")
async def add_campaign_member(
    campaign_id: str,
    body: AddCampaignMemberRequest,
    current_user: dict = Depends(require_admin),
):
    try:
        supabase = SupabaseClient().db
        
        # Verify campaign exists
        campaign_res = (
            supabase.table("campaigns")
            .select("campaign_id")
            .eq("campaign_id", campaign_id)
            .execute()
        )
        
        if not campaign_res.data:
            raise HTTPException(status_code=404, detail="Campaign not found")
        
        # Check if user exists in auth
        try:
            # Try to get user info from profiles table to verify user exists
            user_res = (
                supabase.table("profiles")
                .select("user_id")
                .eq("user_id", body.user_id)
                .execute()
            )
            # If profile doesn't exist, we still allow adding as long as the user_id is valid
        except Exception:
            pass
        
        # Add member to campaign
        member_data = {
            "campaign_id": campaign_id,
            "user_id": body.user_id,
            "campaign_role": body.campaign_role,
            "is_active": True,
        }
        
        res = supabase.table("campaign_members").insert(member_data).execute()
        
        if not res.data:
            raise HTTPException(status_code=400, detail="Failed to add member to campaign")
        
        return {"status": "success"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error adding campaign member: {e}", exc_info=True)
        if "duplicate key" in str(e).lower():
            raise HTTPException(status_code=400, detail="User is already a member of this campaign")
        raise HTTPException(status_code=500, detail="Failed to add campaign member")

#status

@router.post("/{campaign_id}/members/{user_id}/status")
async def update_campaign_member_status(
    campaign_id: str,
    user_id: str,
    body: UpdateCampaignMemberStatusRequest,
    current_user: dict = Depends(require_admin),
):
    try:
        supabase = SupabaseClient().db

        campaign_res = (
            supabase.table("campaigns")
            .select("campaign_id")
            .eq("campaign_id", campaign_id)
            .execute()
        )

        if not campaign_res.data:
            raise HTTPException(status_code=404, detail="Campaign not found")

        # Update member status
        res = (
            supabase.table("campaign_members")
            .update({"is_active": body.is_active})
            .eq("campaign_id", campaign_id)
            .eq("user_id", user_id)
            .execute()
        )

        if not res.data:
            raise HTTPException(status_code=404, detail="Member not found in campaign")

        return {"status": "success"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating campaign member status: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to update campaign member status")

@router.delete("/{campaign_id}/members/{user_id}")
async def remove_campaign_member(
    campaign_id: str,
    user_id: str,
    current_user: dict = Depends(require_admin),
):
    try:
        supabase = SupabaseClient().db
        
        # Verify campaign exists
        campaign_res = (
            supabase.table("campaigns")
            .select("campaign_id")
            .eq("campaign_id", campaign_id)
            .execute()
        )
        
        if not campaign_res.data:
            raise HTTPException(status_code=404, detail="Campaign not found")
        
        # Delete member
        res = (
            supabase.table("campaign_members")
            .delete()
            .eq("campaign_id", campaign_id)
            .eq("user_id", user_id)
            .execute()
        )
        
        if not res.data:
            raise HTTPException(status_code=404, detail="Member not found in campaign")
        
        return {"status": "success"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error removing campaign member: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to remove campaign member")
