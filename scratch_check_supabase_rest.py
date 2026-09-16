import urllib.request
import json
import urllib.error

url = "https://supabasehub.testbot.click/rest/v1/"
headers = {
    "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzc2ODY2MDk1LCJleHAiOjIwOTIyMjYwOTV9.QAfsYKdSZ1sdC955jjHNm3NI7g8CWB5Vvh4dfkLgaeU",
    "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3NzY4NjYwOTUsImV4cCI6MjA5MjIyNjA5NX0.aDOQAYDVUnTUz0giQZ0rGKdL60FlYKFgujnuhzKDbv4",
    "Content-Type": "application/json"
}

def get(path):
    req = urllib.request.Request(url + path, headers=headers)
    try:
        with urllib.request.urlopen(req) as response:
            return json.loads(response.read().decode())
    except urllib.error.HTTPError as e:
        print(f"Error {e.code}: {e.read().decode()}")
        return None

print("employee_profiles:")
print(json.dumps(get("employee_profiles?select=*"), indent=2))

print("\nroles:")
print(json.dumps(get("roles?select=*"), indent=2))
