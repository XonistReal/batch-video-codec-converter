import { memo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Clock, FileVideo, Loader2, Play, Plus, Trash2 } from 'lucide-react';
import { useStore } from '../../store';
import { formatTime } from '../../lib/formatTime';
import { EmptyState } from './EmptyState';
import { QueueItemRow } from './QueueItemRow';

interface QueuePanelProps {
  isDragging: boolean;
  isProcessing: boolean;
  pendingCount: number;
  convertingCount: number;
  onSelectFiles: () => void;
  onStart: () => void;
  onCancelItem: (id: string) => void;
  totalEta: number;
}

export const QueuePanel = memo(function QueuePanel({
  isDragging,
  isProcessing,
  pendingCount,
  convertingCount,
  onSelectFiles,
  onStart,
  onCancelItem,
  totalEta,
}: QueuePanelProps) {
  const queue = useStore((s) => s.queue);
  const clearQueue = useStore((s) => s.clearQueue);
  const removeFromQueue = useStore((s) => s.removeFromQueue);

  return (
    <motion.main
      initial={{ x: 20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      className="flex-1 glass-panel p-5 flex flex-col overflow-hidden"
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <FileVideo size={20} className="text-indigo-400" />
          Conversion Queue
          {queue.length > 0 && (
            <span className="text-xs font-normal text-gray-400 bg-gray-800/50 px-2 py-0.5 rounded-md">
              {queue.length} {queue.length === 1 ? 'file' : 'files'}
            </span>
          )}
        </h2>
        <div className="flex gap-2">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onSelectFiles}
            className="btn-secondary text-sm flex items-center gap-2"
            type="button"
          >
            <Plus size={14} /> Add Files
          </motion.button>
          {queue.length > 0 && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={clearQueue}
              className="btn-danger text-sm flex items-center gap-2"
              type="button"
            >
              <Trash2 size={14} /> Clear
            </motion.button>
          )}
        </div>
      </div>

      <div
        className={`flex-1 overflow-y-auto pr-1 transition-all ${
          isDragging ? 'bg-indigo-500/5 border-2 border-dashed border-indigo-500/50 rounded-lg' : ''
        }`}
      >
        <AnimatePresence mode="popLayout">
          {queue.length === 0 ? (
            <EmptyState isDragging={isDragging} />
          ) : (
            <div className="space-y-2">
              {queue.map((item, index) => (
                <QueueItemRow
                  key={item.id}
                  item={item}
                  index={index}
                  onRemove={removeFromQueue}
                  onCancel={onCancelItem}
                />
              ))}
            </div>
          )}
        </AnimatePresence>
      </div>

      <div className="mt-4 pt-4 border-t border-indigo-500/10">
        {isProcessing && (convertingCount > 0 || pendingCount > 0) && (
          <p className="text-xs text-gray-400 mb-2 flex items-center justify-center gap-1.5">
            <Clock size={12} className="text-purple-400" />
            Batch ETA:{' '}
            <span className="text-purple-300 font-semibold">
              {totalEta > 0 ? formatTime(totalEta) : 'Calculating…'}
            </span>
          </p>
        )}
        <motion.button
          whileHover={!isProcessing && queue.length > 0 ? { scale: 1.01 } : {}}
          whileTap={!isProcessing && queue.length > 0 ? { scale: 0.99 } : {}}
          onClick={onStart}
          disabled={isProcessing || queue.length === 0 || pendingCount === 0}
          className="btn-primary w-full py-3.5 text-base flex items-center justify-center gap-2 disabled:bg-gray-800 disabled:shadow-none disabled:bg-gradient-to-r disabled:from-gray-700 disabled:to-gray-800"
          type="button"
        >
          {isProcessing ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              Processing {convertingCount}/{queue.length}...
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
  );
});
