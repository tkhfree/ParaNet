# Polymorphic Network Protocol DSL Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a new parallel DSL for designing network protocols, covering topology, control plane (ONOS app generation), and data plane (P4 code generation).

**Architecture:** Lark-based parser produces explicit AST, which feeds into plane-specific IR collectors. Topology IR drives deployment rendering, Control IR generates ONOS Java app source, Data IR partitions modules across devices and emits per-device P4 code. Follows existing compiler patterns (Lark grammar → transformer → AST → semantic collector → IR → backend emitter).

**Tech Stack:** Python 3.10+, Lark parser, dataclasses (AST/IR), Pydantic (optional), Jinja2 (ONOS/P4 code templates)

---

## Scope Note

This plan covers **Phase 1: Grammar, AST, and Parser** — the foundation everything else depends on. Subsequent phases (IR, semantic collection, ONOS emitter, P4 emitter, pipeline integration) will be separate plans after this phase is complete and tested.

## File Structure

```
compiler/
├── frontend/
│   ├── grammar_polymorphic.lark   # New Lark grammar
│   ├── poly_ast.py                # AST node definitions
│   └── poly_parser.py             # Lark parser + transformer
tests/
├── test_poly_ast.py               # AST node tests
├── test_poly_parser.py            # Parser integration tests
dsl/
├── examples/
│   └── poly_deterministic.poly    # Full example file
```

---

### Task 1: Define AST Nodes

**Files:**

- Create: `compiler/frontend/poly_ast.py`
- Test: `tests/test_poly_ast.py`
- **Step 1: Write failing test for AST node creation**

```python
# tests/test_poly_ast.py
"""Tests for Polymorphic DSL AST nodes."""
import pytest
from compiler.frontend.poly_ast import (
    PolyProgramNode,
    PolymorphicDefNode,
    TopologyBlockNode,
    ControlBlockNode,
    DataBlockNode,
    ProfileNode,
    MgmtChannelNode,
    PatternNode,
    LayerNode,
    TopoNodeDefNode,
    LinkDefNode,
    ConstrainNode,
    AppMetaNode,
    StateDeclNode,
    DiscoveryNode,
    ProviderEntryNode,
    OnEventNode,
    PeriodicNode,
    FlowPushNode,
    PacketDefNode,
    HeaderFieldNode,
    ParseDefNode,
    ModuleDefNode,
    ServiceDefNode,
    PolyAttrNode,
    PolyValueNode,
    PolyListValueNode,
    PolyObjectValueNode,
    PolyObjectPairNode,
)
from compiler.ir.common import SourceSpan


class TestPolyAstNodes:
    def test_mgmt_channel_node(self):
        mgmt = MgmtChannelNode(protocol="grpc", port=50051, auth="tls")
        assert mgmt.protocol == "grpc"
        assert mgmt.port == 50051
        assert mgmt.auth == "tls"
        assert mgmt.address is None

    def test_profile_node(self):
        mgmt = MgmtChannelNode(protocol="grpc", port=50051, auth="tls")
        profile = ProfileNode(
            name="SwitchProfile",
            target="bmv2",
            pipeline="v1model",
            compiler="p4c-bmv2",
            mgmt=mgmt,
        )
        assert profile.name == "SwitchProfile"
        assert profile.target == "bmv2"
        assert profile.mgmt.protocol == "grpc"

    def test_layer_node(self):
        layer = LayerNode(name="spine", count=2, profile_ref="SwitchProfile")
        assert layer.name == "spine"
        assert layer.count == 2

    def test_pattern_node(self):
        layer = LayerNode(name="spine", count=2, profile_ref="SwitchProfile")
        pattern = PatternNode(
            name="spine_leaf",
            params={"spines": 2, "leaves": 4},
            layers=[layer],
            connections=[("spine", "leaf", "mesh")],
        )
        assert pattern.name == "spine_leaf"
        assert len(pattern.layers) == 1

    def test_topo_node_def(self):
        mgmt = MgmtChannelNode(address="10.0.0.1", protocol="grpc", port=50052)
        node = TopoNodeDefNode(
            name="h1", role="endpoint", profile_ref="TofinoSwitch", mgmt=mgmt
        )
        assert node.name == "h1"
        assert node.mgmt.address == "10.0.0.1"

    def test_link_def(self):
        link = LinkDefNode(
            src="h1", dst="leaf-1", directed=True,
            attrs={"dedicated": PolyValueNode(raw=True, kind="boolean"),
                   "latency": PolyValueNode(raw="< 1ms", kind="string")},
        )
        assert link.src == "h1"
        assert link.directed is True

    def test_topology_block(self):
        profile = ProfileNode(name="SW", target="bmv2", pipeline="v1model", compiler="p4c-bmv2")
        topo = TopologyBlockNode(
            profiles=[profile],
            patterns=[],
            nodes=[],
            links=[],
            constraints=[],
        )
        assert len(topo.profiles) == 1

    def test_app_meta_node(self):
        app = AppMetaNode(
            name="org.paranet.det-router",
            version="1.0.0",
            description="Deterministic router",
            onos_version=">= 2.7",
            features=["openflow", "gnmic"],
        )
        assert app.name == "org.paranet.det-router"
        assert len(app.features) == 2

    def test_state_decl_node(self):
        state = StateDeclNode(name="routing_table", type_expr="map<addr, next_hop>")
        assert state.name == "routing_table"
        assert state.type_expr == "map<addr, next_hop>"

    def test_control_block(self):
        app = AppMetaNode(name="org.test", version="1.0.0")
        ctrl = ControlBlockNode(
            app=app,
            capabilities=["route_discovery"],
            states=[],
            discovery=None,
            event_handlers=[],
            periodic_tasks=[],
            flow_pushes=[],
        )
        assert ctrl.app.name == "org.test"
        assert ctrl.capabilities == ["route_discovery"]

    def test_packet_def_node(self):
        pkt = PacketDefNode(
            name="DetPacket",
            header_fields=[
                HeaderFieldNode(name="flow_id", type_ref="uint(16)"),
                HeaderFieldNode(name="slot_id", type_ref="uint(8)"),
            ],
            metadata_fields=[],
        )
        assert pkt.name == "DetPacket"
        assert len(pkt.header_fields) == 2

    def test_module_def_node(self):
        mod = ModuleDefNode(
            name="forward",
            packet_ref="DetPacket",
            when_clause="ipv4.dst_addr matches routing_table",
            action_clause="forward(next_hop, with_timing: slot_id)",
            constraints={"guaranteed_delay": PolyValueNode(raw="< 50us", kind="string")},
        )
        assert mod.name == "forward"
        assert mod.packet_ref == "DetPacket"

    def test_service_def_node(self):
        svc = ServiceDefNode(
            name="switching",
            applies=["parse", "forward", "buffer_control"],
            target_role="switch",
            pipeline="match_action",
            constraints=[],
        )
        assert svc.name == "switching"
        assert svc.target_role == "switch"

    def test_data_block(self):
        data = DataBlockNode(
            packets=[],
            parsers=[],
            includes=[],
            modules=[],
            services=[],
        )
        assert len(data.modules) == 0

    def test_polymorphic_def_node(self):
        topo = TopologyBlockNode(profiles=[], patterns=[], nodes=[], links=[], constraints=[])
        ctrl = ControlBlockNode(
            app=AppMetaNode(name="org.test", version="1.0.0"),
            capabilities=[], states=[], discovery=None,
            event_handlers=[], periodic_tasks=[], flow_pushes=[],
        )
        data = DataBlockNode(packets=[], parsers=[], includes=[], modules=[], services=[])
        poly = PolymorphicDefNode(
            name="DeterministicRouter",
            extends="BaseRouter",
            mixins=["ZeroTrust"],
            topology=topo,
            control=ctrl,
            data=data,
        )
        assert poly.name == "DeterministicRouter"
        assert poly.extends == "BaseRouter"
        assert poly.mixins == ["ZeroTrust"]

    def test_poly_program_node(self):
        program = PolyProgramNode(protocols=[])
        assert len(program.protocols) == 0

    def test_to_dict_serialization(self):
        mgmt = MgmtChannelNode(protocol="grpc", port=50051, auth="tls")
        d = mgmt.to_dict()
        assert d["protocol"] == "grpc"
        assert d["port"] == 50051
```

