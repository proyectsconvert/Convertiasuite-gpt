def map_functional_role_to_llm_role(functional_role: str | None) -> str | None:
    if not functional_role:
        return None
        
    role_lower = functional_role.lower()
    
    if "desarrollador" in role_lower or "backend" in role_lower or "frontend" in role_lower or "it" in role_lower:
        return "dev"
        
    if "bi" in role_lower or "analista" in role_lower or "datos" in role_lower:
        return "bi"
        
    if "marketing" in role_lower or "seo" in role_lower or "content" in role_lower:
        return "marketing"
        
    if "reclutamiento" in role_lower or "talento" in role_lower or "cultura" in role_lower or "rh" in role_lower or "recursos humanos" in role_lower:
        return "rh"
        
    if "diseño" in role_lower or "ux" in role_lower or "ui" in role_lower:
        return "design"
        
    if "sst" in role_lower or "salud" in role_lower or "seguridad" in role_lower:
        return "medical"
        
    return None
