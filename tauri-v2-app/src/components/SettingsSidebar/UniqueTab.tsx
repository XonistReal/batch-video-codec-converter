import { Edit3, Eye, EyeOff, FolderTree, Palette } from 'lucide-react';
import { useStore } from '../../store';

interface UniqueTabProps {
  onSelectWatchFolder: () => void;
  onSelectLut: () => void;
  onToggleWatch: () => void;
}

export function UniqueTab({ onSelectWatchFolder, onSelectLut, onToggleWatch }: UniqueTabProps) {
  const watchFolder = useStore((s) => s.watchFolder);
  const watchEnabled = useStore((s) => s.watchEnabled);
  const lutPath = useStore((s) => s.lutPath);
  const nleProxy = useStore((s) => s.nleProxy);
  const setNleProxy = useStore((s) => s.setNleProxy);
  const renamePattern = useStore((s) => s.renamePattern);
  const setRenamePattern = useStore((s) => s.setRenamePattern);

  return (
    <div className="flex flex-col gap-4">
      <div className="glass-card p-4">
        <div className="section-title">
          {watchEnabled ? (
            <Eye size={12} className="text-green-400 animate-pulse" />
          ) : (
            <EyeOff size={12} />
          )}
          Watch Folder
        </div>
        <div className="flex gap-2 mb-2">
          <input
            readOnly
            value={watchFolder ? watchFolder.split(/[/\\]/).pop() : 'No folder selected'}
            className="input-field text-xs truncate"
          />
          <button onClick={onSelectWatchFolder} className="btn-secondary text-xs" type="button">
            Select
          </button>
        </div>
        <button
          onClick={onToggleWatch}
          disabled={!watchFolder}
          type="button"
          className={`w-full text-xs py-2 rounded-md font-semibold transition-all ${
            watchEnabled
              ? 'bg-red-500/20 border border-red-500/40 text-red-400 hover:bg-red-500/30'
              : 'bg-green-500/20 border border-green-500/40 text-green-400 hover:bg-green-500/30 disabled:opacity-30 disabled:cursor-not-allowed'
          }`}
        >
          {watchEnabled ? '● Watching - Click to Stop' : '○ Start Watching'}
        </button>
      </div>

      <div className="glass-card p-4">
        <div className="section-title">
          <Palette size={12} />
          Color LUT
        </div>
        <button onClick={onSelectLut} className="btn-secondary w-full text-xs justify-start truncate" type="button">
          {lutPath ? lutPath.split(/[/\\]/).pop() : 'Select .cube file...'}
        </button>
      </div>

      <div className="glass-card p-4">
        <div className="section-title">
          <FolderTree size={12} />
          NLE Proxy Structure
        </div>
        <select
          value={nleProxy}
          onChange={(e) => setNleProxy(e.target.value as typeof nleProxy)}
          className="input-field text-xs"
        >
          <option value="none">Disabled</option>
          <option value="resolve">DaVinci Resolve</option>
          <option value="premiere">Premiere Pro</option>
        </select>
      </div>

      <div className="glass-card p-4">
        <div className="section-title">
          <Edit3 size={12} />
          Auto-Rename Pattern
        </div>
        <input
          value={renamePattern}
          onChange={(e) => setRenamePattern(e.target.value)}
          className="input-field text-xs font-mono"
          placeholder="{filename}_converted"
        />
        <p className="text-[10px] text-gray-500 mt-2">
          Variables: <code className="text-indigo-400">{'{filename}'}</code>
        </p>
      </div>
    </div>
  );
}
