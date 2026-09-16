import asyncio
import os
import sys

# Add the back directory to the python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), 'back')))

from app.infra.clients.supabase_client import SupabaseClient

async def main():
    client = SupabaseClient().admin
    
    # 1. Get all users
    users_resp = client.auth.admin.list_users()
    users = users_resp.users
    print(f"Found {len(users)} users.")
    
    # 2. Get the specific user (QA TIGO) or just list all with their roles
    for u in users:
        print(f"\nUser: {u.email} (ID: {u.id})")
        print(f"  app_metadata: {u.app_metadata}")
        print(f"  user_metadata: {u.user_metadata}")
        print(f"  role (native): {getattr(u, 'role', None)}")
        
        # Check profiles
        p_res = client.table("profiles").select("*").eq("user_id", u.id).execute()
        print(f"  profiles: {p_res.data}")
        
        # Check employee_profiles
        emp_res = client.table("employee_profiles").select("*").eq("user_id", u.id).execute()
        print(f"  employee_profiles: {emp_res.data}")
        
        # Check roles
        if emp_res.data and emp_res.data[0].get("role_id"):
            role_id = emp_res.data[0]["role_id"]
            roles_res = client.table("roles").select("*").eq("role_id", role_id).execute()
            print(f"  roles: {roles_res.data}")

if __name__ == "__main__":
    asyncio.run(main())
