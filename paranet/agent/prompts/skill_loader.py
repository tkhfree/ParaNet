"""
Helpers for loading reusable agent skill context.
"""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path


DEFAULT_AGENT_SKILLS = ("pne-dsl-grammar",)

_SKILL_FILES = {
    "pne-dsl-grammar": Path(__file__).with_name("pne-dsl-grammar.md"),
}


def _dedupe_skill_names(skill_names: list[str]) -> list[str]:
    seen: set[str] = set()
    ordered: list[str] = []
    for skill_name in skill_names:
        name = str(skill_name or "").strip()
        if not name or name in seen:
            continue
        seen.add(name)
        ordered.append(name)
    return ordered


def resolve_skill_names(requested_skill_names: list[str] | None = None) -> list[str]:
    """
    Resolve requested skill names and fall back to the default agent skill set.
    """
    if requested_skill_names:
        names = _dedupe_skill_names(requested_skill_names)
    else:
        names = list(DEFAULT_AGENT_SKILLS)
    return [name for name in names if name in _SKILL_FILES]


@lru_cache(maxsize=None)
def load_skill_text(skill_name: str) -> str:
    """
    Load the markdown body for a registered skill.
    """
    path = _SKILL_FILES.get(skill_name)
    if path is None:
        raise ValueError(f"Unknown agent skill: {skill_name}")
    return path.read_text(encoding="utf-8").strip()


def build_skill_context(requested_skill_names: list[str] | None = None) -> tuple[list[str], str]:
    """
    Return resolved skill names plus a single prompt-ready context string.
    """
    skill_names = resolve_skill_names(requested_skill_names)
    blocks = [f"[skill:{skill_name}]\n{load_skill_text(skill_name)}" for skill_name in skill_names]
    return skill_names, "\n\n".join(blocks)
