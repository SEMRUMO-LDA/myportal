/**
 * Centralized Timer Manager
 *
 * Prevents memory leaks from unmanaged intervals/timeouts
 * Ensures proper cleanup on component unmount or hot reload
 */

type TimerType = 'interval' | 'timeout';

interface TimerEntry {
  id: number;
  type: TimerType;
  callback: () => void;
  delay: number;
  createdAt: Date;
  source?: string;
}

class TimerManager {
  private timers = new Map<string, TimerEntry>();
  private nextId = 1;

  /**
   * Register an interval with automatic cleanup
   */
  setInterval(callback: () => void, delay: number, source?: string): string {
    const timerId = `timer_${this.nextId++}`;

    const intervalId = window.setInterval(callback, delay);

    this.timers.set(timerId, {
      id: intervalId,
      type: 'interval',
      callback,
      delay,
      createdAt: new Date(),
      source
    });

    // Log in development
    if (import.meta.env.DEV) {
      console.log(`[TimerManager] Interval registered: ${timerId} (${source || 'unknown'})`);
    }

    return timerId;
  }

  /**
   * Register a timeout with automatic cleanup
   */
  setTimeout(callback: () => void, delay: number, source?: string): string {
    const timerId = `timer_${this.nextId++}`;

    const timeoutId = window.setTimeout(() => {
      callback();
      // Auto-remove timeout after execution
      this.timers.delete(timerId);
    }, delay);

    this.timers.set(timerId, {
      id: timeoutId,
      type: 'timeout',
      callback,
      delay,
      createdAt: new Date(),
      source
    });

    // Log in development
    if (import.meta.env.DEV) {
      console.log(`[TimerManager] Timeout registered: ${timerId} (${source || 'unknown'})`);
    }

    return timerId;
  }

  /**
   * Clear a specific timer
   */
  clear(timerId: string): boolean {
    const timer = this.timers.get(timerId);

    if (!timer) {
      return false;
    }

    if (timer.type === 'interval') {
      window.clearInterval(timer.id);
    } else {
      window.clearTimeout(timer.id);
    }

    this.timers.delete(timerId);

    if (import.meta.env.DEV) {
      console.log(`[TimerManager] Timer cleared: ${timerId}`);
    }

    return true;
  }

  /**
   * Clear all timers from a specific source
   */
  clearBySource(source: string): number {
    let count = 0;

    for (const [timerId, timer] of this.timers.entries()) {
      if (timer.source === source) {
        this.clear(timerId);
        count++;
      }
    }

    if (import.meta.env.DEV && count > 0) {
      console.log(`[TimerManager] Cleared ${count} timers from source: ${source}`);
    }

    return count;
  }

  /**
   * Clear ALL timers (useful for cleanup on logout)
   */
  clearAll(): number {
    const count = this.timers.size;

    for (const [timerId] of this.timers.entries()) {
      const timer = this.timers.get(timerId)!;

      if (timer.type === 'interval') {
        window.clearInterval(timer.id);
      } else {
        window.clearTimeout(timer.id);
      }
    }

    this.timers.clear();

    if (import.meta.env.DEV && count > 0) {
      console.log(`[TimerManager] Cleared all ${count} timers`);
    }

    return count;
  }

  /**
   * Get active timer count
   */
  getActiveCount(): number {
    return this.timers.size;
  }

  /**
   * Get timer info for debugging
   */
  getTimerInfo(): Array<{
    timerId: string;
    type: TimerType;
    source?: string;
    delay: number;
    age: number;
  }> {
    const now = new Date().getTime();

    return Array.from(this.timers.entries()).map(([timerId, timer]) => ({
      timerId,
      type: timer.type,
      source: timer.source,
      delay: timer.delay,
      age: now - timer.createdAt.getTime()
    }));
  }

  /**
   * React hook helper - returns cleanup function
   */
  useTimer(callback: () => void, delay: number | null, type: TimerType = 'interval', source?: string): () => void {
    if (delay === null) {
      return () => {};
    }

    const timerId = type === 'interval'
      ? this.setInterval(callback, delay, source)
      : this.setTimeout(callback, delay, source);

    // Return cleanup function
    return () => this.clear(timerId);
  }
}

// Singleton instance
export const timerManager = new TimerManager();

// Cleanup all timers on window unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    timerManager.clearAll();
  });
}

/**
 * React Hook for managed timers
 *
 * Usage:
 * ```tsx
 * import { useManagedInterval } from './services/timerManager';
 *
 * function MyComponent() {
 *   useManagedInterval(() => {
 *     console.log('tick');
 *   }, 1000);
 * }
 * ```
 */
export function useManagedInterval(callback: () => void, delay: number | null) {
  const savedCallback = useRef<() => void>();

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (delay === null) return;

    const tick = () => savedCallback.current?.();
    const timerId = timerManager.setInterval(tick, delay, 'react-hook');

    return () => timerManager.clear(timerId);
  }, [delay]);
}

export function useManagedTimeout(callback: () => void, delay: number | null) {
  const savedCallback = useRef<() => void>();

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (delay === null) return;

    const tick = () => savedCallback.current?.();
    const timerId = timerManager.setTimeout(tick, delay, 'react-hook');

    return () => timerManager.clear(timerId);
  }, [delay]);
}

// Import React hooks for the custom hooks
import { useEffect, useRef } from 'react';