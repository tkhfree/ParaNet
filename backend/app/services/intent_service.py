from __future__ import annotations

from datetime import datetime, timezone
from typing import Any
import uuid

from compiler.ir.common import Diagnostic, DiagnosticSeverity
from compiler.pipeline import compile_pipeline

from app.services import editor_file_service, topology_service

_store: dict[str, dict[str, Any]] = {}


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def attach_compile_artifact_alias(payload: dict[str, Any]) -> dict[str, Any]:
    """API 响应中同时给出 compileArtifactId，与历史字段 intentId 同值。"""
    out = dict(payload)
    iid = out.get("intentId")
    if iid is not None:
        out["compileArtifactId"] = iid
    return out


def _format_diagnostic(d: Any) -> str:
    msg = f"{d.code}: {d.message}"
    if getattr(d, "span", None) is not None:
        sp = d.span
        msg += f" ({sp.file}:{sp.line}:{sp.column})"
    return msg


def _diagnostics_to_json(diagnostics: list[Any]) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    for d in diagnostics:
        if isinstance(d, Diagnostic):
            out.append(d.to_dict())
        elif isinstance(d, dict):
            out.append(d)
    return out


def list_intents(
    page_no: int = 1,
    page_size: int = 10,
    status: str | None = None,
    project_id: str | None = None,
) -> dict:
    records = list(_store.values())
    if status:
        records = [r for r in records if r.get("status") == status]
    if project_id:
        records = [r for r in records if r.get("projectId") == project_id]
    total = len(records)
    start = (page_no - 1) * page_size
    end = start + page_size
    page = records[start:end]
    return {"records": page, "total": total, "pageNo": page_no, "pageSize": page_size}


def get_intent(id: str) -> dict | None:
    return _store.get(id)


def create_intent(
    name: str,
    description: str | None,
    type: str,
    content: str,
    topology_id: str | None,
    project_id: str | None = None,
    *,
    compile_payload: dict[str, Any] | None = None,
) -> dict:
    intent_id = str(uuid.uuid4())
    now = _now()
    compile_payload = compile_payload or _build_compile_payload(content, topology_id)
    intent = {
        "id": intent_id,
        "name": name,
        "description": description or "",
        "type": type or "dsl",
        "content": content or "",
        "status": "draft",
        "compiledConfig": compile_payload["config"],
        "lastCompileResult": compile_payload,
        "createdAt": now,
        "updatedAt": now,
        "deployedAt": None,
        "topologyId": topology_id,
        "projectId": project_id,
    }
    _store[intent_id] = intent
    return intent


def update_intent(id: str, **kwargs: Any) -> dict | None:
    if id not in _store:
        return None
    intent = _store[id]
    for k, v in kwargs.items():
        if v is not None:
            intent[k] = v
    intent["updatedAt"] = _now()
    return intent


def delete_intent(id: str) -> bool:
    if id in _store:
        del _store[id]
        return True
    return False


def compile_intent(intent_id: str, topology_id: str) -> dict:
    intent = _store.get(intent_id)
    if not intent:
        return {"success": False, "errors": ["编译产物记录不存在"], "warnings": [], "diagnostics": []}
    result = _build_compile_payload(intent.get("content", ""), topology_id)
    intent["compiledConfig"] = result["config"]
    intent["lastCompileResult"] = result
    intent["status"] = "compiled" if result["success"] else "failed"
    intent["updatedAt"] = _now()
    return result


def compile_preview(
    content: str,
    topology_id: str | None,
    project_id: str | None = None,
) -> dict:
    result = _build_compile_payload(content, topology_id)
    result["projectId"] = project_id
    return result


def translate_natural_language(input_text: str, context: dict | None) -> dict:
    return {
        "dslCode": "# Mock DSL from: " + (input_text or ""),
        "explanation": "自然语言转 DSL 需接入 paranet.agent 后生效",
        "suggestions": [],
    }


def save_deploy_artifacts(
    project_id: str,
    content: str,
    topology_id: str | None,
    *,
    intent_id: str | None = None,
    name: str | None = None,
    description: str | None = None,
) -> dict[str, Any]:
    """
    编译一次，更新或创建「编译产物」记录，并将 P4、entries、manifest 写入项目 ``output/`` 目录。
    """
    payload = _build_compile_payload(content, topology_id)
    resolved_id: str | None = intent_id

    if intent_id and intent_id in _store:
        update_intent(
            intent_id,
            name=name,
            description=description,
            content=content,
            topologyId=topology_id,
            projectId=project_id,
        )
        intent = _store[intent_id]
        intent["compiledConfig"] = payload["config"]
        intent["lastCompileResult"] = payload
        intent["status"] = "compiled" if payload.get("success") else "failed"
        intent["updatedAt"] = _now()
    else:
        created = create_intent(
            name or "编译产物",
            description or "",
            "dsl",
            content,
            topology_id,
            project_id,
            compile_payload=payload,
        )
        resolved_id = created["id"]
        _store[resolved_id]["status"] = "compiled" if payload.get("success") else "failed"

    if not payload.get("success"):
        return attach_compile_artifact_alias(
            {
                "success": False,
                "intentId": resolved_id,
                "errors": payload.get("errors", []),
                "warnings": payload.get("warnings", []),
                "written": [],
                "compile": payload,
            }
        )

    written = _materialize_compile_files(project_id, payload)
    return attach_compile_artifact_alias(
        {
            "success": True,
            "intentId": resolved_id,
            "written": written,
            "outputFolder": "output",
            "compile": payload,
        }
    )


