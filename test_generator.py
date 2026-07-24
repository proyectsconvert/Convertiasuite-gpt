import json
import re
import requests
import os
from pathlib import Path

OLLAMA_HOST = os.environ.get("OLLAMA_HOST")
OLLAMA_MODEL = os.environ.get("OLLAMA_MODEL", "qwen2.5:7b")

BACK_SRC = Path("back")
BACK_TESTS = Path("back/tests")
FRONT_SRC = Path("front/tests")

report = {"back": [], "front": []}


def call_ollama(prompt: str) -> str:
    response = requests.post(
        f"{OLLAMA_HOST}/api/generate",
        json={"model": OLLAMA_MODEL, "prompt": prompt, "stream": False},
        timeout=300,
    )
    return response.json().get("response", "")


def strip_code_fence(text: str) -> str:
    match = re.search(r"```(?:\w+)?\n([\s\S]*?)\n```", text, re.DOTALL)
    return match.group(1).strip() if match else text.strip()


# BACKEND
def find_missing_back_tests():
    missing_tests = []

    for py_file in BACK_SRC.rglob("*.py"):
        if "tests" in py_file.parts or py_file.name.startswith("__"):
            continue

        expected_test = BACK_TESTS / f"test_{py_file.name}"

        if not expected_test.exists():
            missing_tests.append(py_file)
    return missing_tests


def generate_back_test(source_file: Path):
    source_code = source_file.read_text(encoding="utf-8")

    prompt = f"""
    Eres un ingeniero de software experto en pytest.
    Genera un archivo de test completo en pytest para el siguiente módulo Python.
    Cubre los casos principales, casos borde y manejo de errores.
    Responde ÚNICAMENTE con el código Python del test, sin explicaciones.

    Módulo: {source_file.name}

    ```python
    {source_code}
    ``` 
"""
    raw = call_ollama(prompt)
    test_code = strip_code_fence(raw)

    BACK_TESTS.mkdir(parents=True, exist_ok=True)
    output_path = BACK_TESTS / f"test_{source_file.name}"
    output_path.write_text(test_code, encoding="utf-8")
    return output_path


# frontend
def find_missing_frontend_tests():
    missing = []
    for js_file in FRONT_SRC.rglob("*.[jt]sx"):
        if ".test." in js_file.name or ".spec." in js_file.name:
            continue
        stem = js_file.stem
        expected_test = js_file.parent / f"{stem}.test{js_file.suffix}"
        if not expected_test.exists():
            missing.append(js_file)
    return missing


def generate_front_test(source_file: Path):
    source_code = source_file.read_text(encoding="utf-8")
    prompt = f"""
    Eres un ingeniero frontend experto en Jest y React Testing Library.
    Genera un archivo de test completo para el siguiente componente/módulo.
    Cubre renderizado, props principales, interacciones de usuario y casos borde.
    Responde ÚNICAMENTE con el código, sin explicaciones.

    Archivo: {source_file.name}

    ```javascript
    {source_code}
    ```
"""
    raw = call_ollama(prompt)
    test_code = strip_code_fence(raw)

    output_path = source_file.parent / f"{source_file.stem}.test{source_file.suffix}"
    output_path.write_text(test_code, encoding="utf-8")
    return output_path


def main():
    generated_any=False

    for source_file in find_missing_back_tests():
        try:
            output_path =generate_back_test(source_file)
            report["back"].append({"source": str(source_file), "test":str(output_path)})
            generated_any = True
        
        except Exception as e:
            report["back"].append({"source": str(source_file), "error": str(e)})

    for source_file in find_missing_frontend_tests():
        try:
            output_path = generate_front_test(source_file)
            report["front"].append({"source": str(source_file), "test": str(output_path)})
            generated_any = True

        except Exception as e:
            report["front"].append({"source": str(source_file), "error": str(e)})

    with open("test_generation_report.json", "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2, ensure_ascii=False)

    if generated_any:
        Path(".tests_generated").touch()

    print(f"back: {len(report['back'])} archivos procesados")
    print(f"front: {len(report['front'])} archivos procesados")


if __name__ == "__main__":
    main()