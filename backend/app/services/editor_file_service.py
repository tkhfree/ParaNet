from __future__ import annotations

from datetime import datetime, timezone
from io import BytesIO
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile, is_zipfile
import shutil
import uuid

from fastapi import UploadFile

import config

from app.db.database import get_connection
from app.services import editor_project_service

PROJECTS_ROOT = config.DATA_DIR / "projects"
PROJECTS_ROOT.mkdir(parents=True, exist_ok=True)


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _row_to_file(row) -> dict:
    return {
        "id": row["id"],
        "projectId": row["project_id"],
        "parentId": row["parent_id"],
        "fileName": row["file_name"],
        "isFolder": bool(row["is_folder"]),
        "fileType": row["file_type"],
        "filePath": row["file_path"],
        "createdAt": row["created_at"],
        "updatedAt": row["updated_at"],
    }


def _get_project_root(project_id: str) -> Path:
    return PROJECTS_ROOT / project_id


def _sanitize_name(file_name: str) -> str:
    sanitized = (file_name or "").strip().replace("\\", "/").split("/")[-1]
    if not sanitized:
        raise ValueError("文件名不能为空")
    if sanitized in {".", ".."}:
        raise ValueError("文件名不合法")
    return sanitized


def _load_file(file_id: str) -> dict | None:
    conn = get_connection()
    try:
        row = conn.execute(
            """
            SELECT id, project_id, parent_id, file_name, is_folder, file_type, file_path, created_at, updated_at
            FROM editor_file
            WHERE id = ?
            """,
            (file_id,),
        ).fetchone()
        return _row_to_file(row) if row else None
    finally:
        conn.close()


def _load_children(project_id: str) -> list[dict]:
    conn = get_connection()
    try:
        rows = conn.execute(
            """
            SELECT id, project_id, parent_id, file_name, is_folder, file_type, file_path, created_at, updated_at
            FROM editor_file
            WHERE project_id = ?
            ORDER BY is_folder DESC, file_name ASC
            """,
            (project_id,),
        ).fetchall()
        return [_row_to_file(row) for row in rows]
    finally:
        conn.close()


def _build_tree(records: list[dict]) -> list[dict]:
    nodes = {record["id"]: {**record, "children": []} for record in records}
    roots: list[dict] = []
    for record in nodes.values():
        parent_id = record.get("parentId")
        if parent_id and parent_id in nodes:
            nodes[parent_id]["children"].append(record)
        else:
            roots.append(record)
    return roots


def get_project_file_tree(project_id: str) -> list[dict]:
    return _build_tree(_load_children(project_id))


def _get_parent(parent_id: str | None, project_id: str) -> dict | None:
    if not parent_id or parent_id == project_id:
        return None
    parent = _load_file(parent_id)
    if not parent or parent["projectId"] != project_id or not parent["isFolder"]:
        raise ValueError("父级目录不存在")
    return parent


def _relative_path(project_id: str, file_name: str, parent_id: str | None) -> str:
    parent = _get_parent(parent_id, project_id)
    if not parent:
        return file_name
    parent_path = Path(parent["filePath"])
    return str(parent_path / file_name)


def _absolute_path(project_id: str, relative_path: str) -> Path:
    return _get_project_root(project_id) / relative_path


def _path_exists(project_id: str, relative_path: str, exclude_id: str | None = None) -> bool:
    conn = get_connection()
    try:
        if exclude_id:
            row = conn.execute(
                "SELECT 1 FROM editor_file WHERE project_id = ? AND file_path = ? AND id != ? LIMIT 1",
                (project_id, relative_path, exclude_id),
            ).fetchone()
        else:
            row = conn.execute(
                "SELECT 1 FROM editor_file WHERE project_id = ? AND file_path = ? LIMIT 1",
                (project_id, relative_path),
            ).fetchone()
        return row is not None
    finally:
        conn.close()


def _get_file_by_path(project_id: str, relative_path: str) -> dict | None:
    conn = get_connection()
    try:
        row = conn.execute(
            """
            SELECT id, project_id, parent_id, file_name, is_folder, file_type, file_path, created_at, updated_at
            FROM editor_file
            WHERE project_id = ? AND file_path = ?
            """,
            (project_id, relative_path),
        ).fetchone()
        return _row_to_file(row) if row else None
    finally:
        conn.close()


