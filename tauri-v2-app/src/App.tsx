import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, Zap, Film } from 'lucide-react';
import MainApp from './components/MainApp';

interface ProgressEvent {
  percentage: number;
  status: string;
}

function App() {
  const [isReady, setIsReady] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('Initializing system...');
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    let unlisten: (() => void) | undefined;

    const checkDeps = async () => {
      try {
        const hasDeps: boolean = await invoke('check_dependencies');
        if (hasDeps) {
          setStatus('All systems ready');
          setProgress(100);
          setTimeout(() => setIsReady(true), 600);
        } else {
          setIsDownloading(true);
          setStatus('Downloading FFmpeg binaries...');

          unlisten = await listen<ProgressEvent>('download-progress', (event) => {
            setProgress(event.payload.percentage);
            setStatus(event.payload.status);
          });

          await invoke('download_dependencies');
          setStatus('Ready to convert');
          setTimeout(() => setIsReady(true), 800);
        }
      } catch (err) {
        setStatus(`Error: ${err}`);
      }
    };

    checkDeps();

    return () => {
      if (unlisten) unlisten();
    };
  }, []);

  return (
    <AnimatePresence mode="wait">
      {!isReady ? (
        <motion.div
          key="splash"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.5 }}
          className="animated-bg flex flex-col items-center justify-center h-screen relative"
          data-tauri-drag-region
        >
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            className="relative mb-8"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl blur-2xl opacity-50" />
            <div className="relative bg-gradient-to-br from-indigo-500 to-purple-600 p-6 rounded-3xl shadow-2xl">
              <Film size={64} className="text-white" />
            </div>
          </motion.div>

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-center mb-12"
          >
            <h1 className="text-5xl font-bold gradient-text mb-2">RetroBatch</h1>
            <p className="text-sm text-gray-400 tracking-widest uppercase">Video Codec Converter</p>
          </motion.div>

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="w-96 glass-panel p-6"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                {isDownloading ? (
                  <Download size={16} className="text-indigo-400 animate-bounce" />
                ) : (
                  <Zap size={16} className="text-green-400" />
                )}
                <span className="text-sm font-medium text-gray-300">{status}</span>
              </div>
              <span className="text-xs text-gray-500 font-mono">{Math.round(progress)}%</span>
            </div>
            <div className="relative h-2 bg-gray-800 rounded-full overflow-hidden">
              <motion.div
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
              />
              <div className="absolute inset-0 shimmer-effect overflow-hidden" />
            </div>
            <p className="text-[10px] text-gray-600 mt-3 text-center tracking-wider uppercase">
              Auto-Dependency Manager Active
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="absolute bottom-8 text-xs text-gray-600"
          >
            v2.0.5 • Built with Tauri v2
          </motion.div>
        </motion.div>
      ) : (
        <motion.div
          key="main"
          initial={{ opacity: 0, scale: 1.05 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
        >
          <MainApp />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default App;
