from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
import shutil
import uuid

import config

from app.db.database import get_connection

PROJECTS_ROOT = config.DATA_DIR / "projects"
PROJECTS_ROOT.mkdir(parents=True, exist_ok=True)


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _project_dir(project_id: str) -> Path:
    return PROJECTS_ROOT / project_id


def _row_to_project(row) -> dict:
    return {
        "id": row["id"],
        "name": row["name"],
        "remark": row["remark"] or "",
        "topologyId": row["topology_id"],
        "currentFileId": row["current_file_id"],
        "lastIntentId": row["last_intent_id"],
        "createdAt": row["created_at"],
        "updatedAt": row["updated_at"],
    }


def list_projects() -> list[dict]:
    conn = get_connection()
    try:
        rows = conn.execute(
            """
            SELECT id, name, remark, topology_id, current_file_id, last_intent_id, created_at, updated_at
            FROM project
            ORDER BY updated_at DESC, created_at DESC
            """
        ).fetchall()
        return [_row_to_project(row) for row in rows]
    finally:
        conn.close()


def get_project(project_id: str) -> dict | None:
    conn = get_connection()
    try:
        row = conn.execute(
            """
            SELECT id, name, remark, topology_id, current_file_id, last_intent_id, created_at, updated_at
            FROM project
            WHERE id = ?
            """,
            (project_id,),
        ).fetchone()
        return _row_to_project(row) if row else None
    finally:
        conn.close()


def check_project_name_exists(name: str, exclude_id: str | None = None) -> bool:
    conn = get_connection()
    try:
        if exclude_id:
            row = conn.execute(
                "SELECT 1 FROM project WHERE name = ? AND id != ? LIMIT 1",
                (name, exclude_id),
            ).fetchone()
        else:
            row = conn.execute(
                "SELECT 1 FROM project WHERE name = ? LIMIT 1",
                (name,),
            ).fetchone()
        return row is not None
    finally:
        conn.close()


def create_project(name: str, remark: str | None = None) -> dict:
    project_id = str(uuid.uuid4())
    now = _now()
    project_name = (name or "未命名项目").strip() or "未命名项目"
    if check_project_name_exists(project_name):
        raise ValueError("项目名称已存在")

    conn = get_connection()
    try:
        conn.execute(
            """
            INSERT INTO project(id, name, remark, topology_id, current_file_id, last_intent_id, created_at, updated_at)
            VALUES(?, ?, ?, NULL, NULL, NULL, ?, ?)
            """,
            (project_id, project_name, remark or "", now, now),
        )
        conn.commit()
    finally:
        conn.close()

    _project_dir(project_id).mkdir(parents=True, exist_ok=True)
    return get_project(project_id)  # type: ignore[return-value]


def update_project(project_id: str, **kwargs) -> dict | None:
    existing = get_project(project_id)
    if not existing:
        return None

    name = kwargs.get("name")
    if name is not None:
        normalized_name = name.strip() or "未命名项目"
        if check_project_name_exists(normalized_name, project_id):
            raise ValueError("项目名称已存在")
        kwargs["name"] = normalized_name

    allowed = {
        "name": "name",
        "remark": "remark",
        "topologyId": "topology_id",
        "currentFileId": "current_file_id",
        "lastIntentId": "last_intent_id",
    }
    assignments: list[str] = []
    values: list[object] = []
    for key, column in allowed.items():
        if key in kwargs:
            assignments.append(f"{column} = ?")
            values.append(kwargs.get(key))

    if not assignments:
        return existing

    assignments.append("updated_at = ?")
    values.append(_now())
    values.append(project_id)

    conn = get_connection()
    try:
        conn.execute(
            f"UPDATE project SET {', '.join(assignments)} WHERE id = ?",
            values,
        )
        conn.commit()
    finally:
        conn.close()

    return get_project(project_id)


def delete_project(project_id: str) -> bool:
    conn = get_connection()
    try:
        project = conn.execute(
            "SELECT id FROM project WHERE id = ?",
            (project_id,),
        ).fetchone()
        if not project:
            return False

        conn.execute("DELETE FROM editor_file WHERE project_id = ?", (project_id,))
        conn.execute("DELETE FROM project WHERE id = ?", (project_id,))
        conn.commit()
    finally:
        conn.close()

    project_dir = _project_dir(project_id)
    if project_dir.exists():
        shutil.rmtree(project_dir, ignore_errors=True)
    return True
