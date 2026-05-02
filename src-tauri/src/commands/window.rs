use tauri::{AppHandle, Manager, PhysicalPosition, PhysicalSize, WebviewUrl, WebviewWindowBuilder};

const PRESENTER_DEFAULT_WIDTH: u32 = 1280;
const PRESENTER_DEFAULT_HEIGHT: u32 = 720;
const PRESENTER_MIN_WIDTH: u32 = 640;
const PRESENTER_MIN_HEIGHT: u32 = 360;
const PRESENTER_MONITOR_MARGIN: u32 = 120;

fn presenter_window_size(monitor_size: PhysicalSize<u32>) -> PhysicalSize<u32> {
    let available_width = monitor_size
        .width
        .saturating_sub(PRESENTER_MONITOR_MARGIN)
        .max(PRESENTER_MIN_WIDTH);
    let available_height = monitor_size
        .height
        .saturating_sub(PRESENTER_MONITOR_MARGIN)
        .max(PRESENTER_MIN_HEIGHT);

    let mut width = PRESENTER_DEFAULT_WIDTH.min(available_width);
    let mut height = (width * 9) / 16;

    if height > available_height {
        height = PRESENTER_DEFAULT_HEIGHT
            .min(available_height)
            .max(PRESENTER_MIN_HEIGHT);
        width = (height * 16) / 9;
    }

    PhysicalSize::new(width, height)
}

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
        .decorations(true)
        .resizable(true)
        .inner_size(
            PRESENTER_DEFAULT_WIDTH as f64,
            PRESENTER_DEFAULT_HEIGHT as f64,
        )
        .min_inner_size(PRESENTER_MIN_WIDTH as f64, PRESENTER_MIN_HEIGHT as f64)
        .build()
        .map_err(|e| e.to_string())?;

    if let Some(monitor) = target_monitor {
        let monitor_size = *monitor.size();
        let position = monitor.position();
        let size = presenter_window_size(monitor_size);
        let x = position.x + ((monitor_size.width.saturating_sub(size.width)) / 2) as i32;
        let y = position.y + ((monitor_size.height.saturating_sub(size.height)) / 2) as i32;

        window.set_size(size).map_err(|e| e.to_string())?;
        window
            .set_position(PhysicalPosition::new(x, y))
            .map_err(|e| e.to_string())?;
    }

    Ok(())
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
        window.set_fullscreen(fullscreen).map_err(|e| e.to_string())
    } else {
        Err("Main window not found".into())
    }
}
