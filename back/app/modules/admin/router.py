"""
Módulo Admin — Router principal
================================
Agrupa todos los sub-routers del módulo administrativo:
  - metrics: métricas de uso y call center
  - users: gestión de usuarios del sistema
  - quick_actions: acciones rápidas del widget

Las rutas de campañas que estaban en api/admin.py han sido migradas
al módulo dedicado: modules/campaigns/router.py
"""
from fastapi import APIRouter

from app.modules.admin.routers import metrics, users, quick_actions

router = APIRouter()

router.include_router(metrics.router)
router.include_router(users.router)
router.include_router(quick_actions.router)