- **Step 2: Run test to verify it fails**

Run: `pytest tests/test_poly_ast.py -v`
Expected: FAIL — module `compiler.frontend.poly_ast` does not exist

- **Step 3: Write AST node definitions**

```python
# compiler/frontend/poly_ast.py
"""AST nodes for the Polymorphic Network Protocol DSL."""
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


# ---------------------------------------------------------------------------
# Value nodes (shared across all three planes)
# ---------------------------------------------------------------------------

@dataclass(slots=True)
class PolyAstNode:
    span: SourceSpan | None = None

    def to_dict(self) -> dict[str, Any]:
        payload = _serialize(self)
        payload["node_type"] = self.__class__.__name__
        return payload


@dataclass(slots=True)
class PolyValueNode(PolyAstNode):
    raw: Any = ""
    kind: str = "string"  # "string" | "number" | "boolean"


@dataclass(slots=True)
class PolyListValueNode(PolyAstNode):
    items: list[PolyAstNode] = field(default_factory=list)


@dataclass(slots=True)
class PolyObjectPairNode(PolyAstNode):
    key: str = ""
    value: PolyAstNode | None = None


@dataclass(slots=True)
class PolyObjectValueNode(PolyAstNode):
    pairs: list[PolyObjectPairNode] = field(default_factory=list)


@dataclass(slots=True)
class PolyAttrNode(PolyAstNode):
    key: str = ""
    value: PolyAstNode | None = None


# ---------------------------------------------------------------------------
# Topology plane nodes
# ---------------------------------------------------------------------------

@dataclass(slots=True)
class MgmtChannelNode(PolyAstNode):
    address: str | None = None
    protocol: str = "grpc"
    port: int = 50051
    auth: str = "none"


@dataclass(slots=True)
class ProfileNode(PolyAstNode):
    name: str = ""
    target: str = ""
    pipeline: str = ""
    compiler: str = ""
    mgmt: MgmtChannelNode | None = None


@dataclass(slots=True)
class LayerNode(PolyAstNode):
    name: str = ""
    count: int = 1
    profile_ref: str = ""


@dataclass(slots=True)
class PatternNode(PolyAstNode):
    name: str = ""
    params: dict[str, Any] = field(default_factory=dict)
    layers: list[LayerNode] = field(default_factory=list)
    connections: list[tuple[str, str, str]] = field(default_factory=list)


@dataclass(slots=True)
class TopoNodeDefNode(PolyAstNode):
    name: str = ""
    role: str = ""
    profile_ref: str = ""
    mgmt: MgmtChannelNode | None = None


@dataclass(slots=True)
class LinkDefNode(PolyAstNode):
    src: str = ""
    dst: str = ""
    directed: bool = True
    attrs: dict[str, PolyAstNode] = field(default_factory=dict)


@dataclass(slots=True)
class ConstrainNode(PolyAstNode):
    scope: str = ""
    expression: str = ""


@dataclass(slots=True)
class TopologyBlockNode(PolyAstNode):
    profiles: list[ProfileNode] = field(default_factory=list)
    patterns: list[PatternNode] = field(default_factory=list)
    nodes: list[TopoNodeDefNode] = field(default_factory=list)
    links: list[LinkDefNode] = field(default_factory=list)
    constraints: list[ConstrainNode] = field(default_factory=list)


# ---------------------------------------------------------------------------
# Control plane nodes
# ---------------------------------------------------------------------------

@dataclass(slots=True)
class AppMetaNode(PolyAstNode):
    name: str = ""
    version: str = "1.0.0"
    description: str = ""
    onos_version: str = ""
    features: list[str] = field(default_factory=list)


@dataclass(slots=True)
class StateDeclNode(PolyAstNode):
    name: str = ""
    type_expr: str = ""


@dataclass(slots=True)
class ProviderEntryNode(PolyAstNode):
    name: str = ""
    config: dict[str, PolyAstNode] = field(default_factory=dict)


@dataclass(slots=True)
class DiscoveryNode(PolyAstNode):
    providers: list[ProviderEntryNode] = field(default_factory=list)
    on_connected: PolyAstNode | None = None
    on_disconnected: PolyAstNode | None = None


@dataclass(slots=True)
class OnEventNode(PolyAstNode):
    event_name: str = ""
    params: list[str] = field(default_factory=list)
    actions: list[str] = field(default_factory=list)


@dataclass(slots=True)
class PeriodicNode(PolyAstNode):
    name: str = ""
    every: str = ""
    actions: list[str] = field(default_factory=list)


@dataclass(slots=True)
class FlowPushNode(PolyAstNode):
    target: str = ""
    rules_ref: str = ""
    via: str = ""


@dataclass(slots=True)
class ControlBlockNode(PolyAstNode):
    app: AppMetaNode | None = None
    capabilities: list[str] = field(default_factory=list)
    states: list[StateDeclNode] = field(default_factory=list)
    discovery: DiscoveryNode | None = None
    event_handlers: list[OnEventNode] = field(default_factory=list)
    periodic_tasks: list[PeriodicNode] = field(default_factory=list)
    flow_pushes: list[FlowPushNode] = field(default_factory=list)


# ---------------------------------------------------------------------------
# Data plane nodes
# ---------------------------------------------------------------------------

@dataclass(slots=True)
class HeaderFieldNode(PolyAstNode):
    name: str = ""
    type_ref: str = ""


@dataclass(slots=True)
class PacketDefNode(PolyAstNode):
    name: str = ""
    header_fields: list[HeaderFieldNode] = field(default_factory=list)
    metadata_fields: list[HeaderFieldNode] = field(default_factory=list)


@dataclass(slots=True)
class ParseMatchCaseNode(PolyAstNode):
    match_value: str = ""
    action: str = ""


@dataclass(slots=True)
class ParseDefNode(PolyAstNode):
    name: str = ""
    packet_ref: str = ""
    extracts: list[str] = field(default_factory=list)
    match_cases: list[ParseMatchCaseNode] = field(default_factory=list)
    default_action: str = ""


@dataclass(slots=True)
class ModuleDefNode(PolyAstNode):
    name: str = ""
    packet_ref: str = ""
    when_clause: str = ""
    action_clause: str = ""
    constraints: dict[str, PolyAstNode] = field(default_factory=dict)


@dataclass(slots=True)
class ServiceDefNode(PolyAstNode):
    name: str = ""
    applies: list[str] = field(default_factory=list)
    target_role: str = ""
    pipeline: str = "match_action"
    constraints: list[str] = field(default_factory=list)


@dataclass(slots=True)
class DataBlockNode(PolyAstNode):
    packets: list[PacketDefNode] = field(default_factory=list)
    parsers: list[ParseDefNode] = field(default_factory=list)
    includes: list[str] = field(default_factory=list)
    modules: list[ModuleDefNode] = field(default_factory=list)
    services: list[ServiceDefNode] = field(default_factory=list)


# ---------------------------------------------------------------------------
# Top-level protocol node
# ---------------------------------------------------------------------------

@dataclass(slots=True)
class PolymorphicDefNode(PolyAstNode):
    name: str = ""
    extends: str | None = None
    mixins: list[str] = field(default_factory=list)
    topology: TopologyBlockNode | None = None
    control: ControlBlockNode | None = None
    data: DataBlockNode | None = None


@dataclass(slots=True)
class PolyProgramNode(PolyAstNode):
    protocols: list[PolymorphicDefNode] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return _serialize(self)
```

