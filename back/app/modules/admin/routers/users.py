from fastapi import APIRouter, Depends, HTTPException, Request
from typing import Optional
import logging
import secrets
import string
import os

from app.dependencies.auth import get_current_user, require_admin, require_admin_or_qa
from app.infra.clients.supabase_client import SupabaseClient
from app.schemas.admin import InviteUserRequest

logger = logging.getLogger(__name__)

# URL del frontend para los redirects de invitación y recuperación de contraseña
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

router = APIRouter(
    prefix="/users",
    tags=["admin-users"],
)

@router.post("/invite")
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

@router.get("/")
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
