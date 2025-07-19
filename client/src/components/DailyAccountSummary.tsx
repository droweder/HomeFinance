import React, { useMemo, useState, useCallback } from 'react';
import { Calendar, TrendingUp, TrendingDown, DollarSign, Filter, Eye, EyeOff, X } from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { useAccounts } from '../context/AccountContext';
import { useSettings } from '../context/SettingsContext';
import { DailyAccountSummary as DailyAccountSummaryType } from '../types';

const calculateDateRangeForMonth = (month: number, year: number) => {
  const start = new Date(year, month, 1); // month is 0-indexed
  const end = new Date(start);
  end.setDate(start.getDate() + 89); // 90 days total (start day + 89 more days)
  return {
    startDate: start.toISOString().split('T')[0],
    endDate: end.toISOString().split('T')[0],
  };
};

const DailyAccountSummary: React.FC = () => {
  const { expenses, income, filters, updateFilters } = useFinance();
  const { accounts } = useAccounts();
  const { formatCurrency, formatDate } = useSettings();
  const [isCalculating, setIsCalculating] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [tempFilters, setTempFilters] = useState(filters.dailySummary);
  const [modalSelectedMonth, setModalSelectedMonth] = useState<number>(0); // 0-indexed month
  const [modalSelectedYear, setModalSelectedYear] = useState<number>(new Date().getFullYear());

  // Função para calcular diferença em dias de forma segura
  const getDaysDifference = useCallback((startDate: string, endDate: string): number => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)); // Use floor for consistent day count
    return diffDays;
  }, []);

  const dailySummaries = useMemo(() => {
    console.log('🔄 Recalculando resumo diário automaticamente...', {
      timestamp: new Date().toISOString(),
      expensesCount: expenses.length,
      incomeCount: income.length,
      accountsCount: accounts.length
    });
    
    setIsCalculating(true);

    try {
      const startDate = new Date(filters.dailySummary.startDate);
      const endDate = new Date(filters.dailySummary.endDate);

      const summaries: DailyAccountSummaryType[] = [];

      console.log('📅 Calculando para período:', {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        accounts: accounts.length,
        expenses: expenses.length,
        income: income.length,
        expectedExpenses: 3530,
        expensesLoadedCorrectly: expenses.length >= 3530
      });

      // Log detalhado dos dados para debug
      console.log('📋 Dados de entrada:', {
        expenses: expenses.map(exp => ({
          id: exp.id,
          date: exp.date,
          dueDate: exp.dueDate,
          amount: exp.amount,
          paymentMethod: exp.paymentMethod,
          category: exp.category
        })),
        income: income.map(inc => ({
          id: inc.id,
          date: inc.date,
          amount: inc.amount,
          account: inc.account,
          source: inc.source
        })),
        accounts: accounts.map(acc => ({
          id: acc.id,
          name: acc.name,
          initialBalance: acc.initialBalance
        }))
      });

      // Gerar todas as datas no intervalo de forma otimizada
      const currentDate = new Date(startDate);
      let dayCount = 0;
      const maxDays = 90; // Limite de segurança

      while (currentDate <= endDate && dayCount < maxDays) {
        const dateStr = currentDate.toISOString().split('T')[0];
        
        const dailySummary: DailyAccountSummaryType = {
          date: dateStr,
          accounts: {},
          totalDailyBalance: 0,
        };

        // Para cada conta, calcular despesas do dia e saldo final
        accounts.forEach(account => {
          // Receitas do dia para esta conta
          const dayIncomeItems = income.filter(incomeItem => 
            incomeItem.date === dateStr && 
            incomeItem.account === account.name
          );
          
          const dailyIncome = dayIncomeItems.reduce((sum, incomeItem) => sum + (incomeItem.amount || 0), 0);

          // Despesas do dia para esta conta - usar dueDate se disponível
          const dayExpenseItems = expenses.filter(expense => 
            (expense.dueDate || expense.date) === dateStr && 
            expense.paymentMethod === account.name
          );
          
          const dailyExpenses = dayExpenseItems.reduce((sum, expense) => sum + (expense.amount || 0), 0);

          // Calcular saldo acumulado até esta data de forma otimizada
          const previousExpenseItems = expenses.filter(expense => 
            (expense.dueDate || expense.date) <= dateStr && 
            expense.paymentMethod === account.name
          );
          
          const previousExpenses = previousExpenseItems.reduce((sum, expense) => sum + (expense.amount || 0), 0);

          const previousIncomeItems = income.filter(incomeItem => 
            incomeItem.date <= dateStr && 
            incomeItem.account === account.name
          );
          
          const previousIncome = previousIncomeItems.reduce((sum, incomeItem) => sum + (incomeItem.amount || 0), 0);

          const finalBalance = (account.initialBalance || 0) + previousIncome - previousExpenses;

          // Log detalhado para debug
          if (dailyIncome > 0 || dailyExpenses > 0) {
            console.log(`💰 ${dateStr} - ${account.name}:`, {
              dailyIncome,
              dailyExpenses,
              previousIncome,
              previousExpenses,
              initialBalance: account.initialBalance,
              finalBalance,
              dayIncomeItems: dayIncomeItems.length,
              dayExpenseItems: dayExpenseItems.length
            });
          }

          dailySummary.accounts[account.id] = {
            dailyIncome,
            dailyExpenses,
            finalBalance,
          };
        });

        // Calcular saldo total do dia
        dailySummary.totalDailyBalance = Object.values(dailySummary.accounts)
          .reduce((sum, accountData) => sum + (accountData.finalBalance || 0), 0);

        summaries.push(dailySummary);

        // Avançar para o próximo dia
        currentDate.setDate(currentDate.getDate() + 1);
        dayCount++;
      }

      // Aplicar ordenação por data (sempre decrescente - mais recente primeiro)
      summaries.sort((a, b) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        return dateB - dateA; // Decrescente
      });

      console.log('✅ Resumo diário calculado automaticamente:', {
        summariesCount: summaries.length,
        totalDays: summaries.length,
        firstDate: summaries[summaries.length - 1]?.date,
        lastDate: summaries[0]?.date,
        sampleSummary: summaries[0]
      });
      
      setIsCalculating(false);
      return summaries;

    } catch (error) {
      console.error('❌ Erro ao calcular resumo diário:', error);
      setIsCalculating(false);
      return [];
    }
  }, [
    expenses, 
    income, 
    accounts, 
    filters.dailySummary.startDate, // Depend on the actual filter values
    filters.dailySummary.endDate,
  ]);

  // Filtrar contas visíveis
  const visibleAccounts = useMemo(() => {
    return accounts.filter(account => 
      filters.dailySummary.visibleAccounts.length === 0 || 
      filters.dailySummary.visibleAccounts.includes(account.id)
    );
  }, [accounts, filters.dailySummary.visibleAccounts]);

  const toggleAccountVisibility = useCallback((accountId: string, isTemp = false) => {
    const currentVisible = isTemp ? tempFilters.visibleAccounts : filters.dailySummary.visibleAccounts;
    const newVisible = currentVisible.includes(accountId)
      ? currentVisible.filter(id => id !== accountId)
      : [...currentVisible, accountId];
    
    if (isTemp) {
      setTempFilters(prev => ({ ...prev, visibleAccounts: newVisible }));
    } else {
      updateFilters('dailySummary', { visibleAccounts: newVisible });
    }
  }, [filters.dailySummary.visibleAccounts, tempFilters.visibleAccounts, updateFilters]);

  const handleOpenFilterModal = () => {
    setTempFilters(filters.dailySummary);
    const currentStartDate = new Date(filters.dailySummary.startDate);
    setModalSelectedMonth(currentStartDate.getMonth());
    setModalSelectedYear(currentStartDate.getFullYear());
    setShowFilterModal(true);
  };

  const handleApplyFilters = () => {
    // Calculate the final startDate and endDate based on modal selection
    const { startDate, endDate } = calculateDateRangeForMonth(modalSelectedMonth, modalSelectedYear);
    updateFilters('dailySummary', {
      ...tempFilters, // This will carry over visibleAccounts
      startDate,
      endDate,
    });
    setShowFilterModal(false);
  };

  const handleCancelFilters = () => {
    setTempFilters(filters.dailySummary);
    const currentStartDate = new Date(filters.dailySummary.startDate);
    setModalSelectedMonth(currentStartDate.getMonth());
    setModalSelectedYear(currentStartDate.getFullYear());
    setShowFilterModal(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Fixed Header */}
        <div className="fixed top-16 left-0 right-0 z-30 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
          <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Resumo Diário das Contas</h1>
                <p className="text-gray-600 dark:text-gray-400 mt-2">Visão geral diária do movimento financeiro por conta</p>
              </div>
              
              {/* Cards integrados na barra superior */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <DollarSign className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <div>
                    <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">Contas: </span>
                    <span className="text-sm font-bold text-blue-700 dark:text-blue-300">{accounts.length}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 px-3 py-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400" />
                  <div>
                    <span className="text-xs text-green-600 dark:text-green-400 font-medium">Saldo Total: </span>
                    <span className="text-sm font-bold text-green-700 dark:text-green-300">{formatCurrency(dailySummaries[0]?.totalDailyBalance || 0)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 px-3 py-2 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
                  <Calendar className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  <div>
                    <span className="text-xs text-purple-600 dark:text-purple-400 font-medium">Período: </span>
                    <span className="text-sm font-bold text-purple-700 dark:text-purple-300">{dailySummaries.length} dias</span>
                  </div>
                </div>
                <button
                  onClick={handleOpenFilterModal}
                  className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2"
                >
                  <Filter className="w-4 h-4" />
                  Período
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Content with top margin to account for fixed header */}
        <div className="pt-32">
          {/* Loading indicator */}
          {isCalculating && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6 text-center mb-6">
              <div className="flex items-center justify-center gap-3">
                <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-blue-800 dark:text-blue-300 font-medium">
                  Calculando resumo diário...
                </span>
              </div>
            </div>
          )}



          {/* Tabela de Resumo Diário */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto max-h-[calc(100vh-280px)]">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600 sticky top-32 z-20">
                  <tr>
                    <th className="text-left py-2 px-3 font-medium text-gray-900 dark:text-white sticky left-0 bg-gray-50 dark:bg-gray-700">
                      Data
                    </th>
                    {visibleAccounts.map(account => (
                      <th key={account.id} className="text-center py-2 px-3 font-medium text-gray-900 dark:text-white min-w-[180px]" colSpan={3}>
                        {account.name}
                      </th>
                    ))}
                    <th className="text-left py-2 px-3 font-medium text-gray-900 dark:text-white min-w-[140px] bg-blue-50 dark:bg-blue-900">
                      Saldo Total Diário
                    </th>
                  </tr>
                  <tr className="bg-gray-50 dark:bg-gray-700">
                    <th className="py-1.5 px-3 sticky left-0 bg-gray-50 dark:bg-gray-700"></th>
                    {visibleAccounts.map(account => (
                      <React.Fragment key={account.id}>
                        <th className="text-left py-1.5 px-2 text-xs font-medium text-gray-600 dark:text-gray-400">Entrada</th>
                        <th className="text-left py-1.5 px-2 text-xs font-medium text-gray-600 dark:text-gray-400">Saída</th>
                        <th className="text-left py-1.5 px-2 text-xs font-medium text-gray-600 dark:text-gray-400">Saldo</th>
                      </React.Fragment>
                    ))}
                    <th className="py-1.5 px-3 bg-blue-50 dark:bg-blue-900"></th>
                  </tr>
                </thead>
                <tbody>
                  {dailySummaries.map((summary, index) => (
                    <tr key={summary.date} className={`border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${index === 0 ? 'bg-blue-25 dark:bg-blue-900/10' : ''}`}>
                      <td className="py-1 px-3 font-medium text-gray-900 dark:text-white sticky left-0 bg-white dark:bg-gray-800">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          {formatDate(summary.date)}
                        </div>
                      </td>
                      {visibleAccounts.map(account => {
                        const accountData = summary.accounts[account.id];
                        return (
                          <React.Fragment key={account.id}>
                            <td className="py-1 px-2 text-green-600 dark:text-green-400 text-sm">
                              {accountData?.dailyIncome > 0 ? formatCurrency(accountData.dailyIncome) : '-'}
                            </td>
                            <td className="py-1 px-2 text-red-600 dark:text-red-400 text-sm">
                              {accountData?.dailyExpenses > 0 ? formatCurrency(accountData.dailyExpenses) : '-'}
                            </td>
                            <td className={`py-1 px-2 font-medium text-sm ${
                              (accountData?.finalBalance || 0) >= 0 
                                ? 'text-green-600 dark:text-green-400' 
                                : 'text-red-600 dark:text-red-400'
                            }`}>
                              {formatCurrency(accountData?.finalBalance || 0)}
                            </td>
                          </React.Fragment>
                        );
                      })}
                      <td className={`py-1 px-3 font-bold bg-blue-50 dark:bg-blue-900/20 ${
                        summary.totalDailyBalance >= 0 
                          ? 'text-green-600 dark:text-green-400' 
                          : 'text-red-600 dark:text-red-400'
                      }`}>
                        {formatCurrency(summary.totalDailyBalance)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {dailySummaries.length === 0 && !isCalculating && (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                Nenhum dado encontrado para o período selecionado.
              </div>
            )}
          </div>
        </div>

        {/* Modal de Filtros */}
        {showFilterModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Filtros do Resumo Diário</h2>
                <button
                  onClick={handleCancelFilters}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-6">
                {/* Seleção de Mês Inicial */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Mês Inicial do Período (90 dias)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Mês</label>
                      <select
                        value={modalSelectedMonth}
                        onChange={(e) => {
                          const newMonth = parseInt(e.target.value, 10);
                          setModalSelectedMonth(newMonth);
                          const { startDate, endDate } = calculateDateRangeForMonth(newMonth, modalSelectedYear);
                          setTempFilters(prev => ({
                            ...prev,
                            startDate,
                            endDate,
                          }));
                        }}
                        className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                      >
                        {Array.from({ length: 12 }, (_, i) => (
                          <option key={i} value={i}>
                            {new Date(0, i).toLocaleString('pt-BR', { month: 'long' })}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Ano</label>
                      <select
                        value={modalSelectedYear}
                        onChange={(e) => {
                          const newYear = parseInt(e.target.value, 10);
                          setModalSelectedYear(newYear);
                          const { startDate, endDate } = calculateDateRangeForMonth(modalSelectedMonth, newYear);
                          setTempFilters(prev => ({
                            ...prev,
                            startDate,
                            endDate,
                          }));
                        }}
                        className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                      >
                        {Array.from({ length: 5 }, (_, i) => { // Current year +/- 2 years
                          const year = new Date().getFullYear() - 2 + i;
                          return <option key={year} value={year}>{year}</option>;
                        })}
                      </select>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Período selecionado: {formatDate(tempFilters.startDate)} até {formatDate(tempFilters.endDate || calculateDateRangeForMonth(modalSelectedMonth, modalSelectedYear).endDate)} ({getDaysDifference(tempFilters.startDate, tempFilters.endDate || calculateDateRangeForMonth(modalSelectedMonth, modalSelectedYear).endDate) + 1} dias)
                  </p>
                </div>

                {/* Contas Visíveis */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Contas Visíveis</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {accounts.map(account => (
                      <button
                        key={account.id}
                        onClick={() => toggleAccountVisibility(account.id, true)}
                        className={`flex items-center gap-3 p-3 rounded-lg text-left transition-colors ${
                          tempFilters.visibleAccounts.length === 0 || tempFilters.visibleAccounts.includes(account.id)
                            ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-300 border-2 border-blue-300 dark:border-blue-700'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 border-2 border-gray-300 dark:border-gray-600'
                        }`}
                      >
                        {tempFilters.visibleAccounts.length === 0 || tempFilters.visibleAccounts.includes(account.id) ? (
                          <Eye className="w-5 h-5" />
                        ) : (
                          <EyeOff className="w-5 h-5" />
                        )}
                        <div>
                          <div className="font-medium">{account.name}</div>
                          <div className="text-xs opacity-75">
                            Saldo inicial: {formatCurrency(account.initialBalance)}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                    {tempFilters.visibleAccounts.length === 0 
                      ? 'Todas as contas estão visíveis' 
                      : `${tempFilters.visibleAccounts.length} de ${accounts.length} contas selecionadas`
                    }
                  </p>
                </div>
              </div>
              
              <div className="flex justify-end gap-3 mt-8">
                <button
                  onClick={handleApplyFilters}
                  className="px-6 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Aplicar Filtros
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DailyAccountSummary;