mod commands;
mod state;

use state::AppState;
use tauri::{Emitter, Manager, WindowEvent};

const PRESENTER_DISPLAY_CLOSED_EVENT: &str = "solahub:presenter-display-closed";

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    if let Err(error) = tauri::Builder::default()
        .setup(|app| {
            #[cfg(all(desktop, not(debug_assertions)))]
            if let Err(e) = app
                .handle()
                .plugin(tauri_plugin_updater::Builder::new().build())
            {
                eprintln!("Warning: updater plugin not available (no pubkey configured): {e}");
            }

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
        .on_window_event(|window, event| match event {
            WindowEvent::Resized(_)
                if window.label() == "main" && window.is_minimized().unwrap_or(false) =>
            {
                close_presenter_window(window.app_handle());
            }
            WindowEvent::Resized(_)
                if window.label() == "presenter" && window.is_minimized().unwrap_or(false) =>
            {
                let _ = window.close();
            }
            WindowEvent::Destroyed if window.label() == "presenter" => {
                let _ = window.app_handle().emit(
                    PRESENTER_DISPLAY_CLOSED_EVENT,
                    serde_json::json!({ "type": "closed" }),
                );
            }
            WindowEvent::CloseRequested { .. } | WindowEvent::Destroyed
                if window.label() == "main" =>
            {
                close_presenter_window(window.app_handle());
            }
            _ => {}
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
            commands::window::get_display_monitors,
            commands::window::open_presenter_window,
            commands::window::close_presenter_window,
            commands::window::set_fullscreen,
            #[cfg(desktop)]
            commands::update::check_app_update,
            #[cfg(desktop)]
            commands::update::install_app_update,
        ])
        .run(tauri::generate_context!())
    {
        eprintln!("Error running SolaHub application: {error}");
    }
}

fn close_presenter_window(app: &tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("presenter") {
        let _ = window.close();
    }
}
