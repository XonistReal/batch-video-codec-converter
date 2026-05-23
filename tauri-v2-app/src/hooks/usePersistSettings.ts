import { useEffect } from 'react';
import { load } from '@tauri-apps/plugin-store';
import { useStore } from '../store';

const STORE_PATH = 'settings.json';

type PersistedSettings = {
  targetCodec: string;
  outputDir: string;
  hwAccel: string;
  trimStart: string;
  trimEnd: string;
  extractAudio: boolean;
  watchFolder: string;
  watchEnabled: boolean;
  lutPath: string;
  nleProxy: string;
  autoRename: boolean;
  renamePattern: string;
};

export function usePersistSettings() {
  const targetCodec = useStore((s) => s.targetCodec);
  const outputDir = useStore((s) => s.outputDir);
  const hwAccel = useStore((s) => s.hwAccel);
  const trimStart = useStore((s) => s.trimStart);
  const trimEnd = useStore((s) => s.trimEnd);
  const extractAudio = useStore((s) => s.extractAudio);
  const watchFolder = useStore((s) => s.watchFolder);
  const watchEnabled = useStore((s) => s.watchEnabled);
  const lutPath = useStore((s) => s.lutPath);
  const nleProxy = useStore((s) => s.nleProxy);
  const autoRename = useStore((s) => s.autoRename);
  const renamePattern = useStore((s) => s.renamePattern);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const store = await load(STORE_PATH, { defaults: {}, autoSave: false });
        const saved = await store.get<PersistedSettings>('app');
        if (!saved || cancelled) return;

        const set = useStore.getState();
        if (saved.targetCodec) set.setTargetCodec(saved.targetCodec);
        if (saved.outputDir) set.setOutputDir(saved.outputDir);
        if (saved.hwAccel) set.setHwAccel(saved.hwAccel as typeof hwAccel);
        if (saved.trimStart !== undefined) set.setTrimStart(saved.trimStart);
        if (saved.trimEnd !== undefined) set.setTrimEnd(saved.trimEnd);
        if (saved.extractAudio !== undefined) set.setExtractAudio(saved.extractAudio);
        if (saved.watchFolder) set.setWatchFolder(saved.watchFolder);
        if (saved.watchEnabled !== undefined) set.setWatchEnabled(saved.watchEnabled);
        if (saved.lutPath) set.setLutPath(saved.lutPath);
        if (saved.nleProxy) set.setNleProxy(saved.nleProxy as typeof nleProxy);
        if (saved.autoRename !== undefined) set.setAutoRename(saved.autoRename);
        if (saved.renamePattern) set.setRenamePattern(saved.renamePattern);
      } catch {
        // Store unavailable during first paint
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        const store = await load(STORE_PATH, { defaults: {}, autoSave: true });
        const payload: PersistedSettings = {
          targetCodec,
          outputDir,
          hwAccel,
          trimStart,
          trimEnd,
          extractAudio,
          watchFolder,
          watchEnabled,
          lutPath,
          nleProxy,
          autoRename,
          renamePattern,
        };
        await store.set('app', payload);
        await store.save();
      } catch {
        // ignore persistence errors
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [
    targetCodec,
    outputDir,
    hwAccel,
    trimStart,
    trimEnd,
    extractAudio,
    watchFolder,
    watchEnabled,
    lutPath,
    nleProxy,
    autoRename,
    renamePattern,
  ]);
}
