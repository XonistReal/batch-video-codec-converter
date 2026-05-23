import { useEffect, useState } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';

const appWindow = getCurrentWindow();

export function useWindowControls() {
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const syncMaximized = async () => {
      const maximized = await appWindow.isMaximized();
      if (!cancelled) setIsMaximized(maximized);
    };

    syncMaximized();

    const unlisten = appWindow.onResized(() => {
      syncMaximized();
    });

    return () => {
      cancelled = true;
      unlisten.then((fn) => fn());
    };
  }, []);

  useEffect(() => {
    const root = document.getElementById('root');
    if (!root) return;
    if (isMaximized) root.classList.add('maximized');
    else root.classList.remove('maximized');
  }, [isMaximized]);

  const minimize = () => appWindow.minimize();
  const toggleMaximize = () => appWindow.toggleMaximize();
  const close = () => appWindow.close();

  return { isMaximized, minimize, toggleMaximize, close };
}
