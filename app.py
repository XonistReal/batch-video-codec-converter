import customtkinter as ctk
import tkinter as tk
from tkinter import filedialog, messagebox
import os
import sys
import subprocess
import threading
import re
import time
import logging

# Set up logging to capture errors to a file
logging.basicConfig(
    filename='converter.log',
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

ctk.set_appearance_mode("Dark")
ctk.set_default_color_theme("green")

CODEC_PRESETS = {
    "H.264 8-bit 4K Downscale (Fix 5K Resolve Free Error - Small File)": {
        "ext": ".mp4",
        "vcodec": "libx264",
        "args": ["-vf", "scale=3840:2160", "-preset", "slow", "-crf", "22", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "320k"]
    },
    "H.264 8-bit (Standard Resolve Free - Small File)": {
        "ext": ".mp4",
        "vcodec": "libx264",
        "args": ["-preset", "slow", "-crf", "22", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "320k"]
    },
    "H.264 High Quality (Standard MP4 - Small File Size)": {
        "ext": ".mp4",
        "vcodec": "libx264",
        "args": ["-preset", "slow", "-crf", "18", "-c:a", "aac", "-b:a", "320k"]
    },
    "DNxHR HQX (10-bit, 4:2:2 - MASSIVE File Size)": {
        "ext": ".mov",
        "vcodec": "dnxhd",
        "args": ["-profile:v", "dnxhr_hqx", "-pix_fmt", "yuv422p10le", "-c:a", "pcm_s16le"]
    },
    "DNxHR SQ (8-bit, 4:2:2 - MASSIVE File Size)": {
        "ext": ".mov",
        "vcodec": "dnxhd",
        "args": ["-profile:v", "dnxhr_sq", "-pix_fmt", "yuv422p", "-c:a", "pcm_s16le"]
    },
    "DNxHR LB (Proxy - LARGE File Size)": {
        "ext": ".mov",
        "vcodec": "dnxhd",
        "args": ["-profile:v", "dnxhr_lb", "-pix_fmt", "yuv422p", "-c:a", "pcm_s16le"]
    },
    "ProRes 422 HQ (MASSIVE File Size)": {
        "ext": ".mov",
        "vcodec": "prores_ks",
        "args": ["-profile:v", "3", "-c:a", "pcm_s16le"]
    },
    "ProRes 422 Proxy (LARGE File Size)": {
        "ext": ".mov",
        "vcodec": "prores_ks",
        "args": ["-profile:v", "0", "-c:a", "pcm_s16le"]
    },
    "H.265 / HEVC (Standard MP4 - Smallest File Size)": {
        "ext": ".mp4",
        "vcodec": "libx265",
        "args": ["-preset", "slow", "-crf", "22", "-c:a", "aac", "-b:a", "320k"]
    }
}

def get_resource_path(relative_path):
    """ Get absolute path to resource, works for dev and for PyInstaller """
    try:
        # PyInstaller creates a temp folder and stores path in _MEIPASS
        base_path = sys._MEIPASS
    except Exception:
        base_path = os.path.dirname(os.path.abspath(__file__))
    return os.path.join(base_path, relative_path)

def get_ffmpeg_path():
    ext = ".exe" if os.name == 'nt' else ""
    local_bin = get_resource_path(f"ffmpeg{ext}")
    return local_bin if os.path.exists(local_bin) else "ffmpeg"

def get_ffprobe_path():
    ext = ".exe" if os.name == 'nt' else ""
    local_bin = get_resource_path(f"ffprobe{ext}")
    return local_bin if os.path.exists(local_bin) else "ffprobe"

class App(ctk.CTk):
    def __init__(self):
        super().__init__()

        self.title("Batch Video Codec Converter")
        self.geometry("850x650")
        self.minsize(800, 600)
        
        try:
            self.iconbitmap(get_resource_path("icon.ico"))
        except:
            pass

        self.retro_font = ctk.CTkFont(family="Courier New", size=14, weight="bold")
        self.retro_font_large = ctk.CTkFont(family="Courier New", size=16, weight="bold")
        self.retro_font_small = ctk.CTkFont(family="Courier New", size=12, weight="bold")

        self.input_files = []
        self.output_dir = tk.StringVar()
        self.is_converting = False
        self.process = None

        self.grid_columnconfigure(0, weight=1)
        self.grid_rowconfigure(1, weight=1)

        # Top Frame
        self.top_frame = ctk.CTkFrame(self)
        self.top_frame.grid(row=0, column=0, padx=20, pady=(20, 10), sticky="ew")
        self.top_frame.grid_columnconfigure(1, weight=1)

        self.codec_label = ctk.CTkLabel(self.top_frame, text="Target Codec:", font=self.retro_font)
        self.codec_label.grid(row=0, column=0, padx=10, pady=10, sticky="w")
        
        self.codec_combo = ctk.CTkComboBox(self.top_frame, values=list(CODEC_PRESETS.keys()), width=300)
        self.codec_combo.set(list(CODEC_PRESETS.keys())[0])
        self.codec_combo.grid(row=0, column=1, padx=10, pady=10, sticky="w")

        self.out_label = ctk.CTkLabel(self.top_frame, text="Output Folder:", font=self.retro_font)
        self.out_label.grid(row=1, column=0, padx=10, pady=10, sticky="w")

        self.out_entry = ctk.CTkEntry(self.top_frame, textvariable=self.output_dir, placeholder_text="Same as input file by default...")
        self.out_entry.grid(row=1, column=1, padx=10, pady=10, sticky="ew")

        self.out_btn = ctk.CTkButton(self.top_frame, text="Browse", width=80, command=self.browse_output_dir)
        self.out_btn.grid(row=1, column=2, padx=10, pady=10)

        # Middle Frame
        self.mid_frame = ctk.CTkFrame(self)
        self.mid_frame.grid(row=1, column=0, padx=20, pady=10, sticky="nsew")
        self.mid_frame.grid_rowconfigure(1, weight=1)
        self.mid_frame.grid_columnconfigure(0, weight=1)

        self.file_label = ctk.CTkLabel(self.mid_frame, text="Video Files:", font=self.retro_font)
        self.file_label.grid(row=0, column=0, padx=10, pady=5, sticky="w")

        self.file_list_frame = ctk.CTkScrollableFrame(self.mid_frame)
        self.file_list_frame.grid(row=1, column=0, columnspan=2, padx=10, pady=5, sticky="nsew")
        self.file_labels = []

        self.file_action_frame = ctk.CTkFrame(self.mid_frame, fg_color="transparent")
        self.file_action_frame.grid(row=2, column=0, columnspan=2, padx=10, pady=10, sticky="ew")
        
        self.add_btn = ctk.CTkButton(self.file_action_frame, text="Add Videos", command=self.add_files)
        self.add_btn.pack(side="left", padx=(0, 10))

        self.clear_btn = ctk.CTkButton(self.file_action_frame, text="Clear List", fg_color="#C0392B", hover_color="#922B21", command=self.clear_files)
        self.clear_btn.pack(side="left")

        # Bottom Frame
        self.bot_frame = ctk.CTkFrame(self)
        self.bot_frame.grid(row=2, column=0, padx=20, pady=(10, 20), sticky="ew")
        self.bot_frame.grid_columnconfigure(0, weight=1)

        self.status_label = ctk.CTkLabel(self.bot_frame, text="Ready", font=self.retro_font_small)
        self.status_label.grid(row=0, column=0, columnspan=2, padx=10, pady=(10, 0), sticky="w")

        self.eta_label = ctk.CTkLabel(self.bot_frame, text="", font=self.retro_font_small)
        self.eta_label.grid(row=1, column=0, columnspan=2, padx=10, pady=0, sticky="w")

        self.progress_bar = ctk.CTkProgressBar(self.bot_frame)
        self.progress_bar.grid(row=2, column=0, padx=10, pady=10, sticky="ew")
        self.progress_bar.set(0)

        self.convert_btn = ctk.CTkButton(self.bot_frame, text="Start Conversion", font=self.retro_font_large, height=40, command=self.toggle_conversion)
        self.convert_btn.grid(row=2, column=1, padx=10, pady=10)

        self.check_ffmpeg()

    def check_ffmpeg(self):
        ffmpeg_cmd = get_ffmpeg_path()
        try:
            creationflags = subprocess.CREATE_NO_WINDOW if os.name == 'nt' else 0
            subprocess.run([ffmpeg_cmd, "-version"], stdout=subprocess.DEVNULL, stderr=subprocess.PIPE, check=True, creationflags=creationflags)
        except Exception as e:
            logging.error(f"FFmpeg check failed: {e}")
            messagebox.showerror("FFmpeg Not Found", "FFmpeg could not be started.\n\nMake sure ffmpeg.exe is in the application folder.")
            self.convert_btn.configure(state="disabled")

    def browse_output_dir(self):
        d = filedialog.askdirectory()
        if d:
            self.output_dir.set(d)

    def add_files(self):
        files = filedialog.askopenfilenames(
            title="Select Video Files",
            filetypes=[("Video Files", "*.mp4 *.mov *.avi *.mkv *.wmv *.flv *.webm *.mxf"), ("All Files", "*.*")]
        )
        if files:
            for f in files:
                if f not in self.input_files:
                    self.input_files.append(f)
            self.update_file_list()

    def clear_files(self):
        self.input_files.clear()
        self.update_file_list()

    def update_file_list(self):
        for widget in self.file_labels:
            widget.destroy()
        self.file_labels.clear()

        for idx, f in enumerate(self.input_files):
            filename = os.path.basename(f)
            lbl = ctk.CTkLabel(self.file_list_frame, text=filename, anchor="w", justify="left")
            lbl.grid(row=idx, column=0, padx=5, pady=2, sticky="w")
            self.file_labels.append(lbl)

    def toggle_conversion(self):
        if not self.input_files:
            messagebox.showwarning("No Files", "Please add some video files first.")
            return

        if not self.is_converting:
            self.is_converting = True
            self.convert_btn.configure(text="Cancel Conversion", fg_color="#C0392B", hover_color="#922B21")
            self.add_btn.configure(state="disabled")
            self.clear_btn.configure(state="disabled")
            self.out_btn.configure(state="disabled")
            self.codec_combo.configure(state="disabled")
            
            self.thread = threading.Thread(target=self.run_conversion_process, daemon=True)
            self.thread.start()
        else:
            self.cancel_conversion()

    def cancel_conversion(self):
        self.is_converting = False
        if self.process:
            self.process.terminate()
        self.reset_ui_state("Conversion cancelled.")

    def reset_ui_state(self, msg="Ready"):
        self.is_converting = False
        self.convert_btn.configure(text="Start Conversion", fg_color=["#3a7ebf", "#1f538d"], hover_color=["#325882", "#14375e"])
        self.add_btn.configure(state="normal")
        self.clear_btn.configure(state="normal")
        self.out_btn.configure(state="normal")
        self.codec_combo.configure(state="normal")
        self.progress_bar.set(0)
        self.status_label.configure(text=msg)
        self.eta_label.configure(text="")

    def get_video_duration(self, filepath):
        ffprobe_cmd = get_ffprobe_path()
        try:
            creationflags = subprocess.CREATE_NO_WINDOW if os.name == 'nt' else 0
            cmd = [ffprobe_cmd, "-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", filepath]
            result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, creationflags=creationflags)
            return float(result.stdout.strip())
        except Exception as e:
            logging.error(f"Error getting duration for {filepath}: {e}")
            return 0.0

    def time_to_seconds(self, time_str):
        try:
            h, m, s = time_str.split(':')
            return int(h) * 3600 + int(m) * 60 + float(s)
        except Exception:
            return 0.0

    def format_time(self, seconds):
        if seconds < 0:
            return "0s"
        m, s = divmod(int(seconds), 60)
        h, m = divmod(m, 60)
        if h > 0:
            return f"{h}h {m}m {s}s"
        elif m > 0:
            return f"{m}m {s}s"
        else:
            return f"{s}s"

    # --- Thread-Safe UI Update Helpers ---
    def safe_update_progress(self, progress, eta_text):
        self.progress_bar.set(progress)
        self.eta_label.configure(text=eta_text)
        
    def safe_update_status(self, text):
        self.status_label.configure(text=text)
        
    def safe_show_info(self, title, msg):
        messagebox.showinfo(title, msg)
        
    def safe_show_warning(self, title, msg):
        messagebox.showwarning(title, msg)

    def run_conversion_process(self):
        codec_choice = self.codec_combo.get()
        preset = CODEC_PRESETS[codec_choice]
        out_folder = self.output_dir.get()
        ffmpeg_cmd = get_ffmpeg_path()

        total_files = len(self.input_files)
        success_count = 0
        error_count = 0
        
        # Track overall progress by summing durations
        total_duration = 0.0
        durations = []
        for f in self.input_files:
            d = self.get_video_duration(f)
            durations.append(d)
            total_duration += d
            
        overall_start_time = time.time()
        completed_duration = 0.0

        for i, filepath in enumerate(self.input_files):
            if not self.is_converting:
                break
            
            filename = os.path.basename(filepath)
            name, _ = os.path.splitext(filename)
            duration = durations[i]
            
            if out_folder and os.path.isdir(out_folder):
                dest_dir = out_folder
            else:
                dest_dir = os.path.dirname(filepath)
                
            out_filepath = os.path.join(dest_dir, f"{name}_{codec_choice.split()[0]}{preset['ext']}")
            
            if os.path.abspath(out_filepath) == os.path.abspath(filepath):
                out_filepath = os.path.join(dest_dir, f"{name}_converted{preset['ext']}")

            self.after(0, self.safe_update_status, f"Converting ({i+1}/{total_files}): {filename}")
            logging.info(f"Starting conversion for {filename} -> {out_filepath}")
            
            cmd = [ffmpeg_cmd, "-y", "-i", filepath, "-c:v", preset["vcodec"]] + preset["args"] + [out_filepath]
            logging.info(f"Command: {' '.join(cmd)}")

            file_start_time = time.time()
            error_log = []

            try:
                creationflags = subprocess.CREATE_NO_WINDOW if os.name == 'nt' else 0
                self.process = subprocess.Popen(
                    cmd, 
                    stdout=subprocess.DEVNULL, 
                    stderr=subprocess.PIPE, 
                    universal_newlines=True,
                    creationflags=creationflags
                )

                time_regex = re.compile(r"time=(\d{2}:\d{2}:\d{2}\.\d{2})")
                
                last_ui_update = 0
                
                # Read stderr line by line
                for line in self.process.stderr:
                    if not self.is_converting:
                        break
                    
                    # Capture ffmpeg output for debugging
                    error_log.append(line.strip())
                    if len(error_log) > 100:
                        error_log.pop(0)

                    match = time_regex.search(line)
                    if match and duration > 0:
                        now = time.time()
                        # Throttle UI updates to prevent flooding the main thread (every 0.1s)
                        if now - last_ui_update > 0.1:
                            current_time_str = match.group(1)
                            current_sec = self.time_to_seconds(current_time_str)
                            
                            file_progress = min(current_sec / duration, 1.0)
                            overall_progress_sec = completed_duration + current_sec
                            overall_progress = min(overall_progress_sec / total_duration, 1.0) if total_duration > 0 else 0
                            
                            # File ETA
                            file_elapsed = now - file_start_time
                            if file_progress > 0:
                                file_total_est = file_elapsed / file_progress
                                file_eta = file_total_est - file_elapsed
                            else:
                                file_eta = 0
                                
                            # Overall ETA
                            overall_elapsed = now - overall_start_time
                            if overall_progress > 0:
                                overall_total_est = overall_elapsed / overall_progress
                                overall_eta = overall_total_est - overall_elapsed
                            else:
                                overall_eta = 0
                                
                            eta_text = (
                                f"File {i+1} Progress: {int(file_progress*100)}% (ETA: {self.format_time(file_eta)}) | "
                                f"Total ETA: {self.format_time(overall_eta)}"
                            )
                            
                            self.after(0, self.safe_update_progress, overall_progress, eta_text)
                            last_ui_update = now

                self.process.wait()
                
                if self.is_converting:
                    if self.process.returncode != 0:
                        error_count += 1
                        logging.error(f"Error converting {filename}. FFmpeg Output:\n" + "\n".join(error_log))
                    else:
                        success_count += 1
                        logging.info(f"Successfully converted {filename}")
                
            except Exception as e:
                error_count += 1
                logging.error(f"Exception during conversion of {filename}: {e}")
                
            completed_duration += duration
                
        if self.is_converting:
            msg = f"Completed! {success_count} successful."
            if error_count > 0:
                msg += f" {error_count} failed (Check converter.log for details)."
                self.after(0, self.safe_show_warning, "Conversion Errors", f"{error_count} files failed to convert.\nPlease check 'converter.log' in the application folder for detailed error messages.")
            else:
                self.after(0, self.safe_show_info, "Success", f"All {total_files} files converted successfully!")
                
            self.after(0, self.reset_ui_state, msg)

if __name__ == "__main__":
    app = App()
    app.mainloop()
