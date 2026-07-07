Resumen de cambios propuestos en .gitlab-ci.yml

Objetivo
- Añadir lint, tests y build para frontend y backend.
- Mejorar seguridad del deploy (usar clave SSH en CI en vez de sshpass).
- Añadir caches y artefactos para acelerar pipelines.

Cambios clave (paso a paso)

1) Estructura de stages
- Añadidos: `lint`, `test`, `build`, `deploy` antes de `scheduled-analysis`.

2) Cachés
- `PIP_CACHE_DIR` y `node_modules` cacheados para acelerar instalaciones.

3) Lint
- `lint-backend`: usa `ruff` (recomendado) para chequear Python.
- `lint-frontend`: ejecuta `npm run lint` en `front`.

4) Tests
- `backend-test`: crea venv, instala `requirements.txt` y ejecuta `pytest`, guarda `reports/`.
- `frontend-test`: `npm ci`, ejecuta `vitest` (`npm run test`) y `npm run build`.

5) Build y deploy
- `build`: construye imágenes con `docker compose -f docker-compose-prod.yml build --pull`.
- `deploy`: usa variable protegida `SSH_PRIVATE_KEY` para autenticar con el servidor.
  - Marcar `deploy` como `when: manual` y proteger variables GitLab.

6) Seguridad
- Se mantienen `pip-audit`, `npm-audit` y `container-scan`.
- Se recomienda marcar variables sensibles como "protected" y "masked" en GitLab.

7) Recomendaciones operativas
- Marcar `master` como rama protegida y exigir pipelines verificados antes de merge.
- Evitar `sshpass`; usar llaves SSH o deploy tokens.
- Añadir job de `typecheck` (mypy o pyright) y `format` si no existen.

Pasos de implementación sugeridos

1. Añadir variables protegidas en GitLab: `SSH_PRIVATE_KEY`, `SERVER_USER`, `SERVER_PROJECT_PATH`, `OLLAMA_BASE_URL`, `CF_ACCESS_CLIENT_ID`, `CF_ACCESS_CLIENT_SECRET`.
2. Probar pipeline en una rama de feature con `backend-test` y `frontend-test` habilitados.
3. Ajustar timeouts y recursos del runner si los jobs de `docker:dind` fallan.
4. Agregar caching adicional si el tiempo de instalación sigue siendo alto.

Si quieres, puedo:
- Aplicar otros cambios automáticos (ej.: añadir `ruff` config o `pyproject.toml`),
- Crear jobs adicionales (coverage upload, sonarcloud),
- O ejecutar los tests locales aquí ahora para generar reportes iniciales.
