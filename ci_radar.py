import os
import subprocess
import json
import datetime
from collections import defaultdict
import requests

PROJECT_ID = os.environ["CI_PROJECT_ID"]
GITLAB_TOKEN = os.environ["GITLAB_CI_HEALTH_TOKEN"]
GITLAB_API = os.environ.get("CI_API_V4_URL", "https://gitlab.com/api/v4")

PIPELINES_LIMIT = int(os.environ.get("CI_HEALTH_PIPELINES_LIMIT", 40))


# gitlab api
def gitlab_get(url):
    response = requests.get(
        url,
        headers={"PRIVATE-TOKEN": GITLAB_TOKEN},
        timeout=30,
    )
    response.raise_for_status()
    return response.json()

def gitlab_get_paginated(url, max_pages=10):
    results = []
    page = 1

    separator = "&" if "?" in url else "?"

    while page <= max_pages:
        response = requests.get(
            f"{url}{separator}page={page}",
            headers={"PRIVATE-TOKEN": GITLAB_TOKEN},
            timeout=30,
        )
        response.raise_for_status()

        batch = response.json()
        if not batch:
            break

        results.extend(batch)

        next_page = response.headers.get("X-Next-Page")
        if not next_page:
            break

        page += 1

    return results


def get_recent_pipelines():
    url = f"{GITLAB_API}/projects/{PROJECT_ID}/pipelines?per_page={PIPELINES_LIMIT}"
    return gitlab_get(url)


def get_pipeline_jobs(pipeline_id):
    url = (
        f"{GITLAB_API}/projects/{PROJECT_ID}/pipelines/{pipeline_id}/jobs?per_page=100"
    )
    return gitlab_get_paginated(url)  # FIX: usa paginación


# Analysis
def analyze_pipelines(pipelines):

    total = len(pipelines)

    failed = [p for p in pipelines if p["status"] == "failed"]

    success_rate = ((total - len(failed)) / total) * 100 if total else 0

    return {
        "total_pipelines": total,
        "failed_pipelines": len(failed),
        "success_rate": round(success_rate, 2),
    }


def analyze_jobs(pipelines):

    failures = defaultdict(int)

    durations = defaultdict(list)

    for pipeline in pipelines:
        jobs = get_pipeline_jobs(pipeline["id"])

        for job in jobs:
            name = job["name"]

            if job["status"] == "failed":
                failures[name] += 1

            if job.get("duration"):
                durations[name].append(job["duration"])

    slow_jobs = []

    for name, values in durations.items():
        avg = sum(values) / len(values)

        slow_jobs.append({"job": name, "average_seconds": round(avg, 2)})

    slow_jobs.sort(key=lambda x: -x["average_seconds"])

    return {"most_failed_jobs": dict(failures), "slow_jobs": slow_jobs[:10]}


# Ollama
def build_prompt(data):

    return f"""

Eres un experto DevOps.
Analiza la salud del pipeline CI/CD.
Datos:

{json.dumps(data, indent=2)}


Genera un reporte Markdown:
## Problemas detectados
Para cada problema:
- Qué ocurre
- Impacto
- Acción recomendada

Si todo está bien responde:
"CI saludable"
Sé breve.
"""


def call_ollama(prompt):

    host = os.environ.get("OLLAMA_HOST", "http://localhost:11434")
    model = os.environ.get("OLLAMA_MODEL", "qwen2.5:7b")
    response = requests.post(
        f"{host}/api/generate",
        json={"model": model, "prompt": prompt, "stream": False},
        timeout=300,
    )

    response.raise_for_status()
    return response.json().get("response", "")


# GitLab Issue
def create_issue(summary):

    today = datetime.date.today()

    url = f"{GITLAB_API}/projects/{PROJECT_ID}/issues"

    response = requests.post(
        url,
        headers={"PRIVATE-TOKEN": GITLAB_TOKEN},
        data={
            "title": f"CI Health Radar - {today}",
            "description": summary,
            "labels": "ci-health,automatico",
        },
        timeout=30,
    )

    response.raise_for_status()
    return response.json()


# Main
def main():

    print("Leyendo pipelines...")

    pipelines = get_recent_pipelines()

    if not pipelines:
        print("No hay pipelines.")

        return

    pipeline_stats = analyze_pipelines(pipelines)

    job_stats = analyze_jobs(pipelines)

    data = {"pipelines": pipeline_stats, "jobs": job_stats}

    print(json.dumps(data, indent=2))

    if pipeline_stats["failed_pipelines"] == 0 and not job_stats["most_failed_jobs"]:
        print("CI saludable, no se crea issue.")
        return

    prompt = build_prompt(data)
    summary = call_ollama(prompt)
    issue = create_issue(summary)
    print(issue.get("web_url"))


if __name__ == "__main__":
    main()
