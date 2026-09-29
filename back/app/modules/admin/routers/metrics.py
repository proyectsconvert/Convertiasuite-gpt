from fastapi import APIRouter, Depends, HTTPException, Request
from typing import Optional
import logging
import json
import asyncio
from datetime import datetime, timezone, timedelta
from collections import defaultdict
import dateutil.parser

from app.dependencies.auth import require_admin, require_admin_or_qa
from app.infra.clients.supabase_client import SupabaseClient

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/metrics",
    tags=["admin-metrics"],
)

# ── Dashboard General ──────────────────────────────────────────────────────────

@router.get("")
async def get_metrics(
    request: Request,
    user_id: str | None = None,
    days: int | None = None,
    current_user: dict = Depends(require_admin),
):
    try:
        cache_key = f"admin:metrics:{user_id or 'all'}:{days or 'all'}"
        cache_client = None
        try:
            cache_obj = getattr(request.app.state, "cache", None)
            if cache_obj and hasattr(cache_obj, "redis"):
                cache_client = cache_obj.redis
                cached = await cache_client.get(cache_key)
                if cached:
                    return json.loads(cached)
        except Exception:
            pass

        supabase = SupabaseClient().db

        try:
            raw_auth_users = supabase.auth.admin.list_users()
            auth_users_list = getattr(raw_auth_users, "users", raw_auth_users) if raw_auth_users else []
            if isinstance(auth_users_list, list):
                for u in auth_users_list:
                    try:
                        u_id = getattr(u, "id", None)
                        if not u_id:
                            continue
                        user_metadata = getattr(u, "user_metadata", {}) or {}
                        name = user_metadata.get("full_name") or user_metadata.get("name")
                        area = user_metadata.get("area")
                        functional_role = user_metadata.get("functional_role")

                        p_data = {"user_id": str(u_id)}
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
                            clean_role = functional_role.strip()
                            pos_res = (
                                supabase.table("positions")
                                .select("position_id")
                                .ilike("position_name", clean_role)
                                .execute()
                            )
                            if pos_res.data:
                                pos_id = pos_res.data[0]["position_id"]
                            else:
                                pos_insert = (
                                    supabase.table("positions")
                                    .insert({"position_name": clean_role, "department_id": dep_id})
                                    .execute()
                                )
                                if pos_insert.data:
                                    pos_id = pos_insert.data[0]["position_id"]

                        u_email = getattr(u, "email", "") or ""
                        emp_data = {"user_id": str(u_id), "work_email": u_email}
                        if dep_id is not None:
                            emp_data["department_id"] = dep_id
                        if pos_id is not None:
                            emp_data["position_id"] = pos_id
                        supabase.table("employee_profiles").upsert(emp_data).execute()
                    except Exception as single_user_err:
                        logger.warning(f"Error processing single user sync in metrics: {single_user_err}")
        except Exception as sync_err:
            logger.error(f"Error syncing users in admin metrics: {sync_err}", exc_info=True)

        try:
            results = await asyncio.gather(
                asyncio.to_thread(lambda: supabase.table("usage_tracking").select("*").execute()),
                asyncio.to_thread(lambda: supabase.table("profiles").select("*").execute()),
                asyncio.to_thread(lambda: supabase.table("employee_profiles").select("*").execute()),
                asyncio.to_thread(lambda: supabase.table("roles").select("*").execute()),
                asyncio.to_thread(lambda: supabase.table("departments").select("*").execute()),
                asyncio.to_thread(lambda: supabase.table("models").select("*").execute()),
            )
            usage_res, profiles_res, emp_res, roles_res, deps_res, models_res = results
        except Exception as q_err:
            logger.error(f"Error ejecutando consultas paralelas a Supabase: {q_err}", exc_info=True)
            usage_res = supabase.table("usage_tracking").select("*").execute()
            profiles_res = supabase.table("profiles").select("*").execute()
            emp_res = supabase.table("employee_profiles").select("*").execute()
            roles_res = supabase.table("roles").select("*").execute()
            deps_res = supabase.table("departments").select("*").execute()
            models_res = supabase.table("models").select("*").execute()

        usage = getattr(usage_res, "data", []) or []
        profiles = getattr(profiles_res, "data", []) or []
        employee_profiles = getattr(emp_res, "data", []) or []
        roles = getattr(roles_res, "data", []) or []
        departments = getattr(deps_res, "data", []) or []
        models = getattr(models_res, "data", []) or []

        if days:
            now_utc = datetime.now(timezone.utc)
            cutoff_date = now_utc - timedelta(days=days)
            filtered_usage = []
            for row in usage:
                if not isinstance(row, dict):
                    continue
                created_at_val = row.get("created_at")
                if not created_at_val:
                    filtered_usage.append(row)
                    continue
                try:
                    dt = dateutil.parser.isoparse(str(created_at_val))
                    if dt.tzinfo is None:
                        dt = dt.replace(tzinfo=timezone.utc)
                    if dt >= cutoff_date:
                        filtered_usage.append(row)
                except Exception:
                    filtered_usage.append(row)
            usage = filtered_usage

        models_dict = {m["model_id"]: m for m in models if isinstance(m, dict) and "model_id" in m}
        profiles_dict = {p["user_id"]: p for p in profiles if isinstance(p, dict) and "user_id" in p}
        emp_dict = {e["user_id"]: e for e in employee_profiles if isinstance(e, dict) and "user_id" in e}
        roles_dict = {r["role_id"]: r.get("role_name", "user") for r in roles if isinstance(r, dict) and "role_id" in r}
        deps_dict = {d["department_id"]: d.get("department_name", "General") for d in departments if isinstance(d, dict) and "department_id" in d}

        joined = []
        for row in usage:
            if not isinstance(row, dict):
                continue
            u_id = row.get("user_id")
            if user_id and str(u_id) != str(user_id):
                continue
            m_id = row.get("model_id")

            m_info = models_dict.get(m_id) if m_id else {}
            p_info = profiles_dict.get(u_id) if u_id else {}
            e_info = emp_dict.get(u_id) if u_id else {}

            role_id = e_info.get("role_id") if isinstance(e_info, dict) else None
            role_name = "admin" if p_info.get("is_admin") else (roles_dict.get(role_id, "user") if role_id else "user")

            dep_id = p_info.get("department_id") or (e_info.get("department_id") if isinstance(e_info, dict) else None)
            dep_name = deps_dict.get(dep_id, "General") if dep_id else "General"

            u_str = str(u_id) if u_id is not None else ""
            email = (e_info.get("work_email") if isinstance(e_info, dict) else None) or (
                f"{u_str[:8]}@convert.ia" if u_str else "usuario@convert.ia"
            )
            name = (p_info.get("full_name") if isinstance(p_info, dict) else None) or (
                email.split("@")[0].capitalize() if "@" in email else "Usuario"
            )

            try:
                t_in = int(row.get("tokens_input") or 0)
            except (ValueError, TypeError):
                t_in = 0
            try:
                t_out = int(row.get("tokens_output") or 0)
            except (ValueError, TypeError):
                t_out = 0
            try:
                cost = float(row.get("total_cost") or 0.0)
            except (ValueError, TypeError):
                cost = 0.0

            joined.append({
                "usage_id": row.get("usage_id", ""),
                "user_id": u_str,
                "name": name,
                "email": email,
                "role": role_name,
                "department": dep_name,
                "model_name": m_info.get("model_name", "unknown") if isinstance(m_info, dict) else "unknown",
                "provider": m_info.get("provider", "unknown") if isinstance(m_info, dict) else "unknown",
                "tokens_input": t_in,
                "tokens_output": t_out,
                "total_cost": cost,
                "created_at": row.get("created_at"),
            })

        total_requests = len(joined)
        total_tokens_input = sum(r["tokens_input"] for r in joined)
        total_tokens_output = sum(r["tokens_output"] for r in joined)
        total_cost = sum(r["total_cost"] for r in joined)

        active_users_count = sum(
            1 for p in profiles
            if isinstance(p, dict) and
            (emp_dict.get(p.get("user_id"), {}) or {}).get("status", "active") == "active"
        )

        avg_tokens_per_request = (
            round((total_tokens_input + total_tokens_output) / total_requests, 2)
            if total_requests > 0 else 0.0
        )
        avg_cost_per_request = round(total_cost / total_requests, 6) if total_requests > 0 else 0.0

        now_utc = datetime.now(timezone.utc)
        recent_15m = now_utc - timedelta(minutes=15)
        recent_reqs = 0
        for r in joined:
            try:
                created_at_val = r.get("created_at")
                if created_at_val:
                    dt = dateutil.parser.isoparse(str(created_at_val))
                    if dt.tzinfo is None:
                        dt = dt.replace(tzinfo=timezone.utc)
                    if dt >= recent_15m:
                        recent_reqs += 1
            except Exception:
                pass
        requests_per_minute = round(recent_reqs / 15.0, 2)

        model_aggs = defaultdict(lambda: {"model_name": "", "provider": "", "requests": 0, "tokens_input": 0, "tokens_output": 0, "total_cost": 0.0})
        for r in joined:
            m_name = r["model_name"]
            model_aggs[m_name]["model_name"] = m_name
            model_aggs[m_name]["provider"] = r["provider"]
            model_aggs[m_name]["requests"] += 1
            model_aggs[m_name]["tokens_input"] += r["tokens_input"]
            model_aggs[m_name]["tokens_output"] += r["tokens_output"]
            model_aggs[m_name]["total_cost"] += r["total_cost"]
        for val in model_aggs.values():
            val["avg_cost_per_request"] = round(val["total_cost"] / val["requests"], 6) if val["requests"] > 0 else 0.0
            val["total_cost"] = round(val["total_cost"], 6)

        dep_aggs = defaultdict(lambda: {"department_name": "", "requests": 0, "tokens_input": 0, "tokens_output": 0, "total_cost": 0.0})
        for r in joined:
            d_name = r["department"]
            dep_aggs[d_name]["department_name"] = d_name
            dep_aggs[d_name]["requests"] += 1
            dep_aggs[d_name]["tokens_input"] += r["tokens_input"]
            dep_aggs[d_name]["tokens_output"] += r["tokens_output"]
            dep_aggs[d_name]["total_cost"] += r["total_cost"]
        for val in dep_aggs.values():
            val["total_cost"] = round(val["total_cost"], 6)

        role_aggs = defaultdict(lambda: {"role_name": "", "requests": 0, "tokens_input": 0, "tokens_output": 0, "total_cost": 0.0})
        for r in joined:
            role_n = r["role"]
            role_aggs[role_n]["role_name"] = role_n
            role_aggs[role_n]["requests"] += 1
            role_aggs[role_n]["tokens_input"] += r["tokens_input"]
            role_aggs[role_n]["tokens_output"] += r["tokens_output"]
            role_aggs[role_n]["total_cost"] += r["total_cost"]
        for val in role_aggs.values():
            val["total_cost"] = round(val["total_cost"], 6)

        user_aggs = {}
        for p in profiles:
            if not isinstance(p, dict):
                continue
            u_id = p.get("user_id")
            if not u_id:
                continue
            e_info = emp_dict.get(u_id) if u_id else {}
            role_id = e_info.get("role_id") if isinstance(e_info, dict) else None
            dep_id = e_info.get("department_id") if isinstance(e_info, dict) else None
            u_str = str(u_id)
            email = (e_info.get("work_email") if isinstance(e_info, dict) else None) or f"{u_str[:8]}@convert.ia"
            name = (p.get("full_name")) or (email.split("@")[0].capitalize() if "@" in email else "Usuario")
            user_aggs[u_str] = {
                "name": name,
                "email": email,
                "role": roles_dict.get(role_id, "user") if role_id else "user",
                "department": deps_dict.get(dep_id, "General") if dep_id else "General",
                "requests": 0, "tokens_input": 0, "tokens_output": 0, "total_cost": 0.0,
                "last_use": "", "models_used": defaultdict(int),
            }

        for r in joined:
            u_id = r["user_id"]
            if not u_id:
                continue
            if u_id not in user_aggs:
                user_aggs[u_id] = {
                    "name": r["name"], "email": r["email"], "role": r["role"], "department": r["department"],
                    "requests": 0, "tokens_input": 0, "tokens_output": 0, "total_cost": 0.0,
                    "last_use": "", "models_used": defaultdict(int),
                }
            u_entry = user_aggs[u_id]
            u_entry["requests"] += 1
            u_entry["tokens_input"] += r["tokens_input"]
            u_entry["tokens_output"] += r["tokens_output"]
            u_entry["total_cost"] += r["total_cost"]
            row_time = r.get("created_at")
            if row_time and isinstance(row_time, str):
                if not u_entry["last_use"] or row_time > u_entry["last_use"]:
                    u_entry["last_use"] = row_time
            if r.get("model_name"):
                u_entry["models_used"][r["model_name"]] += 1

        by_user_list = []
        for u_id, val in user_aggs.items():
            models_used = val["models_used"]
            most_used_model = max(models_used, key=models_used.get) if models_used else "N/A"
            by_user_list.append({
                "user_id": u_id, "name": val["name"], "email": val["email"],
                "role": val["role"], "department": val["department"],
                "requests": val["requests"], "tokens_input": val["tokens_input"],
                "tokens_output": val["tokens_output"], "total_cost": round(val["total_cost"], 6),
                "last_use": val["last_use"], "most_used_model": most_used_model,
            })
        by_user_list.sort(key=lambda x: x["total_cost"], reverse=True)

        timeline_aggs = defaultdict(lambda: {"date": "", "requests": 0, "tokens_input": 0, "tokens_output": 0, "total_cost": 0.0})
        for r in joined:
            try:
                created_at_val = r.get("created_at")
                if created_at_val and isinstance(created_at_val, str) and len(created_at_val) >= 10:
                    date_str = created_at_val[:10]
                    timeline_aggs[date_str]["date"] = date_str
                    timeline_aggs[date_str]["requests"] += 1
                    timeline_aggs[date_str]["tokens_input"] += r["tokens_input"]
                    timeline_aggs[date_str]["tokens_output"] += r["tokens_output"]
                    timeline_aggs[date_str]["total_cost"] += r["total_cost"]
            except Exception:
                pass

        timeline_list = sorted(timeline_aggs.values(), key=lambda x: x["date"])
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

        if cache_client:
            try:
                await cache_client.setex(cache_key, 30, json.dumps(result))
            except Exception:
                pass

        return result

    except Exception as e:
        logger.error(f"Error compiling admin dashboard metrics: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error interno del servidor al procesar las métricas: {str(e)}")


