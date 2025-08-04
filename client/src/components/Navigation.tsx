import React from 'react';
import { BarChart3, CreditCard, TrendingUp, Menu, X, Settings, Calendar, LogOut, Bot, ArrowRightLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';

// HomeFinance Custom Icon Component
const HomeFinanceIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* House shape */}
    <path d="M3 13.5L12 4.5L21 13.5V21H15V16H9V21H3V13.5Z" fill="currentColor" stroke="currentColor" strokeWidth="0.5"/>
    
    {/* Roof line */}
    <path d="M1 13.5L12 2.5L23 13.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    
    {/* Door */}
    <rect x="10.5" y="16" width="3" height="5" fill="rgba(0,0,0,0.3)"/>
    
    {/* Dollar sign overlay */}
    <circle cx="17" cy="10" r="3" fill="rgba(16,185,129,0.9)" stroke="rgba(5,120,87,0.9)" strokeWidth="0.5"/>
    <path d="M16.2 8.5h1.6M16.2 11.5h1.6M17 7.8v0.7M17 11.5v0.7M15.8 9.3h2.4a0.8 0.8 0 0 1 0 1.6h-1.6a0.8 0.8 0 0 1 0 1.6h2.4" 
          stroke="white" strokeWidth="0.6" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    
    {/* Window */}
    <rect x="6" y="15" width="1.5" height="1.5" fill="rgba(96,165,250,0.8)"/>
  </svg>
);

interface NavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const Navigation: React.FC<NavigationProps> = ({ activeTab, onTabChange }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const { currentUser, logout, isLoggingOut } = useAuth();
  const { settings } = useSettings();

  const tabs = [
    { id: 'dashboard', label: settings.language === 'pt-BR' ? 'Dashboard' : 'Dashboard', icon: BarChart3 },
    { id: 'expenses', label: settings.language === 'pt-BR' ? 'Despesas' : 'Expenses', icon: CreditCard },
    { id: 'income', label: settings.language === 'pt-BR' ? 'Receitas' : 'Income', icon: TrendingUp },
    { id: 'transfers', label: settings.language === 'pt-BR' ? 'Transferências' : 'Transfers', icon: ArrowRightLeft },
    { id: 'credit-cards', label: settings.language === 'pt-BR' ? 'Cartão' : 'Credit Cards', icon: CreditCard },
    { id: 'daily-summary', label: settings.language === 'pt-BR' ? 'Fluxo' : 'Flow', icon: Calendar },
    { id: 'ai-chat', label: settings.language === 'pt-BR' ? 'IA Financeira' : 'Financial AI', icon: Bot },
    { id: 'settings', label: settings.language === 'pt-BR' ? 'Configurações' : 'Settings', icon: Settings },
  ];

  const handleTabClick = (tabId: string) => {
    onTabChange(tabId);
    setMobileMenuOpen(false);
  };

  const handleLogout = () => {
    logout();
    setMobileMenuOpen(false);
  };

  return (
    <nav className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-lg">
              <HomeFinanceIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">HomeFinance</h1>
              {currentUser && (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {settings.language === 'pt-BR' ? 'Olá' : 'Hello'}, {currentUser.username}
                </p>
              )}
            </div>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center space-x-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabClick(tab.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-sm ${
                    activeTab === tab.id
                      ? 'bg-blue-50 dark:bg-blue-900 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-sm ${
                isLoggingOut
                  ? 'text-gray-400 dark:text-gray-600 cursor-not-allowed bg-gray-100 dark:bg-gray-800'
                  : 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'
              }`}
            >
              {isLoggingOut ? (
                <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
              ) : (
                <LogOut className="w-4 h-4" />
              )}
              {isLoggingOut 
                ? (settings.language === 'pt-BR' ? 'Saindo...' : 'Logging out...')
                : (settings.language === 'pt-BR' ? 'Sair' : 'Logout')
              }
            </button>
          </div>

          {/* Mobile menu button */}
          <div className="lg:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-gray-200 dark:border-gray-700 py-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabClick(tab.id)}
                  className={`flex items-center gap-3 w-full px-4 py-3 text-left transition-colors ${
                    activeTab === tab.id
                      ? 'bg-blue-50 dark:bg-blue-900 text-blue-600 dark:text-blue-400 border-r-2 border-blue-600'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {tab.label}
                </button>
              );
            })}
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className={`flex items-center gap-3 w-full px-4 py-3 text-left transition-colors ${
                isLoggingOut
                  ? 'text-gray-400 dark:text-gray-600 cursor-not-allowed bg-gray-100 dark:bg-gray-800'
                  : 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'
              }`}
            >
              {isLoggingOut ? (
                <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
              ) : (
                <LogOut className="w-5 h-5" />
              )}
              {isLoggingOut 
                ? (settings.language === 'pt-BR' ? 'Saindo...' : 'Logging out...')
                : (settings.language === 'pt-BR' ? 'Sair' : 'Logout')
              }
            </button>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navigation;