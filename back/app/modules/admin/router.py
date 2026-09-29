from fastapi import APIRouter

from app.modules.admin.routers import metrics, users, quick_actions, training_insights

# Router principal del módulo Admin — prefijo /admin
router = APIRouter(prefix="/admin", tags=["admin"])

router.include_router(metrics.router)
router.include_router(users.router)
router.include_router(quick_actions.router)
router.include_router(training_insights.router)
