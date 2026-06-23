from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class PlanLimits:
    chat: int
    document: int
    storage_mb: int


class PlanService:
    def __init__(self) -> None:
        self._plans = {
            "free": PlanLimits(chat=10, document=5, storage_mb=100),
            "pro": PlanLimits(chat=200, document=100, storage_mb=1000),
            "enterprise": PlanLimits(chat=1000, document=500, storage_mb=5000),
        }

    def get_limit_for_plan(self, plan_name: str | None, action: str) -> int:
        plan = self._plans.get((plan_name or "free").lower(), self._plans["free"])
        return getattr(plan, action, getattr(plan, "chat", 10))

    def get_plan_limits(self, plan_name: str | None) -> PlanLimits:
        return self._plans.get((plan_name or "free").lower(), self._plans["free"])
