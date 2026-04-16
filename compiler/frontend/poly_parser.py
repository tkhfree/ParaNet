"""Lark-based parser that builds Polymorphic DSL AST nodes."""

from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, cast

from lark import Lark, Token, Transformer, Tree, UnexpectedInput, v_args

from compiler.ir.common import Diagnostic, DiagnosticSeverity, SourceSpan
from compiler.frontend.poly_ast import (
    ConstrainNode,
    ControlBlockNode,
    DataBlockNode,
    FlowPushNode,
    HeaderFieldNode,
    LayerNode,
    LinkDefNode,
    MgmtChannelNode,
    ModuleDefNode,
    OnEventNode,
    PacketDefNode,
    ParseDefNode,
    ParseMatchCaseNode,
    PatternNode,
    PeriodicNode,
    PolyAstNode,
    PolyAttrNode,
    PolymorphicDefNode,
    PolyListValueNode,
    PolyObjectPairNode,
    PolyObjectValueNode,
    PolyProgramNode,
    PolyValueNode,
    ProfileNode,
    ServiceDefNode,
    StateDeclNode,
    TopoNodeDefNode,
    TopologyBlockNode,
    AppMetaNode,
    DiscoveryNode,
    ProviderEntryNode,
)


@dataclass(slots=True)
class PolyParseResult:
    """Result of parsing a Polymorphic DSL source."""

    ast: PolyProgramNode | None
    diagnostics: list[Diagnostic] = field(default_factory=list)


def _token_span(token: Token, file_path: str) -> SourceSpan:
    return SourceSpan(
        file=file_path,
        line=token.line,
        column=token.column,
        end_line=token.end_line,
        end_column=token.end_column,
    )


def _is_keyword_token(child: object) -> bool:
    """Check if a child is a keyword token that should be skipped."""
    if isinstance(child, Token):
        return bool(child.type and child.type.startswith("POLY_KW_"))
    return False


def _filter_keywords(children: list[object]) -> list[object]:
    """Filter out keyword tokens from children list, returning meaningful content."""
    return [c for c in children if not _is_keyword_token(c)]