def upsert_text_file(project_id: str, file_name: str, content: str) -> dict:
    """
    Upsert a project root text file without touching `project.currentFileId`.

    This is used for auto-materialized artifacts (e.g. topology snapshots) that
    should appear in the file tree but must not steal the "current editor file".
    """
    if not editor_project_service.get_project(project_id):
        raise ValueError("项目不存在")

    normalized_name = _sanitize_name(file_name)
    relative_path = normalized_name
    now = _now()

    record = _get_file_by_path(project_id, relative_path)
    absolute_path = _absolute_path(project_id, relative_path)
    absolute_path.parent.mkdir(parents=True, exist_ok=True)
    absolute_path.write_text(content or "", encoding="utf-8")

    conn = get_connection()
    try:
        if record:
            file_id = record["id"]
            conn.execute(
                "UPDATE editor_file SET updated_at = ?, file_name = ? WHERE id = ?",
                (now, normalized_name, file_id),
            )
        else:
            file_id = str(uuid.uuid4())
            file_type = _guess_file_type(normalized_name)
            conn.execute(
                """
                INSERT INTO editor_file(id, project_id, parent_id, file_name, is_folder, file_type, file_path, created_at, updated_at)
                VALUES(?, ?, NULL, ?, 0, ?, ?, ?, ?)
                """,
                (
                    file_id,
                    project_id,
                    normalized_name,
                    file_type,
                    relative_path,
                    now,
                    now,
                ),
            )
        conn.commit()
    finally:
        conn.close()

    return _get_file_by_path(project_id, relative_path)  # type: ignore[return-value]


def delete_file_by_path(project_id: str, file_name: str) -> None:
    """Delete a project file by its root-relative path (file name)."""
    relative_path = _sanitize_name(file_name)
    record = _get_file_by_path(project_id, relative_path)
    if not record:
        return
    delete_file(str(record["id"]))


