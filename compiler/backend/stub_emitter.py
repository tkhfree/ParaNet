"""Stub backend emitter: minimal placeholder (tests / legacy)."""

from __future__ import annotations

from typing import Any

from compiler.backend.base import BackendEmitter
from compiler.backend.emit_context import EmitContext


class StubEmitter(BackendEmitter):
    """Emits placeholder P4-shaped text + JSON entries (no real synthesis)."""

    def emit(self, ctx: EmitContext) -> str:
        plan = ctx.plan
        lines = [
            "// ParaNet stub data plane (use target=bmv2 or target=tofino for real P4)",
            f"// node_id={plan.node_id}",
            f"// backend={plan.backend}",
            f"// fragment_count={len(plan.fragments)}",
        ]
        for fp in plan.fragments:
            lines.append(f"// fragment id={fp.fragment_id} order={fp.order}")
        return "\n".join(lines) + "\n"

    def emit_entries(self, ctx: EmitContext) -> dict[str, Any]:
        plan = ctx.plan
        return {
            "node_id": plan.node_id,
            "backend": plan.backend,
            "fragments": [
                {"fragment_id": fp.fragment_id, "order": fp.order, "options": fp.options}
                for fp in plan.fragments
            ],
        }


__all__ = ["StubEmitter"]
