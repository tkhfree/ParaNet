"""Deployment manifest (placeholder)."""

from __future__ import annotations

from dataclasses import dataclass, field


@dataclass(slots=True)
class DeployManifest:
    """Placeholder for deployment manifest."""
    plans: list[dict] = field(default_factory=list)
