import { useCallback, useEffect, useRef, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { isPermissionGranted, requestPermission, sendNotification } from '@tauri-apps/plugin-notification';
import { useStore } from '../store';
import { buildFfmpegArgs, getOutputExtension } from '../lib/buildFfmpegArgs';
import { computeItemEta, MAX_CONCURRENT_ENCODES } from '../lib/estimateEta';

interface ConvProgress {
  id: string;
  percentage: number;
  status: string;
  speed: number;
  current_seconds: number;
  eta_seconds: number;
}

function parentDir(filePath: string): string {
  const idx = Math.max(filePath.lastIndexOf('/'), filePath.lastIndexOf('\\'));
  return idx >= 0 ? filePath.slice(0, idx) : filePath;
}

function joinPath(dir: string, name: string): string {
  const sep = dir.includes('\\') ? '\\' : '/';
  return `${dir}${sep}${name}`;
}

export function useConversion() {
  const [isProcessing, setIsProcessing] = useState(false);
  const cancelledRef = useRef(new Set<string>());

  const buildOutputPath = useCallback((itemPath: string, filename: string) => {
    const state = useStore.getState();
    const ext = getOutputExtension(state.targetCodec, state.extractAudio);
    const baseName = filename.replace(/\.[^.]+$/, '');
    const outName = `${state.renamePattern.replace('{filename}', baseName)}.${ext}`;

    let outDir = state.outputDir || parentDir(itemPath);
    if (state.nleProxy === 'resolve') outDir = joinPath(outDir, 'Proxy');
    else if (state.nleProxy === 'premiere') outDir = joinPath(outDir, 'Proxies');

    return joinPath(outDir, outName);
  }, []);

  const convertItem = useCallback(
    async (itemId: string) => {
      const state = useStore.getState();
      const item = state.queue.find((q) => q.id === itemId);
      if (!item || cancelledRef.current.has(itemId)) return;

      const fresh = useStore.getState().queue.find((q) => q.id === itemId);
      const duration = fresh?.duration ?? item.duration ?? 0;
      const output = buildOutputPath(item.path, item.filename);
      state.setItemOutputPath(itemId, output);
      state.updateItemProgress(itemId, 0, 'converting', 0, undefined);

      const args = buildFfmpegArgs({
        codec: state.targetCodec,
        hwAccel: state.hwAccel,
        trimStart: state.trimStart,
        trimEnd: state.trimEnd,
        extractAudio: state.extractAudio,
        lutPath: state.lutPath,
      });

      try {
        await invoke('start_conversion', {
          id: itemId,
          input: item.path,
          output,
          args,
          duration,
        });
      } catch (err) {
        if (cancelledRef.current.has(itemId)) {
          useStore.getState().updateItemProgress(itemId, 0, 'cancelled');
          return;
        }
        const message = typeof err === 'string' ? err : String(err);
        useStore.getState().setItemError(itemId, message);
        throw err;
      }
    },
    [buildOutputPath],
  );

  const startQueue = useCallback(async () => {
    setIsProcessing(true);
    cancelledRef.current.clear();

    const pendingItems = useStore.getState().queue.filter((q) => q.status === 'pending');

    await Promise.all(
      pendingItems.map(async (item) => {
        try {
          const duration: number = await invoke('get_video_duration', { path: item.path });
          useStore.getState().updateItemDuration(item.id, duration);
        } catch (err) {
          console.error(`Failed to get duration for ${item.filename}:`, err);
        }
      }),
    );

    const queue = [...pendingItems];
    const workers = Array.from(
      { length: Math.min(MAX_CONCURRENT_ENCODES, queue.length) },
      async () => {
        while (queue.length > 0) {
          const next = queue.shift();
          if (!next || cancelledRef.current.has(next.id)) continue;
          try {
            await convertItem(next.id);
          } catch {
            // error already recorded on item
          }
        }
      },
    );

    await Promise.all(workers);

    setIsProcessing(false);

    try {
      let granted = await isPermissionGranted();
      if (!granted) {
        const perm = await requestPermission();
        granted = perm === 'granted';
      }
      if (granted) {
        const completed = useStore.getState().queue.filter((q) => q.status === 'completed').length;
        await sendNotification({
          title: 'RetroBatch',
          body: `Batch finished — ${completed} file(s) converted.`,
        });
      }
    } catch {
      // notifications optional
    }
  }, [convertItem]);

  const cancelItem = useCallback(async (id: string) => {
    cancelledRef.current.add(id);
    try {
      await invoke('cancel_conversion', { id });
    } catch (err) {
      console.error(err);
    }
    useStore.getState().updateItemProgress(id, 0, 'cancelled');
  }, []);

  return { isProcessing, startQueue, cancelItem };
}

export function useConversionListeners() {
  useEffect(() => {
    let unlistenConv: (() => void) | undefined;
    let unlistenWatch: (() => void) | undefined;

    const setup = async () => {
      unlistenConv = await listen<ConvProgress>('conversion-progress', (event) => {
        const { id, percentage, status, speed, current_seconds, eta_seconds } = event.payload;
        const item = useStore.getState().queue.find((q) => q.id === id);

        const eta =
          eta_seconds > 0
            ? eta_seconds
            : item?.duration
              ? computeItemEta(item.duration, current_seconds, speed, percentage)
              : undefined;

        useStore.getState().updateItemProgress(
          id,
          percentage,
          status === 'Completed' ? 'completed' : 'converting',
          speed,
          eta,
        );
      });

      unlistenWatch = await listen<{ path: string }>('watch-folder-event', (event) => {
        useStore.getState().addToQueue([event.payload.path]);
      });
    };

    setup();

    return () => {
      unlistenConv?.();
      unlistenWatch?.();
    };
  }, []);
}
