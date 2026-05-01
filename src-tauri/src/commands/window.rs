use tauri::{AppHandle, Manager, WebviewUrl, WebviewWindowBuilder};

/// Open the presenter window on a secondary display.
#[tauri::command]
pub fn open_presenter_window(url: String, app: AppHandle) -> Result<(), String> {
    // Close existing presenter window if already open
    if let Some(existing) = app.get_webview_window("presenter") {
        let _ = existing.close();
    }

    WebviewWindowBuilder::new(&app, "presenter", WebviewUrl::App(url.into()))
        .title("SolaHub Presenter")
        .fullscreen(true)
        .decorations(false)
        .always_on_top(true)
        .build()
        .map(|_| ())
        .map_err(|e| e.to_string())
}

/// Close the presenter window.
#[tauri::command]
pub fn close_presenter_window(app: AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("presenter") {
        window.close().map_err(|e| e.to_string())
    } else {
        Ok(())
    }
}

/// Toggle fullscreen on the main window.
#[tauri::command]
pub fn set_fullscreen(fullscreen: bool, app: AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("main") {
        window
            .set_fullscreen(fullscreen)
            .map_err(|e| e.to_string())
    } else {
        Err("Main window not found".into())
    }
}
