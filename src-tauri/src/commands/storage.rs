use crate::state::AppState;
use rusqlite::params;
use tauri::State;

/// Persist a note to the local SQLite cache.
#[tauri::command]
pub fn save_local_note(
    id: String,
    content: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.execute(
        "INSERT INTO local_notes (id, content, updated_at)
         VALUES (?1, ?2, datetime('now'))
         ON CONFLICT(id) DO UPDATE SET
             content = excluded.content,
             updated_at = datetime('now')",
        params![id, content],
    )
    .map(|_| ())
    .map_err(|e| e.to_string())
}

/// Load a note from the local SQLite cache.
#[tauri::command]
pub fn load_local_note(id: String, state: State<'_, AppState>) -> Result<Option<String>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let result = db.query_row(
        "SELECT content FROM local_notes WHERE id = ?1",
        params![id],
        |row| row.get::<_, String>(0),
    );
    match result {
        Ok(content) => Ok(Some(content)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}

/// List all locally cached note IDs.
#[tauri::command]
pub fn list_local_notes(state: State<'_, AppState>) -> Result<Vec<String>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let mut stmt = db
        .prepare("SELECT id FROM local_notes ORDER BY updated_at DESC")
        .map_err(|e| e.to_string())?;
    let ids = stmt
        .query_map([], |row| row.get::<_, String>(0))
        .and_then(|rows| rows.collect::<Result<Vec<_>, _>>())
        .map_err(|e| e.to_string())?;
    Ok(ids)
}

/// Delete a locally cached note.
#[tauri::command]
pub fn delete_local_note(id: String, state: State<'_, AppState>) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.execute("DELETE FROM local_notes WHERE id = ?1", params![id])
        .map(|_| ())
        .map_err(|e| e.to_string())
}
