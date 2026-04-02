"""
Toplantı veritabanı (meetings.db) — Ana DB'den tamamen bağımsız.
İsteğe bağlı olarak bağlanıp çıkarılabilir.
"""
import sqlite3
from pathlib import Path

MEETINGS_DB_PATH = Path(__file__).parent / "meetings.db"
AUDIO_DIR = Path(__file__).parent / "audio"


def get_meetings_db():
    AUDIO_DIR.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(MEETINGS_DB_PATH), check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn


def init_meetings_db():
    AUDIO_DIR.mkdir(parents=True, exist_ok=True)
    conn = get_meetings_db()
    cur = conn.cursor()

    cur.executescript("""
        CREATE TABLE IF NOT EXISTS meetings (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            title       TEXT    NOT NULL,
            filename    TEXT    NOT NULL,
            audio_path  TEXT,
            duration_s  REAL    DEFAULT 0,
            status      TEXT    DEFAULT 'processing',  -- processing | done | error
            created_at  TEXT    DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS meeting_segments (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            meeting_id  INTEGER NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
            speaker     TEXT    DEFAULT 'Konuşmacı',
            start_ms    REAL    DEFAULT 0,
            end_ms      REAL    DEFAULT 0,
            text        TEXT    NOT NULL,
            created_at  TEXT    DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS meeting_summaries (
            id           INTEGER PRIMARY KEY AUTOINCREMENT,
            meeting_id   INTEGER NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
            summary      TEXT,
            action_items TEXT,   -- JSON array
            keywords     TEXT,   -- JSON array
            created_at   TEXT    DEFAULT (datetime('now'))
        );
    """)

    conn.commit()
    conn.close()
    print("[MEETINGS-DB] meetings.db hazır.")
