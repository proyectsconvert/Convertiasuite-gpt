import os
import json
import glob
import datetime

import requests

REPO_DIR = os.environ.get("CI_PROJECT_DIR", ".")


def load_json(path):
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return None


def parse_pip_audit(path="pip-audit-report.json"):
    """pip-audit --format json -> {"dependencies": [{"name","version","vulns":[{"id","fix_versions","description"}]}]}"""
    data = load_json(path)
    if not data:
        return []
    findings = []
    for dep in data.get("dependencies", []):
        for vuln in dep.get("vulns", []):
            findings.append({
                "origen": "pip-audit",
                "paquete": dep.get("name"),
                "version_actual": dep.get("version"),
                "id": vuln.get("id"),
                "fix_versions": vuln.get("fix_versions", []),
                "descripcion": (vuln.get("description") or "")[:300],
            })
    return findings


def parse_npm_audit(path="npm-audit-report.json"):
    """npm audit --json -> {"vulnerabilities": {"<pkg>": {"severity","range","fixAvailable","via":[...]}}}"""
    data = load_json(path)
    if not data:
        return []
    findings = []
    for name, info in (data.get("vulnerabilities") or {}).items():
        via = info.get("via", [])
        titles = [v.get("title") for v in via if isinstance(v, dict) and v.get("title")]
        findings.append({
            "origen": "npm-audit",
            "paquete": name,
            "severidad": info.get("severity"),
            "rango_afectado": info.get("range"),
            "fix_disponible": bool(info.get("fixAvailable")),
            "descripcion": "; ".join(titles)[:300],
        })
    return findings


def parse_trivy(reports_dir="trivy-reports"):
    """trivy image --format json -> {"ArtifactName","Results":[{"Vulnerabilities":[{"VulnerabilityID","PkgName","InstalledVersion","FixedVersion","Severity","Title"}]}]}"""
    findings = []
    for path in glob.glob(os.path.join(reports_dir, "*.json")):
        data = load_json(path)
        if not data:
            continue
        image_name = data.get("ArtifactName", os.path.basename(path))
        for result in (data.get("Results") or []):
            for vuln in (result.get("Vulnerabilities") or []):
                findings.append({
                    "origen": "trivy",
                    "imagen": image_name,
                    "paquete": vuln.get("PkgName"),
                    "version_actual": vuln.get("InstalledVersion"),
                    "version_arreglada": vuln.get("FixedVersion"),
                    "id": vuln.get("VulnerabilityID"),
                    "severidad": vuln.get("Severity"),
                    "titulo": (vuln.get("Title") or "")[:200],
                })
    return findings


SEVERITY_ORDER = {
    "CRITICAL": 0, "HIGH": 1, "MODERATE": 2, "MEDIUM": 2,
    "LOW": 3, "UNKNOWN": 4, "INFO": 4,
}


def sort_key(item):
    sev = (item.get("severidad") or "").upper()
    return SEVERITY_ORDER.get(sev, 5)


def build_summary_prompt(pip_findings, npm_findings, trivy_findings):
    payload = {
        "dependencias_python": pip_findings[:20],
        "dependencias_node": sorted(npm_findings, key=sort_key)[:20],
        "imagen_docker_produccion": sorted(trivy_findings, key=sort_key)[:20],
    }
    return f"""Eres un asesor de seguridad que ayuda a un equipo pequeño (2-5 devs) a priorizar vulnerabilidades.
Te paso datos crudos de tres escaneos automáticos: dependencias Python (pip-audit), dependencias Node (npm audit)
y la imagen Docker de producción (Trivy).

Datos:
{json.dumps(payload, indent=2, ensure_ascii=False)}

Genera un resumen en español, directo y accionable, en Markdown.

Para cada uno de los hallazgos más urgentes (prioriza CRITICAL y HIGH primero, máximo 5 hallazgos en total):

- **Dónde:** paquete o imagen afectada
- **Qué es:** el riesgo real en 1-2 frases, sin tecnicismos innecesarios
- **Qué hacer:** versión concreta a la que actualizar, o acción concreta si no hay fix disponible

Si algún hallazgo es de severidad baja/desconocida y sin fix disponible, ignóralo salvo que sea el único hallazgo.
Si no hay nada relevante, dilo explícitamente en una sola línea y no inventes urgencia.
Sé breve. No incluyas introducción ni conclusión, solo el listado (o la línea de "todo en orden").
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
            "labels": "seguridad,automatico",
        },
        timeout=30,
    )
    resp.raise_for_status()
    return resp.json()


def main():
    print("Leyendo reporte de pip-audit...")
    pip_findings = parse_pip_audit()
    print(f"  -> {len(pip_findings)} vulnerabilidades en dependencias Python")

    print("Leyendo reporte de npm audit...")
    npm_findings = parse_npm_audit()
    print(f"  -> {len(npm_findings)} vulnerabilidades en dependencias Node")

    print("Leyendo reportes de Trivy...")
    trivy_findings = parse_trivy()
    print(f"  -> {len(trivy_findings)} vulnerabilidades en la imagen Docker de producción")

    total = len(pip_findings) + len(npm_findings) + len(trivy_findings)
    if total == 0:
        print("No se encontraron vulnerabilidades esta semana. No se crea issue.")
        return

    print("Generando resumen con Ollama...")
    prompt = build_summary_prompt(pip_findings, npm_findings, trivy_findings)
    summary = call_llm(prompt)

    today_str = datetime.date.today().isoformat()
    title = f"🛡️ Radar de Seguridad — {today_str}"

    print("Creando issue en GitLab...")
    issue = create_gitlab_issue(title, summary)
    print(f"Issue creado: {issue.get('web_url')}")


if __name__ == "__main__":
    main()