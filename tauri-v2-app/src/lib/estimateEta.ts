import type { QueueItem } from '../store';

/** Remaining seconds for one file from FFmpeg progress. */
export function computeItemEta(
  duration: number,
  currentSeconds: number,
  speed: number,
  percentage: number,
): number | undefined {
  if (!duration || duration <= 0 || speed <= 0) return undefined;

  const remaining =
    currentSeconds > 0
      ? Math.max(0, duration - currentSeconds)
      : Math.max(0, duration * (1 - percentage / 100));

  if (remaining <= 0) return undefined;
  return remaining / speed;
}

/**
 * Estimated wall-clock time until the whole batch finishes.
 * Accounts for parallel encodes (e.g. 2 at once).
 */
export function computeBatchEta(queue: QueueItem[], maxConcurrent: number): number {
  const converting = queue.filter((q) => q.status === 'converting');
  const pending = queue.filter((q) => q.status === 'pending');

  const activeEtas = converting
    .map((q) => q.eta)
    .filter((e): e is number => e !== undefined && e > 0);

  let total = activeEtas.length > 0 ? Math.max(...activeEtas) : 0;

  const speeds = converting
    .map((q) => q.speed)
    .filter((s): s is number => s !== undefined && s > 0);
  const avgSpeed = speeds.length > 0 ? speeds.reduce((a, b) => a + b, 0) / speeds.length : 1;

  let pendingSeconds = 0;
  for (const item of pending) {
    if (item.duration && item.duration > 0) {
      pendingSeconds += item.duration / avgSpeed;
    }
  }

  if (pendingSeconds > 0 && maxConcurrent > 0) {
    total += pendingSeconds / maxConcurrent;
  }

  return total;
}

export const MAX_CONCURRENT_ENCODES = 2;
