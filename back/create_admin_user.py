import sys
import os
from dotenv import load_dotenv

# Asegurar que podemos importar desde app
sys.path.insert(0, os.path.abspath("."))
load_dotenv(".env")

from app.infra.clients.supabase_client import SupabaseClient

def create_or_restore_admin():
    print("--- RESTAURAR/CREAR USUARIO ADMINISTRADOR ---")
    
    try:
        supabase = SupabaseClient().db
        print("Conexión con Supabase establecida.")
    except Exception as e:
        print(f"Error inicializando SupabaseClient: {e}")
        return

    if len(sys.argv) > 1:
        email = sys.argv[1]
        password = sys.argv[2] if len(sys.argv) > 2 else ""
    else:
        email = input("Ingresa el correo electrónico del admin [admin@convert.ia]: ").strip()
        if not email:
            email = "admin@convert.ia"
            
        password = input("Ingresa la contraseña del admin [Admin123!]: ").strip()
        if not password:
            password = "Admin123!"

    name = "Administrador"

    print("\nVerificando rol 'admin' en la base de datos...")
    try:
        role_res = supabase.table("roles").select("role_id").eq("role_name", "admin").execute()
        if role_res.data:
            role_id = role_res.data[0]["role_id"]
            print(f"Rol 'admin' encontrado. ID: {role_id}")
        else:
            print("Rol 'admin' no existe. Creándolo...")
            role_insert = supabase.table("roles").insert({"role_name": "admin"}).execute()
            role_id = role_insert.data[0]["role_id"]
            print(f"Rol 'admin' creado. ID: {role_id}")
    except Exception as e:
        print(f"Advertencia al verificar/crear rol: {e}")
        role_id = None

    print("Verificando departamento 'IT'...")
    try:
        dep_res = supabase.table("departments").select("department_id").eq("department_name", "IT").execute()
        if dep_res.data:
            dep_id = dep_res.data[0]["department_id"]
        else:
            dep_insert = supabase.table("departments").insert({"department_name": "IT"}).execute()
            dep_id = dep_insert.data[0]["department_id"]
    except Exception as e:
        print(f"Advertencia al verificar departamento: {e}")
        dep_id = None

    print("Verificando posición 'desarrollador'...")
    try:
        pos_res = supabase.table("positions").select("position_id").eq("position_name", "desarrollador").execute()
        if pos_res.data:
            pos_id = pos_res.data[0]["position_id"]
        else:
            pos_insert = supabase.table("positions").insert({
                "position_name": "desarrollador",
                "department_id": dep_id
            }).execute()
            pos_id = pos_insert.data[0]["position_id"]
    except Exception as e:
        print(f"Advertencia al verificar posición: {e}")
        pos_id = None

    # 4. Buscar usuario en Supabase Auth
    print("\nBuscando usuario en Supabase Auth...")
    existing_user = None
    try:
        auth_users = supabase.auth.admin.list_users()
        if auth_users:
            for u in auth_users:
                if getattr(u, "email", "").lower() == email.lower():
                    existing_user = u
                    break
    except Exception as e:
        print(f"Error listando usuarios en auth: {e}")

    u_id = None
    user_metadata = {
        "name": name,
        "full_name": name,
        "role": "admin",
        "area": "IT",
        "functional_role": "desarrollador"
    }

    if existing_user:
        u_id = existing_user.id
        print(f"Usuario existente encontrado con ID: {u_id}")
        print("Actualizando contraseña, metadata y app_metadata a 'admin'...")
        try:
            update_data = {
                "user_metadata": user_metadata,
                "app_metadata": {"role": "admin"}
            }
            if password:
                update_data["password"] = password
            
            auth_res = supabase.auth.admin.update_user_by_id(u_id, update_data)
            print("Usuario actualizado exitosamente en Supabase Auth.")
        except Exception as e:
            print(f"Error actualizando usuario en Supabase Auth: {e}")
            return
    else:
        print("Usuario no encontrado en Supabase Auth. Creándolo...")
        try:
            auth_res = supabase.auth.admin.create_user({
                "email": email,
                "password": password,
                "email_confirm": True,
                "user_metadata": user_metadata,
                "app_metadata": {"role": "admin"}
            })
            user = getattr(auth_res, "user", None) or auth_res
            u_id = user.id
            print(f"Usuario creado exitosamente con ID: {u_id}")
        except Exception as e:
            print(f"Error creando usuario en Supabase Auth: {e}")
            return

    # 5. Insertar/Upsert en profiles y employee_profiles
    if u_id:
        print("\nSincronizando perfil en la base de datos (profiles)...")
        try:
            supabase.table("profiles").upsert({
                "user_id": u_id,
                "full_name": name
            }).execute()
            print("Perfil (profiles) sincronizado.")
        except Exception as e:
            print(f"Error sincronizando profiles: {e}")

        print("Sincronizando perfil de empleado (employee_profiles)...")
        try:
            emp_data = {
                "user_id": u_id,
                "work_email": email,
                "status": "active"
            }
            if dep_id is not None:
                emp_data["department_id"] = dep_id
            if pos_id is not None:
                emp_data["position_id"] = pos_id
            if role_id is not None:
                emp_data["role_id"] = role_id
                
            supabase.table("employee_profiles").upsert(emp_data).execute()
            print("Perfil de empleado (employee_profiles) sincronizado.")
        except Exception as e:
            print(f"Error sincronizando employee_profiles: {e}")

    print("\n¡Proceso completado exitosamente!")
    print(f"Correo: {email}")
    print(f"Contraseña: {password}")
    print("Ya deberías poder iniciar sesión en la plataforma con este usuario.")

if __name__ == "__main__":
    create_or_restore_admin()
