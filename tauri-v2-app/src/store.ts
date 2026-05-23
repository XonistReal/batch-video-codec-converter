import { create } from 'zustand';

export interface QueueItem {
  id: string;
  path: string;
  filename: string;
  status: 'pending' | 'converting' | 'completed' | 'error';
  progress: number;
  duration?: number;
  speed?: number;
  eta?: number;
  startTime?: number;
}

interface AppState {
  queue: QueueItem[];
  addToQueue: (paths: string[]) => void;
  removeFromQueue: (id: string) => void;
  clearQueue: () => void;
  updateItemProgress: (id: string, progress: number, status: QueueItem['status'], speed?: number, eta?: number) => void;
  updateItemDuration: (id: string, duration: number) => void;
  setItemStartTime: (id: string, time: number) => void;
  reorderQueue: (startIndex: number, endIndex: number) => void;
  
  targetCodec: string;
  setTargetCodec: (codec: string) => void;
  
  outputDir: string;
  setOutputDir: (dir: string) => void;

  // Advanced Options
  trimStart: string;
  setTrimStart: (val: string) => void;
  trimEnd: string;
  setTrimEnd: (val: string) => void;
  extractAudio: boolean;
  setExtractAudio: (val: boolean) => void;
  hwAccel: string;
  setHwAccel: (val: string) => void;

  // Unique Features
  watchFolder: string;
  setWatchFolder: (val: string) => void;
  isWatching: boolean;
  setIsWatching: (val: boolean) => void;
  lutPath: string;
  setLutPath: (val: string) => void;
  proxyMode: string;
  setProxyMode: (val: string) => void;
  autoRenamePattern: string;
  setAutoRenamePattern: (val: string) => void;
}

export const useStore = create<AppState>((set) => ({
  queue: [],
  addToQueue: (paths) => set((state) => {
    const newItems = paths
      .filter(p => !state.queue.some(q => q.path === p))
      .map(p => {
        const parts = p.split(/[/\\]/);
        return {
          id: Math.random().toString(36).substring(7),
          path: p,
          filename: parts[parts.length - 1],
          status: 'pending' as const,
          progress: 0
        };
      });
    return { queue: [...state.queue, ...newItems] };
  }),
  removeFromQueue: (id) => set((state) => ({
    queue: state.queue.filter((item) => item.id !== id)
  })),
  clearQueue: () => set({ queue: [] }),
  updateItemProgress: (id, progress, status, speed, eta) => set((state) => ({
    queue: state.queue.map((item) => item.id === id ? { ...item, progress, status, speed, eta } : item)
  })),
  updateItemDuration: (id, duration) => set((state) => ({
    queue: state.queue.map((item) => item.id === id ? { ...item, duration } : item)
  })),
  setItemStartTime: (id, time) => set((state) => ({
    queue: state.queue.map((item) => item.id === id ? { ...item, startTime: time } : item)
  })),
  reorderQueue: (startIndex, endIndex) => set((state) => {
    const result = Array.from(state.queue);
    const [removed] = result.splice(startIndex, 1);
    result.splice(endIndex, 0, removed);
    return { queue: result };
  }),

  targetCodec: 'H.264 8-bit (Standard Resolve Free - Small File)',
  setTargetCodec: (codec) => set({ targetCodec: codec }),

  outputDir: '',
  setOutputDir: (dir) => set({ outputDir: dir }),

  trimStart: '',
  setTrimStart: (val) => set({ trimStart: val }),
  trimEnd: '',
  setTrimEnd: (val) => set({ trimEnd: val }),
  extractAudio: false,
  setExtractAudio: (val) => set({ extractAudio: val }),
  hwAccel: 'auto',
  setHwAccel: (val) => set({ hwAccel: val }),

  watchFolder: '',
  setWatchFolder: (val) => set({ watchFolder: val }),
  isWatching: false,
  setIsWatching: (val) => set({ isWatching: val }),
  lutPath: '',
  setLutPath: (val) => set({ lutPath: val }),
  proxyMode: 'none',
  setProxyMode: (val) => set({ proxyMode: val }),
  autoRenamePattern: '{filename}_converted',
  setAutoRenamePattern: (val) => set({ autoRenamePattern: val }),
}));
