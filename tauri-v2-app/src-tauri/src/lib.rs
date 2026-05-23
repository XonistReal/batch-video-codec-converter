pub mod conversion_state;
pub mod dependency_manager;
pub mod ffmpeg;
pub mod watch_folder;

use conversion_state::ConversionState;
use std::sync::{Arc, Mutex};
use watch_folder::WatchState;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let watch_state = Arc::new(Mutex::new(WatchState { watcher: None }));
    let conversion_state = Arc::new(ConversionState::new());

    tauri::Builder::default()
        .plugin(tauri_plugin_log::Builder::default().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_notification::init())
        .manage(watch_state)
        .manage(conversion_state)
        .invoke_handler(tauri::generate_handler![
            dependency_manager::check_dependencies,
            dependency_manager::download_dependencies,
            ffmpeg::start_conversion,
            ffmpeg::get_video_duration,
            ffmpeg::cancel_conversion,
            watch_folder::start_watch_folder,
            watch_folder::stop_watch_folder,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
