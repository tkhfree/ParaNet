"""Placement façade from FragmentIR to NodePlanIR."""

from __future__ import annotations

from compiler.ir import FragmentIR, NodePlanIR
from compiler.placement.planner import greedy_place

__all__ = ["greedy_place", "FragmentIR", "NodePlanIR"]

