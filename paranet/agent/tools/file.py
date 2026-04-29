from __future__ import annotations

from paranet.agent.core.events.action import FileReadAction, FileWriteAction, FileEditAction, FileOpAction
from paranet.agent.core.events.observation import Observation


def _get_service():
    import sys
    from pathlib import Path
    backend_dir = str(Path(__file__).resolve().parents[3] / "backend")
    if backend_dir not in sys.path:
        sys.path.insert(0, backend_dir)
    from app.services import editor_file_service
    return editor_file_service


def _resolve_file_id(svc, path: str) -> str | None:
    """Resolve path to a file_id. Accepts UUID or 'project_id:filename'."""
    if ":" in path:
        project_id, file_name = path.split(":", 1)
        tree = svc.get_project_file_tree(project_id)
        if not tree:
            return None
        for item in tree:
            fid = _find_in_tree(item, file_name)
            if fid:
                return fid
        return None
    return path  # assume it's already a file_id


def _find_in_tree(node: dict, name: str) -> str | None:
    if node.get("fileName") == name:
        return node["id"]
    for child in node.get("children", []):
        fid = _find_in_tree(child, name)
        if fid:
            return fid
    return None


class FileToolHandler:
    def handle_read(self, action: FileReadAction) -> Observation:
        svc = _get_service()
        path = action.path
        try:
            file_id = _resolve_file_id(svc, path)
            if file_id:
                content = svc.read_file(file_id)
                return Observation(content=content or "")
        except Exception as exc:
            return Observation(content=f"Read failed: {exc}")
        return Observation(content=f"Could not read file: {path}")

    def handle_write(self, action: FileWriteAction) -> Observation:
        svc = _get_service()
        path = action.path
        content = action.content
        if ":" in path:
            project_id, file_name = path.split(":", 1)
            try:
                svc.upsert_text_file(project_id=project_id, file_name=file_name, content=content)
                return Observation(content=f"File written: {file_name}")
            except Exception as exc:
                return Observation(content=f"Write failed: {exc}")
        try:
            svc.update_file_content(file_id=path, content=content)
            return Observation(content=f"File updated: {path}")
        except Exception as exc:
            return Observation(content=f"Update failed: {exc}")

    def handle_edit(self, action: FileEditAction) -> Observation:
        svc = _get_service()
        try:
            file_id = _resolve_file_id(svc, action.path)
            if file_id:
                current = svc.read_file(file_id) or ""
                new_content = current.replace(action.old_str, action.new_str)
                svc.update_file_content(file_id=file_id, content=new_content)
                return Observation(content=f"File edited: {action.path}")
        except Exception as exc:
            return Observation(content=f"Edit failed: {exc}")
        return Observation(content=f"Could not edit file: {action.path}")

    def handle_op(self, action: FileOpAction) -> Observation:
        op = (action.operation or "").strip().lower()
        params = action.params or {}
        project_id = (action.project_id or "").strip() or params.get("project_id", "")

        try:
            if op == "list":
                return self._list(project_id or params.get("projectId", ""))
            elif op == "create":
                return self._create(params)
            elif op == "delete":
                return self._delete(params)
            elif op == "rename":
                return self._rename(params)
            elif op == "move":
                return self._move(params)
            else:
                return Observation(content=f"Unknown file operation: {op}")
        except Exception as exc:
            return Observation(content=f"File operation '{op}' failed: {exc}")

    def _list(self, project_id: str) -> Observation:
        if not project_id:
            return Observation(content="Error: project_id is required for 'list'.")
        svc = _get_service()
        tree = svc.get_project_file_tree(project_id)
        return Observation(content=json.dumps(tree, ensure_ascii=False, indent=2) if tree else "No files found.")

    def _create(self, params: dict) -> Observation:
        svc = _get_service()
        project_id = params.get("project_id") or params.get("projectId", "")
        file_name = params.get("file_name") or params.get("fileName", "")
        if not project_id or not file_name:
            return Observation(content="Error: project_id and file_name are required for 'create'.")
        content = params.get("content", "")
        parent_id = params.get("parent_id") or params.get("parentId")
        is_folder = params.get("is_folder", 0)
        result = svc.create_file(
            project_id=project_id,
            file_name=file_name,
            is_folder=is_folder,
            file_type=2 if not is_folder else 1,
            content=content,
            **({"parent_id": parent_id} if parent_id else {}),
        )
        return Observation(content=f"File created: {json.dumps(result, ensure_ascii=False) if isinstance(result, dict) else str(result)}")

    def _delete(self, params: dict) -> Observation:
        file_id = params.get("file_id") or params.get("fileId", "")
        if not file_id:
            return Observation(content="Error: file_id is required for 'delete'.")
        svc = _get_service()
        svc.delete_file(file_id)
        return Observation(content=f"File {file_id} deleted.")

    def _rename(self, params: dict) -> Observation:
        file_id = params.get("file_id") or params.get("fileId", "")
        new_name = params.get("file_name") or params.get("fileName", "")
        if not file_id or not new_name:
            return Observation(content="Error: file_id and file_name are required for 'rename'.")
        svc = _get_service()
        svc.rename_file(file_id, new_name)
        return Observation(content=f"File renamed to '{new_name}'.")

    def _move(self, params: dict) -> Observation:
        file_id = params.get("file_id") or params.get("fileId", "")
        parent_id = params.get("parent_id") or params.get("parentId", "")
        if not file_id or not parent_id:
            return Observation(content="Error: file_id and parent_id are required for 'move'.")
        svc = _get_service()
        svc.move_file(file_id, parent_id)
        return Observation(content=f"File {file_id} moved to folder {parent_id}.")
