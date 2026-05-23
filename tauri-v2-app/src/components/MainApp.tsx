import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { open } from '@tauri-apps/plugin-dialog';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Film, Settings as SettingsIcon, Folder, Plus, Trash2, X, Play, 
  Eye, EyeOff, Palette, FolderTree, Edit3, Sparkles, Activity, CheckCircle2,
  AlertCircle, Clock, Loader2, FileVideo, Zap, Minus, Maximize2, Minimize2
} from 'lucide-react';
import { useStore } from '../store';

const CODEC_OPTIONS = [
  { value: "H.264 8-bit 4K Downscale (Fix 5K Resolve Free Error - Small File)", label: "H.264 8-bit 4K Downscale", desc: "Fix 5K Resolve Free Error", size: "small" },
  { value: "H.264 8-bit (Standard Resolve Free - Small File)", label: "H.264 8-bit Standard", desc: "Resolve Free Compatible", size: "small" },
  { value: "H.264 High Quality (Standard MP4 - Small File Size)", label: "H.264 High Quality", desc: "Standard MP4", size: "small" },
  { value: "DNxHR HQX (10-bit, 4:2:2 - MASSIVE File Size)", label: "DNxHR HQX 10-bit", desc: "Editing Codec, 4:2:2", size: "massive" },
  { value: "DNxHR SQ (8-bit, 4:2:2 - MASSIVE File Size)", label: "DNxHR SQ 8-bit", desc: "Editing Codec, 4:2:2", size: "massive" },
  { value: "DNxHR LB (Proxy - LARGE File Size)", label: "DNxHR LB Proxy", desc: "Proxy Editing", size: "large" },
  { value: "ProRes 422 HQ (MASSIVE File Size)", label: "ProRes 422 HQ", desc: "Professional Editing", size: "massive" },
  { value: "ProRes 422 Proxy (LARGE File Size)", label: "ProRes 422 Proxy", desc: "Proxy Editing", size: "large" },
  { value: "H.265 / HEVC (Standard MP4 - Smallest File Size)", label: "H.265 / HEVC", desc: "Smallest File Size", size: "small" }
];

interface ConvProgress {
  id: string;
  percentage: number;
  status: string;
  speed: number;
  current_seconds: number;
}

interface WatchEvent {
  path: string;
}

