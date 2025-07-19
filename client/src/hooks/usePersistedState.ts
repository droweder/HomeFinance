import { useState, useEffect, useRef } from 'react';

// Hook para persistir estado no localStorage
export function usePersistedState<T>(
  key: string,
  defaultValue: T,
  options: {
    serialize?: (value: T) => string;
    deserialize?: (value: string) => T;
    syncAcrossTabs?: boolean;
  } = {}
): [T, (value: T | ((prev: T) => T)) => void] {
  const {
    serialize = JSON.stringify,
    deserialize = JSON.parse,
    syncAcrossTabs = true
  } = options;

  const prefixedKey = `finance-app-${key}`;
  const [value, setValue] = useState<T>(() => {
    try {
      const item = localStorage.getItem(prefixedKey);
      return item ? deserialize(item) : defaultValue;
    } catch (error) {
      console.warn(`Failed to load persisted state for ${key}:`, error);
      return defaultValue;
    }
  });

  const saveTimeoutRef = useRef<NodeJS.Timeout>();

  // Função para atualizar valor
  const setPersistedValue = (newValue: T | ((prev: T) => T)) => {
    setValue(prevValue => {
      const nextValue = typeof newValue === 'function' 
        ? (newValue as (prev: T) => T)(prevValue)
        : newValue;

      // Debounce saves to prevent excessive localStorage writes
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      saveTimeoutRef.current = setTimeout(() => {
        try {
          localStorage.setItem(prefixedKey, serialize(nextValue));
        } catch (error) {
          console.warn(`Failed to persist state for ${key}:`, error);
        }
      }, 100);

      return nextValue;
    });
  };

  // Sincronizar entre abas se habilitado
  useEffect(() => {
    if (!syncAcrossTabs) return;

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === prefixedKey && e.newValue !== null) {
        try {
          const newValue = deserialize(e.newValue);
          setValue(newValue);
        } catch (error) {
          console.warn(`Failed to sync state for ${key}:`, error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [prefixedKey, deserialize, syncAcrossTabs, key]);

  return [value, setPersistedValue];
}