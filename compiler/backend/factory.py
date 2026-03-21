"""Select BackendEmitter by target name."""

from __future__ import annotations

from compiler.backend.base import BackendEmitter
from compiler.backend.bmv2_emitter import Bmv2Emitter
from compiler.backend.stub_emitter import StubEmitter
from compiler.backend.tofino_emitter import TofinoEmitter


def get_backend_emitter(target: str) -> BackendEmitter:
    """
    Return an emitter for the deployment target.

    - ``bmv2`` / ``v1model`` — compilable v1model for BMv2 simple_switch
    - ``tofino`` / ``tna`` — TNA ingress parser/control (requires Intel SDE)
    - ``stub`` — placeholder only
    """
    key = (target or "bmv2").strip().lower()
    if key in {"stub", "none", "off"}:
        return StubEmitter()
    if key in {"bmv2", "v1model", "simple_switch"}:
        return Bmv2Emitter()
    if key in {"tofino", "tna", "barefoot"}:
        return TofinoEmitter()
    raise ValueError(f"Unknown compile target: {target!r} (use bmv2, tofino, or stub)")


__all__ = ["get_backend_emitter"]
