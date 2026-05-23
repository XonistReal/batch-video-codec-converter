import { memo } from 'react';
import { motion } from 'framer-motion';
import { Activity, CheckCircle2, Clock, Zap } from 'lucide-react';
import { formatTime } from '../lib/formatTime';

interface HeaderStatsProps {
  convertingCount: number;
  pendingCount: number;
  completedCount: number;
  totalEta: number;
  isProcessing: boolean;
}

export const HeaderStats = memo(function HeaderStats({
  convertingCount,
  pendingCount,
  completedCount,
  totalEta,
  isProcessing,
}: HeaderStatsProps) {
  const showBatchEta = isProcessing && (convertingCount > 0 || pendingCount > 0);
  return (
    <div data-tauri-drag-region className="flex items-center gap-6 pointer-events-none">
      <motion.div
        data-tauri-drag-region
        className="flex items-center gap-2 text-sm"
        animate={convertingCount > 0 ? { scale: [1, 1.05, 1] } : {}}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <Activity
          data-tauri-drag-region
          size={14}
          className={convertingCount > 0 ? 'text-indigo-400' : 'text-gray-500'}
        />
        <span data-tauri-drag-region className="text-gray-400">
          {convertingCount} converting
        </span>
      </motion.div>
      <div data-tauri-drag-region className="flex items-center gap-2 text-sm">
        <Clock data-tauri-drag-region size={14} className="text-yellow-400" />
        <span data-tauri-drag-region className="text-gray-400">
          {pendingCount} pending
        </span>
      </div>
      <div data-tauri-drag-region className="flex items-center gap-2 text-sm">
        <CheckCircle2 data-tauri-drag-region size={14} className="text-green-400" />
        <span data-tauri-drag-region className="text-gray-400">
          {completedCount} done
        </span>
      </div>
      {showBatchEta && (
        <div
          data-tauri-drag-region
          className="flex items-center gap-2 text-sm pl-4 ml-2 border-l border-indigo-500/20"
        >
          <Zap data-tauri-drag-region size={14} className="text-purple-400" />
          <span data-tauri-drag-region className="text-purple-300 font-semibold">
            {totalEta > 0 ? `${formatTime(totalEta)} left` : 'Calculating…'}
          </span>
        </div>
      )}
    </div>
  );
});