- **Step 4: Run tests to verify they pass**

Run: `pytest tests/test_poly_ast.py -v`
Expected: All 16 tests PASS

- **Step 5: Commit**

```bash
git add compiler/frontend/poly_ast.py tests/test_poly_ast.py
git commit -m "feat(poly-dsl): add AST node definitions for polymorphic protocol DSL"
```

---

### Task 2: Define Lark Grammar

**Files:**

- Create: `compiler/frontend/grammar_polymorphic.lark`
- Test: `tests/test_poly_parser.py` (first tests: grammar loads and parses minimal input)
- **Step 1: Write failing test for minimal parse**

```python
# tests/test_poly_parser.py
"""Tests for Polymorphic DSL parser."""
import pytest
from compiler.frontend.poly_parser import PolyParser, PolyParseResult


class TestPolyParserMinimal:
    def test_parse_empty_protocol(self):
        text = """polymorphic Empty {}"""
        parser = PolyParser()
        result = parser.parse_text(text)
        assert result.ast is not None
        assert len(result.ast.protocols) == 1
        assert result.ast.protocols[0].name == "Empty"

    def test_parse_protocol_with_extends(self):
        text = """polymorphic Child extends Parent {}"""
        parser = PolyParser()
        result = parser.parse_text(text)
        assert result.ast is not None
        proto = result.ast.protocols[0]
        assert proto.name == "Child"
        assert proto.extends == "Parent"

    def test_parse_protocol_with_mixins(self):
        text = """polymorphic Combo extends Base with MixinA, MixinB {}"""
        parser = PolyParser()
        result = parser.parse_text(text)
        assert result.ast is not None
        proto = result.ast.protocols[0]
        assert proto.extends == "Base"
        assert proto.mixins == ["MixinA", "MixinB"]

    def test_parse_multiple_protocols(self):
        text = """
        polymorphic A {}
        polymorphic B extends A {}
        """
        parser = PolyParser()
        result = parser.parse_text(text)
        assert result.ast is not None
        assert len(result.ast.protocols) == 2
```

- **Step 2: Run test to verify it fails**

Run: `pytest tests/test_poly_parser.py::TestPolyParserMinimal -v`
Expected: FAIL — module `compiler.frontend.poly_parser` does not exist

- **Step 3: Write the Lark grammar**

```lark
// compiler/frontend/grammar_polymorphic.lark
// Polymorphic Network Protocol DSL Grammar

start: polymorphic_def*

polymorphic_def: "polymorphic" POLY_NAME ("extends" POLY_NAME)? ("with" mixin_list)? "{" block* "}"

mixin_list: POLY_NAME ("," POLY_NAME)*

block: topology_block
     | control_block
     | data_block

// ── Topology Plane ──────────────────────────────────────────────

topology_block: "topology" "{" topology_item* "}"

topology_item: profile_def
             | pattern_def
             | topo_node_def
             | link_def
             | constrain_def

profile_def: "profile" POLY_NAME "{" profile_body "}"
profile_body: profile_attr*
profile_attr: "target" ":" poly_value
            | "pipeline" ":" poly_value
            | "compiler" ":" poly_value
            | "mgmt" "{" mgmt_body "}"

mgmt_body: mgmt_attr*
mgmt_attr: "address" ":" poly_value
         | "protocol" ":" poly_value
         | "port" ":" poly_value
         | "auth" ":" poly_value

pattern_def: "pattern" POLY_NAME "(" pattern_params? ")" "{" pattern_body "}"
pattern_params: pattern_param ("," pattern_param)*
pattern_param: POLY_NAME ":" poly_value
pattern_body: pattern_item*
pattern_item: "layer" POLY_NAME "(" poly_value ")" "{" "profile" ":" poly_value "}"
            | "mesh" "(" POLY_NAME "," POLY_NAME ")"

topo_node_def: "node" POLY_NAME "{" node_body "}"
node_body: node_attr*
node_attr: "role" ":" poly_value
         | "profile" ":" poly_value
         | "mgmt" "{" mgmt_body "}"

link_def: "link" link_end ("->" | "--") link_end "{" link_body "}"
link_end: POLY_NAME
link_body: link_attr*
link_attr: POLY_NAME ":" poly_value

constrain_def: "constrain" POLY_NAME ":" poly_value

// ── Control Plane ───────────────────────────────────────────────

control_block: "control" "{" control_item* "}"

control_item: app_def
            | capabilities_def
            | state_def
            | discovery_def
            | on_event_def
            | periodic_def
            | flow_push_def

app_def: "app" "{" app_body "}"
app_body: app_attr*
app_attr: "name" ":" poly_value
        | "version" ":" poly_value
        | "description" ":" poly_value
        | "onos_version" ":" poly_value
        | "features" ":" poly_list

capabilities_def: "capabilities" ":" poly_list

state_def: "state" POLY_NAME ":" type_expr ";"
type_expr: POLY_NAME ("<" type_expr ("," type_expr)* ">")?
         | POLY_NAME

discovery_def: "discovery" "{" discovery_body "}"
discovery_body: discovery_item*
discovery_item: "providers" ":" "{" provider_list "}"
              | "on" POLY_NAME "(" event_params? ")" "{" action_list "}"

provider_list: provider_entry ("," provider_entry)*
provider_entry: POLY_NAME ":" "{" provider_attr* "}"
provider_attr: POLY_NAME ":" poly_value

event_params: POLY_NAME ("," POLY_NAME)*
action_list: action_stmt*
action_stmt: POLY_NAME action_args? ";"

action_args: "(" action_arg ("," action_arg)* ")"
action_arg: POLY_NAME (":" poly_value)?

on_event_def: "on" POLY_NAME "(" event_params? ")" "{" action_list "}"

periodic_def: "periodic" POLY_NAME "{" periodic_body "}"
periodic_body: periodic_item*
periodic_item: "every" ":" poly_value
             | action_stmt

flow_push_def: "flow_push" "{" flow_push_body "}"
flow_push_body: flow_push_attr*
flow_push_attr: "target" ":" poly_value
              | "rules" ":" "from" dotted_name
              | "via" ":" dotted_name

dotted_name: POLY_NAME ("." POLY_NAME)*

// ── Data Plane ──────────────────────────────────────────────────

data_block: "data" "{" data_item* "}"

data_item: packet_def
         | parse_def
         | include_stmt
         | module_def
         | service_def

packet_def: "packet" POLY_NAME "{" packet_body "}"
packet_body: packet_section*
packet_section: "header" "{" field_list "}"
              | "metadata" "{" field_list "}"
field_list: field_def (";" field_def)* ";"?
field_def: POLY_NAME ":" type_expr
         | POLY_NAME ":" "custom" "{" field_list "}"

parse_def: "parse" POLY_NAME "{" parse_body "}"
parse_body: parse_item*
parse_item: "extract" POLY_NAME
          | "match" dotted_name "{" match_cases "}"

match_cases: match_case*
match_case: poly_value "=>" parse_action
          | "_" "=>" parse_action
parse_action: "extract" POLY_NAME
            | "drop"

include_stmt: "include" STRING

module_def: "module" POLY_NAME "(" POLY_NAME ")" "{" module_body "}"
module_body: module_item*
module_item: "when" ":" action_expr
           | "action" ":" action_expr
           | "constraints" "{" constraint_list "}"

action_expr: /[^}]+/

constraint_list: constraint_item (";" constraint_item)* ";"?
constraint_item: POLY_NAME ":" poly_value

service_def: "service" POLY_NAME "{" service_body "}"
service_body: service_item*
service_item: "applies" ":" poly_list
            | "target_role" ":" poly_value
            | "pipeline" ":" poly_value
            | "constrain" constraint_item

// ── Shared value types ──────────────────────────────────────────

poly_value: STRING
          | POLY_NUMBER
          | POLY_BOOLEAN
          | poly_list
          | poly_object

poly_list: "[" (poly_value ("," poly_value)*)? "]"

poly_object: "{" (poly_object_pair ("," poly_object_pair)*)? "}"
poly_object_pair: POLY_NAME ":" poly_value

// ── Tokens ──────────────────────────────────────────────────────

POLY_NAME: /[A-Za-z_][A-Za-z0-9_-]*/
POLY_NUMBER: /[-+]?[0-9]*\.?[0-9]+/
POLY_BOOLEAN: "true" | "false"
STRING: /"[^"]*"/ | /'[^']*'/

%import common.WS
%ignore WS
%ignore /\/\/[^\n]*/
%ignore /\/\*[\s\S]*?\*\//
```