def _materialize_compile_files(project_id: str, payload: dict[str, Any]) -> list[str]:
    import json

    preview = (payload.get("globalIr") or {}).get("pipelineArtifactsPreview") or {}
    files: dict[str, str] = {}
    manifest_nodes: list[dict[str, Any]] = []
    for n in preview.get("nodes", []):
        nid = n["node_id"]
        base = f"output/{nid}"
        files[f"{base}/program.p4"] = str(n.get("program_p4") or "")
        files[f"{base}/entries.json"] = json.dumps(n.get("entries") or {}, ensure_ascii=False, indent=2)
        manifest_nodes.append(
            {
                "node_id": nid,
                "backend": n.get("backend"),
                "program_p4": f"{base}/program.p4",
                "entries_json": f"{base}/entries.json",
            }
        )
    manifest: dict[str, Any] = {
        "compiler_version": preview.get("compiler_version"),
        "targetMode": preview.get("targetMode"),
        "default_target": preview.get("default_target"),
        "override_target": preview.get("override_target"),
        "source_hash": preview.get("source_hash"),
        "topology_hash": preview.get("topology_hash"),
        "nodes": manifest_nodes,
    }
    files["output/manifest.json"] = json.dumps(manifest, ensure_ascii=False, indent=2)
    return editor_file_service.replace_compile_output_tree(project_id, files)


def _build_compile_payload(content: str, topology_id: str | None) -> dict:
    topo = topology_service.get_topology(topology_id) if topology_id else None
    pne_text = (content or "").strip()
    if not pne_text:
        return {
            "success": False,
            "config": {"ip": {}, "ndn": {}, "geo": {}, "p4": {}},
            "errors": ["DSL 内容为空，无法编译"],
            "warnings": [],
            "ast": None,
            "globalIr": None,
            "deviceIr": [],
            "logs": [],
            "diagnostics": [],
        }

    logs: list[dict[str, Any]] = [
        {
            "timestamp": _now(),
            "level": "info",
            "message": "开始编译（按拓扑节点 dataPlaneTarget 生成各设备 P4，默认 BMv2）",
        },
    ]

    result = compile_pipeline(
        pne_text,
        topology_snapshot=topo,
        file_name="<content>",
        output_dir=None,
        default_target="bmv2",
    )

    warnings = [_format_diagnostic(d) for d in result.diagnostics if d.severity == DiagnosticSeverity.WARNING]
    errors = [_format_diagnostic(d) for d in result.diagnostics if d.severity == DiagnosticSeverity.ERROR]

    diag_json = _diagnostics_to_json(list(result.diagnostics))

    if errors or result.program is None:
        if errors:
            logs.append({"timestamp": _now(), "level": "error", "message": errors[0]})
        partial_global: dict[str, Any] | None = None
        if result.program is not None:
            partial_global = {
                "programIr": result.program.to_dict(),
                "note": "管线未全部完成，仅包含已成功阶段的结果",
            }
        return {
            "success": False,
            "config": {"ip": {}, "ndn": {}, "geo": {}, "p4": {}},
            "errors": errors or ["编译失败"],
            "warnings": warnings,
            "ast": result.ast_payload,
            "globalIr": partial_global,
            "deviceIr": [],
            "logs": logs,
            "diagnostics": diag_json,
        }

    logs.append({"timestamp": _now(), "level": "info", "message": "语义收集、分片与放置完成"})

    global_ir: dict[str, Any] = {
        "programIr": result.program.to_dict(),
        "fragments": [f.to_dict() for f in result.fragments],
        "nodePlans": [p.to_dict() for p in result.node_plans],
        "pipelineArtifactsPreview": result.artifacts,
        "topologyId": topology_id,
    }

    device_ir: list[dict[str, Any]] = []
    for plan in result.node_plans:
        stub = next(
            (n for n in result.artifacts.get("nodes", []) if n.get("node_id") == plan.node_id),
            None,
        )
        device_ir.append(
            {
                "deviceId": plan.node_id,
                "instructions": {
                    "nodePlan": plan.to_dict(),
                    "artifacts": stub,
                },
            }
        )

    return {
        "success": True,
        "config": {"ip": {}, "ndn": {}, "geo": {}, "p4": {}},
        "errors": [],
        "warnings": warnings,
        "ast": result.ast_payload,
        "globalIr": global_ir,
        "deviceIr": device_ir,
        "logs": logs + [{"timestamp": _now(), "level": "info", "message": "编译完成"}],
        "diagnostics": diag_json,
    }
