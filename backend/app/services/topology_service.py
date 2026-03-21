from __future__ import annotations

from datetime import datetime, timezone
from typing import Any
import json
import re
import uuid

from app.db.database import get_connection
from app.services import editor_file_service

# 与物化文件名一致：项目根目录下的 topology-*.json
TOPOLOGY_FILE_RE = re.compile(r"^topology-.+\.json$", re.IGNORECASE)


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _row_to_topology(row) -> dict[str, Any]:
    nodes_str = row["nodes"] or "[]"
    links_str = row["links"] or "[]"
    try:
        nodes = json.loads(nodes_str) if nodes_str else []
    except json.JSONDecodeError:
        nodes = []
    try:
        links = json.loads(links_str) if links_str else []
    except json.JSONDecodeError:
        links = []
    return {
        "id": row["id"],
        "name": row["name"],
        "description": row["description"] or "",
        "nodes": nodes,
        "links": links,
        "projectId": row["project_id"],
        "createdAt": row["created_at"],
        "updatedAt": row["updated_at"],
    }


def list_topologies(page_no: int = 1, page_size: int = 10, project_id: str | None = None) -> dict:
    conn = get_connection()
    try:
        params: list = []
        where_clause = ""
        if project_id:
            where_clause = "WHERE project_id = ?"
            params.append(project_id)

        # Get total count
        count_row = conn.execute(
            f"SELECT COUNT(1) AS total FROM topology {where_clause}", params
        ).fetchone()
        total = count_row["total"] if count_row else 0

        # Get paginated records
        offset = (page_no - 1) * page_size
        rows = conn.execute(
            f"""
            SELECT id, name, description, nodes, links, project_id, created_at, updated_at
            FROM topology
            {where_clause}
            ORDER BY updated_at DESC
            LIMIT ? OFFSET ?
            """,
            params + [page_size, offset],
        ).fetchall()

        records = [_row_to_topology(row) for row in rows]
        # Lazy materialization: ensure topology snapshots appear in project file tree.
        for topo in records:
            if topo.get("projectId"):
                _materialize_topology_file(str(topo["projectId"]), topo)
        return {"records": records, "total": total, "pageNo": page_no, "pageSize": page_size}
    finally:
        conn.close()


def get_topology_snapshot(id: str) -> dict | None:
    """从 DB 读取拓扑，不向项目目录写文件（避免在保存/同步流程中覆盖编辑器内容）。"""
    conn = get_connection()
    try:
        row = conn.execute(
            """
            SELECT id, name, description, nodes, links, project_id, created_at, updated_at
            FROM topology
            WHERE id = ?
            """,
            (id,),
        ).fetchone()
        return _row_to_topology(row) if row else None
    finally:
        conn.close()


def get_topology(id: str) -> dict | None:
    conn = get_connection()
    try:
        row = conn.execute(
            """
            SELECT id, name, description, nodes, links, project_id, created_at, updated_at
            FROM topology
            WHERE id = ?
            """,
            (id,),
        ).fetchone()
        topo = _row_to_topology(row) if row else None
        if topo and topo.get("projectId"):
            _materialize_topology_file(str(topo["projectId"]), topo)
        return topo
    finally:
        conn.close()


