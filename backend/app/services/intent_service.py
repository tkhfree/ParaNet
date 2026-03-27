from __future__ import annotations

from datetime import datetime, timezone
from typing import Any
import re
import uuid

from compiler.ir.common import Diagnostic, DiagnosticSeverity
from compiler.pipeline import compile_pipeline

from app.services.agent_prompt_skills import (
    AGENT_SYSTEM_PROMPT,
    build_dsl_generation_prompt,
    build_dsl_repair_prompt,
)
from app.services import editor_file_service, topology_service
from app.services.zhipu_llm_service import ZhipuLLMError, chat_completion, is_configured

_store: dict[str, dict[str, Any]] = {}
_CODE_BLOCK_RE = re.compile(r"```(?:paranet|pne|text|plaintext)?\s*(.*?)```", re.IGNORECASE | re.DOTALL)


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


def _requested_skill_names(context: dict[str, Any] | None) -> list[str] | None:
    if not isinstance(context, dict):
        return None
    raw = context.get("skills")
    if not isinstance(raw, list):
        return None
    return [str(item).strip() for item in raw if str(item).strip()]


def _summarize_topology_for_agent(topology_id: str | None) -> str:
    if not topology_id:
        return "No topology selected."
    topo = topology_service.get_topology(topology_id)
    if not topo:
        return f"Topology {topology_id} was requested but not found."

    node_summaries: list[str] = []
    for node in topo.get("nodes", []):
        if not isinstance(node, dict):
            continue
        node_id = str(node.get("id") or "").strip()
        if not node_id:
            continue
        caps = node.get("capabilities") if isinstance(node.get("capabilities"), dict) else {}
        profiles = caps.get("profiles") if isinstance(caps.get("profiles"), list) else []
        target = caps.get("dataPlaneTarget")
        profile_text = ",".join(str(profile) for profile in profiles if str(profile).strip()) or "-"
        target_text = str(target).strip() or "-"
        node_summaries.append(f"{node_id}(profiles={profile_text}, target={target_text})")

    link_summaries: list[str] = []
    for link in topo.get("links", []):
        if not isinstance(link, dict):
            continue
        source = str(link.get("source") or "").strip()
        target = str(link.get("target") or "").strip()
        if source and target:
            link_summaries.append(f"{source}->{target}")

    name = str(topo.get("name") or topology_id).strip()
    return (
        f"Topology {name} ({topology_id})\n"
        f"Nodes: {', '.join(node_summaries) or 'none'}\n"
        f"Links: {', '.join(link_summaries) or 'none'}"
    )


def _build_placeholder_dsl(input_text: str) -> str:
    request_line = (input_text or "").strip() or "未提供需求"
    return (
        f"// Requested intent: {request_line}\n"
        "module GeneratedAgent() {\n"
        "  control {\n"
        "    ;\n"
        "  }\n"
        "}\n"
        "\n"
        "intent {\n"
        "}\n"
    )


def _extract_dsl_from_llm_content(content: str) -> str:
    text = str(content or "").strip()
    if not text:
        return ""

    matches = _CODE_BLOCK_RE.findall(text)
    if matches:
        return max((match.strip() for match in matches if match.strip()), key=len, default=text)

    candidate_markers = ("module ", "service ", "application ", "intent {")
    for marker in candidate_markers:
        idx = text.find(marker)
        if idx >= 0:
            return text[idx:].strip()
    return text


def _summarize_compile_errors(compile_payload: dict[str, Any]) -> str:
    diagnostics = compile_payload.get("diagnostics")
    if isinstance(diagnostics, list) and diagnostics:
        messages: list[str] = []
        for item in diagnostics[:8]:
            if not isinstance(item, dict):
                continue
            code = str(item.get("code") or "DIAG").strip()
            message = str(item.get("message") or "").strip()
            span = item.get("span") if isinstance(item.get("span"), dict) else None
            if span:
                line = span.get("line")
                column = span.get("column")
                messages.append(f"{code}: {message} ({line}:{column})")
            else:
                messages.append(f"{code}: {message}")
        if messages:
            return "\n".join(messages)

    errors = compile_payload.get("errors")
    if isinstance(errors, list) and errors:
        return "\n".join(str(error).strip() for error in errors[:8] if str(error).strip())
    return "编译失败，但未返回结构化诊断。"


