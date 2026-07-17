import os
import ast
import re
import json
import datetime
import subprocess
from pathlib import Path
from collections import defaultdict
import requests

REPO_DIR = Path(os.environ.get("CI_PROJECT_DIR", "."))
BACKEND_DIR = REPO_DIR / os.environ.get("ARCHITECTURE_BACKEND_DIR", "back")

GOD_MODULE_LINES = int(os.environ.get("GOD_MODULE_LINES", 400))
FAN_OUT_THRESHOLD = int(os.environ.get("FAN_OUT_THRESHOLD", 15))
FAN_IN_THRESHOLD = int(os.environ.get("FAN_IN_THRESHOLD", 15))
VULTURE_MIN_CONFIDENCE = int(os.environ.get("VULTURE_MIN_CONFIDENCE", 70))
TOP_N = int(os.environ.get("ARCH_TOP_N", 10))

# Utils
def run(cmd, cwd=REPO_DIR):
    result = subprocess.run(cmd, cwd=cwd, shell=True, capture_output=True, text=True)
    return result


def find_python_files():
    out = run("git ls-files '*.py'").stdout.strip()
    return [REPO_DIR / f for f in out.splitlines() if f]


def find_backend_python_files(all_files):
    return [f for f in all_files if BACKEND_DIR in f.parents or f == BACKEND_DIR]


def module_name_from_path(rel_path):
    parts = list(Path(rel_path).parts)

    if parts and parts[-1] == "__init__.py":
        parts = parts[:-1]
    elif parts:
        parts[-1] = re.sub(r"\.py$", "", parts[-1])

    return ".".join(parts)


# Grafo de imports internos (usado para ciclos y acoplamiento)
def build_import_graph(files):
    module_to_file = {}

    for file in files:
        rel = file.relative_to(REPO_DIR)
        module_to_file[module_name_from_path(rel)] = str(rel)

    known_modules = set(module_to_file.keys())
    known_top_level = {m.split(".")[0] for m in known_modules}

    graph = defaultdict(set)

    for file in files:
        rel = file.relative_to(REPO_DIR)
        mod_name = module_name_from_path(rel)

        try:
            tree = ast.parse(file.read_text(errors="ignore"))
        except SyntaxError:
            continue

        for node in ast.walk(tree):
            if isinstance(node, ast.Import):
                for alias in node.names:
                    top = alias.name.split(".")[0]
                    if top in known_top_level:
                        target = _resolve_to_known_module(alias.name, known_modules)
                        if target and target != mod_name:
                            graph[mod_name].add(target)

            elif isinstance(node, ast.ImportFrom):
                if node.module is None:
                    continue
                top = node.module.split(".")[0]
                if top in known_top_level:
                    target = _resolve_to_known_module(node.module, known_modules)
                    if target and target != mod_name:
                        graph[mod_name].add(target)

    return module_to_file, graph


def _resolve_to_known_module(dotted_name, known_modules):
    parts = dotted_name.split(".")
    for i in range(len(parts), 0, -1):
        candidate = ".".join(parts[:i])
        if candidate in known_modules:
            return candidate
    return None


def find_cycles(graph):
    visited = set()
    stack = []
    on_stack = set()
    cycles = []

    def dfs(node):
        visited.add(node)
        stack.append(node)
        on_stack.add(node)

        for neighbor in graph.get(node, ()):
            if neighbor not in visited:
                dfs(neighbor)
            elif neighbor in on_stack:
                cycle_start = stack.index(neighbor)
                cycle = stack[cycle_start:] + [neighbor]
                if tuple(cycle) not in [tuple(c) for c in cycles]:
                    cycles.append(cycle)

        stack.pop()
        on_stack.discard(node)

    for node in list(graph.keys()):
        if node not in visited:
            dfs(node)

    return cycles


def find_god_modules(files):
    findings = []

    for file in files:
        try:
            line_count = len(file.read_text(errors="ignore").splitlines())
        except Exception:
            continue

        if line_count >= GOD_MODULE_LINES:
            findings.append({"file": str(file.relative_to(REPO_DIR)), "lines": line_count})

    return sorted(findings, key=lambda x: -x["lines"])[:TOP_N]


def find_high_coupling(graph):
    fan_out = {module: len(targets) for module, targets in graph.items()}

    fan_in = defaultdict(int)
    for module, targets in graph.items():
        for target in targets:
            fan_in[target] += 1

    high_fan_out = sorted(
        ({"module": m, "depende_de": n} for m, n in fan_out.items() if n >= FAN_OUT_THRESHOLD),
        key=lambda x: -x["depende_de"],
    )[:TOP_N]

    high_fan_in = sorted(
        ({"module": m, "usado_por": n} for m, n in fan_in.items() if n >= FAN_IN_THRESHOLD),
        key=lambda x: -x["usado_por"],
    )[:TOP_N]

    return high_fan_out, high_fan_in


