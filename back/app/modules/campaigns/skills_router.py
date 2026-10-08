import json
import logging
from pathlib import Path
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.dependencies.auth import require_admin, get_current_user
from app.infra.clients.supabase_client import SupabaseClient

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/admin/campaigns",
    tags=["campaign-skills"],
)

# ─────────────────────────────────────────────────────────────────────────────
# Carga de skill base desde filesystem
# ─────────────────────────────────────────────────────────────────────────────

_APP_DIR = Path(__file__).resolve().parent.parent.parent
CAMPAIGN_SKILLS_ROOT = _APP_DIR / "capabilities" / "campaings_skills"
if not CAMPAIGN_SKILLS_ROOT.is_dir():
    CAMPAIGN_SKILLS_ROOT = _APP_DIR.parent / "capabilities" / "campaings_skills"


class AvailableSkill(BaseModel):
    id: str
    name: str
    description: str
    category: str
    icon: str = "sparkles"
    version: str = "1.0.0"
    tags: List[str] = []
    base_prompt: str = ""


class CampaignSkillResponse(BaseModel):
    id: str
    campaign_id: str
    skill_id: str
    skill_name: str
    skill_description: str
    skill_icon: str
    custom_content: Optional[str] = None
    is_active: bool = True


class AssignSkillRequest(BaseModel):
    skill_id: str
    custom_content: Optional[str] = None
    is_active: bool = True


class UpdateSkillRequest(BaseModel):
    custom_content: Optional[str] = None
    is_active: Optional[bool] = None


def _load_available_campaign_skills() -> List[AvailableSkill]:
    """Carga las skill base disponibles para campañas desde el filesystem."""
    skills: List[AvailableSkill] = []

    if not CAMPAIGN_SKILLS_ROOT.is_dir():
        logger.warning("Campaign skills directory not found: %s", CAMPAIGN_SKILLS_ROOT)
        return skills

    for manifest_path in sorted(CAMPAIGN_SKILLS_ROOT.rglob("manifest.json")):
        child = manifest_path.parent
        if not child.is_dir():
            continue

        try:
            with open(manifest_path, "r", encoding="utf-8") as f:
                manifest = json.load(f)

            prompt_text = ""
            for prompt_file in ("prompt.md", "promp.md", "README.md"):
                prompt_path = child / prompt_file
                if prompt_path.exists():
                    prompt_text = prompt_path.read_text(encoding="utf-8").strip()
                    break

            skill = AvailableSkill(
                id=manifest.get("id", child.name),
                name=manifest.get("name", child.name),
                description=manifest.get("description", ""),
                category=manifest.get("category", "Operaciones"),
                icon=manifest.get("icon", "sparkles"),
                version=manifest.get("version", "1.0.0"),
                tags=manifest.get("tags", []),
                base_prompt=prompt_text,
            )
            skills.append(skill)

        except Exception as e:
            logger.error("Error loading campaign skill from %s: %s", child.name, e)

    return skills


def _get_skill_base(skill_id: str) -> Optional[AvailableSkill]:
    """Obtiene la skill base por su ID."""
    for skill in _load_available_campaign_skills():
        if skill.id == skill_id:
            return skill
    return None


# ─────────────────────────────────────────────────────────────────────────────
# Endpoints
# ─────────────────────────────────────────────────────────────────────────────


@router.get("/skills/available")
async def get_available_campaign_skills(
    current_user: dict = Depends(require_admin),
):
    """Lista todas las skills base disponibles para asignar a campañas."""
    skills = _load_available_campaign_skills()
    return {"status": "success", "skills": skills, "count": len(skills)}