@v_args(meta=True)
class _PolyTransformer(Transformer[object, object]):
    """Transform a Lark parse tree into PolyAstNode instances."""

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

    # ------------------------------------------------------------------
    # Terminals
    # ------------------------------------------------------------------

    def POLY_NAME(self, token: Token) -> str:
        return str(token)

    def DOTTED_NAME(self, token: Token) -> str:
        return str(token)

    def POLY_NUMBER(self, token: Token) -> PolyValueNode:
        raw_text = str(token)
        try:
            raw: int | float = int(raw_text) if "." not in raw_text else float(raw_text)
        except ValueError:
            raw = 0
        return PolyValueNode(span=_token_span(token, self.file_path), raw=raw, kind="number")

    def POLY_BOOLEAN(self, token: Token) -> PolyValueNode:
        raw = str(token).lower() == "true"
        return PolyValueNode(span=_token_span(token, self.file_path), raw=raw, kind="boolean")

    def STRING(self, token: Token) -> PolyValueNode:
        raw = str(token).strip("\"'")
        return PolyValueNode(span=_token_span(token, self.file_path), raw=raw, kind="string")

    def MODULE_EXPR(self, token: Token) -> str:
        return str(token).strip()

    def TYPE_EXPR(self, token: Token) -> str:
        return str(token).strip()

    def POLY_WILDCARD(self, token: Token) -> str:
        return "_"

    # ------------------------------------------------------------------
    # Top-level
    # ------------------------------------------------------------------

    def start(self, meta: object, children: list[object]) -> PolyProgramNode:
        protocols: list[PolymorphicDefNode] = []
        for child in children:
            if isinstance(child, list):
                protocols = cast(list[PolymorphicDefNode], child)
            elif isinstance(child, PolymorphicDefNode):
                protocols.append(child)
        return PolyProgramNode(span=self._span(meta), protocols=protocols)

    def poly_program(self, meta: object, children: list[object]) -> list[PolymorphicDefNode]:
        return [cast(PolymorphicDefNode, c) for c in children]

    def poly_mixin_list(self, meta: object, children: list[object]) -> list[str]:
        return [str(c) for c in children]

    def polymorphic_def(self, meta: object, children: list[object]) -> PolymorphicDefNode:
        filtered = _filter_keywords(children)
        name = str(filtered[0])
        extends: str | None = None
        mixins: list[str] = []
        topology: TopologyBlockNode | None = None
        control: ControlBlockNode | None = None
        data: DataBlockNode | None = None

        for child in filtered[1:]:
            if isinstance(child, str):
                if extends is None:
                    extends = child
            elif isinstance(child, list):
                mixins = cast(list[str], child)
            elif isinstance(child, TopologyBlockNode):
                topology = child
            elif isinstance(child, ControlBlockNode):
                control = child
            elif isinstance(child, DataBlockNode):
                data = child

        return PolymorphicDefNode(
            span=self._span(meta),
            name=name,
            extends=extends,
            mixins=mixins,
            topology=topology,
            control=control,
            data=data,
        )

    def poly_block(self, meta: object, children: list[object]) -> PolyAstNode:
        return cast(PolyAstNode, children[0])

    # ------------------------------------------------------------------
    # Value types
    # ------------------------------------------------------------------

    def poly_value(self, meta: object, children: list[object]) -> PolyAstNode:
        return cast(PolyAstNode, children[0])

    def poly_string(self, meta: object, children: list[object]) -> PolyValueNode:
        return cast(PolyValueNode, children[0])

    def poly_num(self, meta: object, children: list[object]) -> PolyValueNode:
        return cast(PolyValueNode, children[0])

    def poly_bool(self, meta: object, children: list[object]) -> PolyValueNode:
        return cast(PolyValueNode, children[0])

    def poly_list(self, meta: object, children: list[object]) -> PolyListValueNode:
        return PolyListValueNode(
            span=self._span(meta),
            items=[cast(PolyAstNode, c) for c in children],
        )

    def poly_object(self, meta: object, children: list[object]) -> PolyObjectValueNode:
        return PolyObjectValueNode(
            span=self._span(meta),
            pairs=[cast(PolyObjectPairNode, c) for c in children if isinstance(c, PolyObjectPairNode)],
        )

    def poly_object_pair(self, meta: object, children: list[object]) -> PolyObjectPairNode:
        return PolyObjectPairNode(
            span=self._span(meta),
            key=str(children[0]),
            value=cast(PolyAstNode, children[1]),
        )

    # ------------------------------------------------------------------
    # Topology block
    # ------------------------------------------------------------------

    def topology_block(self, meta: object, children: list[object]) -> TopologyBlockNode:
        profiles: list[ProfileNode] = []
        patterns: list[PatternNode] = []
        nodes: list[TopoNodeDefNode] = []
        links: list[LinkDefNode] = []
        constraints: list[ConstrainNode] = []

        for child in children:
            if isinstance(child, ProfileNode):
                profiles.append(child)
            elif isinstance(child, PatternNode):
                patterns.append(child)
            elif isinstance(child, TopoNodeDefNode):
                nodes.append(child)
            elif isinstance(child, LinkDefNode):
                links.append(child)
            elif isinstance(child, ConstrainNode):
                constraints.append(child)
            elif isinstance(child, list):
                for item in child:
                    if isinstance(item, ProfileNode):
                        profiles.append(item)
                    elif isinstance(item, PatternNode):
                        patterns.append(item)
                    elif isinstance(item, TopoNodeDefNode):
                        nodes.append(item)
                    elif isinstance(item, LinkDefNode):
                        links.append(item)
                    elif isinstance(item, ConstrainNode):
                        constraints.append(item)

        return TopologyBlockNode(
            span=self._span(meta),
            profiles=profiles,
            patterns=patterns,
            nodes=nodes,
            links=links,
            constraints=constraints,
        )

    def topo_item(self, meta: object, children: list[object]) -> PolyAstNode:
        return cast(PolyAstNode, children[0])

    # -- Profile --

    def profile_def(self, meta: object, children: list[object]) -> ProfileNode:
        filtered = _filter_keywords(children)
        name = str(filtered[0])
        target = ""
        pipeline = ""
        compiler = ""
        mgmt: MgmtChannelNode | None = None

        for child in filtered[1:]:
            if isinstance(child, PolyAttrNode):
                if child.key == "target":
                    target = self._extract_string(child.value)
                elif child.key == "pipeline":
                    pipeline = self._extract_string(child.value)
                elif child.key == "compiler":
                    compiler = self._extract_string(child.value)
            elif isinstance(child, MgmtChannelNode):
                mgmt = child

        return ProfileNode(
            span=self._span(meta),
            name=name,
            target=target,
            pipeline=pipeline,
            compiler=compiler,
            mgmt=mgmt,
        )

    def profile_attr(self, meta: object, children: list[object]) -> PolyAstNode:
        # First child is the keyword token (POLY_KW_TARGET etc.) or a rule result
        if isinstance(children[0], Token) and children[0].type and children[0].type.startswith("POLY_KW_"):
            key = str(children[0])
            value = cast(PolyAstNode, children[-1])
            return PolyAttrNode(span=self._span(meta), key=key, value=value)
        # profile_mgmt case: returns MgmtChannelNode directly
        return cast(PolyAstNode, children[0])

    def profile_mgmt(self, meta: object, children: list[object]) -> MgmtChannelNode:
        return self._build_mgmt_from_attrs(meta, children, has_address=False)

    def profile_mgmt_attr(self, meta: object, children: list[object]) -> PolyAttrNode:
        key = str(children[0])
        value = cast(PolyAstNode, children[-1])
        return PolyAttrNode(span=self._span(meta), key=key, value=value)

    # -- Pattern --

    def pattern_def(self, meta: object, children: list[object]) -> PatternNode:
        filtered = _filter_keywords(children)
        name = str(filtered[0])
        params: dict[str, Any] = {}
        layers: list[LayerNode] = []
        connections: list[tuple[str, str, str]] = []

        for child in filtered[1:]:
            if isinstance(child, dict):
                params = child
            elif isinstance(child, LayerNode):
                layers.append(child)
            elif isinstance(child, tuple):
                connections.append(child)

        return PatternNode(
            span=self._span(meta),
            name=name,
            params=params,
            layers=layers,
            connections=connections,
        )

    def poly_param_list(self, meta: object, children: list[object]) -> dict[str, Any]:
        result: dict[str, Any] = {}
        for child in children:
            if isinstance(child, tuple) and len(child) == 2:
                result[str(child[0])] = child[1]
        return result

    def poly_param(self, meta: object, children: list[object]) -> tuple[str, Any]:
        name = str(children[0])
        value = self._extract_value(cast(PolyAstNode, children[-1]))
        return (name, value)

    def pattern_body_item(self, meta: object, children: list[object]) -> Any:
        return children[0]

    def layer_def(self, meta: object, children: list[object]) -> LayerNode:
        # Children: [Token(POLY_KW_LAYER), str(name), PolyValueNode(count), str(profile_ref)]
        # Filter out keyword tokens
        non_kw = [c for c in children if not (isinstance(c, Token) and c.type and c.type.startswith("POLY_KW_"))]
        name = str(non_kw[0])
        count = self._extract_int_from_value(non_kw[1])
        profile_ref = ""
        if len(non_kw) > 2:
            profile_ref = self._extract_string(cast(PolyAstNode, non_kw[2]))

        return LayerNode(
            span=self._span(meta),
            name=name,
            count=count,
            profile_ref=profile_ref,
        )

    def mesh_def(self, meta: object, children: list[object]) -> tuple[str, str, str]:
        non_kw = [c for c in children if not (isinstance(c, Token) and c.type and c.type.startswith("POLY_KW_"))]
        return (str(non_kw[0]), str(non_kw[1]), "mesh")

    # -- Node --

    def node_def(self, meta: object, children: list[object]) -> TopoNodeDefNode:
        filtered = _filter_keywords(children)
        name = str(filtered[0])
        role = ""
        profile_ref = ""
        mgmt: MgmtChannelNode | None = None

        for child in filtered[1:]:
            if isinstance(child, PolyAttrNode):
                if child.key == "role":
                    role = self._extract_string(child.value)
                elif child.key == "profile":
                    profile_ref = self._extract_string(child.value)
            elif isinstance(child, MgmtChannelNode):
                mgmt = child

        return TopoNodeDefNode(
            span=self._span(meta),
            name=name,
            role=role,
            profile_ref=profile_ref,
            mgmt=mgmt,
        )

    def node_attr(self, meta: object, children: list[object]) -> PolyAstNode:
        if isinstance(children[0], Token) and children[0].type and children[0].type.startswith("POLY_KW_"):
            key = str(children[0])
            value = cast(PolyAstNode, children[-1])
            return PolyAttrNode(span=self._span(meta), key=key, value=value)
        return cast(PolyAstNode, children[0])

    def node_mgmt(self, meta: object, children: list[object]) -> MgmtChannelNode:
        return self._build_mgmt_from_attrs(meta, children, has_address=True)

    def node_mgmt_attr(self, meta: object, children: list[object]) -> PolyAttrNode:
        key = str(children[0])
        value = cast(PolyAstNode, children[-1])
        return PolyAttrNode(span=self._span(meta), key=key, value=value)

    # -- Link --

    def link_def(self, meta: object, children: list[object]) -> LinkDefNode:
        filtered = _filter_keywords(children)
        src = str(filtered[0])
        directed = False
        dst = ""
        attrs: dict[str, PolyAstNode] = {}

        for child in filtered[1:]:
            if isinstance(child, str) and child in ("directed", "undirected"):
                directed = child == "directed"
            elif isinstance(child, str) and dst == "":
                dst = child
            elif isinstance(child, PolyAttrNode):
                attrs[child.key] = cast(PolyAstNode, child.value)

        return LinkDefNode(
            span=self._span(meta),
            src=src,
            dst=dst,
            directed=directed,
            attrs=attrs,
        )

    def directed_link(self, meta: object, children: list[object]) -> str:
        return "directed"

    def undirected_link(self, meta: object, children: list[object]) -> str:
        return "undirected"

    def link_attr(self, meta: object, children: list[object]) -> PolyAttrNode:
        return PolyAttrNode(
            span=self._span(meta),
            key=str(children[0]),
            value=cast(PolyAstNode, children[1]),
        )

    def constrain_def(self, meta: object, children: list[object]) -> ConstrainNode:
        non_kw = [c for c in children if not (isinstance(c, Token) and c.type and c.type.startswith("POLY_KW_"))]
        scope = str(non_kw[0])
        expression = self._extract_string(cast(PolyAstNode, non_kw[1]))
        return ConstrainNode(span=self._span(meta), scope=scope, expression=expression)

    # ------------------------------------------------------------------
    # Control block
    # ------------------------------------------------------------------

    def control_block(self, meta: object, children: list[object]) -> ControlBlockNode:
        app: AppMetaNode | None = None
        capabilities: list[str] = []
        states: list[StateDeclNode] = []
        discovery: DiscoveryNode | None = None
        event_handlers: list[OnEventNode] = []
        periodic_tasks: list[PeriodicNode] = []
        flow_pushes: list[FlowPushNode] = []

        for child in children:
            if isinstance(child, AppMetaNode):
                app = child
            elif isinstance(child, list) and all(isinstance(s, str) for s in child):
                capabilities = cast(list[str], child)
            elif isinstance(child, StateDeclNode):
                states.append(child)
            elif isinstance(child, DiscoveryNode):
                discovery = child
            elif isinstance(child, OnEventNode):
                event_handlers.append(child)
            elif isinstance(child, PeriodicNode):
                periodic_tasks.append(child)
            elif isinstance(child, FlowPushNode):
                flow_pushes.append(child)

        return ControlBlockNode(
            span=self._span(meta),
            app=app,
            capabilities=capabilities,
            states=states,
            discovery=discovery,
            event_handlers=event_handlers,
            periodic_tasks=periodic_tasks,
            flow_pushes=flow_pushes,
        )

    def ctrl_item(self, meta: object, children: list[object]) -> Any:
        return children[0]

    def app_def(self, meta: object, children: list[object]) -> AppMetaNode:
        name = ""
        version = ""
        description = ""
        onos_version = ""
        features: list[str] = []

        for child in _filter_keywords(children):
            if isinstance(child, PolyAttrNode):
                if child.key == "name":
                    name = self._extract_string(child.value)
                elif child.key == "version":
                    version = self._extract_string(child.value)
                elif child.key == "description":
                    description = self._extract_string(child.value)
                elif child.key == "onos_version":
                    onos_version = self._extract_string(child.value)
                elif child.key == "features":
                    if isinstance(child.value, PolyListValueNode):
                        features = [self._extract_string(cast(PolyAstNode, item)) for item in child.value.items]
            elif isinstance(child, PolyListValueNode):
                features = [self._extract_string(cast(PolyAstNode, item)) for item in child.items]

        return AppMetaNode(
            span=self._span(meta),
            name=name,
            version=version,
            description=description,
            onos_version=onos_version,
            features=features,
        )

    def app_attr(self, meta: object, children: list[object]) -> Any:
        if isinstance(children[0], Token) and children[0].type and children[0].type.startswith("POLY_KW_"):
            key = str(children[0])
            value = children[-1]
            return PolyAttrNode(span=self._span(meta), key=key, value=cast(PolyAstNode, value))
        return children[0]

    def capabilities_def(self, meta: object, children: list[object]) -> list[str]:
        # children: [Token(POLY_KW_CAPABILITIES), PolyListValueNode]
        for child in children:
            if isinstance(child, PolyListValueNode):
                return [self._extract_string(cast(PolyAstNode, item)) for item in child.items]
        return []

    def state_def(self, meta: object, children: list[object]) -> StateDeclNode:
        # children: [Token(POLY_KW_STATE), str(name), str(type_expr)]
        non_kw = [c for c in children if not (isinstance(c, Token) and c.type and c.type.startswith("POLY_KW_"))]
        name = str(non_kw[0])
        type_expr = str(non_kw[1])
        return StateDeclNode(span=self._span(meta), name=name, type_expr=type_expr)

    def discovery_def(self, meta: object, children: list[object]) -> DiscoveryNode:
        providers: list[ProviderEntryNode] = []
        on_connected: list[str] = []
        on_disconnected: list[str] = []

        for child in children:
            if isinstance(child, list):
                for item in child:
                    if isinstance(item, ProviderEntryNode):
                        providers.append(item)
                    elif isinstance(item, tuple) and len(item) == 3:
                        event_name, _params, actions = item
                        actions_list = cast(list[str], actions)
                        if event_name == "connected":
                            on_connected = actions_list
                        elif event_name == "disconnected":
                            on_disconnected = actions_list
            elif isinstance(child, ProviderEntryNode):
                providers.append(child)

        return DiscoveryNode(
            span=self._span(meta),
            providers=providers,
            on_connected=on_connected,
            on_disconnected=on_disconnected,
        )

    def discovery_item(self, meta: object, children: list[object]) -> Any:
        return children[0]

    def discovery_providers(self, meta: object, children: list[object]) -> list[ProviderEntryNode]:
        return [cast(ProviderEntryNode, c) for c in children]

    def provider_entry(self, meta: object, children: list[object]) -> ProviderEntryNode:
        name = str(children[0])
        config: dict[str, Any] = {}
        for child in children[1:]:
            if isinstance(child, PolyAttrNode):
                config[child.key] = self._extract_value(cast(PolyAstNode, child.value))
        return ProviderEntryNode(span=self._span(meta), name=name, config=config)

    def provider_attr(self, meta: object, children: list[object]) -> PolyAttrNode:
        return PolyAttrNode(
            span=self._span(meta),
            key=str(children[0]),
            value=cast(PolyAstNode, children[1]),
        )

    def discovery_on_event(self, meta: object, children: list[object]) -> tuple[str, list[str], list[str]]:
        filtered = _filter_keywords(children)
        event_name = str(filtered[0])
        params: list[str] = []
        actions: list[str] = []

        for child in filtered[1:]:
            if isinstance(child, list) and all(isinstance(item, str) for item in child):
                if not params:
                    params = cast(list[str], child)
                else:
                    actions = cast(list[str], child)
            elif isinstance(child, str):
                actions.append(child)

        return (event_name, params, actions)

    def on_event_def(self, meta: object, children: list[object]) -> OnEventNode:
        filtered = _filter_keywords(children)
        event_name = str(filtered[0])
        params: list[str] = []
        actions: list[str] = []

        for child in filtered[1:]:
            if isinstance(child, list) and all(isinstance(item, str) for item in child):
                if not params:
                    params = cast(list[str], child)
                else:
                    actions = cast(list[str], child)
            elif isinstance(child, str):
                actions.append(child)

        return OnEventNode(span=self._span(meta), event_name=event_name, params=params, actions=actions)

    def action_stmt(self, meta: object, children: list[object]) -> str:
        filtered = _filter_keywords(children)
        name = str(filtered[0])
        args: list[str] = []
        for child in filtered[1:]:
            if isinstance(child, list):
                args = cast(list[str], child)
        if args:
            return f"{name}({', '.join(args)})"
        return f"{name}()"

    def poly_id_list(self, meta: object, children: list[object]) -> list[str]:
        return [str(c) for c in children]

    def periodic_def(self, meta: object, children: list[object]) -> PeriodicNode:
        filtered = _filter_keywords(children)
        name = str(filtered[0])
        every = ""
        actions: list[str] = []

        for child in filtered[1:]:
            if isinstance(child, PolyAttrNode) and child.key == "every":
                every = self._extract_string(child.value)
            elif isinstance(child, str):
                actions.append(child)

        return PeriodicNode(span=self._span(meta), name=name, every=every, actions=actions)

    def periodic_attr(self, meta: object, children: list[object]) -> Any:
        if isinstance(children[0], Token) and children[0].type and children[0].type.startswith("POLY_KW_"):
            key = str(children[0])
            value = cast(PolyAstNode, children[-1])
            return PolyAttrNode(span=self._span(meta), key=key, value=value)
        # action_stmt case
        return children[0]

    def flow_push_def(self, meta: object, children: list[object]) -> FlowPushNode:
        target = ""
        rules_ref = ""
        via: str | None = None

        for child in _filter_keywords(children):
            if isinstance(child, PolyAttrNode):
                if child.key == "target":
                    target = self._extract_string(child.value)
                elif child.key == "rules":
                    rules_ref = self._extract_string(child.value)
                elif child.key == "via":
                    via = self._extract_string(child.value)

        return FlowPushNode(span=self._span(meta), target=target, rules_ref=rules_ref, via=via)

    def flow_push_attr(self, meta: object, children: list[object]) -> Any:
        # Determine the key from the first child (keyword or identifier)
        first = children[0]
        if isinstance(first, Token) and first.type and first.type.startswith("POLY_KW_"):
            key = str(first)
        else:
            key = str(first)

        if key == "target":
            # target: poly_value
            value = children[-1]
            return PolyAttrNode(span=self._span(meta), key="target", value=cast(PolyAstNode, value))
        elif key == "rules":
            # rules: from DOTTED_NAME
            dotted = children[-1]
            return PolyAttrNode(span=self._span(meta), key="rules", value=PolyValueNode(raw=str(dotted), kind="string"))
        elif key == "via":
            # via: DOTTED_NAME
            dotted = children[-1]
            return PolyAttrNode(span=self._span(meta), key="via", value=PolyValueNode(raw=str(dotted), kind="string"))
        return children[0]

    # ------------------------------------------------------------------
    # Data block
    # ------------------------------------------------------------------

    def data_block(self, meta: object, children: list[object]) -> DataBlockNode:
        packets: list[PacketDefNode] = []
        parsers: list[ParseDefNode] = []
        includes: list[str] = []
        modules: list[ModuleDefNode] = []
        services: list[ServiceDefNode] = []

        for child in children:
            if isinstance(child, PacketDefNode):
                packets.append(child)
            elif isinstance(child, ParseDefNode):
                parsers.append(child)
            elif isinstance(child, str):
                includes.append(child)
            elif isinstance(child, ModuleDefNode):
                modules.append(child)
            elif isinstance(child, ServiceDefNode):
                services.append(child)

        return DataBlockNode(
            span=self._span(meta),
            packets=packets,
            parsers=parsers,
            includes=includes,
            modules=modules,
            services=services,
        )

    def data_item(self, meta: object, children: list[object]) -> Any:
        return children[0]

    def packet_def(self, meta: object, children: list[object]) -> PacketDefNode:
        filtered = _filter_keywords(children)
        name = str(filtered[0])
        header_fields: list[HeaderFieldNode] = []
        metadata_fields: list[HeaderFieldNode] = []

        for child in filtered[1:]:
            if isinstance(child, tuple) and len(child) == 2:
                section_name, fields = child
                if section_name == "header":
                    header_fields = cast(list[HeaderFieldNode], fields)
                elif section_name == "metadata":
                    metadata_fields = cast(list[HeaderFieldNode], fields)

        return PacketDefNode(
            span=self._span(meta),
            name=name,
            header_fields=header_fields,
            metadata_fields=metadata_fields,
        )

    def packet_section(self, meta: object, children: list[object]) -> tuple[str, list[HeaderFieldNode]]:
        return cast(tuple[str, list[HeaderFieldNode]], children[0])

    def header_section(self, meta: object, children: list[object]) -> tuple[str, list[HeaderFieldNode]]:
        filtered = _filter_keywords(children)
        return ("header", [cast(HeaderFieldNode, c) for c in filtered])

    def metadata_section(self, meta: object, children: list[object]) -> tuple[str, list[HeaderFieldNode]]:
        filtered = _filter_keywords(children)
        return ("metadata", [cast(HeaderFieldNode, c) for c in filtered])

    def field_def(self, meta: object, children: list[object]) -> HeaderFieldNode:
        name = str(children[0])
        type_ref = str(children[1])
        return HeaderFieldNode(span=self._span(meta), name=name, type_ref=type_ref)

    def parse_def(self, meta: object, children: list[object]) -> ParseDefNode:
        filtered = _filter_keywords(children)
        name = str(filtered[0])
        extracts: list[str] = []
        match_cases: list[ParseMatchCaseNode] = []
        default_action = ""

        for child in filtered[1:]:
            if isinstance(child, str):
                extracts.append(child)
            elif isinstance(child, list):
                for item in child:
                    if isinstance(item, str):
                        extracts.append(item)
                    elif isinstance(item, ParseMatchCaseNode):
                        match_cases.append(item)

        # Extract default_action from match_cases with "_"
        final_cases: list[ParseMatchCaseNode] = []
        for case in match_cases:
            if case.match_value == "_":
                default_action = case.action
            else:
                final_cases.append(case)

        return ParseDefNode(
            span=self._span(meta),
            name=name,
            packet_ref="",
            extracts=extracts,
            match_cases=final_cases,
            default_action=default_action,
        )

    def parse_item(self, meta: object, children: list[object]) -> Any:
        return children[0]

    def extract_clause(self, meta: object, children: list[object]) -> str:
        filtered = _filter_keywords(children)
        return str(filtered[0])

    def match_clause(self, meta: object, children: list[object]) -> list[ParseMatchCaseNode]:
        return [cast(ParseMatchCaseNode, c) for c in children if isinstance(c, ParseMatchCaseNode)]

    def match_value(self, meta: object, children: list[object]) -> str:
        """Return the match value as a string (either from poly_value or wildcard)."""
        child = children[0]
        if isinstance(child, str):
            return child
        if isinstance(child, PolyValueNode):
            return str(child.raw)
        return str(child)

    def match_case(self, meta: object, children: list[object]) -> ParseMatchCaseNode:
        # children: [str(match_value), str(action)]
        match_value = str(children[0])
        action = str(children[1])
        return ParseMatchCaseNode(span=self._span(meta), match_value=match_value, action=action)

    def match_extract(self, meta: object, children: list[object]) -> str:
        filtered = _filter_keywords(children)
        return "extract " + str(filtered[0])

    def match_drop(self, meta: object, children: list[object]) -> str:
        return "drop"

    def include_def(self, meta: object, children: list[object]) -> str:
        # children: [Token(POLY_KW_INCLUDE), PolyValueNode("path")]
        for child in children:
            if isinstance(child, PolyValueNode):
                return str(child.raw)
        # Fallback
        val = children[-1]
        if isinstance(val, PolyValueNode):
            return str(val.raw)
        return str(val).strip("\"'")

    def module_def(self, meta: object, children: list[object]) -> ModuleDefNode:
        filtered = _filter_keywords(children)
        name = str(filtered[0])
        packet_ref = str(filtered[1])
        when_clause = ""
        action_clause = ""
        constraints: dict[str, PolyAstNode] = {}

        for child in filtered[2:]:
            if isinstance(child, PolyAttrNode):
                if child.key == "when":
                    when_clause = self._extract_string(child.value)
                elif child.key == "action":
                    action_clause = self._extract_string(child.value)
            elif isinstance(child, dict):
                constraints = child

        return ModuleDefNode(
            span=self._span(meta),
            name=name,
            packet_ref=packet_ref,
            when_clause=when_clause,
            action_clause=action_clause,
            constraints=constraints,
        )

    def module_attr(self, meta: object, children: list[object]) -> Any:
        if isinstance(children[0], Token) and children[0].type and children[0].type.startswith("POLY_KW_"):
            key = str(children[0])
            # children[-1] is MODULE_EXPR text (str)
            value = children[-1]
            return PolyAttrNode(span=self._span(meta), key=key, value=PolyValueNode(raw=str(value), kind="string"))
        # module_constraints case (returns dict)
        return children[0]

    def module_constraints(self, meta: object, children: list[object]) -> dict[str, PolyAstNode]:
        result: dict[str, PolyAstNode] = {}
        for child in children:
            if isinstance(child, PolyAttrNode):
                result[child.key] = cast(PolyAstNode, child.value)
        return result

    def module_constraint_attr(self, meta: object, children: list[object]) -> PolyAttrNode:
        return PolyAttrNode(
            span=self._span(meta),
            key=str(children[0]),
            value=cast(PolyAstNode, children[1]),
        )

    def service_def(self, meta: object, children: list[object]) -> ServiceDefNode:
        filtered = _filter_keywords(children)
        name = str(filtered[0])
        applies: list[str] = []
        target_role = ""
        pipeline = ""
        constraints: list[str] = []

        saw_applies = False
        for child in filtered[1:]:
            if isinstance(child, PolyAttrNode):
                if child.key == "target_role":
                    target_role = self._extract_string(child.value)
                elif child.key == "pipeline":
                    pipeline = self._extract_string(child.value)
            elif isinstance(child, PolyListValueNode):
                strs = [self._extract_string(cast(PolyAstNode, i)) for i in child.items]
                if not saw_applies:
                    applies = strs
                    saw_applies = True
                else:
                    constraints = strs

        return ServiceDefNode(
            span=self._span(meta),
            name=name,
            applies=applies,
            target_role=target_role,
            pipeline=pipeline,
            constraints=constraints,
        )

    def service_attr(self, meta: object, children: list[object]) -> Any:
        if isinstance(children[0], Token) and children[0].type and children[0].type.startswith("POLY_KW_"):
            key = str(children[0])
            # For applies/constraints: returns PolyListValueNode; for others: PolyAttrNode
            if isinstance(children[-1], PolyListValueNode):
                return children[-1]
            return PolyAttrNode(span=self._span(meta), key=key, value=cast(PolyAstNode, children[-1]))
        return children[0]

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    def _build_mgmt_from_attrs(
        self, meta: object, children: list[object], *, has_address: bool
    ) -> MgmtChannelNode:
        address: str | None = None
        protocol = "grpc"
        port = 50051
        auth = "none"

        for child in children:
            if isinstance(child, PolyAttrNode):
                if child.key == "address" and has_address:
                    address = self._extract_string(child.value)
                elif child.key == "protocol":
                    protocol = self._extract_string(child.value)
                elif child.key == "port":
                    port = self._extract_int(child.value)
                elif child.key == "auth":
                    auth = self._extract_string(child.value)

        if has_address:
            return MgmtChannelNode(span=self._span(meta), address=address, protocol=protocol, port=port)
        return MgmtChannelNode(span=self._span(meta), protocol=protocol, port=port, auth=auth)

    def _extract_string(self, node: PolyAstNode | None) -> str:
        if node is None:
            return ""
        if isinstance(node, PolyValueNode):
            return str(node.raw)
        return ""

    def _extract_int(self, node: PolyAstNode | None) -> int:
        if node is None:
            return 0
        if isinstance(node, PolyValueNode):
            if isinstance(node.raw, (int, float)):
                return int(node.raw)
            try:
                return int(str(node.raw))
            except (ValueError, TypeError):
                return 0
        return 0

    def _extract_int_from_value(self, node: Any) -> int:
        if isinstance(node, PolyValueNode):
            if isinstance(node.raw, (int, float)):
                return int(node.raw)
            try:
                return int(str(node.raw))
            except (ValueError, TypeError):
                return 0
        if isinstance(node, (int, float)):
            return int(node)
        try:
            return int(str(node))
        except (ValueError, TypeError):
            return 0

    def _extract_value(self, node: PolyAstNode) -> Any:
        if isinstance(node, PolyValueNode):
            return node.raw
        if isinstance(node, PolyListValueNode):
            return [self._extract_value(cast(PolyAstNode, item)) for item in node.items]
        if isinstance(node, PolyObjectValueNode):
            return {pair.key: self._extract_value(cast(PolyAstNode, pair.value)) for pair in node.pairs}
        return str(node)


