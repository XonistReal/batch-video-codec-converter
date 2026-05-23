import { motion } from 'framer-motion';
import { Film, Folder } from 'lucide-react';
import { useStore } from '../../store';
import { CODEC_OPTIONS } from '../../lib/codecPresets';

interface BasicTabProps {
  onSelectOutputDir: () => void;
}

export function BasicTab({ onSelectOutputDir }: BasicTabProps) {
  const targetCodec = useStore((s) => s.targetCodec);
  const setTargetCodec = useStore((s) => s.setTargetCodec);
  const outputDir = useStore((s) => s.outputDir);

  return (
    <motion.div
      key="basic"
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 10 }}
      transition={{ duration: 0.2 }}
      className="flex flex-col gap-4"
    >
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
              onClick={() => setTargetCodec(codec.value)}
              type="button"
              className={`w-full text-left p-3 rounded-lg transition-all border ${
                targetCodec === codec.value
                  ? 'bg-gradient-to-r from-indigo-500/20 to-purple-500/20 border-indigo-400/50'
                  : 'bg-black/30 border-gray-700/30 hover:border-gray-600/50'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-sm font-semibold text-white">{codec.label}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{codec.desc}</div>
                </div>
                <span
                  className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                    codec.size === 'small'
                      ? 'bg-green-500/20 text-green-400'
                      : codec.size === 'large'
                        ? 'bg-yellow-500/20 text-yellow-400'
                        : 'bg-red-500/20 text-red-400'
                  }`}
                >
                  {codec.size}
                </span>
              </div>
            </motion.button>
          ))}
        </div>
      </div>

      <div>
        <div className="section-title">
          <Folder size={12} />
          Output Directory
        </div>
        <div className="flex gap-2">
          <input
            readOnly
            value={outputDir || 'Same as source'}
            className="input-field text-xs truncate"
          />
          <button onClick={onSelectOutputDir} className="btn-secondary text-xs" type="button">
            Browse
          </button>
        </div>
      </div>
    </motion.div>
  );
}
