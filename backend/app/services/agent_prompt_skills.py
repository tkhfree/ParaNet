from __future__ import annotations

from functools import lru_cache
from pathlib import Path


DEFAULT_AGENT_SKILLS = ("pne-dsl-grammar",)

_ROOT_DIR = Path(__file__).resolve().parents[3]
_SKILL_FILES = {
    "pne-dsl-grammar": _ROOT_DIR / "paranet" / "agent" / "prompts" / "pne-dsl-grammar.md",
}

AGENT_SYSTEM_PROMPT = """You are ParaNet, a multi-modal network programming assistant.

Your task is to generate ParaNet PNE DSL for the current topology and user intent.
Return valid PNE DSL only unless the prompt explicitly asks for explanation.
Never invent unsupported grammar constructs.
Reuse provided topology node IDs exactly.
If details are missing, prefer a minimal valid scaffold over fabricated network facts.
"""

DSL_GENERATION_PROMPT = """Translate the user request into valid ParaNet PNE DSL.

Use the injected skill context as the grammar source of truth.
Prefer exact topology IDs from the provided context.
If required details are missing, describe the gap instead of inventing topology facts.

Topology context:
{topology_context}

Active skill context:
{skill_context}

User request:
{user_input}
"""

DSL_REPAIR_PROMPT = """Repair the ParaNet PNE DSL below so it compiles.

Use the injected skill context as the grammar source of truth.
Return only the corrected PNE DSL.

Topology context:
{topology_context}

Active skill context:
{skill_context}

Original user request:
{user_input}

Current DSL:
{current_dsl}

Compiler diagnostics:
{diagnostics}
"""


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
    if requested_skill_names:
        names = _dedupe_skill_names(requested_skill_names)
    else:
        names = list(DEFAULT_AGENT_SKILLS)
    return [name for name in names if name in _SKILL_FILES]


@lru_cache(maxsize=None)
def load_skill_text(skill_name: str) -> str:
    path = _SKILL_FILES.get(skill_name)
    if path is None:
        raise ValueError(f"Unknown agent skill: {skill_name}")
    return path.read_text(encoding="utf-8").strip()


def build_skill_context(requested_skill_names: list[str] | None = None) -> tuple[list[str], str]:
    skill_names = resolve_skill_names(requested_skill_names)
    blocks = [f"[skill:{skill_name}]\n{load_skill_text(skill_name)}" for skill_name in skill_names]
    return skill_names, "\n\n".join(blocks)


def build_dsl_generation_prompt(
    user_input: str,
    topology_context: str = "",
    skill_names: list[str] | None = None,
) -> tuple[list[str], str]:
    resolved_skill_names, skill_context = build_skill_context(skill_names)
    prompt = DSL_GENERATION_PROMPT.format(
        user_input=user_input.strip(),
        topology_context=topology_context.strip() or "No topology context provided.",
        skill_context=skill_context or "No skill context provided.",
    )
    return resolved_skill_names, prompt


def build_dsl_repair_prompt(
    user_input: str,
    current_dsl: str,
    diagnostics: str,
    topology_context: str = "",
    skill_names: list[str] | None = None,
) -> tuple[list[str], str]:
    resolved_skill_names, skill_context = build_skill_context(skill_names)
    prompt = DSL_REPAIR_PROMPT.format(
        user_input=user_input.strip(),
        current_dsl=current_dsl.strip(),
        diagnostics=diagnostics.strip() or "No diagnostics provided.",
        topology_context=topology_context.strip() or "No topology context provided.",
        skill_context=skill_context or "No skill context provided.",
    )
    return resolved_skill_names, prompt
