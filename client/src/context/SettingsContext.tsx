import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AppSettings } from '../types';

interface SettingsContextType {
  settings: AppSettings;
  updateSettings: (newSettings: Partial<AppSettings>) => void;
  formatCurrency: (amount: number) => string;
  formatDate: (date: string) => string;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};

interface SettingsProviderProps {
  children: ReactNode;
}

export const SettingsProvider: React.FC<SettingsProviderProps> = ({ children }) => {
  const [settings, setSettings] = useState<AppSettings>({
    theme: 'light',
    language: 'pt-BR', // Fixed to Brazilian Portuguese
    currency: 'BRL', // Fixed to Brazilian Real
    geminiApiKey: '',
    aiSettings: {
      grokApiKey: '',
      geminiApiKey: '',
      preferredProvider: 'gemini',
      enableAI: false,
    },
  });

  useEffect(() => {
    const savedSettings = localStorage.getItem('finance-settings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        console.log('📖 Configurações carregadas do localStorage');
        // Ensure language and currency are always set to Brazilian defaults
        setSettings({
          ...parsed,
          language: 'pt-BR',
          currency: 'BRL',
          geminiApiKey: parsed.geminiApiKey || '',
          aiSettings: {
            grokApiKey: '',
            geminiApiKey: parsed.geminiApiKey || '', // Sync with main geminiApiKey
            preferredProvider: 'gemini',
            enableAI: !!parsed.geminiApiKey,
            ...parsed.aiSettings,
          },
        });
      } catch (error) {
        console.error('❌ Erro ao carregar configurações:', error);
      }
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('finance-settings', JSON.stringify(settings));
      console.log('💾 Configurações salvas no localStorage');
    } catch (error) {
      console.error('❌ Erro ao salvar configurações:', error);
    }
    
    // Aplicar tema
    if (settings.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings]);

  const updateSettings = (newSettings: Partial<AppSettings>) => {
    // Prevent changing language and currency
    const filteredSettings = { ...newSettings };
    delete filteredSettings.language;
    delete filteredSettings.currency;
    
    setSettings(prev => ({ 
      ...prev, 
      ...filteredSettings,
      language: 'pt-BR', // Always Brazilian Portuguese
      currency: 'BRL', // Always Brazilian Real
      aiSettings: {
        ...prev.aiSettings,
        ...filteredSettings.aiSettings,
      },
    }));
  };

  const formatCurrency = (amount: number): string => {
    // Verificar se o valor é válido
    if (typeof amount !== 'number' || isNaN(amount)) {
      console.warn('⚠️ formatCurrency recebeu valor inválido:', amount);
      return 'R$ 0,00';
    }

    // Debug para valores muito altos
    if (Math.abs(amount) > 1000000) {
      console.warn('⚠️ formatCurrency: valor muito alto detectado:', amount);
    }

    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(amount);
  };

  const formatDate = (date: string): string => {
    // Append time to ensure local date parsing and prevent timezone shifts
    const dateWithTime = date.includes('T') ? date : `${date}T00:00:00`;
    return new Date(dateWithTime).toLocaleDateString('pt-BR');
  };

  return (
    <SettingsContext.Provider
      value={{
        settings,
        updateSettings,
        formatCurrency,
        formatDate,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};