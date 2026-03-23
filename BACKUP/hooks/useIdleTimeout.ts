/**
 * useIdleTimeout Hook
 * Auto-logout after period of inactivity
 * CRITICAL for kiosk mode security
 */

import { useEffect, useRef } from 'react';

interface UseIdleTimeoutOptions {
  timeoutMs: number; // Idle time in milliseconds before logout
  onTimeout: () => void; // Callback when timeout triggers
  events?: string[]; // Events to track (default: mousemove, keydown, click, scroll, touchstart)
  warningTimeMs?: number; // Optional: show warning N ms before logout
  onWarning?: () => void; // Optional: callback for warning
}

export const useIdleTimeout = ({
  timeoutMs,
  onTimeout,
  events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'],
  warningTimeMs,
  onWarning
}: UseIdleTimeoutOptions) => {
  const timeoutIdRef = useRef<number | null>(null);
  const warningIdRef = useRef<number | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  const resetTimer = () => {
    // Clear existing timers
    if (timeoutIdRef.current) {
      clearTimeout(timeoutIdRef.current);
    }
    if (warningIdRef.current) {
      clearTimeout(warningIdRef.current);
    }

    lastActivityRef.current = Date.now();

    // Set warning timer (if configured)
    if (warningTimeMs && onWarning) {
      warningIdRef.current = window.setTimeout(() => {
        console.warn('[IdleTimeout] Warning: approaching timeout');
        onWarning();
      }, timeoutMs - warningTimeMs);
    }

    // Set logout timer
    timeoutIdRef.current = window.setTimeout(() => {
      const idleTime = Date.now() - lastActivityRef.current;
      console.warn(`[IdleTimeout] Timeout triggered after ${Math.round(idleTime / 1000)}s of inactivity`);
      onTimeout();
    }, timeoutMs);
  };

  useEffect(() => {
    // Initialize timer
    resetTimer();

    // Add event listeners
    events.forEach(event => {
      window.addEventListener(event, resetTimer, { passive: true });
    });

    // Cleanup
    return () => {
      if (timeoutIdRef.current) {
        clearTimeout(timeoutIdRef.current);
      }
      if (warningIdRef.current) {
        clearTimeout(warningIdRef.current);
      }
      events.forEach(event => {
        window.removeEventListener(event, resetTimer);
      });
    };
  }, [timeoutMs, events]); // Only re-run if config changes

  // Return manual reset function (useful for programmatic activity)
  return {
    resetTimer,
    getIdleTime: () => Date.now() - lastActivityRef.current
  };
};
