from fastapi import APIRouter, Depends, HTTPException, Request
import logging
import asyncio
import json
import secrets
import string
from datetime import datetime, timezone, timedelta
import dateutil.parser
from collections import defaultdict
import os

from app.dependencies.auth import get_current_user, require_admin, require_admin_or_qa
from app.infra.clients.supabase_client import SupabaseClient
from app.schemas.admin import InviteUserRequest, AddCampaignMemberRequest

logger = logging.getLogger(__name__)

# URL del frontend para los redirects de invitación y recuperación de contraseña
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

router = APIRouter(
    prefix="/admin",
    tags=["admin"],
)


@router.get("/metrics")
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
                        
                        # 1. Upsert profiles
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
                                    .insert(
                                        {
                                            "position_name": clean_role,
                                            "department_id": dep_id,
                                        }
                                    )
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

            joined.append(
                {
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
                }
            )

        total_requests = len(joined)
        total_tokens_input = sum(r["tokens_input"] for r in joined)
        total_tokens_output = sum(r["tokens_output"] for r in joined)
        total_cost = sum(r["total_cost"] for r in joined)

        active_users_count = 0
        for p in profiles:
            if not isinstance(p, dict):
                continue
            u_id = p.get("user_id")
            e_info = emp_dict.get(u_id) if u_id else {}
            status = e_info.get("status", "active") if isinstance(e_info, dict) else "active"
            if status == "active":
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
            val["avg_cost_per_request"] = round(val["total_cost"] / val["requests"], 6) if val["requests"] > 0 else 0.0
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
            if not isinstance(p, dict):
                continue
            u_id = p.get("user_id")
            if not u_id:
                continue
            p_info = p
            e_info = emp_dict.get(u_id) if u_id else {}

            role_id = e_info.get("role_id") if isinstance(e_info, dict) else None
            role_name = roles_dict.get(role_id, "user") if role_id else "user"

            dep_id = e_info.get("department_id") if isinstance(e_info, dict) else None
            dep_name = deps_dict.get(dep_id, "General") if dep_id else "General"

            u_str = str(u_id)
            email = (e_info.get("work_email") if isinstance(e_info, dict) else None) or f"{u_str[:8]}@convert.ia"
            name = (p_info.get("full_name") if isinstance(p_info, dict) else None) or (
                email.split("@")[0].capitalize() if "@" in email else "Usuario"
            )

            user_aggs[u_str] = {
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
            if not u_id:
                continue
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

            row_time = r.get("created_at")
            if row_time and isinstance(row_time, str):
                if not u_entry["last_use"] or row_time > u_entry["last_use"]:
                    u_entry["last_use"] = row_time

            if r.get("model_name"):
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
                created_at_val = r.get("created_at")
                if created_at_val and isinstance(created_at_val, str) and len(created_at_val) >= 10:
                    date_str = created_at_val[:10]  # Get YYYY-MM-DD
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
        if cache_client:
            try:
                await cache_client.setex(cache_key, 30, json.dumps(result))
            except Exception:
                pass

        return result

    except Exception as e:
        logger.error(f"Error compiling admin dashboard metrics: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Error interno del servidor al procesar las métricas: {str(e)}",
        )


@router.post("/users/invite")
async def invite_user(
    body: InviteUserRequest,
    request: Request,
    current_user: dict = Depends(require_admin),
):
    try:
        supabase = SupabaseClient().db

        user_metadata = {
            "name": body.name or body.email.split("@")[0],
            "full_name": body.name or body.email.split("@")[0],
            "role": body.role,
        }
        if body.area:
            user_metadata["area"] = body.area
        if body.functional_role:
            user_metadata["functional_role"] = body.functional_role

        # 1. Asegurar Departamento
        dep_id = None
        if body.area:
            try:
                dep_res = (
                    supabase.table("departments")
                    .select("department_id")
                    .eq("department_name", body.area)
                    .execute()
                )
                if dep_res.data:
                    dep_id = dep_res.data[0]["department_id"]
                else:
                    dep_insert = (
                        supabase.table("departments")
                        .insert({"department_name": body.area})
                        .execute()
                    )
                    if dep_insert.data:
                        dep_id = dep_insert.data[0]["department_id"]
            except Exception as e:
                logger.warning(f"Error con departamento: {e}")

        # 2. Asegurar Rol
        role_id = None
        if body.role:
            try:
                role_res = (
                    supabase.table("roles")
                    .select("role_id")
                    .ilike("role_name", body.role)
                    .execute()
                )
                if role_res.data:
                    role_id = role_res.data[0]["role_id"]
                else:
                    role_insert = (
                        supabase.table("roles")
                        .insert({"role_name": body.role})
                        .execute()
                    )
                    if role_insert.data:
                        role_id = role_insert.data[0]["role_id"]
            except Exception as e:
                logger.warning(f"Error con rol: {e}")

        # 3. Asegurar Posición
        pos_id = None
        if body.functional_role:
            try:
                clean_role = body.functional_role.strip()
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
                        .insert(
                            {
                                "position_name": clean_role,
                                "department_id": dep_id,
                            }
                        )
                        .execute()
                    )
                    if pos_insert.data:
                        pos_id = pos_insert.data[0]["position_id"]
            except Exception as e:
                logger.warning(f"Error con posición: {e}")

        # 4. Chequear y crear usuario
        existing_user = None
        try:
            raw_users = supabase.auth.admin.list_users()
            users_list = getattr(raw_users, "users", raw_users) if raw_users else []
            if isinstance(users_list, list):
                for u in users_list:
                    if getattr(u, "email", "").lower() == body.email.lower():
                        existing_user = u
                        break
        except Exception as list_err:
            logger.warning(f"Error checking existing users in auth: {list_err}")

        action_type = "creado"
        new_user = None
        temp_password = None

        if existing_user:
            u_id = existing_user.id
            update_data = {
                "user_metadata": user_metadata,
                "app_metadata": {"role": body.role}
            }
            if body.password:
                update_data["password"] = body.password
            try:
                auth_res = supabase.auth.admin.update_user_by_id(u_id, update_data)
                new_user = getattr(auth_res, "user", None) or auth_res
            except Exception as upd_err:
                logger.warning(f"Error updating existing user by id: {upd_err}")
                new_user = existing_user
            action_type = "actualizado"
        else:
            if body.password:
                try:
                    auth_res = supabase.auth.admin.create_user({
                        "email": body.email,
                        "password": body.password,
                        "email_confirm": True,
                        "user_metadata": user_metadata,
                        "app_metadata": {"role": body.role}
                    })
                    new_user = getattr(auth_res, "user", None) or auth_res
                    action_type = "creado"
                except Exception as create_err:
                    logger.warning(f"create_user failed, trying invite_user_by_email fallback: {create_err}")
                    try:
                        auth_res = supabase.auth.admin.invite_user_by_email(
                            body.email,
                            options={
                                "data": user_metadata,
                                "redirect_to": f"{FRONTEND_URL}/update-password",
                            }
                        )
                        new_user = getattr(auth_res, "user", None) or auth_res
                        if new_user and hasattr(new_user, "id"):
                            try:
                                supabase.auth.admin.update_user_by_id(
                                    new_user.id,
                                    {"app_metadata": {"role": body.role}}
                                )
                            except Exception as app_err:
                                logger.warning(f"Error updating app_metadata in fallback: {app_err}")
                        action_type = "invitado"
                    except Exception as invite_err:
                        logger.error(f"Both create_user and invite_user_by_email failed: {invite_err}")
                        raise HTTPException(
                            status_code=400,
                            detail=f"Error en la base de datos de Auth: {str(create_err)}"
                        )
            else:
                temp_password = None
                try:
                    auth_res = supabase.auth.admin.invite_user_by_email(
                        body.email,
                        options={
                            "data": user_metadata,
                            "redirect_to": f"{FRONTEND_URL}/update-password",
                        }
                    )
                    new_user = getattr(auth_res, "user", None) or auth_res
                    if new_user and hasattr(new_user, "id"):
                        try:
                            supabase.auth.admin.update_user_by_id(
                                new_user.id,
                                {"app_metadata": {"role": body.role}}
                            )
                        except Exception as app_err:
                            logger.warning(f"Error updating app_metadata: {app_err}")
                    action_type = "invitado"
                except Exception as invite_err:
                    logger.warning(
                        f"invite_user_by_email failed (posiblemente SMTP no configurado): {invite_err}. "
                        f"Usando fallback: crear usuario con contraseña temporal."
                    )
                    # Fallback: generar contraseña temporal segura y crear el usuario directamente
                    alphabet = string.ascii_letters + string.digits + "!@#$%"
                    temp_password = "".join(secrets.choice(alphabet) for _ in range(16))
                    try:
                        auth_res = supabase.auth.admin.create_user({
                            "email": body.email,
                            "password": temp_password,
                            "email_confirm": True,
                            "user_metadata": user_metadata,
                            "app_metadata": {"role": body.role}
                        })
                        new_user = getattr(auth_res, "user", None) or auth_res
                        action_type = "creado_con_contraseña_temporal"
                    except Exception as create_err:
                        logger.error(f"Fallback create_user also failed: {create_err}")
                        raise HTTPException(
                            status_code=400,
                            detail=(
                                f"No se pudo enviar invitación por correo ({str(invite_err)}) "
                                f"y tampoco crear el usuario directamente: {str(create_err)}"
                            )
                        )

        # 5. Insertar profiles y employee_profiles
        if new_user and hasattr(new_user, "id"):
            u_id = new_user.id
            p_data = {"user_id": u_id}
            if body.name:
                p_data["full_name"] = body.name
            try:
                supabase.table("profiles").upsert(p_data).execute()
            except Exception as e_prof:
                logger.warning(f"Error upserting profile: {e_prof}")

            emp_data = {"user_id": u_id, "work_email": body.email, "status": "active"}
            if dep_id is not None:
                emp_data["department_id"] = dep_id
            if pos_id is not None:
                emp_data["position_id"] = pos_id
            if role_id is not None:
                emp_data["role_id"] = role_id
            try:
                supabase.table("employee_profiles").upsert(emp_data).execute()
            except Exception as emp_err:
                logger.warning(f"Error upserting employee_profiles: {emp_err}")

        try:
            cache_client = request.app.state.cache.redis
            await cache_client.delete("admin:metrics")
        except Exception:
            pass
        
        u_id_val = None
        if new_user and hasattr(new_user, "id"):
            u_id_val = str(new_user.id)
        elif existing_user and hasattr(existing_user, "id"):
            u_id_val = str(existing_user.id)

        response = {
            "status": "success",
            "action": action_type,
            "message": f"Usuario {action_type} exitosamente.",
            "email": body.email,
            "user_id": u_id_val,
        }
        if temp_password:
            response["temp_password"] = temp_password
            response["message"] = (
                "El servidor de correo no está configurado. "
                f"El usuario fue creado con una contraseña temporal: {temp_password}. "
                "Compártela con el usuario de forma segura."
            )
        return response

    except Exception as e:
        logger.error(f"Error invitar/crear usuario: {e}", exc_info=True)
        raise HTTPException(
            status_code=400,
            detail=f"Error al procesar usuario: {str(e)}",
        )

