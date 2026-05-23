import { useEffect } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';

const VIDEO_EXTENSIONS = new Set([
  'mp4',
  'mov',
  'avi',
  'mkv',
  'wmv',
  'flv',
  'webm',
  'mxf',
  'mts',
  'm2ts',
]);

function isVideoPath(path: string): boolean {
  const ext = path.split('.').pop()?.toLowerCase() ?? '';
  return VIDEO_EXTENSIONS.has(ext);
}

export function useDragDrop(
  onFiles: (paths: string[]) => void,
  onDragState?: (dragging: boolean) => void,
) {
  useEffect(() => {
    const unlisten = getCurrentWindow().onDragDropEvent((event) => {
      if (event.payload.type === 'over') {
        onDragState?.(true);
      } else if (event.payload.type === 'leave') {
        onDragState?.(false);
      } else if (event.payload.type === 'drop') {
        onDragState?.(false);
        const paths = event.payload.paths.filter(isVideoPath);
        if (paths.length > 0) onFiles(paths);
      }
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, [onFiles, onDragState]);
}
