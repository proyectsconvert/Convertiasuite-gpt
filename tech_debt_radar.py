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


# Utils
def run(cmd, cwd=REPO_DIR):
    result = subprocess.run(cmd, cwd=cwd, shell=True, capture_output=True, text=True)
    return result.stdout.strip()


# Files
def find_python_files():
    out = run("git ls-files '*.py'")
    return [REPO_DIR / f for f in out.splitlines() if f]


# TODO / FIXME
def blame_line_date(filepath, line_number):
    out = run(f"git log -1 --format=%aI -L {line_number},{line_number}:'{filepath}'")

    for line in out.splitlines():
        try:
            return datetime.datetime.fromisoformat(line.strip())
        except ValueError:
            continue

    return None


def scan_todos(files):
    findings = []

    today = datetime.datetime.now(datetime.timezone.utc)

    for file in files:
        try:
            lines = file.read_text(errors="ignore").splitlines()
        except Exception:
            continue

        for index, line in enumerate(lines, start=1):
            match = TODO_PATTERN.search(line)

            if not match:
                continue

            date = blame_line_date(file.relative_to(REPO_DIR), index)

            age_days = (today - date).days if date else None

            findings.append(
                {
                    "file": str(file.relative_to(REPO_DIR)),
                    "line": index,
                    "type": match.group(1).upper(),
                    "text": match.group(2)[:120],
                    "age_days": age_days,
                }
            )

    return [
        item
        for item in findings
        if item["age_days"] and item["age_days"] >= TODO_WARN_DAYS
    ]


# Complexity Radon
def scan_complexity():

    output = run("radon cc -j -s .")

    if not output:
        return []

    try:
        data = json.loads(output)
    except json.JSONDecodeError:
        print("Radon devolvió JSON inválido")
        return []

    findings = []

    for filepath, functions in data.items():
        for fn in functions:
            complexity = fn.get("complexity", 0)

            if complexity >= COMPLEXITY_THRESHOLD:
                findings.append(
                    {
                        "file": filepath,
                        "name": fn.get("name"),
                        "complexity": complexity,
                        "line": fn.get("lineno"),
                    }
                )

    return sorted(findings, key=lambda x: -x["complexity"])


# Zombie files
def is_referenced_elsewhere(module, rel_path):
    """
    FIX: antes se usaba grep con substrings sueltos ("import module"),
    lo que da falsos positivos/negativos con imports de paquete
    (ej. "from paquete.utils import x" no matchea "from utils").
    Usamos una regex con límites de palabra para exigir que "module"
    sea un token completo justo después de import/from.
    """
    escaped = re.escape(module)
    pattern = rf"(^|[^a-zA-Z0-9_])(import|from)\s+{escaped}([^a-zA-Z0-9_]|$)"

    output = run(f"grep -rlE --include='*.py' '{pattern}' . | grep -v -F '{rel_path}'")

    return output.splitlines() if output else []


def scan_stale_files(files):

    today = datetime.datetime.now(datetime.timezone.utc)

    findings = []

    for file in files:
        rel = file.relative_to(REPO_DIR)
        last_commit = run(f"git log -1 --format=%aI -- '{rel}'")

        if not last_commit:
            continue
        try:
            last_date = datetime.datetime.fromisoformat(last_commit)

        except ValueError:
            continue

        age = (today - last_date).days

        if age < STALE_DAYS:
            continue

        module = rel.stem

        refs = is_referenced_elsewhere(module, str(rel))

        if not refs:
            findings.append({"file": str(rel), "age_days": age, "referenced_by": 0})

    return sorted(findings, key=lambda x: -x["age_days"])


# ESLint
def parse_eslint(data):

    findings = []
    for file in data:
        for error in file.get("messages", []):
            findings.append(
                {
                    "file": file.get("filePath"),
                    "rule": error.get("ruleId", "unknown"),
                    "message": error.get("message"),
                    "line": error.get("line"),
                }
            )

    return findings


def load_eslint_report():

    path = Path("eslint-report.json")

    if not path.exists():
        return []

    with path.open(encoding="utf-8") as file:
        return parse_eslint(json.load(file))


# Ollama - olivia
def build_summary_prompt(todos, complexity, stale, eslint):

    payload = {
        "todos_viejos": todos[:15],
        "alta_complejidad": complexity[:15],
        "archivos_zombie": stale[:15],
        "errores_eslint": eslint[:15],
    }

    return f"""
Eres un asesor técnico.

Analiza deuda técnica del repositorio.

Datos:

{json.dumps(payload, indent=2, ensure_ascii=False)}

Genera máximo {TOP_N_ISSUES} problemas.

Formato:

- Dónde:
- Problema:
- Riesgo:
- Acción recomendada:

Sé breve.
"""


def call_llm(prompt):

    host = os.environ.get("OLLAMA_HOST", "http://localhost:11434").rstrip("/")

    model = os.environ.get("OLLAMA_MODEL", "llama3.1")

    response = requests.post(
        f"{host}/api/generate",
        json={"model": model, "prompt": prompt, "stream": False},
        timeout=300,
    )

    response.raise_for_status()

    return response.json().get("response", "").strip()


# GitLab
def get_labels(todos, complexity, stale, eslint):

    labels = ["deuda-tecnica", "automatico"]

    if complexity:
        labels.append("complejidad")

    if todos:
        labels.append("todo")

    if stale:
        labels.append("archivos-zombie")

    if eslint:
        labels.append("eslint")

    return ",".join(labels)


def create_gitlab_issue(title, description, todos, complexity, stale, eslint):

    token = os.environ["GITLAB_TECH_DEBT_TOKEN"]

    project_id = os.environ["CI_PROJECT_ID"]

    api = os.environ.get("CI_API_V4_URL", "https://gitlab.com/api/v4")

    response = requests.post(
        f"{api}/projects/{project_id}/issues",
        headers={"PRIVATE-TOKEN": token},
        data={
            "title": title,
            "description": description,
            "labels": get_labels(todos, complexity, stale, eslint),
        },
        timeout=30,  
    )
    response.raise_for_status()

    return response.json()


# Main

def main():

    files = find_python_files()

    todos = scan_todos(files)
    complexity = scan_complexity()
    stale = scan_stale_files(files)
    eslint = load_eslint_report()

    if not (todos or complexity or stale or eslint):
        print("No hay deuda técnica relevante.")

        return

    prompt = build_summary_prompt(todos, complexity, stale, eslint)

    summary = call_llm(prompt)

    today = datetime.date.today()

    title = f"Radar Deuda Técnica - {today}"

    issue = create_gitlab_issue(title, summary, todos, complexity, stale, eslint)

    print(f"Issue creado: {issue.get('web_url')}")


if __name__ == "__main__":
    main()
