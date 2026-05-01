use rusqlite::{Connection, Result as SqlResult};
use std::sync::Mutex;

/// Shared application state managed by Tauri.
pub struct AppState {
    pub db: Mutex<Connection>,
}

impl AppState {
    pub fn new(conn: Connection) -> Self {
        Self {
            db: Mutex::new(conn),
        }
    }
}

/// Initialize the local SQLite schema for offline cache and note storage.
pub fn initialize_schema(conn: &Connection) -> SqlResult<()> {
    conn.execute_batch(
        "
        PRAGMA journal_mode = WAL;
        PRAGMA foreign_keys = ON;
        PRAGMA synchronous = NORMAL;

        CREATE TABLE IF NOT EXISTS local_notes (
            id          TEXT PRIMARY KEY NOT NULL,
            content     TEXT NOT NULL DEFAULT '',
            created_at  TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS highlight_cache (
            id          TEXT PRIMARY KEY NOT NULL,
            verse_ref   TEXT NOT NULL,
            color       TEXT NOT NULL,
            user_id     TEXT NOT NULL,
            synced      INTEGER NOT NULL DEFAULT 0,
            created_at  TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE INDEX IF NOT EXISTS idx_highlight_cache_verse
            ON highlight_cache(verse_ref);

        CREATE TABLE IF NOT EXISTS reading_progress_cache (
            plan_id     TEXT NOT NULL,
            day_index   INTEGER NOT NULL,
            completed   INTEGER NOT NULL DEFAULT 0,
            synced      INTEGER NOT NULL DEFAULT 0,
            PRIMARY KEY (plan_id, day_index)
        );
        ",
    )?;
    Ok(())
}
