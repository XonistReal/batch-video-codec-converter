import { motion } from 'framer-motion';
import { Activity, Clock, Zap } from 'lucide-react';
import { useStore } from '../../store';

export function AdvancedTab() {
  const trimStart = useStore((s) => s.trimStart);
  const setTrimStart = useStore((s) => s.setTrimStart);
  const trimEnd = useStore((s) => s.trimEnd);
  const setTrimEnd = useStore((s) => s.setTrimEnd);
  const extractAudio = useStore((s) => s.extractAudio);
  const setExtractAudio = useStore((s) => s.setExtractAudio);
  const hwAccel = useStore((s) => s.hwAccel);
  const setHwAccel = useStore((s) => s.setHwAccel);

  return (
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
              value={trimStart}
              onChange={(e) => setTrimStart(e.target.value)}
              className="input-field font-mono text-xs"
            />
          </div>
          <div>
            <label className="text-[10px] text-gray-500 uppercase tracking-wider">End</label>
            <input
              type="text"
              placeholder="00:00:00"
              value={trimEnd}
              onChange={(e) => setTrimEnd(e.target.value)}
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
          <div
            className={`w-10 h-5 rounded-full relative transition-colors ${extractAudio ? 'bg-indigo-500' : 'bg-gray-700'}`}
          >
            <motion.div
              className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-md"
              animate={{ left: extractAudio ? '20px' : '2px' }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            />
          </div>
          <span className="text-sm text-gray-300">Extract Audio Only (MP3)</span>
          <input
            type="checkbox"
            checked={extractAudio}
            onChange={(e) => setExtractAudio(e.target.checked)}
            className="sr-only"
          />
        </label>
      </div>

      <div>
        <div className="section-title">
          <Zap size={12} />
          Hardware Acceleration
        </div>
        <select
          value={hwAccel}
          onChange={(e) => setHwAccel(e.target.value as typeof hwAccel)}
          className="input-field text-xs"
        >
          <option value="auto">Auto-detect (NVENC if available)</option>
          <option value="none">None (Software)</option>
          <option value="nvenc">NVIDIA NVENC</option>
          <option value="amf">AMD AMF</option>
          <option value="qsv">Intel Quick Sync</option>
        </select>
        <p className="text-[10px] text-gray-500 mt-1">Applies to H.264 presets only</p>
      </div>
    </motion.div>
  );
}
