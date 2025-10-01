import React, { useState, useMemo, useCallback } from 'react';
import { Plus, Edit2, Trash2, Calendar, DollarSign, Filter, Search, X, Package, CreditCard, ChevronLeft, ChevronRight } from 'lucide-react';
import { FixedSizeList as List } from 'react-window';
import { useFinance } from '../context/FinanceContext';
import { useSettings } from '../context/SettingsContext';
import { Expense } from '../types';
import ExpenseForm from './ExpenseForm';
import ConfirmDialog from './ConfirmDialog';

const ExpenseList: React.FC = () => {
  const { expenses, deleteExpense, categories, filters, updateFilters } = useFinance();
  const { formatCurrency, formatDate, settings } = useSettings();
  
  // Debug para verificar quantas despesas chegaram no componente
  console.log('📊 ExpenseList - Despesas recebidas:', {
    total: expenses.length,
    esperado: 3530,
    status: expenses.length >= 3530 ? '✅ COMPLETO' : 
            expenses.length > 0 ? `⚠️ PARCIAL (${((expenses.length / 3530) * 100).toFixed(1)}%)` : 
            '❌ VAZIO',
    percentual: `${((expenses.length / 3530) * 100).toFixed(1)}%`,
    primeiras3: expenses.slice(0, 3).map(exp => ({
      id: exp.id,
      category: exp.category,
      amount: exp.amount,
      date: exp.date
    })),
    ultimas3: expenses.slice(-3).map(exp => ({
      id: exp.id,
      category: exp.category,
      amount: exp.amount,
      date: exp.date
    }))
  });
  
  const [showForm, setShowForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [tempFilters, setTempFilters] = useState(filters.expenses);
  const [selectedExpenses, setSelectedExpenses] = useState<Set<string>>(new Set());
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
  });

  // Check if there are active filters (excluding date filters)
  const hasActiveFilters = useMemo(() => {
    const f = filters.expenses;
    return !!(f.category || f.account || f.description || f.location || f.installmentGroup || 
              f.isCreditCard !== 'all' || (f.sortBy && f.sortBy.length > 0));
  }, [filters.expenses]);

  // PERFORMANCE: Filter data based on active filters
  const baseFilteredExpenses = useMemo(() => {
    // If there are date filters defined, use those
    if (filters.expenses.startDate || filters.expenses.endDate) {
      return expenses.filter(expense => {
        const expenseDate = expense.date;
        if (filters.expenses.startDate && expenseDate < filters.expenses.startDate) return false;
        if (filters.expenses.endDate && expenseDate > filters.expenses.endDate) return false;
        return true;
      });
    }
    
    // If there are active filters, show all data (don't filter by month)
    if (hasActiveFilters) {
      return expenses;
    }
    
    // Otherwise, use month filtering for performance
    return expenses.filter(expense => {
      const expenseMonth = expense.date.substring(0, 7); // YYYY-MM format
      return expenseMonth === selectedMonth;
    });
  }, [expenses, selectedMonth, filters.expenses.startDate, filters.expenses.endDate, hasActiveFilters]);

  // Get available months for dropdown
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    const dataToAnalyze = hasActiveFilters ? baseFilteredExpenses : expenses;
    
    dataToAnalyze.forEach(expense => {
      const month = expense.date.substring(0, 7);
      months.add(month);
    });
    return Array.from(months).sort().reverse(); // Most recent first
  }, [expenses, baseFilteredExpenses, hasActiveFilters]);

  // Generate period display for month selector when filters are active
  const periodDisplay = useMemo(() => {
    if (!hasActiveFilters || availableMonths.length === 0) {
      return '';
    }
    
    if (availableMonths.length === 1) {
      const [year, month] = availableMonths[0].split('-');
      const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      return `${monthNames[parseInt(month) - 1]} ${year}`;
    }
    
    const newest = availableMonths[0].split('-');
    const oldest = availableMonths[availableMonths.length - 1].split('-');
    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    
    return `${monthNames[parseInt(oldest[1]) - 1]} ${oldest[0]} - ${monthNames[parseInt(newest[1]) - 1]} ${newest[0]}`;
  }, [hasActiveFilters, availableMonths]);

  // Sync selectedMonth with available data only on initial load - allow manual changes after that
  const [hasInitialized, setHasInitialized] = React.useState(false);
  React.useEffect(() => {
    if (availableMonths.length > 0 && !hasInitialized) {
      const now = new Date();
      const currentMonth = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
      
      // If current month has data, use it; otherwise use most recent month with data
      if (availableMonths.includes(currentMonth)) {
        setSelectedMonth(currentMonth);
      } else {
        // Use most recent month with data (first in the reversed array)
        setSelectedMonth(availableMonths[0]);
      }
      setHasInitialized(true);
    }
  }, [availableMonths, hasInitialized]);



  // PERFORMANCE: Monthly filtering reduces dataset from 3436 to ~100 records

  // PERFORMANCE: Work with filtered dataset
  const groupedExpenses = useMemo(() => {
    if (!filters.expenses.groupInstallments) {
      return baseFilteredExpenses.filter(expense => {
        const expenseFilters = filters.expenses;
        
        if (expenseFilters.category && expense.category !== expenseFilters.category) return false;
        if (expenseFilters.account && expense.paymentMethod !== expenseFilters.account) return false;
        if (expenseFilters.isCreditCard && expenseFilters.isCreditCard !== 'all') {
          const isCreditCard = expense.isCreditCard || false;
          if (expenseFilters.isCreditCard === 'yes' && !isCreditCard) return false;
          if (expenseFilters.isCreditCard === 'no' && isCreditCard) return false;
        }
        
        // Skip date filtering here since it's already done in baseFilteredExpenses
        if (expenseFilters.description && !expense.description?.toLowerCase().includes(expenseFilters.description.toLowerCase())) return false;
        if (expenseFilters.location && !expense.location?.toLowerCase().includes(expenseFilters.location.toLowerCase())) return false;
        
        return true;
      });
    }

    // Aplicar filtros básicos primeiro - já com filtro base
    const basicFilteredExpenses = baseFilteredExpenses.filter(expense => {
      const expenseFilters = filters.expenses;
      
      if (expenseFilters.category && expense.category !== expenseFilters.category) return false;
      if (expenseFilters.account && expense.paymentMethod !== expenseFilters.account) return false;
      if (expenseFilters.isCreditCard && expenseFilters.isCreditCard !== 'all') {
        const isCreditCard = expense.isCreditCard || false;
        if (expenseFilters.isCreditCard === 'yes' && !isCreditCard) return false;
        if (expenseFilters.isCreditCard === 'no' && isCreditCard) return false;
      }
      
      // Skip date filtering here since it's already done in baseFilteredExpenses
      if (expenseFilters.description && !expense.description?.toLowerCase().includes(expenseFilters.description.toLowerCase())) return false;
      if (expenseFilters.location && !expense.location?.toLowerCase().includes(expenseFilters.location.toLowerCase())) return false;
      
      return true;
    });

    // Agrupar despesas por installment_group
    const groups = new Map<string, Expense[]>();
    const standaloneExpenses: Expense[] = [];

    basicFilteredExpenses.forEach(expense => {
      if (expense.isInstallment && expense.installmentGroup) {
        if (!groups.has(expense.installmentGroup)) {
          groups.set(expense.installmentGroup, []);
        }
        groups.get(expense.installmentGroup)!.push(expense);
      } else {
        standaloneExpenses.push(expense);
      }
    });

    // Criar despesas representativas para cada grupo
    const groupRepresentatives: Expense[] = [];
    
    groups.forEach((groupExpenses, groupId) => {
      if (groupExpenses.length > 0) {
        // Ordenar parcelas por número
        groupExpenses.sort((a, b) => (a.installmentNumber || 0) - (b.installmentNumber || 0));
        
        // Usar a primeira parcela como representante, mas com dados consolidados
        const representative = {
          ...groupExpenses[0],
          // Marcar como grupo para renderização especial
          isGroupRepresentative: true,
          groupedExpenses: groupExpenses,
          // Calcular total do grupo
          totalGroupAmount: groupExpenses.reduce((sum, exp) => sum + exp.amount, 0),
          // Usar a data da primeira parcela
          groupStartDate: groupExpenses[0].date,
          // Usar a data da última parcela
          groupEndDate: groupExpenses[groupExpenses.length - 1]?.dueDate || groupExpenses[groupExpenses.length - 1]?.date
        };
        
        groupRepresentatives.push(representative);
      }
    });

    return [...standaloneExpenses, ...groupRepresentatives];
  }, [baseFilteredExpenses, filters.expenses]);

  const filteredExpenses = groupedExpenses;

  // Log do resultado da filtragem
  console.log('📊 Resultado da filtragem:', {
    totalDespesas: expenses.length,
    despesasFiltradas: filteredExpenses.length,
    filtrosAtivos: filters.expenses
  });
  // Apply sorting based on filters
  const sortedExpenses = [...filteredExpenses].sort((a, b) => {
    // Default sort by date descending
    const dateA = new Date(a.date).getTime();
    const dateB = new Date(b.date).getTime();
    return dateB - dateA;
  });

  const handleEdit = (expense: Expense) => {
    setEditingExpense(expense);
    setShowForm(true);
  };

  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState<string | null>(null);

  const handleDelete = (id: string) => {
    setExpenseToDelete(id);
    setShowConfirmDialog(true);
  };

  const confirmDelete = () => {
    if (expenseToDelete) {
      deleteExpense(expenseToDelete);
      setExpenseToDelete(null);
    }
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingExpense(null);
  };

  const handleOpenFilterModal = () => {
    console.log('🔧 Abrindo modal de filtros. Filtros atuais:', filters.expenses);
    setTempFilters(filters.expenses);
    setShowFilterModal(true);
  };

  const handleApplyFilters = () => {
    console.log('✅ Aplicando filtros:', tempFilters);
    updateFilters('expenses', tempFilters);
    setShowFilterModal(false);
  };

  const handleCancelFilters = () => {
    console.log('❌ Cancelando filtros');
    setTempFilters(filters.expenses);
    setShowFilterModal(false);
  };

  const totalExpenses = sortedExpenses.reduce((sum, expense) => {
    // Se o agrupamento está ativo e é uma parcela, calcular o valor total das parcelas
    if (filters.expenses.groupInstallments && expense.isInstallment && expense.totalInstallments) {
      return sum + (expense.amount * expense.totalInstallments);
    }
    return sum + expense.amount;
  }, 0);

  // Calculate total of selected expenses
  const selectedTotal = sortedExpenses
    .filter(expense => selectedExpenses.has(expense.id))
    .reduce((sum, expense) => {
      if (filters.expenses.groupInstallments && expense.isInstallment && expense.totalInstallments) {
        return sum + (expense.amount * expense.totalInstallments);
      }
      return sum + expense.amount;
    }, 0);

  // Handle selection functions
  const handleSelectAll = () => {
    if (selectedExpenses.size === sortedExpenses.length) {
      setSelectedExpenses(new Set());
    } else {
      setSelectedExpenses(new Set(sortedExpenses.map(expense => expense.id)));
    }
  };

  const handleSelectExpense = (expenseId: string) => {
    const newSelected = new Set(selectedExpenses);
    if (newSelected.has(expenseId)) {
      newSelected.delete(expenseId);
    } else {
      newSelected.add(expenseId);
    }
    setSelectedExpenses(newSelected);
  };



  const expenseCategories = categories.filter(cat => cat.type === 'expense');

  const labels = {
    title: 'Despesas',
    subtitle: 'Gerencie suas despesas e gastos',
    add: 'Adicionar Despesa',
    totalExpenses: 'Total de Despesas',
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
    noRecords: 'Nenhuma despesa encontrada.',
    search: 'Buscar...',
  };

  // Get unique categories and accounts for filters
  const uniqueCategories = Array.from(new Set(expenses.map(expense => expense.category)));
  const uniqueAccounts = Array.from(new Set(expenses.map(expense => expense.paymentMethod)));

  const sortColumns = [
    { value: 'date', label: 'Data' },
    { value: 'category', label: 'Categoria' },
    { value: 'amount', label: 'Valor' },
    { value: 'description', label: 'Descrição' },
    { value: 'location', label: 'Local/Pessoa' },
    { value: 'account', label: 'Conta' },
  ];

  const addSortColumn = () => {
    // Simplified for now - just basic string array
  };

  const removeSortColumn = (index: number) => {
    // Simplified for now - just basic string array
  };

  const updateSortColumn = (index: number, field: string, value: string) => {
    // Simplified for now - just basic string array
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
                {/* PERFORMANCE: Month Navigation or Period Display */}
                <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  {filters.expenses.startDate || filters.expenses.endDate ? (
                    // Show period info when date filters are active
                    <div className="text-sm font-medium text-blue-700 dark:text-blue-300">
                      {filters.expenses.startDate && filters.expenses.endDate ? (
                        `Período: ${new Date(filters.expenses.startDate).toLocaleDateString('pt-BR')} - ${new Date(filters.expenses.endDate).toLocaleDateString('pt-BR')} (${sortedExpenses.length} registros)`
                      ) : filters.expenses.startDate ? (
                        `Desde: ${new Date(filters.expenses.startDate).toLocaleDateString('pt-BR')} (${sortedExpenses.length} registros)`
                      ) : (
                        `Até: ${new Date(filters.expenses.endDate).toLocaleDateString('pt-BR')} (${sortedExpenses.length} registros)`
                      )}
                    </div>
                  ) : hasActiveFilters && periodDisplay ? (
                    // Show period when other filters are active
                    <div className="text-sm font-medium text-blue-700 dark:text-blue-300">
                      {periodDisplay} ({sortedExpenses.length} registros)
                    </div>
                  ) : (
                    // Show month navigation when no period filters are active
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          const currentIndex = availableMonths.findIndex(month => month === selectedMonth);
                          if (currentIndex < availableMonths.length - 1) {
                            setSelectedMonth(availableMonths[currentIndex + 1]);
                          }
                        }}
                        disabled={availableMonths.findIndex(month => month === selectedMonth) >= availableMonths.length - 1}
                        className="p-1 hover:bg-blue-100 dark:hover:bg-blue-800 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ChevronLeft className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      </button>
                      
                      <select 
                        value={selectedMonth}
                        onChange={(e) => {
                          setSelectedMonth(e.target.value);
                        }}
                        className="text-sm font-medium text-blue-700 dark:text-blue-300 bg-transparent border-none focus:outline-none"
                      >
                        {availableMonths.map(month => {
                          const [year, monthNum] = month.split('-');
                          const monthName = new Date(parseInt(year), parseInt(monthNum) - 1).toLocaleDateString('pt-BR', { year: 'numeric', month: 'long' });
                          const monthCount = expenses.filter(exp => exp.date.substring(0, 7) === month).length;
                          return (
                            <option key={month} value={month}>
                              {monthName} ({monthCount})
                            </option>
                          );
                        })}
                      </select>
                      
                      <button
                        onClick={() => {
                          const currentIndex = availableMonths.findIndex(month => month === selectedMonth);
                          if (currentIndex > 0) {
                            setSelectedMonth(availableMonths[currentIndex - 1]);
                          }
                        }}
                        disabled={availableMonths.findIndex(month => month === selectedMonth) <= 0}
                        className="p-1 hover:bg-blue-100 dark:hover:bg-blue-800 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ChevronRight className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Total integrado na barra superior */}
                <div className="flex items-center gap-2 px-3 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <div>
                    <span className="text-xs text-red-600 dark:text-red-400 font-medium">
                      {selectedExpenses.size > 0 ? 'Selecionado' : 'Total do Mês'}: 
                    </span>
                    <span className="text-sm font-bold text-red-700 dark:text-red-300">
                      {formatCurrency(selectedExpenses.size > 0 ? selectedTotal : totalExpenses)}
                    </span>
                    {selectedExpenses.size > 0 && (
                      <span className="text-xs text-red-500 dark:text-red-400 ml-1">
                        ({selectedExpenses.size} de {sortedExpenses.length})
                      </span>
                    )}
                    <span className="text-xs text-red-500 dark:text-red-400 ml-1">
                      ({sortedExpenses.length} registros)
                    </span>
                    {filters.expenses.groupInstallments && (
                      <span className="text-xs text-red-500 dark:text-red-400 ml-1">*</span>
                    )}
                  </div>
                </div>

                {/* Reorganized Action Buttons */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowForm(true)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-sm"
                  >
                    <Plus className="w-4 h-4" />
                    {labels.add}
                  </button>
                  
                  <button
                    onClick={handleOpenFilterModal}
                    className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2 shadow-sm"
                  >
                    <Filter className="w-4 h-4" />
                    Filtros
                    {filteredExpenses.length < baseFilteredExpenses.length && (
                      <span className="bg-gray-500 text-xs px-1.5 py-0.5 rounded-full">
                        {filteredExpenses.length}
                      </span>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Content with top margin to account for fixed header */}
        <div className="pt-32">


          {/* Expenses List */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto max-h-[calc(100vh-240px)] relative">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600 sticky top-0 z-20">
                  <tr>
                    <th className="text-left py-1.5 px-2 font-medium text-gray-900 dark:text-white text-sm">
                      <input
                        type="checkbox"
                        checked={selectedExpenses.size > 0 && selectedExpenses.size === sortedExpenses.length}
                        onChange={handleSelectAll}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </th>
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
                  {sortedExpenses.map((expense) => (
                    <tr key={expense.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                      <td className="py-1 px-2">
                        <input
                          type="checkbox"
                          checked={selectedExpenses.has(expense.id)}
                          onChange={() => handleSelectExpense(expense.id)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      </td>
                      <td className="py-1 px-2">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-300">
                            {expense.category}
                          </span>
                        </div>
                      </td>
                      <td className="py-1 px-2 text-sm text-gray-600 dark:text-gray-400">
                        {expense.location || '-'}
                      </td>
                      <td className="py-1 px-2 text-sm text-gray-600 dark:text-gray-400">
                        <div>
                          {expense.description || '-'}
                        </div>
                      </td>
                      <td className="py-1 px-2 text-sm font-medium text-gray-900 dark:text-white">
                        {filters.expenses.groupInstallments && expense.isInstallment && expense.totalInstallments ? (
                          <div>
                            <div>{formatCurrency(expense.amount * expense.totalInstallments)}</div>
                            <div className="text-xs text-gray-500">
                              {expense.totalInstallments}x {formatCurrency(expense.amount)}
                            </div>
                          </div>
                        ) : (
                          formatCurrency(expense.amount)
                        )}
                      </td>
                      <td className="py-1.5 px-2 text-sm text-gray-600 dark:text-gray-400">
                        {expense.paymentMethod}
                      </td>
                      <td className="py-1.5 px-2 text-sm">
                        {expense.isInstallment ? (
                          <span className="px-2 py-1 rounded-full text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-300">
                            {filters.expenses.groupInstallments ? (
                              `${expense.totalInstallments}x`
                            ) : (
                              `${expense.installmentNumber}/${expense.totalInstallments}`
                            )}
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="py-1.5 px-2">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <div className="flex flex-col">
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                              {formatDate(expense.date)}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-1.5 px-2">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEdit(expense)}
                            className="p-1.5 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900 rounded-lg transition-colors"
                            title="Editar despesa"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(expense.id)}
                            className="p-1.5 text-red-600 hover:bg-red-100 dark:hover:bg-red-900 rounded-lg transition-colors"
                            title="Excluir despesa"
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
            
            {sortedExpenses.length === 0 && (
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
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Filtros de Despesas</h2>
                <button
                  onClick={handleCancelFilters}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-6">
                {/* Agrupamento de Parcelas */}
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="groupInstallments"
                      checked={tempFilters.groupInstallments || false}
                      onChange={(e) => setTempFilters(prev => ({ ...prev, groupInstallments: e.target.checked }))}
                      className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                    />
                    <label htmlFor="groupInstallments" className="flex items-center gap-2 text-sm font-medium text-blue-800 dark:text-blue-300">
                      <Package className="w-4 h-4" />
                      Agrupar Despesas Parceladas
                    </label>
                  </div>
                  <p className="text-xs text-blue-700 dark:text-blue-400 mt-2 ml-7">
                    Quando ativo, mostra apenas a primeira parcela de cada grupo com o valor total
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
                      value={tempFilters.category}
                      onChange={(e) => setTempFilters(prev => ({ ...prev, category: e.target.value }))}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    >
                      <option value="">{labels.allCategories}</option>
                      {uniqueCategories.map(category => (
                        <option key={category} value={category}>{category}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{labels.account}</label>
                    <select
                      value={tempFilters.account}
                      onChange={(e) => setTempFilters(prev => ({ ...prev, account: e.target.value }))}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
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
                        className="w-full border border-gray-300 dark:border-gray-600 rounded-lg pl-10 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
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
                        className="w-full border border-gray-300 dark:border-gray-600 rounded-lg pl-10 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
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
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                      placeholder="Deixe vazio para mostrar todas"
                    />
                    {tempFilters.startDate && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Mostrando despesas a partir de {new Date(tempFilters.startDate).toLocaleDateString('pt-BR')}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{labels.endDate}</label>
                    <input
                      type="date"
                      value={tempFilters.endDate}
                      onChange={(e) => setTempFilters(prev => ({ ...prev, endDate: e.target.value }))}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                      placeholder="Deixe vazio para mostrar todas"
                    />
                    {tempFilters.endDate && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Mostrando despesas até {new Date(tempFilters.endDate).toLocaleDateString('pt-BR')}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      <CreditCard className="w-4 h-4 inline mr-2" />
                      Cartão de Crédito
                    </label>
                    <select
                      value={tempFilters.isCreditCard || 'all'}
                      onChange={(e) => setTempFilters(prev => ({ ...prev, isCreditCard: e.target.value }))}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    >
                      <option value="all">Todos</option>
                      <option value="yes">Apenas Cartão de Crédito</option>
                      <option value="no">Excluir Cartão de Crédito</option>
                    </select>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end gap-3 mt-8">
                <button
                  onClick={() => {
                    console.log('🧹 Limpando todos os filtros');
                    setTempFilters({
                      category: '',
                      account: '',
                      startDate: '',
                      endDate: '',
                      description: '',
                      location: '',
                      installmentGroup: '',
                      groupInstallments: false,
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
                  className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Aplicar Filtros
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Form Modal */}
        {showForm && (
          <ExpenseForm
            expense={editingExpense}
            onClose={handleFormClose}
            onSave={handleFormClose}
          />
        )}

        {/* Dialog de Confirmação */}
        <ConfirmDialog
          isOpen={showConfirmDialog}
          onClose={() => setShowConfirmDialog(false)}
          onConfirm={confirmDelete}
          title="Excluir Despesa"
          message="Tem certeza que deseja excluir esta despesa? Esta ação não pode ser desfeita."
          type="danger"
          confirmText="Excluir"
          cancelText="Cancelar"
        />
      </div>
    </div>
  );
};

export default ExpenseList;