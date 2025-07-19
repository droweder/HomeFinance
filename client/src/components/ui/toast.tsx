import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { CheckCircle, AlertCircle, Info, X, Zap } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning' | 'api-key';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastContextType {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  showSuccess: (title: string, description?: string) => void;
  showError: (title: string, description?: string) => void;
  showInfo: (title: string, description?: string) => void;
  showApiKeySuccess: (provider: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newToast = { ...toast, id };
    
    setToasts(prev => [...prev, newToast]);

    // Auto remove after duration
    const duration = toast.duration || 5000;
    setTimeout(() => {
      removeToast(id);
    }, duration);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const showSuccess = useCallback((title: string, description?: string) => {
    addToast({ type: 'success', title, description });
  }, [addToast]);

  const showError = useCallback((title: string, description?: string) => {
    addToast({ type: 'error', title, description });
  }, [addToast]);

  const showInfo = useCallback((title: string, description?: string) => {
    addToast({ type: 'info', title, description });
  }, [addToast]);

  const showApiKeySuccess = useCallback((provider: string) => {
    addToast({
      type: 'api-key',
      title: 'Chave API Configurada!',
      description: `Sua chave ${provider} foi salva com segurança e está pronta para uso.`,
      duration: 6000
    });
  }, [addToast]);

  return (
    <ToastContext.Provider
      value={{
        toasts,
        addToast,
        removeToast,
        showSuccess,
        showError,
        showInfo,
        showApiKeySuccess,
      }}
    >
      {children}
      <ToastContainer />
    </ToastContext.Provider>
  );
};

const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-3 max-w-md">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
      ))}
    </div>
  );
};

const ToastItem: React.FC<{ 
  toast: Toast; 
  onRemove: (id: string) => void; 
}> = ({ toast, onRemove }) => {
  const getToastStyles = (type: ToastType) => {
    switch (type) {
      case 'success':
        return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800';
      case 'error':
        return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
      case 'warning':
        return 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800';
      case 'info':
        return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800';
      case 'api-key':
        return 'bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 border-purple-200 dark:border-purple-800';
      default:
        return 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700';
    }
  };

  const getIcon = (type: ToastType) => {
    const iconClass = "w-5 h-5";
    switch (type) {
      case 'success':
        return <CheckCircle className={`${iconClass} text-green-600 dark:text-green-400`} />;
      case 'error':
        return <AlertCircle className={`${iconClass} text-red-600 dark:text-red-400`} />;
      case 'warning':
        return <AlertCircle className={`${iconClass} text-yellow-600 dark:text-yellow-400`} />;
      case 'info':
        return <Info className={`${iconClass} text-blue-600 dark:text-blue-400`} />;
      case 'api-key':
        return <Zap className={`${iconClass} text-purple-600 dark:text-purple-400`} />;
      default:
        return <Info className={`${iconClass} text-gray-600 dark:text-gray-400`} />;
    }
  };

  const getTitleColor = (type: ToastType) => {
    switch (type) {
      case 'success':
        return 'text-green-800 dark:text-green-200';
      case 'error':
        return 'text-red-800 dark:text-red-200';
      case 'warning':
        return 'text-yellow-800 dark:text-yellow-200';
      case 'info':
        return 'text-blue-800 dark:text-blue-200';
      case 'api-key':
        return 'text-purple-800 dark:text-purple-200';
      default:
        return 'text-gray-800 dark:text-gray-200';
    }
  };

  const getDescriptionColor = (type: ToastType) => {
    switch (type) {
      case 'success':
        return 'text-green-700 dark:text-green-300';
      case 'error':
        return 'text-red-700 dark:text-red-300';
      case 'warning':
        return 'text-yellow-700 dark:text-yellow-300';
      case 'info':
        return 'text-blue-700 dark:text-blue-300';
      case 'api-key':
        return 'text-purple-700 dark:text-purple-300';
      default:
        return 'text-gray-700 dark:text-gray-300';
    }
  };

  return (
    <div
      className={`
        ${getToastStyles(toast.type)}
        p-4 rounded-lg border shadow-lg transform transition-all duration-300 ease-in-out
        animate-in slide-in-from-right-full hover:scale-105
        backdrop-blur-sm
      `}
    >
      <div className="flex items-start space-x-3">
        {getIcon(toast.type)}
        <div className="flex-1 min-w-0">
          <div className={`font-medium ${getTitleColor(toast.type)}`}>
            {toast.title}
          </div>
          {toast.description && (
            <div className={`mt-1 text-sm ${getDescriptionColor(toast.type)}`}>
              {toast.description}
            </div>
          )}
          {toast.action && (
            <div className="mt-3">
              <button
                onClick={toast.action.onClick}
                className={`
                  text-sm font-medium underline hover:no-underline
                  ${getTitleColor(toast.type)}
                `}
              >
                {toast.action.label}
              </button>
            </div>
          )}
        </div>
        <button
          onClick={() => onRemove(toast.id)}
          className={`
            ${getTitleColor(toast.type)} hover:opacity-70 transition-opacity
          `}
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};