- **Step 4: Write the parser (minimal — just load grammar + parse minimal cases)**

```python
# compiler/frontend/poly_parser.py
"""Lark-based parser for the Polymorphic Network Protocol DSL."""
from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import cast

from lark import Lark, Token, Transformer, Tree, UnexpectedInput, v_args

from compiler.ir.common import Diagnostic, DiagnosticSeverity, SourceSpan
from compiler.frontend.poly_ast import (
    PolyProgramNode,
    PolymorphicDefNode,
)


@dataclass(slots=True)
class PolyParseResult:
    ast: PolyProgramNode | None
    diagnostics: list[Diagnostic] = field(default_factory=list)


@v_args(meta=True)
class _PolyTransformer(Transformer[object, object]):
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

    def start(self, meta: object, children: list[object]) -> PolyProgramNode:
        protocols = [cast(PolymorphicDefNode, child) for child in children]
        return PolyProgramNode(span=self._span(meta), protocols=protocols)

    def polymorphic_def(self, meta: object, children: list[object]) -> PolymorphicDefNode:
        name = str(children[0])
        extends: str | None = None
        mixins: list[str] = []

        for child in children[1:]:
            if isinstance(child, str) and extends is None:
                extends = child
            elif isinstance(child, list):
                mixins = child

        return PolymorphicDefNode(
            span=self._span(meta),
            name=name,
            extends=extends,
            mixins=mixins,
        )

    def mixin_list(self, meta: object, children: list[object]) -> list[str]:
        return [str(child) for child in children]


class PolyParser:
    """Parse Polymorphic DSL text into an explicit AST."""

    def __init__(self):
        grammar_path = Path(__file__).parent / "grammar_polymorphic.lark"
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

        transformer = _PolyTransformer(Path(file_name))
        result = transformer.transform(tree)
        return PolyParseResult(ast=cast(PolyProgramNode, result), diagnostics=diagnostics)

    def parse_file(self, path: Path) -> PolyParseResult:
        text = path.read_text(encoding="utf-8")
        return self.parse_text(text, file_name=str(path))


__all__ = ["PolyParser", "PolyParseResult"]
```

- **Step 5: Run tests to verify they pass**

Run: `pytest tests/test_poly_parser.py::TestPolyParserMinimal -v`
Expected: All 4 tests PASS

- **Step 6: Commit**

```bash
git add compiler/frontend/grammar_polymorphic.lark compiler/frontend/poly_parser.py tests/test_poly_parser.py
git commit -m "feat(poly-dsl): add Lark grammar and minimal parser for polymorphic DSL"
```

---

### Task 3: Extend Parser Transformer — Topology Block

**Files:**

- Modify: `compiler/frontend/poly_parser.py`
- Modify: `tests/test_poly_parser.py`
- **Step 1: Write failing test for topology block parsing**

Add to `tests/test_poly_parser.py`:

```python
class TestPolyParserTopology:
    def test_parse_profile_with_mgmt(self):
        text = """
        polymorphic Test {
            topology {
                profile SwitchProfile {
                    target: "bmv2"
                    pipeline: "v1model"
                    compiler: "p4c-bmv2"
                    mgmt {
                        protocol: "grpc"
                        port: 50051
                        auth: "tls"
                    }
                }
            }
        }
        """
        parser = PolyParser()
        result = parser.parse_text(text)
        assert result.ast is not None
        proto = result.ast.protocols[0]
        assert proto.topology is not None
        assert len(proto.topology.profiles) == 1
        profile = proto.topology.profiles[0]
        assert profile.name == "SwitchProfile"
        assert profile.target == "bmv2"
        assert profile.mgmt is not None
        assert profile.mgmt.protocol == "grpc"
        assert profile.mgmt.port == 50051

    def test_parse_node_with_mgmt(self):
        text = """
        polymorphic Test {
            topology {
                profile SW { target: "bmv2" pipeline: "v1model" compiler: "p4c-bmv2" }
                node h1 {
                    role: "endpoint"
                    profile: "SW"
                    mgmt { address: "10.0.0.1" protocol: "grpc" port: 50052 }
                }
            }
        }
        """
        parser = PolyParser()
        result = parser.parse_text(text)
        assert result.ast is not None
        node = result.ast.protocols[0].topology.nodes[0]
        assert node.name == "h1"
        assert node.role == "endpoint"
        assert node.mgmt.address == "10.0.0.1"

    def test_parse_link(self):
        text = """
        polymorphic Test {
            topology {
                profile SW { target: "bmv2" pipeline: "v1model" compiler: "p4c-bmv2" }
                node h1 { role: "endpoint" profile: "SW" }
                node h2 { role: "endpoint" profile: "SW" }
                link h1 -> h2 { dedicated: true latency: "< 1ms" }
            }
        }
        """
        parser = PolyParser()
        result = parser.parse_text(text)
        assert result.ast is not None
        link = result.ast.protocols[0].topology.links[0]
        assert link.src == "h1"
        assert link.dst == "h2"
        assert link.directed is True

    def test_parse_constrain(self):
        text = """
        polymorphic Test {
            topology {
                constrain all_links: "bandwidth >= 1Gbps"
            }
        }
        """
        parser = PolyParser()
        result = parser.parse_text(text)
        assert result.ast is not None
        c = result.ast.protocols[0].topology.constraints[0]
        assert c.scope == "all_links"
```

