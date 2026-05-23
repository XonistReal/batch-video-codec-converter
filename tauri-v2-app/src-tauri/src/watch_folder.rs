use tauri::{AppHandle, Emitter};
use notify::{Watcher, RecursiveMode, EventKind, Config};
use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use std::thread;

pub struct WatchState {
    pub watcher: Option<notify::RecommendedWatcher>,
}

#[derive(Clone, serde::Serialize)]
struct WatchEvent {
    path: String,
}

#[tauri::command]
pub fn start_watch_folder(app: AppHandle, path: String, state: tauri::State<'_, Arc<Mutex<WatchState>>>) -> Result<(), String> {
    let mut state_lock = state.lock().unwrap();

    // Stop existing watcher if any
    if let Some(_) = state_lock.watcher.take() {
        // Automatically dropped and stopped
    }

    let path_buf = PathBuf::from(&path);
    if !path_buf.exists() || !path_buf.is_dir() {
        return Err("Invalid directory path".to_string());
    }

    let app_clone = app.clone();
    
    let mut watcher = notify::recommended_watcher(move |res: Result<notify::Event, notify::Error>| {
        match res {
            Ok(event) => {
                if let EventKind::Create(_) = event.kind {
                    for path in event.paths {
                        if let Some(ext) = path.extension() {
                            let ext_str = ext.to_string_lossy().to_lowercase();
                            if ["mp4", "mov", "avi", "mkv", "wmv", "flv", "webm", "mxf"].contains(&ext_str.as_str()) {
                                let _ = app_clone.emit("watch-folder-event", WatchEvent {
                                    path: path.to_string_lossy().to_string(),
                                });
                            }
                        }
                    }
                }
            },
            Err(e) => log::error!("watch error: {:?}", e),
        }
    }).map_err(|e| e.to_string())?;

    watcher.watch(&path_buf, RecursiveMode::NonRecursive).map_err(|e| e.to_string())?;
    
    state_lock.watcher = Some(watcher);
    
    Ok(())
}

#[tauri::command]
pub fn stop_watch_folder(state: tauri::State<'_, Arc<Mutex<WatchState>>>) -> Result<(), String> {
    let mut state_lock = state.lock().unwrap();
    state_lock.watcher = None;
    Ok(())
}
