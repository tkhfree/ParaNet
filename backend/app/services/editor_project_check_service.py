"""部署前资源检查：拓扑 SSH 可达性、物化拓扑文件、output 编译产物等。"""

from __future__ import annotations

import asyncio
import json
from pathlib import Path
from typing import Any

from app.services import editor_file_service, editor_project_service, intent_service, topology_service
from app.services.deploy_service import try_ssh_connection


def _merge_node_ssh(node: dict[str, Any]) -> dict[str, Any]:
    cfg = dict(node.get("config") or {})
    props = node.get("properties") if isinstance(node.get("properties"), dict) else {}
    for k in ("sshHost", "sshPort", "sshUsername", "sshPassword"):
        if k not in cfg or cfg.get(k) in (None, ""):
            v = props.get(k)
            if v is not None and v != "":
                cfg[k] = v
    return cfg


def _abs_project_file(project_id: str, relative_path: str) -> Path:
    return editor_file_service._absolute_path(project_id, relative_path)  # noqa: SLF001


def _tracked_in_editor(project_id: str, relative_path: str) -> bool:
    return editor_file_service._get_file_by_path(project_id, relative_path) is not None  # noqa: SLF001


async def check_project_resources_async(
    project_id: str,
    *,
    topology_id: str | None = None,
    compile_artifact_id: str | None = None,
) -> dict[str, Any]:
    """
    按当前项目及可选拓扑 / 编译产物 id 做检查：
    - 各节点 SSH（与部署逻辑一致，config + properties 合并）
    - 物化拓扑 JSON 是否在文件树与磁盘存在
    - output/manifest.json 及 output/<node>/program.p4、entries.json
    - 编译产物记录在内存 store 中是否存在
    """
    project = editor_project_service.get_project(project_id)
    if not project:
        return {"ok": False, "error": "项目不存在", "checks": {}}

    effective_topo_id = topology_id or project.get("topologyId")
    effective_artifact_id = compile_artifact_id or project.get("lastCompileArtifactId")

    checks: dict[str, Any] = {
        "projectId": project_id,
        "topologyId": effective_topo_id,
        "compileArtifactId": effective_artifact_id,
        "ssh": [],
        "topologyFile": None,
        "compileArtifactRecord": None,
        "outputArtifacts": None,
    }

    # --- 编译产物记录 ---
    if effective_artifact_id:
        rec = intent_service.get_intent(effective_artifact_id)
        checks["compileArtifactRecord"] = {
            "exists": rec is not None,
            "message": "记录存在" if rec else "未找到该编译产物记录（请先保存可部署产物）",
        }
    else:
        checks["compileArtifactRecord"] = {
            "exists": False,
            "message": "未选择也未设置项目默认编译产物",
        }

    topo: dict[str, Any] | None = None
    if effective_topo_id:
        topo = topology_service.get_topology_snapshot(effective_topo_id)
        if not topo:
            checks["topologyMissing"] = {
                "ok": False,
                "message": f"拓扑 {effective_topo_id} 不存在或无法读取",
            }
        else:
            fname = topology_service.materialized_topology_filename(topo)
            rel = fname
            on_disk = _abs_project_file(project_id, rel).is_file()
            in_db = _tracked_in_editor(project_id, rel)
            checks["topologyFile"] = {
                "expectedPath": rel,
                "onDisk": on_disk,
                "inEditorFileTree": in_db,
                "ok": on_disk and in_db,
                "message": "物化拓扑文件与项目文件树一致"
                if (on_disk and in_db)
                else "缺少物化拓扑文件或未登记到编辑器文件树，可在开发页保存拓扑或刷新拓扑列表",
            }

            nodes = topo.get("nodes") or []
            ssh_results: list[dict[str, Any]] = []
            for node in nodes:
                if not isinstance(node, dict):
                    continue
                cfg = _merge_node_ssh(node)
                host = str(cfg.get("sshHost") or "").strip()
                port = int(cfg.get("sshPort") or 22)
                user = str(cfg.get("sshUsername") or "").strip()
                password = str(cfg.get("sshPassword") or "")

                entry: dict[str, Any] = {
                    "nodeId": node.get("id", ""),
                    "name": node.get("name", ""),
                    "host": host,
                    "port": port,
                    "status": "pending",
                    "message": "",
                }
                if not host or not user:
                    entry["status"] = "skipped"
                    entry["message"] = "未配置 SSH 主机或用户名"
                else:
                    ok, msg = await asyncio.to_thread(try_ssh_connection, host, port, user, password)
                    entry["status"] = "connected" if ok else "failed"
                    entry["message"] = msg
                ssh_results.append(entry)
            checks["ssh"] = ssh_results
    else:
        checks["topologyMissing"] = {
            "ok": False,
            "message": "未选择拓扑且项目未绑定默认拓扑",
        }

    # --- output 产物 ---
    manifest_rel = "output/manifest.json"
    manifest_path = _abs_project_file(project_id, manifest_rel)
    manifest_ok_disk = manifest_path.is_file()
    manifest_ok_db = _tracked_in_editor(project_id, manifest_rel)
    manifest_nodes: list[str] = []
    per_node: list[dict[str, Any]] = []
    parse_err: str | None = None

    if manifest_ok_disk:
        try:
            raw = json.loads(manifest_path.read_text(encoding="utf-8"))
            for n in raw.get("nodes") or []:
                if isinstance(n, dict) and n.get("node_id"):
                    manifest_nodes.append(str(n["node_id"]))
        except (OSError, json.JSONDecodeError) as exc:
            parse_err = str(exc)[:200]

    if topo and isinstance(topo.get("nodes"), list):
        topo_ids = [str(n.get("id", "")) for n in topo["nodes"] if isinstance(n, dict) and n.get("id")]
    else:
        topo_ids = []

    if manifest_nodes or manifest_ok_disk or topo_ids:
        check_ids = sorted(set(manifest_nodes) | set(topo_ids))
        for nid in check_ids:
            p4_rel = f"output/{nid}/program.p4"
            ent_rel = f"output/{nid}/entries.json"
            per_node.append(
                {
                    "nodeId": nid,
                    "programP4": {
                        "path": p4_rel,
                        "onDisk": _abs_project_file(project_id, p4_rel).is_file(),
                        "inEditor": _tracked_in_editor(project_id, p4_rel),
                    },
                    "entriesJson": {
                        "path": ent_rel,
                        "onDisk": _abs_project_file(project_id, ent_rel).is_file(),
                        "inEditor": _tracked_in_editor(project_id, ent_rel),
                    },
                }
            )

    if not manifest_ok_disk:
        output_ok = True
        output_note = "未检测到 output/manifest.json（若尚未保存可部署产物，属正常）"
    elif parse_err:
        output_ok = False
        output_note = f"manifest.json 解析失败: {parse_err}"
    elif not per_node:
        output_ok = True
        output_note = "manifest 存在但无节点条目可对照"
    else:
        output_ok = all(
            n["programP4"]["onDisk"] and n["entriesJson"]["onDisk"] for n in per_node
        )
        output_note = "各节点 program.p4 / entries.json 齐全" if output_ok else "部分节点缺少 program.p4 或 entries.json"

    checks["outputArtifacts"] = {
        "manifest": {
            "path": manifest_rel,
            "onDisk": manifest_ok_disk,
            "inEditor": manifest_ok_db,
            "parseError": parse_err,
        },
        "perNode": per_node,
        "ok": output_ok,
        "note": output_note,
    }

    # 总览（有拓扑时才要求 SSH + 物化文件）
    record_ok = checks["compileArtifactRecord"]["exists"]
    ssh_ok = all(x["status"] in ("connected", "skipped") for x in checks["ssh"]) if checks["ssh"] else True
    topo_file_ok = (
        checks["topologyFile"].get("ok", True) if checks["topologyFile"] is not None else True
    )
    topo_data_ok = bool(topo)

    summary_ok = True
    if not effective_topo_id:
        summary_ok = False
    elif not topo_data_ok:
        summary_ok = False
    else:
        summary_ok = topo_file_ok and ssh_ok

    if effective_artifact_id and not record_ok:
        summary_ok = False

    if manifest_ok_disk and not output_ok:
        summary_ok = False

    checks["summary"] = {
        "ok": summary_ok,
        "sshOk": ssh_ok,
        "topologyDataOk": topo_data_ok,
        "topologyFileOk": topo_file_ok,
        "outputOk": output_ok,
        "compileRecordOk": record_ok,
        "hints": _build_hints(checks),
    }

    return {"ok": True, "checks": checks}


def _build_hints(checks: dict[str, Any]) -> list[str]:
    hints: list[str] = []
    tm = checks.get("topologyMissing")
    if tm and not tm.get("ok"):
        hints.append(tm["message"])
    tf = checks.get("topologyFile")
    if tf and not tf.get("ok"):
        hints.append(tf["message"])
    car = checks.get("compileArtifactRecord") or {}
    if not car.get("exists"):
        hints.append(car.get("message", ""))
    oa = checks.get("outputArtifacts") or {}
    if oa.get("perNode") and not oa.get("ok"):
        hints.append(oa.get("note") or "output/ 产物不完整")
    for s in checks.get("ssh") or []:
        if s["status"] == "failed":
            hints.append(f"SSH 失败 {s.get('name') or s.get('nodeId')}: {s.get('message', '')}")
    return [h for h in hints if h]