def create_file(
    project_id: str,
    file_name: str,
    is_folder: int,
    parent_id: str | None = None,
    file_type: int = 4,
    content: str | None = None,
) -> dict:
    if not editor_project_service.get_project(project_id):
        raise ValueError("项目不存在")

    normalized_name = _sanitize_name(file_name)
    relative_path = _relative_path(project_id, normalized_name, parent_id)
    if _path_exists(project_id, relative_path):
        raise ValueError("同目录下已存在同名文件")

    file_id = str(uuid.uuid4())
    now = _now()
    absolute_path = _absolute_path(project_id, relative_path)
    absolute_path.parent.mkdir(parents=True, exist_ok=True)
    if is_folder:
        absolute_path.mkdir(parents=True, exist_ok=True)
    else:
        absolute_path.write_text(content or "", encoding="utf-8")

    conn = get_connection()
    try:
        conn.execute(
            """
            INSERT INTO editor_file(id, project_id, parent_id, file_name, is_folder, file_type, file_path, created_at, updated_at)
            VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                file_id,
                project_id,
                None if not parent_id or parent_id == project_id else parent_id,
                normalized_name,
                1 if is_folder else 0,
                file_type,
                relative_path,
                now,
                now,
            ),
        )
        conn.commit()
    finally:
        conn.close()

    editor_project_service.update_project(project_id, currentFileId=file_id if not is_folder else None)
    return _load_file(file_id)  # type: ignore[return-value]


def read_file(file_id: str) -> str:
    record = _load_file(file_id)
    if not record:
        raise ValueError("文件不存在")
    if record["isFolder"]:
        raise ValueError("目录不能直接读取")

    path = _absolute_path(record["projectId"], record["filePath"])
    if not path.exists():
        return ""
    return path.read_text(encoding="utf-8")


def update_file_content(file_id: str, content: str) -> dict:
    record = _load_file(file_id)
    if not record:
        raise ValueError("文件不存在")
    if record["isFolder"]:
        raise ValueError("目录不能保存内容")

    path = _absolute_path(record["projectId"], record["filePath"])
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content or "", encoding="utf-8")

    now = _now()
    conn = get_connection()
    try:
        conn.execute(
            "UPDATE editor_file SET updated_at = ? WHERE id = ?",
            (now, file_id),
        )
        conn.commit()
    finally:
        conn.close()

    editor_project_service.update_project(record["projectId"], currentFileId=file_id)
    return _load_file(file_id)  # type: ignore[return-value]


def _load_descendants(project_id: str, file_path: str) -> list[dict]:
    conn = get_connection()
    try:
        rows = conn.execute(
            """
            SELECT id, project_id, parent_id, file_name, is_folder, file_type, file_path, created_at, updated_at
            FROM editor_file
            WHERE project_id = ? AND (file_path = ? OR file_path LIKE ?)
            ORDER BY LENGTH(file_path) ASC
            """,
            (project_id, file_path, f"{file_path}/%"),
        ).fetchall()
        return [_row_to_file(row) for row in rows]
    finally:
        conn.close()


def rename_file(file_id: str, file_name: str) -> dict:
    record = _load_file(file_id)
    if not record:
        raise ValueError("文件不存在")

    normalized_name = _sanitize_name(file_name)
    parent = _get_parent(record["parentId"], record["projectId"])
    new_relative_path = str(Path(parent["filePath"]) / normalized_name) if parent else normalized_name
    if _path_exists(record["projectId"], new_relative_path, exclude_id=file_id):
        raise ValueError("同目录下已存在同名文件")

    old_relative_path = record["filePath"]
    old_abs = _absolute_path(record["projectId"], old_relative_path)
    new_abs = _absolute_path(record["projectId"], new_relative_path)
    new_abs.parent.mkdir(parents=True, exist_ok=True)
    if old_abs.exists():
        shutil.move(str(old_abs), str(new_abs))

    descendants = _load_descendants(record["projectId"], old_relative_path)
    now = _now()
    conn = get_connection()
    try:
        conn.execute(
            """
            UPDATE editor_file
            SET file_name = ?, file_path = ?, updated_at = ?
            WHERE id = ?
            """,
            (normalized_name, new_relative_path, now, file_id),
        )
        for item in descendants:
            if item["id"] == file_id:
                continue
            suffix = item["filePath"][len(old_relative_path):].lstrip("/")
            updated_path = "/".join(part for part in [new_relative_path, suffix] if part)
            conn.execute(
                "UPDATE editor_file SET file_path = ?, updated_at = ? WHERE id = ?",
                (updated_path, now, item["id"]),
            )
        conn.commit()
    finally:
        conn.close()

    return _load_file(file_id)  # type: ignore[return-value]


def move_file(file_id: str, parent_id: str | None) -> dict:
    record = _load_file(file_id)
    if not record:
        raise ValueError("文件不存在")

    parent = _get_parent(parent_id, record["projectId"])
    old_relative_path = record["filePath"]
    new_relative_path = str(Path(parent["filePath"]) / record["fileName"]) if parent else record["fileName"]
    if old_relative_path == new_relative_path:
        return record
    if _path_exists(record["projectId"], new_relative_path, exclude_id=file_id):
        raise ValueError("目标目录下已存在同名文件")

    old_abs = _absolute_path(record["projectId"], old_relative_path)
    new_abs = _absolute_path(record["projectId"], new_relative_path)
    new_abs.parent.mkdir(parents=True, exist_ok=True)
    if old_abs.exists():
        shutil.move(str(old_abs), str(new_abs))

    descendants = _load_descendants(record["projectId"], old_relative_path)
    now = _now()
    conn = get_connection()
    try:
        conn.execute(
            """
            UPDATE editor_file
            SET parent_id = ?, file_path = ?, updated_at = ?
            WHERE id = ?
            """,
            (
                None if not parent_id or parent_id == record["projectId"] else parent_id,
                new_relative_path,
                now,
                file_id,
            ),
        )
        for item in descendants:
            if item["id"] == file_id:
                continue
            suffix = item["filePath"][len(old_relative_path):].lstrip("/")
            updated_path = "/".join(part for part in [new_relative_path, suffix] if part)
            conn.execute(
                "UPDATE editor_file SET file_path = ?, updated_at = ? WHERE id = ?",
                (updated_path, now, item["id"]),
            )
        conn.commit()
    finally:
        conn.close()

    return _load_file(file_id)  # type: ignore[return-value]


def delete_file(file_id: str) -> None:
    record = _load_file(file_id)
    if not record:
        raise ValueError("文件不存在")

    descendants = _load_descendants(record["projectId"], record["filePath"])
    conn = get_connection()
    try:
        conn.executemany(
            "DELETE FROM editor_file WHERE id = ?",
            [(item["id"],) for item in reversed(descendants)],
        )
        conn.commit()
    finally:
        conn.close()

    abs_path = _absolute_path(record["projectId"], record["filePath"])
    if abs_path.exists():
        if abs_path.is_dir():
            shutil.rmtree(abs_path, ignore_errors=True)
        else:
            abs_path.unlink(missing_ok=True)


def _insert_imported_file(
    project_id: str,
    relative_path: str,
    parent_id: str | None,
    is_folder: bool,
    file_type: int,
) -> str:
    file_id = str(uuid.uuid4())
    now = _now()
    conn = get_connection()
    try:
        conn.execute(
            """
            INSERT INTO editor_file(id, project_id, parent_id, file_name, is_folder, file_type, file_path, created_at, updated_at)
            VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                file_id,
                project_id,
                parent_id,
                Path(relative_path).name,
                1 if is_folder else 0,
                file_type,
                relative_path,
                now,
                now,
            ),
        )
        conn.commit()
    finally:
        conn.close()
    return file_id


