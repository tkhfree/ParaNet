"""Explicit PNE AST nodes for the standalone frontend."""

from __future__ import annotations

from dataclasses import asdict, dataclass, field, is_dataclass
from typing import Any

from compiler.ir.common import SourceSpan


def _serialize(value: Any) -> Any:
    if is_dataclass(value):
        return {key: _serialize(item) for key, item in asdict(value).items()}
    if isinstance(value, list):
        return [_serialize(item) for item in value]
    if isinstance(value, dict):
        return {key: _serialize(item) for key, item in value.items()}
    return value


# ---------------------------
# Intent Overlay AST (intent { ... } block)
# ---------------------------
#
# Second-round cleanup: intent overlay node types are co-located here to avoid
# maintaining a separate `intent_ast.py` module.
@dataclass(slots=True)
class IntentAstNode:
    span: SourceSpan | None = None


@dataclass(slots=True)
class ValueNode(IntentAstNode):
    """Literal value (string, number, boolean)."""

    raw: str | int | float | bool = ""
    kind: str = "string"  # "string" | "number" | "boolean"


@dataclass(slots=True)
class ListValueNode(IntentAstNode):
    items: list[IntentAstNode] = field(default_factory=list)


@dataclass(slots=True)
class ObjectPairNode(IntentAstNode):
    key: str = ""
    value: IntentAstNode | None = None


@dataclass(slots=True)
class ObjectValueNode(IntentAstNode):
    pairs: list[ObjectPairNode] = field(default_factory=list)


@dataclass(slots=True)
class EndpointPairNode(IntentAstNode):
    a: str = ""
    b: str = ""


@dataclass(slots=True)
class EndpointSpecNode(IntentAstNode):
    kind: str = "identifier"  # "identifier" | "prefix" | "region"
    value: IntentAstNode | str | None = None


@dataclass(slots=True)
class ViaSpecNode(IntentAstNode):
    nodes: list[str] = field(default_factory=list)


@dataclass(slots=True)
class AttrNode(IntentAstNode):
    key: str = ""
    value: IntentAstNode | None = None


@dataclass(slots=True)
class ImportStmtNode(IntentAstNode):
    path: str = ""


@dataclass(slots=True)
class NetworkDefNode(IntentAstNode):
    name: str = ""
    attrs: list[AttrNode] = field(default_factory=list)
    nested: list[IntentAstNode] = field(default_factory=list)


@dataclass(slots=True)
class NodeDefNode(IntentAstNode):
    name: str = ""
    node_type: str | None = None
    attrs: list[AttrNode] = field(default_factory=list)


@dataclass(slots=True)
class LinkDefNode(IntentAstNode):
    name: str | None = None
    attrs: list[AttrNode] = field(default_factory=list)


@dataclass(slots=True)
class RouteDefNode(IntentAstNode):
    name: str | None = None
    attrs: list[AttrNode] = field(default_factory=list)


@dataclass(slots=True)
class PolicyDefNode(IntentAstNode):
    name: str = ""
    attrs: list[AttrNode] = field(default_factory=list)


@dataclass(slots=True)
class DeterminismDefNode(IntentAstNode):
    """Deterministic / cyclic domain intent (e.g. industrial real-time)."""

    name: str | None = None
    attrs: list[AttrNode] = field(default_factory=list)


@dataclass(slots=True)
class ScheduleDefNode(IntentAstNode):
    """Node schedule / slot intent (e.g. Powerlink-style)."""

    name: str | None = None
    attrs: list[AttrNode] = field(default_factory=list)


@dataclass(slots=True)
class IntentProgramNode(IntentAstNode):
    declarations: list[IntentAstNode] = field(default_factory=list)


@dataclass(slots=True)
class AstNode:
    span: SourceSpan | None = None

    def to_dict(self) -> dict[str, Any]:
        payload = _serialize(self)
        payload["node_type"] = self.__class__.__name__
        return payload


@dataclass(slots=True)
class TypeNode(AstNode):
    name: str = ""
    width: int | None = None


@dataclass(slots=True)
class ExpressionNode(AstNode):
    pass


@dataclass(slots=True)
class IdentifierNode(ExpressionNode):
    name: str = ""


@dataclass(slots=True)
class IntegerLiteralNode(ExpressionNode):
    value: int = 0
    raw: str = "0"


@dataclass(slots=True)
class HexLiteralNode(ExpressionNode):
    value: str = ""


@dataclass(slots=True)
class IpLiteralNode(ExpressionNode):
    value: str = ""


@dataclass(slots=True)
class FieldAccessNode(ExpressionNode):
    parts: list[str] = field(default_factory=list)


@dataclass(slots=True)
class TupleExpressionNode(ExpressionNode):
    items: list[ExpressionNode] = field(default_factory=list)


@dataclass(slots=True)
class IndexExpressionNode(ExpressionNode):
    target: ExpressionNode | None = None
    index: ExpressionNode | None = None


@dataclass(slots=True)
class SliceExpressionNode(ExpressionNode):
    target: ExpressionNode | None = None
    start: ExpressionNode | None = None
    end: ExpressionNode | None = None


