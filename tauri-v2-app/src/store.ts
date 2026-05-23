import { create } from 'zustand';
import type { HwAccel } from './lib/buildFfmpegArgs';
import { DEFAULT_CODEC } from './lib/codecPresets';

export interface QueueItem {
  id: string;
  path: string;
  filename: string;
  status: 'pending' | 'converting' | 'completed' | 'error' | 'cancelled';
  progress: number;
  duration?: number;
  speed?: number;
  eta?: number;
  errorMessage?: string;
  outputPath?: string;
}

interface AppState {
  queue: QueueItem[];
  addToQueue: (paths: string[]) => void;
  removeFromQueue: (id: string) => void;
  clearQueue: () => void;
  updateItemProgress: (
    id: string,
    progress: number,
    status: QueueItem['status'],
    speed?: number,
    eta?: number,
  ) => void;
  updateItemDuration: (id: string, duration: number) => void;
  setItemError: (id: string, message: string) => void;
  setItemOutputPath: (id: string, outputPath: string) => void;

  targetCodec: string;
  setTargetCodec: (codec: string) => void;

  outputDir: string;
  setOutputDir: (dir: string) => void;

  trimStart: string;
  setTrimStart: (val: string) => void;
  trimEnd: string;
  setTrimEnd: (val: string) => void;
  extractAudio: boolean;
  setExtractAudio: (val: boolean) => void;
  hwAccel: HwAccel;
  setHwAccel: (val: HwAccel) => void;

  watchFolder: string;
  setWatchFolder: (val: string) => void;
  watchEnabled: boolean;
  setWatchEnabled: (val: boolean) => void;
  lutPath: string;
  setLutPath: (val: string) => void;
  nleProxy: 'none' | 'resolve' | 'premiere';
  setNleProxy: (val: 'none' | 'resolve' | 'premiere') => void;
  autoRename: boolean;
  setAutoRename: (val: boolean) => void;
  renamePattern: string;
  setRenamePattern: (val: string) => void;
}

export const useStore = create<AppState>((set) => ({
  queue: [],
  addToQueue: (paths) =>
    set((state) => {
      const newItems = paths
        .filter((p) => !state.queue.some((q) => q.path === p))
        .map((p) => {
          const parts = p.split(/[/\\]/);
          return {
            id: crypto.randomUUID(),
            path: p,
            filename: parts[parts.length - 1] ?? p,
            status: 'pending' as const,
            progress: 0,
          };
        });
      return { queue: [...state.queue, ...newItems] };
    }),
  removeFromQueue: (id) =>
    set((state) => ({
      queue: state.queue.filter((item) => item.id !== id),
    })),
  clearQueue: () => set({ queue: [] }),
  updateItemProgress: (id, progress, status, speed, eta) =>
    set((state) => ({
      queue: state.queue.map((item) =>
        item.id === id ? { ...item, progress, status, speed, eta } : item,
      ),
    })),
  updateItemDuration: (id, duration) =>
    set((state) => ({
      queue: state.queue.map((item) => (item.id === id ? { ...item, duration } : item)),
    })),
  setItemError: (id, message) =>
    set((state) => ({
      queue: state.queue.map((item) =>
        item.id === id ? { ...item, status: 'error', errorMessage: message } : item,
      ),
    })),
  setItemOutputPath: (id, outputPath) =>
    set((state) => ({
      queue: state.queue.map((item) => (item.id === id ? { ...item, outputPath } : item)),
    })),

  targetCodec: DEFAULT_CODEC,
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
  watchEnabled: false,
  setWatchEnabled: (val) => set({ watchEnabled: val }),
  lutPath: '',
  setLutPath: (val) => set({ lutPath: val }),
  nleProxy: 'none',
  setNleProxy: (val) => set({ nleProxy: val }),
  autoRename: true,
  setAutoRename: (val) => set({ autoRename: val }),
  renamePattern: '{filename}_converted',
  setRenamePattern: (val) => set({ renamePattern: val }),
}));