@router.get("/users")
async def get_system_users(
    request: Request,
    current_user: dict = Depends(require_admin_or_qa),
):
    try:
        supabase = SupabaseClient().db
        auth_users = []
        try:
            raw_users = supabase.auth.admin.list_users()
            if raw_users:
                auth_users = getattr(raw_users, "users", raw_users)
                if not isinstance(auth_users, list):
                    auth_users = []
        except Exception as auth_err:
            logger.warning(f"Error listing auth users: {auth_err}")

        profiles_res = supabase.table("profiles").select("*").execute()
        emp_res = supabase.table("employee_profiles").select("*").execute()
        deps_res = supabase.table("departments").select("*").execute()

        profiles_dict = {p["user_id"]: p for p in (profiles_res.data or [])}
        emp_dict = {e["user_id"]: e for e in (emp_res.data or [])}
        deps_dict = {d["department_id"]: d["department_name"] for d in (deps_res.data or [])}

        users = []
        for u in auth_users:
            u_id = str(u.id)
            user_meta = getattr(u, "user_metadata", {}) or {}
            app_meta = getattr(u, "app_metadata", {}) or {}

            p_info = profiles_dict.get(u_id, {})
            e_info = emp_dict.get(u_id, {})

            email = getattr(u, "email", "") or e_info.get("work_email", "")
            name = p_info.get("full_name") or user_meta.get("full_name") or user_meta.get("name") or (email.split("@")[0].capitalize() if email else "Usuario")
            role = app_meta.get("role") or user_meta.get("role") or "user"
            area = user_meta.get("area") or deps_dict.get(e_info.get("department_id"), "")
            functional_role = user_meta.get("functional_role") or ""

            users.append({
                "user_id": u_id,
                "name": name,
                "email": email,
                "role": role,
                "area": area,
                "functional_role": functional_role,
            })

        return {"status": "success", "users": users}
    except Exception as e:
        logger.error(f"Error fetching users: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Error interno del servidor al obtener usuarios: {str(e)}",
        )

