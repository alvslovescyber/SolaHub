use tauri::{AppHandle, Manager, PhysicalPosition, PhysicalSize, WebviewUrl, WebviewWindowBuilder};

/// Open the presenter window on a secondary display.
#[tauri::command]
pub fn open_presenter_window(
    url: String,
    monitor_index: Option<usize>,
    app: AppHandle,
) -> Result<(), String> {
    if url != "/#/presenter-display" {
        return Err("Presenter window URL is not allowed.".into());
    }

    let monitors = app.available_monitors().map_err(|e| e.to_string())?;
    let target_monitor = monitor_index
        .and_then(|index| monitors.get(index))
        .or_else(|| monitors.first());

    // Close existing presenter window if already open
    if let Some(existing) = app.get_webview_window("presenter") {
        existing.close().map_err(|e| e.to_string())?;
    }

    let window = WebviewWindowBuilder::new(&app, "presenter", WebviewUrl::App(url.into()))
        .title("SolaHub Presenter")
        .fullscreen(false)
        .decorations(false)
        .always_on_top(true)
        .build()
        .map_err(|e| e.to_string())?;

    if let Some(monitor) = target_monitor {
        window
            .set_position(PhysicalPosition::new(
                monitor.position().x,
                monitor.position().y,
            ))
            .map_err(|e| e.to_string())?;
        window
            .set_size(PhysicalSize::new(monitor.size().width, monitor.size().height))
            .map_err(|e| e.to_string())?;
    }

    window.set_fullscreen(true).map_err(|e| e.to_string())
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
