import React, { useMemo, useState, useCallback } from 'react';
import { Calendar, TrendingUp, TrendingDown, DollarSign, Filter, Eye, EyeOff, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { useAccounts } from '../context/AccountContext';
import { useSettings } from '../context/SettingsContext';
// Import direto do tipo inline para evitar problemas de import

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
  const { expenses, income, transfers, filters, updateFilters } = useFinance();
  const { accounts } = useAccounts();
  const { formatCurrency, formatDate } = useSettings();
  const [isCalculating, setIsCalculating] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [tempFilters, setTempFilters] = useState(filters.dailySummary);
  const [modalSelectedMonth, setModalSelectedMonth] = useState<number>(0); // 0-indexed month
  const [modalSelectedYear, setModalSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
  });
  
  // Estado para o modal de extrato
  const [showExtractModal, setShowExtractModal] = useState(false);
  const [extractAccount, setExtractAccount] = useState<string>('');
  const [extractMonth, setExtractMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
  });

  // Get available months from all financial data
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    
    // Add months from expenses
    expenses.forEach(expense => {
      const month = expense.date.substring(0, 7);
      months.add(month);
    });
    
    // Add months from income
    income.forEach(incomeItem => {
      const month = incomeItem.date.substring(0, 7);
      months.add(month);
    });
    
    // Add months from transfers
    transfers.forEach(transfer => {
      const month = transfer.date.substring(0, 7);
      months.add(month);
    });
    
    return Array.from(months).sort().reverse(); // Most recent first
  }, [expenses, income, transfers]);

  // Force current month on component mount - ignore any stored filters
  React.useEffect(() => {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
    
    // Always force current month, regardless of selectedMonth value
    const [year, monthNum] = currentMonth.split('-');
    const startDate = new Date(parseInt(year), parseInt(monthNum) - 1, 1);
    const endDate = new Date(parseInt(year), parseInt(monthNum), 0); // Last day of month
    
    console.log('🔄 Forçando mês atual no DailyAccountSummary:', currentMonth);
    
    // Force update both selectedMonth and filters
    if (selectedMonth !== currentMonth) {
      setSelectedMonth(currentMonth);
    }
    
    updateFilters('dailySummary', {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      visibleAccounts: filters.dailySummary.visibleAccounts,
    });
  }, []); // Run only once on mount

  // Update filters when month changes
  const handleMonthChange = (newMonth: string) => {
    setSelectedMonth(newMonth);
    const [year, monthNum] = newMonth.split('-');
    const startDate = new Date(parseInt(year), parseInt(monthNum) - 1, 1);
    const endDate = new Date(parseInt(year), parseInt(monthNum), 0); // Last day of month
    
    updateFilters('dailySummary', {
      ...filters.dailySummary,
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
    });
  };

  // Calcular movimentações para o extrato
  const extractMovements = useMemo(() => {
    if (!extractAccount || !extractMonth) return [];

    const movements: Array<{
      date: string;
      description: string;
      amount: number;
      type: 'entrada' | 'saida';
      category?: string;
    }> = [];

    // Despesas da conta no mês
    expenses
      .filter(expense => 
        expense.date.substring(0, 7) === extractMonth && 
        expense.paymentMethod === extractAccount
      )
      .forEach(expense => {
        movements.push({
          date: expense.date,
          description: `${expense.category} - ${expense.description || 'Despesa'}`,
          amount: expense.amount,
          type: 'saida',
          category: expense.category
        });
      });

    // Receitas da conta no mês
    income
      .filter(incomeItem => 
        incomeItem.date.substring(0, 7) === extractMonth && 
        incomeItem.account === extractAccount
      )
      .forEach(incomeItem => {
        movements.push({
          date: incomeItem.date,
          description: `${incomeItem.source} - ${incomeItem.notes || 'Receita'}`,
          amount: incomeItem.amount,
          type: 'entrada',
          category: incomeItem.source
        });
      });

    // Transferências de/para a conta no mês
    const selectedAccountObj = accounts.find(acc => acc.name === extractAccount);
    
    transfers
      .filter(transfer => transfer.date.substring(0, 7) === extractMonth)
      .forEach(transfer => {
        const fromAccountObj = accounts.find(acc => acc.id === transfer.fromAccount);
        const toAccountObj = accounts.find(acc => acc.id === transfer.toAccount);
        
        // Verificar se a conta selecionada está envolvida na transferência
        const isFromSelectedAccount = (fromAccountObj?.name === extractAccount) || (transfer.fromAccount === extractAccount);
        const isToSelectedAccount = (toAccountObj?.name === extractAccount) || (transfer.toAccount === extractAccount);
        
        if (isFromSelectedAccount) {
          // Saída da conta selecionada
          const toAccountName = toAccountObj?.name || transfer.toAccount;
          movements.push({
            date: transfer.date,
            description: `Transferência para ${toAccountName}${transfer.description ? ' - ' + transfer.description : ''}`,
            amount: transfer.amount,
            type: 'saida'
          });
        }
        
        if (isToSelectedAccount) {
          // Entrada na conta selecionada
          const fromAccountName = fromAccountObj?.name || transfer.fromAccount;
          movements.push({
            date: transfer.date,
            description: `Transferência de ${fromAccountName}${transfer.description ? ' - ' + transfer.description : ''}`,
            amount: transfer.amount,
            type: 'entrada'
          });
        }
      });

    // Ordenar por data
    return movements.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [extractAccount, extractMonth, expenses, income, transfers, accounts]);

  // Calcular saldo acumulado com a mesma lógica do resumo diário
  const extractWithBalance = useMemo(() => {
    const accountObj = accounts.find(acc => acc.name === extractAccount);
    if (!accountObj) return [];

    // Calcular saldo até o final do mês anterior (mesmo cálculo do resumo diário)
    const [year, month] = extractMonth.split('-');
    const firstDayOfMonth = `${year}-${month}-01`;
    const lastDayOfPreviousMonth = new Date(parseInt(year), parseInt(month) - 1, 0).toISOString().split('T')[0];
    
    // Receitas acumuladas até o final do mês anterior
    const previousIncome = income.filter(incomeItem => 
      incomeItem.date <= lastDayOfPreviousMonth && incomeItem.account === accountObj.name
    ).reduce((sum, incomeItem) => sum + (incomeItem.amount || 0), 0);

    // Despesas acumuladas até o final do mês anterior
    const previousExpenses = expenses.filter(expense => 
      expense.date <= lastDayOfPreviousMonth && expense.paymentMethod === accountObj.name
    ).reduce((sum, expense) => sum + (expense.amount || 0), 0);

    // Transferências acumuladas até o final do mês anterior
    const previousTransferOut = transfers.filter(transfer => 
      transfer.date <= lastDayOfPreviousMonth && transfer.fromAccount === accountObj.id
    ).reduce((sum, transfer) => sum + (transfer.amount || 0), 0);

    const previousTransferIn = transfers.filter(transfer => 
      transfer.date <= lastDayOfPreviousMonth && transfer.toAccount === accountObj.id
    ).reduce((sum, transfer) => sum + (transfer.amount || 0), 0);

    // Saldo no início do mês = saldo inicial + movimentos anteriores
    let runningBalance = (accountObj.initialBalance || 0) + previousIncome - previousExpenses + previousTransferIn - previousTransferOut;

    const movementsWithBalance = [];

    // Adicionar linha de saldo inicial se há movimentos no período
    if (extractMovements.length > 0) {
      movementsWithBalance.push({
        date: firstDayOfMonth,
        description: 'Saldo Inicial',
        amount: 0,
        type: 'entrada' as const,
        balance: runningBalance,
        isInitialBalance: true
      });
    }

    // Processar movimentos do mês
    extractMovements.forEach(movement => {
      if (movement.type === 'entrada') {
        runningBalance += movement.amount;
      } else {
        runningBalance -= movement.amount;
      }
      
      movementsWithBalance.push({
        ...movement,
        balance: runningBalance
      });
    });

    return movementsWithBalance;
  }, [extractMovements, extractAccount, accounts, extractMonth, expenses, income, transfers]);

  const handleOpenExtract = () => {
    if (accounts.length > 0) {
      setExtractAccount(accounts[0].name);
    }
    setShowExtractModal(true);
  };

  // Função para calcular diferença em dias de forma segura
  const getDaysDifference = useCallback((startDate: string, endDate: string): number => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)); // Use floor for consistent day count
    return diffDays;
  }, []);

  const dailySummaries = useMemo(() => {
    console.log('🔄 Recalculando fluxo automaticamente...', {
      timestamp: new Date().toISOString(),
      expensesCount: expenses.length,
      incomeCount: income.length,
      transfersCount: transfers.length,
      accountsCount: accounts.length
    });
    
    setIsCalculating(true);

    try {
      const startDate = new Date(filters.dailySummary.startDate);
      const endDate = new Date(filters.dailySummary.endDate);

      const summaries: Array<{
        date: string;
        accounts: Record<string, {
          dailyIncome: number;
          dailyExpenses: number;
          finalBalance: number;
        }>;
        totalDailyBalance: number;
      }> = [];

      console.log('📅 Calculando para período:', {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        accounts: accounts.length,
        expenses: expenses.length,
        income: income.length,
        transfers: transfers.length,
        expectedExpenses: 3530,
        expensesLoadedCorrectly: expenses.length >= 3530,
        transfersSample: transfers.slice(0, 2)
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
        })),
        transfers: transfers.map(transfer => ({
          id: transfer.id,
          date: transfer.date,
          amount: transfer.amount,
          fromAccount: transfer.fromAccount,
          toAccount: transfer.toAccount,
          description: transfer.description
        }))
      });

      // Gerar todas as datas no intervalo de forma otimizada
      const currentDate = new Date(startDate);
      let dayCount = 0;
      const maxDays = 90; // Limite de segurança

      while (currentDate <= endDate && dayCount < maxDays) {
        const dateStr = currentDate.toISOString().split('T')[0];
        
        const dailySummary = {
          date: dateStr,
          accounts: {},
          totalDailyBalance: 0,
        };

        // Para cada conta, calcular despesas do dia e saldo final
        accounts.forEach(account => {
          // Despesas do dia para esta conta
          const dayExpenseItems = expenses.filter(expense => 
            expense.date === dateStr && expense.paymentMethod === account.name
          );
          const dailyExpenses = dayExpenseItems.reduce((sum, expense) => sum + (expense.amount || 0), 0);

          // Receitas do dia para esta conta
          const dayIncomeItems = income.filter(incomeItem => 
            incomeItem.date === dateStr && incomeItem.account === account.name
          );
          const dailyIncome = dayIncomeItems.reduce((sum, incomeItem) => sum + (incomeItem.amount || 0), 0);

          // Receitas acumuladas até esta data
          const previousIncomeItems = income.filter(incomeItem => 
            incomeItem.date <= dateStr && incomeItem.account === account.name
          );
          const previousIncome = previousIncomeItems.reduce((sum, incomeItem) => sum + (incomeItem.amount || 0), 0);

          // Despesas acumuladas até esta data
          const previousExpenseItems = expenses.filter(expense => 
            expense.date <= dateStr && expense.paymentMethod === account.name
          );
          const previousExpenses = previousExpenseItems.reduce((sum, expense) => sum + (expense.amount || 0), 0);

          // TRANSFERÊNCIAS DO DIA - usar ID das contas para correspondência exata
          const dayTransferOutItems = transfers.filter(transfer => 
            transfer.date === dateStr && transfer.fromAccount === account.id
          );
          const dayTransferOut = dayTransferOutItems.reduce((sum, transfer) => sum + (transfer.amount || 0), 0);

          const dayTransferInItems = transfers.filter(transfer => 
            transfer.date === dateStr && transfer.toAccount === account.id
          );
          const dayTransferIn = dayTransferInItems.reduce((sum, transfer) => sum + (transfer.amount || 0), 0);

          // Debug transferências quando encontradas  
          if (dayTransferIn > 0 || dayTransferOut > 0) {
            console.log(`✅ TRANSFERÊNCIA PROCESSADA ${dateStr} - ${account.name}:`, {
              accountId: account.id,
              dayTransferIn,
              dayTransferOut,
              transfersIn: dayTransferInItems.length,
              transfersOut: dayTransferOutItems.length
            });
          }

          // Transferências acumuladas até esta data - usar ID das contas
          const previousTransferOut = transfers.filter(transfer => 
            transfer.date <= dateStr && transfer.fromAccount === account.id
          ).reduce((sum, transfer) => sum + (transfer.amount || 0), 0);

          const previousTransferIn = transfers.filter(transfer => 
            transfer.date <= dateStr && transfer.toAccount === account.id
          ).reduce((sum, transfer) => sum + (transfer.amount || 0), 0);

          const finalBalance = (account.initialBalance || 0) + previousIncome - previousExpenses + previousTransferIn - previousTransferOut;

          // Debug COMPLETO das transferências - sempre mostrar para investigar
          const allTransfersForDate = transfers.filter(t => t.date === dateStr);
          if (allTransfersForDate.length > 0) {
            console.log(`🔍 DEBUG COMPLETO TRANSFERÊNCIAS ${dateStr} - ${account.name}:`, {
              allTransfersForDate,
              dayTransferIn,
              dayTransferOut,
              dayTransferInItems,
              dayTransferOutItems,
              accountName: account.name,
              matchingLogic: {
                fromAccountMatches: transfers.filter(t => t.date === dateStr).map(t => ({
                  transferFrom: t.fromAccount,
                  accountName: account.name,
                  match: t.fromAccount === account.name
                })),
                toAccountMatches: transfers.filter(t => t.date === dateStr).map(t => ({
                  transferTo: t.toAccount,
                  accountName: account.name,
                  match: t.toAccount === account.name
                }))
              },
              uniqueFromAccounts: Array.from(new Set(transfers.map(t => t.fromAccount))),
              uniqueToAccounts: Array.from(new Set(transfers.map(t => t.toAccount))),
              allAccountNames: accounts.map(a => a.name)
            });
          }
          
          // Se encontrou transferências, logar
          if (dayTransferIn > 0 || dayTransferOut > 0) {
            console.log(`✅ TRANSFERÊNCIAS PROCESSADAS ${dateStr} - ${account.name}:`, {
              dayTransferIn,
              dayTransferOut,
              netTransfer: dayTransferIn - dayTransferOut
            });
          }

          // Log detalhado para debug
          if (dailyIncome > 0 || dailyExpenses > 0 || dayTransferIn > 0 || dayTransferOut > 0) {
            console.log(`💰 ${dateStr} - ${account.name}:`, {
              dailyIncome,
              dailyExpenses,
              dayTransferIn,
              dayTransferOut,
              previousIncome,
              previousExpenses,
              previousTransferIn,
              previousTransferOut,
              initialBalance: account.initialBalance,
              finalBalance,
              dayIncomeItems: dayIncomeItems.length,
              dayExpenseItems: dayExpenseItems.length
            });
          }

          // INCLUIR TRANSFERÊNCIAS NO RESUMO DIÁRIO - como receitas/despesas
          const totalDailyIncome = dailyIncome + dayTransferIn;
          const totalDailyExpenses = dailyExpenses + dayTransferOut;
          
          (dailySummary.accounts as any)[account.id] = {
            dailyIncome: totalDailyIncome,
            dailyExpenses: totalDailyExpenses,
            finalBalance: finalBalance,
          };

          // Log final para verificar inclusão no resumo
          if (totalDailyIncome > 0 || totalDailyExpenses > 0) {
            console.log(`💰 RESUMO ${dateStr} - ${account.name}:`, {
              totalDailyIncome,
              totalDailyExpenses,
              finalBalance,
              includesTransfers: dayTransferIn > 0 || dayTransferOut > 0
            });
          }
        });

        // Calcular saldo total do dia
        dailySummary.totalDailyBalance = Object.values(dailySummary.accounts as any)
          .reduce((sum: number, accountData: any) => sum + (accountData?.finalBalance || 0), 0);

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

      console.log('✅ Fluxo calculado automaticamente:', {
        summariesCount: summaries.length,
        totalDays: summaries.length,
        firstDate: summaries[summaries.length - 1]?.date,
        lastDate: summaries[0]?.date,
        sampleSummary: summaries[0]
      });
      
      setIsCalculating(false);
      return summaries;

    } catch (error) {
      console.error('❌ Erro ao calcular fluxo:', error);
      setIsCalculating(false);
      return [];
    }
  }, [
    expenses, 
    income, 
    transfers,
    accounts, 
    filters.dailySummary.startDate, // Depend on the actual filter values
    filters.dailySummary.endDate,
  ]);

  // Filtrar e ordenar contas visíveis baseado na ordem de seleção
  const visibleAccounts = useMemo(() => {
    if (filters.dailySummary.visibleAccounts.length === 0) {
      // Se nenhuma conta está especificamente selecionada, mostrar todas na ordem original
      return accounts;
    }
    
    // Ordenar as contas de acordo com a ordem de seleção
    const orderedAccounts = [];
    
    // Primeiro, adicionar as contas na ordem exata de seleção
    filters.dailySummary.visibleAccounts.forEach(accountId => {
      const account = accounts.find(acc => acc.id === accountId);
      if (account) {
        orderedAccounts.push(account);
      }
    });
    
    return orderedAccounts;
  }, [accounts, filters.dailySummary.visibleAccounts]);

  const toggleAccountVisibility = useCallback((accountId: string, isTemp = false, forceRemove = false) => {
    const currentVisible = isTemp ? tempFilters.visibleAccounts : filters.dailySummary.visibleAccounts;
    
    let newVisible;
    if (forceRemove || currentVisible.includes(accountId)) {
      // Remove account from the list
      newVisible = currentVisible.filter(id => id !== accountId);
    } else {
      // Add account to the end of the list (maintains selection order)
      newVisible = [...currentVisible, accountId];
    }
    
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
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Fluxo</h1>
                <p className="text-gray-600 dark:text-gray-400 mt-2">Visão geral diária do movimento financeiro por conta</p>
              </div>
              
              {/* Navigation and Cards */}
              <div className="flex items-center gap-3">
                {/* Month Navigation */}
                <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                  <Calendar className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        const currentIndex = availableMonths.findIndex(month => month === selectedMonth);
                        if (currentIndex < availableMonths.length - 1) {
                          handleMonthChange(availableMonths[currentIndex + 1]);
                        }
                      }}
                      disabled={availableMonths.findIndex(month => month === selectedMonth) >= availableMonths.length - 1}
                      className="p-1 hover:bg-amber-100 dark:hover:bg-amber-800 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    </button>
                    
                    <select 
                      value={selectedMonth}
                      onChange={(e) => handleMonthChange(e.target.value)}
                      className="text-sm font-medium text-amber-700 dark:text-amber-300 bg-transparent border-none focus:outline-none"
                    >
                      {availableMonths.map(month => {
                        const [year, monthNum] = month.split('-');
                        const monthName = new Date(parseInt(year), parseInt(monthNum) - 1).toLocaleDateString('pt-BR', { year: 'numeric', month: 'long' });
                        const recordCount = expenses.filter(exp => exp.date.substring(0, 7) === month).length + 
                                           income.filter(inc => inc.date.substring(0, 7) === month).length +
                                           transfers.filter(tr => tr.date.substring(0, 7) === month).length;
                        return (
                          <option key={month} value={month}>
                            {monthName} ({recordCount})
                          </option>
                        );
                      })}
                    </select>
                    
                    <button
                      onClick={() => {
                        const currentIndex = availableMonths.findIndex(month => month === selectedMonth);
                        if (currentIndex > 0) {
                          handleMonthChange(availableMonths[currentIndex - 1]);
                        }
                      }}
                      disabled={availableMonths.findIndex(month => month === selectedMonth) <= 0}
                      className="p-1 hover:bg-amber-100 dark:hover:bg-amber-800 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronRight className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    </button>
                  </div>
                </div>

                {/* Summary Cards */}
                <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <DollarSign className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <div>
                    <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">Saldo Inicial: </span>
                    <span className="text-sm font-bold text-blue-700 dark:text-blue-300">{formatCurrency(dailySummaries[0]?.totalDailyBalance || 0)}</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 px-3 py-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400" />
                  <div>
                    <span className="text-xs text-green-600 dark:text-green-400 font-medium">Saldo Final: </span>
                    <span className="text-sm font-bold text-green-700 dark:text-green-300">{formatCurrency(dailySummaries[dailySummaries.length - 1]?.totalDailyBalance || 0)}</span>
                  </div>
                </div>
                
                <button
                  onClick={handleOpenExtract}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-sm"
                >
                  <Calendar className="w-4 h-4" />
                  Extrato
                </button>
                
                <button
                  onClick={handleOpenFilterModal}
                  className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2 shadow-sm"
                >
                  <Filter className="w-4 h-4" />
                  Personalizar
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
                  Calculando fluxo...
                </span>
              </div>
            </div>
          )}



          {/* Tabela de Fluxo */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto max-h-[calc(100vh-280px)]">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600 sticky top-0 z-20">
                  <tr>
                    <th className="text-left py-2 px-3 font-medium text-gray-900 dark:text-white sticky left-0 bg-gray-50 dark:bg-gray-700 z-30">
                      Data
                    </th>
                    {visibleAccounts.map(account => (
                      <th key={account.id} className="text-center py-2 px-3 font-medium text-gray-900 dark:text-white min-w-[100px]" colSpan={3}>
                        {account.name}
                      </th>
                    ))}
                    <th className="text-left py-2 px-3 font-medium text-gray-900 dark:text-white min-w-[140px] bg-blue-50 dark:bg-blue-900">
                      Saldo Total Diário
                    </th>
                  </tr>
                  <tr className="bg-gray-50 dark:bg-gray-700">
                    <th className="py-1.5 px-3 sticky left-0 bg-gray-50 dark:bg-gray-700 z-30"></th>
                    {visibleAccounts.map(account => [
                      <th key={`${account.id}-entrada`} className="text-left py-1.5 px-2 text-xs font-medium text-gray-600 dark:text-gray-400">Entrada</th>,
                      <th key={`${account.id}-saida`} className="text-left py-1.5 px-2 text-xs font-medium text-gray-600 dark:text-gray-400">Saída</th>,
                      <th key={`${account.id}-saldo`} className="text-left py-1.5 px-2 text-xs font-medium text-gray-600 dark:text-gray-400">Saldo</th>
                    ]).flat()}
                    <th className="py-1.5 px-3 bg-blue-50 dark:bg-blue-900"></th>
                  </tr>
                </thead>
                <tbody>
                  {dailySummaries.map((summary, index) => (
                    <tr key={summary.date} className={`border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${index === 0 ? 'bg-blue-25 dark:bg-blue-900/10' : ''}`}>
                      <td className="py-1 px-3 font-medium text-gray-900 dark:text-white sticky left-0 bg-white dark:bg-gray-800 z-10">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          {formatDate(summary.date)}
                        </div>
                      </td>
                      {visibleAccounts.map(account => {
                        const accountData = summary.accounts[account.id];
                        return [
                          <td key={`${account.id}-income-${summary.date}`} className="py-1 px-2 text-green-600 dark:text-green-400 text-sm">
                            {accountData?.dailyIncome > 0 ? formatCurrency(accountData.dailyIncome) : '-'}
                          </td>,
                          <td key={`${account.id}-expenses-${summary.date}`} className="py-1 px-2 text-red-600 dark:text-red-400 text-sm">
                            {accountData?.dailyExpenses > 0 ? formatCurrency(accountData.dailyExpenses) : '-'}
                          </td>,
                          <td key={`${account.id}-balance-${summary.date}`} className={`py-1 px-2 font-medium text-sm ${
                            (accountData?.finalBalance || 0) >= 0 
                              ? 'text-green-600 dark:text-green-400' 
                              : 'text-red-600 dark:text-red-400'
                          }`}>
                            {formatCurrency(accountData?.finalBalance || 0)}
                          </td>
                        ];
                      }).flat()}
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
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Filtros do Fluxo</h2>
                <button
                  onClick={handleCancelFilters}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-6">
                {/* Contas Visíveis - Ordenação por Seleção */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Contas Visíveis</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Clique nas contas na ordem que deseja visualizá-las. A primeira conta selecionada aparecerá primeiro na tabela.
                  </p>
                  
                  {/* Lista das Contas Selecionadas (Ordenadas) */}
                  {tempFilters.visibleAccounts.length > 0 && (
                    <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                      <div className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-2">
                        Ordem das contas selecionadas:
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {tempFilters.visibleAccounts.map((accountId, index) => {
                          const account = accounts.find(acc => acc.id === accountId);
                          return (
                            <div key={accountId} className="flex items-center gap-2 bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-200 px-3 py-1 rounded-lg text-sm">
                              <span className="w-5 h-5 bg-blue-600 text-white text-xs rounded-full flex items-center justify-center font-bold">
                                {index + 1}
                              </span>
                              {account?.name}
                              <button
                                onClick={() => toggleAccountVisibility(accountId, true, true)}
                                className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {accounts.map(account => (
                      <button
                        key={account.id}
                        onClick={() => toggleAccountVisibility(account.id, true)}
                        className={`flex items-center gap-3 p-3 rounded-lg text-left transition-colors ${
                          tempFilters.visibleAccounts.includes(account.id)
                            ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-300 border-2 border-blue-300 dark:border-blue-700'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 border-2 border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                      >
                        {tempFilters.visibleAccounts.includes(account.id) ? (
                          <div className="flex items-center gap-2">
                            <div className="w-5 h-5 bg-blue-600 text-white text-xs rounded-full flex items-center justify-center font-bold">
                              {tempFilters.visibleAccounts.indexOf(account.id) + 1}
                            </div>
                            <Eye className="w-4 h-4" />
                          </div>
                        ) : (
                          <EyeOff className="w-5 h-5" />
                        )}
                        <div>
                          <div className="font-medium">{account.name}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                  
                  <div className="mt-4 flex justify-between items-center">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {tempFilters.visibleAccounts.length === 0 
                        ? 'Nenhuma conta selecionada - todas serão exibidas'
                        : `${tempFilters.visibleAccounts.length} de ${accounts.length} contas selecionadas`
                      }
                    </p>
                    {tempFilters.visibleAccounts.length > 0 && (
                      <button
                        onClick={() => setTempFilters(prev => ({ ...prev, visibleAccounts: [] }))}
                        className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 underline"
                      >
                        Limpar seleção
                      </button>
                    )}
                  </div>
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

        {/* Modal de Extrato */}
        {showExtractModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-5xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Extrato Bancário</h2>
                <button
                  onClick={() => setShowExtractModal(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              {/* Filtros do Extrato */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Conta</label>
                  <select
                    value={extractAccount}
                    onChange={(e) => setExtractAccount(e.target.value)}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                  >
                    <option value="">Selecione uma conta</option>
                    {accounts.map(account => (
                      <option key={account.id} value={account.name}>
                        {account.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Mês</label>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        const currentIndex = availableMonths.findIndex(month => month === extractMonth);
                        if (currentIndex < availableMonths.length - 1) {
                          setExtractMonth(availableMonths[currentIndex + 1]);
                        }
                      }}
                      disabled={availableMonths.findIndex(month => month === extractMonth) >= availableMonths.length - 1}
                      className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    
                    <select 
                      value={extractMonth}
                      onChange={(e) => setExtractMonth(e.target.value)}
                      className="flex-1 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                    >
                      {availableMonths.map(month => {
                        const [year, monthNum] = month.split('-');
                        const monthName = new Date(parseInt(year), parseInt(monthNum) - 1).toLocaleDateString('pt-BR', { year: 'numeric', month: 'long' });
                        const recordCount = expenses.filter(exp => exp.date.substring(0, 7) === month && exp.paymentMethod === extractAccount).length + 
                                           income.filter(inc => inc.date.substring(0, 7) === month && inc.account === extractAccount).length +
                                           transfers.filter(tr => tr.date.substring(0, 7) === month && 
                                             (tr.fromAccount === extractAccount || tr.toAccount === extractAccount)).length;
                        return (
                          <option key={month} value={month}>
                            {monthName} ({recordCount})
                          </option>
                        );
                      })}
                    </select>
                    
                    <button
                      onClick={() => {
                        const currentIndex = availableMonths.findIndex(month => month === extractMonth);
                        if (currentIndex > 0) {
                          setExtractMonth(availableMonths[currentIndex - 1]);
                        }
                      }}
                      disabled={availableMonths.findIndex(month => month === extractMonth) <= 0}
                      className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Resumo do Período */}
              {extractAccount && extractWithBalance.length > 0 && (
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                    <div className="text-green-600 dark:text-green-400 text-sm font-medium">Total de Entradas</div>
                    <div className="text-green-700 dark:text-green-300 text-lg font-bold">
                      {formatCurrency(extractWithBalance.filter((m: any) => m.type === 'entrada' && !m.isInitialBalance).reduce((sum, m) => sum + m.amount, 0))}
                    </div>
                  </div>
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                    <div className="text-red-600 dark:text-red-400 text-sm font-medium">Total de Saídas</div>
                    <div className="text-red-700 dark:text-red-300 text-lg font-bold">
                      {formatCurrency(extractWithBalance.filter((m: any) => m.type === 'saida' && !m.isInitialBalance).reduce((sum, m) => sum + m.amount, 0))}
                    </div>
                  </div>
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <div className="text-blue-600 dark:text-blue-400 text-sm font-medium">Saldo Final</div>
                    <div className={`text-lg font-bold ${extractWithBalance[extractWithBalance.length - 1]?.balance >= 0 ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
                      {formatCurrency(extractWithBalance[extractWithBalance.length - 1]?.balance || 0)}
                    </div>
                  </div>
                </div>
              )}

              {/* Tabela do Extrato */}
              {extractAccount ? (
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg overflow-hidden">
                  <div className="max-h-96 overflow-y-auto">
                    <table className="w-full">
                      <thead className="bg-gray-100 dark:bg-gray-600 sticky top-0">
                        <tr>
                          <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Data</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Descrição</th>
                          <th className="text-right py-3 px-4 font-medium text-gray-900 dark:text-white">Valor</th>
                          <th className="text-right py-3 px-4 font-medium text-gray-900 dark:text-white">Saldo</th>
                        </tr>
                      </thead>
                      <tbody>
                        {extractWithBalance.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="text-center py-8 text-gray-500 dark:text-gray-400">
                              <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
                              Nenhuma movimentação encontrada para este período.
                            </td>
                          </tr>
                        ) : (
                          extractWithBalance.map((movement: any, index) => (
                            <tr key={index} className={`border-b border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 ${
                              movement.isInitialBalance ? 'bg-blue-50 dark:bg-blue-900/20 font-semibold' : ''
                            }`}>
                              <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">
                                {formatDate(movement.date)}
                              </td>
                              <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300">
                                <div className="flex items-center gap-2">
                                  {movement.isInitialBalance ? (
                                    <div className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center">
                                      <div className="w-2 h-2 bg-white rounded-full"></div>
                                    </div>
                                  ) : movement.type === 'entrada' ? (
                                    <TrendingUp className="w-4 h-4 text-green-500" />
                                  ) : (
                                    <TrendingDown className="w-4 h-4 text-red-500" />
                                  )}
                                  {movement.description}
                                </div>
                              </td>
                              <td className={`py-3 px-4 text-sm text-right font-medium ${
                                movement.isInitialBalance 
                                  ? 'text-blue-600 dark:text-blue-400'
                                  : movement.type === 'entrada' 
                                    ? 'text-green-600 dark:text-green-400' 
                                    : 'text-red-600 dark:text-red-400'
                              }`}>
                                {movement.isInitialBalance 
                                  ? '-'
                                  : `${movement.type === 'entrada' ? '+' : '-'}${formatCurrency(movement.amount)}`
                                }
                              </td>
                              <td className={`py-3 px-4 text-sm text-right font-bold ${
                                movement.balance >= 0 
                                  ? 'text-green-600 dark:text-green-400' 
                                  : 'text-red-600 dark:text-red-400'
                              }`}>
                                {formatCurrency(movement.balance)}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  Selecione uma conta para visualizar o extrato.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DailyAccountSummary;