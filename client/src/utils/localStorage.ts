// Sistema de armazenamento persistente local para configurações e dados
export interface StorageKeys {
  // Configurações de filtros
  'expense-filters': any;
  'income-filters': any;
  'transfer-filters': any;
  
  // Configurações de interface
  'theme-preference': 'light' | 'dark' | 'system';
  'active-tab': string;
  
  // Chaves de API
  'gemini-api-key': string;
  
  // Histórico da IA
  'ai-chat-history': any[];
  
  // Configurações da IA
  'ai-settings': any;
  
  // Cache de autenticação
  'auth-cache': any;
  
  // Configurações de visualização
  'dashboard-preferences': any;
}

class LocalStorageManager {
  private prefix = 'finance-app-';

  // Salvar dados no localStorage
  set<K extends keyof StorageKeys>(key: K, value: StorageKeys[K]): void {
    try {
      const serializedValue = JSON.stringify(value);
      localStorage.setItem(this.prefix + key, serializedValue);
      console.log(`💾 Saved to localStorage: ${key}`);
    } catch (error) {
      console.error(`❌ Failed to save to localStorage: ${key}`, error);
    }
  }

  // Recuperar dados do localStorage
  get<K extends keyof StorageKeys>(key: K): StorageKeys[K] | null {
    try {
      const item = localStorage.getItem(this.prefix + key);
      if (item === null) {
        return null;
      }
      const parsed = JSON.parse(item);
      console.log(`📖 Loaded from localStorage: ${key}`);
      return parsed;
    } catch (error) {
      console.error(`❌ Failed to load from localStorage: ${key}`, error);
      return null;
    }
  }

  // Remover item do localStorage
  remove<K extends keyof StorageKeys>(key: K): void {
    try {
      localStorage.removeItem(this.prefix + key);
      console.log(`🗑️ Removed from localStorage: ${key}`);
    } catch (error) {
      console.error(`❌ Failed to remove from localStorage: ${key}`, error);
    }
  }

  // Limpar todos os dados do app
  clear(): void {
    try {
      const keys = Object.keys(localStorage).filter(key => 
        key.startsWith(this.prefix)
      );
      keys.forEach(key => localStorage.removeItem(key));
      console.log('🧹 Cleared all localStorage data');
    } catch (error) {
      console.error('❌ Failed to clear localStorage', error);
    }
  }

  // Verificar se o localStorage está disponível
  isAvailable(): boolean {
    try {
      const test = '__localStorage_test__';
      localStorage.setItem(test, 'test');
      localStorage.removeItem(test);
      return true;
    } catch {
      return false;
    }
  }

  // Migração de dados (para futuras atualizações)
  migrate(): void {
    const version = this.get('version' as keyof StorageKeys) || '1.0.0';
    // Implementar migrações conforme necessário
    console.log(`📱 Storage version: ${version}`);
  }
}

export const storage = new LocalStorageManager();

// Hook React para usar localStorage de forma reativa
import { useState, useEffect } from 'react';

export function useLocalStorage<K extends keyof StorageKeys>(
  key: K, 
  defaultValue: StorageKeys[K]
): [StorageKeys[K], (value: StorageKeys[K]) => void] {
  const [value, setValue] = useState<StorageKeys[K]>(() => {
    const stored = storage.get(key);
    return stored !== null ? stored : defaultValue;
  });

  const setStoredValue = (newValue: StorageKeys[K]) => {
    setValue(newValue);
    storage.set(key, newValue);
  };

  useEffect(() => {
    const stored = storage.get(key);
    if (stored !== null) {
      setValue(stored);
    }
  }, [key]);

  return [value, setStoredValue];
}

// Função para detectar mudanças no localStorage de outras abas
export function useStorageSync<K extends keyof StorageKeys>(
  key: K,
  callback: (newValue: StorageKeys[K] | null) => void
) {
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === storage['prefix'] + key) {
        const newValue = e.newValue ? JSON.parse(e.newValue) : null;
        callback(newValue);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [key, callback]);
}