use futures_util::StreamExt;
use reqwest::Client;
use std::fs::{self, File};
use std::io::Write;
use std::path::PathBuf;
use tauri::{AppHandle, Emitter, Manager};
use zip::ZipArchive;

#[derive(Clone, serde::Serialize)]
struct DownloadProgress {
    percentage: f64,
    status: String,
}

fn get_ffmpeg_dir(app: &AppHandle) -> PathBuf {
    let mut path = app
        .path()
        .app_data_dir()
        .unwrap_or_else(|_| PathBuf::from("."));
    path.push("bin");
    path
}

pub fn get_ffmpeg_path(app: &AppHandle) -> PathBuf {
    let mut path = get_ffmpeg_dir(app);
    if cfg!(target_os = "windows") {
        path.push("ffmpeg.exe");
    } else {
        path.push("ffmpeg");
    }
    path
}

pub fn get_ffprobe_path(app: &AppHandle) -> PathBuf {
    let mut path = get_ffmpeg_dir(app);
    if cfg!(target_os = "windows") {
        path.push("ffprobe.exe");
    } else {
        path.push("ffprobe");
    }
    path
}

#[tauri::command]
pub fn check_dependencies(app: AppHandle) -> bool {
    let ffmpeg = get_ffmpeg_path(&app);
    let ffprobe = get_ffprobe_path(&app);
    ffmpeg.exists() && ffprobe.exists()
}

#[tauri::command]
pub async fn download_dependencies(app: AppHandle) -> Result<(), String> {
    if !cfg!(target_os = "windows") {
        return Err(
            "Automatic FFmpeg install is only supported on Windows. Install FFmpeg manually and restart."
                .to_string(),
        );
    }

    let url =
        "https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip";

    let bin_dir = get_ffmpeg_dir(&app);
    if !bin_dir.exists() {
        fs::create_dir_all(&bin_dir).map_err(|e| e.to_string())?;
    }

    let archive_path = bin_dir.join("ffmpeg.zip");

    let client = Client::new();
    let res = client.get(url).send().await.map_err(|e| e.to_string())?;

    if !res.status().is_success() {
        return Err(format!("Download failed with HTTP {}", res.status()));
    }

    let total_size = res.content_length().unwrap_or(0) as f64;

    let mut file = File::create(&archive_path).map_err(|e| e.to_string())?;
    let mut downloaded: f64 = 0.0;
    let mut stream = res.bytes_stream();

    while let Some(chunk) = stream.next().await {
        let chunk = chunk.map_err(|e| e.to_string())?;
        file.write_all(&chunk).map_err(|e| e.to_string())?;
        downloaded += chunk.len() as f64;

        let percentage = if total_size > 0.0 {
            (downloaded / total_size) * 100.0
        } else {
            0.0
        };
        app.emit(
            "download-progress",
            DownloadProgress {
                percentage,
                status: "Downloading FFmpeg...".to_string(),
            },
        )
        .map_err(|e| e.to_string())?;
    }

    app.emit(
        "download-progress",
        DownloadProgress {
            percentage: 100.0,
            status: "Extracting...".to_string(),
        },
    )
    .map_err(|e| e.to_string())?;

    let file = File::open(&archive_path).map_err(|e| e.to_string())?;
    let mut archive = ZipArchive::new(file).map_err(|e| e.to_string())?;

    let mut found_ffmpeg = false;
    let mut found_ffprobe = false;

    for i in 0..archive.len() {
        let mut zip_file = archive.by_index(i).map_err(|e| e.to_string())?;
        let outpath = match zip_file.enclosed_name() {
            Some(path) => path.to_owned(),
            None => continue,
        };

        if outpath.ends_with("ffmpeg.exe") {
            let mut outfile = File::create(bin_dir.join("ffmpeg.exe")).map_err(|e| e.to_string())?;
            std::io::copy(&mut zip_file, &mut outfile).map_err(|e| e.to_string())?;
            found_ffmpeg = true;
        } else if outpath.ends_with("ffprobe.exe") {
            let mut outfile = File::create(bin_dir.join("ffprobe.exe")).map_err(|e| e.to_string())?;
            std::io::copy(&mut zip_file, &mut outfile).map_err(|e| e.to_string())?;
            found_ffprobe = true;
        }
    }

    let _ = fs::remove_file(archive_path);

    if !found_ffmpeg || !found_ffprobe {
        return Err("FFmpeg archive did not contain expected binaries".to_string());
    }

    app.emit(
        "download-progress",
        DownloadProgress {
            percentage: 100.0,
            status: "Done".to_string(),
        },
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}
