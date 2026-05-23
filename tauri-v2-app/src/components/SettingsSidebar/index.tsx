import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Settings as SettingsIcon, Sparkles, Zap } from 'lucide-react';
import { BasicTab } from './BasicTab';
import { AdvancedTab } from './AdvancedTab';
import { UniqueTab } from './UniqueTab';

type TabId = 'basic' | 'advanced' | 'unique';

interface SettingsSidebarProps {
  onSelectOutputDir: () => void;
  onSelectWatchFolder: () => void;
  onSelectLut: () => void;
  onToggleWatch: () => void;
}

export function SettingsSidebar({
  onSelectOutputDir,
  onSelectWatchFolder,
  onSelectLut,
  onToggleWatch,
}: SettingsSidebarProps) {
  const [activeTab, setActiveTab] = useState<TabId>('basic');

  const tabs = [
    { id: 'basic' as const, label: 'Basic', icon: SettingsIcon },
    { id: 'advanced' as const, label: 'Advanced', icon: Sparkles },
    { id: 'unique' as const, label: 'Unique', icon: Zap },
  ];

  return (
    <motion.aside
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.4, delay: 0.1 }}
      className="w-96 glass-panel p-5 overflow-y-auto flex flex-col gap-4"
    >
      <div className="flex gap-1 p-1 bg-black/30 rounded-lg">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              type="button"
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-xs font-semibold transition-all ${
                activeTab === tab.id
                  ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon size={14} />
              {tab.label}
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'basic' && <BasicTab onSelectOutputDir={onSelectOutputDir} />}
        {activeTab === 'advanced' && <AdvancedTab />}
        {activeTab === 'unique' && (
          <motion.div
            key="unique"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            transition={{ duration: 0.2 }}
          >
            <UniqueTab
              onSelectWatchFolder={onSelectWatchFolder}
              onSelectLut={onSelectLut}
              onToggleWatch={onToggleWatch}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.aside>
  );
}