# Clean / Hexagonal Architecture: capas y regla de dependencia
LAYER_KEYWORDS = {
    "domain": {"domain", "core", "entities", "entity", "model", "models"},
    "application": {"application", "app", "use_case", "use_cases", "usecases", "services", "service"},
    "infrastructure": {"infrastructure", "infra", "adapters", "adapter", "repositories", "repository", "persistence", "db", "external"},
    "interfaces": {"interfaces", "interface", "api", "presentation", "controllers", "controller", "views", "view", "routes", "handlers", "ports"},
}
ALLOWED_DEPENDENCIES = {
    "domain": {"domain"},
    "application": {"domain", "application"},
    "infrastructure": {"domain", "application", "infrastructure"},
    "interfaces": {"domain", "application", "interfaces"},
}


def detect_layer_dirs():
    layer_by_dirname = {}

    if not BACKEND_DIR.exists():
        return layer_by_dirname

    for entry in BACKEND_DIR.iterdir():
        if not entry.is_dir() or entry.name.startswith("."):
            continue

        name_lower = entry.name.lower()

        for layer, keywords in LAYER_KEYWORDS.items():
            if name_lower in keywords or any(kw in name_lower for kw in keywords):
                layer_by_dirname[entry.name] = layer
                break

    return layer_by_dirname


def classify_file_layer(filepath, layer_by_dirname):
    try:
        rel = filepath.relative_to(BACKEND_DIR)
    except ValueError:
        return None

    if not rel.parts:
        return None

    return layer_by_dirname.get(rel.parts[0])


def extract_local_top_level_imports(filepath):
    try:
        tree = ast.parse(filepath.read_text(errors="ignore"))
    except (SyntaxError, ValueError):
        return []

    modules = []

    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            for alias in node.names:
                modules.append(alias.name.split(".")[0])
        elif isinstance(node, ast.ImportFrom):
            if node.level and node.level > 0:
                continue 
            if node.module:
                modules.append(node.module.split(".")[0])

    return modules


def scan_layer_violations(backend_files):
    layer_by_dirname = detect_layer_dirs()

    if not layer_by_dirname:
        return {
            "capas_detectadas": {},
            "violaciones": [],
            "nota": (
                "No se detectaron carpetas de capas conocidas bajo "
                f"'{BACKEND_DIR.relative_to(REPO_DIR)}'. Revisa la convención de "
                "nombres (domain/application/infrastructure/interfaces) o ajusta "
                "la variable ARCHITECTURE_BACKEND_DIR."
            ),
        }

    violations = []

    for filepath in backend_files:
        source_layer = classify_file_layer(filepath, layer_by_dirname)
        if not source_layer:
            continue

        for module_name in extract_local_top_level_imports(filepath):
            target_layer = layer_by_dirname.get(module_name)
            if not target_layer:
                continue

            if target_layer not in ALLOWED_DEPENDENCIES.get(source_layer, set()):
                violations.append(
                    {
                        "archivo": str(filepath.relative_to(REPO_DIR)),
                        "capa_origen": source_layer,
                        "importa_capa": target_layer,
                        "modulo": module_name,
                        "problema": (
                            f"La capa '{source_layer}' depende de la capa "
                            f"'{target_layer}', lo que rompe la regla de dependencia "
                            "(las capas internas no deben conocer a las externas)."
                        ),
                    }
                )

    return {"capas_detectadas": layer_by_dirname, "violaciones": violations}


# Código muerto (vulture)

VULTURE_LINE = re.compile(
    r"^(?P<file>.+):(?P<line>\d+): (?P<message>.+) \((?P<confidence>\d+)% confidence\)"
)


def scan_dead_code():
    if not BACKEND_DIR.exists():
        return []

    result = run(f"vulture '{BACKEND_DIR}' --min-confidence {VULTURE_MIN_CONFIDENCE}")

    findings = []
    for line in result.stdout.splitlines():
        match = VULTURE_LINE.match(line)
        if not match:
            continue

        findings.append(
            {
                "archivo": match.group("file"),
                "linea": int(match.group("line")),
                "mensaje": match.group("message"),
                "confianza": int(match.group("confidence")),
            }
        )

    findings.sort(key=lambda x: -x["confianza"])
    return findings[:TOP_N]


# Verificación estructural: que nada esté roto

def scan_broken_files(files):
    broken = []

    for filepath in files:
        result = subprocess.run(
            ["python3", "-m", "py_compile", str(filepath)],
            capture_output=True,
            text=True,
        )

        if result.returncode != 0:
            broken.append(
                {
                    "archivo": str(filepath.relative_to(REPO_DIR)),
                    "error": result.stderr.strip()[-500:],
                }
            )

    return broken


def scan_test_collection():
    tests_dir = None
    for candidate in (BACKEND_DIR / "tests", REPO_DIR / "tests"):
        if candidate.exists():
            tests_dir = candidate
            break

    if tests_dir is None:
        return {"ejecutado": False, "errores": []}

    result = run(f"python3 -m pytest --collect-only -q '{tests_dir}'")

    if result.returncode == 0:
        return {"ejecutado": True, "errores": []}

    errores = [line for line in result.stdout.splitlines() if "rror" in line]
    return {"ejecutado": True, "errores": errores[:20] or [result.stdout[-1000:]]}