async def import_zip(project_id: str, parent_id: str | None, upload_file: UploadFile) -> None:
    if not editor_project_service.get_project(project_id):
        raise ValueError("项目不存在")

    parent = _get_parent(parent_id, project_id)
    parent_path = Path(parent["filePath"]) if parent else Path("")
    payload = await upload_file.read()
    project_root = _get_project_root(project_id)
    project_root.mkdir(parents=True, exist_ok=True)

    if upload_file.filename and upload_file.filename.lower().endswith(".zip") and is_zipfile(BytesIO(payload)):
        with ZipFile(BytesIO(payload)) as zip_file:
            for info in zip_file.infolist():
                relative_name = info.filename.strip("/")
                if not relative_name:
                    continue
                relative_path = str(parent_path / relative_name).replace("\\", "/")
                target_path = _absolute_path(project_id, relative_path)
                if info.is_dir():
                    target_path.mkdir(parents=True, exist_ok=True)
                    _insert_imported_file(project_id, relative_path, None, True, 1)
                    continue

                target_path.parent.mkdir(parents=True, exist_ok=True)
                target_path.write_bytes(zip_file.read(info))
                _insert_imported_file(project_id, relative_path, None, False, _guess_file_type(target_path.name))
        _rebuild_parent_links(project_id)
        return

    filename = _sanitize_name(upload_file.filename or "imported.txt")
    create_file(
        project_id=project_id,
        file_name=filename,
        is_folder=0,
        parent_id=parent_id,
        file_type=_guess_file_type(filename),
        content=payload.decode("utf-8", errors="ignore"),
    )


def _guess_file_type(file_name: str) -> int:
    lower_name = file_name.lower()
    if lower_name.endswith(".p4"):
        return 5
    if lower_name.endswith(".json"):
        return 3
    if lower_name.endswith(".pne"):
        return 2
    if lower_name.endswith(".domain"):
        return 6
    return 4


def _rebuild_parent_links(project_id: str) -> None:
    records = sorted(_load_children(project_id), key=lambda item: item["filePath"].count("/"))
    path_to_id: dict[str, str] = {}
    conn = get_connection()
    try:
        for item in records:
            parent_path = str(Path(item["filePath"]).parent).replace("\\", "/")
            if parent_path == ".":
                parent_db_id = None
            else:
                parent_db_id = path_to_id.get(parent_path)
            conn.execute(
                "UPDATE editor_file SET parent_id = ? WHERE id = ?",
                (parent_db_id, item["id"]),
            )
            path_to_id[item["filePath"]] = item["id"]
        conn.commit()
    finally:
        conn.close()


def export_files(project_id: str, file_ids: list[str] | None = None) -> bytes:
    if not editor_project_service.get_project(project_id):
        raise ValueError("项目不存在")

    records = _load_children(project_id)
    if file_ids:
        selected: list[dict] = []
        for file_id in file_ids:
            record = _load_file(file_id)
            if record and record["projectId"] == project_id:
                selected.extend(_load_descendants(project_id, record["filePath"]))
    else:
        selected = records

    unique_records = {item["id"]: item for item in selected}.values()
    buffer = BytesIO()
    with ZipFile(buffer, mode="w", compression=ZIP_DEFLATED) as zip_file:
        for item in unique_records:
            abs_path = _absolute_path(project_id, item["filePath"])
            arcname = item["filePath"]
            if item["isFolder"]:
                zip_file.writestr(f"{arcname.rstrip('/')}/", "")
            elif abs_path.exists():
                zip_file.write(abs_path, arcname=arcname)
            else:
                zip_file.writestr(arcname, "")
    return buffer.getvalue()


def get_json_content_by_project_id(project_id: str) -> dict:
    records = _load_children(project_id)
    json_file = next((item for item in records if not item["isFolder"] and item["filePath"].lower().endswith(".json")), None)
    if not json_file:
        return {"content": "", "fileId": None}
    return {"content": read_file(json_file["id"]), "fileId": json_file["id"]}
