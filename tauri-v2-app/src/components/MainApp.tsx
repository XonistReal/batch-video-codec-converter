import { useCallback, useMemo, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { motion } from 'framer-motion';
import { Film } from 'lucide-react';
import { useStore } from '../store';
import { useWindowControls } from '../hooks/useWindowControls';
import { useDragDrop } from '../hooks/useDragDrop';
import { usePersistSettings } from '../hooks/usePersistSettings';
import { useConversion, useConversionListeners } from '../hooks/useConversion';
import { computeBatchEta, MAX_CONCURRENT_ENCODES } from '../lib/estimateEta';
import { WindowControls } from './WindowControls';
import { HeaderStats } from './HeaderStats';
import { SettingsSidebar } from './SettingsSidebar';
import { QueuePanel } from './QueuePanel';

export default function MainApp() {
  const [isDragging, setIsDragging] = useState(false);

  const queue = useStore((s) => s.queue);
  const addToQueue = useStore((s) => s.addToQueue);
  const watchFolder = useStore((s) => s.watchFolder);
  const watchEnabled = useStore((s) => s.watchEnabled);
  const setWatchEnabled = useStore((s) => s.setWatchEnabled);
  const setOutputDir = useStore((s) => s.setOutputDir);
  const setWatchFolder = useStore((s) => s.setWatchFolder);
  const setLutPath = useStore((s) => s.setLutPath);

  const { isMaximized, minimize, toggleMaximize, close } = useWindowControls();
  const { isProcessing, startQueue, cancelItem } = useConversion();

  useConversionListeners();
  usePersistSettings();

  const handleFilesDropped = useCallback(
    (paths: string[]) => {
      setIsDragging(false);
      addToQueue(paths);
    },
    [addToQueue],
  );

  useDragDrop(handleFilesDropped, setIsDragging);

  const handleSelectFiles = async () => {
    const selected = await open({
      multiple: true,
      filters: [
        {
          name: 'Video',
          extensions: ['mp4', 'mov', 'avi', 'mkv', 'wmv', 'flv', 'webm', 'mxf'],
        },
      ],
    });
    if (Array.isArray(selected)) addToQueue(selected);
    else if (selected) addToQueue([selected]);
  };

  const handleSelectOutputDir = async () => {
    const selected = await open({ directory: true });
    if (selected && !Array.isArray(selected)) setOutputDir(selected);
  };

  const handleSelectLut = async () => {
    const selected = await open({
      filters: [{ name: 'LUT', extensions: ['cube'] }],
    });
    if (selected && !Array.isArray(selected)) setLutPath(selected);
  };

  const handleSelectWatchFolder = async () => {
    const selected = await open({ directory: true });
    if (selected && !Array.isArray(selected)) setWatchFolder(selected);
  };

  const toggleWatchFolder = async () => {
    if (watchEnabled) {
      await invoke('stop_watch_folder');
      setWatchEnabled(false);
    } else {
      if (!watchFolder) return;
      try {
        await invoke('start_watch_folder', { path: watchFolder });
        setWatchEnabled(true);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const completedCount = useMemo(
    () => queue.filter((q) => q.status === 'completed').length,
    [queue],
  );
  const pendingCount = useMemo(() => queue.filter((q) => q.status === 'pending').length, [queue]);
  const convertingCount = useMemo(
    () => queue.filter((q) => q.status === 'converting').length,
    [queue],
  );

  const totalEta = useMemo(
    () => computeBatchEta(queue, MAX_CONCURRENT_ENCODES),
    [queue],
  );

  return (
    <div className="animated-bg h-screen flex flex-col overflow-hidden">
      <motion.header
        data-tauri-drag-region
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="px-6 py-3 border-b border-indigo-500/10 flex items-center justify-between backdrop-blur-sm select-none"
      >
        <div data-tauri-drag-region className="flex items-center gap-3 flex-1">
          <div data-tauri-drag-region className="relative">
            <div
              data-tauri-drag-region
              className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl blur-lg opacity-50"
            />
            <div
              data-tauri-drag-region
              className="relative bg-gradient-to-br from-indigo-500 to-purple-600 p-2 rounded-xl"
            >
              <Film data-tauri-drag-region size={20} className="text-white" />
            </div>
          </div>
          <div data-tauri-drag-region>
            <h1 data-tauri-drag-region className="text-lg font-bold gradient-text leading-tight">
              RetroBatch
            </h1>
            <p data-tauri-drag-region className="text-[10px] text-gray-500 tracking-widest uppercase">
              Video Codec Converter
            </p>
          </div>
        </div>

        <HeaderStats
          convertingCount={convertingCount}
          pendingCount={pendingCount}
          completedCount={completedCount}
          totalEta={totalEta}
          isProcessing={isProcessing}
        />

        <WindowControls
          isMaximized={isMaximized}
          onMinimize={minimize}
          onToggleMaximize={toggleMaximize}
          onClose={close}
        />
      </motion.header>

      <div className="flex-1 flex overflow-hidden p-6 gap-6">
        <SettingsSidebar
          onSelectOutputDir={handleSelectOutputDir}
          onSelectWatchFolder={handleSelectWatchFolder}
          onSelectLut={handleSelectLut}
          onToggleWatch={toggleWatchFolder}
        />

        <QueuePanel
          isDragging={isDragging}
          isProcessing={isProcessing}
          pendingCount={pendingCount}
          convertingCount={convertingCount}
          onSelectFiles={handleSelectFiles}
          onStart={startQueue}
          onCancelItem={cancelItem}
          totalEta={totalEta}
        />
      </div>
    </div>
  );
}
