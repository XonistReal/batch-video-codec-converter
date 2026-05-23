use crate::conversion_state::ConversionState;
use crate::dependency_manager::{get_ffmpeg_path, get_ffprobe_path};
use regex::Regex;
use std::io::Read;
use std::process::{Command, Stdio};
use std::sync::Arc;
use std::sync::LazyLock;
use std::time::Instant;
use tauri::{AppHandle, Emitter, State};

static TIME_REGEX: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"time=(\d{2}):(\d{2}):(\d{2})\.(\d{2})").expect("valid time regex"));
static SPEED_REGEX: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"speed=\s*([\d.]+)x").expect("valid speed regex"));

#[derive(Clone, serde::Serialize)]
pub struct ConversionProgress {
    pub id: String,
    pub percentage: f64,
    pub status: String,
    pub speed: f64,
    pub current_seconds: f64,
    pub eta_seconds: f64,
}

fn hide_console(cmd: &mut Command) {
    cmd.stdin(Stdio::null());
    cmd.stdout(Stdio::null());

    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        cmd.creation_flags(0x08000000);
    }
}

fn parse_progress_line(
    line: &str,
    duration: f64,
    last_speed: &mut f64,
) -> Option<(f64, f64, f64, f64)> {
    if let Some(caps) = SPEED_REGEX.captures(line) {
        if let Ok(s) = caps.get(1).unwrap().as_str().parse::<f64>() {
            *last_speed = s;
        }
    }

    let caps = TIME_REGEX.captures(line)?;
    let h: f64 = caps.get(1).unwrap().as_str().parse().unwrap_or(0.0);
    let m: f64 = caps.get(2).unwrap().as_str().parse().unwrap_or(0.0);
    let s: f64 = caps.get(3).unwrap().as_str().parse().unwrap_or(0.0);
    let cs: f64 = caps.get(4).unwrap().as_str().parse().unwrap_or(0.0);

    let current_seconds = h * 3600.0 + m * 60.0 + s + cs / 100.0;
    let mut percentage = if duration > 0.0 {
        (current_seconds / duration) * 100.0
    } else {
        0.0
    };
    if percentage > 100.0 {
        percentage = 100.0;
    }

    let eta_seconds = if duration > 0.0 && *last_speed > 0.0 {
        let remaining = (duration - current_seconds).max(0.0);
        remaining / *last_speed
    } else {
        0.0
    };

    Some((percentage, *last_speed, current_seconds, eta_seconds))
}

fn run_get_video_duration(app: &AppHandle, path: String) -> Result<f64, String> {
    let ffprobe = get_ffprobe_path(app);

    let mut cmd = Command::new(&ffprobe);
    cmd.args([
        "-v",
        "error",
        "-show_entries",
        "format=duration",
        "-of",
        "default=noprint_wrappers=1:nokey=1",
        &path,
    ]);
    hide_console(&mut cmd);

    let output = cmd.output().map_err(|e| e.to_string())?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("ffprobe failed: {}", stderr.trim()));
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    stdout
        .trim()
        .parse::<f64>()
        .map_err(|e| format!("Failed to parse duration: {}", e))
}

fn run_start_conversion(
    app: &AppHandle,
    state: &Arc<ConversionState>,
    id: String,
    input: String,
    output: String,
    args: Vec<String>,
    duration: f64,
) -> Result<(), String> {
    let ffmpeg = get_ffmpeg_path(app);

    let mut cmd = Command::new(&ffmpeg);
    cmd.arg("-y").arg("-i").arg(&input);
    for arg in args {
        cmd.arg(arg);
    }
    cmd.arg(&output);

    hide_console(&mut cmd);
    cmd.stderr(Stdio::piped());

    let mut child = cmd.spawn().map_err(|e| e.to_string())?;
    let stderr = child.stderr.take();

    {
        let mut processes = state.processes.lock().map_err(|e| e.to_string())?;
        processes.insert(id.clone(), child);
    }

    if let Some(mut stderr) = stderr {
        let mut buffer = Vec::new();
        let mut byte = [0u8; 1];
        let mut last_speed: f64 = 1.0;
        let mut last_emit = Instant::now();

        // FFmpeg overwrites progress with \r; split on \r and \n (not just newlines).
        while let Ok(n) = stderr.read(&mut byte) {
            if n == 0 {
                break;
            }

            if byte[0] == b'\n' || byte[0] == b'\r' {
                if !buffer.is_empty() {
                    let line = String::from_utf8_lossy(&buffer);
                    if let Some((percentage, speed, current_seconds, eta_seconds)) =
                        parse_progress_line(&line, duration, &mut last_speed)
                    {
                        if last_emit.elapsed().as_millis() > 100 {
                            let _ = app.emit(
                                "conversion-progress",
                                ConversionProgress {
                                    id: id.clone(),
                                    percentage,
                                    status: "Converting...".to_string(),
                                    speed,
                                    current_seconds,
                                    eta_seconds,
                                },
                            );
                            last_emit = Instant::now();
                        }
                    }
                    buffer.clear();
                }
            } else {
                buffer.push(byte[0]);
            }
        }
    }

    let status = {
        let mut processes = state.processes.lock().map_err(|e| e.to_string())?;
        let mut child = processes
            .remove(&id)
            .ok_or_else(|| "Conversion process missing".to_string())?;
        child.wait().map_err(|e| e.to_string())?
    };

    if status.success() {
        let _ = app.emit(
            "conversion-progress",
            ConversionProgress {
                id: id.clone(),
                percentage: 100.0,
                status: "Completed".to_string(),
                speed: 0.0,
                current_seconds: duration,
                eta_seconds: 0.0,
            },
        );
        Ok(())
    } else {
        Err("Conversion failed — check FFmpeg output".to_string())
    }
}

#[tauri::command]
pub async fn get_video_duration(app: AppHandle, path: String) -> Result<f64, String> {
    tokio::task::spawn_blocking(move || run_get_video_duration(&app, path))
        .await
        .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn start_conversion(
    app: AppHandle,
    state: State<'_, Arc<ConversionState>>,
    id: String,
    input: String,
    output: String,
    args: Vec<String>,
    duration: f64,
) -> Result<(), String> {
    let state = Arc::clone(state.inner());
    tokio::task::spawn_blocking(move || {
        run_start_conversion(&app, &state, id, input, output, args, duration)
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub fn cancel_conversion(state: State<'_, Arc<ConversionState>>, id: String) -> Result<(), String> {
    let mut processes = state.processes.lock().map_err(|e| e.to_string())?;
    if let Some(mut child) = processes.remove(&id) {
        child.kill().map_err(|e| e.to_string())?;
        let _ = child.wait();
    }
    Ok(())
}
