from dataclasses import dataclass
from typing import List

@dataclass
class Skills:
    id: str
    name: str
    description: str
    category: str
    prompt: str
    enabled: bool = True
    tags: List[str] = None

    