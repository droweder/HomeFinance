// Utilities to prevent unwanted page reloads and optimize performance

export class ReloadPrevention {
  private static instance: ReloadPrevention;
  private debounceTimeouts: Map<string, NodeJS.Timeout> = new Map();
  private lastOperationTime: Map<string, number> = new Map();

  static getInstance(): ReloadPrevention {
    if (!ReloadPrevention.instance) {
      ReloadPrevention.instance = new ReloadPrevention();
    }
    return ReloadPrevention.instance;
  }

  // Debounce frequent operations to prevent cascading reloads
  debounce<T extends (...args: any[]) => any>(
    key: string,
    func: T,
    delay: number = 300
  ): (...args: Parameters<T>) => void {
    return (...args: Parameters<T>) => {
      const existingTimeout = this.debounceTimeouts.get(key);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
      }

      const timeout = setTimeout(() => {
        this.lastOperationTime.set(key, Date.now());
        func(...args);
        this.debounceTimeouts.delete(key);
      }, delay);

      this.debounceTimeouts.set(key, timeout);
    };
  }

  // Check if operation was recently performed
  wasRecentlyPerformed(key: string, threshold: number = 1000): boolean {
    const lastTime = this.lastOperationTime.get(key);
    return lastTime ? (Date.now() - lastTime) < threshold : false;
  }

  // Prevent duplicate rapid operations
  preventDuplicate<T extends (...args: any[]) => any>(
    key: string,
    func: T,
    threshold: number = 1000
  ): (...args: Parameters<T>) => void {
    return (...args: Parameters<T>) => {
      if (!this.wasRecentlyPerformed(key, threshold)) {
        this.lastOperationTime.set(key, Date.now());
        func(...args);
      } else {
        console.log(`🛡️ Prevented duplicate operation: ${key}`);
      }
    };
  }

  // Cleanup function
  cleanup(): void {
    this.debounceTimeouts.forEach(timeout => clearTimeout(timeout));
    this.debounceTimeouts.clear();
    this.lastOperationTime.clear();
  }
}

// Utility functions for common reload prevention patterns
export const reloadPrevention = ReloadPrevention.getInstance();

// Debounced localStorage save
export const debouncedSave = reloadPrevention.debounce(
  'localStorage-save',
  (key: string, value: any) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      console.log(`💾 Saved to localStorage: ${key}`);
    } catch (error) {
      console.error(`❌ Failed to save to localStorage: ${key}`, error);
    }
  },
  500
);

// Prevent rapid authentication state changes
export const preventRapidAuthChanges = reloadPrevention.preventDuplicate(
  'auth-state-change',
  (callback: () => void) => {
    callback();
  },
  2000
);

// Prevent rapid data loading
export const preventRapidDataLoad = reloadPrevention.preventDuplicate(
  'data-load',
  (callback: () => void) => {
    callback();
  },
  3000
);

// Monitor for reload-causing patterns
export function monitorReloadPatterns() {
  // Monitor frequent state changes
  const originalSetState = React.useState;
  let stateChangeCount = 0;
  const resetCount = () => { stateChangeCount = 0; };
  
  setInterval(resetCount, 5000); // Reset every 5 seconds
  
  // Warn about excessive state changes
  const warnIfExcessive = () => {
    stateChangeCount++;
    if (stateChangeCount > 50) {
      console.warn('⚠️ Excessive state changes detected, potential reload cause');
    }
  };

  // Monitor useEffect dependency changes
  const originalUseEffect = React.useEffect;
  let effectRunCount = 0;
  
  const resetEffectCount = () => { effectRunCount = 0; };
  setInterval(resetEffectCount, 5000);
  
  const warnIfExcessiveEffects = () => {
    effectRunCount++;
    if (effectRunCount > 20) {
      console.warn('⚠️ Excessive useEffect runs detected, potential reload cause');
    }
  };
  
  return {
    warnIfExcessive,
    warnIfExcessiveEffects,
    cleanup: reloadPrevention.cleanup
  };
}

// Função para verificar se existe algum modal aberto na tela.
// A verificação é baseada na presença de um elemento com a classe 'z-50',
// que é usada de forma consistente para todos os modais da aplicação.
export const isModalOpen = (): boolean => {
    // A classe 'z-50' é um indicador confiável de que um modal está ativo.
    const modalElement = document.querySelector('.z-50');

    // Retorna true se um elemento com a classe 'z-50' for encontrado.
    return !!modalElement;
  };