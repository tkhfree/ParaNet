"""Polymorphic DSL compilation API — parse DSL text and return topology/control/data artifacts."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.core.responses import ok

router = APIRouter(prefix="/poly", tags=["Polymorphic DSL"])


@router.post("/parse", summary="Parse Polymorphic DSL and return topology JSON")
def parse_poly_dsl(body: dict):
    """Accept polymorphic DSL source text, parse it, and return topology IR JSON for rendering."""
    dsl_text = str(body.get("dsl", "")).strip()
    if not dsl_text:
        raise HTTPException(status_code=400, detail="DSL source text is required")

    from compiler.frontend.poly_parser import PolyParser
    from compiler.semantic.poly_topology_collector import collect_topology

    parser = PolyParser()
    result = parser.parse_text(dsl_text)

    if result.ast is None:
        return ok({
            "success": False,
            "diagnostics": [d.to_dict() for d in result.diagnostics],
            "topology": None,
        })

    protocols = []
    for proto in result.ast.protocols:
        protocol_data = {
            "name": proto.name,
            "extends": proto.extends,
            "mixins": proto.mixins,
        }

        # Collect topology IR
        if proto.topology is not None:
            topo_ir = collect_topology(proto.topology, proto.name)
            protocol_data["topology"] = topo_ir.to_render_json()
        else:
            protocol_data["topology"] = None

        # Collect control metadata
        if proto.control is not None:
            ctrl = proto.control
            protocol_data["control"] = {
                "app": {
                    "name": ctrl.app.name if ctrl.app else "",
                    "version": ctrl.app.version if ctrl.app else "",
                    "description": ctrl.app.description if ctrl.app else "",
                },
                "capabilities": ctrl.capabilities,
                "states": [{"name": s.name, "type": s.type_expr} for s in ctrl.states],
                "events": [{"name": e.event_name, "params": e.params} for e in ctrl.event_handlers],
            }
        else:
            protocol_data["control"] = None

        # Collect data metadata
        if proto.data is not None:
            data = proto.data
            protocol_data["data"] = {
                "packets": [{"name": p.name} for p in data.packets],
                "modules": [{"name": m.name, "packet": m.packet_ref} for m in data.modules],
                "services": [{"name": s.name, "target_role": s.target_role} for s in data.services],
            }
        else:
            protocol_data["data"] = None

        protocols.append(protocol_data)

    return ok({
        "success": True,
        "protocols": protocols,
        "diagnostics": [d.to_dict() for d in result.diagnostics],
    })


@router.post("/generate-control", summary="Generate ONOS Java app from control block")
def generate_control(body: dict):
    """Parse DSL and generate ONOS Java application source code from the control block."""
    dsl_text = str(body.get("dsl", "")).strip()
    if not dsl_text:
        raise HTTPException(status_code=400, detail="DSL source text is required")

    from compiler.frontend.poly_parser import PolyParser
    from compiler.semantic.poly_control_collector import collect_control
    from compiler.backend.onos_emitter import emit_onos_app

    parser = PolyParser()
    result = parser.parse_text(dsl_text)

    if result.ast is None or not result.ast.protocols:
        return ok({
            "success": False,
            "diagnostics": [d.to_dict() for d in result.diagnostics],
            "files": {},
        })

    proto = result.ast.protocols[0]
    if proto.control is None:
        return ok({
            "success": False,
            "diagnostics": [],
            "files": {},
            "message": "No control block found in protocol",
        })

    control_ir = collect_control(proto.control)
    files = emit_onos_app(control_ir)

    return ok({
        "success": True,
        "protocol": proto.name,
        "files": files,
        "diagnostics": [d.to_dict() for d in result.diagnostics],
    })


@router.post("/generate-p4", summary="Generate per-device P4 code from data block")
def generate_p4(body: dict):
    """Parse DSL and generate per-device P4 source code from data + topology blocks."""
    dsl_text = str(body.get("dsl", "")).strip()
    if not dsl_text:
        raise HTTPException(status_code=400, detail="DSL source text is required")

    from compiler.frontend.poly_parser import PolyParser
    from compiler.semantic.poly_topology_collector import collect_topology
    from compiler.semantic.poly_data_collector import collect_data
    from compiler.backend.p4_emitter import emit_p4_programs

    parser = PolyParser()
    result = parser.parse_text(dsl_text)

    if result.ast is None or not result.ast.protocols:
        return ok({
            "success": False,
            "diagnostics": [d.to_dict() for d in result.diagnostics],
            "files": {},
        })

    proto = result.ast.protocols[0]
    if proto.data is None:
        return ok({
            "success": False,
            "diagnostics": [],
            "files": {},
            "message": "No data block found in protocol",
        })

    if proto.topology is None:
        return ok({
            "success": False,
            "diagnostics": [],
            "files": {},
            "message": "P4 generation requires a topology block for device partitioning",
        })

    topo_ir = collect_topology(proto.topology, proto.name)
    data_ir = collect_data(proto.data, topo_ir, proto.name)
    files = emit_p4_programs(data_ir)

    return ok({
        "success": True,
        "protocol": proto.name,
        "files": files,
        "device_count": len(data_ir.device_programs),
        "diagnostics": [d.to_dict() for d in result.diagnostics],
    })
