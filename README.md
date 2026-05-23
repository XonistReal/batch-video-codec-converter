# RetroBatch — Video Codec Converter

A modern, blazing-fast batch video converter built with **Tauri v2**, **React**, and **Rust**. Specifically designed to solve the codec compatibility issues that plague editors working in **DaVinci Resolve Free** (5K+ H.264 footage, 10-bit imports, "Media Offline" errors), and to provide a beautiful drop-in tool for transcoding into professional editing codecs like **DNxHR** and **ProRes**.

![Platform](https://img.shields.io/badge/Platform-Windows%20%7C%20macOS%20%7C%20Linux-blueviolet)
![Built with](https://img.shields.io/badge/Built%20with-Tauri%20v2%20%2B%20Rust%20%2B%20React-6366f1)
![License](https://img.shields.io/badge/License-MIT-green)

---

## Why This Was Built

Anyone using the free version of **DaVinci Resolve** has been there: you import a beautiful 5K clip from your camera and Resolve refuses to import it with a "Media Offline" error. This is an artificial limitation Blackmagic places on the free version: it cannot decode H.264/H.265 footage above 4K resolution, nor any 10-bit footage.

RetroBatch was made to bypass these limitations with a single click. Drop your footage in, pick the right preset, and get back to editing.

## Features

### Core Conversion
- **Smart Queue System**: Add unlimited files, monitor progress in real-time with accurate per-file and total ETAs, and process them automatically.
- **Frame-Accurate Progress Tracking**: Real-time progress, conversion speed (e.g. 1.4x), and time-remaining estimates for each file in the queue.
- **Editor-Friendly Presets**:
  - H.264 8-bit 4K Downscale (Fix 5K Resolve Free Error)
  - H.264 8-bit Standard
  - DNxHR HQX / SQ / LB
  - ProRes 422 HQ / Proxy
  - H.265 / HEVC

### Advanced Options
- **Video Trimming**: Specify Start/End times to extract clips
- **Audio Extraction**: Pull MP3 audio directly from video
- **Hardware Acceleration**: Auto-detect or manually choose NVENC / AMF / VideoToolbox

### Unique Professional Features
- **Watch Folder (Hot Folder)**: Set a folder to monitor; any video dropped in is automatically added to the queue and converted.
- **LUT Application**: Bake `.cube` color grading LUTs directly into the conversion.
- **NLE Proxy Structure Generation**: Automatically organize output into DaVinci Resolve or Premiere Pro proxy folder structures for instant linking.
- **Smart Auto-Renaming**: Use variables like `{filename}` to dynamically name your output files.

### User Experience
- **Modern Glass-Morphism UI**: Indigo & purple gradient design with smooth Framer Motion animations.
- **Frameless Custom Window**: Native title bar replaced with elegant custom controls (works on Windows, macOS, Linux).
- **Auto-Dependency Manager**: First-launch splash screen downloads and configures FFmpeg automatically. No manual install required.

## Installation

### Option 1: Download the Pre-Built Installer (Recommended)
1. Head to the [Releases](https://github.com/XonistReal/batch-video-codec-converter/releases) page.
2. Download the latest installer for your OS:
   - **Windows**: `retro-converter_x.x.x_x64-setup.exe`
   - **macOS**: `.dmg` (coming soon)
   - **Linux**: `.AppImage` (coming soon)
3. Run the installer. On first launch, the app will automatically download FFmpeg into its app-data folder.

### Option 2: Build from Source

**Prerequisites:**
- [Node.js](https://nodejs.org) 18+
- [Rust](https://www.rust-lang.org/tools/install) (latest stable)
- [Tauri Prerequisites](https://tauri.app/start/prerequisites/) for your OS (WebView2 on Windows, Xcode on macOS, etc.)

**Steps:**
```bash
# Clone the repository
git clone https://github.com/XonistReal/batch-video-codec-converter.git
cd batch-video-codec-converter/tauri-v2-app

# Install frontend dependencies
npm install

# Run in dev mode
npm run tauri dev

# Build production release
npm run tauri build
```

Built executables will appear in `tauri-v2-app/src-tauri/target/release/`.

## Tech Stack

| Layer | Tech |
|-------|------|
| Backend (native, fast) | **Rust** via Tauri v2 |
| Frontend (UI) | **React** + **TypeScript** |
| Styling | **Tailwind CSS** + Custom Glass Morphism |
| State Management | **Zustand** |
| Animations | **Framer Motion** |
| Icons | **Lucide React** |
| Video Engine | **FFmpeg** (auto-downloaded) |
| File Monitoring | **notify** Rust crate |

## Project Structure

```
batch-video-codec-converter/
├── tauri-v2-app/
│   ├── src/                        # React frontend
│   │   ├── App.tsx                 # Splash + entry
│   │   ├── components/MainApp.tsx  # Main UI
│   │   └── store.ts                # Zustand state
│   └── src-tauri/
│       ├── src/
│       │   ├── lib.rs                  # Tauri entry
│       │   ├── ffmpeg.rs               # Conversion engine
│       │   ├── dependency_manager.rs   # FFmpeg auto-installer
│       │   └── watch_folder.rs         # File monitoring
│       └── tauri.conf.json
└── README.md
```

## Contributing

Pull requests welcome! Feel free to open issues for bugs, feature requests, or general discussion.

## License

MIT
