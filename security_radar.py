import os
import json
import glob
import datetime
import requests
from concurrent.futures import ThreadPoolExecutor


def load_json(path):
    try:
        with open(path, "r", encoding="utf-8") as file:
            return json.load(file)
    except (FileNotFoundError, json.JSONDecodeError):
        return None


def fetch_osv_severity(vuln_id, timeout=10):
    if not vuln_id:
        return None
    try:
        response = requests.get(
            f"https://api.osv.dev/v1/vulns/{vuln_id}",
            timeout=timeout,
        )
        response.raise_for_status()
        data = response.json()

        db_specific = data.get("database_specific", {}) or {}
        severity = db_specific.get("severity")
        if severity:
            return str(severity).upper()

        for entry in data.get("severity", []):
            score_str = entry.get("score", "")
            try:
                score = float(score_str)
            except (TypeError, ValueError):
                continue
            if score >= 9.0:
                return "CRITICAL"
            if score >= 7.0:
                return "HIGH"
            if score >= 4.0:
                return "MEDIUM"
            return "LOW"
    except requests.RequestException:
        pass

    return None


# Lectura de reportes
def parse_pip_audit(path="pip-audit-report.json"):
    data = load_json(path)

    if not data:
        return []

    entries = []
    for dep in data.get("dependencies", []):
        for vuln in dep.get("vulns", []):
            entries.append((dep, vuln))

    if not entries:
        return []

    vuln_ids = [vuln.get("id") for _, vuln in entries]
    with ThreadPoolExecutor(max_workers=10) as executor:
        severities = list(executor.map(fetch_osv_severity, vuln_ids))

    findings = []
    for (dep, vuln), severity in zip(entries, severities):
        findings.append(
            {
                "origen": "pip-audit",
                "paquete": dep.get("name"),
                "version_actual": dep.get("version"),
                "id": vuln.get("id"),
                "fix_versions": vuln.get("fix_versions", []),
                "descripcion": vuln.get("description", "")[:300],
                "severidad": severity or "HIGH",
            }
        )

    return findings


def parse_npm_audit(path="npm-audit-report.json"):

    data = load_json(path)
    if not data:
        return []
    findings = []
    for name, info in data.get("vulnerabilities", {}).items():
        findings.append(
            {
                "origen": "npm-audit",
                "paquete": name,
                "severidad": info.get("severity", "UNKNOWN").upper(),
                "rango_afectado": info.get("range"),
                "fix_disponible": bool(info.get("fixAvailable")),
            }
        )

    return findings


def parse_trivy(reports_dir="trivy-reports"):
    findings = []
    for path in glob.glob(os.path.join(reports_dir, "*.json")):
        data = load_json(path)

        if not data:
            continue

        for result in data.get("Results", []):
            for vuln in result.get("Vulnerabilities", []):
                findings.append(
                    {
                        "origen": "trivy",
                        "imagen": data.get("ArtifactName", "desconocida"),
                        "paquete": vuln.get("PkgName"),
                        "version_actual": vuln.get("InstalledVersion"),
                        "version_arreglada": vuln.get("FixedVersion"),
                        "id": vuln.get("VulnerabilityID"),
                        "severidad": vuln.get("Severity", "UNKNOWN").upper(),
                        "descripcion": vuln.get("Title", "")[:200],
                    }
                )

    return findings


# Reglas seguridad

SEVERITY_ACTIONS = {
    "CRITICAL": "block_deploy",
    "HIGH": "create_issue",
    "MEDIUM": "create_issue",
    "MODERATE": "create_issue",
    "LOW": "comment",
    "UNKNOWN": "create_issue",
    "INFO": "ignore",
}


def classify_findings(findings):

    result = []

    for finding in findings:
        severity = (finding.get("severidad") or "UNKNOWN").upper()

        result.append(
            {
                "severidad": severity,
                "accion": SEVERITY_ACTIONS.get(severity, "create_issue"),
                "hallazgo": finding,
            }
        )

    return result


def has_critical(actions):

    return any(x["accion"] == "block_deploy" for x in actions)


def has_issue_required(actions):

    return any(x["accion"] == "create_issue" for x in actions)


# IA - olivia
def build_prompt(findings):

    return f"""
Analiza estos hallazgos de seguridad.

Genera un resumen Markdown corto.

Prioriza:
- CRITICAL
- HIGH
- MEDIUM

Formato:

## Hallazgo

Dónde:
Qué ocurre:
Qué hacer:

Datos:

{json.dumps(findings, indent=2, ensure_ascii=False)}
"""


def call_llm(prompt):

    host = os.environ.get("OLLAMA_HOST", "http://localhost:11434")

    model = os.environ.get("OLLAMA_MODEL", "qwen2.5:7b")

    response = requests.post(
        f"{host}/api/generate",
        json={"model": model, "prompt": prompt, "stream": False},
        timeout=300,
    )

    response.raise_for_status()

    return response.json().get("response", "")


# GitLab
def create_gitlab_issue(title, description):

    token = os.environ["GITLAB_SECURITY_TOKEN"]

    project_id = os.environ["CI_PROJECT_ID"]

    api = os.environ.get("CI_API_V4_URL", "https://gitlab.com/api/v4")

    response = requests.post(
        f"{api}/projects/{project_id}/issues",
        headers={"PRIVATE-TOKEN": token},
        data={
            "title": title,
            "description": description,
            "labels": "seguridad,automatico",
        },
        timeout=30,
    )

    response.raise_for_status()

    return response.json()


# Main
def main():

    pip = parse_pip_audit()
    npm = parse_npm_audit()
    trivy = parse_trivy()

    findings = pip + npm + trivy

    print(f"Hallazgos encontrados: {len(findings)}")

    if not findings:
        print("Sin vulnerabilidades.")

        return

    actions = classify_findings(findings)

    critical = has_critical(actions)

    issue_needed = has_issue_required(actions)

    if critical or issue_needed:
        print("Generando resumen...")

        summary = call_llm(build_prompt(findings))

        today = datetime.date.today().isoformat()

        severity = "CRITICAL" if critical else "HIGH"

        issue = create_gitlab_issue(f"Radar Seguridad [{severity}] {today}", summary)

        print(issue.get("web_url"))

    if critical:
        print("CRITICAL encontrado. Pipeline bloqueado.")

        exit(1)


if __name__ == "__main__":
    main()