@router.get("/{campaign_id}/skills")
async def get_campaign_skills(
    campaign_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Lista las skills asignadas a una campaña específica."""
    try:
        supabase = SupabaseClient().db

        res = (
            supabase.table("campaign_skills")
            .select("*")
            .eq("campaign_id", campaign_id)
            .execute()
        )

        # Enriquecer con metadatos de la skill base
        enriched = []
        for row in res.data or []:
            base = _get_skill_base(row["skill_id"])
            enriched.append(
                CampaignSkillResponse(
                    id=row["id"],
                    campaign_id=row["campaign_id"],
                    skill_id=row["skill_id"],
                    skill_name=base.name if base else row["skill_id"],
                    skill_description=base.description if base else "",
                    skill_icon=base.icon if base else "sparkles",
                    custom_content=row.get("custom_content"),
                    is_active=row.get("is_active", True),
                )
            )

        return {"status": "success", "skills": enriched}

    except Exception as e:
        logger.error("Error fetching campaign skills campaign=%s: %s", campaign_id, e)
        raise HTTPException(status_code=500, detail="Error al obtener skills de la campaña")


@router.post("/{campaign_id}/skills")
async def assign_skill_to_campaign(
    campaign_id: str,
    body: AssignSkillRequest,
    current_user: dict = Depends(require_admin),
):
    """Asigna una skill base a una campaña (con personalización opcional)."""
    try:
        supabase = SupabaseClient().db

        # Verificar que la skill base existe
        base_skill = _get_skill_base(body.skill_id)
        if not base_skill:
            raise HTTPException(
                status_code=404,
                detail=f"Skill '{body.skill_id}' no encontrada en el catálogo de skills de campaña",
            )

        # Verificar que la campaña existe
        campaign_res = (
            supabase.table("campaigns")
            .select("campaign_id")
            .eq("campaign_id", campaign_id)
            .execute()
        )
        if not campaign_res.data:
            raise HTTPException(status_code=404, detail="Campaña no encontrada")

        # Sanitizar custom_content: no permitir sobrescribir reglas de seguridad
        custom_content = body.custom_content
        if custom_content:
            custom_content = _sanitize_custom_content(custom_content)

        data = {
            "campaign_id": campaign_id,
            "skill_id": body.skill_id,
            "custom_content": custom_content,
            "is_active": body.is_active,
        }

        res = supabase.table("campaign_skills").insert(data).execute()

        if not res.data:
            raise HTTPException(status_code=400, detail="No se pudo asignar la skill")

        row = res.data[0]
        return {
            "status": "success",
            "skill": CampaignSkillResponse(
                id=row["id"],
                campaign_id=row["campaign_id"],
                skill_id=row["skill_id"],
                skill_name=base_skill.name,
                skill_description=base_skill.description,
                skill_icon=base_skill.icon,
                custom_content=row.get("custom_content"),
                is_active=row.get("is_active", True),
            ),
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Error assigning skill to campaign campaign=%s skill=%s: %s",
            campaign_id, body.skill_id, e,
        )
        if "duplicate key" in str(e).lower() or "unique" in str(e).lower():
            raise HTTPException(
                status_code=400,
                detail="Esta skill ya está asignada a la campaña",
            )
        raise HTTPException(status_code=500, detail="Error al asignar la skill")


@router.put("/{campaign_id}/skills/{assignment_id}")
async def update_campaign_skill(
    campaign_id: str,
    assignment_id: str,
    body: UpdateSkillRequest,
    current_user: dict = Depends(require_admin),
):
    """Actualiza la personalización o estado de una skill asignada a la campaña."""
    try:
        supabase = SupabaseClient().db

        update_data = {}

        if body.custom_content is not None:
            update_data["custom_content"] = _sanitize_custom_content(body.custom_content)

        if body.is_active is not None:
            update_data["is_active"] = body.is_active

        if not update_data:
            raise HTTPException(status_code=400, detail="No hay datos para actualizar")

        update_data["updated_at"] = "now()"

        res = (
            supabase.table("campaign_skills")
            .update(update_data)
            .eq("id", assignment_id)
            .eq("campaign_id", campaign_id)
            .execute()
        )

        if not res.data:
            raise HTTPException(status_code=404, detail="Asignación de skill no encontrada")

        return {"status": "success"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Error updating campaign skill assignment=%s: %s", assignment_id, e
        )
        raise HTTPException(status_code=500, detail="Error al actualizar la skill")


@router.delete("/{campaign_id}/skills/{assignment_id}")
async def remove_skill_from_campaign(
    campaign_id: str,
    assignment_id: str,
    current_user: dict = Depends(require_admin),
):
    """Elimina la asignación de una skill a una campaña."""
    try:
        supabase = SupabaseClient().db

        res = (
            supabase.table("campaign_skills")
            .delete()
            .eq("id", assignment_id)
            .eq("campaign_id", campaign_id)
            .execute()
        )

        if not res.data:
            raise HTTPException(status_code=404, detail="Asignación no encontrada")

        return {"status": "success"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error removing skill from campaign: %s", e)
        raise HTTPException(status_code=500, detail="Error al eliminar la skill")


# ─────────────────────────────────────────────────────────────────────────────
# Función pública para cargar skills en el contexto del agente
# ─────────────────────────────────────────────────────────────────────────────

def build_campaign_skills_prompt(skills_data: list[dict]) -> str:
    """
    Construye el bloque de skills para inyectar en el system prompt del agente.
    Combina el prompt base de cada skill con la personalización de la campaña.

    Las reglas de seguridad base nunca son modificables por el custom_content.
    """
    if not skills_data:
        return ""

    blocks = []

    for row in skills_data:
        skill_id = row.get("skill_id", "")
        custom_content = row.get("custom_content") or ""

        # Cargar el prompt base del filesystem
        base = _get_skill_base(skill_id)
        if not base or not base.base_prompt:
            continue

        block = f"### {base.name}\n\n{base.base_prompt}"

        # Añadir personalización de la campaña (después del prompt base, nunca antes)
        if custom_content.strip():
            block += f"\n\n---\n\n**Instrucciones específicas de esta campaña:**\n\n{custom_content.strip()}"

        blocks.append(block)

    if not blocks:
        return ""

    return (
        "## SKILLS DE CAMPAÑA\n\n"
        "Las siguientes guías están activas para esta campaña. "
        "Úsalas como referencia operativa durante la gestión.\n\n"
        + "\n\n---\n\n".join(blocks)
    )


def _sanitize_custom_content(content: str) -> str:
    """
    Sanitiza el contenido personalizado para evitar que sobrescriba
    reglas de seguridad o inyecte instrucciones maliciosas.
    """
    if not content:
        return content

    # Limitar longitud
    MAX_LENGTH = 3000
    if len(content) > MAX_LENGTH:
        content = content[:MAX_LENGTH]
        logger.warning("custom_content truncado a %d caracteres", MAX_LENGTH)

    # Frases que intentan sobrescribir reglas del sistema
    BLOCKED_PATTERNS = [
        "ignora las instrucciones",
        "ignore las instrucciones",
        "olvida las reglas",
        "nuevo rol",
        "ahora eres",
        "actúa como",
        "actua como",
        "system prompt",
        "ignore previous",
        "forget previous",
        "jailbreak",
        "bypass",
        "revela",
        "reveal",
    ]

    content_lower = content.lower()
    for pattern in BLOCKED_PATTERNS:
        if pattern in content_lower:
            logger.warning(
                "custom_content bloqueado por patrón sospechoso: '%s'", pattern
            )
            raise HTTPException(
                status_code=400,
                detail=(
                    "El contenido de personalización contiene instrucciones no permitidas. "
                    "Por favor, describe únicamente procedimientos específicos de la campaña."
                ),
            )

    return content.strip()
