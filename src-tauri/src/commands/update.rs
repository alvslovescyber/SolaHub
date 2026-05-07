use serde::Serialize;
use tauri::{ipc::Channel, AppHandle, Url};
use tauri_plugin_updater::UpdaterExt;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateCheckResult {
    has_update: bool,
    current_version: String,
    available_version: Option<String>,
}

#[tauri::command]
pub async fn check_app_update(app: AppHandle) -> Result<UpdateCheckResult, String> {
    let current_version = app.package_info().version.to_string();
    let Some(public_key) = updater_public_key() else {
        return Ok(UpdateCheckResult {
            has_update: false,
            current_version,
            available_version: None,
        });
    };

    let update = app
        .updater_builder()
        .pubkey(public_key)
        .endpoints(vec![
            Url::parse(&updater_endpoint()).map_err(|error| error.to_string())?
        ])
        .map_err(|error| error.to_string())?
        .build()
        .map_err(|error| error.to_string())?
        .check()
        .await
        .map_err(|error| error.to_string())?;

    Ok(UpdateCheckResult {
        has_update: update.is_some(),
        current_version,
        available_version: update.map(|u| u.version),
    })
}

const DEFAULT_UPDATE_ENDPOINT: &str =
    "https://pub-c5a5d4bded77499abee30a6e8fd383b8.r2.dev/latest.json";

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AppUpdateResult {
    status: AppUpdateStatus,
    current_version: String,
    version: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
enum AppUpdateStatus {
    NotConfigured,
    UpToDate,
}

#[derive(Clone, Serialize)]
#[serde(tag = "event", content = "data")]
pub enum UpdateDownloadEvent {
    #[serde(rename_all = "camelCase")]
    Started {
        content_length: Option<u64>,
    },
    #[serde(rename_all = "camelCase")]
    Progress {
        chunk_length: usize,
    },
    Installing,
    Finished,
}

#[tauri::command]
pub async fn install_app_update(
    app: AppHandle,
    on_event: Channel<UpdateDownloadEvent>,
) -> Result<AppUpdateResult, String> {
    let current_version = app.package_info().version.to_string();
    let Some(public_key) = updater_public_key() else {
        return Ok(AppUpdateResult {
            status: AppUpdateStatus::NotConfigured,
            current_version,
            version: None,
        });
    };

    let update = app
        .updater_builder()
        .pubkey(public_key)
        .endpoints(vec![
            Url::parse(&updater_endpoint()).map_err(|error| error.to_string())?
        ])
        .map_err(|error| error.to_string())?
        .build()
        .map_err(|error| error.to_string())?
        .check()
        .await
        .map_err(|error| error.to_string())?;

    let Some(update) = update else {
        return Ok(AppUpdateResult {
            status: AppUpdateStatus::UpToDate,
            current_version,
            version: None,
        });
    };

    let mut started = false;
    update
        .download_and_install(
            |chunk_length, content_length| {
                if !started {
                    let _ = on_event.send(UpdateDownloadEvent::Started { content_length });
                    started = true;
                }
                let _ = on_event.send(UpdateDownloadEvent::Progress { chunk_length });
            },
            || {
                // Download complete, installation beginning.
                let _ = on_event.send(UpdateDownloadEvent::Installing);
            },
        )
        .await
        .map_err(|error| error.to_string())?;

    // Installation succeeded — signal the UI then give it a moment to render
    // "Restarting" before the process is replaced.
    let _ = on_event.send(UpdateDownloadEvent::Finished);
    tokio::time::sleep(std::time::Duration::from_millis(150)).await;
    app.restart();
}

fn updater_public_key() -> Option<&'static str> {
    option_env!("SOLAHUB_UPDATER_PUBLIC_KEY")
        .map(str::trim)
        .filter(|value| !value.is_empty())
}

fn updater_endpoint() -> String {
    option_env!("SOLAHUB_UPDATER_ENDPOINT")
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .unwrap_or(DEFAULT_UPDATE_ENDPOINT)
        .to_owned()
}
