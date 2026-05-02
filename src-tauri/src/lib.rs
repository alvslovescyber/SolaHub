mod commands;
mod state;

use state::AppState;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    if let Err(error) = tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .setup(|app| {
            let app_data_dir = app.path().app_data_dir().map_err(|error| {
                std::io::Error::other(format!("Failed to get app data directory: {error}"))
            })?;

            std::fs::create_dir_all(&app_data_dir).map_err(|error| {
                std::io::Error::other(format!("Failed to create app data directory: {error}"))
            })?;

            let db_path = app_data_dir.join("solahub_local.db");
            let conn = rusqlite::Connection::open(&db_path)?;

            state::initialize_schema(&conn)?;

            app.manage(AppState::new(conn));

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::bible::search_verses,
            commands::bible::get_chapter,
            commands::bible::get_book_list,
            commands::bible::get_verse,
            commands::storage::save_local_note,
            commands::storage::load_local_note,
            commands::storage::list_local_notes,
            commands::storage::delete_local_note,
            commands::window::open_presenter_window,
            commands::window::close_presenter_window,
            commands::window::set_fullscreen,
        ])
        .run(tauri::generate_context!())
    {
        eprintln!("Error running SolaHub application: {error}");
    }
}
