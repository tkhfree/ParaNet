from __future__ import annotations

import json
from typing import Any

from paranet.agent.core.events.action import DBQueryAction
from paranet.agent.core.events.observation import DBQueryObservation


class DBToolHandler:
    def handle_query(self, action: DBQueryAction) -> DBQueryObservation:
        query = (action.query or "").strip()
        if not query:
            return DBQueryObservation(content="Error: query is required.", rows=[])

        # Only allow SELECT queries for safety
        if not query.upper().startswith("SELECT"):
            return DBQueryObservation(content="Error: only SELECT queries are allowed.", rows=[])

        try:
            import sqlite3
            from pathlib import Path
            db_path = Path(__file__).resolve().parents[3] / "backend" / "data" / "paranet.db"
            if not db_path.exists():
                return DBQueryObservation(content="Error: database file not found.", rows=[])
            conn = sqlite3.connect(str(db_path))
            conn.row_factory = sqlite3.Row
            try:
                cursor = conn.execute(query, action.params or [])
                columns = [desc[0] for desc in cursor.description] if cursor.description else []
                rows = [dict(zip(columns, row)) for row in cursor.fetchall()]
                return DBQueryObservation(content=json.dumps(rows, ensure_ascii=False, indent=2), rows=rows)
            finally:
                conn.close()
        except Exception as exc:
            return DBQueryObservation(content=f"Query failed: {exc}", rows=[])
