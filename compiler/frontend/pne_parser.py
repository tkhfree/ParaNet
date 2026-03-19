"""Lark-based parser that builds an explicit PNE AST."""

from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import cast

from lark import Lark, Token, Transformer, Tree, UnexpectedInput, v_args

from compiler.ir.common import Diagnostic, DiagnosticSeverity, SourceSpan
from compiler.frontend.pne_ast import (
    ApplicationNode,
    ApplyCallNode,
    AssertNode,
    AssignNode,
    BinaryExpressionNode,
    CallExpressionNode,
    CallStatementNode,
    ControlBlockNode,
    ExpressionNode,
    ExpressionStatementNode,
    FieldAccessNode,
    FunctionDeclNode,
    HexLiteralNode,
    IdentifierNode,
    IfNode,
    IncludeNode,
    IndexExpressionNode,
    IntentOverlayNode,
    IntegerLiteralNode,
    IpLiteralNode,
    MapDeclNode,
    MapEntryNode,
    ModuleNode,
    NullStatementNode,
    ParamNode,
    ParserBlockNode,
    PrimitiveCallNode,
    ProgramNode,
    RegisterDeclNode,
    ServiceNode,
    SetDeclNode,
    SliceExpressionNode,
    StatementNode,
    SwitchCaseNode,
    SwitchNode,
    TopLevelNode,
    TupleExpressionNode,
    TypeNode,
    UnaryExpressionNode,
    VarDeclNode,
)
from compiler.frontend.pne_ast import (
    AttrNode,
    EndpointPairNode,
    EndpointSpecNode,
    ImportStmtNode,
    IntentAstNode,
    IntentProgramNode,
    LinkDefNode,
    ListValueNode,
    NetworkDefNode,
    NodeDefNode,
    ObjectPairNode,
    ObjectValueNode,
    PolicyDefNode,
    RouteDefNode,
    ValueNode,
    ViaSpecNode,
)
from compiler.frontend.preprocessor import IncludeDirective, Preprocessor, SourceUnit

PRIMITIVE_NAMES = {
    "drop",
    "nop",
    "sendToCPU",
    "addHeader",
    "removeHeader",
    "return",
    "updateChecksum",
    "HeaderCompress",
}


@dataclass(slots=True)
class ParseResult:
    ast: ProgramNode | None
    diagnostics: list[Diagnostic] = field(default_factory=list)


def _token_span(token: Token, file_path: str) -> SourceSpan:
    return SourceSpan(
        file=file_path,
        line=token.line,
        column=token.column,
        end_line=token.end_line,
        end_column=token.end_column,
    )


