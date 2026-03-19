"""Intent DSL parser using grammar_intent.lark."""

from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import cast

from lark import Lark, Token, Transformer, Tree, UnexpectedInput, v_args

from compiler.ir.common import Diagnostic, DiagnosticSeverity, SourceSpan
from compiler.frontend.intent_ast import (
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


@dataclass(slots=True)
class IntentParseResult:
    ast: IntentProgramNode | None
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
class _TreeToIntentTransformer(Transformer[object, object]):
    def __init__(self, file_path: str = "<memory>"):
        super().__init__()
        self.file_path = file_path

    def _span(self, meta: object) -> SourceSpan:
        tree_meta = cast(Tree[object], meta)
        return SourceSpan(
            file=self.file_path,
            line=tree_meta.line,
            column=tree_meta.column,
            end_line=tree_meta.end_line,
            end_column=tree_meta.end_column,
        )

    def program(self, meta: object, children: list[object]) -> IntentProgramNode:
        return IntentProgramNode(
            span=self._span(meta),
            declarations=[cast(IntentAstNode, c) for c in children],
        )

    def statement(self, meta: object, children: list[object]) -> IntentAstNode:
        return cast(IntentAstNode, children[0])

    def import_stmt(self, meta: object, children: list[object]) -> ImportStmtNode:
        path = str(children[0]).strip('"\'')
        return ImportStmtNode(span=self._span(meta), path=path)

    def network_def(self, meta: object, children: list[object]) -> NetworkDefNode:
        name = str(children[0])
        body = children[1] if len(children) > 1 else []
        attrs: list[AttrNode] = []
        nested: list[IntentAstNode] = []
        for item in body:
            if isinstance(item, AttrNode):
                attrs.append(item)
            elif isinstance(item, IntentAstNode):
                nested.append(item)
        return NetworkDefNode(
            span=self._span(meta),
            name=name,
            attrs=attrs,
            nested=nested,
        )

    def network_body(self, meta: object, children: list[object]) -> list:
        return list(children)

    def network_attr(self, meta: object, children: list[object]) -> AttrNode:
        return AttrNode(
            span=self._span(meta),
            key=str(children[0]),
            value=cast(IntentAstNode, children[1]),
        )

    def node_def(self, meta: object, children: list[object]) -> NodeDefNode:
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
        return NodeDefNode(
            span=self._span(meta),
            name=name,
            node_type=node_type,
            attrs=attrs,
        )

    def node_type(self, meta: object, children: list[object]) -> str:
        return str(children[0])

    def node_body(self, meta: object, children: list[object]) -> list:
        return list(children)

    def node_attr(self, meta: object, children: list[object]) -> AttrNode:
        return AttrNode(
            span=self._span(meta),
            key=str(children[0]),
            value=cast(IntentAstNode, children[1]),
        )

    def link_def(self, meta: object, children: list[object]) -> LinkDefNode:
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

    def link_body(self, meta: object, children: list[object]) -> list:
        return list(children)

    def link_attr(self, meta: object, children: list[object]) -> AttrNode:
        if len(children) == 2:
            return AttrNode(
                span=self._span(meta),
                key=str(children[0]),
                value=cast(IntentAstNode, children[1]),
            )
        # "endpoints" ":" "[" endpoint_pair "]"
        pair = cast(EndpointPairNode, children[0])
        list_val = ListValueNode(span=self._span(meta), items=[pair])
        return AttrNode(span=self._span(meta), key="endpoints", value=list_val)

    def endpoint_pair(self, meta: object, children: list[object]) -> EndpointPairNode:
        return EndpointPairNode(
            span=self._span(meta),
            a=str(children[0]),
            b=str(children[1]),
        )

    def route_def(self, meta: object, children: list[object]) -> RouteDefNode:
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

    def route_body(self, meta: object, children: list[object]) -> list[AttrNode]:
        return [cast(AttrNode, c) for c in children]

    def route_attr(self, meta: object, children: list[object]) -> AttrNode:
        if len(children) == 1 and isinstance(children[0], AttrNode):
            return children[0]
        return AttrNode(
            span=self._span(meta),
            key=str(children[0]),
            value=cast(IntentAstNode, children[1]),
        )

    def from_attr(self, meta: object, children: list[object]) -> AttrNode:
        return AttrNode(span=self._span(meta), key="from", value=cast(IntentAstNode, children[0]))

    def to_attr(self, meta: object, children: list[object]) -> AttrNode:
        return AttrNode(span=self._span(meta), key="to", value=cast(IntentAstNode, children[0]))

    def via_attr(self, meta: object, children: list[object]) -> AttrNode:
        return AttrNode(span=self._span(meta), key="via", value=cast(IntentAstNode, children[0]))

    def protocol_attr(self, meta: object, children: list[object]) -> AttrNode:
        return AttrNode(span=self._span(meta), key="protocol", value=cast(IntentAstNode, children[0]))

    def policy_def(self, meta: object, children: list[object]) -> PolicyDefNode:
        name = str(children[0])
        attrs: list[AttrNode] = []
        for child in children[1:]:
            if isinstance(child, AttrNode):
                attrs.append(child)
            elif isinstance(child, list):
                attrs.extend(c for c in child if isinstance(c, AttrNode))
        return PolicyDefNode(
            span=self._span(meta),
            name=name,
            attrs=attrs,
        )

    def policy_body(self, meta: object, children: list[object]) -> list[AttrNode]:
        return [cast(AttrNode, c) for c in children]

    def policy_attr(self, meta: object, children: list[object]) -> AttrNode:
        if len(children) == 1 and isinstance(children[0], AttrNode):
            return children[0]
        return AttrNode(
            span=self._span(meta),
            key=str(children[0]),
            value=cast(IntentAstNode, children[1]),
        )

    def match_stmt(self, meta: object, children: list[object]) -> AttrNode:
        return AttrNode(span=self._span(meta), key="match", value=cast(IntentAstNode, children[0]))

    def action_stmt(self, meta: object, children: list[object]) -> AttrNode:
        return AttrNode(span=self._span(meta), key="action", value=cast(IntentAstNode, children[0]))

    def match_attr(self, meta: object, children: list[object]) -> AttrNode:
        return AttrNode(
            span=self._span(meta),
            key=str(children[0]),
            value=cast(IntentAstNode, children[1]),
        )

    def match_key(self, meta: object, children: list[object]) -> str:
        return str(children[0]).strip('"\'')

    def value(self, meta: object, children: list[object]) -> IntentAstNode:
        return cast(IntentAstNode, children[0])

    def STRING(self, token: Token) -> ValueNode:
        raw = str(token).strip('"\'')
        return ValueNode(span=_token_span(token, self.file_path), raw=raw, kind="string")

    def NUMBER(self, token: Token) -> ValueNode:
        s = str(token)
        try:
            raw = int(s) if "." not in s else float(s)
        except ValueError:
            raw = 0
        return ValueNode(span=_token_span(token, self.file_path), raw=raw, kind="number")

    def BOOLEAN(self, token: Token) -> ValueNode:
        raw = str(token).lower() == "true"
        return ValueNode(span=_token_span(token, self.file_path), raw=raw, kind="boolean")

    def list_value(self, meta: object, children: list[object]) -> ListValueNode:
        items = [cast(IntentAstNode, c) for c in children]
        return ListValueNode(span=self._span(meta), items=items)

    def object_value(self, meta: object, children: list[object]) -> ObjectValueNode:
        pairs = [cast(ObjectPairNode, c) for c in children if isinstance(c, ObjectPairNode)]
        return ObjectValueNode(span=self._span(meta), pairs=pairs)

    def object_pair(self, meta: object, children: list[object]) -> ObjectPairNode:
        return ObjectPairNode(
            span=self._span(meta),
            key=str(children[0]),
            value=cast(IntentAstNode, children[1]),
        )

    def endpoint_spec(self, meta: object, children: list[object]) -> EndpointSpecNode:
        c = children[0]
        if isinstance(c, str):
            return EndpointSpecNode(span=self._span(meta), kind="identifier", value=c)
        if isinstance(c, EndpointSpecNode):
            return EndpointSpecNode(span=self._span(meta), kind=c.kind, value=c.value)
        return EndpointSpecNode(span=self._span(meta), kind="identifier", value=str(c))

    def via_spec(self, meta: object, children: list[object]) -> ViaSpecNode:
        nodes = [str(c) for c in children]
        return ViaSpecNode(span=self._span(meta), nodes=nodes)

    def protocol_spec(self, meta: object, children: list[object]) -> str:
        return str(children[0])

    def prefix_spec(self, meta: object, children: list[object]) -> EndpointSpecNode:
        payload = cast(ObjectValueNode, children[0])
        return EndpointSpecNode(span=self._span(meta), kind="prefix", value=payload)

    def region_spec(self, meta: object, children: list[object]) -> EndpointSpecNode:
        val = str(children[0]).strip('"\'')
        return EndpointSpecNode(span=self._span(meta), kind="region", value=val)

    def IDENTIFIER(self, token: Token) -> str:
        return str(token)


class IntentParser:
    """Parse intent DSL source into Intent AST."""

    def __init__(self, grammar_path: Path | None = None):
        if grammar_path is None:
            grammar_path = Path(__file__).parent / "grammar_intent.lark"
        self._grammar_path = grammar_path
        self._parser = Lark(
            grammar_path.read_text(encoding="utf-8"),
            parser="lalr",
            start="program",
            propagate_positions=True,
            maybe_placeholders=True,
        )

    def parse_text(self, source: str, file_name: str = "<memory>") -> IntentParseResult:
        diagnostics: list[Diagnostic] = []
        try:
            tree = self._parser.parse(source)
        except UnexpectedInput as exc:
            diagnostics.append(
                Diagnostic(
                    code="INT001",
                    message=str(exc).splitlines()[0],
                    severity=DiagnosticSeverity.ERROR,
                    span=SourceSpan(
                        file=file_name,
                        line=exc.line or 1,
                        column=exc.column or 1,
                        end_line=exc.line or 1,
                        end_column=(exc.column or 1) + 1,
                    ),
                )
            )
            return IntentParseResult(ast=None, diagnostics=diagnostics)

        transformer = _TreeToIntentTransformer(file_name)
        ast = transformer.transform(tree)
        return IntentParseResult(ast=cast(IntentProgramNode, ast), diagnostics=diagnostics)

    def parse_file(self, path: Path) -> IntentParseResult:
        source = path.read_text(encoding="utf-8")
        return self.parse_text(source, str(path))


__all__ = ["IntentParser", "IntentParseResult"]
