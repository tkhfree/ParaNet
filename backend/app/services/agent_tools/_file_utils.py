"""Shared file utilities for agent tools."""

from __future__ import annotations

import re


def flatten_tree(tree: list[dict]) -> list[dict]:
    """Flatten nested file tree into a flat list."""
    result: list[dict] = []
    for item in tree:
        result.append(item)
        children = item.get("children", [])
        if children:
            result.extend(flatten_tree(children))
    return result


def auto_rename(project_id: str, file_name: str) -> str:
    """If file_name already exists in the project, append _2, _3, ... until unique."""
    from app.services import editor_file_service

    m = re.search(r"(\.\w+)$", file_name)
    if m:
        ext = m.group(1)
        base = file_name[: -len(ext)]
    else:
        base = file_name
        ext = ""

    tree = editor_file_service.get_project_file_tree(project_id)
    existing = {f.get("fileName", "") for f in flatten_tree(tree)}
    if file_name not in existing:
        return file_name
    n = 2
    while f"{base}_{n}{ext}" in existing:
        n += 1
    return f"{base}_{n}{ext}"