#CAMPAÑAS

@router.get("/campaigns")
async def get_campaigns(
    request: Request,
    current_user: dict = Depends(require_admin_or_qa),
):
    try:
        supabase = SupabaseClient().db
        campaigns_res = supabase.table("campaigns").select("*").execute()
        campaigns = campaigns_res.data or []
        
        # If user is not admin, filter campaigns they are member of (unless RLS does it automatically)
        # RLS in supabase handles member_see_own_campaign, but we are using service role here (db=admin),
        # so we need to filter manually.
        user_role = current_user.get("role", "").lower()
        if user_role != "admin":
            members_res = supabase.table("campaign_members").select("campaign_id").eq("user_id", current_user["id"]).execute()
            user_campaign_ids = [m["campaign_id"] for m in (members_res.data or [])]
            campaigns = [c for c in campaigns if c["campaign_id"] in user_campaign_ids]

        return {"status": "success", "campaigns": campaigns}
    except Exception as e:
        logger.error(f"Error fetching campaigns: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Error interno del servidor al obtener campañas: {str(e)}",
        )

@router.post("/campaigns")
async def create_campaign(
    request: Request,
    campaign_data: dict,
    current_user: dict = Depends(require_admin_or_qa),
):
    try:
        supabase = SupabaseClient().db
        insert_res = supabase.table("campaigns").insert(campaign_data).execute()
        new_campaign = insert_res.data[0] if insert_res.data else None
        return {"status": "success", "campaign": new_campaign}
    except Exception as e:
        logger.error(f"Error creating campaign: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Error interno del servidor al crear campaña: {str(e)}",
        )

