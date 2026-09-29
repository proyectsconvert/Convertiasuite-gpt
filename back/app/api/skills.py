import json
import logging
from pathlib import Path
from typing import List, Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.dependencies.auth import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/skills", tags=["skills"])


class SkillResponse(BaseModel):
    id: str
    name: str
    description: str
    category: str
    icon: str = "sparkles"
    version: str = "1.0.0"
    tags: List[str] = []
    prompt: str = ""


class SkillListResponse(BaseModel):
    skills: List[SkillResponse]
    count: int



SKILLS_ROOT = Path(__file__).resolve().parent.parent / "capabilities" / "skills"


def _load_skills() -> List[SkillResponse]:
    skills: List[SkillResponse] = []

    if not SKILLS_ROOT.is_dir():
        logger.warning("Skills directory not found: %s", SKILLS_ROOT)
        return skills

    for manifest_path in sorted(SKILLS_ROOT.rglob("manifest.json")):
        child = manifest_path.parent
        if not child.is_dir():
            continue

        try:
            with open(manifest_path, "r", encoding="utf-8") as f:
                manifest = json.load(f)

            # Read prompt from promp.md (if exists)
            prompt_text = ""
            for prompt_file in ("promp.md", "prompt.md", "README.md"):
                prompt_path = child / prompt_file
                if prompt_path.exists():
                    prompt_text = prompt_path.read_text(encoding="utf-8").strip()
                    break

            skill = SkillResponse(
                id=manifest.get("id", child.name),
                name=manifest.get("name", child.name),
                description=manifest.get("description", ""),
                category=manifest.get("category", "General"),
                icon=manifest.get("icon", "sparkles"),
                version=manifest.get("version", "1.0.0"),
                tags=manifest.get("tags", []),
                prompt=prompt_text,
            )
            skills.append(skill)

        except Exception as e:
            logger.error("Error loading skill from %s: %s", child.name, e)

    return skills



@router.get("/", response_model=SkillListResponse)
async def list_skills(current_user=Depends(get_current_user)):
    skills = _load_skills()
    return SkillListResponse(skills=skills, count=len(skills))
