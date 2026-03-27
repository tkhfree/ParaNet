"""File-related agent tools."""

from __future__ import annotations

from typing import Any

from app.services.agent_tools import register_tool
from app.services.agent_tools._file_utils import auto_rename
from app.services import editor_file_service

# ---------------------------------------------------------------------------
# Tool: list_files
# ---------------------------------------------------------------------------

_LIST_FILES_SCHEMA = {
    "type": "function",
    "function": {
        "name": "list_files",
        "description": "获取项目的文件树列表。返回文件和文件夹的层级结构。",
        "parameters": {
            "type": "object",
            "properties": {
                "projectId": {"type": "string", "description": "项目 ID"},
            },
            "required": ["projectId"],
        },
    },
}


def _list_files(projectId: str, **_kwargs: Any) -> dict[str, Any]:
    tree = editor_file_service.get_project_file_tree(projectId)
    return {"files": tree}


# ---------------------------------------------------------------------------
# Tool: read_file
# ---------------------------------------------------------------------------

_READ_FILE_SCHEMA = {
    "type": "function",
    "function": {
        "name": "read_file",
        "description": "读取指定文件的内容。",
        "parameters": {
            "type": "object",
            "properties": {
                "file_id": {"type": "string", "description": "文件 ID"},
            },
            "required": ["file_id"],
        },
    },
}


def _read_file(file_id: str, **_kwargs: Any) -> dict[str, Any]:
    result = editor_file_service.read_file(file_id)
    return result if isinstance(result, dict) else {"content": result}


# ---------------------------------------------------------------------------
# Tool: create_file
# ---------------------------------------------------------------------------

_CREATE_FILE_SCHEMA = {
    "type": "function",
    "function": {
        "name": "create_file",
        "description": (
            "在项目中创建一个新文件。"
            "注意：如果要创建 .pne 文件，请优先使用 create_pne_from_template 工具，它能保证语法正确。"
            "fileName 必须根据用户描述生成有意义的名称，不要每次用相同的名字。"
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "projectId": {"type": "string", "description": "项目 ID"},
                "fileName": {"type": "string", "description": "文件名，需根据用户意图命名，例如 router.pne、acl_firewall.pne"},
                "content": {"type": "string", "description": "文件内容，默认为空字符串"},
                "parentId": {"type": "string", "description": "父文件夹 ID，不传则放在根目录"},
            },
            "required": ["projectId", "fileName"],
        },
    },
}


def _auto_rename(project_id: str, file_name: str) -> str:
    return auto_rename(project_id, file_name)


def _create_file(
    projectId: str,
    fileName: str,
    content: str = "",
    parentId: str | None = None,
    **_kwargs: Any,
) -> dict[str, Any]:
    try:
        result = editor_file_service.create_file(
            project_id=projectId,
            file_name=fileName,
            is_folder=0,
            file_type=2,
            content=content,
            **({"parent_id": parentId} if parentId else {}),
        )
        return result
    except ValueError as exc:
        err_msg = str(exc)
        if "同名文件" in err_msg:
            new_name = auto_rename(projectId, fileName)
            result = editor_file_service.create_file(
                project_id=projectId,
                file_name=new_name,
                is_folder=0,
                file_type=2,
                content=content,
                **({"parent_id": parentId} if parentId else {}),
            )
            result["_auto_renamed"] = True
            result["_original_name"] = fileName
            return result
        return {"error": err_msg}


# ---------------------------------------------------------------------------
# Tool: write_file
# ---------------------------------------------------------------------------

_WRITE_FILE_SCHEMA = {
    "type": "function",
    "function": {
        "name": "write_file",
        "description": "更新已有文件的内容。",
        "parameters": {
            "type": "object",
            "properties": {
                "file_id": {"type": "string", "description": "文件 ID"},
                "content": {"type": "string", "description": "新文件内容"},
            },
            "required": ["file_id", "content"],
        },
    },
}


def _write_file(file_id: str, content: str, **_kwargs: Any) -> dict[str, Any]:
    result = editor_file_service.update_file_content({
        "fileId": file_id,
        "content": content,
    })
    return result


# ---------------------------------------------------------------------------
# Register all
# ---------------------------------------------------------------------------

register_tool("list_files", _LIST_FILES_SCHEMA, _list_files)
register_tool("read_file", _READ_FILE_SCHEMA, _read_file)
register_tool("create_file", _CREATE_FILE_SCHEMA, _create_file)
register_tool("write_file", _WRITE_FILE_SCHEMA, _write_file)
