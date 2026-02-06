import os
import sqlite3
from pathlib import Path

import config

# Ensure data dir exists (new backend only)
config.DATA_DIR.mkdir(parents=True, exist_ok=True)

DB_PATH = str(config.DB_PATH)


def get_connection():
    return sqlite3.connect(DB_PATH)


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
                created_at TEXT,
                updated_at TEXT
            )
        """)
        conn.commit()
    finally:
        conn.close()
