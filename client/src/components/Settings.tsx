import React, { useState } from 'react';
import { Settings as SettingsIcon, Palette, Tag, CreditCard, Plus, Edit2, Trash2, Upload, Download, FileText, Wifi, WifiOff, CheckCircle, AlertCircle, Clock, Database, Bot, Eye, EyeOff, Key } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';
import { useFinance } from '../context/FinanceContext';
import { useAccounts } from '../context/AccountContext';
import { useAuth } from '../context/AuthContext';
import { useSupabaseSync } from '../hooks/useSupabaseSync';
import { Category, Account } from '../types';
import CategoryForm from './CategoryForm';
import AccountForm from './AccountForm';
import ImportCSV from './ImportCSV';

const Settings: React.FC = () => {
  const { settings, updateSettings } = useSettings();
  const { categories, deleteCategory } = useFinance();
  const { accounts, deleteAccount } = useAccounts();
  const { currentUser } = useAuth();
  const { isOnline, syncStatus, lastSyncTime, connectionStatus, syncData } = useSupabaseSync();
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [showAccountForm, setShowAccountForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [categorySearch, setCategorySearch] = useState('');
  const [accountSearch, setAccountSearch] = useState('');
  const [showGrokKey, setShowGrokKey] = useState(false);
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [tempAISettings, setTempAISettings] = useState(settings.aiSettings || {
    grokApiKey: '',
    geminiApiKey: '',
    preferredProvider: 'gemini' as 'grok' | 'gemini',
    enableAI: false,
  });

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
    }
  };

  const handleEditAccount = (account: Account) => {
    setEditingAccount(account);
    setShowAccountForm(true);
  };

  const handleDeleteAccount = (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir esta conta?')) {
      deleteAccount(id);
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

  const handleSaveAISettings = () => {
    updateSettings({ aiSettings: tempAISettings });
    alert('Configurações de IA salvas com sucesso!');
  };

  const handleTestAPI = async (provider: 'grok' | 'gemini') => {
    const apiKey = provider === 'grok' ? tempAISettings.grokApiKey : tempAISettings.geminiApiKey;
    
    if (!apiKey) {
      alert(`Por favor, insira a chave da API ${provider === 'grok' ? 'Grok' : 'Gemini'} primeiro.`);
      return;
    }

    // Placeholder para teste futuro
    alert(`Teste da API ${provider === 'grok' ? 'Grok' : 'Gemini'} será implementado em breve.`);
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <SettingsIcon className="w-8 h-8 text-blue-600" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Configurações</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">Personalize sua experiência e gerencie dados</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Coluna Esquerda - Configurações Gerais */}
        <div className="space-y-6">
          {/* Status de Conexão com Supabase */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                  {getConnectionStatusIcon()}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Status da Conexão</h3>
                  <p className={`text-sm font-medium ${getConnectionStatusColor()}`}>
                    {getConnectionStatusText()}
                  </p>
                </div>
              </div>
              <div className={`px-3 py-1 rounded-full text-xs font-medium ${
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
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                  {getSyncStatusIcon()}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Sincronização</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Status: {getSyncStatusText()}
                  </p>
                  {lastSyncTime && (
                    <p className="text-xs text-gray-500 dark:text-gray-500">
                      Última sincronização: {lastSyncTime.toLocaleString('pt-BR')}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={syncData}
                disabled={!isOnline || syncStatus === 'syncing' || connectionStatus !== 'connected'}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Sincronizar
              </button>
            </div>
          </div>

          {/* Tema */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                  <Palette className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Tema</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
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

          {/* Configurações de IA */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                <Bot className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Inteligência Artificial</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Configure APIs para análises inteligentes dos seus dados financeiros
                </p>
              </div>
            </div>

            {/* Habilitar IA */}
            <div className="mb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                    <Bot className="w-4 h-4 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <h4 className="text-md font-semibold text-gray-900 dark:text-white">Habilitar IA</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Ative para usar análises inteligentes
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setTempAISettings(prev => ({ ...prev, enableAI: !prev.enableAI }))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    tempAISettings.enableAI ? 'bg-green-600' : 'bg-gray-200 dark:bg-gray-600'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      tempAISettings.enableAI ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Configurações de API */}
            <div className="space-y-6">
              {/* Grok API */}
              <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-black dark:bg-white rounded-lg flex items-center justify-center">
                      <span className="text-white dark:text-black font-bold text-sm">X</span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-white">Grok API (X.AI)</h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400">API da xAI para análises avançadas</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleTestAPI('grok')}
                    disabled={!tempAISettings.grokApiKey}
                    className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    Testar
                  </button>
                </div>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                    <Key className="w-4 h-4 text-gray-400" />
                  </div>
                  <input
                    type={showGrokKey ? 'text' : 'password'}
                    value={tempAISettings.grokApiKey}
                    onChange={(e) => setTempAISettings(prev => ({ ...prev, grokApiKey: e.target.value }))}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg pl-10 pr-12 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                    placeholder="xai-..."
                  />
                  <button
                    type="button"
                    onClick={() => setShowGrokKey(!showGrokKey)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    {showGrokKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Gemini API */}
              <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                      <span className="text-white font-bold text-sm">G</span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-white">Gemini API (Google)</h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400">API do Google para análises inteligentes</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleTestAPI('gemini')}
                    disabled={!tempAISettings.geminiApiKey}
                    className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    Testar
                  </button>
                </div>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                    <Key className="w-4 h-4 text-gray-400" />
                  </div>
                  <input
                    type={showGeminiKey ? 'text' : 'password'}
                    value={tempAISettings.geminiApiKey}
                    onChange={(e) => setTempAISettings(prev => ({ ...prev, geminiApiKey: e.target.value }))}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg pl-10 pr-12 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                    placeholder="AIza..."
                  />
                  <button
                    type="button"
                    onClick={() => setShowGeminiKey(!showGeminiKey)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    {showGeminiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Provedor Preferido */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Provedor Preferido
                </label>
                <select
                  value={tempAISettings.preferredProvider}
                  onChange={(e) => setTempAISettings(prev => ({ ...prev, preferredProvider: e.target.value as 'grok' | 'gemini' }))}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="gemini">Gemini (Google) - Recomendado</option>
                  <option value="grok">Grok (X.AI)</option>
                </select>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Escolha qual API usar por padrão para análises
                </p>
              </div>

              {/* Botão Salvar */}
              <div className="flex justify-end">
                <button
                  onClick={handleSaveAISettings}
                  className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
                >
                  Salvar Configurações de IA
                </button>
              </div>
            </div>

            {/* Informações de Segurança */}
            <div className="mt-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5" />
                <div>
                  <h4 className="font-medium text-amber-900 dark:text-amber-300">Informações de Segurança</h4>
                  <ul className="text-sm text-amber-800 dark:text-amber-400 mt-2 space-y-1">
                    <li>• As chaves de API são armazenadas localmente no seu navegador</li>
                    <li>• Seus dados financeiros são anonimizados antes de serem enviados para análise</li>
                    <li>• Informações pessoais como descrições e locais não são compartilhadas</li>
                    <li>• Você pode revogar o acesso a qualquer momento removendo as chaves</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Importar/Exportar Dados */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-indigo-100 dark:bg-indigo-900 rounded-lg">
                <FileText className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Dados</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Importe ou exporte seus dados financeiros
                </p>
              </div>
            </div>
            <div className="space-y-3">
              <button
                onClick={() => setShowImport(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Upload className="w-4 h-4" />
                Importar Dados CSV
              </button>
              <button
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                onClick={() => {
                  // Implementar exportação futuramente
                  alert('Funcionalidade de exportação será implementada em breve');
                }}
              >
                <Download className="w-4 h-4" />
                Exportar Dados
              </button>
            </div>
          </div>
        </div>

        {/* Coluna Direita - Gerenciamento */}
        <div className="space-y-6">
          {/* Categorias */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg">
                  <Tag className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Categorias</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Gerencie suas categorias de despesas e receitas
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowCategoryForm(true)}
                className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Adicionar
              </button>
            </div>

            {/* Search */}
            <div className="mb-4">
              <input
                type="text"
                placeholder="Buscar categorias..."
                value={categorySearch}
                onChange={(e) => setCategorySearch(e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div className="space-y-4 max-h-96 overflow-y-auto">
              {/* Categorias de Despesas */}
              <div>
                <h4 className="sticky top-0 bg-white dark:bg-gray-800 py-2 z-10 font-medium text-gray-900 dark:text-white mb-2 flex items-center gap-2">
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
                <h4 className="sticky top-0 bg-white dark:bg-gray-800 py-2 z-10 font-medium text-gray-900 dark:text-white mb-2 flex items-center gap-2">
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

          {/* Contas */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-100 dark:bg-indigo-900 rounded-lg">
                  <CreditCard className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Contas</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Gerencie suas contas bancárias e carteiras
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAccountForm(true)}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Adicionar
              </button>
            </div>

            {/* Search */}
            <div className="mb-4">
              <input
                type="text"
                placeholder="Buscar contas..."
                value={accountSearch}
                onChange={(e) => setAccountSearch(e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto">
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
        </div>
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