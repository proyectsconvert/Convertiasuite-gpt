import unittest
import sys
import types
from unittest.mock import MagicMock

# Si se ejecuta fuera de Docker / virtualenv con FastAPI,
# creamos módulos simulados para que no falle la importación.
for mod_name in ("fastapi", "fastapi.security", "pydantic"):
    if mod_name not in sys.modules:
        m = types.ModuleType(mod_name)
        if mod_name == "fastapi":
            m.APIRouter = MagicMock(return_value=MagicMock())
            m.Depends = MagicMock()
            m.HTTPException = Exception
            m.Request = MagicMock()
            m.status = MagicMock()
        elif mod_name == "fastapi.security":
            m.HTTPBearer = MagicMock()
            m.HTTPAuthorizationCredentials = MagicMock()
            m.APIKeyHeader = MagicMock()
        elif mod_name == "pydantic":
            class MockBaseModel:
                def __init__(self, **kwargs):
                    for k, v in kwargs.items():
                        setattr(self, k, v)
                def get(self, key, default=None):
                    return getattr(self, key, default)
            m.BaseModel = MockBaseModel
        sys.modules[mod_name] = m

# Mock adicional de supabase si no está presente
if "app.infra.clients.supabase_client" not in sys.modules:
    supa_mod = types.ModuleType("app.infra.clients.supabase_client")
    supa_mod.SupabaseClient = MagicMock()
    sys.modules["app.infra.clients.supabase_client"] = supa_mod

from app.modules.campaigns.skills_router import (
    _load_available_campaign_skills,
    _get_skill_base,
    build_campaign_skills_prompt,
)


class TestCampaignSkillsTemplates(unittest.TestCase):
    """Pruebas unitarias para DQLE-23 (Skill Ventas) y DQLE-24 (Skill Cobranza)."""

    def setUp(self):
        self.skills = _load_available_campaign_skills()
        self.skills_by_id = {s.id: s for s in self.skills}

    def test_skills_catalog_contains_ventas_and_cobranza(self):
        """Verifica que el catálogo carga automáticamente ventas y cobranza."""
        self.assertIn("ventas", self.skills_by_id, "Falta la plantilla de skill 'ventas'")
        self.assertIn("cobranza", self.skills_by_id, "Falta la plantilla de skill 'cobranza'")

    def test_ventas_skill_manifest_and_prompt(self):
        """Valida que la skill de Ventas (DQLE-23) tiene estructura completa."""
        skill = self.skills_by_id["ventas"]
        self.assertEqual(skill.name, "Plantilla de Ventas")
        self.assertEqual(skill.category, "Operaciones")
        self.assertIn("ventas", skill.tags)
        self.assertIn("objeciones", skill.tags)

        # Validar contenido sustancial del prompt enfocado
        self.assertTrue(len(skill.base_prompt) > 200, "El prompt de ventas está vacío o es muy corto")
        self.assertIn("copiloto de ventas", skill.base_prompt.lower())
        self.assertIn("apertura", skill.base_prompt.lower())
        self.assertIn("objeciones", skill.base_prompt.lower())
        self.assertIn("cierre", skill.base_prompt.lower())

    def test_cobranza_skill_manifest_and_prompt(self):
        """Valida que la skill de Cobranza (DQLE-24) tiene estructura completa."""
        skill = self.skills_by_id["cobranza"]
        self.assertEqual(skill.name, "Plantilla de Cobranza")
        self.assertEqual(skill.category, "Operaciones")
        self.assertIn("cobranza", skill.tags)
        self.assertIn("negociacion", skill.tags)

        # Validar contenido sustancial del prompt enfocado
        self.assertTrue(len(skill.base_prompt) > 200, "El prompt de cobranza está vacío o es muy corto")
        self.assertIn("copiloto de cobranza", skill.base_prompt.lower())
        self.assertIn("identidad", skill.base_prompt.lower())
        self.assertIn("negociación", skill.base_prompt.lower())
        self.assertIn("saldo", skill.base_prompt.lower())

    def test_build_campaign_skills_prompt_injection(self):
        """Valida que build_campaign_skills_prompt ensambla los prompts para el LLM."""
        assigned_skills = [
            {
                "skill_id": "ventas",
                "custom_content": "Promoción vigente: 20% de descuento en planes superiores a 300MB.",
            },
            {
                "skill_id": "cobranza",
                "custom_content": "Autorizado condonar hasta el 10% de intereses moratorios.",
            },
        ]

        prompt_output = build_campaign_skills_prompt(assigned_skills)

        self.assertIn("## SKILLS DE CAMPAÑA", prompt_output)
        self.assertIn("Plantilla de Ventas", prompt_output)
        self.assertIn("Promoción vigente: 20% de descuento", prompt_output)
        self.assertIn("Plantilla de Cobranza", prompt_output)
        self.assertIn("Autorizado condonar hasta el 10%", prompt_output)


if __name__ == "__main__":
    unittest.main()
