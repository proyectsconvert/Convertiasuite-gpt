import os
import re
import json
import subprocess
import datetime
from pathlib import Path

import requests

REPO_DIR = Path(os.environ.get("CI_PROJECT_DIR", "."))
STALE_DAYS = int(os.environ.get("STALE_DAYS", 180))
TODO_WARN_DAYS = int(os.environ.get("TODO_WARN_DAYS", 90))
COMPLEXITY_THRESHOLD = int(os.environ.get("COMPLEXITY_THRESHOLD", 10))
TOP_N_ISSUES = int(os.environ.get("TOP_N_ISSUES", 3))

TODO_PATTERN = re.compile(r"#\s*(TODO|FIXME|HACK)[:\s]+(.*)", re.IGNORECASE)


def run(cmd, cwd=REPO_DIR):
    result = subprocess.run(
        cmd, cwd=cwd, shell=True, capture_output=True, text=True
    )
    return result.stdout.strip()


def find_python_files():
    out = run("git ls-files '*.py'")
    return [REPO_DIR / f for f in out.splitlines() if f]


def blame_line_date(filepath, line_number):
    """Devuelve la fecha del commit que introdujo esa línea."""
    out = run(f"git log -1 --format=%aI -L {line_number},{line_number}:'{filepath}'")
    if not out:
        return None
    for line in out.splitlines():
        try:
            return datetime.datetime.fromisoformat(line.strip())
        except ValueError:
            continue
    return None


def scan_todos(files):
    findings = []
    today = datetime.datetime.now(datetime.timezone.utc)
    for f in files:
        try:
            text = f.read_text(errors="ignore").splitlines()
        except Exception:
            continue
        for i, line in enumerate(text, start=1):
            m = TODO_PATTERN.search(line)
            if not m:
                continue
            date = blame_line_date(f.relative_to(REPO_DIR), i)
            age_days = (today - date).days if date else None
            findings.append({
                "file": str(f.relative_to(REPO_DIR)),
                "line": i,
                "type": m.group(1).upper(),
                "text": m.group(2).strip()[:120],
                "age_days": age_days,
            })
    findings.sort(key=lambda x: (x["age_days"] is None, -(x["age_days"] or 0)))
    old_todos = [f for f in findings if f["age_days"] and f["age_days"] >= TODO_WARN_DAYS]
    return old_todos


def scan_complexity():
    out = run(f"radon cc -j -s .")
    if not out:
        return []
    try:
        data = json.loads(out)
    except json.JSONDecodeError:
        return []
    findings = []
    for filepath, items in data.items():
        for item in items:
            if item.get("complexity", 0) >= COMPLEXITY_THRESHOLD:
                findings.append({
                    "file": filepath,
                    "name": item.get("name"),
                    "complexity": item.get("complexity"),
                    "lineno": item.get("lineno"),
                })
    findings.sort(key=lambda x: -x["complexity"])
    return findings


def scan_stale_files(files):
    today = datetime.datetime.now(datetime.timezone.utc)
    stale = []
    for f in files:
        rel = f.relative_to(REPO_DIR)
        last_commit = run(f"git log -1 --format=%aI -- '{rel}'")
        if not last_commit:
            continue
        try:
            last_date = datetime.datetime.fromisoformat(last_commit)
        except ValueError:
            continue
        age_days = (today - last_date).days
        if age_days < STALE_DAYS:
            continue
        module_name = rel.stem
        refs = run(f"grep -rl --include='*.py' -e 'import {module_name}' -e 'from {module_name}' . | grep -v '{rel}'")
        if refs:
            stale.append({
                "file": str(rel),
                "age_days": age_days,
                "referenced_by": len(refs.splitlines()),
            })
    stale.sort(key=lambda x: -x["age_days"])
    return stale


def build_summary_prompt(todos, complexity, stale):
    payload = {
        "todos_viejos": todos[:15],
        "alta_complejidad": complexity[:15],
        "archivos_zombie": stale[:15],
    }
    return f"""Eres un asesor técnico que ayuda a un equipo pequeño (2-5 devs) a priorizar deuda técnica.
Te paso datos crudos de un análisis automático del repo (TODOs viejos, funciones complejas, archivos sin tocar pero aún en uso).

Datos:
{json.dumps(payload, indent=2, ensure_ascii=False)}

Genera un resumen en español, directo y accionable, con este formato exacto en Markdown:


Para cada uno de los {TOP_N_ISSUES} hallazgos más urgentes (puede mezclar TODOs, complejidad o archivos zombie):

- **Dónde:** archivo y línea/función
- **Por qué importa:** explica el riesgo real en 1-2 frases, sin tecnicismos innecesarios
- **Qué hacer:** acción concreta sugerida

Si algún hallazgo es trivial o no representa riesgo real, ignóralo aunque aparezca en los datos.
Sé breve. No incluyas introducción ni conclusión, solo el listado.
"""


def call_llm(prompt):
    host = os.environ.get("OLLAMA_HOST", "http://localhost:11434").rstrip("/")
    model = os.environ.get("OLLAMA_MODEL", "llama3.1")
    resp = requests.post(
        f"{host}/api/generate",
        json={
            "model": model,
            "prompt": prompt,
            "stream": False,
            "options": {"temperature": 0.3},
        },
        timeout=300,
    )
    resp.raise_for_status()
    data = resp.json()
    return data.get("response", "").strip()


def create_gitlab_issue(title, description):
    token = os.environ["CI_JOB_TOKEN"]
    project_id = os.environ["CI_PROJECT_ID"]
    api_url = os.environ.get("CI_API_V4_URL", "https://gitlab.com/api/v4")
    resp = requests.post(
        f"{api_url}/projects/{project_id}/issues",
        headers={"PRIVATE-TOKEN": token},
        data={
            "title": title,
            "description": description,
            "labels": "deuda-tecnica,automatico",
        },
        timeout=30,
    )
    resp.raise_for_status()
    return resp.json()


def main():
    print("Buscando archivos Python...")
    files = find_python_files()
    print(f"  -> {len(files)} archivos encontrados")

    print("Escaneando TODOs/FIXMEs viejos...")
    todos = scan_todos(files)
    print(f"  -> {len(todos)} TODOs con más de {TODO_WARN_DAYS} días")

    print("Calculando complejidad ciclomática (radon)...")
    complexity = scan_complexity()
    print(f"  -> {len(complexity)} funciones por encima del umbral ({COMPLEXITY_THRESHOLD})")

    print("Buscando archivos zombie...")
    stale = scan_stale_files(files)
    print(f"  -> {len(stale)} archivos sin tocar hace +{STALE_DAYS} días pero aún referenciados")

    if not (todos or complexity or stale):
        print("No se encontró deuda técnica relevante esta semana. No se crea issue.")
        return

    print("Generando resumen con Ollama...")
    prompt = build_summary_prompt(todos, complexity, stale)
    summary = call_llm(prompt)

    today_str = datetime.date.today().isoformat()
    title = f"🔍 Radar de Deuda Técnica — {today_str}"

    print("Creando issue en GitLab...")
    issue = create_gitlab_issue(title, summary)
    print(f"Issue creado: {issue.get('web_url')}")


if __name__ == "__main__":
    main()