import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Calendar, DollarSign, Filter, Search, X, Package } from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { useSettings } from '../context/SettingsContext';
import { Income } from '../types';
import IncomeForm from './IncomeForm';

const IncomeList: React.FC = () => {
  const { income, deleteIncome, categories, filters, updateFilters } = useFinance();
  const { formatCurrency, formatDate, settings } = useSettings();
  const [showForm, setShowForm] = useState(false);
  const [editingIncome, setEditingIncome] = useState<Income | null>(null);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [tempFilters, setTempFilters] = useState(filters.income);

  const filteredIncome = income.filter(incomeItem => {
    const incomeFilters = filters.income;
    if (incomeFilters.source && incomeItem.source !== incomeFilters.source) return false;
    if (incomeFilters.startDate && incomeItem.date < incomeFilters.startDate) return false;
    if (incomeFilters.endDate && incomeItem.date > incomeFilters.endDate) return false;
    if (incomeFilters.account && incomeItem.account !== incomeFilters.account) return false;
    if (incomeFilters.description && !incomeItem.notes?.toLowerCase().includes(incomeFilters.description.toLowerCase())) return false;
    if (incomeFilters.location && !incomeItem.location?.toLowerCase().includes(incomeFilters.location.toLowerCase())) return false;
    return true;
  });

  // Apply sorting based on filters
  const sortedIncome = [...filteredIncome].sort((a, b) => {
    const sortConfig = filters.income.sortBy || [];
    
    for (const sort of sortConfig) {
      let aValue: any, bValue: any;
      
      switch (sort.column) {
        case 'date':
          aValue = new Date(a.date).getTime();
          bValue = new Date(b.date).getTime();
          break;
        case 'source':
          aValue = a.source.toLowerCase();
          bValue = b.source.toLowerCase();
          break;
        case 'amount':
          aValue = a.amount;
          bValue = b.amount;
          break;
        case 'description':
          aValue = (a.notes || '').toLowerCase();
          bValue = (b.notes || '').toLowerCase();
          break;
        case 'location':
          aValue = (a.location || '').toLowerCase();
          bValue = (b.location || '').toLowerCase();
          break;
        case 'account':
          aValue = (a.account || '').toLowerCase();
          bValue = (b.account || '').toLowerCase();
          break;
        default:
          continue;
      }
      
      if (aValue < bValue) return sort.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sort.direction === 'asc' ? 1 : -1;
    }
    
    // Default sort by date descending
    const dateA = new Date(a.date).getTime();
    const dateB = new Date(b.date).getTime();
    return dateB - dateA;
  });

  const handleEdit = (income: Income) => {
    setEditingIncome(income);
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir esta receita?')) {
      deleteIncome(id);
    }
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingIncome(null);
  };

  const handleOpenFilterModal = () => {
    setTempFilters(filters.income);
    setShowFilterModal(true);
  };

  const handleApplyFilters = () => {
    updateFilters('income', tempFilters);
    setShowFilterModal(false);
  };

  const handleCancelFilters = () => {
    setTempFilters(filters.income);
    setShowFilterModal(false);
  };

  const totalIncome = sortedIncome.reduce((sum, item) => sum + item.amount, 0);
  const incomeCategories = categories.filter(cat => cat.type === 'income');

  const labels = {
    title: 'Receitas',
    subtitle: 'Acompanhe suas fontes de receita',
    add: 'Adicionar Receita',
    totalIncome: 'Total de Receitas',
    filters: 'Filtros',
    category: 'Categoria',
    allCategories: 'Todas as Categorias',
    startDate: 'Data Inicial',
    endDate: 'Data Final',
    account: 'Conta',
    allAccounts: 'Todas as Contas',
    date: 'Data',
    amount: 'Valor',
    location: 'Local/Pessoa',
    description: 'Descrição',
    installments: 'Parcelas',
    actions: 'Ações',
    noRecords: 'Nenhuma receita encontrada.',
    search: 'Buscar...',
  };

  // Get unique sources and accounts for filters
  const uniqueSources = [...new Set(income.map(item => item.source))];
  const uniqueAccounts = [...new Set(income.map(item => item.account).filter(Boolean))];

  const sortColumns = [
    { value: 'date', label: 'Data' },
    { value: 'source', label: 'Fonte' },
    { value: 'amount', label: 'Valor' },
    { value: 'description', label: 'Descrição' },
    { value: 'location', label: 'Local/Pessoa' },
    { value: 'account', label: 'Conta' },
  ];

  const addSortColumn = () => {
    if ((tempFilters.sortBy || []).length < 6) {
      setTempFilters(prev => ({
        ...prev,
        sortBy: [...(prev.sortBy || []), { column: 'date', direction: 'desc' }]
      }));
    }
  };

  const removeSortColumn = (index: number) => {
    setTempFilters(prev => ({
      ...prev,
      sortBy: (prev.sortBy || []).filter((_, i) => i !== index)
    }));
  };

  const updateSortColumn = (index: number, field: 'column' | 'direction', value: string) => {
    setTempFilters(prev => ({
      ...prev,
      sortBy: (prev.sortBy || []).map((sort, i) => 
        i === index ? { ...sort, [field]: value } : sort
      )
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Fixed Header */}
        <div className="fixed top-16 left-0 right-0 z-30 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
          <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{labels.title}</h1>
                <p className="text-gray-600 dark:text-gray-400 mt-2">{labels.subtitle}</p>
              </div>
              <div className="flex items-center gap-3">
                {/* Total integrado na barra superior */}
                <div className="flex items-center gap-2 px-3 py-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <DollarSign className="w-4 h-4 text-green-600 dark:text-green-400" />
                  <div>
                    <span className="text-xs text-green-600 dark:text-green-400 font-medium">{labels.totalIncome}: </span>
                    <span className="text-sm font-bold text-green-700 dark:text-green-300">{formatCurrency(totalIncome)}</span>
                  </div>
                </div>
                <button
                  onClick={handleOpenFilterModal}
                  className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2"
                >
                  <Filter className="w-4 h-4" />
                  Filtros
                </button>
                <button
                  onClick={() => setShowForm(true)}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  {labels.add}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Content with top margin to account for fixed header */}
        <div className="pt-32">


          {/* Income List */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto max-h-[calc(100vh-240px)] relative">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600 sticky top-0 z-20">
                  <tr>
                    <th className="text-left py-1.5 px-2 font-medium text-gray-900 dark:text-white text-sm">{labels.category}</th>
                    <th className="text-left py-1.5 px-2 font-medium text-gray-900 dark:text-white text-sm">{labels.location}</th>
                    <th className="text-left py-1.5 px-2 font-medium text-gray-900 dark:text-white text-sm">{labels.description}</th>
                    <th className="text-left py-1.5 px-2 font-medium text-gray-900 dark:text-white text-sm">{labels.amount}</th>
                    <th className="text-left py-1.5 px-2 font-medium text-gray-900 dark:text-white text-sm">{labels.account}</th>
                    <th className="text-left py-1.5 px-2 font-medium text-gray-900 dark:text-white text-sm">{labels.installments}</th>
                    <th className="text-left py-1.5 px-2 font-medium text-gray-900 dark:text-white text-sm">{labels.date}</th>
                    <th className="text-left py-1.5 px-2 font-medium text-gray-900 dark:text-white text-sm">{labels.actions}</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedIncome.map((incomeItem) => (
                    <tr key={incomeItem.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                      <td className="py-1 px-2">
                        <span className="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-300 rounded-full text-xs font-medium">
                          {incomeItem.source}
                        </span>
                      </td>
                      <td className="py-1 px-2 text-sm text-gray-600 dark:text-gray-400">
                        {incomeItem.location || '-'}
                      </td>
                      <td className="py-1 px-2 text-sm text-gray-600 dark:text-gray-400">
                        {incomeItem.notes || '-'}
                      </td>
                      <td className="py-1 px-2 text-sm font-medium text-gray-900 dark:text-white">
                        {formatCurrency(incomeItem.amount)}
                      </td>
                      <td className="py-1 px-2 text-sm text-gray-600 dark:text-gray-400">
                        {incomeItem.account || '-'}
                      </td>
                      <td className="py-1 px-2 text-sm">
                        -
                      </td>
                      <td className="py-1 px-2">
                        <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {formatDate(incomeItem.date)}
                          </span>
                        </div>
                      </td>
                      <td className="py-1 px-2">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEdit(incomeItem)}
                            className="p-1.5 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900 rounded-lg transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(incomeItem.id)}
                            className="p-1.5 text-red-600 hover:bg-red-100 dark:hover:bg-red-900 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {sortedIncome.length === 0 && (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                {labels.noRecords}
              </div>
            )}
          </div>
        </div>

        {/* Filter Modal */}
        {showFilterModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-6xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Filtros de Receitas</h2>
                <button
                  onClick={handleCancelFilters}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-6">
                {/* Agrupamento de Receitas Recorrentes */}
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="groupRecurring"
                      checked={tempFilters.groupRecurring || false}
                      onChange={(e) => setTempFilters(prev => ({ ...prev, groupRecurring: e.target.checked }))}
                      className="w-4 h-4 text-green-600 bg-gray-100 border-gray-300 rounded focus:ring-green-500 dark:bg-gray-700 dark:border-gray-600"
                    />
                    <label htmlFor="groupRecurring" className="flex items-center gap-2 text-sm font-medium text-green-800 dark:text-green-300">
                      <Package className="w-4 h-4" />
                      Agrupar Receitas Recorrentes
                    </label>
                  </div>
                  <p className="text-xs text-green-700 dark:text-green-400 mt-2 ml-7">
                    Quando ativo, agrupa receitas similares que se repetem mensalmente
                  </p>
                </div>

                {/* Ordenação */}
                <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-purple-800 dark:text-purple-300">Ordenação</h3>
                    <button
                      onClick={addSortColumn}
                      disabled={(tempFilters.sortBy || []).length >= 6}
                      className="bg-purple-600 text-white px-3 py-1 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                    >
                      Adicionar Coluna
                    </button>
                  </div>
                  <div className="space-y-3">
                    {(tempFilters.sortBy || []).map((sort, index) => (
                      <div key={index} className="flex items-center gap-3">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 w-8">
                          {index + 1}.
                        </span>
                        <select
                          value={sort.column}
                          onChange={(e) => updateSortColumn(index, 'column', e.target.value)}
                          className="flex-1 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                        >
                          {sortColumns.map(col => (
                            <option key={col.value} value={col.value}>{col.label}</option>
                          ))}
                        </select>
                        <select
                          value={sort.direction}
                          onChange={(e) => updateSortColumn(index, 'direction', e.target.value)}
                          className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                        >
                          <option value="asc">Crescente</option>
                          <option value="desc">Decrescente</option>
                        </select>
                        <button
                          onClick={() => removeSortColumn(index)}
                          className="p-2 text-red-600 hover:bg-red-100 dark:hover:bg-red-900 rounded-lg transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    {(tempFilters.sortBy || []).length === 0 && (
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Nenhuma ordenação personalizada. Usando ordenação padrão por data (mais recente primeiro).
                      </p>
                    )}
                  </div>
                </div>

                {/* Filtros Básicos */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{labels.category}</label>
                    <select
                      value={tempFilters.source}
                      onChange={(e) => setTempFilters(prev => ({ ...prev, source: e.target.value }))}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
                    >
                      <option value="">{labels.allCategories}</option>
                      {uniqueSources.map(source => (
                        <option key={source} value={source}>{source}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{labels.account}</label>
                    <select
                      value={tempFilters.account}
                      onChange={(e) => setTempFilters(prev => ({ ...prev, account: e.target.value }))}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
                    >
                      <option value="">{labels.allAccounts}</option>
                      {uniqueAccounts.map(account => (
                        <option key={account} value={account}>{account}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{labels.description}</label>
                    <div className="relative">
                      <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        value={tempFilters.description || ''}
                        onChange={(e) => setTempFilters(prev => ({ ...prev, description: e.target.value }))}
                        className="w-full border border-gray-300 dark:border-gray-600 rounded-lg pl-10 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
                        placeholder={labels.search}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{labels.location}</label>
                    <div className="relative">
                      <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        value={tempFilters.location || ''}
                        onChange={(e) => setTempFilters(prev => ({ ...prev, location: e.target.value }))}
                        className="w-full border border-gray-300 dark:border-gray-600 rounded-lg pl-10 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
                        placeholder={labels.search}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{labels.startDate}</label>
                    <input
                      type="date"
                      value={tempFilters.startDate}
                      onChange={(e) => setTempFilters(prev => ({ ...prev, startDate: e.target.value }))}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{labels.endDate}</label>
                    <input
                      type="date"
                      value={tempFilters.endDate}
                      onChange={(e) => setTempFilters(prev => ({ ...prev, endDate: e.target.value }))}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end gap-3 mt-8">
                <button
                  onClick={() => {
                    setTempFilters({
                      source: '',
                      account: '',
                      startDate: '',
                      endDate: '',
                      description: '',
                      location: '',
                      groupRecurring: false,
                      sortBy: [],
                    });
                  }}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  Limpar Filtros
                </button>
                <button
                  onClick={handleCancelFilters}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleApplyFilters}
                  className="px-4 py-2 text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
                >
                  Aplicar Filtros
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Form Modal */}
        {showForm && (
          <IncomeForm
            income={editingIncome}
            onClose={handleFormClose}
          />
        )}
      </div>
    </div>
  );
};

export default IncomeList;