from __future__ import annotations

from datetime import datetime, timezone
from typing import Any
import json
import uuid

from app.db.database import get_connection


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
        return {"records": records, "total": total, "pageNo": page_no, "pageSize": page_size}
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
        return _row_to_topology(row) if row else None
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
    current = get_topology(id)
    if not current:
        return None

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
                name if name is not None else current["name"],
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

    return get_topology(id)


def delete_topology(id: str) -> bool:
    conn = get_connection()
    try:
        row = conn.execute("SELECT id FROM topology WHERE id = ?", (id,)).fetchone()
        if not row:
            return False
        conn.execute("DELETE FROM topology WHERE id = ?", (id,))
        conn.commit()
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