def _build_translate_suggestions(compile_payload: dict[str, Any], llm_error: str | None = None) -> list[str]:
    if llm_error:
        return [
            "检查后端环境变量 ZHIPU_API_KEY、ZHIPU_BASE_URL、ZHIPU_MODEL 是否已正确配置",
            "如果模型输出偏离语法，可在请求里补充 from/to/via/profile 等关键约束",
        ]

    if compile_payload.get("success"):
        return [
            "生成结果已通过编译预检，可直接应用到编辑器后继续部署或微调",
            "如果需要更精确的路由策略，可以继续补充路径、约束或策略块",
        ]

    return [
        "可继续补充更明确的节点、前缀和协议剖面约束，以便模型收敛到可编译 DSL",
        "如果错误集中在 intent 块，可直接说明需要 route、reachability、policy 还是 schedule",
    ]


def _generate_dsl_with_llm(
    input_text: str,
    topology_summary: str,
    skill_names: list[str] | None,
    topology_id: str | None,
) -> tuple[str, dict[str, Any], list[str], str]:
    used_skills, generation_prompt = build_dsl_generation_prompt(
        input_text,
        topology_context=topology_summary,
        skill_names=skill_names,
    )
    response = chat_completion(
        [
            {"role": "system", "content": AGENT_SYSTEM_PROMPT},
            {"role": "user", "content": generation_prompt},
        ]
    )
    generated_dsl = _extract_dsl_from_llm_content(response["content"])
    if not generated_dsl:
        raise ZhipuLLMError("智谱 GLM 未返回可解析的 PNE DSL")

    compile_payload = _build_compile_payload(generated_dsl, topology_id)
    if compile_payload.get("success"):
        return generated_dsl, compile_payload, used_skills, generation_prompt

    repair_prompt_skills, repair_prompt = build_dsl_repair_prompt(
        input_text,
        current_dsl=generated_dsl,
        diagnostics=_summarize_compile_errors(compile_payload),
        topology_context=topology_summary,
        skill_names=used_skills,
    )
    repair_response = chat_completion(
        [
            {"role": "system", "content": AGENT_SYSTEM_PROMPT},
            {"role": "user", "content": repair_prompt},
        ]
    )
    repaired_dsl = _extract_dsl_from_llm_content(repair_response["content"])
    if not repaired_dsl:
        return generated_dsl, compile_payload, repair_prompt_skills, generation_prompt

    repaired_payload = _build_compile_payload(repaired_dsl, topology_id)
    if repaired_payload.get("success"):
        return repaired_dsl, repaired_payload, repair_prompt_skills, generation_prompt
    return repaired_dsl, repaired_payload, repair_prompt_skills, generation_prompt


def translate_natural_language(input_text: str, context: dict | None) -> dict:
    topology_id = context.get("topologyId") if isinstance(context, dict) else None
    topology_summary = _summarize_topology_for_agent(str(topology_id) if topology_id else None)
    requested_skills = _requested_skill_names(context)
    used_skills, injected_prompt = build_dsl_generation_prompt(
        input_text,
        topology_context=topology_summary,
        skill_names=requested_skills,
    )
    if not is_configured():
        return {
            "dslCode": _build_placeholder_dsl(input_text),
            "explanation": (
                "智谱 GLM 已接入代码链路，但当前环境未配置 `ZHIPU_API_KEY`，因此回退为最小占位 DSL。"
            ),
            "suggestions": _build_translate_suggestions({}, llm_error="missing_api_key"),
            "usedSkills": used_skills,
            "agentPrompt": injected_prompt,
            "compileResult": _build_compile_payload(_build_placeholder_dsl(input_text), str(topology_id) if topology_id else None),
        }

    try:
        dsl_code, compile_payload, used_skills, injected_prompt = _generate_dsl_with_llm(
            input_text,
            topology_summary,
            requested_skills,
            str(topology_id) if topology_id else None,
        )
        explanation = (
            "已调用真实智谱 GLM 生成 PNE DSL，并自动注入语法 skill："
            + ", ".join(used_skills)
        )
        if compile_payload.get("success"):
            explanation += "。结果已通过编译预检。"
        else:
            explanation += "。模型已尝试一次自动修复，但当前结果仍未完全通过编译。"

        return {
            "dslCode": dsl_code,
            "explanation": explanation,
            "suggestions": _build_translate_suggestions(compile_payload),
            "usedSkills": used_skills,
            "agentPrompt": injected_prompt,
            "compileResult": compile_payload,
        }
    except ZhipuLLMError as exc:
        fallback_dsl = _build_placeholder_dsl(input_text)
        return {
            "dslCode": fallback_dsl,
            "explanation": f"调用智谱 GLM 失败，已回退到最小占位 DSL。原因: {exc}",
            "suggestions": _build_translate_suggestions({}, llm_error=str(exc)),
            "usedSkills": used_skills,
            "agentPrompt": injected_prompt,
            "compileResult": _build_compile_payload(fallback_dsl, str(topology_id) if topology_id else None),
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
