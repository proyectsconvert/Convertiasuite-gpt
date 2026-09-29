from fastapi import APIRouter, Depends, HTTPException, Request
import logging

from app.dependencies.auth import require_admin
from app.infra.clients.supabase_client import SupabaseClient

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/training-insights",
    tags=["admin-training"],
)


@router.get("")
async def get_training_insights(
    request: Request,
    current_user: dict = Depends(require_admin),
):
    try:
        supabase = SupabaseClient().db
        insights_res = supabase.table("training_insights").select("*").execute()
        insights = insights_res.data or []
        return {"status": "success", "training_insights": insights}
    except Exception as e:
        logger.error(f"Error fetching training insights: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Error interno del servidor al obtener insights de entrenamiento: {str(e)}",
        )
