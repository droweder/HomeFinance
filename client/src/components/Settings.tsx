import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Palette, Tag, CreditCard, Plus, Edit2, Trash2, Upload, Download, FileText, Wifi, WifiOff, CheckCircle, AlertCircle, Clock, Database, Bot, Eye, EyeOff, Key, Brain, Lightbulb, ChevronDown, ChevronUp, Package, User } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';
import { useToast } from './ui/toast';
import { useFinance } from '../context/FinanceContext';
import { useAccounts } from '../context/AccountContext';
import { useAuth } from '../context/AuthContext';
import { useCreditCard } from '../context/CreditCardContext';
import { useSupabaseSync } from '../hooks/useSupabaseSync';
import { supabase } from '../lib/supabase';
import { Category, Account } from '../types';
import CategoryForm from './CategoryForm';
import AccountForm from './AccountForm';
import ImportCSV from './ImportCSV';

const Settings: React.FC = () => {
  const { settings, updateSettings } = useSettings();
  const { categories, deleteCategory, expenses, income, transfers } = useFinance();
  const { accounts, deleteAccount } = useAccounts();
  const { currentUser } = useAuth();
  const { syncAllInvoicesToExpenses } = useCreditCard();
  const { showApiKeySuccess, showSuccess, showError } = useToast();
  const { isOnline, syncStatus, lastSyncTime, connectionStatus, syncData } = useSupabaseSync();
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [showAccountForm, setShowAccountForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [categorySearch, setCategorySearch] = useState('');
  const [accountSearch, setAccountSearch] = useState('');
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [tempGeminiKey, setTempGeminiKey] = useState(settings.geminiApiKey || '');
  const [tempGeminiModel, setTempGeminiModel] = useState(settings.geminiModel || 'gemini-2.0-flash');
  const [isSyncing, setIsSyncing] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);

  // Estados para controlar seções expandidas
  const [expandedSections, setExpandedSections] = useState<string[]>(['general']);

  const geminiModels = [
    { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' },
    { value: 'gemini-1.5-flash-8b', label: 'Gemini 1.5 Flash 8B' },
    { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
    { value: 'gemini-2.0-flash-exp', label: 'Gemini 2.0 Flash Experimental' },
    { value: 'gemini-2.0-flash-lite', label: 'Gemini 2.0 Flash Lite' },
    { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
    { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
    { value: 'gemma-3-12b', label: 'Gemma 3 12B' },
    { value: 'gemma-3-1b', label: 'Gemma 3 1B' },
  ];

  // Load user profile from Supabase auth.users
  const loadUserProfile = async () => {
    if (!currentUser) return;
    
    setLoadingProfile(true);
    try {
      // Use the simpler getUser method since admin access is not available
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (!userError && userData.user) {
        setUserProfile(userData.user);
      } else {
        console.error('Erro ao carregar dados do usuário:', userError);
        showError('Erro', 'Não foi possível carregar o perfil do usuário.');
      }
    } catch (error) {
      console.error('Erro completo ao carregar perfil:', error);
      showError('Erro', 'Não foi possível carregar o perfil do usuário.');
    } finally {
      setLoadingProfile(false);
    }
  };

  // Sync all invoices to expenses
  const handleSyncAllInvoices = async () => {
    setIsSyncing(true);
    try {
      await syncAllInvoicesToExpenses();
      showSuccess('Sincronização Concluída', 'Todas as faturas foram sincronizadas com a aba Despesas!');
    } catch (error) {
      console.error('Erro ao sincronizar faturas:', error);
      showError('Erro', 'Ocorreu um erro ao sincronizar as faturas.');
    } finally {
      setIsSyncing(false);
    }
  };

  // Load user profile on component mount
  useEffect(() => {
    if (currentUser) {
      loadUserProfile();
    }
  }, [currentUser]);

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => 
      prev.includes(sectionId) 
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  const handleThemeToggle = () => {
    updateSettings({ theme: settings.theme === 'light' ? 'dark' : 'light' });
  };

  const handleEditCategory = (category: Category) => {
    setEditingCategory(category);
    setShowCategoryForm(true);
  };

  const handleDeleteCategory = (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir esta categoria?')) {
      deleteCategory(id);
      showSuccess('Categoria excluída', 'A categoria foi removida com sucesso.');
    }
  };

  const handleEditAccount = (account: Account) => {
    setEditingAccount(account);
    setShowAccountForm(true);
  };

  const handleDeleteAccount = (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir esta conta?')) {
      deleteAccount(id);
      showSuccess('Conta excluída', 'A conta foi removida com sucesso.');
    }
  };

  const handleCategoryFormClose = () => {
    setShowCategoryForm(false);
    setEditingCategory(null);
  };

  const handleAccountFormClose = () => {
    setShowAccountForm(false);
    setEditingAccount(null);
  };

  const handleSaveGeminiKey = () => {
    updateSettings({
      geminiApiKey: tempGeminiKey,
      geminiModel: tempGeminiModel,
      aiSettings: {
        ...settings.aiSettings,
        geminiApiKey: tempGeminiKey,
        geminiModel: tempGeminiModel,
        enableAI: !!tempGeminiKey
      }
    });
    setShowGeminiKey(false);
    
    // Show custom notification instead of alert
    if (tempGeminiKey.trim()) {
      showApiKeySuccess('Gemini');
    } else {
      showSuccess('Chave API removida', 'A chave Gemini foi removida com sucesso.');
    }
  };

  const handleTestGeminiAPI = async () => {
    if (!tempGeminiKey) {
      showError('Erro', 'Por favor, insira a chave da API Gemini primeiro.');
      return;
    }

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${tempGeminiModel}:generateContent?key=${tempGeminiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: 'Teste de conexão' }] }]
          })
        }
      );
      
      if (response.ok) {
        showSuccess('API Testada', `API Gemini funcionando corretamente com o modelo ${tempGeminiModel}!`);
      } else {
        showError('Erro na API', 'Erro na API Gemini. Verifique sua chave e modelo selecionado.');
      }
    } catch (error) {
      showError('Erro', 'Erro ao testar a API Gemini.');
    }
  };

  const handleExportData = () => {
    try {
      const timestamp = new Date().toISOString().split('T')[0];
      
      // Export Expenses
      if (expenses && expenses.length > 0) {
        const expenseHeaders = ['Data', 'Categoria', 'Valor', 'Método de Pagamento', 'Descrição', 'Localização', 'Parcelas', 'Cartão de Crédito'];
        const expenseContent = [
          expenseHeaders.join(','),
          ...expenses.map(item => [
            item.date,
            `"${item.category || ''}"`,
            item.amount.toString().replace('.', ','),
            `"${item.paymentMethod || ''}"`,
            `"${item.description || ''}"`,
            `"${item.location || ''}"`,
            `"${item.installments || '1'}"`,
            `"${item.creditCard || ''}"`
          ].join(','))
        ].join('\n');
        
        const expenseBlob = new Blob(['\uFEFF' + expenseContent], { type: 'text/csv;charset=utf-8;' });
        const expenseUrl = URL.createObjectURL(expenseBlob);
        const expenseLink = document.createElement('a');
        expenseLink.href = expenseUrl;
        expenseLink.download = `despesas_${timestamp}.csv`;
        expenseLink.click();
        URL.revokeObjectURL(expenseUrl);
      }

      // Export Income
      if (income && income.length > 0) {
        const incomeHeaders = ['Data', 'Categoria', 'Valor', 'Conta', 'Descrição'];
        const incomeContent = [
          incomeHeaders.join(','),
          ...income.map(item => [
            item.date,
            `"${item.category || ''}"`,
            item.amount.toString().replace('.', ','),
            `"${item.account || ''}"`,
            `"${item.description || ''}"`
          ].join(','))
        ].join('\n');
        
        const incomeBlob = new Blob(['\uFEFF' + incomeContent], { type: 'text/csv;charset=utf-8;' });
        const incomeUrl = URL.createObjectURL(incomeBlob);
        const incomeLink = document.createElement('a');
        incomeLink.href = incomeUrl;
        incomeLink.download = `receitas_${timestamp}.csv`;
        incomeLink.click();
        URL.revokeObjectURL(incomeUrl);
      }

      // Export Transfers
      if (transfers && transfers.length > 0) {
        const transferHeaders = ['Data', 'Conta Origem', 'Conta Destino', 'Valor', 'Descrição'];
        const transferContent = [
          transferHeaders.join(','),
          ...transfers.map(item => [
            item.date,
            `"${item.fromAccount || ''}"`,
            `"${item.toAccount || ''}"`,
            item.amount.toString().replace('.', ','),
            `"${item.description || ''}"`
          ].join(','))
        ].join('\n');
        
        const transferBlob = new Blob(['\uFEFF' + transferContent], { type: 'text/csv;charset=utf-8;' });
        const transferUrl = URL.createObjectURL(transferBlob);
        const transferLink = document.createElement('a');
        transferLink.href = transferUrl;
        transferLink.download = `transferencias_${timestamp}.csv`;
        transferLink.click();
        URL.revokeObjectURL(transferUrl);
      }

      showSuccess('Exportação realizada', 'Dados exportados com sucesso!');
    } catch (error) {
      showError('Erro na exportação', 'Erro ao exportar dados.');
    }
  };

  const expenseCategories = categories.filter(cat => 
    cat.type === 'expense' && 
    cat.name.toLowerCase().includes(categorySearch.toLowerCase())
  );
  const incomeCategories = categories.filter(cat => 
    cat.type === 'income' && 
    cat.name.toLowerCase().includes(categorySearch.toLowerCase())
  );

  const filteredAccounts = accounts.filter(account =>
    account.name.toLowerCase().includes(accountSearch.toLowerCase())
  );

  const getSyncStatusIcon = () => {
    switch (syncStatus) {
      case 'syncing':
        return <Clock className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return isOnline ? <Wifi className="w-4 h-4 text-green-500" /> : <WifiOff className="w-4 h-4 text-gray-400" />;
    }
  };

  const getSyncStatusText = () => {
    switch (syncStatus) {
      case 'syncing':
        return 'Sincronizando...';
      case 'success':
        return 'Sincronizado';
      case 'error':
        return 'Erro na sincronização';
      default:
        return isOnline ? 'Online' : 'Offline';
    }
  };

  const getConnectionStatusIcon = () => {
    switch (connectionStatus) {
      case 'connected':
        return <Database className="w-4 h-4 text-green-500" />;
      case 'disconnected':
        return <Database className="w-4 h-4 text-red-500" />;
      case 'checking':
        return <Database className="w-4 h-4 text-blue-500 animate-pulse" />;
      default:
        return <Database className="w-4 h-4 text-gray-400" />;
    }
  };

  const getConnectionStatusText = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'Conectado ao Supabase';
      case 'disconnected':
        return 'Desconectado do Supabase';
      case 'checking':
        return 'Verificando conexão...';
      default:
        return 'Status desconhecido';
    }
  };

  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'text-green-600 dark:text-green-400';
      case 'disconnected':
        return 'text-red-600 dark:text-red-400';
      case 'checking':
        return 'text-blue-600 dark:text-blue-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  const sectionConfig = [
    {
      id: 'general',
      title: 'Configurações Gerais',
      icon: SettingsIcon,
      iconColor: 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400',
      description: 'Tema, sincronização e status de conexão'
    },
    {
      id: 'profile',
      title: 'Perfil do Usuário',
      icon: User,
      iconColor: 'bg-gray-100 dark:bg-gray-900 text-gray-600 dark:text-gray-400',
      description: 'Informações da conta e dados pessoais'
    },
    {
      id: 'sync',
      title: 'Sincronização',
      icon: Package,
      iconColor: 'bg-cyan-100 dark:bg-cyan-900 text-cyan-600 dark:text-cyan-400',
      description: 'Sincronizar faturas de cartão de crédito'
    },
    {
      id: 'data',
      title: 'Gerenciar Dados',
      icon: FileText,
      iconColor: 'bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400',
      description: 'Importar, exportar e fazer backup dos dados'
    },
    {
      id: 'categories',
      title: 'Categorias',
      icon: Tag,
      iconColor: 'bg-orange-100 dark:bg-orange-900 text-orange-600 dark:text-orange-400',
      description: 'Gerencie categorias de despesas e receitas'
    },
    {
      id: 'accounts',
      title: 'Contas',
      icon: CreditCard,
      iconColor: 'bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400',
      description: 'Gerencie suas contas bancárias e carteiras'
    },
    {
      id: 'ai',
      title: 'Assistente IA',
      icon: Brain,
      iconColor: 'bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-400',
      description: 'Configure o Gemini para análises inteligentes'
    }
  ];

  const renderGeneralSection = () => (
    <div className="space-y-4">
      {/* Status de Conexão */}
      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              {getConnectionStatusIcon()}
            </div>
            <div>
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Status da Conexão</h4>
              <p className={`text-xs ${getConnectionStatusColor()}`}>
                {getConnectionStatusText()}
              </p>
            </div>
          </div>
          <div className={`px-2 py-1 rounded-full text-xs font-medium ${
            connectionStatus === 'connected' 
              ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-300'
              : connectionStatus === 'disconnected'
              ? 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-300'
              : 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-300'
          }`}>
            {connectionStatus === 'connected' ? 'Conectado' : connectionStatus === 'disconnected' ? 'Desconectado' : 'Verificando'}
          </div>
        </div>
      </div>

      {/* Sincronização */}
      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              {getSyncStatusIcon()}
            </div>
            <div>
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Sincronização</h4>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Status: {getSyncStatusText()}
              </p>
              {lastSyncTime && (
                <p className="text-xs text-gray-500 dark:text-gray-500">
                  Última: {lastSyncTime.toLocaleString('pt-BR')}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={syncData}
            disabled={!isOnline || syncStatus === 'syncing' || connectionStatus !== 'connected'}
            className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            Sincronizar
          </button>
        </div>
      </div>

      {/* Tema */}
      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
              <Palette className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Tema</h4>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Escolha entre tema claro ou escuro
              </p>
            </div>
          </div>
          <button
            onClick={handleThemeToggle}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              settings.theme === 'dark' ? 'bg-blue-600' : 'bg-gray-200'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                settings.theme === 'dark' ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>
    </div>
  );

  const renderAISection = () => (
    <div className="space-y-4">
      {/* Status da IA */}
      <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${tempGeminiKey ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <div>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {tempGeminiKey ? 'API Configurada' : 'API Não Configurada'}
            </span>
            {tempGeminiKey && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Modelo: {geminiModels.find(m => m.value === tempGeminiModel)?.label || tempGeminiModel}
              </p>
            )}
          </div>
        </div>
        {tempGeminiKey && (
          <span className="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-300 text-xs font-medium rounded-full">
            Ativo
          </span>
        )}
      </div>

      {/* Campo da API Key */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Chave da API Gemini
        </label>
        <div className="relative">
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
            <Key className="w-4 h-4 text-gray-400" />
          </div>
          <input
            type={showGeminiKey ? 'text' : 'password'}
            value={tempGeminiKey}
            onChange={(e) => setTempGeminiKey(e.target.value)}
            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg pl-10 pr-12 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
            placeholder="AIzaSy..."
          />
          <button
            type="button"
            onClick={() => setShowGeminiKey(!showGeminiKey)}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            {showGeminiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Obtenha sua chave gratuita em <a href="https://makersuite.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Google AI Studio</a>
        </p>
      </div>

      {/* Campo de Seleção de Modelo */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Modelo do Gemini
        </label>
        <div className="relative">
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
            <Bot className="w-4 h-4 text-gray-400" />
          </div>
          <select
            value={tempGeminiModel}
            onChange={(e) => setTempGeminiModel(e.target.value)}
            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg pl-10 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white appearance-none bg-white dark:bg-gray-700"
          >
            {geminiModels.map((model) => (
              <option key={model.value} value={model.value}>
                {model.label}
              </option>
            ))}
          </select>
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Escolha o modelo do Gemini que deseja usar. Modelos mais recentes podem ter melhor performance.
        </p>
      </div>

      {/* Botões de Ação */}
      <div className="flex gap-3">
        <button
          onClick={handleTestGeminiAPI}
          disabled={!tempGeminiKey}
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          Testar API
        </button>
        <button
          onClick={handleSaveGeminiKey}
          className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
        >
          Salvar Chave
        </button>
      </div>

      {/* Info sobre recursos */}
      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
        <div className="flex items-start gap-3">
          <Lightbulb className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
          <div>
            <h4 className="text-sm font-medium text-blue-900 dark:text-blue-200 mb-1">
              Recursos do Assistente IA
            </h4>
            <ul className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
              <li>• Análise detalhada de gastos e receitas</li>
              <li>• Identificação de padrões de consumo</li>
              <li>• Sugestões personalizadas de economia</li>
              <li>• Planejamento orçamentário inteligente</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );

  const renderUserProfileSection = () => (
    <div className="space-y-4">
      {/* Status do carregamento */}
      {loadingProfile ? (
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600 dark:text-gray-400">Carregando perfil...</span>
        </div>
      ) : userProfile ? (
        <div className="space-y-4">
          {/* Informações Básicas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">ID do Usuário</h4>
              <p className="text-xs text-gray-600 dark:text-gray-400 font-mono break-all">{userProfile.id}</p>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">E-mail</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">{userProfile.email || 'Não informado'}</p>
              {userProfile.email_confirmed_at && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100 mt-1">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Confirmado
                </span>
              )}
            </div>
          </div>

          {/* Telefone */}
          {userProfile.phone && (
            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Telefone</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">{userProfile.phone}</p>
              {userProfile.phone_confirmed_at && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100 mt-1">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Confirmado
                </span>
              )}
            </div>
          )}

          {/* Informações de Data */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Conta Criada</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {userProfile.created_at ? new Date(userProfile.created_at).toLocaleDateString('pt-BR', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                }) : 'Data não disponível'}
              </p>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Último Login</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {userProfile.last_sign_in_at ? new Date(userProfile.last_sign_in_at).toLocaleDateString('pt-BR', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                }) : 'Nunca logou'}
              </p>
            </div>
          </div>

          {/* Metadados Personalizados */}
          {userProfile.raw_user_meta_data && Object.keys(userProfile.raw_user_meta_data).length > 0 && (
            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Metadados Personalizados</h4>
              <pre className="text-xs text-gray-600 dark:text-gray-400 font-mono overflow-x-auto">
                {JSON.stringify(userProfile.raw_user_meta_data, null, 2)}
              </pre>
            </div>
          )}

          {/* Botão para atualizar */}
          <div className="flex justify-end">
            <button
              onClick={loadUserProfile}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Atualizar Perfil
            </button>
          </div>
        </div>
      ) : (
        <div className="text-center p-8">
          <User className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400 mb-4">Não foi possível carregar as informações do perfil.</p>
          <button
            onClick={loadUserProfile}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Tentar Novamente
          </button>
        </div>
      )}
    </div>
  );

  const renderSyncSection = () => (
    <div className="space-y-4">
      {/* Descrição da funcionalidade */}
      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
        <div className="flex items-start gap-3">
          <Package className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
          <div>
            <h4 className="text-sm font-medium text-blue-900 dark:text-blue-200 mb-1">
              Sincronização de Faturas
            </h4>
            <p className="text-xs text-blue-700 dark:text-blue-300">
              Esta função agrupa todas as despesas de cartão de crédito por mês e método de pagamento, 
              criando faturas automáticas na aba Despesas. Útil para organizar seus gastos de cartão.
            </p>
          </div>
        </div>
      </div>

      {/* Botão de sincronização */}
      <div className="flex justify-center">
        <button
          onClick={handleSyncAllInvoices}
          disabled={isSyncing}
          className={`px-6 py-3 rounded-lg transition-colors flex items-center gap-3 font-medium ${
            isSyncing 
              ? 'bg-gray-400 cursor-not-allowed text-white' 
              : 'bg-green-600 hover:bg-green-700 text-white shadow-sm'
          }`}
        >
          <Package className="w-5 h-5" />
          {isSyncing ? 'Sincronizando Faturas...' : 'Sincronizar Todas as Faturas'}
        </button>
      </div>

      {/* Informações adicionais */}
      <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
          <div>
            <h4 className="text-sm font-medium text-yellow-900 dark:text-yellow-200 mb-1">
              Atenção
            </h4>
            <ul className="text-xs text-yellow-700 dark:text-yellow-300 space-y-1">
              <li>• A sincronização pode demorar alguns segundos dependendo da quantidade de dados</li>
              <li>• Faturas já existentes não serão duplicadas</li>
              <li>• As faturas serão criadas com a categoria "Cartão de Crédito"</li>
              <li>• O processo irá agrupar por cartão e mês automaticamente</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );

  const renderDataSection = () => (
    <div className="space-y-4">
      <button
        onClick={() => setShowImport(true)}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
      >
        <Upload className="w-4 h-4" />
        Importar Dados CSV
      </button>
      <button
        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        onClick={handleExportData}
      >
        <Download className="w-4 h-4" />
        Exportar Dados
      </button>
    </div>
  );

  const renderCategoriesSection = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Buscar categorias..."
            value={categorySearch}
            onChange={(e) => setCategorySearch(e.target.value)}
            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:text-white"
          />
        </div>
        <button
          onClick={() => setShowCategoryForm(true)}
          className="ml-3 bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Adicionar
        </button>
      </div>

      <div className="space-y-4 max-h-80 overflow-y-auto">
        {/* Categorias de Despesas */}
        <div>
          <h4 className="font-medium text-gray-900 dark:text-white mb-2 flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            Despesas ({expenseCategories.length})
          </h4>
          <div className="space-y-2">
            {expenseCategories.map((category) => (
              <div key={category.id} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <span className="text-sm text-gray-900 dark:text-white">{category.name}</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleEditCategory(category)}
                    className="p-1 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900 rounded transition-colors"
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => handleDeleteCategory(category.id)}
                    className="p-1 text-red-600 hover:bg-red-100 dark:hover:bg-red-900 rounded transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Categorias de Receitas */}
        <div>
          <h4 className="font-medium text-gray-900 dark:text-white mb-2 flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            Receitas ({incomeCategories.length})
          </h4>
          <div className="space-y-2">
            {incomeCategories.map((category) => (
              <div key={category.id} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <span className="text-sm text-gray-900 dark:text-white">{category.name}</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleEditCategory(category)}
                    className="p-1 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900 rounded transition-colors"
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => handleDeleteCategory(category.id)}
                    className="p-1 text-red-600 hover:bg-red-100 dark:hover:bg-red-900 rounded transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderAccountsSection = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Buscar contas..."
            value={accountSearch}
            onChange={(e) => setAccountSearch(e.target.value)}
            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
          />
        </div>
        <button
          onClick={() => setShowAccountForm(true)}
          className="ml-3 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Adicionar
        </button>
      </div>

      <div className="space-y-3 max-h-80 overflow-y-auto">
        {filteredAccounts.map((account) => (
          <div key={account.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-indigo-500 rounded-full"></div>
              <div>
                <span className="font-medium text-gray-900 dark:text-white">{account.name}</span>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Saldo inicial: R$ {account.initialBalance.toFixed(2).replace('.', ',')}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleEditAccount(account)}
                className="p-2 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900 rounded-lg transition-colors"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleDeleteAccount(account.id)}
                className="p-2 text-red-600 hover:bg-red-100 dark:hover:bg-red-900 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-xl">
            <SettingsIcon className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Configurações</h1>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">Personalize sua experiência e gerencie dados</p>
          </div>
        </div>
      </div>

      {/* Seções Expansíveis */}
      <div className="space-y-4">
        {sectionConfig.map((section) => {
          const isExpanded = expandedSections.includes(section.id);
          const Icon = section.icon;
          
          return (
            <div key={section.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
              {/* Header da Seção */}
              <button
                onClick={() => toggleSection(section.id)}
                className="w-full flex items-center justify-between p-4 sm:p-6 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className={`p-2 sm:p-3 rounded-lg ${section.iconColor}`}>
                    <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  <div className="text-left">
                    <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">{section.title}</h3>
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">{section.description}</p>
                  </div>
                </div>
                <div className="flex-shrink-0">
                  {isExpanded ? (
                    <ChevronUp className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  )}
                </div>
              </button>

              {/* Conteúdo da Seção */}
              {isExpanded && (
                <div className="border-t border-gray-100 dark:border-gray-700 p-4 sm:p-6">
                  {section.id === 'general' && renderGeneralSection()}
                  {section.id === 'profile' && renderUserProfileSection()}
                  {section.id === 'sync' && renderSyncSection()}
                  {section.id === 'ai' && renderAISection()}
                  {section.id === 'data' && renderDataSection()}
                  {section.id === 'categories' && renderCategoriesSection()}
                  {section.id === 'accounts' && renderAccountsSection()}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Modals */}
      {showCategoryForm && (
        <CategoryForm
          category={editingCategory}
          onClose={handleCategoryFormClose}
        />
      )}

      {showAccountForm && (
        <AccountForm
          account={editingAccount}
          onClose={handleAccountFormClose}
        />
      )}

      {showImport && (
        <ImportCSV onClose={() => setShowImport(false)} />
      )}
    </div>
  );
};

export default Settings;