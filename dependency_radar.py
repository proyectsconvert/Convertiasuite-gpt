import os
import re
import json
import datetime
import subprocess
from pathlib import Path
import requests


TOP_UPDATES = int(os.environ.get("TOP_UPDATES", 10))


def run(cmd):
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    return result.stdout.strip()


def parse_requirement_names(requirements_path):
    """
    Extrae solo los nombres de paquete declarados en requirements.txt,
    normalizados (minúsculas, '_' == '-'), para filtrar el output de
    `pip list --outdated`. Sin esto, la imagen de CI trae herramientas
    propias (vulture, pytest, radon, pip-audit) que también aparecerían
    como "dependencias desactualizadas" del proyecto sin serlo.
    """
    names = set()
    for line in requirements_path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or line.startswith("-"):
            continue
        match = re.match(r"^([A-Za-z0-9_.\-]+)", line)
        if match:
            names.add(match.group(1).lower().replace("_", "-"))
    return names


def scan_python_dependencies():

    requirements = Path("back/requirements.txt")

    if not requirements.exists():
        return []

    declared = parse_requirement_names(requirements)

    output = run("pip list --outdated --format=json")

    if not output:
        return []

    try:
        packages = json.loads(output)
    except json.JSONDecodeError:
        return []

    findings = []

    for pkg in packages:
        name = pkg.get("name", "")
        if name.lower().replace("_", "-") not in declared:
            continue

        findings.append(
            {
                "ecosystem": "python",
                "package": name,
                "current_version": pkg.get("version"),
                "latest_version": pkg.get("latest_version"),
            }
        )

    return findings[:TOP_UPDATES]


def scan_node_dependencies():

    package_json = Path("front/package.json")

    if not package_json.exists():
        return []

    output = run("cd front && npm outdated --json || true")

    if not output:
        return []

    try:
        packages = json.loads(output)

    except json.JSONDecodeError:
        return []

    findings = []

    for name, pkg in packages.items():
        findings.append(
            {
                "ecosystem": "node",
                "package": name,
                "current_version": pkg.get("current"),
                "wanted_version": pkg.get("wanted"),
                "latest_version": pkg.get("latest"),
            }
        )

    return findings[:TOP_UPDATES]


# Ollama
def build_prompt(findings):

    return f"""
Eres un ingeniero senior manteniendo un proyecto pequeño.

Analiza estas dependencias desactualizadas:

{json.dumps(findings, indent=2, ensure_ascii=False)}


Genera un resumen Markdown.

Para cada actualización importante:

## Paquete

- Versión actual:
- Nueva versión:
- Riesgo:
- Recomendación:

Ignora cambios irrelevantes.
Prioriza:
- vulnerabilidades conocidas
- cambios mayores
- paquetes críticos

Sé breve.
"""


def call_ollama(prompt):

    host = os.environ.get("OLLAMA_HOST", "http://localhost:11434").rstrip("/")

    model = os.environ.get("OLLAMA_MODEL", "qwen2.5:7b")

    response = requests.post(
        f"{host}/api/generate",
        json={
            "model": model,
            "prompt": prompt,
            "stream": False,
            "options": {"temperature": 0.3},
        },
        timeout=300,
    )

    response.raise_for_status()
    return response.json().get("response", "").strip()


# GitLab


def create_gitlab_issue(summary):

    token = os.environ["GITLAB_DEPENDENCY_TOKEN"]
    project_id = os.environ["CI_PROJECT_ID"]
    api = os.environ.get("CI_API_V4_URL", "https://gitlab.com/api/v4")

    today = datetime.date.today()

    response = requests.post(
        f"{api}/projects/{project_id}/issues",
        headers={"PRIVATE-TOKEN": token},
        data={
            "title": f"Dependency Radar - {today}",
            "description": summary,
            "labels": "dependency-radar,automatico",
        },
        timeout=30,
    )

    response.raise_for_status()
    return response.json()


# Main
def main():

    print("Analizando dependencias...")
    findings = scan_python_dependencies() + scan_node_dependencies()
    if not findings:
        print("No hay dependencias pendientes.")

        return

    print(f"{len(findings)} actualizaciones encontradas.")

    prompt = build_prompt(findings)

    print("Consultando Ollama...")

    summary = call_ollama(prompt)

    print("Creando issue...")

    issue = create_gitlab_issue(summary)

    print(f"Issue creado: {issue.get('web_url')}")


if __name__ == "__main__":
    main()
