use tauri::{AppHandle, Emitter};
use std::process::Command;
use std::io::Read;
use regex::Regex;
use crate::dependency_manager::{get_ffmpeg_path, get_ffprobe_path};

#[derive(Clone, serde::Serialize)]
pub struct ConversionProgress {
    pub id: String,
    pub percentage: f64,
    pub status: String,
    pub speed: f64,
    pub current_seconds: f64,
}

#[tauri::command]
pub async fn get_video_duration(app: AppHandle, path: String) -> Result<f64, String> {
    let ffprobe = get_ffprobe_path(&app);

    let mut cmd = Command::new(&ffprobe);
    cmd.args(["-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", &path]);

    #[cfg(target_os = "windows")]
    use std::os::windows::process::CommandExt;
    #[cfg(target_os = "windows")]
    cmd.creation_flags(0x08000000);

    let output = cmd.output().map_err(|e| e.to_string())?;
    let stdout = String::from_utf8_lossy(&output.stdout);
    
    stdout.trim().parse::<f64>().map_err(|e| format!("Failed to parse duration: {}", e))
}

#[tauri::command]
pub async fn start_conversion(app: AppHandle, id: String, input: String, output: String, args: Vec<String>, duration: f64) -> Result<(), String> {
    let ffmpeg = get_ffmpeg_path(&app);

    let mut cmd = Command::new(&ffmpeg);
    cmd.arg("-y").arg("-i").arg(&input);
    
    for arg in args {
        cmd.arg(arg);
    }
    
    cmd.arg(&output);

    #[cfg(target_os = "windows")]
    use std::os::windows::process::CommandExt;
    
    #[cfg(target_os = "windows")]
    cmd.creation_flags(0x08000000);

    cmd.stdout(std::process::Stdio::null());
    cmd.stderr(std::process::Stdio::piped());

    let mut child = cmd.spawn().map_err(|e| e.to_string())?;

    if let Some(mut stderr) = child.stderr.take() {
        let time_regex = Regex::new(r"time=(\d{2}):(\d{2}):(\d{2})\.(\d{2})").unwrap();
        let speed_regex = Regex::new(r"speed=\s*([\d.]+)x").unwrap();

        let mut buffer = Vec::new();
        let mut byte = [0u8; 1];
        let mut last_speed: f64 = 1.0;
        let mut last_emit = std::time::Instant::now();

        // Read byte by byte and split on both \n and \r (FFmpeg uses \r to overwrite same line)
        while let Ok(n) = stderr.read(&mut byte) {
            if n == 0 { break; }
            
            if byte[0] == b'\n' || byte[0] == b'\r' {
                if !buffer.is_empty() {
                    let line = String::from_utf8_lossy(&buffer).to_string();
                    buffer.clear();

                    // Parse speed
                    if let Some(caps) = speed_regex.captures(&line) {
                        if let Ok(s) = caps.get(1).unwrap().as_str().parse::<f64>() {
                            last_speed = s;
                        }
                    }

                    // Parse time
                    if let Some(caps) = time_regex.captures(&line) {
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
                        
                        if percentage > 100.0 { percentage = 100.0; }

                        // Throttle UI updates to ~10/sec to avoid flooding
                        if last_emit.elapsed().as_millis() > 100 {
                            let _ = app.emit("conversion-progress", ConversionProgress {
                                id: id.clone(),
                                percentage,
                                status: "Converting...".to_string(),
                                speed: last_speed,
                                current_seconds,
                            });
                            last_emit = std::time::Instant::now();
                        }
                    }
                }
            } else {
                buffer.push(byte[0]);
            }
        }
    }

    let status = child.wait().map_err(|e| e.to_string())?;
    
    if status.success() {
        let _ = app.emit("conversion-progress", ConversionProgress {
            id: id.clone(),
            percentage: 100.0,
            status: "Completed".to_string(),
            speed: 0.0,
            current_seconds: duration,
        });
        Ok(())
    } else {
        Err("Conversion failed".to_string())
    }
}