@v_args(meta=True)
class _TreeToAstTransformer(Transformer[object, object]):
    def __init__(self, file_path: Path):
        super().__init__()
        self.file_path = str(file_path)

    def _span(self, meta: object) -> SourceSpan:
        tree_meta = cast(Tree[object], meta)
        return SourceSpan(
            file=self.file_path,
            line=tree_meta.line,
            column=tree_meta.column,
            end_line=tree_meta.end_line,
            end_column=tree_meta.end_column,
        )

    def start(self, meta: object, children: list[object]) -> list[TopLevelNode]:
        return [cast(TopLevelNode, child) for child in children]

    def item(self, meta: object, children: list[object]) -> TopLevelNode:
        return cast(TopLevelNode, children[0])

    def intent_block(self, meta: object, children: list[object]) -> IntentOverlayNode:
        declarations = cast(list[IntentAstNode], children[0]) if children else []
        return IntentOverlayNode(
            span=self._span(meta),
            intent_program=IntentProgramNode(span=self._span(meta), declarations=declarations),
        )

    def intent_program_body(self, meta: object, children: list[object]) -> list[IntentAstNode]:
        return [cast(IntentAstNode, child) for child in children]

    def intent_statement(self, meta: object, children: list[object]) -> IntentAstNode:
        return cast(IntentAstNode, children[0])

    def service_chain(self, meta: object, children: list[object]) -> list[str]:
        return [str(child) for child in children]

    def service_decl(self, meta: object, children: list[object]) -> ServiceNode:
        return ServiceNode(
            span=self._span(meta),
            name=str(children[0]),
            applications=cast(list[str], children[1]),
        )

    def application_decl(self, meta: object, children: list[object]) -> ApplicationNode:
        name = str(children[0])
        parser_name: str | None = None
        body = cast(list[StatementNode], children[-1])
        if len(children) == 3:
            parser_name = str(children[1])
        return ApplicationNode(
            span=self._span(meta),
            name=name,
            parser_name=parser_name,
            body=body,
        )

    def direction(self, meta: object, children: list[object]) -> str:
        return str(children[0])

    def param_list(self, meta: object, children: list[object]) -> list[ParamNode]:
        return [cast(ParamNode, child) for child in children]

    def param_decl(self, meta: object, children: list[object]) -> ParamNode:
        if len(children) == 3:
            direction = cast(str, children[0])
            type_ref = cast(TypeNode, children[1])
            name = str(children[2])
        else:
            direction = None
            type_ref = cast(TypeNode, children[0])
            name = str(children[1])
        return ParamNode(
            span=self._span(meta),
            direction=direction,
            type_ref=type_ref,
            name=name,
        )

    def parser_item(self, meta: object, children: list[object]) -> ExpressionNode:
        return cast(ExpressionNode, children[0])

    def parser_block(self, meta: object, children: list[object]) -> ParserBlockNode:
        return ParserBlockNode(
            span=self._span(meta),
            headers=[cast(ExpressionNode, child) for child in children],
        )

    def block(self, meta: object, children: list[object]) -> list[StatementNode]:
        return [cast(StatementNode, child) for child in children]

    def control_block(self, meta: object, children: list[object]) -> ControlBlockNode:
        return ControlBlockNode(
            span=self._span(meta),
            statements=cast(list[StatementNode], children[0]),
        )

    def module_decl(self, meta: object, children: list[object]) -> ModuleNode:
        name = str(children[0])
        params: list[ParamNode] = []
        parser_name: str | None = None
        parser_block: ParserBlockNode | None = None
        control_block: ControlBlockNode | None = None

        for child in children[1:]:
            if isinstance(child, list):
                params = cast(list[ParamNode], child)
            elif isinstance(child, ParserBlockNode):
                parser_block = child
            elif isinstance(child, ControlBlockNode):
                control_block = child
            else:
                parser_name = str(child)

        return ModuleNode(
            span=self._span(meta),
            name=name,
            params=params,
            parser_name=parser_name,
            parser_block=parser_block,
            control_block=control_block,
        )

    def statement(self, meta: object, children: list[object]) -> StatementNode:
        return cast(StatementNode, children[0])

    def var_decl(self, meta: object, children: list[object]) -> VarDeclNode:
        return VarDeclNode(
            span=self._span(meta),
            type_ref=cast(TypeNode, children[0]),
            name=str(children[1]),
        )

    def array_size(self, meta: object, children: list[object]) -> int:
        return int(str(children[0]))

    def type_list(self, meta: object, children: list[object]) -> list[TypeNode]:
        return [cast(TypeNode, child) for child in children]

    def type_group(self, meta: object, children: list[object]) -> list[TypeNode]:
        if len(children) == 1 and isinstance(children[0], TypeNode):
            return [cast(TypeNode, children[0])]
        return cast(list[TypeNode], children[0])

    def named_type(self, meta: object, children: list[object]) -> TypeNode:
        token = cast(Token, children[0])
        return TypeNode(span=_token_span(token, self.file_path), name=str(token))

    def bit_type(self, meta: object, children: list[object]) -> TypeNode:
        token = cast(Token, children[0])
        return TypeNode(
            span=self._span(meta),
            name="bit",
            width=int(str(token)),
        )

    def map_entries(self, meta: object, children: list[object]) -> list[MapEntryNode]:
        return [cast(MapEntryNode, child) for child in children]

    def map_entry(self, meta: object, children: list[object]) -> MapEntryNode:
        values = cast(list[ExpressionNode], children[0]) if children else []
        return MapEntryNode(span=self._span(meta), values=values)

    def map_decl(self, meta: object, children: list[object]) -> MapDeclNode:
        index = 0
        is_static = False
        if children and isinstance(children[0], Token) and str(children[0]) == "static":
            is_static = True
            index += 1

        key_types = cast(list[TypeNode], children[index])
        value_types = cast(list[TypeNode], children[index + 1])
        index += 2

        size: int | None = None
        if index < len(children) and isinstance(children[index], int):
            size = cast(int, children[index])
            index += 1

        name = str(children[index])
        index += 1
        entries: list[MapEntryNode] = []
        if index < len(children):
            entries = cast(list[MapEntryNode], children[index])

        return MapDeclNode(
            span=self._span(meta),
            is_static=is_static,
            key_types=key_types,
            value_types=value_types,
            size=size,
            name=name,
            entries=entries,
        )

    def set_decl(self, meta: object, children: list[object]) -> SetDeclNode:
        index = 0
        is_static = False
        if children and isinstance(children[0], Token) and str(children[0]) == "static":
            is_static = True
            index += 1

        key_types = cast(list[TypeNode], children[index])
        index += 1

        names: list[str] = []
        entries: list[MapEntryNode] = []
        for child in children[index:]:
            if isinstance(child, list):
                entries = cast(list[MapEntryNode], child)
            else:
                names.append(str(child))

        return SetDeclNode(
            span=self._span(meta),
            is_static=is_static,
            key_types=key_types,
            names=names,
            entries=entries,
        )

    def register_decl(self, meta: object, children: list[object]) -> RegisterDeclNode:
        index = 0
        is_static = False
        if children and isinstance(children[0], Token) and str(children[0]) == "static":
            is_static = True
            index += 1

        type_ref = cast(TypeNode, children[index])
        name = str(children[index + 1])
        size = cast(int, children[index + 2])
        return RegisterDeclNode(
            span=self._span(meta),
            is_static=is_static,
            type_ref=type_ref,
            name=name,
            size=size,
        )

    def function_param_list(self, meta: object, children: list[object]) -> list[ParamNode]:
        return [cast(ParamNode, child) for child in children]

    def function_param(self, meta: object, children: list[object]) -> ParamNode:
        return ParamNode(
            span=self._span(meta),
            direction=None,
            type_ref=cast(TypeNode, children[0]),
            name=str(children[1]),
        )

    def function_decl(self, meta: object, children: list[object]) -> FunctionDeclNode:
        name = str(children[0])
        params: list[ParamNode] = []
        body: list[StatementNode]
        if len(children) == 3:
            params = cast(list[ParamNode], children[1])
            body = cast(list[StatementNode], children[2])
        else:
            body = cast(list[StatementNode], children[1])
        return FunctionDeclNode(
            span=self._span(meta),
            name=name,
            params=params,
            body=body,
        )

    def if_stmt(self, meta: object, children: list[object]) -> IfNode:
        condition = cast(ExpressionNode, children[0])
        then_body = cast(list[StatementNode], children[1])
        else_body: list[StatementNode] = []
        if len(children) == 3:
            if isinstance(children[2], list):
                else_body = cast(list[StatementNode], children[2])
            else:
                else_body = [cast(StatementNode, children[2])]
        return IfNode(
            span=self._span(meta),
            condition=condition,
            then_body=then_body,
            else_body=else_body,
        )

    def switch_body(self, meta: object, children: list[object]) -> StatementNode:
        return cast(StatementNode, children[0])

    def switch_case(self, meta: object, children: list[object]) -> SwitchCaseNode:
        if len(children) == 1:
            return SwitchCaseNode(
                span=self._span(meta),
                label=None,
                is_default=True,
                body=cast(StatementNode, children[0]),
            )
        return SwitchCaseNode(
            span=self._span(meta),
            label=cast(ExpressionNode, children[0]),
            is_default=False,
            body=cast(StatementNode, children[1]),
        )

    def switch_stmt(self, meta: object, children: list[object]) -> SwitchNode:
        return SwitchNode(
            span=self._span(meta),
            keys=cast(list[ExpressionNode], children[0]),
            cases=[cast(SwitchCaseNode, child) for child in children[1:]],
        )

    def assert_stmt(self, meta: object, children: list[object]) -> AssertNode:
        return AssertNode(span=self._span(meta), condition=cast(ExpressionNode, children[0]))

    def expr_list(self, meta: object, children: list[object]) -> list[ExpressionNode]:
        return [cast(ExpressionNode, child) for child in children]

    def assign_stmt(self, meta: object, children: list[object]) -> AssignNode:
        return AssignNode(
            span=self._span(meta),
            targets=cast(list[ExpressionNode], children[0]),
            value=cast(ExpressionNode, children[1]),
        )

    def expr_stmt(self, meta: object, children: list[object]) -> StatementNode:
        expression = cast(ExpressionNode, children[0])
        if isinstance(expression, CallExpressionNode):
            callee = expression.callee
            if isinstance(callee, FieldAccessNode) and callee.parts[-1] == "apply":
                target = ".".join(callee.parts[:-1])
                return ApplyCallNode(
                    span=self._span(meta),
                    target=target,
                    args=expression.args,
                )
            if isinstance(callee, IdentifierNode) and callee.name in PRIMITIVE_NAMES:
                return PrimitiveCallNode(
                    span=self._span(meta),
                    name=callee.name,
                    args=expression.args,
                )
            return CallStatementNode(
                span=self._span(meta),
                callee=callee,
                args=expression.args,
            )
        return ExpressionStatementNode(span=self._span(meta), expression=expression)

    def null_stmt(self, meta: object, children: list[object]) -> NullStatementNode:
        return NullStatementNode(span=self._span(meta))

    def tuple_values(self, meta: object, children: list[object]) -> TupleExpressionNode:
        return TupleExpressionNode(
            span=self._span(meta),
            items=[cast(ExpressionNode, child) for child in children],
        )

    def binary_expr(self, meta: object, children: list[object]) -> BinaryExpressionNode:
        return BinaryExpressionNode(
            span=self._span(meta),
            left=cast(ExpressionNode, children[0]),
            operator=str(children[1]),
            right=cast(ExpressionNode, children[2]),
        )

    def in_expr(self, meta: object, children: list[object]) -> BinaryExpressionNode:
        return BinaryExpressionNode(
            span=self._span(meta),
            left=cast(ExpressionNode, children[0]),
            operator="in",
            right=cast(ExpressionNode, children[2]),
        )

    def unary_expr(self, meta: object, children: list[object]) -> UnaryExpressionNode:
        return UnaryExpressionNode(
            span=self._span(meta),
            operator=str(children[0]),
            operand=cast(ExpressionNode, children[1]),
        )

    def attribute(self, meta: object, children: list[object]) -> FieldAccessNode:
        base = cast(ExpressionNode, children[0])
        name = str(children[1])
        if isinstance(base, IdentifierNode):
            parts = [base.name, name]
        elif isinstance(base, FieldAccessNode):
            parts = [*base.parts, name]
        else:
            parts = [name]
        return FieldAccessNode(span=self._span(meta), parts=parts)

    def index(self, meta: object, children: list[object]) -> IndexExpressionNode:
        return IndexExpressionNode(
            span=self._span(meta),
            target=cast(ExpressionNode, children[0]),
            index=cast(ExpressionNode, children[1]),
        )

    def slice(self, meta: object, children: list[object]) -> SliceExpressionNode:
        return SliceExpressionNode(
            span=self._span(meta),
            target=cast(ExpressionNode, children[0]),
            start=cast(ExpressionNode, children[1]),
            end=cast(ExpressionNode, children[2]),
        )

    def arg_list(self, meta: object, children: list[object]) -> list[ExpressionNode]:
        return [cast(ExpressionNode, child) for child in children]

    def call(self, meta: object, children: list[object]) -> CallExpressionNode:
        args: list[ExpressionNode] = []
        if len(children) == 2:
            args = cast(list[ExpressionNode], children[1])
        return CallExpressionNode(
            span=self._span(meta),
            callee=cast(ExpressionNode, children[0]),
            args=args,
        )

    def grouped(self, meta: object, children: list[object]) -> ExpressionNode:
        return cast(ExpressionNode, children[0])

    def identifier(self, meta: object, children: list[object]) -> IdentifierNode:
        token = cast(Token, children[0])
        return IdentifierNode(span=_token_span(token, self.file_path), name=str(token))

    def int_literal(self, meta: object, children: list[object]) -> IntegerLiteralNode:
        token = cast(Token, children[0])
        return IntegerLiteralNode(
            span=_token_span(token, self.file_path),
            value=int(str(token)),
            raw=str(token),
        )

    def hex_literal(self, meta: object, children: list[object]) -> HexLiteralNode:
        token = cast(Token, children[0])
        return HexLiteralNode(span=_token_span(token, self.file_path), value=str(token))

    def ip_literal(self, meta: object, children: list[object]) -> IpLiteralNode:
        token = cast(Token, children[0])
        return IpLiteralNode(span=_token_span(token, self.file_path), value=str(token))

    def literal(self, meta: object, children: list[object]) -> ExpressionNode:
        return cast(ExpressionNode, children[0])

    def intent_import_stmt(self, meta: object, children: list[object]) -> ImportStmtNode:
        path = str(children[0]).strip('"\'')
        return ImportStmtNode(span=self._span(meta), path=path)

    def intent_network_def(self, meta: object, children: list[object]) -> NetworkDefNode:
        name = str(children[0])
        body = children[1] if len(children) > 1 else []
        attrs: list[AttrNode] = []
        nested: list[IntentAstNode] = []
        for item in body:
            if isinstance(item, AttrNode):
                attrs.append(item)
            elif isinstance(item, IntentAstNode):
                nested.append(item)
        return NetworkDefNode(span=self._span(meta), name=name, attrs=attrs, nested=nested)

    def intent_network_body(self, meta: object, children: list[object]) -> list[object]:
        return list(children)

    def intent_network_attr(self, meta: object, children: list[object]) -> AttrNode:
        return AttrNode(
            span=self._span(meta),
            key=str(children[0]),
            value=cast(IntentAstNode, children[1]),
        )

    def intent_node_def(self, meta: object, children: list[object]) -> NodeDefNode:
        name = str(children[0])
        node_type: str | None = None
        attrs: list[AttrNode] = []
        for child in children[1:]:
            if isinstance(child, str):
                node_type = child
            elif isinstance(child, list):
                attrs = [c for c in child if isinstance(c, AttrNode)]
            elif isinstance(child, AttrNode):
                attrs.append(child)
        return NodeDefNode(span=self._span(meta), name=name, node_type=node_type, attrs=attrs)

    def intent_node_type(self, meta: object, children: list[object]) -> str:
        return str(children[0])

    def intent_node_body(self, meta: object, children: list[object]) -> list[object]:
        return list(children)

    def intent_node_attr(self, meta: object, children: list[object]) -> AttrNode:
        return AttrNode(
            span=self._span(meta),
            key=str(children[0]),
            value=cast(IntentAstNode, children[1]),
        )

    def intent_link_def(self, meta: object, children: list[object]) -> LinkDefNode:
        name: str | None = None
        attrs: list[AttrNode] = []
        for child in children:
            if isinstance(child, str):
                name = child
            elif isinstance(child, list):
                attrs = [c for c in child if isinstance(c, AttrNode)]
            elif isinstance(child, AttrNode):
                attrs.append(child)
        return LinkDefNode(span=self._span(meta), name=name, attrs=attrs)

    def intent_link_body(self, meta: object, children: list[object]) -> list[object]:
        return list(children)

    def intent_link_attr(self, meta: object, children: list[object]) -> AttrNode:
        if len(children) == 2:
            return AttrNode(
                span=self._span(meta),
                key=str(children[0]),
                value=cast(IntentAstNode, children[1]),
            )
        pair = cast(EndpointPairNode, children[0])
        list_val = ListValueNode(span=self._span(meta), items=[pair])
        return AttrNode(span=self._span(meta), key="endpoints", value=list_val)

    def intent_endpoint_pair(self, meta: object, children: list[object]) -> EndpointPairNode:
        return EndpointPairNode(
            span=self._span(meta),
            a=str(children[0]),
            b=str(children[1]),
        )

    def intent_route_def(self, meta: object, children: list[object]) -> RouteDefNode:
        name: str | None = None
        attrs: list[AttrNode] = []
        for child in children:
            if isinstance(child, str):
                name = child
            elif isinstance(child, list):
                attrs = [c for c in child if isinstance(c, AttrNode)]
            elif isinstance(child, AttrNode):
                attrs.append(child)
        return RouteDefNode(span=self._span(meta), name=name, attrs=attrs)

    def intent_route_body(self, meta: object, children: list[object]) -> list[AttrNode]:
        return [cast(AttrNode, child) for child in children]

    def intent_route_attr(self, meta: object, children: list[object]) -> AttrNode:
        if len(children) == 1 and isinstance(children[0], AttrNode):
            return children[0]
        return AttrNode(
            span=self._span(meta),
            key=str(children[0]),
            value=cast(IntentAstNode, children[1]),
        )

    def intent_from_attr(self, meta: object, children: list[object]) -> AttrNode:
        return AttrNode(span=self._span(meta), key="from", value=cast(IntentAstNode, children[0]))

    def intent_to_attr(self, meta: object, children: list[object]) -> AttrNode:
        return AttrNode(span=self._span(meta), key="to", value=cast(IntentAstNode, children[0]))

    def intent_via_attr(self, meta: object, children: list[object]) -> AttrNode:
        return AttrNode(span=self._span(meta), key="via", value=cast(IntentAstNode, children[0]))

    def intent_protocol_attr(self, meta: object, children: list[object]) -> AttrNode:
        return AttrNode(span=self._span(meta), key="protocol", value=cast(IntentAstNode, children[0]))

    def intent_policy_def(self, meta: object, children: list[object]) -> PolicyDefNode:
        name = str(children[0])
        attrs: list[AttrNode] = []
        for child in children[1:]:
            if isinstance(child, AttrNode):
                attrs.append(child)
            elif isinstance(child, list):
                attrs.extend(c for c in child if isinstance(c, AttrNode))
        return PolicyDefNode(span=self._span(meta), name=name, attrs=attrs)

    def intent_policy_body(self, meta: object, children: list[object]) -> list[AttrNode]:
        return [cast(AttrNode, child) for child in children]

    def intent_policy_attr(self, meta: object, children: list[object]) -> AttrNode:
        if len(children) == 1 and isinstance(children[0], AttrNode):
            return children[0]
        return AttrNode(
            span=self._span(meta),
            key=str(children[0]),
            value=cast(IntentAstNode, children[1]),
        )

    def intent_match_stmt(self, meta: object, children: list[object]) -> AttrNode:
        return AttrNode(span=self._span(meta), key="match", value=cast(IntentAstNode, children[0]))

    def intent_action_stmt(self, meta: object, children: list[object]) -> AttrNode:
        return AttrNode(span=self._span(meta), key="action", value=cast(IntentAstNode, children[0]))

    def intent_match_attr(self, meta: object, children: list[object]) -> AttrNode:
        return AttrNode(
            span=self._span(meta),
            key=str(children[0]),
            value=cast(IntentAstNode, children[1]),
        )

    def intent_match_key(self, meta: object, children: list[object]) -> str:
        return str(children[0]).strip('"\'')

    def intent_value(self, meta: object, children: list[object]) -> IntentAstNode:
        return cast(IntentAstNode, children[0])

    def STRING(self, token: Token) -> ValueNode:
        raw = str(token).strip('"\'')
        return ValueNode(span=_token_span(token, self.file_path), raw=raw, kind="string")

    def INTENT_NUMBER(self, token: Token) -> ValueNode:
        raw_text = str(token)
        try:
            raw = int(raw_text) if "." not in raw_text else float(raw_text)
        except ValueError:
            raw = 0
        return ValueNode(span=_token_span(token, self.file_path), raw=raw, kind="number")

    def INTENT_BOOLEAN(self, token: Token) -> ValueNode:
        raw = str(token).lower() == "true"
        return ValueNode(span=_token_span(token, self.file_path), raw=raw, kind="boolean")

    def intent_list_value(self, meta: object, children: list[object]) -> ListValueNode:
        return ListValueNode(
            span=self._span(meta),
            items=[cast(IntentAstNode, child) for child in children],
        )

    def intent_object_value(self, meta: object, children: list[object]) -> ObjectValueNode:
        return ObjectValueNode(
            span=self._span(meta),
            pairs=[cast(ObjectPairNode, child) for child in children if isinstance(child, ObjectPairNode)],
        )

    def intent_object_pair(self, meta: object, children: list[object]) -> ObjectPairNode:
        return ObjectPairNode(
            span=self._span(meta),
            key=str(children[0]),
            value=cast(IntentAstNode, children[1]),
        )

    def intent_endpoint_spec(self, meta: object, children: list[object]) -> EndpointSpecNode:
        child = children[0]
        if isinstance(child, str):
            return EndpointSpecNode(span=self._span(meta), kind="identifier", value=child)
        if isinstance(child, EndpointSpecNode):
            return EndpointSpecNode(span=self._span(meta), kind=child.kind, value=child.value)
        return EndpointSpecNode(span=self._span(meta), kind="identifier", value=str(child))

    def intent_via_spec(self, meta: object, children: list[object]) -> ViaSpecNode:
        return ViaSpecNode(span=self._span(meta), nodes=[str(child) for child in children])

    def intent_protocol_spec(self, meta: object, children: list[object]) -> str:
        return str(children[0])

    def intent_prefix_spec(self, meta: object, children: list[object]) -> EndpointSpecNode:
        payload = cast(ObjectValueNode, children[0])
        return EndpointSpecNode(span=self._span(meta), kind="prefix", value=payload)

    def intent_region_spec(self, meta: object, children: list[object]) -> EndpointSpecNode:
        value = str(children[0]).strip('"\'')
        return EndpointSpecNode(span=self._span(meta), kind="region", value=value)


