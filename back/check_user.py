import asyncio
import os
from dotenv import load_dotenv

load_dotenv("C:/Users/1073678981/Desktop/Convertiasuite-gpt/back/.env")

from supabase import create_client

async def main():
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    client = create_client(url, key)
    
    user_id = "ba8d0811-e6ee-47c1-9bdd-248e5acc221e"
    print(f"Checking user {user_id}")
    
    emp_res = client.table("employee_profiles").select("position_id").eq("user_id", user_id).execute()
    print("employee_profiles:", emp_res.data)
    
    if emp_res.data and emp_res.data[0].get("position_id"):
        pos_id = emp_res.data[0]["position_id"]
        pos_res = client.table("positions").select("position_name").eq("position_id", pos_id).execute()
        print("positions:", pos_res.data)

if __name__ == "__main__":
    asyncio.run(main())