function formatTime(seconds: number): string {
  if (!seconds || seconds < 0 || !isFinite(seconds)) return '--:--';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function StatusBadge({ status, progress, eta }: { status: string; progress: number; eta?: number }) {
  const config = {
    pending: { color: "text-gray-400 bg-gray-500/10 border-gray-500/30", icon: Clock, label: "Pending" },
    converting: { color: "text-indigo-400 bg-indigo-500/10 border-indigo-500/30", icon: Loader2, label: `${Math.round(progress)}%${eta && eta > 0 ? ` · ${formatTime(eta)}` : ''}` },
    completed: { color: "text-green-400 bg-green-500/10 border-green-500/30", icon: CheckCircle2, label: "Done" },
    error: { color: "text-red-400 bg-red-500/10 border-red-500/30", icon: AlertCircle, label: "Error" }
  }[status] || { color: "text-gray-400 bg-gray-500/10 border-gray-500/30", icon: Clock, label: "Unknown" };

  const Icon = config.icon;
  return (
    <span className={`status-badge border ${config.color}`}>
      <Icon size={12} className={status === 'converting' ? 'animate-spin' : ''} />
      {config.label}
    </span>
  );
}

export default function MainApp() {
  const store = useStore();
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState<'basic' | 'advanced' | 'unique'>('basic');
  const [isDragging, setIsDragging] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const appWindow = getCurrentWindow();

  const handleMinimize = () => appWindow.minimize();
  const handleMaximize = async () => {
    await appWindow.toggleMaximize();
    setIsMaximized(await appWindow.isMaximized());
  };
  const handleClose = () => appWindow.close();

  useEffect(() => {
    appWindow.isMaximized().then(setIsMaximized);
    const unlistenResize = appWindow.onResized(() => {
      appWindow.isMaximized().then(setIsMaximized);
    });
    return () => {
      unlistenResize.then(fn => fn());
    };
  }, []);

  useEffect(() => {
    let unlistenConv: () => void;
    let unlistenWatch: () => void;

    const setupListeners = async () => {
      unlistenConv = await listen<ConvProgress>('conversion-progress', (event) => {
        const { id, percentage, status, speed } = event.payload;
        const item = useStore.getState().queue.find(q => q.id === id);
        
        let eta: number | undefined = undefined;
        if (item && item.duration && speed > 0 && percentage > 0 && percentage < 100) {
          const remainingVideoSeconds = item.duration * (1 - percentage / 100);
          eta = remainingVideoSeconds / speed;
        }
        
        store.updateItemProgress(
          id, 
          percentage, 
          status === 'Completed' ? 'completed' : 'converting',
          speed,
          eta
        );
      });

      unlistenWatch = await listen<WatchEvent>('watch-folder-event', (event) => {
        store.addToQueue([event.payload.path]);
      });
    };

    setupListeners();

    return () => {
      if (unlistenConv) unlistenConv();
      if (unlistenWatch) unlistenWatch();
    };
  }, []);

  const handleSelectFiles = async () => {
    const selected = await open({
      multiple: true,
      filters: [{
        name: 'Video',
        extensions: ['mp4', 'mov', 'avi', 'mkv', 'wmv', 'flv', 'webm', 'mxf']
      }]
    });
    if (Array.isArray(selected)) {
      store.addToQueue(selected);
    } else if (selected) {
      store.addToQueue([selected]);
    }
  };

  const handleSelectOutputDir = async () => {
    const selected = await open({ directory: true });
    if (selected && !Array.isArray(selected)) {
      store.setOutputDir(selected);
    }
  };

  const handleSelectLut = async () => {
    const selected = await open({
      filters: [{ name: 'LUT', extensions: ['cube'] }]
    });
    if (selected && !Array.isArray(selected)) {
      store.setLutPath(selected);
    }
  };

  const handleSelectWatchFolder = async () => {
    const selected = await open({ directory: true });
    if (selected && !Array.isArray(selected)) {
      store.setWatchFolder(selected);
    }
  };

  const toggleWatchFolder = async () => {
    if (store.isWatching) {
      await invoke('stop_watch_folder');
      store.setIsWatching(false);
    } else {
      if (!store.watchFolder) return;
      try {
        await invoke('start_watch_folder', { path: store.watchFolder });
        store.setIsWatching(true);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const startQueue = async () => {
    setIsProcessing(true);
    const pendingItems = store.queue.filter(q => q.status === 'pending');
    
    // Step 1: Fetch durations for all pending items in parallel
    await Promise.all(pendingItems.map(async (item) => {
      try {
        const duration: number = await invoke('get_video_duration', { path: item.path });
        store.updateItemDuration(item.id, duration);
      } catch (err) {
        console.error(`Failed to get duration for ${item.filename}:`, err);
      }
    }));
    
    // Step 2: Convert each item sequentially
    for (const item of pendingItems) {
      try {
        // Get the latest item from store (with duration)
        const currentItem = useStore.getState().queue.find(q => q.id === item.id);
        const duration = currentItem?.duration || 0;
        
        store.updateItemProgress(item.id, 0, 'converting', 0, undefined);
        store.setItemStartTime(item.id, Date.now());
        
        let args: string[] = [];
        
        if (store.targetCodec.includes('DNxHR HQX')) {
           args.push("-c:v", "dnxhd", "-profile:v", "dnxhr_hqx", "-pix_fmt", "yuv422p10le");
        } else if (store.targetCodec.includes('DNxHR SQ')) {
           args.push("-c:v", "dnxhd", "-profile:v", "dnxhr_sq", "-pix_fmt", "yuv422p");
        } else if (store.targetCodec.includes('DNxHR LB')) {
           args.push("-c:v", "dnxhd", "-profile:v", "dnxhr_lb", "-pix_fmt", "yuv422p");
        } else if (store.targetCodec.includes('ProRes 422 HQ')) {
           args.push("-c:v", "prores_ks", "-profile:v", "3");
        } else if (store.targetCodec.includes('ProRes 422 Proxy')) {
           args.push("-c:v", "prores_ks", "-profile:v", "0");
        } else if (store.targetCodec.includes('H.265')) {
           args.push("-c:v", "libx265", "-preset", "slow", "-crf", "22");
        } else if (store.targetCodec.includes('4K Downscale')) {
           args.push("-vf", "scale=3840:2160", "-c:v", "libx264", "-profile:v", "high", "-level", "4.0", "-preset", "slow", "-crf", "22", "-pix_fmt", "yuv420p");
        } else {
           args.push("-c:v", "libx264", "-profile:v", "high", "-level", "4.0", "-preset", "slow", "-crf", "22", "-pix_fmt", "yuv420p");
        }

        if (store.extractAudio) {
           args = ["-vn", "-c:a", "libmp3lame", "-q:a", "2"];
        } else {
           args.push("-c:a", "aac", "-b:a", "320k");
        }

        if (store.trimStart) args.push("-ss", store.trimStart);
        if (store.trimEnd) args.push("-to", store.trimEnd);
        if (store.lutPath) args.push("-vf", `lut3d=${store.lutPath.replace(/\\/g, '/')}`);

        let outExt = store.extractAudio ? '.mp3' : (store.targetCodec.includes('DNxHR') || store.targetCodec.includes('ProRes') ? '.mov' : '.mp4');
        let outName = store.autoRenamePattern.replace('{filename}', item.filename.split('.')[0]) + outExt;
        
        let outDir = store.outputDir || item.path.substring(0, Math.max(item.path.lastIndexOf('/'), item.path.lastIndexOf('\\')));
        
        if (store.proxyMode === 'resolve') {
           outDir += '/Proxy';
        } else if (store.proxyMode === 'premiere') {
           outDir += '/Proxies';
        }
        
        let outPath = `${outDir}/${outName}`;

        await invoke('start_conversion', {
          id: item.id,
          input: item.path,
          output: outPath,
          args: args,
          duration: duration
        });
      } catch (err) {
        store.updateItemProgress(item.id, 0, 'error');
        console.error(err);
      }
    }
    setIsProcessing(false);
  };

  // Calculate total ETA across all converting + pending items
  const totalEta = (() => {
    const queue = store.queue;
    let total = 0;
    let hasEstimate = false;
    
    for (const item of queue) {
      if (item.status === 'converting' && item.eta && item.eta > 0) {
        total += item.eta;
        hasEstimate = true;
      } else if (item.status === 'pending' && item.duration) {
        // Estimate based on the average speed of converting items, or 1x
        const convertingItems = queue.filter(q => q.status === 'converting' && q.speed && q.speed > 0);
        const avgSpeed = convertingItems.length > 0 
          ? convertingItems.reduce((sum, q) => sum + (q.speed || 1), 0) / convertingItems.length
          : 1;
        total += item.duration / avgSpeed;
        hasEstimate = true;
      } else if (item.status === 'pending' && !item.duration) {
        // Unknown, can't estimate
      }
    }
    
    return hasEstimate ? total : 0;
  })();

  const completedCount = store.queue.filter(q => q.status === 'completed').length;
  const pendingCount = store.queue.filter(q => q.status === 'pending').length;
  const convertingCount = store.queue.filter(q => q.status === 'converting').length;

  return (
    <div className="animated-bg h-screen flex flex-col overflow-hidden">
      {/* Header */}
      <motion.header 
        data-tauri-drag-region
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="px-6 py-3 border-b border-indigo-500/10 flex items-center justify-between backdrop-blur-sm select-none"
      >
        <div data-tauri-drag-region className="flex items-center gap-3 flex-1">
          <div data-tauri-drag-region className="relative">
            <div data-tauri-drag-region className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl blur-lg opacity-50"></div>
            <div data-tauri-drag-region className="relative bg-gradient-to-br from-indigo-500 to-purple-600 p-2 rounded-xl">
              <Film data-tauri-drag-region size={20} className="text-white" />
            </div>
          </div>
          <div data-tauri-drag-region>
            <h1 data-tauri-drag-region className="text-lg font-bold gradient-text leading-tight">RetroBatch</h1>
            <p data-tauri-drag-region className="text-[10px] text-gray-500 tracking-widest uppercase">Video Codec Converter</p>
          </div>
        </div>

          <div data-tauri-drag-region className="flex items-center gap-6 pointer-events-none">
            <motion.div 
              data-tauri-drag-region
              className="flex items-center gap-2 text-sm"
              animate={convertingCount > 0 ? { scale: [1, 1.05, 1] } : {}}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Activity data-tauri-drag-region size={14} className={convertingCount > 0 ? "text-indigo-400" : "text-gray-500"} />
              <span data-tauri-drag-region className="text-gray-400">{convertingCount} converting</span>
            </motion.div>
            <div data-tauri-drag-region className="flex items-center gap-2 text-sm">
              <Clock data-tauri-drag-region size={14} className="text-yellow-400" />
              <span data-tauri-drag-region className="text-gray-400">{pendingCount} pending</span>
            </div>
            <div data-tauri-drag-region className="flex items-center gap-2 text-sm">
              <CheckCircle2 data-tauri-drag-region size={14} className="text-green-400" />
              <span data-tauri-drag-region className="text-gray-400">{completedCount} done</span>
            </div>
            {totalEta > 0 && (
              <div data-tauri-drag-region className="flex items-center gap-2 text-sm pl-4 ml-2 border-l border-indigo-500/20">
                <Zap data-tauri-drag-region size={14} className="text-purple-400" />
                <span data-tauri-drag-region className="text-purple-300 font-semibold">{formatTime(totalEta)} total</span>
              </div>
            )}
          </div>

        {/* Window Controls */}
        <div className="flex items-center gap-1">
          <button 
            onClick={handleMinimize}
            className="w-9 h-9 flex items-center justify-center rounded-md text-gray-400 hover:bg-white/10 hover:text-white transition-colors"
            title="Minimize"
          >
            <Minus size={15} />
          </button>
          <button 
            onClick={handleMaximize}
            className="w-9 h-9 flex items-center justify-center rounded-md text-gray-400 hover:bg-white/10 hover:text-white transition-colors"
            title={isMaximized ? "Restore" : "Maximize"}
          >
            {isMaximized ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
          <button 
            onClick={handleClose}
            className="w-9 h-9 flex items-center justify-center rounded-md text-gray-400 hover:bg-red-500 hover:text-white transition-colors"
            title="Close"
          >
            <X size={15} />
          </button>
        </div>
      </motion.header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden p-6 gap-6">
        {/* Left Sidebar - Settings */}
        <motion.aside 
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="w-96 glass-panel p-5 overflow-y-auto flex flex-col gap-4"
        >
          {/* Tabs */}
          <div className="flex gap-1 p-1 bg-black/30 rounded-lg">
            {[
              { id: 'basic', label: 'Basic', icon: SettingsIcon },
              { id: 'advanced', label: 'Advanced', icon: Sparkles },
              { id: 'unique', label: 'Unique', icon: Zap }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-xs font-semibold transition-all ${
                    activeTab === tab.id 
                      ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg' 
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon size={14} />
                  {tab.label}
                </button>
              );
            })}
          </div>

          <AnimatePresence mode="wait">
            {activeTab === 'basic' && (
              <motion.div
                key="basic"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col gap-4"
              >
                {/* Codec Selector */}
                <div>
                  <div className="section-title">
                    <Film size={12} />
                    Target Codec
                  </div>
                  <div className="space-y-1.5">
                    {CODEC_OPTIONS.map((codec) => (
                      <motion.button
                        key={codec.value}
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        onClick={() => store.setTargetCodec(codec.value)}
                        className={`w-full text-left p-3 rounded-lg transition-all border ${
                          store.targetCodec === codec.value
                            ? 'bg-gradient-to-r from-indigo-500/20 to-purple-500/20 border-indigo-400/50'
                            : 'bg-black/30 border-gray-700/30 hover:border-gray-600/50'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="text-sm font-semibold text-white">{codec.label}</div>
                            <div className="text-xs text-gray-400 mt-0.5">{codec.desc}</div>
                          </div>
                          <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                            codec.size === 'small' ? 'bg-green-500/20 text-green-400' :
                            codec.size === 'large' ? 'bg-yellow-500/20 text-yellow-400' :
                            'bg-red-500/20 text-red-400'
                          }`}>{codec.size}</span>
                        </div>
                      </motion.button>
                    ))}
                  </div>
                </div>

                {/* Output Folder */}
                <div>
                  <div className="section-title">
                    <Folder size={12} />
                    Output Directory
                  </div>
                  <div className="flex gap-2">
                    <input 
                      readOnly 
                      value={store.outputDir || 'Same as source'} 
                      className="input-field text-xs truncate"
                    />
                    <button onClick={handleSelectOutputDir} className="btn-secondary text-xs">
                      Browse
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'advanced' && (
              <motion.div
                key="advanced"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col gap-4"
              >
                <div>
                  <div className="section-title">
                    <Clock size={12} />
                    Video Trimming
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-gray-500 uppercase tracking-wider">Start</label>
                      <input 
                        type="text" 
                        placeholder="00:00:00" 
                        value={store.trimStart} 
                        onChange={e => store.setTrimStart(e.target.value)} 
                        className="input-field font-mono text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-500 uppercase tracking-wider">End</label>
                      <input 
                        type="text" 
                        placeholder="00:00:00" 
                        value={store.trimEnd} 
                        onChange={e => store.setTrimEnd(e.target.value)} 
                        className="input-field font-mono text-xs"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <div className="section-title">
                    <Activity size={12} />
                    Audio Options
                  </div>
                  <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg bg-black/30 border border-gray-700/30 hover:border-gray-600/50 transition-all">
                    <div className={`w-10 h-5 rounded-full relative transition-colors ${store.extractAudio ? 'bg-indigo-500' : 'bg-gray-700'}`}>
                      <motion.div 
                        className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-md"
                        animate={{ left: store.extractAudio ? '20px' : '2px' }}
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                      />
                    </div>
                    <span className="text-sm text-gray-300">Extract Audio Only (MP3)</span>
                    <input type="checkbox" checked={store.extractAudio} onChange={e => store.setExtractAudio(e.target.checked)} className="sr-only" />
                  </label>
                </div>

                <div>
                  <div className="section-title">
                    <Zap size={12} />
                    Hardware Acceleration
                  </div>
                  <select 
                    value={store.hwAccel} 
                    onChange={e => store.setHwAccel(e.target.value)} 
                    className="input-field text-xs"
                  >
                    <option value="auto">Auto-detect</option>
                    <option value="none">None (Software)</option>
                    <option value="nvenc">NVIDIA NVENC</option>
                    <option value="amf">AMD AMF</option>
                    <option value="videotoolbox">Apple VideoToolbox</option>
                  </select>
                </div>
              </motion.div>
            )}

            {activeTab === 'unique' && (
              <motion.div
                key="unique"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col gap-4"
              >
                {/* Watch Folder */}
                <div className="glass-card p-4">
                  <div className="section-title">
                    {store.isWatching ? <Eye size={12} className="text-green-400 animate-pulse" /> : <EyeOff size={12} />}
                    Watch Folder
                  </div>
                  <div className="flex gap-2 mb-2">
                    <input 
                      readOnly 
                      value={store.watchFolder ? store.watchFolder.split(/[/\\]/).pop() : 'No folder selected'} 
                      className="input-field text-xs truncate"
                    />
                    <button onClick={handleSelectWatchFolder} className="btn-secondary text-xs">
                      Select
                    </button>
                  </div>
                  <button 
                    onClick={toggleWatchFolder}
                    disabled={!store.watchFolder}
                    className={`w-full text-xs py-2 rounded-md font-semibold transition-all ${
                      store.isWatching 
                        ? 'bg-red-500/20 border border-red-500/40 text-red-400 hover:bg-red-500/30' 
                        : 'bg-green-500/20 border border-green-500/40 text-green-400 hover:bg-green-500/30 disabled:opacity-30 disabled:cursor-not-allowed'
                    }`}
                  >
                    {store.isWatching ? '● Watching - Click to Stop' : '○ Start Watching'}
                  </button>
                </div>

                {/* LUT */}
                <div className="glass-card p-4">
                  <div className="section-title">
                    <Palette size={12} />
                    Color LUT
                  </div>
                  <button onClick={handleSelectLut} className="btn-secondary w-full text-xs justify-start truncate">
                    {store.lutPath ? store.lutPath.split(/[/\\]/).pop() : 'Select .cube file...'}
                  </button>
                </div>

                {/* Proxy Mode */}
                <div className="glass-card p-4">
                  <div className="section-title">
                    <FolderTree size={12} />
                    NLE Proxy Structure
                  </div>
                  <select 
                    value={store.proxyMode} 
                    onChange={e => store.setProxyMode(e.target.value)} 
                    className="input-field text-xs"
                  >
                    <option value="none">Disabled</option>
                    <option value="resolve">DaVinci Resolve</option>
                    <option value="premiere">Premiere Pro</option>
                  </select>
                </div>

                {/* Auto Rename */}
                <div className="glass-card p-4">
                  <div className="section-title">
                    <Edit3 size={12} />
                    Auto-Rename Pattern
                  </div>
                  <input 
                    value={store.autoRenamePattern} 
                    onChange={e => store.setAutoRenamePattern(e.target.value)} 
                    className="input-field text-xs font-mono"
                    placeholder="{filename}_converted"
                  />
                  <p className="text-[10px] text-gray-500 mt-2">
                    Variables: <code className="text-indigo-400">{'{filename}'}</code>
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.aside>

        {/* Right - Queue */}
        <motion.main 
          initial={{ x: 20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="flex-1 glass-panel p-5 flex flex-col overflow-hidden"
        >
          {/* Queue Header */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <FileVideo size={20} className="text-indigo-400" />
              Conversion Queue
              {store.queue.length > 0 && (
                <span className="text-xs font-normal text-gray-400 bg-gray-800/50 px-2 py-0.5 rounded-md">
                  {store.queue.length} {store.queue.length === 1 ? 'file' : 'files'}
                </span>
              )}
            </h2>
            <div className="flex gap-2">
              <motion.button 
                whileHover={{ scale: 1.05 }} 
                whileTap={{ scale: 0.95 }}
                onClick={handleSelectFiles} 
                className="btn-secondary text-sm flex items-center gap-2"
              >
                <Plus size={14} /> Add Files
              </motion.button>
              {store.queue.length > 0 && (
                <motion.button 
                  whileHover={{ scale: 1.05 }} 
                  whileTap={{ scale: 0.95 }}
                  onClick={store.clearQueue} 
                  className="btn-danger text-sm flex items-center gap-2"
                >
                  <Trash2 size={14} /> Clear
                </motion.button>
              )}
            </div>
          </div>

          {/* Queue Items */}
          <div 
            className={`flex-1 overflow-y-auto pr-1 transition-all ${isDragging ? 'bg-indigo-500/5 border-2 border-dashed border-indigo-500/50 rounded-lg' : ''}`}
            onDragEnter={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragOver={(e) => e.preventDefault()}
            onDragLeave={() => setIsDragging(false)}
            onDrop={() => setIsDragging(false)}
          >
            <AnimatePresence mode="popLayout">
              {store.queue.length === 0 ? (
                <motion.div 
                  initial={{ opacity: 0 }} 
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center h-full text-center"
                >
                  <motion.div
                    animate={{ y: [0, -10, 0] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <FileVideo size={64} className="text-gray-700 mb-4" />
                  </motion.div>
                  <p className="text-gray-500 mb-2 text-base">No videos in queue</p>
                  <p className="text-gray-600 text-sm">Click "Add Files" or drag videos here</p>
                </motion.div>
              ) : (
                <div className="space-y-2">
                  {store.queue.map((item, index) => (
                    <motion.div
                      key={item.id}
                      layout
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20, height: 0 }}
                      transition={{ duration: 0.2, delay: index * 0.02 }}
                      className="glass-card p-3 relative overflow-hidden group"
                    >
                      {/* Progress background */}
                      {item.status === 'converting' && (
                        <motion.div 
                          className="absolute inset-y-0 left-0 bg-gradient-to-r from-indigo-500/10 to-purple-500/10"
                          initial={{ width: 0 }}
                          animate={{ width: `${item.progress}%` }}
                          transition={{ duration: 0.3 }}
                        />
                      )}
                      
                      <div className="relative z-10 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className={`p-2 rounded-md ${
                            item.status === 'completed' ? 'bg-green-500/10' :
                            item.status === 'error' ? 'bg-red-500/10' :
                            item.status === 'converting' ? 'bg-indigo-500/10' :
                            'bg-gray-700/30'
                          }`}>
                            <FileVideo size={16} className={
                              item.status === 'completed' ? 'text-green-400' :
                              item.status === 'error' ? 'text-red-400' :
                              item.status === 'converting' ? 'text-indigo-400' :
                              'text-gray-500'
                            } />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate" title={item.filename}>
                              {item.filename}
                            </p>
                            <p className="text-[10px] text-gray-500 truncate">{item.path}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2 shrink-0">
                          <StatusBadge status={item.status} progress={item.progress} eta={item.eta} />
                          <motion.button 
                            whileHover={{ scale: 1.1 }} 
                            whileTap={{ scale: 0.9 }}
                            onClick={() => store.removeFromQueue(item.id)} 
                            className="p-1.5 rounded-md text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100"
                          >
                            <X size={14} />
                          </motion.button>
                        </div>
                      </div>

                      {/* Inline progress bar for converting items */}
                      {item.status === 'converting' && (
                        <div className="relative mt-2 z-10">
                          <div className="h-1 bg-gray-800/50 rounded-full overflow-hidden">
                            <motion.div
                              className="h-full bg-gradient-to-r from-indigo-500 to-purple-500"
                              initial={{ width: 0 }}
                              animate={{ width: `${item.progress}%` }}
                              transition={{ duration: 0.3 }}
                            />
                          </div>
                          {(item.speed || item.eta) && (
                            <div className="flex justify-between mt-1 text-[10px] text-gray-500">
                              <span>{item.speed ? `${item.speed.toFixed(2)}x speed` : ''}</span>
                              <span>{item.eta ? `${formatTime(item.eta)} remaining` : ''}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
              )}
            </AnimatePresence>
          </div>

          {/* Bottom Action Bar */}
          <div className="mt-4 pt-4 border-t border-indigo-500/10">
            <motion.button 
              whileHover={!isProcessing && store.queue.length > 0 ? { scale: 1.01 } : {}}
              whileTap={!isProcessing && store.queue.length > 0 ? { scale: 0.99 } : {}}
              onClick={startQueue}
              disabled={isProcessing || store.queue.length === 0 || pendingCount === 0}
              className="btn-primary w-full py-3.5 text-base flex items-center justify-center gap-2 disabled:bg-gray-800 disabled:shadow-none disabled:bg-gradient-to-r disabled:from-gray-700 disabled:to-gray-800"
            >
              {isProcessing ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Processing {convertingCount}/{store.queue.length}...
                </>
              ) : (
                <>
                  <Play size={18} fill="currentColor" />
                  Start Conversion ({pendingCount} pending)
                </>
              )}
            </motion.button>
          </div>
        </motion.main>
      </div>
    </div>
  );
}
