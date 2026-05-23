import { Minus, Maximize2, Minimize2, X } from 'lucide-react';

interface WindowControlsProps {
  isMaximized: boolean;
  onMinimize: () => void;
  onToggleMaximize: () => void;
  onClose: () => void;
}

export function WindowControls({
  isMaximized,
  onMinimize,
  onToggleMaximize,
  onClose,
}: WindowControlsProps) {
  return (
    <div className="flex items-center gap-1">
      <button
        onClick={onMinimize}
        className="w-9 h-9 flex items-center justify-center rounded-md text-gray-400 hover:bg-white/10 hover:text-white transition-colors"
        title="Minimize"
        type="button"
      >
        <Minus size={15} />
      </button>
      <button
        onClick={onToggleMaximize}
        className="w-9 h-9 flex items-center justify-center rounded-md text-gray-400 hover:bg-white/10 hover:text-white transition-colors"
        title={isMaximized ? 'Restore' : 'Maximize'}
        type="button"
      >
        {isMaximized ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
      </button>
      <button
        onClick={onClose}
        className="w-9 h-9 flex items-center justify-center rounded-md text-gray-400 hover:bg-red-500 hover:text-white transition-colors"
        title="Close"
        type="button"
      >
        <X size={15} />
      </button>
    </div>
  );
}
