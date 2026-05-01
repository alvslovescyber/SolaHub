mod commands;
mod state;

use state::AppState;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            let app_data_dir = app
                .path()
                .app_data_dir()
                .expect("Failed to get app data directory");

            std::fs::create_dir_all(&app_data_dir)
                .expect("Failed to create app data directory");

            let db_path = app_data_dir.join("solahub_local.db");
            let conn = rusqlite::Connection::open(&db_path)
                .expect("Failed to open local SQLite database");

            state::initialize_schema(&conn)
                .expect("Failed to initialize database schema");

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
        .expect("Error running SolaHub application");
}