@dataclass(slots=True)
class UnaryExpressionNode(ExpressionNode):
    operator: str = ""
    operand: ExpressionNode | None = None


@dataclass(slots=True)
class BinaryExpressionNode(ExpressionNode):
    operator: str = ""
    left: ExpressionNode | None = None
    right: ExpressionNode | None = None


@dataclass(slots=True)
class CallExpressionNode(ExpressionNode):
    callee: ExpressionNode | None = None
    args: list[ExpressionNode] = field(default_factory=list)


@dataclass(slots=True)
class StatementNode(AstNode):
    pass


@dataclass(slots=True)
class NullStatementNode(StatementNode):
    pass


@dataclass(slots=True)
class VarDeclNode(StatementNode):
    type_ref: TypeNode | None = None
    name: str = ""


@dataclass(slots=True)
class ParamNode(AstNode):
    direction: str | None = None
    type_ref: TypeNode | None = None
    name: str = ""


@dataclass(slots=True)
class AssignNode(StatementNode):
    targets: list[ExpressionNode] = field(default_factory=list)
    value: ExpressionNode | None = None


@dataclass(slots=True)
class ApplyCallNode(StatementNode):
    target: str = ""
    args: list[ExpressionNode] = field(default_factory=list)


@dataclass(slots=True)
class CallStatementNode(StatementNode):
    callee: ExpressionNode | None = None
    args: list[ExpressionNode] = field(default_factory=list)


@dataclass(slots=True)
class PrimitiveCallNode(StatementNode):
    name: str = ""
    args: list[ExpressionNode] = field(default_factory=list)


@dataclass(slots=True)
class ExpressionStatementNode(StatementNode):
    expression: ExpressionNode | None = None


@dataclass(slots=True)
class AssertNode(StatementNode):
    condition: ExpressionNode | None = None


@dataclass(slots=True)
class IfNode(StatementNode):
    condition: ExpressionNode | None = None
    then_body: list[StatementNode] = field(default_factory=list)
    else_body: list[StatementNode] = field(default_factory=list)


@dataclass(slots=True)
class SwitchCaseNode(AstNode):
    label: ExpressionNode | None = None
    is_default: bool = False
    body: StatementNode | None = None


@dataclass(slots=True)
class SwitchNode(StatementNode):
    keys: list[ExpressionNode] = field(default_factory=list)
    cases: list[SwitchCaseNode] = field(default_factory=list)


@dataclass(slots=True)
class MapEntryNode(AstNode):
    values: list[ExpressionNode] = field(default_factory=list)


@dataclass(slots=True)
class MapDeclNode(StatementNode):
    is_static: bool = False
    key_types: list[TypeNode] = field(default_factory=list)
    value_types: list[TypeNode] = field(default_factory=list)
    size: int | None = None
    name: str = ""
    entries: list[MapEntryNode] = field(default_factory=list)


@dataclass(slots=True)
class SetDeclNode(StatementNode):
    is_static: bool = False
    key_types: list[TypeNode] = field(default_factory=list)
    names: list[str] = field(default_factory=list)
    entries: list[MapEntryNode] = field(default_factory=list)


@dataclass(slots=True)
class RegisterDeclNode(StatementNode):
    is_static: bool = False
    type_ref: TypeNode | None = None
    name: str = ""
    size: int | None = None


@dataclass(slots=True)
class FunctionDeclNode(StatementNode):
    name: str = ""
    params: list[ParamNode] = field(default_factory=list)
    body: list[StatementNode] = field(default_factory=list)


@dataclass(slots=True)
class ParserBlockNode(AstNode):
    headers: list[ExpressionNode] = field(default_factory=list)


@dataclass(slots=True)
class ControlBlockNode(AstNode):
    statements: list[StatementNode] = field(default_factory=list)


@dataclass(slots=True)
class TopLevelNode(AstNode):
    pass


@dataclass(slots=True)
class IncludeNode(AstNode):
    path: str = ""
    is_system: bool = True
    is_domain: bool = False
    resolved_from: str = ""


@dataclass(slots=True)
class ServiceNode(TopLevelNode):
    name: str = ""
    applications: list[str] = field(default_factory=list)


@dataclass(slots=True)
class ModuleNode(TopLevelNode):
    name: str = ""
    params: list[ParamNode] = field(default_factory=list)
    parser_name: str | None = None
    parser_block: ParserBlockNode | None = None
    control_block: ControlBlockNode | None = None


@dataclass(slots=True)
class ApplicationNode(TopLevelNode):
    name: str = ""
    parser_name: str | None = None
    body: list[StatementNode] = field(default_factory=list)


@dataclass(slots=True)
class IntentOverlayNode(TopLevelNode):
    intent_program: IntentProgramNode | None = None


@dataclass(slots=True)
class ProgramNode(AstNode):
    includes: list[IncludeNode] = field(default_factory=list)
    declarations: list[TopLevelNode] = field(default_factory=list)