- **Step 2: Run test to verify it fails**

Run: `pytest tests/test_poly_parser.py::TestPolyParserTopology -v`
Expected: FAIL — transformer methods for topology not yet implemented

- **Step 3: Add topology transformer methods to `poly_parser.py`**

Add these imports at the top of `poly_parser.py`:

```python
from compiler.frontend.poly_ast import (
    PolyProgramNode,
    PolymorphicDefNode,
    TopologyBlockNode,
    ProfileNode,
    MgmtChannelNode,
    LayerNode,
    PatternNode,
    TopoNodeDefNode,
    LinkDefNode,
    ConstrainNode,
    PolyValueNode,
    PolyListValueNode,
    PolyObjectValueNode,
    PolyObjectPairNode,
    PolyAttrNode,
)
```

Add these methods to `_PolyTransformer`:

```python
    # ── Topology ────────────────────────────────────────

    def topology_block(self, meta, children):
        return TopologyBlockNode(
            span=self._span(meta),
            profiles=[c for c in children if isinstance(c, ProfileNode)],
            patterns=[c for c in children if isinstance(c, PatternNode)],
            nodes=[c for c in children if isinstance(c, TopoNodeDefNode)],
            links=[c for c in children if isinstance(c, LinkDefNode)],
            constraints=[c for c in children if isinstance(c, ConstrainNode)],
        )

    def profile_def(self, meta, children):
        name = str(children[0])
        mgmt = None
        attrs = {}
        for c in children[1:]:
            if isinstance(c, MgmtChannelNode):
                mgmt = c
            elif isinstance(c, PolyAttrNode):
                attrs[c.key] = c.value
        return ProfileNode(
            span=self._span(meta), name=name,
            target=attrs.get("target", ""),
            pipeline=attrs.get("pipeline", ""),
            compiler=attrs.get("compiler", ""),
            mgmt=mgmt,
        )

    def profile_body(self, meta, children):
        return list(children)

    def profile_attr(self, meta, children):
        if isinstance(children[0], MgmtChannelNode):
            return children[0]
        key = str(children[0])
        value = children[1] if len(children) > 1 else PolyValueNode()
        if isinstance(value, PolyValueNode):
            value.key_name = key
        return PolyAttrNode(span=self._span(meta), key=key, value=value)

    def mgmt_body(self, meta, children):
        attrs = {}
        for c in children:
            if isinstance(c, PolyAttrNode):
                attrs[c.key] = c.value
        return MgmtChannelNode(
            span=self._span(meta),
            address=attrs.get("address", PolyValueNode()).raw if "address" in attrs else None,
            protocol=attrs.get("protocol", PolyValueNode(raw="grpc")).raw if "protocol" in attrs else "grpc",
            port=int(attrs.get("port", PolyValueNode(raw=50051)).raw) if "port" in attrs else 50051,
            auth=attrs.get("auth", PolyValueNode(raw="none")).raw if "auth" in attrs else "none",
        )

    def mgmt_attr(self, meta, children):
        key = str(children[0])
        value = children[1] if len(children) > 1 else PolyValueNode()
        return PolyAttrNode(span=self._span(meta), key=key, value=value)

    def topo_node_def(self, meta, children):
        name = str(children[0])
        role = ""
        profile_ref = ""
        mgmt = None
        for c in children[1:]:
            if isinstance(c, PolyAttrNode):
                if c.key == "role":
                    role = c.value.raw if isinstance(c.value, PolyValueNode) else str(c.value)
                elif c.key == "profile":
                    profile_ref = c.value.raw if isinstance(c.value, PolyValueNode) else str(c.value)
            elif isinstance(c, MgmtChannelNode):
                mgmt = c
        return TopoNodeDefNode(
            span=self._span(meta), name=name,
            role=role, profile_ref=profile_ref, mgmt=mgmt,
        )

    def node_body(self, meta, children):
        return list(children)

    def node_attr(self, meta, children):
        if isinstance(children[0], MgmtChannelNode):
            return children[0]
        key = str(children[0])
        value = children[1] if len(children) > 1 else PolyValueNode()
        return PolyAttrNode(span=self._span(meta), key=key, value=value)

    def link_def(self, meta, children):
        # children: src, ("->" or "--"), dst, attrs
        src = str(children[0])
        directed = True
        dst = ""
        attrs = {}
        for c in children[1:]:
            if isinstance(c, str) and c in ("->", "--"):
                directed = (c == "->")
            elif isinstance(c, str):
                dst = c
            elif isinstance(c, PolyAttrNode):
                attrs[c.key] = c.value
        return LinkDefNode(
            span=self._span(meta), src=src, dst=dst,
            directed=directed, attrs=attrs,
        )

    def link_body(self, meta, children):
        return list(children)

    def link_attr(self, meta, children):
        key = str(children[0])
        value = children[1] if len(children) > 1 else PolyValueNode()
        return PolyAttrNode(span=self._span(meta), key=key, value=value)

    def constrain_def(self, meta, children):
        scope = str(children[0])
        expr = ""
        if len(children) > 1 and isinstance(children[1], PolyValueNode):
            expr = str(children[1].raw)
        return ConstrainNode(span=self._span(meta), scope=scope, expression=expr)

    # ── Value handling ──────────────────────────────────

    def poly_value(self, meta, children):
        return children[0]

    def STRING(self, token):
        raw = str(token).strip('"\'')
        return PolyValueNode(span=SourceSpan(file="", line=0, column=0, end_line=0, end_column=0), raw=raw, kind="string")

    def POLY_NUMBER(self, token):
        raw_text = str(token)
        try:
            raw = int(raw_text) if "." not in raw_text else float(raw_text)
        except ValueError:
            raw = 0
        return PolyValueNode(span=SourceSpan(file="", line=0, column=0, end_line=0, end_column=0), raw=raw, kind="number")

    def POLY_BOOLEAN(self, token):
        raw = str(token).lower() == "true"
        return PolyValueNode(span=SourceSpan(file="", line=0, column=0, end_line=0, end_column=0), raw=raw, kind="boolean")

    def poly_list(self, meta, children):
        return PolyListValueNode(
            span=self._span(meta),
            items=list(children),
        )

    def poly_object(self, meta, children):
        return PolyObjectValueNode(
            span=self._span(meta),
            pairs=[c for c in children if isinstance(c, PolyObjectPairNode)],
        )

    def poly_object_pair(self, meta, children):
        return PolyObjectPairNode(
            span=self._span(meta),
            key=str(children[0]),
            value=children[1] if len(children) > 1 else None,
        )
```

