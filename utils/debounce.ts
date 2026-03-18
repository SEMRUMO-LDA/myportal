/**
 * Utilitários para prevenir double-submit e melhorar performance
 */

/**
 * Debounce function que previne múltiplas execuções
 * @param func Função a ser executada
 * @param wait Tempo de espera em ms
 * @param options Opções de configuração
 * @returns Função debounced
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
  options: { leading?: boolean; trailing?: boolean; maxWait?: number } = {}
): T & { cancel: () => void; flush: () => void } {
  let timeout: NodeJS.Timeout | null = null;
  let lastArgs: any[] | null = null;
  let lastThis: any = null;
  let result: any;
  let lastCallTime: number | null = null;
  let lastInvokeTime = 0;
  let leading = options.leading ?? false;
  let trailing = options.trailing ?? true;
  let maxWait = options.maxWait;
  let maxing = maxWait !== undefined;

  function invokeFunc(time: number) {
    const args = lastArgs;
    const thisArg = lastThis;

    lastArgs = lastThis = null;
    lastInvokeTime = time;
    result = func.apply(thisArg, args!);
    return result;
  }

  function leadingEdge(time: number) {
    lastInvokeTime = time;
    timeout = setTimeout(timerExpired, wait);
    return leading ? invokeFunc(time) : result;
  }

  function remainingWait(time: number) {
    const timeSinceLastCall = time - (lastCallTime ?? 0);
    const timeSinceLastInvoke = time - lastInvokeTime;
    const timeWaiting = wait - timeSinceLastCall;

    return maxing
      ? Math.min(timeWaiting, (maxWait ?? 0) - timeSinceLastInvoke)
      : timeWaiting;
  }

  function shouldInvoke(time: number) {
    const timeSinceLastCall = time - (lastCallTime ?? 0);
    const timeSinceLastInvoke = time - lastInvokeTime;

    return (
      lastCallTime === null ||
      timeSinceLastCall >= wait ||
      timeSinceLastCall < 0 ||
      (maxing && timeSinceLastInvoke >= (maxWait ?? 0))
    );
  }

  function timerExpired() {
    const time = Date.now();
    if (shouldInvoke(time)) {
      return trailingEdge(time);
    }
    timeout = setTimeout(timerExpired, remainingWait(time));
  }

  function trailingEdge(time: number) {
    timeout = null;

    if (trailing && lastArgs) {
      return invokeFunc(time);
    }
    lastArgs = lastThis = null;
    return result;
  }

  function cancel() {
    if (timeout !== null) {
      clearTimeout(timeout);
    }
    lastInvokeTime = 0;
    lastArgs = lastCallTime = lastThis = timeout = null;
  }

  function flush() {
    return timeout === null ? result : trailingEdge(Date.now());
  }

  function debounced(this: any, ...args: any[]) {
    const time = Date.now();
    const isInvoking = shouldInvoke(time);

    lastArgs = args;
    lastThis = this;
    lastCallTime = time;

    if (isInvoking) {
      if (timeout === null) {
        return leadingEdge(lastCallTime);
      }
      if (maxing) {
        timeout = setTimeout(timerExpired, wait);
        return invokeFunc(lastCallTime);
      }
    }
    if (timeout === null) {
      timeout = setTimeout(timerExpired, wait);
    }
    return result;
  }

  debounced.cancel = cancel;
  debounced.flush = flush;

  return debounced as T & { cancel: () => void; flush: () => void };
}

/**
 * Hook para usar debounce com limpeza automática
 */
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number,
  options: { leading?: boolean; trailing?: boolean; maxWait?: number } = {}
): T & { cancel: () => void; flush: () => void } {
  const debouncedFn = debounce(callback, delay, options);

  // Em React, você pode adicionar useEffect para limpeza
  // useEffect(() => {
  //   return () => {
  //     debouncedFn.cancel();
  //   };
  // }, []);

  return debouncedFn;
}

/**
 * Throttle function que limita execuções por intervalo de tempo
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
  options: { leading?: boolean; trailing?: boolean } = {}
): T & { cancel: () => void } {
  let timeout: NodeJS.Timeout | null = null;
  let previous = 0;
  let lastArgs: any[] | null = null;
  let lastThis: any = null;
  let result: any;

  const leading = options.leading ?? true;
  const trailing = options.trailing ?? true;

  function later() {
    previous = leading === false ? 0 : Date.now();
    timeout = null;
    result = func.apply(lastThis, lastArgs!);
    if (!timeout) lastArgs = lastThis = null;
  }

  function cancel() {
    if (timeout) {
      clearTimeout(timeout);
      timeout = null;
    }
    previous = 0;
    lastArgs = lastThis = null;
  }

  function throttled(this: any, ...args: any[]) {
    const now = Date.now();
    if (!previous && leading === false) previous = now;

    const remaining = wait - (now - previous);
    lastArgs = args;
    lastThis = this;

    if (remaining <= 0 || remaining > wait) {
      if (timeout) {
        clearTimeout(timeout);
        timeout = null;
      }
      previous = now;
      result = func.apply(this, args);
      if (!timeout) lastArgs = lastThis = null;
    } else if (!timeout && trailing !== false) {
      timeout = setTimeout(later, remaining);
    }

    return result;
  }

  throttled.cancel = cancel;

  return throttled as T & { cancel: () => void };
}

/**
 * Classe para gerenciar estado de submissão e prevenir double-submit
 */
export class SubmitManager {
  private isSubmitting = false;
  private submitTimeout: NodeJS.Timeout | null = null;
  private readonly cooldownMs: number;

  constructor(cooldownMs: number = 3000) {
    this.cooldownMs = cooldownMs;
  }

  /**
   * Executa função apenas se não estiver em submissão
   */
  async execute<T>(fn: () => Promise<T>): Promise<T | null> {
    if (this.isSubmitting) {
      console.warn('[SubmitManager] Bloqueado - submissão em andamento');
      return null;
    }

    this.isSubmitting = true;

    try {
      const result = await fn();

      // Adicionar cooldown após sucesso
      this.submitTimeout = setTimeout(() => {
        this.isSubmitting = false;
        this.submitTimeout = null;
      }, this.cooldownMs);

      return result;
    } catch (error) {
      // Em caso de erro, liberar imediatamente
      this.isSubmitting = false;
      throw error;
    }
  }

  /**
   * Verifica se está em processo de submissão
   */
  isLocked(): boolean {
    return this.isSubmitting;
  }

  /**
   * Força reset do estado
   */
  reset(): void {
    this.isSubmitting = false;
    if (this.submitTimeout) {
      clearTimeout(this.submitTimeout);
      this.submitTimeout = null;
    }
  }
}

/**
 * Hook React para gerenciar submissão (exemplo)
 *
 * @example
 * const { submit, isSubmitting } = useSubmitManager(async (data) => {
 *   await api.post('/submit', data);
 * });
 */
export function createSubmitHook<T extends any[], R>(
  handler: (...args: T) => Promise<R>,
  options: { cooldown?: number; onError?: (error: any) => void } = {}
) {
  const manager = new SubmitManager(options.cooldown);

  return {
    submit: async (...args: T): Promise<R | null> => {
      try {
        return await manager.execute(() => handler(...args));
      } catch (error) {
        options.onError?.(error);
        return null;
      }
    },
    isSubmitting: () => manager.isLocked(),
    reset: () => manager.reset()
  };
}