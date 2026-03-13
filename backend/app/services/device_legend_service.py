from __future__ import annotations

from datetime import datetime, timezone
from typing import Any
import uuid

from app.db.database import get_connection


DEFAULT_DEVICE_LEGENDS: list[dict[str, Any]] = [
    {
        "id": "switch",
        "type": "switch",
        "label": "交换机",
        "imageKey": "device1",
        "color": "#3b82f6",
        "sort": 10,
    },
    {
        "id": "router",
        "type": "router",
        "label": "路由器",
        "imageKey": "device2",
        "color": "#8b5cf6",
        "sort": 20,
    },
    {
        "id": "host",
        "type": "host",
        "label": "终端",
        "imageKey": "device3",
        "color": "#6b7280",
        "sort": 30,
    },
    {
        "id": "controller",
        "type": "controller",
        "label": "控制器",
        "imageKey": "device4",
        "color": "#10b981",
        "sort": 40,
    },
    {
        "id": "server",
        "type": "server",
        "label": "服务器",
        "imageKey": "device5",
        "color": "#f59e0b",
        "sort": 50,
    },
    {
        "id": "p4_switch",
        "type": "p4_switch",
        "label": "P4交换机",
        "imageKey": "device1",
        "color": "#06b6d4",
        "sort": 60,
    },
]

def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _row_to_legend(row) -> dict[str, Any]:
    return {
        "id": row["id"],
        "type": row["type"],
        "label": row["label"],
        "imageKey": row["image_key"],
        "color": row["color"],
        "sort": row["sort"],
        "createdAt": row["created_at"],
        "updatedAt": row["updated_at"],
    }


def _ensure_seed_data() -> None:
    conn = get_connection()
    try:
        count_row = conn.execute("SELECT COUNT(1) AS total FROM device_legend").fetchone()
        total = count_row["total"] if count_row else 0
        if total:
            return

        now = _now()
        for item in DEFAULT_DEVICE_LEGENDS:
            conn.execute(
                """
                INSERT INTO device_legend(id, type, label, image_key, color, sort, created_at, updated_at)
                VALUES(?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    item["id"],
                    item["type"],
                    item["label"],
                    item["imageKey"],
                    item["color"],
                    item["sort"],
                    now,
                    now,
                ),
            )
        conn.commit()
    finally:
        conn.close()


def list_device_legends() -> list[dict[str, Any]]:
    _ensure_seed_data()
    conn = get_connection()
    try:
        rows = conn.execute(
            """
            SELECT id, type, label, image_key, color, sort, created_at, updated_at
            FROM device_legend
            ORDER BY sort ASC, label ASC
            """
        ).fetchall()
        return [_row_to_legend(row) for row in rows]
    finally:
        conn.close()


def get_device_legend(legend_id: str) -> dict[str, Any] | None:
    _ensure_seed_data()
    conn = get_connection()
    try:
        row = conn.execute(
            """
            SELECT id, type, label, image_key, color, sort, created_at, updated_at
            FROM device_legend
            WHERE id = ?
            """,
            (legend_id,),
        ).fetchone()
        return _row_to_legend(row) if row else None
    finally:
        conn.close()


def create_device_legend(
    type: str,
    label: str,
    image_key: str | None = None,
    color: str | None = None,
    sort: int | None = None,
) -> dict[str, Any]:
    _ensure_seed_data()
    conn = get_connection()
    try:
        exists = conn.execute(
            "SELECT 1 FROM device_legend WHERE type = ? LIMIT 1",
            (type,),
        ).fetchone()
        if exists:
            raise ValueError("设备类型标识已存在")

        if sort is None:
            max_row = conn.execute("SELECT COALESCE(MAX(sort), 0) AS max_sort FROM device_legend").fetchone()
            sort = int(max_row["max_sort"] or 0) + 10

        now = _now()
        legend_id = str(uuid.uuid4())
        conn.execute(
            """
            INSERT INTO device_legend(id, type, label, image_key, color, sort, created_at, updated_at)
            VALUES(?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                legend_id,
                type,
                label,
                image_key or "device1",
                color or "#64748b",
                sort,
                now,
                now,
            ),
        )
        conn.commit()
    finally:
        conn.close()
    return get_device_legend(legend_id)  # type: ignore[return-value]


def update_device_legend(
    legend_id: str,
    type: str | None = None,
    label: str | None = None,
    image_key: str | None = None,
    color: str | None = None,
    sort: int | None = None,
) -> dict[str, Any] | None:
    _ensure_seed_data()
    current = get_device_legend(legend_id)
    if not current:
        return None

    next_type = type if type is not None else current["type"]
    conn = get_connection()
    try:
        exists = conn.execute(
            "SELECT 1 FROM device_legend WHERE type = ? AND id != ? LIMIT 1",
            (next_type, legend_id),
        ).fetchone()
        if exists:
            raise ValueError("设备类型标识已存在")

        conn.execute(
            """
            UPDATE device_legend
            SET type = ?, label = ?, image_key = ?, color = ?, sort = ?, updated_at = ?
            WHERE id = ?
            """,
            (
                type if type is not None else current["type"],
                label if label is not None else current["label"],
                image_key if image_key is not None else current["imageKey"],
                color if color is not None else current["color"],
                sort if sort is not None else current["sort"],
                _now(),
                legend_id,
            ),
        )
        conn.commit()
    finally:
        conn.close()
    return get_device_legend(legend_id)


def delete_device_legend(legend_id: str) -> bool:
    _ensure_seed_data()
    conn = get_connection()
    try:
        row = conn.execute("SELECT id FROM device_legend WHERE id = ?", (legend_id,)).fetchone()
        if not row:
            return False
        conn.execute("DELETE FROM device_legend WHERE id = ?", (legend_id,))
        conn.commit()
        return True
    finally:
        conn.close()
