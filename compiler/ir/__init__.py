"""Core IR definitions for the unified ParaNet compiler."""

from compiler.ir.common import (
    Diagnostic,
    DiagnosticSeverity,
    ParamIR,
    SerializableModel,
    SourceSpan,
    TypeRef,
)
from compiler.ir.instructions_ir import ConditionIR, InstructionIR
from compiler.ir.program_ir import (
    ApplicationIR,
    FunctionIR,
    MapDeclIR,
    ModuleIR,
    ProgramIR,
    RegisterDeclIR,
    ServiceIR,
    SetDeclIR,
)
from compiler.ir.intent_ir import IntentIR, IRNode, IRType
from compiler.ir.fragment_ir import FragmentIR
from compiler.ir.node_plan_ir import FragmentPlacement, NodePlanIR
from compiler.ir.resources import ResourceUsage
from compiler.ir.capabilities import BackendCapability

__all__ = [
    "ApplicationIR",
    "BackendCapability",
    "ConditionIR",
    "Diagnostic",
    "DiagnosticSeverity",
    "FragmentIR",
    "FragmentPlacement",
    "FunctionIR",
    "InstructionIR",
    "IntentIR",
    "IRNode",
    "IRType",
    "MapDeclIR",
    "ModuleIR",
    "NodePlanIR",
    "ParamIR",
    "ProgramIR",
    "RegisterDeclIR",
    "ResourceUsage",
    "SerializableModel",
    "ServiceIR",
    "SetDeclIR",
    "SourceSpan",
    "TypeRef",
]