Also update the `polymorphic_def` method to handle block children:

```python
    def polymorphic_def(self, meta, children):
        name = str(children[0])
        extends = None
        mixins = []
        topology = None
        control = None
        data = None

        for child in children[1:]:
            if isinstance(child, str) and extends is None and not child.startswith("["):
                extends = child
            elif isinstance(child, list):
                mixins = child
            elif isinstance(child, TopologyBlockNode):
                topology = child
            elif isinstance(child, ControlBlockNode):
                control = child
            elif isinstance(child, DataBlockNode):
                data = child

        return PolymorphicDefNode(
            span=self._span(meta),
            name=name, extends=extends, mixins=mixins,
            topology=topology, control=control, data=data,
        )

    def block(self, meta, children):
        return children[0] if children else None
```

Add missing imports:

```python
from compiler.frontend.poly_ast import (
    ControlBlockNode,
    DataBlockNode,
)
```

- **Step 4: Run tests to verify they pass**

Run: `pytest tests/test_poly_parser.py::TestPolyParserTopology -v`
Expected: All 4 tests PASS

- **Step 5: Commit**

```bash
git add compiler/frontend/poly_parser.py tests/test_poly_parser.py
git commit -m "feat(poly-dsl): add topology block parsing with profile, node, link, constrain"
```

---

### Task 4: Extend Parser Transformer — Control Block

**Files:**

- Modify: `compiler/frontend/poly_parser.py`
- Modify: `tests/test_poly_parser.py`
- **Step 1: Write failing tests for control block parsing**

Add to `tests/test_poly_parser.py`:

```python
class TestPolyParserControl:
    def test_parse_control_app(self):
        text = """
        polymorphic Test {
            control {
                app {
                    name: "org.paranet.test"
                    version: "1.0.0"
                    description: "Test app"
                    onos_version: ">= 2.7"
                    features: ["openflow", "gnmic"]
                }
            }
        }
        """
        parser = PolyParser()
        result = parser.parse_text(text)
        assert result.ast is not None
        ctrl = result.ast.protocols[0].control
        assert ctrl is not None
        assert ctrl.app.name == "org.paranet.test"
        assert ctrl.app.version == "1.0.0"
        assert len(ctrl.app.features) == 2

    def test_parse_control_capabilities(self):
        text = """
        polymorphic Test {
            control {
                capabilities: ["route_discovery", "schedule_calculation"]
            }
        }
        """
        parser = PolyParser()
        result = parser.parse_text(text)
        assert result.ast is not None
        ctrl = result.ast.protocols[0].control
        assert ctrl.capabilities == ["route_discovery", "schedule_calculation"]

    def test_parse_control_state(self):
        text = """
        polymorphic Test {
            control {
                state routing_table: "map<addr, next_hop>";
            }
        }
        """
        parser = PolyParser()
        result = parser.parse_text(text)
        assert result.ast is not None
        state = result.ast.protocols[0].control.states[0]
        assert state.name == "routing_table"
```

- **Step 2: Run test to verify it fails**

Run: `pytest tests/test_poly_parser.py::TestPolyParserControl -v`
Expected: FAIL

- **Step 3: Add control block transformer methods**

Add to `_PolyTransformer`:

```python
    # ── Control ─────────────────────────────────────────

    def control_block(self, meta, children):
        app = None
        capabilities = []
        states = []
        discovery = None
        event_handlers = []
        periodic_tasks = []
        flow_pushes = []
        for c in children:
            if isinstance(c, AppMetaNode):
                app = c
            elif isinstance(c, list) and all(isinstance(x, str) for x in c):
                capabilities = c
            elif isinstance(c, StateDeclNode):
                states.append(c)
            elif isinstance(c, DiscoveryNode):
                discovery = c
            elif isinstance(c, OnEventNode):
                event_handlers.append(c)
            elif isinstance(c, PeriodicNode):
                periodic_tasks.append(c)
            elif isinstance(c, FlowPushNode):
                flow_pushes.append(c)
        return ControlBlockNode(
            span=self._span(meta), app=app, capabilities=capabilities,
            states=states, discovery=discovery,
            event_handlers=event_handlers, periodic_tasks=periodic_tasks,
            flow_pushes=flow_pushes,
        )

    def app_def(self, meta, children):
        attrs = {}
        for c in children:
            if isinstance(c, PolyAttrNode):
                if c.key == "features" and isinstance(c.value, PolyListValueNode):
                    attrs["features"] = [str(item.raw) for item in c.value.items]
                elif isinstance(c.value, PolyValueNode):
                    attrs[c.key] = c.value.raw
        return AppMetaNode(
            span=self._span(meta),
            name=attrs.get("name", ""),
            version=attrs.get("version", "1.0.0"),
            description=attrs.get("description", ""),
            onos_version=attrs.get("onos_version", ""),
            features=attrs.get("features", []),
        )

    def app_body(self, meta, children):
        return list(children)

    def app_attr(self, meta, children):
        key = str(children[0])
        value = children[1] if len(children) > 1 else PolyValueNode()
        return PolyAttrNode(span=self._span(meta), key=key, value=value)

    def capabilities_def(self, meta, children):
        if children and isinstance(children[0], PolyListValueNode):
            return [str(item.raw) for item in children[0].items]
        return []

    def state_def(self, meta, children):
        name = str(children[0])
        type_expr = ""
        for c in children[1:]:
            if isinstance(c, PolyValueNode):
                type_expr = str(c.raw)
            elif isinstance(c, str):
                type_expr = c
        return StateDeclNode(span=self._span(meta), name=name, type_expr=type_expr)

    def type_expr(self, meta, children):
        return "".join(str(c) for c in children)

    def on_event_def(self, meta, children):
        event_name = str(children[0])
        params = []
        actions = []
        for c in children[1:]:
            if isinstance(c, list) and all(isinstance(x, str) for x in c):
                if not params:
                    params = c
                else:
                    actions = c
            elif isinstance(c, str):
                actions.append(c)
        return OnEventNode(
            span=self._span(meta),
            event_name=event_name, params=params, actions=actions,
        )

    def event_params(self, meta, children):
        return [str(c) for c in children]

    def action_list(self, meta, children):
        return list(children)

    def action_stmt(self, meta, children):
        return str(children[0])

    def periodic_def(self, meta, children):
        name = str(children[0])
        every = ""
        actions = []
        for c in children[1:]:
            if isinstance(c, PolyAttrNode) and c.key == "every":
                every = str(c.value.raw) if isinstance(c.value, PolyValueNode) else ""
            elif isinstance(c, str):
                actions.append(c)
        return PeriodicNode(span=self._span(meta), name=name, every=every, actions=actions)

    def periodic_body(self, meta, children):
        return list(children)

    def periodic_item(self, meta, children):
        return children[0]

    def flow_push_def(self, meta, children):
        attrs = {}
        for c in children:
            if isinstance(c, PolyAttrNode):
                attrs[c.key] = c.value
        return FlowPushNode(
            span=self._span(meta),
            target=attrs.get("target", PolyValueNode()).raw if "target" in attrs else "",
            rules_ref=attrs.get("rules", PolyValueNode()).raw if "rules" in attrs else "",
            via=attrs.get("via", PolyValueNode()).raw if "via" in attrs else "",
        )

    def flow_push_body(self, meta, children):
        return list(children)

    def flow_push_attr(self, meta, children):
        key = str(children[0])
        value = children[1] if len(children) > 1 else PolyValueNode()
        return PolyAttrNode(span=self._span(meta), key=key, value=value)

    def dotted_name(self, meta, children):
        return ".".join(str(c) for c in children)
```

