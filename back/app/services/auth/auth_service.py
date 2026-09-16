import logging
import jwt
from jwt import InvalidTokenError

from app.core.config import get_settings
from app.infra.clients.supabase_client import SupabaseClient

logger = logging.getLogger(__name__)


class AuthService:

    def __init__(self):
        self.supabase = SupabaseClient().anon

    async def authenticate(self, email: str, password: str) -> dict | None:
        try:
            email = email.strip().lower()

            logger.info("Login attempt email=%s", email)

            response = self.supabase.auth.sign_in_with_password(
                {
                    "email": email,
                    "password": password,
                }
            )

            logger.info(
                "Supabase login response user=%s session=%s",
                bool(response and response.user),
                bool(response and response.session),
            )

            if not response or not response.user or not response.session:
                logger.warning(
                    "Supabase returned incomplete authentication response for email=%s",
                    email,
                )
                return None

            try:
                self.sync_user_profile_to_db(response.user)

            except Exception as se:
                logger.error(
                    "Authentication profile sync failed: %s",
                    se,
                    exc_info=True,
                )

            # Debug: log what metadata Supabase returned for this user
            _u = response.user
            logger.info(
                "Supabase user metadata DEBUG — app_metadata=%s user_metadata=%s native_role=%s",
                getattr(_u, "app_metadata", {}),
                getattr(_u, "user_metadata", {}),
                getattr(_u, "role", None),
            )

            return {
                "session": response.session,
                "user": response.user,
            }

        except Exception as e:
            logger.error(
                "Supabase authentication error type=%s error=%s",
                type(e).__name__,
                e,
                exc_info=True,
            )
            return None

    def decode_token(self, token: str) -> dict | None:
        try:
            secret = get_settings().supabase_jwt_secret
            if not secret:
                logger.warning(
                    "SUPABASE_JWT_SECRET no configurada, usando validacion por red."
                )
                response = self.supabase.auth.get_user(token)
                if not response or not response.user:
                    return None
                user = response.user
                user_metadata = user.user_metadata or {}
                return {
                    "sub": user.id,
                    "email": user.email,
                    "role": self._resolve_role(user),
                    "name": user_metadata.get("full_name")
                    or user_metadata.get("name")
                    or user.email,
                    "area": user_metadata.get("area"),
                    "functional_role": user_metadata.get("functional_role"),
                }

            # Validacion Local (0ms network latency)
            try:
                payload = jwt.decode(
                    token,
                    secret,
                    algorithms=["HS256"],
                    audience="authenticated",
                    leeway=120,  # Tolerancia de 120s por desincronizacion de reloj entre Docker y Supabase
                )
            except jwt.ImmatureSignatureError as e:
                logger.warning(
                    "Token not yet valid; revalidating with Supabase to avoid 401 due to clock skew: %s",
                    e,
                )
                response = self.supabase.auth.get_user(token)
                if not response or not response.user:
                    return None
                user = response.user
                user_metadata = user.user_metadata or {}
                return {
                    "sub": user.id,
                    "email": user.email,
                    "role": self._resolve_role(user),
                    "name": user_metadata.get("full_name")
                    or user_metadata.get("name")
                    or user.email,
                    "area": user_metadata.get("area"),
                    "functional_role": user_metadata.get("functional_role"),
                }
            except InvalidTokenError as e:
                logger.warning(
                    "Local JWT validation failed, falling back to Supabase remote validation: %s",
                    e,
                )
                response = self.supabase.auth.get_user(token)
                if not response or not response.user:
                    return None
                user = response.user
                user_metadata = user.user_metadata or {}
                return {
                    "sub": user.id,
                    "email": user.email,
                    "role": self._resolve_role(user),
                    "name": user_metadata.get("full_name")
                    or user_metadata.get("name")
                    or user.email,
                    "area": user_metadata.get("area"),
                    "functional_role": user_metadata.get("functional_role"),
                }

            user_metadata = payload.get("user_metadata", {}) or {}
            app_metadata = payload.get("app_metadata", {}) or {}

            role_val = app_metadata.get("role") or user_metadata.get("role")
            if not role_val and payload.get("role") and payload.get("role") != "authenticated":
                role_val = payload.get("role")

            return {
                "sub": payload.get("sub"),
                "email": payload.get("email"),
                "role": role_val or "authenticated",
                "name": user_metadata.get("full_name")
                or user_metadata.get("name")
                or payload.get("email"),
                "area": user_metadata.get("area"),
                "functional_role": user_metadata.get("functional_role"),
            }
        except Exception as e:
            logger.warning(
                "Validacion de token fallida (local o remota) type=%s error=%s",
                type(e).__name__,
                e,
            )
            return None

    def get_user_from_token(self, payload: dict) -> dict:

        return {
            "id": payload.get("sub"),
            "email": payload.get("email"),
            "role": payload.get(
                "role",
                "authenticated",
            ),
            "name": payload.get("name"),
            "area": payload.get("area"),
            "functional_role": payload.get("functional_role"),
        }

    def _resolve_role(self, user) -> str:

        app_metadata = user.app_metadata or {}
        user_metadata = user.user_metadata or {}

        # native user.role field (set from Supabase dashboard)
        native_role = getattr(user, "role", None)

        resolved = (
            app_metadata.get("role")
            or user_metadata.get("role")
            or (native_role if native_role not in (None, "authenticated") else None)
            or "authenticated"
        )

        logger.info(
            "_resolve_role: app_metadata_role=%s user_metadata_role=%s native_role=%s => resolved=%s",
            app_metadata.get("role"),
            user_metadata.get("role"),
            native_role,
            resolved,
        )

        return resolved

    async def refresh_token(self, refresh_token: str) -> dict | None:
        try:
            logger.info("Token refresh attempt")
            response = self.supabase.auth.refresh_session(refresh_token)
            if not response or not response.user or not response.session:
                return None
            return {"session": response.session, "user": response.user}
        except Exception as e:
            logger.error(f"Supabase session refresh error: {type(e).__name__}: {e}")
            return None

    def sync_user_profile_to_db(self, user) -> None:
        try:
            from app.infra.clients.supabase_client import SupabaseClient

            admin_client = SupabaseClient().admin

            user_id = str(user.id)
            email = getattr(user, "email", "")
            user_metadata = getattr(user, "user_metadata", {}) or {}
            app_metadata = getattr(user, "app_metadata", {}) or {}

            name = user_metadata.get("full_name") or user_metadata.get("name")
            area = user_metadata.get("area")
            functional_role = user_metadata.get("functional_role")

            # 1. Resolve department_id
            dep_id = None
            if area:
                dep_res = (
                    admin_client.table("departments")
                    .select("department_id")
                    .eq("department_name", area)
                    .execute()
                )
                if dep_res.data:
                    dep_id = dep_res.data[0]["department_id"]
                else:
                    dep_insert = (
                        admin_client.table("departments")
                        .insert({"department_name": area})
                        .execute()
                    )
                    if dep_insert.data:
                        dep_id = dep_insert.data[0]["department_id"]

            # 2. Resolve position_id
            pos_id = None
            if functional_role:
                clean_role = functional_role.strip()
                pos_res = (
                    admin_client.table("positions")
                    .select("position_id")
                    .ilike("position_name", clean_role)
                    .execute()
                )
                if pos_res.data:
                    pos_id = pos_res.data[0]["position_id"]
                else:
                    pos_insert = (
                        admin_client.table("positions")
                        .insert(
                            {"position_name": clean_role, "department_id": dep_id}
                        )
                        .execute()
                    )
                    if pos_insert.data:
                        pos_id = pos_insert.data[0]["position_id"]

            # Resolve role for profile
            resolved_role = self._resolve_role(user)

            is_admin_user = resolved_role == "admin"

            # 3. Upsert profiles table (including department_id, position_id, is_admin, role)
            p_data = {"user_id": user_id, "role": resolved_role}
            if name:
                p_data["full_name"] = name
            if dep_id is not None:
                p_data["department_id"] = dep_id
            if pos_id is not None:
                p_data["position_id"] = pos_id
            if is_admin_user:
                p_data["is_admin"] = True

            try:
                admin_client.table("profiles").upsert(p_data).execute()
            except Exception as upsert_err:
                logger.warning(
                    "profiles upsert with role failed (%s), retrying without role column",
                    upsert_err,
                )
                p_data_no_role = {k: v for k, v in p_data.items() if k != "role"}
                admin_client.table("profiles").upsert(p_data_no_role).execute()

            # 4. Upsert employee_profiles
            emp_data = {"user_id": user_id, "work_email": email}
            if dep_id is not None:
                emp_data["department_id"] = dep_id
            if pos_id is not None:
                emp_data["position_id"] = pos_id

            admin_client.table("employee_profiles").upsert(emp_data).execute()
            logger.info(f"Successfully synced user profile to database for: {email}")
        except Exception as e:
            logger.error(
                f"Error in sync_user_profile_to_db for user {getattr(user, 'id', 'unknown')}: {e}",
                exc_info=True,
            )

    async def update_profile(
        self,
        user_id: str,
        name: str | None = None,
        area: str | None = None,
        functional_role: str | None = None,
    ) -> dict | None:
        try:
            from app.infra.clients.supabase_client import SupabaseClient

            admin_client = SupabaseClient().admin

            attributes = {}

            current_user = admin_client.auth.admin.get_user_by_id(user_id)
            current_metadata = (
                current_user.user.user_metadata or {}
                if current_user and current_user.user
                else {}
            )

            new_metadata = {**current_metadata}
            if name is not None:
                new_metadata["full_name"] = name
            if area is not None:
                new_metadata["area"] = area
            if functional_role is not None:
                new_metadata["functional_role"] = functional_role

            # Only add to attributes if something changed
            if new_metadata != current_metadata:
                attributes["user_metadata"] = new_metadata

            if not attributes:
                try:
                    self.sync_user_profile_to_db(current_user.user)
                except Exception as se:
                    logger.error(f"Profile no-op sync failed: {se}")
                return self._format_user_response(current_user.user)

            response = admin_client.auth.admin.update_user_by_id(
                user_id,
                attributes,
            )
            if not response or not response.user:
                return None

            try:
                self.sync_user_profile_to_db(response.user)
            except Exception as se:
                logger.error(f"Profile update sync failed: {se}")

            return self._format_user_response(response.user)
        except Exception as e:
            logger.error(
                f"Error updating user profile user_id={user_id} error={type(e).__name__}: {e}"
            )
            return None

    async def change_password(
        self,
        user_id: str,
        current_password: str,
        new_password: str,
    ) -> dict | None:
        try:
            from app.infra.clients.supabase_client import SupabaseClient

            admin_client = SupabaseClient().admin

            user_response = admin_client.auth.admin.get_user_by_id(user_id)
            if not user_response or not user_response.user:
                logger.error(f"User not found: {user_id}")
                return None

            user_email = user_response.user.email

            anon_client = SupabaseClient().anon
            try:
                auth_response = anon_client.auth.sign_in_with_password(
                    {"email": user_email, "password": current_password}
                )
                if not auth_response or not auth_response.user:
                    logger.warning(f"Invalid current password for user: {user_id}")
                    return None
            except Exception as auth_error:
                logger.warning(
                    f"Password verification failed for user {user_id}: {auth_error}"
                )
                return None

            response = admin_client.auth.admin.update_user_by_id(
                user_id,
                {"password": new_password},
            )

            if not response or not response.user:
                logger.error(f"Failed to update password for user: {user_id}")
                return None

            return {"success": True}
        except Exception as e:
            logger.error(
                f"Error changing password for user_id={user_id} error={type(e).__name__}: {e}"
            )
            return None

    def _format_user_response(self, user) -> dict:
        """Format user response with all metadata fields and DB relations"""
        user_metadata = getattr(user, "user_metadata", {}) or {}
        app_metadata = getattr(user, "app_metadata", {}) or {}

        user_id = str(user.id)
        area = user_metadata.get("area")
        functional_role = user_metadata.get("functional_role")
        native_role = getattr(user, "role", None)
        role = (
            app_metadata.get("role")
            or user_metadata.get("role")
            or (native_role if native_role not in (None, "authenticated") else None)
            or "authenticated"
        )

        try:
            from app.infra.clients.supabase_client import SupabaseClient
            admin_client = SupabaseClient().admin

            p_res = (
                admin_client.table("profiles")
                .select("department_id, position_id, is_admin")
                .eq("user_id", user_id)
                .execute()
            )
            if p_res.data:
                p_row = p_res.data[0]
                if p_row.get("is_admin"):
                    role = "admin"
                dep_id = p_row.get("department_id")
                pos_id = p_row.get("position_id")

            # --- Read role, position, department from employee_profiles ---
            emp_res = (
                admin_client.table("employee_profiles")
                .select("role_id, position_id, department_id")
                .eq("user_id", user_id)
                .execute()
            )
            emp_role_id = None
            if emp_res.data:
                emp_row = emp_res.data[0]
                emp_role_id = emp_row.get("role_id")
                
                if not pos_id and emp_row.get("position_id"):
                    pos_id = emp_row.get("position_id")
                if not dep_id and emp_row.get("department_id"):
                    dep_id = emp_row.get("department_id")

            if dep_id and not area:
                dep_res = (
                    admin_client.table("departments")
                    .select("department_name")
                    .eq("department_id", dep_id)
                    .execute()
                )
                if dep_res.data:
                    area = dep_res.data[0]["department_name"]

            if pos_id and not functional_role:
                pos_res = (
                    admin_client.table("positions")
                    .select("position_name")
                    .eq("position_id", pos_id)
                    .execute()
                )
                if pos_res.data:
                    functional_role = pos_res.data[0]["position_name"]

            # --- Resolve role_name from roles table ---
            if role in (None, "authenticated", "user") and emp_role_id:
                roles_res = (
                    admin_client.table("roles")
                    .select("role_name")
                    .eq("role_id", emp_role_id)
                    .execute()
                )
                if roles_res.data:
                    role = roles_res.data[0].get("role_name", role)
                    logger.info(
                        "_format_user_response: role from DB roles table => %s",
                        role,
                    )

        except Exception as e:
            logger.warning(f"Error resolving profile relations in _format_user_response: {e}")

        return {
            "id": user_id,
            "name": (
                user_metadata.get("full_name") or user_metadata.get("name") or "Usuario"
            ),
            "email": getattr(user, "email", ""),
            "role": role,
            "area": area,
            "functional_role": functional_role,
        }
