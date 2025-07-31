import React, { useState, useMemo } from 'react';
import { Plus, Filter, DollarSign, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { useSettings } from '../context/SettingsContext';
import ExpenseForm from './ExpenseForm';

const ExpenseList: React.FC = () => {
  const { expenses, categories, filters, updateFilters } = useFinance();
  const { formatCurrency } = useSettings();
  const [showForm, setShowForm] = useState(false);
  const [selectedExpenses, setSelectedExpenses] = useState<Set<string>>(new Set());

  // Current month selection (performance optimization)
  const currentDate = new Date();
  const currentMonth = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);

  // Get available months from expenses
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    expenses.forEach(expense => {
      const monthKey = expense.date.substring(0, 7); // YYYY-MM
      months.add(monthKey);
    });
    return Array.from(months).sort().reverse(); // Most recent first
  }, [expenses]);

  // Filter expenses by selected month
  const monthFilteredExpenses = useMemo(() => {
    return expenses.filter(expense => 
      expense.date.substring(0, 7) === selectedMonth
    );
  }, [expenses, selectedMonth]);

  // Apply additional filters to monthly expenses
  const filteredExpenses = useMemo(() => {
    return monthFilteredExpenses.filter(expense => {
      const expenseFilters = filters.expenses;
      
      if (expenseFilters.category && expense.category !== expenseFilters.category) return false;
      if (expenseFilters.account && expense.paymentMethod !== expenseFilters.account) return false;
      if (expenseFilters.description && !expense.description.toLowerCase().includes(expenseFilters.description.toLowerCase())) return false;
      if (expenseFilters.location && !expense.location.toLowerCase().includes(expenseFilters.location.toLowerCase())) return false;
      if (expenseFilters.startDate && expense.date < expenseFilters.startDate) return false;
      if (expenseFilters.endDate && expense.date > expenseFilters.endDate) return false;
      
      if (expenseFilters.isCreditCard && expenseFilters.isCreditCard !== 'all') {
        const isCreditCard = expense.paymentMethod && expense.paymentMethod.toLowerCase().includes('cartão');
        if (expenseFilters.isCreditCard === 'yes' && !isCreditCard) return false;
        if (expenseFilters.isCreditCard === 'no' && isCreditCard) return false;
      }
      
      return true;
    });
  }, [monthFilteredExpenses, filters.expenses]);

  // Sort expenses
  const sortedExpenses = useMemo(() => {
    const sorted = [...filteredExpenses];
    
    if (filters.expenses.sortBy && filters.expenses.sortBy.length > 0) {
      sorted.sort((a, b) => {
        for (const sort of filters.expenses.sortBy!) {
          let aValue: any = a[sort.column as keyof typeof a];
          let bValue: any = b[sort.column as keyof typeof b];
          
          if (sort.column === 'amount') {
            aValue = Number(aValue);
            bValue = Number(bValue);
          }
          
          if (aValue < bValue) return sort.direction === 'asc' ? -1 : 1;
          if (aValue > bValue) return sort.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    } else {
      // Default sort by date (newest first)
      sorted.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }
    
    return sorted;
  }, [filteredExpenses, filters.expenses.sortBy]);

  // Calculate totals
  const totalExpenses = sortedExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  const selectedTotal = Array.from(selectedExpenses)
    .map(id => sortedExpenses.find(e => e.id === id))
    .filter(Boolean)
    .reduce((sum, expense) => sum + expense!.amount, 0);

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

  const labels = {
    title: 'Despesas',
    subtitle: 'Gerencie suas despesas e gastos',
    add: 'Adicionar Despesa',
    totalExpenses: 'Total de Despesas',
    category: 'Categoria',
    location: 'Local/Pessoa',
    description: 'Descrição',
    amount: 'Valor',
    account: 'Conta',
    installments: 'Parcelas',
    date: 'Data',
    actions: 'Ações',
    noRecords: 'Nenhuma despesa encontrada.',
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
                {/* Month Navigation */}
                <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
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
                      onChange={(e) => setSelectedMonth(e.target.value)}
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
                </div>

                {/* Total */}
                <div className="flex items-center gap-2 px-3 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <DollarSign className="w-4 h-4 text-red-600 dark:text-red-400" />
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
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowForm(true)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-sm"
                  >
                    <Plus className="w-4 h-4" />
                    {labels.add}
                  </button>
                  
                  <button
                    className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2 shadow-sm"
                  >
                    <Filter className="w-4 h-4" />
                    Filtros
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
                    <th className="text-left py-1.5 px-2 font-medium text-gray-900 dark:text-white text-sm">Cartão</th>
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
                        <span className="text-xs font-medium text-gray-900 dark:text-white">
                          {expense.category}
                        </span>
                      </td>
                      <td className="py-1 px-2">
                        <span className="text-xs text-gray-700 dark:text-gray-300">
                          {expense.location}
                        </span>
                      </td>
                      <td className="py-1 px-2">
                        <span className="text-xs text-gray-700 dark:text-gray-300">
                          {expense.description}
                        </span>
                      </td>
                      <td className="py-1 px-2">
                        <span className="text-xs font-bold text-red-600 dark:text-red-400">
                          {formatCurrency(expense.amount)}
                        </span>
                      </td>
                      <td className="py-1 px-2">
                        <span className="text-xs text-gray-700 dark:text-gray-300">
                          {expense.paymentMethod}
                        </span>
                      </td>
                      <td className="py-1 px-2">
                        <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                          expense.paymentMethod?.toLowerCase().includes('cartão') 
                            ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' 
                            : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                        }`}>
                          {expense.paymentMethod?.toLowerCase().includes('cartão') ? 'Sim' : 'Não'}
                        </span>
                      </td>
                      <td className="py-1 px-2">
                        <span className="text-xs text-gray-700 dark:text-gray-300">
                          {expense.isInstallment && expense.totalInstallments 
                            ? `${expense.currentInstallment}/${expense.totalInstallments}`
                            : '-'
                          }
                        </span>
                      </td>
                      <td className="py-1 px-2">
                        <span className="text-xs text-gray-700 dark:text-gray-300">
                          {new Date(expense.date).toLocaleDateString('pt-BR')}
                        </span>
                      </td>
                      <td className="py-1 px-2">
                        {/* Actions buttons could go here */}
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

        {/* Form Modal */}
        {showForm && (
          <ExpenseForm
            onClose={() => setShowForm(false)}
            expense={null}
          />
        )}
      </div>
    </div>
  );
};

export default ExpenseList;