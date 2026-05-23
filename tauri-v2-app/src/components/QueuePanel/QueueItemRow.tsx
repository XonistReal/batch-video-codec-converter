import { memo, useState } from 'react';
import { motion } from 'framer-motion';
import { FileVideo, FolderOpen, Square, X } from 'lucide-react';
import { revealItemInDir } from '@tauri-apps/plugin-opener';
import type { QueueItem } from '../../store';
import { formatTime } from '../../lib/formatTime';
import { StatusBadge } from './StatusBadge';

interface QueueItemRowProps {
  item: QueueItem;
  index: number;
  onRemove: (id: string) => void;
  onCancel: (id: string) => void;
}

export const QueueItemRow = memo(function QueueItemRow({
  item,
  index,
  onRemove,
  onCancel,
}: QueueItemRowProps) {
  const [showError, setShowError] = useState(false);

  const revealOutput = async () => {
    if (!item.outputPath) return;
    try {
      await revealItemInDir(item.outputPath);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20, height: 0 }}
      transition={{ duration: 0.2, delay: index * 0.02 }}
      className="glass-card p-3 relative overflow-hidden group"
    >
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
          <div
            className={`p-2 rounded-md ${
              item.status === 'completed'
                ? 'bg-green-500/10'
                : item.status === 'error'
                  ? 'bg-red-500/10'
                  : item.status === 'converting'
                    ? 'bg-indigo-500/10'
                    : 'bg-gray-700/30'
            }`}
          >
            <FileVideo
              size={16}
              className={
                item.status === 'completed'
                  ? 'text-green-400'
                  : item.status === 'error'
                    ? 'text-red-400'
                    : item.status === 'converting'
                      ? 'text-indigo-400'
                      : 'text-gray-500'
              }
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate" title={item.filename}>
              {item.filename}
            </p>
            <p className="text-[10px] text-gray-500 truncate">{item.path}</p>
            {item.status === 'error' && item.errorMessage && (
              <button
                type="button"
                onClick={() => setShowError((v) => !v)}
                className="text-[10px] text-red-400 hover:underline mt-0.5"
              >
                {showError ? 'Hide error' : 'View error'}
              </button>
            )}
            {showError && item.errorMessage && (
              <p className="text-[10px] text-red-300/80 mt-1 font-mono break-all max-h-20 overflow-y-auto">
                {item.errorMessage}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <StatusBadge status={item.status} progress={item.progress} eta={item.eta} />
          {item.status === 'converting' && (
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => onCancel(item.id)}
              className="p-1.5 rounded-md text-gray-500 hover:text-orange-400 hover:bg-orange-500/10 transition-all"
              title="Cancel"
              type="button"
            >
              <Square size={14} />
            </motion.button>
          )}
          {item.status === 'completed' && item.outputPath && (
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={revealOutput}
              className="p-1.5 rounded-md text-gray-500 hover:text-indigo-400 hover:bg-indigo-500/10 transition-all"
              title="Reveal in Explorer"
              type="button"
            >
              <FolderOpen size={14} />
            </motion.button>
          )}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => onRemove(item.id)}
            className="p-1.5 rounded-md text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100"
            type="button"
          >
            <X size={14} />
          </motion.button>
        </div>
      </div>

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
  );
});