class PolyParser:
    """Parse Polymorphic DSL source text into PolyProgramNode AST."""

    def __init__(self) -> None:
        grammar_path = Path(__file__).parent / "grammar_polymorphic.lark"
        self._grammar_path = grammar_path
        self._parser = Lark(
            grammar_path.read_text(encoding="utf-8"),
            parser="lalr",
            lexer="contextual",
            start="start",
            propagate_positions=True,
            maybe_placeholders=False,
        )

    def parse_text(self, text: str, file_name: str = "<memory>") -> PolyParseResult:
        diagnostics: list[Diagnostic] = []

        if not text.strip():
            return PolyParseResult(
                ast=PolyProgramNode(protocols=[]),
                diagnostics=diagnostics,
            )

        try:
            tree = self._parser.parse(text)
        except UnexpectedInput as exc:
            diagnostics.append(
                Diagnostic(
                    code="POLY001",
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
            return PolyParseResult(ast=None, diagnostics=diagnostics)
        except Exception as exc:
            diagnostics.append(
                Diagnostic(
                    code="POLY001",
                    message=str(exc).splitlines()[0],
                    severity=DiagnosticSeverity.ERROR,
                    span=SourceSpan(
                        file=file_name,
                        line=1,
                        column=1,
                        end_line=1,
                        end_column=2,
                    ),
                )
            )
            return PolyParseResult(ast=None, diagnostics=diagnostics)

        transformer = _PolyTransformer(Path(file_name))
        result = transformer.transform(tree)
        ast = cast(PolyProgramNode, result)
        return PolyParseResult(ast=ast, diagnostics=diagnostics)

    def parse_file(self, path: Path) -> PolyParseResult:
        text = path.read_text(encoding="utf-8")
        return self.parse_text(text, file_name=str(path))


__all__ = ["PolyParseResult", "PolyParser"]