def create_topology(
    name: str,
    description: str | None = None,
    nodes: list | None = None,
    links: list | None = None,
    project_id: str | None = None,
) -> dict:
    id = str(uuid.uuid4())
    now = _now()
    nodes_json = json.dumps(nodes or [], ensure_ascii=False)
    links_json = json.dumps(links or [], ensure_ascii=False)

    conn = get_connection()
    try:
        conn.execute(
            """
            INSERT INTO topology(id, name, description, nodes, links, project_id, created_at, updated_at)
            VALUES(?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (id, name or "未命名拓扑", description or "", nodes_json, links_json, project_id, now, now),
        )
        conn.commit()
    finally:
        conn.close()

    return get_topology(id)  # type: ignore[return-value]


def update_topology(
    id: str,
    name: str | None = None,
    description: str | None = None,
    nodes: list | None = None,
    links: list | None = None,
    project_id: str | None = None,
) -> dict | None:
    current = get_topology_snapshot(id)
    if not current:
        return None
    effective_project_id = project_id if project_id is not None else current.get("projectId")
    old_name = current.get("name", "")
    new_name = name if name is not None else old_name

    conn = get_connection()
    try:
        nodes_json = json.dumps(nodes if nodes is not None else current["nodes"], ensure_ascii=False)
        links_json = json.dumps(links if links is not None else current["links"], ensure_ascii=False)

        conn.execute(
            """
            UPDATE topology
            SET name = ?, description = ?, nodes = ?, links = ?, project_id = ?, updated_at = ?
            WHERE id = ?
            """,
            (
                new_name,
                description if description is not None else current["description"],
                nodes_json,
                links_json,
                project_id if project_id is not None else current["projectId"],
                _now(),
                id,
            ),
        )
        conn.commit()
    finally:
        conn.close()

    # 处理文件名变化：如果名称改变，需要删除旧文件
    if effective_project_id and old_name != new_name:
        old_topo = {"id": id, "name": old_name}
        old_file_name = _get_topology_file_name(old_topo)
        editor_file_service.delete_file_by_path(project_id=str(effective_project_id), file_name=old_file_name)

    return get_topology(id)


def materialized_topology_filename(topo: dict[str, Any]) -> str:
    """项目根目录下物化拓扑 JSON 的文件名（与 DB 物化逻辑一致）。"""
    return _get_topology_file_name(topo)


def _get_topology_file_name(topo: dict[str, Any]) -> str:
    """生成拓扑文件名：topology-{name}-{short_id}.json

    格式说明：
    - name: 拓扑名称（过滤特殊字符）
    - short_id: ID 前8位，保证唯一性
    """
    topo_id = str(topo.get("id", ""))
    name = str(topo.get("name", "未命名"))
    # 过滤文件名中的特殊字符
    safe_name = "".join(c for c in name if c.isalnum() or c in ("-", "_", "中", "文"))[:20]
    short_id = topo_id[:8] if len(topo_id) >= 8 else topo_id
    return f"topology-{safe_name}-{short_id}.json"


def _materialize_topology_file(project_id: str, topo: dict[str, Any]) -> None:
    file_name = _get_topology_file_name(topo)
    # Ensure the file content matches the topology snapshot currently stored in DB.
    payload = json.dumps(topo, ensure_ascii=False, indent=2)
    editor_file_service.upsert_text_file(project_id=project_id, file_name=file_name, content=payload)


def delete_topology(id: str) -> bool:
    conn = get_connection()
    try:
        row = conn.execute(
            "SELECT id, name, project_id FROM topology WHERE id = ?",
            (id,),
        ).fetchone()
        if not row:
            return False

        project_id = row["project_id"]
        topo_name = row["name"]
        conn.execute("DELETE FROM topology WHERE id = ?", (id,))
        conn.commit()

        if project_id:
            # 使用与 _get_topology_file_name 相同的命名逻辑
            topo = {"id": id, "name": topo_name}
            file_name = _get_topology_file_name(topo)
            editor_file_service.delete_file_by_path(project_id=str(project_id), file_name=file_name)
        return True
    finally:
        conn.close()


def export_topology(id: str) -> bytes | None:
    topo = get_topology(id)
    if not topo:
        return None
    return json.dumps(topo, ensure_ascii=False, indent=2).encode("utf-8")


def import_topology(
    name: str | None,
    description: str | None,
    nodes: list | None = None,
    links: list | None = None,
    project_id: str | None = None,
) -> dict:
    return create_topology(name or "导入的拓扑", description, nodes, links, project_id)


def sync_topology_from_editor_json(
    project_id: str,
    file_name: str,
    content: str,
) -> dict[str, Any] | None:
    """若保存的是物化的 topology-*.json，则解析 JSON 并回写 topology 表。

    返回 None 表示不是拓扑 JSON 文件，无需同步。
    否则返回 {"synced": bool, ...} 供前端展示。
    """
    if not file_name or not TOPOLOGY_FILE_RE.match(file_name.strip()):
        return None

    try:
        data = json.loads(content or "{}")
    except json.JSONDecodeError as exc:
        return {"synced": False, "error": f"JSON 解析失败: {exc}"}

    if not isinstance(data, dict):
        return {"synced": False, "error": "拓扑 JSON 顶层必须是对象"}

    tid = data.get("id")
    if not tid or not isinstance(tid, str):
        return {"synced": False, "error": "缺少有效的顶层 id 字段"}

    nodes = data.get("nodes")
    links = data.get("links")
    if nodes is None or not isinstance(nodes, list):
        return {"synced": False, "error": "nodes 必须是数组"}
    if links is None or not isinstance(links, list):
        return {"synced": False, "error": "links 必须是数组"}

    current = get_topology_snapshot(tid)
    if not current:
        return {"synced": False, "error": f"拓扑 {tid} 不存在"}

    if str(current.get("projectId") or "") != str(project_id):
        return {"synced": False, "error": "拓扑不属于当前项目"}

    name_kw: str | None
    if "name" in data:
        name_kw = str(data["name"]) if data["name"] is not None else None
    else:
        name_kw = None

    desc_kw: str | None
    if "description" in data:
        desc_kw = str(data["description"]) if data["description"] is not None else None
    else:
        desc_kw = None

    updated = update_topology(
        tid,
        name=name_kw,
        description=desc_kw,
        nodes=nodes,
        links=links,
        project_id=None,
    )
    if not updated:
        return {"synced": False, "error": "更新拓扑失败"}

    mat_name = _get_topology_file_name(updated)
    frec = editor_file_service._get_file_by_path(project_id, mat_name)
    return {
        "synced": True,
        "topologyId": tid,
        "materializedFileName": mat_name,
        "fileId": frec["id"] if frec else None,
    }
