from fastapi import APIRouter, Depends, HTTPException, Request
import logging
import asyncio
import json
from datetime import datetime, timezone, timedelta
import dateutil.parser
from collections import defaultdict

from app.dependencies.auth import get_current_user, require_admin
from app.infra.clients.supabase_client import SupabaseClient

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/admin",
    tags=["admin"],
)


@router.get("/metrics")
async def get_metrics(
    request: Request,
    user_id: str | None = None,
    current_user: dict = Depends(require_admin),
):

    try:
        try:
            cache_client = request.app.state.cache.redis
            cached = await cache_client.get("admin:metrics")
            if cached:
                return json.loads(cached)
        except Exception:
            pass
        supabase = SupabaseClient().db

        try:
            auth_users = supabase.auth.admin.list_users()
            if auth_users:
                for u in auth_users:
                    user_metadata = u.user_metadata or {}
                    name = user_metadata.get("full_name") or user_metadata.get("name")
                    area = user_metadata.get("area")
                    functional_role = user_metadata.get("functional_role")
                    # 1. Upsert profiles
                    p_data = {"user_id": u.id}
                    if name:
                        p_data["full_name"] = name
                    supabase.table("profiles").upsert(p_data).execute()
                    dep_id = None
                    if area:
                        dep_res = (
                            supabase.table("departments")
                            .select("department_id")
                            .eq("department_name", area)
                            .execute()
                        )
                        if dep_res.data:
                            dep_id = dep_res.data[0]["department_id"]
                        else:
                            dep_insert = (
                                supabase.table("departments")
                                .insert({"department_name": area})
                                .execute()
                            )
                            if dep_insert.data:
                                dep_id = dep_insert.data[0]["department_id"]
                    pos_id = None
                    if functional_role:
                        pos_res = (
                            supabase.table("positions")
                            .select("position_id")
                            .eq("position_name", functional_role)
                            .execute()
                        )
                        if pos_res.data:
                            pos_id = pos_res.data[0]["position_id"]
                        else:
                            pos_insert = (
                                supabase.table("positions")
                                .insert(
                                    {
                                        "position_name": functional_role,
                                        "department_id": dep_id,
                                    }
                                )
                                .execute()
                            )
                            if pos_insert.data:
                                pos_id = pos_insert.data[0]["position_id"]

                    emp_data = {"user_id": u.id, "work_email": u.email}
                    if dep_id is not None:
                        emp_data["department_id"] = dep_id
                    if pos_id is not None:
                        emp_data["position_id"] = pos_id
                    supabase.table("employee_profiles").upsert(emp_data).execute()
        except Exception as sync_err:
            logger.error(
                f"Error syncing users in admin metrics: {sync_err}", exc_info=True
            )

        try:
            results = await asyncio.gather(
                asyncio.to_thread(
                    lambda: supabase.table("usage_tracking").select("*").execute()
                ),
                asyncio.to_thread(
                    lambda: supabase.table("profiles").select("*").execute()
                ),
                asyncio.to_thread(
                    lambda: supabase.table("employee_profiles").select("*").execute()
                ),
                asyncio.to_thread(
                    lambda: supabase.table("roles").select("*").execute()
                ),
                asyncio.to_thread(
                    lambda: supabase.table("departments").select("*").execute()
                ),
                asyncio.to_thread(
                    lambda: supabase.table("models").select("*").execute()
                ),
            )

            usage_res, profiles_res, emp_res, roles_res, deps_res, models_res = results
        except Exception as q_err:
            logger.error(
                f"Error ejecutando consultas paralelas a Supabase: {q_err}",
                exc_info=True,
            )
            usage_res = supabase.table("usage_tracking").select("*").execute()
            profiles_res = supabase.table("profiles").select("*").execute()
            emp_res = supabase.table("employee_profiles").select("*").execute()
            roles_res = supabase.table("roles").select("*").execute()
            deps_res = supabase.table("departments").select("*").execute()
            models_res = supabase.table("models").select("*").execute()

        usage = usage_res.data or []
        profiles = profiles_res.data or []
        employee_profiles = emp_res.data or []
        roles = roles_res.data or []
        departments = deps_res.data or []
        models = models_res.data or []

        models_dict = {m["model_id"]: m for m in models}
        profiles_dict = {p["user_id"]: p for p in profiles}
        emp_dict = {e["user_id"]: e for e in employee_profiles}
        roles_dict = {r["role_id"]: r["role_name"] for r in roles}
        deps_dict = {d["department_id"]: d["department_name"] for d in departments}

        joined = []
        for row in usage:
            if user_id and str(row.get("user_id")) != str(user_id):
                continue
            m_id = row["model_id"]
            u_id = row["user_id"]

            m_info = models_dict.get(m_id, {})
            p_info = profiles_dict.get(u_id, {})
            e_info = emp_dict.get(u_id, {})

            role_id = e_info.get("role_id")
            role_name = roles_dict.get(role_id, "user")

            dep_id = e_info.get("department_id")
            dep_name = deps_dict.get(dep_id, "General")

            email = e_info.get("work_email") or f"{u_id[:8]}@convert.ia"
            name = p_info.get("full_name") or (
                email.split("@")[0].capitalize() if "@" in email else "Usuario"
            )

            joined.append(
                {
                    "usage_id": row["usage_id"],
                    "user_id": u_id,
                    "name": name,
                    "email": email,
                    "role": role_name,
                    "department": dep_name,
                    "model_name": m_info.get("model_name", "unknown"),
                    "provider": m_info.get("provider", "unknown"),
                    "tokens_input": row.get("tokens_input", 0) or 0,
                    "tokens_output": row.get("tokens_output", 0) or 0,
                    "total_cost": float(row.get("total_cost", 0.0) or 0.0),
                    "created_at": row.get("created_at"),
                }
            )

        total_requests = len(joined)
        total_tokens_input = sum(r["tokens_input"] for r in joined)
        total_tokens_output = sum(r["tokens_output"] for r in joined)
        total_cost = sum(r["total_cost"] for r in joined)

        active_users_count = 0
        for p in profiles:
            u_id = p["user_id"]
            e_info = emp_dict.get(u_id, {})
            if e_info.get("status", "active") == "active":
                active_users_count += 1

        avg_tokens_per_request = (
            round((total_tokens_input + total_tokens_output) / total_requests, 2)
            if total_requests > 0
            else 0.0
        )
        avg_cost_per_request = (
            round(total_cost / total_requests, 6) if total_requests > 0 else 0.0
        )

        now_utc = datetime.now(timezone.utc)
        recent_15m = now_utc - timedelta(minutes=15)
        recent_reqs = 0
        for r in joined:
            try:
                dt = dateutil.parser.isoparse(r["created_at"])
                if dt.tzinfo is None:
                    dt = dt.replace(tzinfo=timezone.utc)
                if dt >= recent_15m:
                    recent_reqs += 1
            except Exception:
                pass
        requests_per_minute = round(recent_reqs / 15.0, 2)

        model_aggs = defaultdict(
            lambda: {
                "model_name": "",
                "provider": "",
                "requests": 0,
                "tokens_input": 0,
                "tokens_output": 0,
                "total_cost": 0.0,
            }
        )
        for r in joined:
            m_name = r["model_name"]
            model_aggs[m_name]["model_name"] = m_name
            model_aggs[m_name]["provider"] = r["provider"]
            model_aggs[m_name]["requests"] += 1
            model_aggs[m_name]["tokens_input"] += r["tokens_input"]
            model_aggs[m_name]["tokens_output"] += r["tokens_output"]
            model_aggs[m_name]["total_cost"] += r["total_cost"]

        for m_name, val in model_aggs.items():
            val["avg_cost_per_request"] = round(val["total_cost"] / val["requests"], 6)
            val["total_cost"] = round(val["total_cost"], 6)

        dep_aggs = defaultdict(
            lambda: {
                "department_name": "",
                "requests": 0,
                "tokens_input": 0,
                "tokens_output": 0,
                "total_cost": 0.0,
            }
        )
        for r in joined:
            d_name = r["department"]
            dep_aggs[d_name]["department_name"] = d_name
            dep_aggs[d_name]["requests"] += 1
            dep_aggs[d_name]["tokens_input"] += r["tokens_input"]
            dep_aggs[d_name]["tokens_output"] += r["tokens_output"]
            dep_aggs[d_name]["total_cost"] += r["total_cost"]

        for d_name, val in dep_aggs.items():
            val["total_cost"] = round(val["total_cost"], 6)

        role_aggs = defaultdict(
            lambda: {
                "role_name": "",
                "requests": 0,
                "tokens_input": 0,
                "tokens_output": 0,
                "total_cost": 0.0,
            }
        )
        for r in joined:
            role_n = r["role"]
            role_aggs[role_n]["role_name"] = role_n
            role_aggs[role_n]["requests"] += 1
            role_aggs[role_n]["tokens_input"] += r["tokens_input"]
            role_aggs[role_n]["tokens_output"] += r["tokens_output"]
            role_aggs[role_n]["total_cost"] += r["total_cost"]

        for role_n, val in role_aggs.items():
            val["total_cost"] = round(val["total_cost"], 6)

        user_aggs = {}

        for p in profiles:
            u_id = p["user_id"]
            p_info = p
            e_info = emp_dict.get(u_id, {})

            role_id = e_info.get("role_id")
            role_name = roles_dict.get(role_id, "user")

            dep_id = e_info.get("department_id")
            dep_name = deps_dict.get(dep_id, "General")

            email = e_info.get("work_email") or f"{u_id[:8]}@convert.ia"
            name = p_info.get("full_name") or (
                email.split("@")[0].capitalize() if "@" in email else "Usuario"
            )

            user_aggs[u_id] = {
                "name": name,
                "email": email,
                "role": role_name,
                "department": dep_name,
                "requests": 0,
                "tokens_input": 0,
                "tokens_output": 0,
                "total_cost": 0.0,
                "last_use": "",
                "models_used": defaultdict(int),
            }

        for r in joined:
            u_id = r["user_id"]
            if u_id not in user_aggs:
                user_aggs[u_id] = {
                    "name": r["name"],
                    "email": r["email"],
                    "role": r["role"],
                    "department": r["department"],
                    "requests": 0,
                    "tokens_input": 0,
                    "tokens_output": 0,
                    "total_cost": 0.0,
                    "last_use": "",
                    "models_used": defaultdict(int),
                }
            u_entry = user_aggs[u_id]
            u_entry["requests"] += 1
            u_entry["tokens_input"] += r["tokens_input"]
            u_entry["tokens_output"] += r["tokens_output"]
            u_entry["total_cost"] += r["total_cost"]

            row_time = r["created_at"]
            if not u_entry["last_use"] or row_time > u_entry["last_use"]:
                u_entry["last_use"] = row_time

            u_entry["models_used"][r["model_name"]] += 1

        by_user_list = []
        for u_id, val in user_aggs.items():
            models_used = val["models_used"]
            most_used_model = (
                max(models_used, key=models_used.get) if models_used else "N/A"
            )

            by_user_list.append(
                {
                    "user_id": u_id,
                    "name": val["name"],
                    "email": val["email"],
                    "role": val["role"],
                    "department": val["department"],
                    "requests": val["requests"],
                    "tokens_input": val["tokens_input"],
                    "tokens_output": val["tokens_output"],
                    "total_cost": round(val["total_cost"], 6),
                    "last_use": val["last_use"],
                    "most_used_model": most_used_model,
                }
            )

        by_user_list.sort(key=lambda x: x["total_cost"], reverse=True)

        timeline_aggs = defaultdict(
            lambda: {
                "date": "",
                "requests": 0,
                "tokens_input": 0,
                "tokens_output": 0,
                "total_cost": 0.0,
            }
        )
        for r in joined:
            try:
                date_str = r["created_at"][:10]  # Get YYYY-MM-DD
                timeline_aggs[date_str]["date"] = date_str
                timeline_aggs[date_str]["requests"] += 1
                timeline_aggs[date_str]["tokens_input"] += r["tokens_input"]
                timeline_aggs[date_str]["tokens_output"] += r["tokens_output"]
                timeline_aggs[date_str]["total_cost"] += r["total_cost"]
            except Exception:
                pass

        timeline_list = list(timeline_aggs.values())
        timeline_list.sort(key=lambda x: x["date"])
        for item in timeline_list:
            item["total_cost"] = round(item["total_cost"], 6)

        result = {
            "summary": {
                "total_requests": total_requests,
                "total_tokens_input": total_tokens_input,
                "total_tokens_output": total_tokens_output,
                "total_cost": round(total_cost, 6),
                "active_users": active_users_count,
                "avg_tokens_per_request": avg_tokens_per_request,
                "avg_cost_per_request": avg_cost_per_request,
                "requests_per_minute": requests_per_minute,
            },
            "by_model": list(model_aggs.values()),
            "by_department": list(dep_aggs.values()),
            "by_role": list(role_aggs.values()),
            "by_user": by_user_list,
            "timeline": timeline_list,
        }

        # Guardar en cache por 30s (no crítico)
        try:
            await cache_client.setex("admin:metrics", 30, json.dumps(result))
        except Exception:
            pass

        return result

    except Exception as e:
        logger.error(f"Error compiling admin dashboard metrics: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Error interno del servidor al procesar las métricas: {str(e)}",
        )