class PneParser:
    """Parse PNE files into an explicit AST."""

    def __init__(self, include_paths: list[Path] | None = None):
        grammar_path = Path(__file__).parent / "grammar_pne_intent.lark"
        self._grammar_path = grammar_path
        self._parser = Lark(
            grammar_path.read_text(encoding="utf-8"),
            parser="lalr",
            start="start",
            propagate_positions=True,
            maybe_placeholders=False,
        )
        self._preprocessor = Preprocessor(include_paths=include_paths)

    def parse_file(self, path: Path) -> ParseResult:
        program, diagnostics = self._preprocessor.preprocess_file(path)
        if program is None:
            return ParseResult(ast=None, diagnostics=diagnostics)

        declarations: list[TopLevelNode] = []
        for unit in program.units:
            declarations.extend(self._parse_unit(unit, diagnostics))

        ast = ProgramNode(
            includes=[
                IncludeNode(
                    span=directive.span,
                    path=directive.path,
                    is_system=directive.is_system,
                    is_domain=directive.is_domain,
                    resolved_from=str(directive.source_file),
                )
                for directive in program.includes
            ],
            declarations=declarations,
        )
        return ParseResult(ast=ast, diagnostics=diagnostics)

    def parse_text(self, text: str, file_name: str = "<memory>") -> ParseResult:
        diagnostics: list[Diagnostic] = []
        unit = SourceUnit(path=Path(file_name), body_text=text)
        declarations = self._parse_unit(unit, diagnostics)
        return ParseResult(
            ast=ProgramNode(includes=[], declarations=declarations),
            diagnostics=diagnostics,
        )

    def _parse_unit(
        self, unit: SourceUnit, diagnostics: list[Diagnostic]
    ) -> list[TopLevelNode]:
        if not unit.body_text.strip():
            return []

        try:
            tree = self._parser.parse(unit.body_text)
        except UnexpectedInput as exc:
            diagnostics.append(
                Diagnostic(
                    code="PAR001",
                    message=str(exc).splitlines()[0],
                    severity=DiagnosticSeverity.ERROR,
                    span=SourceSpan(
                        file=str(unit.path),
                        line=exc.line or 1,
                        column=exc.column or 1,
                        end_line=exc.line or 1,
                        end_column=(exc.column or 1) + 1,
                    ),
                )
            )
            return []

        transformer = _TreeToAstTransformer(unit.path)
        result = transformer.transform(tree)
        return cast(list[TopLevelNode], result)


__all__ = ["ParseResult", "PneParser"]
