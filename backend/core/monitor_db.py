import sqlite3
import json
import os
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "monitor.db")

def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS monitor_logs (
            id TEXT PRIMARY KEY,
            timestamp TEXT,
            provider TEXT,
            model TEXT,
            prompt_tokens INTEGER,
            completion_tokens INTEGER,
            total_tokens INTEGER,
            duration_ms INTEGER,
            status TEXT,
            cost REAL,
            project_id TEXT,
            session_id TEXT,
            role TEXT,
            error_code TEXT,
            request TEXT,
            response TEXT,
            ip TEXT,
            mac TEXT
        )
    ''')
    # Sütunlar yoksa ekle (Upgrade logic)
    try:
        cursor.execute("ALTER TABLE monitor_logs ADD COLUMN ip TEXT")
    except: pass
    try:
        cursor.execute("ALTER TABLE monitor_logs ADD COLUMN mac TEXT")
    except: pass

    # API Keys tablosu (Eskisi)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS api_keys (
            provider TEXT PRIMARY KEY,
            api_key TEXT NOT NULL,
            label TEXT,
            created_at TEXT
        )
    ''')

    # Kullanıcı Modelleri Tablosu
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS user_models (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            api_key TEXT NOT NULL,
            created_at TEXT
        )
    ''')
    
    # Hızlı sorgulama için indeksler
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON monitor_logs(timestamp)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_logs_project ON monitor_logs(project_id)")

    conn.commit()
    conn.close()

# ── User Models CRUD ──────────────────────────────────────────────────────────

def get_user_models() -> list:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT id, name, api_key, created_at FROM user_models ORDER BY created_at DESC")
    rows = cursor.fetchall()
    conn.close()
    
    result = []
    for row in rows:
        key = row['api_key']
        masked = key[:6] + '...' + key[-4:] if len(key) > 10 else '***'
        result.append({
            "id": row["id"],
            "name": row["name"],
            "api_key": row["api_key"], # Gerçek kullanım için masked de döndürebiliriz ama silerken id kullanacağız
            "masked_key": masked,
            "created_at": row["created_at"],
            # Frontend'in bozulmaması için dummy fieldler
            "provider": "Custom",
            "has_key": True,
            "status": "active",
            "description": "Kullanıcı tarafından eklenen model.",
            "avg_latency": "-",
            "cost_per_1k": "-",
            "max_tokens": "-",
            "features": ["Özel Model"]
        })
    return result

def add_user_model(model_id: str, name: str, api_key: str):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO user_models (id, name, api_key, created_at)
        VALUES (?, ?, ?, ?)
    ''', (model_id, name, api_key, datetime.utcnow().isoformat()))
    conn.commit()
    conn.close()

def delete_user_model(model_id: str):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("DELETE FROM user_models WHERE id = ?", (model_id,))
    conn.commit()
    conn.close()


def add_log_to_db(log_entry):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO monitor_logs (
            id, timestamp, provider, model, prompt_tokens, completion_tokens,
            total_tokens, duration_ms, status, cost, project_id, session_id,
            role, error_code, request, response, ip, mac
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        log_entry['id'],
        log_entry['timestamp'],
        log_entry['provider'],
        log_entry['model'],
        log_entry['promptTokens'],
        log_entry['completionTokens'],
        log_entry['totalTokens'],
        log_entry['duration'],
        log_entry['status'],
        log_entry['cost'],
        log_entry.get('projectId', 'default'),
        log_entry.get('sessionId', 'default'),
        log_entry.get('role', 'assistant'),
        log_entry.get('error'),
        log_entry.get('request', ''),
        log_entry.get('response', ''),
        log_entry.get('ip', 'unknown'),
        log_entry.get('mac', 'unknown')
    ))
    conn.commit()
    conn.close()

def get_logs_from_db(limit=100, project_id=None):
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    query = "SELECT * FROM monitor_logs"
    params = []
    
    if project_id:
        query += " WHERE project_id = ?"
        params.append(project_id)
    
    query += " ORDER BY timestamp DESC LIMIT ?"
    params.append(limit)
    
    cursor.execute(query, params)
    rows = cursor.fetchall()
    conn.close()
    
    logs = []
    for row in rows:
        log = dict(row)
        # Rename keys to match frontend expectations (camelCase)
        log['promptTokens'] = log.pop('prompt_tokens')
        log['completionTokens'] = log.pop('completion_tokens')
        log['totalTokens'] = log.pop('total_tokens')
        log['duration'] = log.pop('duration_ms')
        log['projectId'] = log.pop('project_id')
        log['sessionId'] = log.pop('session_id')
        log['errorCode'] = log.pop('error_code')
        # Keep 'error' for consistency with frontend if needed
        log['error'] = log['errorCode']
        logs.append(log)
    
    return logs

def clear_logs_from_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("DELETE FROM monitor_logs")
    conn.commit()
    conn.close()

def get_all_logs_for_dashboard(project_id=None):
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    query = "SELECT * FROM monitor_logs"
    params = []
    
    if project_id:
        query += " WHERE project_id = ?"
        params.append(project_id)
    
    cursor.execute(query, params)
    rows = cursor.fetchall()
    conn.close()
    
    logs = []
    for row in rows:
        log = dict(row)
        log['promptTokens'] = log.pop('prompt_tokens')
        log['completionTokens'] = log.pop('completion_tokens')
        log['totalTokens'] = log.pop('total_tokens')
        log['duration'] = log.pop('duration_ms')
        log['projectId'] = log.pop('project_id')
        log['sessionId'] = log.pop('session_id')
        logs.append(log)
        
    return logs