# ── Call Center Metrics ────────────────────────────────────────────────────────

CC_CATEGORIES = {"objecion", "inconformidad", "cierre_llamada", "tipificacion", "escalamiento", "consulta_producto"}
CC_LABELS = {
    "objecion": "Objeciones", "inconformidad": "Inconformidades",
    "cierre_llamada": "Cierre de Llamada", "tipificacion": "Tipificación",
    "escalamiento": "Escalamientos", "consulta_producto": "Consultas de Producto",
}


@router.get("/call-center")
async def get_call_center_metrics(
    request: Request,
    days: int = 30,
    campaign_id: str | None = None,
    current_user: dict = Depends(require_admin_or_qa),
):
    """
    Retorna métricas de call center extraídas de agent_query_logs.
    """
    try:
        supabase = SupabaseClient().db
        cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()

        query = (
            supabase.table("agent_query_logs")
            .select("log_id, user_id, campaign_id, query_text, query_category, rag_used, created_at")
            .gte("created_at", cutoff)
        )
        if campaign_id:
            query = query.eq("campaign_id", campaign_id)

        resp = query.execute()
        logs = getattr(resp, "data", []) or []
        cc_logs = [l for l in logs if (l.get("query_category") or "") in CC_CATEGORIES]

        cat_counts: dict = {}
        for log in cc_logs:
            cat = log.get("query_category") or "sin_categoria"
            cat_counts[cat] = cat_counts.get(cat, 0) + 1

        by_category = [
            {
                "category": cat, "label": CC_LABELS.get(cat, cat), "count": count,
                "percentage": round(count / len(cc_logs) * 100, 1) if cc_logs else 0,
            }
            for cat, count in sorted(cat_counts.items(), key=lambda x: x[1], reverse=True)
        ]

        camp_cat: dict = defaultdict(lambda: defaultdict(int))
        camp_names: dict = {}
        for log in cc_logs:
            cid = log.get("campaign_id") or "sin_campaña"
            cat = log.get("query_category") or "sin_categoria"
            camp_cat[cid][cat] += 1
            if cid not in camp_names:
                camp_names[cid] = cid[:8] if len(cid) > 12 else cid

        by_campaign = []
        for cid, cats in camp_cat.items():
            entry = {"campaign_id": cid, "campaign_name": camp_names.get(cid, cid)}
            for cat in CC_CATEGORIES:
                entry[cat] = cats.get(cat, 0)
            entry["total"] = sum(cats.values())
            by_campaign.append(entry)
        by_campaign.sort(key=lambda x: x["total"], reverse=True)

        daily: dict = defaultdict(lambda: {cat: 0 for cat in CC_CATEGORIES})
        for log in cc_logs:
            created_at = log.get("created_at") or ""
            if len(created_at) >= 10:
                day = created_at[:10]
                cat = log.get("query_category") or "sin_categoria"
                if cat in CC_CATEGORIES:
                    daily[day][cat] += 1
        daily_trend = [{"date": day, **cats} for day, cats in sorted(daily.items())]

        obj_logs = [l for l in cc_logs if l.get("query_category") == "objecion"]
        obj_text_counts: dict = {}
        for log in obj_logs:
            text = (log.get("query_text") or "").strip()
            if text:
                obj_text_counts[text] = obj_text_counts.get(text, 0) + 1
        top_objections = [
            {"query_text": t, "count": c}
            for t, c in sorted(obj_text_counts.items(), key=lambda x: x[1], reverse=True)[:10]
        ]

        rag_by_cat: dict = defaultdict(lambda: {"rag": 0, "total": 0})
        for log in cc_logs:
            cat = log.get("query_category") or "sin_categoria"
            rag_by_cat[cat]["total"] += 1
            if log.get("rag_used"):
                rag_by_cat[cat]["rag"] += 1
        rag_resolution = [
            {
                "category": cat, "label": CC_LABELS.get(cat, cat),
                "rag_used": v["rag"], "total": v["total"],
                "rag_rate": round(v["rag"] / v["total"] * 100, 1) if v["total"] > 0 else 0,
            }
            for cat, v in rag_by_cat.items()
        ]

        return {
            "summary": {"total_cc_queries": len(cc_logs), "total_logs_period": len(logs), "days": days},
            "by_category": by_category,
            "by_campaign": by_campaign,
            "daily_trend": daily_trend,
            "top_objections": top_objections,
            "rag_resolution": rag_resolution,
        }

    except Exception as e:
        logger.error(f"[call-center metrics] {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
