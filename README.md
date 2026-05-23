# Retro Batch Video Codec Converter

A robust, user-friendly batch video converter tailored specifically for video editors using NLEs like DaVinci Resolve (Free/Studio) and Adobe Premiere Pro. 

It features a **Retro CRT Terminal Theme** with a beautiful pixel-perfect UI.

## How it works
This application serves as a user-friendly interface for the powerful FFmpeg command-line tool, which is used for processing multimedia files such as videos and audio. When you add media files to the queue, the app translates your selections into FFmpeg commands and executes them in the background. The application continuously monitors the conversion progress, providing real-time updates on speed, estimated time remaining, and any errors that may occur. 

## Key Features

- **Smart Queue System**: Add multiple media files to a queue, manage priorities, track progress in real-time, and process them efficiently in the background.
- **Auto-Dependency Management**: Automatically checks for FFmpeg upon launch and guides you through the setup process.
- **Cross-Platform**: Runs natively on Windows, macOS (Apple Silicon & Intel), and Linux.
- **Flexible Format Control**: Seamlessly choose between video/audio containers, resolutions, and high-quality intermediate editing codecs (DNxHR, ProRes).
- **Advanced Options**: Custom advanced configuration for professional editors (coming soon based on your specs!).
- **Theming & Localization**: Retro Dark mode theme, with light and system modes supported, ready for multi-language UI support.
- **Fix "Media Offline" in Resolve**: A dedicated preset to fix 5K/6K H.264 footage so DaVinci Resolve Free can import it without errors.

## Installation & Prerequisites

To keep the application perfectly lightweight and fast, this app **does not** include FFmpeg built-in. You must download it yourself.

1. **Download FFmpeg**: Go to [https://www.ffmpeg.org](https://www.ffmpeg.org) and download the latest build for your operating system.
2. Extract the files and ensure `ffmpeg.exe` and `ffprobe.exe` are placed in the same folder as this application, OR add them to your system's PATH.

## Usage

**Option 1: Using the Standalone App**
1. Simply double-click `RetroBatchConverter.exe` (Windows).
2. Click **Add Videos**.
3. Select your target codec (pay attention to the File Size warnings!).
4. Click **Start Conversion**.

**Option 2: Running via Python**
1. Ensure Python 3.10+ is installed.
2. Install dependencies:
   ```cmd
   pip install customtkinter Pillow
   ```
3. Run:
   ```cmd
   python app.py
   ```

## How to Build the `.exe` from Source
If you want to package the app into a single standalone `.exe` file using PyInstaller:

1. Open a terminal in this directory.
2. Install PyInstaller:
   ```cmd
   pip install pyinstaller
   ```
3. Run the following build command:
   ```cmd
   pyinstaller --noconfirm --onefile --windowed --icon "technology.ico" --name "RetroBatchConverter" --add-data "technology.ico;."  "app.py"
   ```
4. Find your built application inside the newly created `dist` folder!
