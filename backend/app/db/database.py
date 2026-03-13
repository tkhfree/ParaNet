import sqlite3

import config

# Ensure data dir exists (new backend only)
config.DATA_DIR.mkdir(parents=True, exist_ok=True)

DB_PATH = str(config.DB_PATH)


def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_connection()
    try:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS topology (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT,
                nodes TEXT,
                links TEXT,
                project_id TEXT,
                created_at TEXT,
                updated_at TEXT,
                FOREIGN KEY(project_id) REFERENCES project(id)
            )
        """)
        conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_topology_project
            ON topology(project_id)
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS project (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                remark TEXT,
                topology_id TEXT,
                current_file_id TEXT,
                last_intent_id TEXT,
                created_at TEXT,
                updated_at TEXT
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS editor_file (
                id TEXT PRIMARY KEY,
                project_id TEXT NOT NULL,
                parent_id TEXT,
                file_name TEXT NOT NULL,
                is_folder INTEGER NOT NULL DEFAULT 0,
                file_type INTEGER NOT NULL DEFAULT 4,
                file_path TEXT NOT NULL,
                created_at TEXT,
                updated_at TEXT,
                FOREIGN KEY(project_id) REFERENCES project(id)
            )
        """)
        conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_editor_file_project
            ON editor_file(project_id)
        """)
        conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_editor_file_parent
            ON editor_file(parent_id)
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS device_legend (
                id TEXT PRIMARY KEY,
                type TEXT NOT NULL UNIQUE,
                label TEXT NOT NULL,
                image_key TEXT NOT NULL,
                color TEXT NOT NULL,
                sort INTEGER NOT NULL DEFAULT 0,
                created_at TEXT,
                updated_at TEXT
            )
        """)
        conn.commit()
    finally:
        conn.close()
