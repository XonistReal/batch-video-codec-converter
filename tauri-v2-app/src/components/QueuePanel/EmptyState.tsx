import { motion } from 'framer-motion';
import { FileVideo } from 'lucide-react';

interface EmptyStateProps {
  isDragging: boolean;
}

export function EmptyState({ isDragging }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center h-full text-center"
    >
      <motion.div
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      >
        <FileVideo size={64} className={`mb-4 ${isDragging ? 'text-indigo-400' : 'text-gray-700'}`} />
      </motion.div>
      <p className="text-gray-500 mb-2 text-base">
        {isDragging ? 'Drop videos to add' : 'No videos in queue'}
      </p>
      <p className="text-gray-600 text-sm">Click &quot;Add Files&quot; or drag videos here</p>
    </motion.div>
  );
}
