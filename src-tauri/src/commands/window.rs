use serde::Serialize;
use tauri::{AppHandle, Manager, Monitor, PhysicalPosition, WebviewUrl, WebviewWindowBuilder};

const PRESENTER_DEFAULT_WIDTH: u32 = 1280;
const PRESENTER_DEFAULT_HEIGHT: u32 = 720;
const PRESENTER_MIN_WIDTH: u32 = 640;
const PRESENTER_MIN_HEIGHT: u32 = 360;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DisplayMonitorInfo {
    name: String,
    width: u32,
    height: u32,
    scale_factor: f64,
    is_primary: bool,
}

/// Return monitor metadata with professional names where the OS exposes them.
#[tauri::command]
pub fn get_display_monitors(app: AppHandle) -> Result<Vec<DisplayMonitorInfo>, String> {
    let monitors = app.available_monitors().map_err(|e| e.to_string())?;
    let primary = app.primary_monitor().map_err(|e| e.to_string())?;
    let system_names = system_display_names();

    Ok(monitors
        .iter()
        .enumerate()
        .map(|(index, monitor)| {
            let size = monitor.size();
            DisplayMonitorInfo {
                name: friendly_monitor_name(
                    monitor.name().map(String::as_str),
                    index,
                    &system_names,
                ),
                width: size.width,
                height: size.height,
                scale_factor: monitor.scale_factor(),
                is_primary: primary
                    .as_ref()
                    .is_some_and(|primary_monitor| same_monitor(monitor, primary_monitor))
                    || (primary.is_none() && index == 0),
            }
        })
        .collect())
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
        .decorations(false)
        .resizable(false)
        .visible(false)
        .always_on_top(true)
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
        window.set_size(monitor_size).map_err(|e| e.to_string())?;
        window
            .set_position(PhysicalPosition::new(position.x, position.y))
            .map_err(|e| e.to_string())?;
    }

    window.set_fullscreen(true).map_err(|e| e.to_string())?;
    let _ = window.set_always_on_top(true);
    window.show().map_err(|e| e.to_string())?;
    let _ = window.set_focus();

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

fn friendly_monitor_name(raw_name: Option<&str>, index: usize, system_names: &[String]) -> String {
    if let Some(name) = raw_name
        .map(str::trim)
        .filter(|name| !is_generic_monitor_name(name))
    {
        return name.to_owned();
    }

    system_names
        .get(index)
        .map(|name| name.trim())
        .filter(|name| !name.is_empty())
        .map(ToOwned::to_owned)
        .unwrap_or_else(|| format!("Display {}", index + 1))
}

fn is_generic_monitor_name(name: &str) -> bool {
    let trimmed = name.trim();
    if trimmed.is_empty() {
        return true;
    }

    let lower = trimmed.to_ascii_lowercase();
    if matches!(lower.as_str(), "monitor" | "display" | "unknown") {
        return true;
    }
    if lower.starts_with("monitor #") {
        return true;
    }
    if let Some(rest) = lower.strip_prefix("monitor ") {
        return rest
            .chars()
            .all(|char| char.is_ascii_digit() || char == '#');
    }

    false
}

fn same_monitor(left: &Monitor, right: &Monitor) -> bool {
    left.position().x == right.position().x
        && left.position().y == right.position().y
        && left.size().width == right.size().width
        && left.size().height == right.size().height
        && (left.scale_factor() - right.scale_factor()).abs() < f64::EPSILON
}

#[cfg(target_os = "macos")]
fn system_display_names() -> Vec<String> {
    let output = std::process::Command::new("system_profiler")
        .args(["SPDisplaysDataType", "-json"])
        .output();
    let Ok(output) = output else {
        return Vec::new();
    };
    if !output.status.success() {
        return Vec::new();
    }

    let Ok(json) = serde_json::from_slice::<serde_json::Value>(&output.stdout) else {
        return Vec::new();
    };
    let Some(gpus) = json
        .get("SPDisplaysDataType")
        .and_then(|value| value.as_array())
    else {
        return Vec::new();
    };

    gpus.iter()
        .flat_map(|gpu| {
            gpu.get("spdisplays_ndrvs")
                .and_then(|value| value.as_array())
                .into_iter()
                .flatten()
        })
        .filter_map(|display| display.get("_name").and_then(|value| value.as_str()))
        .map(str::trim)
        .filter(|name| !name.is_empty())
        .map(ToOwned::to_owned)
        .collect()
}

#[cfg(not(target_os = "macos"))]
fn system_display_names() -> Vec<String> {
    Vec::new()
}

#[cfg(test)]
mod tests {
    use super::{friendly_monitor_name, is_generic_monitor_name};

    #[test]
    fn keeps_professional_monitor_names_from_tauri() {
        let name = friendly_monitor_name(Some("LG UltraFine"), 0, &[]);

        assert_eq!(name, "LG UltraFine");
    }

    #[test]
    fn falls_back_to_system_display_names_for_generic_monitor_labels() {
        let system_names = vec!["Sanctuary Projector".to_string()];
        let name = friendly_monitor_name(Some("Monitor #1"), 0, &system_names);

        assert_eq!(name, "Sanctuary Projector");
    }

    #[test]
    fn uses_stable_display_name_when_no_system_name_is_available() {
        let name = friendly_monitor_name(Some("Unknown"), 1, &[]);

        assert_eq!(name, "Display 2");
    }

    #[test]
    fn detects_generic_monitor_names() {
        assert!(is_generic_monitor_name(""));
        assert!(is_generic_monitor_name("Monitor"));
        assert!(is_generic_monitor_name("Monitor 2"));
        assert!(is_generic_monitor_name("Monitor #3"));
        assert!(is_generic_monitor_name("Unknown"));
        assert!(!is_generic_monitor_name("BenQ Projector"));
    }
}
