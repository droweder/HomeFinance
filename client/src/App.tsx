import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './components/ui/toast';
import { SettingsProvider } from './context/SettingsContext';
import { AccountProvider } from './context/AccountContext';
import { FinanceProvider } from './context/FinanceContext';
import { useSupabaseSync } from './hooks/useSupabaseSync';
import Navigation from './components/Navigation';
import Dashboard from './components/Dashboard';
import ExpenseList from './components/ExpenseList';
import IncomeList from './components/IncomeList';
import TransferList from './components/TransferList';
import Settings from './components/Settings';
import DailyAccountSummary from './components/DailyAccountSummary';
import FinancialAIChat from './components/FinancialAIChat';
import Login from './components/Login';

// Error Boundary Component
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('❌ Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-8 text-center max-w-md">
            <div className="mx-auto w-16 h-16 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Ops! Algo deu errado</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Ocorreu um erro inesperado. Tente recarregar a página.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Recarregar Página
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
const AppContent: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const { connectionStatus } = useSupabaseSync();
  const [activeTab, setActiveTab] = useState(() => {
    // Preserve tab from localStorage to prevent auto-navigation to dashboard
    const savedTab = localStorage.getItem('finance-app-active-tab');
    return savedTab || 'dashboard';
  });

  // Save active tab to localStorage to prevent tab resets
  React.useEffect(() => {
    localStorage.setItem('finance-app-active-tab', activeTab);
  }, [activeTab]);

  // Verificar se está autenticado e conectado ao Supabase
  if (!isAuthenticated) {
    return <Login />;
  }

  if (connectionStatus === 'disconnected') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 w-full max-w-md text-center">
          <div className="mx-auto w-16 h-16 bg-red-600 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Conexão Perdida</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Não foi possível conectar ao Supabase. Verifique sua conexão com a internet e as configurações do projeto.
          </p>
          <div className="text-left bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-4">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Possíveis causas:</h3>
            <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
              <li>• Variáveis de ambiente não configuradas</li>
              <li>• Projeto Supabase pausado ou inativo</li>
              <li>• Problemas de conectividade</li>
              <li>• Configurações de RLS incorretas</li>
            </ul>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="w-full bg-red-600 text-white py-3 rounded-lg hover:bg-red-700 transition-colors font-medium"
          >
            Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  const renderContent = () => {
    try {
      switch (activeTab) {
        case 'dashboard':
          return <Dashboard />;
        case 'expenses':
          return <ExpenseList />;
        case 'income':
          return <IncomeList />;
        case 'transfers':
          return <TransferList />;
        case 'daily-summary':
          return <DailyAccountSummary />;
        case 'ai-chat':
          return <FinancialAIChat />;
        case 'settings':
          return <Settings />;
        default:
          return <Dashboard />;
      }
    } catch (error) {
      console.error('❌ Error rendering content:', error);
      return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-8 text-center">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Erro ao carregar conteúdo</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Ocorreu um erro ao carregar esta seção. Tente navegar para outra aba.
            </p>
            <button
              onClick={() => setActiveTab('dashboard')}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Ir para Dashboard
            </button>
          </div>
        </div>
      );
    }
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Navigation activeTab={activeTab} onTabChange={setActiveTab} />
        <main>{renderContent()}</main>
      </div>
    </ErrorBoundary>
  );
};

function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <AuthProvider>
          <SettingsProvider>
            <AccountProvider>
              <FinanceProvider>
                <AppContent />
              </FinanceProvider>
            </AccountProvider>
          </SettingsProvider>
        </AuthProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
}

export default App;