@router.put("/campaigns/{campaign_id}")
async def update_campaign(
    campaign_id: str,
    request: Request,
    campaign_data: dict,
    current_user: dict = Depends(require_admin_or_qa),
):
    try:
        supabase = SupabaseClient().db
        update_res = (
            supabase.table("campaigns")
            .update(campaign_data)
            .eq("campaign_id", campaign_id)
            .execute()
        )
        updated_campaign = update_res.data[0] if update_res.data else None
        return {"status": "success", "campaign": updated_campaign}
    except Exception as e:
        logger.error(f"Error updating campaign {campaign_id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Error interno del servidor al actualizar campaña: {str(e)}",
        )

@router.delete("/campaigns/{campaign_id}")
async def delete_campaign(
    campaign_id: str,
    request: Request,
    current_user: dict = Depends(require_admin_or_qa),
):
    try:
        supabase = SupabaseClient().db
        delete_res = (
            supabase.table("campaigns")
            .delete()
            .eq("campaign_id", campaign_id)
            .execute()
        )
        return {"status": "success", "deleted_count": len(delete_res.data or [])}
    except Exception as e:
        logger.error(f"Error deleting campaign {campaign_id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Error interno del servidor al eliminar campaña: {str(e)}",
        )
@router.get("/campaigns/{campaign_id}/members")
async def get_campaign_members(
    campaign_id: str,
    request: Request,
    current_user: dict = Depends(require_admin_or_qa),
):
    try:
        supabase = SupabaseClient().db
        members_res = (
            supabase.table("campaign_members")
            .select("*")
            .eq("campaign_id", campaign_id)
            .execute()
        )
        members = members_res.data or []

        if members:
            user_ids = [m["user_id"] for m in members]
            profiles_res = supabase.table("profiles").select("*").in_("user_id", user_ids).execute()
            emp_res = supabase.table("employee_profiles").select("*").in_("user_id", user_ids).execute()

            profiles_dict = {p["user_id"]: p for p in (profiles_res.data or [])}
            emp_dict = {e["user_id"]: e for e in (emp_res.data or [])}

            auth_emails = {}
            try:
                all_auth = supabase.auth.admin.list_users()
                if all_auth:
                    auth_emails = {str(u.id): getattr(u, "email", "") for u in all_auth if hasattr(u, "id")}
            except Exception:
                pass

            for m in members:
                uid = m["user_id"]
                p = profiles_dict.get(uid, {})
                e = emp_dict.get(uid, {})
                email_val = auth_emails.get(uid) or e.get("work_email") or ""
                name_val = p.get("full_name") or (email_val.split("@")[0].capitalize() if "@" in email_val else "Usuario")
                m["user_name"] = name_val
                m["user_email"] = email_val

        return {"status": "success", "members": members}
    except Exception as e:
        logger.error(f"Error fetching members for campaign {campaign_id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Error interno del servidor al obtener miembros de la campaña: {str(e)}",
        )
@router.delete("/campaigns/{id}/members/{user_id}")
async def remove_campaign_member(
    id: str,
    user_id: str,
    request: Request,
    current_user: dict = Depends(require_admin_or_qa),
):
    try:
        supabase = SupabaseClient().db
        delete_res = (
            supabase.table("campaign_members")
            .delete()
            .eq("campaign_id", id)
            .eq("user_id", user_id)
            .execute()
        )
        return {"status": "success", "deleted_count": len(delete_res.data or [])}
    except Exception as e:
        logger.error(f"Error removing member {user_id} from campaign {id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Error interno del servidor al eliminar miembro de la campaña: {str(e)}",
        )

@router.post("/campaigns/{id}/members")
async def add_campaign_members(
    id: str,
    body: AddCampaignMemberRequest,
    request: Request,
    current_user: dict = Depends(require_admin_or_qa),
):
    try:
        supabase = SupabaseClient().db
        insert_data = {
            "campaign_id": id,
            "user_id": body.user_id,
            "campaign_role": body.campaign_role,
        }
        insert_res = supabase.table("campaign_members").insert(insert_data).execute()
        return {"status": "success", "added_members": insert_res.data or []}
    except Exception as e:
        logger.error(f"Error adding members to campaign {id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Error interno del servidor al agregar miembros a la campaña: {str(e)}",
        )
@router.get("/training-insights")
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