Add missing imports:

```python
from compiler.frontend.poly_ast import (
    AppMetaNode,
    StateDeclNode,
    DiscoveryNode,
    OnEventNode,
    PeriodicNode,
    FlowPushNode,
)
```

- **Step 4: Run tests to verify they pass**

Run: `pytest tests/test_poly_parser.py::TestPolyParserControl -v`
Expected: All 3 tests PASS

- **Step 5: Commit**

```bash
git add compiler/frontend/poly_parser.py tests/test_poly_parser.py
git commit -m "feat(poly-dsl): add control block parsing with app, capabilities, state"
```

---

### Task 5: Extend Parser Transformer — Data Block

**Files:**

- Modify: `compiler/frontend/poly_parser.py`
- Modify: `tests/test_poly_parser.py`
- **Step 1: Write failing tests for data block parsing**

Add to `tests/test_poly_parser.py`:

```python
class TestPolyParserData:
    def test_parse_packet_def(self):
        text = """
        polymorphic Test {
            data {
                packet DetPacket {
                    header {
                        flow_id: uint(16);
                        slot_id: uint(8);
                    }
                }
            }
        }
        """
        parser = PolyParser()
        result = parser.parse_text(text)
        assert result.ast is not None
        pkt = result.ast.protocols[0].data.packets[0]
        assert pkt.name == "DetPacket"
        assert len(pkt.header_fields) == 2
        assert pkt.header_fields[0].name == "flow_id"

    def test_parse_module_def(self):
        text = """
        polymorphic Test {
            data {
                packet P {}
                module forward(P) {
                    when: ipv4.dst_addr matches routing_table
                    action: forward(next_hop, with_timing: slot_id)
                }
            }
        }
        """
        parser = PolyParser()
        result = parser.parse_text(text)
        assert result.ast is not None
        mod = result.ast.protocols[0].data.modules[0]
        assert mod.name == "forward"
        assert mod.packet_ref == "P"

    def test_parse_service_def(self):
        text = """
        polymorphic Test {
            data {
                service switching {
                    applies: ["parse", "forward", "buffer_control"]
                    target_role: "switch"
                    pipeline: "match_action"
                }
            }
        }
        """
        parser = PolyParser()
        result = parser.parse_text(text)
        assert result.ast is not None
        svc = result.ast.protocols[0].data.services[0]
        assert svc.name == "switching"
        assert svc.target_role == "switch"
        assert len(svc.applies) == 3

    def test_parse_include(self):
        text = """
        polymorphic Test {
            data {
                include "modules/base_forward.pn"
            }
        }
        """
        parser = PolyParser()
        result = parser.parse_text(text)
        assert result.ast is not None
        assert "modules/base_forward.pn" in result.ast.protocols[0].data.includes
```

- **Step 2: Run test to verify it fails**

Run: `pytest tests/test_poly_parser.py::TestPolyParserData -v`
Expected: FAIL

- **Step 3: Add data block transformer methods**

Add to `_PolyTransformer`:

```python
    # ── Data ────────────────────────────────────────────

    def data_block(self, meta, children):
        packets = []
        parsers = []
        includes = []
        modules = []
        services = []
        for c in children:
            if isinstance(c, PacketDefNode):
                packets.append(c)
            elif isinstance(c, ParseDefNode):
                parsers.append(c)
            elif isinstance(c, str) and c.startswith("include:"):
                includes.append(c[8:])
            elif isinstance(c, ModuleDefNode):
                modules.append(c)
            elif isinstance(c, ServiceDefNode):
                services.append(c)
        return DataBlockNode(
            span=self._span(meta), packets=packets, parsers=parsers,
            includes=includes, modules=modules, services=services,
        )

    def packet_def(self, meta, children):
        name = str(children[0])
        header_fields = []
        metadata_fields = []
        for c in children[1:]:
            if isinstance(c, list):
                if not header_fields:
                    header_fields = c
                else:
                    metadata_fields = c
        return PacketDefNode(
            span=self._span(meta), name=name,
            header_fields=header_fields, metadata_fields=metadata_fields,
        )

    def packet_body(self, meta, children):
        return list(children)

    def packet_section(self, meta, children):
        # Returns list of HeaderFieldNode or marks as metadata
        return children

    def field_list(self, meta, children):
        return [c for c in children if isinstance(c, HeaderFieldNode)]

    def field_def(self, meta, children):
        name = str(children[0])
        type_ref = ""
        for c in children[1:]:
            if isinstance(c, str):
                type_ref = c
            elif isinstance(c, PolyValueNode):
                type_ref = str(c.raw)
        return HeaderFieldNode(span=self._span(meta), name=name, type_ref=type_ref)

    def include_stmt(self, meta, children):
        path = str(children[0]).strip('"\'')
        return f"include:{path}"

    def module_def(self, meta, children):
        name = str(children[0])
        packet_ref = str(children[1]) if len(children) > 1 else ""
        when_clause = ""
        action_clause = ""
        constraints = {}
        for c in children[2:]:
            if isinstance(c, PolyAttrNode):
                if c.key == "when":
                    when_clause = str(c.value.raw) if isinstance(c.value, PolyValueNode) else str(c.value)
                elif c.key == "action":
                    action_clause = str(c.value.raw) if isinstance(c.value, PolyValueNode) else str(c.value)
                elif c.key == "constraints":
                    constraints = c.value
        return ModuleDefNode(
            span=self._span(meta), name=name, packet_ref=packet_ref,
            when_clause=when_clause, action_clause=action_clause,
            constraints=constraints,
        )

    def module_body(self, meta, children):
        return list(children)

    def module_item(self, meta, children):
        return children[0]

    def action_expr(self, meta, children):
        text = "".join(str(c) for c in children)
        return PolyValueNode(raw=text, kind="string")

    def constraint_list(self, meta, children):
        pairs = {}
        for c in children:
            if isinstance(c, PolyAttrNode):
                pairs[c.key] = c.value
        return pairs

    def constraint_item(self, meta, children):
        key = str(children[0])
        value = children[1] if len(children) > 1 else PolyValueNode()
        return PolyAttrNode(span=self._span(meta), key=key, value=value)

    def service_def(self, meta, children):
        name = str(children[0])
        applies = []
        target_role = ""
        pipeline = "match_action"
        constraints = []
        for c in children[1:]:
            if isinstance(c, PolyAttrNode):
                if c.key == "applies" and isinstance(c.value, PolyListValueNode):
                    applies = [str(item.raw) for item in c.value.items]
                elif c.key == "target_role" and isinstance(c.value, PolyValueNode):
                    target_role = c.value.raw
                elif c.key == "pipeline" and isinstance(c.value, PolyValueNode):
                    pipeline = c.value.raw
        return ServiceDefNode(
            span=self._span(meta), name=name, applies=applies,
            target_role=target_role, pipeline=pipeline, constraints=constraints,
        )

    def service_body(self, meta, children):
        return list(children)

    def service_item(self, meta, children):
        return children[0]
```