# Ollama

def build_prompt(data):
    return f"""
Eres un arquitecto de software senior experto en Clean Architecture y
Arquitectura Hexagonal.

Analiza estos hallazgos de un repositorio:

{json.dumps(data, indent=2, ensure_ascii=False)}

Genera un resumen Markdown con máximo 5 problemas, priorizados en este orden:
1. Errores estructurales (código que no compila / imports rotos): son los
   más urgentes porque pueden romper el proyecto.
2. Violaciones de la regla de dependencia entre capas.
3. Imports circulares.
4. Módulos con fan-in/fan-out muy alto o archivos gigantes (god modules).
5. Código muerto de alta confianza.

Para cada problema:
## Problema
- Dónde:
- Qué ocurre / por qué es un riesgo:
- Acción recomendada:

Si no hay nada relevante en una categoría, no la menciones.
Si todo está bien responde solo:
"Arquitectura saludable, sin código muerto ni errores estructurales."
Sé breve y concreto.
"""


def call_ollama(prompt):
    host = os.environ.get("OLLAMA_HOST", "http://localhost:11434").rstrip("/")
    model = os.environ.get("OLLAMA_MODEL", "qwen2.5:7b")

    response = requests.post(
        f"{host}/api/generate",
        json={"model": model, "prompt": prompt, "stream": False},
        timeout=300,
    )

    response.raise_for_status()
    return response.json().get("response", "").strip()


# GitLab
def get_labels(has_broken, has_layer_violations, has_cycles, has_dead_code):
    labels = ["arquitectura", "automatico"]

    if has_broken:
        labels.append("build-roto")
    if has_layer_violations:
        labels.append("violacion-capas")
    if has_cycles:
        labels.append("imports-circulares")
    if has_dead_code:
        labels.append("codigo-muerto")

    return ",".join(labels)


def create_gitlab_issue(title, description, has_broken, has_layer_violations, has_cycles, has_dead_code):
    token = os.environ["GITLAB_ARCHITECTURE_TOKEN"]
    project_id = os.environ["CI_PROJECT_ID"]
    api = os.environ.get("CI_API_V4_URL", "https://gitlab.com/api/v4")

    response = requests.post(
        f"{api}/projects/{project_id}/issues",
        headers={"PRIVATE-TOKEN": token},
        data={
            "title": title,
            "description": description,
            "labels": get_labels(has_broken, has_layer_violations, has_cycles, has_dead_code),
        },
        timeout=30,
    )

    response.raise_for_status()
    return response.json()


# Main
def main():
    print("Analizando arquitectura...")

    all_files = find_python_files()

    if not all_files:
        print("No hay archivos Python.")
        return

    backend_files = find_backend_python_files(all_files)

    module_to_file, graph = build_import_graph(all_files)
    cycles = find_cycles(graph)
    god_modules = find_god_modules(all_files)
    high_fan_out, high_fan_in = find_high_coupling(graph)

    layers = scan_layer_violations(backend_files)
    layer_violations = layers.get("violaciones", [])

    dead_code = scan_dead_code()

    broken_files = scan_broken_files(all_files)
    test_collection = scan_test_collection()
    broken_total = bool(broken_files or test_collection.get("errores"))

    cycles_readable = [[module_to_file.get(m, m) for m in cycle] for cycle in cycles]

    data = {
        "capas_detectadas": layers.get("capas_detectadas", {}),
        "violaciones_de_capas": layer_violations[:TOP_N],
        "imports_circulares": cycles_readable[:TOP_N],
        "archivos_gigantes": god_modules,
        "alto_fan_out": high_fan_out,
        "alto_fan_in": high_fan_in,
        "codigo_muerto": dead_code,
        "archivos_con_errores_de_compilacion": broken_files[:TOP_N],
        "errores_al_importar_tests": test_collection.get("errores", [])[:TOP_N],
    }

    nada_relevante = not (
        layer_violations
        or cycles
        or god_modules
        or high_fan_out
        or high_fan_in
        or dead_code
        or broken_files
        or test_collection.get("errores")
    )

    if nada_relevante:
        print("No hay problemas de arquitectura relevantes.")
        return

    print(json.dumps(data, indent=2, ensure_ascii=False))

    print("Consultando Ollama...")
    summary = call_ollama(build_prompt(data))

    today = datetime.date.today()
    severity_tag = "[ROTO] " if broken_total else ""
    title = f"Radar Arquitectura {severity_tag}- {today}"

    print("Creando issue...")
    issue = create_gitlab_issue(
        title,
        summary,
        broken_total,
        bool(layer_violations),
        bool(cycles),
        bool(dead_code),
    )

    print(f"Issue creado: {issue.get('web_url')}")

    if broken_total:
        print("Se detectó código roto (errores de compilación/imports). Pipeline bloqueado.")
        exit(1)


if __name__ == "__main__":
    main()