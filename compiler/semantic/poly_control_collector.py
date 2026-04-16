"""Collect Control IR from Polymorphic DSL AST for ONOS app generation."""

from __future__ import annotations

import re

from compiler.frontend.poly_ast import ControlBlockNode
from compiler.ir.poly_control_ir import (
    ControlIR,
    OnosAppMeta,
    OnosStateDecl,
    OnosEventHandler,
    OnosPeriodicTask,
    OnosFlowPush,
    OnosDiscoveryConfig,
)


def _app_name_to_package(name: str) -> str:
    """Convert app name like 'org.paranet.det-router' to Java package 'org.paranet.detrouter'."""
    parts = name.split(".")
    # Remove hyphens from last segment
    cleaned = [re.sub(r"[^a-zA-Z0-9]", "", p) for p in parts]
    return ".".join(cleaned) if cleaned else "org.paranet.app"


def _app_name_to_class(name: str) -> str:
    """Convert app name to a Java class name."""
    # Take last segment, convert to CamelCase
    segment = name.split(".")[-1] if "." in name else name
    parts = re.split(r"[-_]", segment)
    return "".join(p.capitalize() for p in parts) + "AppComponent"


def _strip_outer_angles(s: str) -> str:
    """Remove one layer of surrounding < >, respecting nesting."""
    s = s.strip()
    if s.startswith("<") and s.endswith(">"):
        depth = 0
        for i, ch in enumerate(s):
            if ch == "<":
                depth += 1
            elif ch == ">":
                depth -= 1
            if depth == 0 and i == len(s) - 1:
                return s[1:-1].strip()
    return s


def _split_top_level(s: str, sep: str = ",") -> list[str]:
    """Split string on separator, respecting <> nesting."""
    parts: list[str] = []
    depth = 0
    current: list[str] = []
    for ch in s:
        if ch == "<":
            depth += 1
            current.append(ch)
        elif ch == ">":
            depth -= 1
            current.append(ch)
        elif ch == sep and depth == 0:
            parts.append("".join(current).strip())
            current = []
        else:
            current.append(ch)
    remainder = "".join(current).strip()
    if remainder:
        parts.append(remainder)
    return parts


def _type_expr_to_java(type_expr: str) -> str:
    """Map DSL type expressions to Java types."""
    type_expr = type_expr.strip().lower()
    mapping = {
        "int": "Integer",
        "integer": "Integer",
        "bool": "Boolean",
        "boolean": "Boolean",
        "string": "String",
        "float": "Double",
        "double": "Double",
        "long": "Long",
    }
    if type_expr in mapping:
        return mapping[type_expr]
    # Handle map<K, V>
    if type_expr.startswith("map"):
        inner = _strip_outer_angles(type_expr[3:].strip())
        if inner:
            parts = _split_top_level(inner)
            if len(parts) == 2:
                return f"Map<{_type_expr_to_java(parts[0])}, {_type_expr_to_java(parts[1])}>"
        return "Map<String, String>"
    # Handle set<K>
    if type_expr.startswith("set"):
        inner = _strip_outer_angles(type_expr[3:].strip())
        if inner:
            return f"Set<{_type_expr_to_java(inner)}>"
        return "Set<String>"
    # Handle list<K>
    if type_expr.startswith("list"):
        inner = _strip_outer_angles(type_expr[4:].strip())
        if inner:
            return f"List<{_type_expr_to_java(inner)}>"
        return "List<String>"
    return "String"


def _parse_interval_to_ms(interval: str) -> int:
    """Parse interval string like '100ms', '5s', '1m' to milliseconds."""
    interval = interval.strip().lower()
    if interval.endswith("ms"):
        try:
            return int(float(interval[:-2]))
        except ValueError:
            return 1000
    if interval.endswith("s"):
        try:
            return int(float(interval[:-1]) * 1000)
        except ValueError:
            return 1000
    if interval.endswith("m"):
        try:
            return int(float(interval[:-1]) * 60000)
        except ValueError:
            return 60000
    try:
        return int(float(interval))
    except ValueError:
        return 1000


def _event_name_to_class(event_name: str) -> str:
    """Map DSL event names to ONOS event classes."""
    mapping = {
        "deviceconnected": "DeviceEvent",
        "devicedisconnected": "DeviceEvent",
        "linkup": "LinkEvent",
        "linkdown": "LinkEvent",
        "topologychange": "TopologyEvent",
        "hostadded": "HostEvent",
        "hostremoved": "HostEvent",
        "flowadded": "FlowRuleEvent",
        "flowremoved": "FlowRuleEvent",
    }
    return mapping.get(event_name.lower().replace("_", ""), "DeviceEvent")


def collect_control(control_block: ControlBlockNode) -> ControlIR:
    """Collect ControlIR from a ControlBlockNode AST."""
    ir = ControlIR()

    # App metadata
    if control_block.app:
        app = control_block.app
        pkg = _app_name_to_package(app.name)
        ir.app = OnosAppMeta(
            name=app.name,
            version=app.version or "1.0.0",
            description=app.description,
            onos_version=app.onos_version or "2.7",
            features=app.features,
            package_name=pkg,
        )
    else:
        ir.app = OnosAppMeta(package_name="org.paranet.app")

    # Capabilities
    ir.capabilities = control_block.capabilities

    # State declarations
    for s in control_block.states:
        ir.states.append(OnosStateDecl(
            name=s.name,
            java_type=_type_expr_to_java(s.type_expr),
            store_type="consistent",
        ))

    # Discovery config
    if control_block.discovery:
        providers = []
        for p in control_block.discovery.providers:
            providers.append({"name": p.name, "config": p.config})
        ir.discovery = OnosDiscoveryConfig(
            providers=providers,
            on_connected_actions=control_block.discovery.on_connected,
            on_disconnected_actions=control_block.discovery.on_disconnected,
        )

    # Event handlers
    for i, e in enumerate(control_block.event_handlers):
        event_class = _event_name_to_class(e.event_name)
        ir.event_handlers.append(OnosEventHandler(
            event_name=e.event_name,
            event_class=event_class,
            params=e.params,
            actions=e.actions,
            method_name=f"{_to_camel(e.event_name)}",
        ))

    # Periodic tasks
    for p in control_block.periodic_tasks:
        ir.periodic_tasks.append(OnosPeriodicTask(
            name=p.name,
            every_ms=_parse_interval_to_ms(p.every),
            actions=p.actions,
            method_name=f"periodic{_to_camel(p.name)}",
        ))

    # Flow pushes
    for f in control_block.flow_pushes:
        ir.flow_pushes.append(OnosFlowPush(
            target=f.target,
            rules_ref=f.rules_ref,
            via=f.via or "",
        ))

    return ir


def _to_camel(snake: str) -> str:
    """Convert snake_case or kebab-case to CamelCase."""
    parts = re.split(r"[_\-]", snake)
    return "".join(p.capitalize() for p in parts if p)


__all__ = ["collect_control"]