Add missing imports:

```python
from compiler.frontend.poly_ast import (
    PacketDefNode,
    HeaderFieldNode,
    ParseDefNode,
    ModuleDefNode,
    ServiceDefNode,
)
```

- **Step 4: Run tests to verify they pass**

Run: `pytest tests/test_poly_parser.py::TestPolyParserData -v`
Expected: All 4 tests PASS

- **Step 5: Commit**

```bash
git add compiler/frontend/poly_parser.py tests/test_poly_parser.py
git commit -m "feat(poly-dsl): add data block parsing with packet, module, service"
```

---

### Task 6: Full Integration Test with Example File

**Files:**

- Create: `dsl/examples/poly_deterministic.poly`
- Modify: `tests/test_poly_parser.py`
- **Step 1: Write the full example file**

```
// dsl/examples/poly_deterministic.poly
// Deterministic Router protocol using the Polymorphic DSL

polymorphic DeterministicRouter extends BaseRouter {

    topology {
        profile SwitchProfile {
            target: "bmv2"
            pipeline: "v1model"
            compiler: "p4c-bmv2"
            mgmt {
                protocol: "grpc"
                port: 50051
                auth: "tls"
            }
        }

        profile TofinoSwitch {
            target: "tofino"
            pipeline: "tna"
            compiler: "bf-p4c"
            mgmt {
                protocol: "gnmi"
                port: 9339
                auth: "tls"
            }
        }

        node h1 {
            role: "endpoint"
            profile: "TofinoSwitch"
            mgmt { address: "10.0.0.1" protocol: "grpc" port: 50052 }
        }

        node h2 {
            role: "endpoint"
            profile: "TofinoSwitch"
            mgmt { address: "10.0.0.2" protocol: "grpc" port: 50052 }
        }

        link h1 -> h2 { dedicated: true latency: "< 1ms" }

        constrain all_links: "bandwidth >= 1Gbps"
    }

    control {
        app {
            name: "org.paranet.deterministic-router"
            version: "1.0.0"
            description: "Deterministic routing control app"
            onos_version: ">= 2.7"
            features: ["openflow", "netconf", "gnmic"]
        }

        capabilities: ["route_discovery", "schedule_calculation", "fault_recovery"]

        state routing_table: "map<addr, next_hop>";
        state flow_schedule: "map<flow_id, time_slot>";

        on LinkFailure(link) {
            remove routing_table;
            recalculate flow_schedule;
        }

        periodic refresh_schedule {
            every: "100ms"
            collect telemetry;
        }

        flow_push {
            target: "device"
            rules: "from data.forward"
            via: "device.mgmt"
        }
    }

    data {
        packet DetPacket {
            header {
                flow_id: uint(16);
                slot_id: uint(8);
            }
        }

        module forward(DetPacket) {
            when: ipv4.dst_addr matches routing_table
            action: forward(next_hop, with_timing: slot_id)
        }

        service switching {
            applies: ["forward"]
            target_role: "switch"
            pipeline: "match_action"
        }
    }
}
```

- **Step 2: Write the integration test**

Add to `tests/test_poly_parser.py`:

```python
class TestPolyParserIntegration:
    def test_parse_full_deterministic_router(self):
        from pathlib import Path
        example_path = Path(__file__).resolve().parents[1] / "dsl" / "examples" / "poly_deterministic.poly"
        if not example_path.exists():
            pytest.skip("Example file not found")

        parser = PolyParser()
        result = parser.parse_file(example_path)
        assert result.ast is not None
        assert len(result.diagnostics) == 0, f"Unexpected diagnostics: {result.diagnostics}"

        proto = result.ast.protocols[0]
        assert proto.name == "DeterministicRouter"
        assert proto.extends == "BaseRouter"

        # Topology
        assert proto.topology is not None
        assert len(proto.topology.profiles) == 2
        assert proto.topology.profiles[0].name == "SwitchProfile"
        assert proto.topology.profiles[0].target == "bmv2"
        assert proto.topology.profiles[1].name == "TofinoSwitch"
        assert len(proto.topology.nodes) == 2
        assert proto.topology.nodes[0].name == "h1"
        assert len(proto.topology.links) == 1
        assert len(proto.topology.constraints) == 1

        # Control
        assert proto.control is not None
        assert proto.control.app.name == "org.paranet.deterministic-router"
        assert len(proto.control.capabilities) == 3
        assert len(proto.control.states) == 2
        assert len(proto.control.event_handlers) >= 1
        assert len(proto.control.periodic_tasks) == 1
        assert len(proto.control.flow_pushes) == 1

        # Data
        assert proto.data is not None
        assert len(proto.data.packets) == 1
        assert proto.data.packets[0].name == "DetPacket"
        assert len(proto.data.modules) == 1
        assert proto.data.modules[0].name == "forward"
        assert len(proto.data.services) == 1
        assert proto.data.services[0].target_role == "switch"

    def test_parse_error_reports_diagnostic(self):
        text = "polymorphic { broken }"
        parser = PolyParser()
        result = parser.parse_text(text)
        assert result.ast is None
        assert len(result.diagnostics) > 0
        assert result.diagnostics[0].code == "POLY001"
```

- **Step 3: Run all tests**

Run: `pytest tests/test_poly_parser.py -v`
Expected: All tests PASS (including the integration test)

- **Step 4: Commit**

```bash
git add dsl/examples/poly_deterministic.poly tests/test_poly_parser.py
git commit -m "feat(poly-dsl): add full example file and integration tests"
```

---

### Task 7: Run All Tests and Verify

- **Step 1: Run the full test suite**

Run: `pytest tests/test_poly_ast.py tests/test_poly_parser.py -v`
Expected: All tests PASS

- **Step 2: Run existing tests to verify no regressions**

Run: `pytest tests/ -v`
Expected: All existing tests still PASS

- **Step 3: Final commit (if any fixes needed)**

```bash
git add -A
git commit -m "fix(poly-dsl): address test regressions from Phase 1"
```

---

## Phase 1 Summary

**Deliverables:**

- `compiler/frontend/grammar_polymorphic.lark` — Lark grammar for the full DSL
- `compiler/frontend/poly_ast.py` — ~30 AST node types covering all three planes
- `compiler/frontend/poly_parser.py` — Parser + transformer producing typed AST
- `dsl/examples/poly_deterministic.poly` — Full working example
- `tests/test_poly_ast.py` — AST node unit tests
- `tests/test_poly_parser.py` — Parser integration tests per plane + full example

**What's next (separate plans):**

- Phase 2: IR definitions + Topology IR collection + rendering
- Phase 3: Control IR collection + ONOS Java app emitter
- Phase 4: Data IR collection + P4 code emitter + device partitioning
- Phase 5: Full pipeline integration + CLI + API endpoints

