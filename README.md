# Retro Batch Video Codec Converter

A robust, user-friendly batch video converter tailored specifically for video editors using NLEs like DaVinci Resolve (Free/Studio) and Adobe Premiere Pro. 

It features a **Retro CRT Terminal Theme** with a beautiful pixel-perfect icon.

## Why This Was Made
When dealing with video codecs, editors (especially those using the **Free version of DaVinci Resolve** on Windows) run into artificial limits. Resolve Free cannot import 10-bit H.264/H.265 footage, and it outright refuses to import *any* H.264/H.265 footage with a resolution higher than 4K (e.g., 5K or 6K). 

This tool was created to provide a dead-simple workaround by converting troublesome footage into fully edit-friendly intermediate codecs (like ProRes and DNxHR) or standardizing them back down to Resolve-compatible 8-bit 4K.

## Features
- **Standalone App**: Completely self-contained executable.
- **Batch Conversion**: Drop multiple files in and convert them all simultaneously with reliable ETA tracking.
- **Fix "Media Offline" in Resolve**: A dedicated preset to fix 5K/6K H.264 footage so DaVinci Resolve Free can import it without errors.
- **ProRes & DNxHR**: Convert to massive, uncompressed, buttery-smooth editing codecs like ProRes 422 HQ or DNxHR HQX.
- **Thread-Safe**: The UI remains fully responsive, updating smoothly without freezing during heavy 100GB+ conversions.

## Installation & Usage

**Option 1: Using the Pre-built Standalone App**
1. Simply double-click `RetroConverter.exe` (or `Start_Converter.vbs` depending on your version).
2. Click **Add Videos**.
3. Select your target codec (pay attention to the File Size warnings!).
4. Click **Start Conversion**.

**Option 2: Running via Python**
1. Ensure Python 3.10+ is installed.
2. Ensure you have the `ffmpeg.exe` and `ffprobe.exe` binaries sitting in the same folder as `app.py`.
3. Install dependencies:
   ```cmd
   pip install customtkinter Pillow
   ```
4. Run:
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
   pyinstaller --noconfirm --onedir --windowed --icon "icon.ico" --name "RetroConverter" --add-data "ffmpeg.exe;." --add-data "ffprobe.exe;." --add-data "icon.ico;."  "app.py"
   ```
4. Find your built application inside the newly created `dist/RetroConverter` folder!
