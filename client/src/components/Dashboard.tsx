import React, { useMemo, useState } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  AlertCircle, 
  CreditCard, 
  Calendar, 
  Target,
  BarChart3,
  ArrowUpDown,
  Wallet,
  PieChart,
  Users,
  Clock,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { useCreditCard } from '../context/CreditCardContext';
import { useAccounts } from '../context/AccountContext';
import { useSettings } from '../context/SettingsContext';

// Helper function to parse date strings as local time to avoid timezone issues.
const parseDate = (dateString: string): Date => {
  const [year, month, day] = dateString.split('-').map(Number);
  // Month is 0-indexed in JavaScript's Date constructor (0-11)
  return new Date(year, month - 1, day);
};

const Dashboard: React.FC = () => {
  const { expenses, income, transfers } = useFinance();
  const { creditCards } = useCreditCard();
  const { accounts } = useAccounts();
  const { formatCurrency, settings } = useSettings();

  // Estado para controlar o mês selecionado
  const now = new Date();
  now.setHours(0, 0, 0, 0); // Normaliza para o início do dia
  const [selectedDate, setSelectedDate] = useState(new Date(now.getFullYear(), now.getMonth(), 1));
  const currentMonth = selectedDate.getMonth();
  const currentYear = selectedDate.getFullYear();
  const currentDate = now.toISOString().split('T')[0];

  // Funções para navegação entre meses
  const goToPreviousMonth = () => {
    setSelectedDate(new Date(currentYear, currentMonth - 1, 1));
  };

  const goToNextMonth = () => {
    setSelectedDate(new Date(currentYear, currentMonth + 1, 1));
  };

  const goToCurrentMonth = () => {
    setSelectedDate(new Date(now.getFullYear(), now.getMonth(), 1));
  };

  // Calcula todos os gastos mensais para análises de tendência
  const allMonthsSpending = useMemo(() => {
    const spending = {} as Record<string, number>;

    expenses.forEach(exp => {
      const itemDate = parseDate(exp.date);
      const monthKey = `${itemDate.getFullYear()}-${itemDate.getMonth()}`;
      spending[monthKey] = (spending[monthKey] || 0) + exp.amount;
    });

    return spending;
  }, [expenses]);

  // Calcula todas as receitas mensais para análises de tendência
  const allMonthsIncome = useMemo(() => {
    const incomeByMonth = {} as Record<string, number>;

    income.forEach(inc => {
      const itemDate = parseDate(inc.date);
      const monthKey = `${itemDate.getFullYear()}-${itemDate.getMonth()}`;
      incomeByMonth[monthKey] = (incomeByMonth[monthKey] || 0) + inc.amount;
    });

    return incomeByMonth;
  }, [income]);

  // 1. SEÇÃO: Visão Geral Financeira
  const financialOverview = useMemo(() => {
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);

    // Saldo Total Disponível: saldo no final do mês selecionado
    const initialBalance = accounts.reduce((sum, account) => sum + account.initialBalance, 0);

    // Total de receitas e despesas até o final do mês selecionado (sem filtros de transferência)
    const incomeUpToSelectedMonth = income
      .filter(inc => parseDate(inc.date) <= lastDayOfMonth)
      .reduce((sum, inc) => sum + inc.amount, 0);

    const expensesUpToSelectedMonth = expenses
      .filter(exp => parseDate(exp.date) <= lastDayOfMonth)
      .reduce((sum, exp) => sum + exp.amount, 0);

    // Saldo total é o saldo inicial mais tudo que entrou menos tudo que saiu. Transferências se anulam.
    const totalBalance = initialBalance + incomeUpToSelectedMonth - expensesUpToSelectedMonth;

    // Receitas do Mês: Soma de todos os lançamentos em 'income' para o mês.
    const monthlyIncome = income
      .filter(inc => {
        const incomeDate = parseDate(inc.date);
        return incomeDate.getMonth() === currentMonth &&
               incomeDate.getFullYear() === currentYear;
      })
      .reduce((sum, inc) => sum + inc.amount, 0);

    // Gastos do Mês: Soma de todos os lançamentos em 'expenses' para o mês.
    const totalMonthlySpending = expenses
      .filter(exp => {
        const expenseDate = parseDate(exp.date);
        return expenseDate.getMonth() === currentMonth &&
               expenseDate.getFullYear() === currentYear;
      })
      .reduce((sum, exp) => sum + exp.amount, 0);

    // Resultado do Mês: Receitas - Despesas
    const monthlyResult = monthlyIncome - totalMonthlySpending;

    return {
      totalBalance,
      monthlyIncome,
      totalMonthlySpending,
      monthlyResult
    };
  }, [accounts, income, expenses, currentMonth, currentYear]);

  // 2. SEÇÃO: Cartões de Crédito
  const creditCardAnalysis = useMemo(() => {
    const creditCardExpenses = expenses.filter(exp => exp.category === 'Cartão de Crédito');

    // Fatura Atual: soma dos gastos de cartão no mês selecionado.
    const currentInvoiceAmount = creditCardExpenses
      .filter(exp => {
        const expenseDate = parseDate(exp.date);
        return expenseDate.getMonth() === currentMonth && expenseDate.getFullYear() === currentYear;
      })
      .reduce((sum, exp) => sum + exp.amount, 0);

    // Próxima Fatura: soma dos gastos de cartão no mês seguinte ao selecionado.
    const nextMonth = new Date(currentYear, currentMonth + 1, 1);
    const nextMonthYear = nextMonth.getFullYear();
    const nextMonthIndex = nextMonth.getMonth();

    const upcomingInvoiceAmount = creditCardExpenses
      .filter(exp => {
        const expenseDate = parseDate(exp.date);
        return expenseDate.getMonth() === nextMonthIndex && expenseDate.getFullYear() === nextMonthYear;
      })
      .reduce((sum, exp) => sum + exp.amount, 0);

    // Faturas Pendentes: Soma do valor dos lançamentos da tabela expenses, com a "categoria" chamada "Cartão de Crédito" com "data" maior que a data de hoje.
    const pendingInvoicesTotal = creditCardExpenses
      .filter(exp => {
        const expenseDate = parseDate(exp.date);
        return expenseDate > now;
      })
      .reduce((sum, exp) => sum + exp.amount, 0);

    // Maior Fatura: Encontra a maior fatura de qualquer mês.
    const allInvoicesByMonth = creditCardExpenses.reduce((acc, exp) => {
      const expenseDate = parseDate(exp.date);
      const monthKey = `${expenseDate.getFullYear()}-${expenseDate.getMonth()}`;
      if (!acc[monthKey]) {
        acc[monthKey] = {
          total: 0,
          month: expenseDate.getMonth(),
          year: expenseDate.getFullYear(),
          cards: {}
        };
      }
      acc[monthKey].total += exp.amount;
      const cardName = exp.paymentMethod || 'Desconhecido';
      acc[monthKey].cards[cardName] = (acc[monthKey].cards[cardName] || 0) + exp.amount;
      return acc;
    }, {} as Record<string, { total: number; month: number; year: number, cards: Record<string, number> }>);

    const largestInvoiceData = Object.values(allInvoicesByMonth).reduce((max, inv) => inv.total > max.total ? inv : max, { total: 0, month: 0, year: 0, cards: {} });
    const largestCardInInvoice = Object.entries(largestInvoiceData.cards).sort(([, a], [, b]) => b - a)[0];

    return {
      currentInvoiceAmount,
      upcomingInvoiceAmount,
      pendingInvoicesTotal,
      largestInvoice: {
        amount: largestInvoiceData.total,
        month: largestInvoiceData.month,
        year: largestInvoiceData.year,
        card: largestCardInInvoice ? largestCardInInvoice[0] : 'Nenhum'
      }
    };
  }, [expenses, currentMonth, currentYear, selectedDate]);

  // 3. SEÇÃO: Análises Inteligentes
  const intelligentAnalysis = useMemo(() => {
    // Combina despesas e gastos do cartão de crédito para a análise de categorias
    const allSpending = [...expenses, ...creditCards];

    // Top 5 categorias de despesa do mês
    const categorySpending = allSpending
      .filter(item => {
        const itemDate = parseDate(item.date);
        return itemDate.getMonth() === currentMonth &&
               itemDate.getFullYear() === currentYear;
      })
      .reduce((acc, item) => {
        const category = item.category || 'Sem Categoria';
        acc[category] = (acc[category] || 0) + item.amount;
        return acc;
      }, {} as Record<string, number>);

    const topCategories = (Object.entries(categorySpending) as [string, number][])
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10);

    // Maiores transações de despesa do mês
    const biggestTransactions = expenses
      .filter(item => {
        const itemDate = parseDate(item.date);
        return itemDate.getMonth() === currentMonth &&
               itemDate.getFullYear() === currentYear;
      })
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 3);

    // Análise de economia (comparando com o maior gasto histórico mensal)
    const allMonthlyTotals = Object.values(allMonthsSpending) as number[];
    const maxMonthlySpending = Math.max(...allMonthlyTotals, 0);
    const savingsVsWorstMonth = maxMonthlySpending > 0 ? maxMonthlySpending - financialOverview.totalMonthlySpending : 0;

    // Análise multi-mensal (últimos 6 meses)
    const last6Months = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date(currentYear, currentMonth - i, 1);
      const month = date.getMonth();
      const year = date.getFullYear();
      const monthKey = `${year}-${month}`;

      const monthName = date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
      const spending = allMonthsSpending[monthKey] || 0;
      const incomeValue = allMonthsIncome[monthKey] || 0;

      last6Months.push({
        name: monthName,
        spending: spending,
        income: incomeValue,
        isCurrentMonth: month === currentMonth && year === currentYear
      });
    }

    // Tendência geral de gastos (comparando primeiro com último mês da série)
    const firstMonthSpending = last6Months[0]?.spending || 0;
    const lastMonthSpending = last6Months[last6Months.length - 1]?.spending || 0;
    const overallTrend = firstMonthSpending > 0
      ? ((lastMonthSpending - firstMonthSpending) / firstMonthSpending) * 100
      : 0;

    // Mês com maior e menor gasto
    const maxSpendingMonth = last6Months.reduce((max, month) => month.spending > max.spending ? month : max, last6Months[0] || { name: '', spending: 0 });
    const minSpendingMonth = last6Months.reduce((min, month) => month.spending < min.spending && month.spending > 0 ? month : min, last6Months[0] || { name: '', spending: Infinity });

    // Média de gastos dos últimos 6 meses
    const avgLast6Months = last6Months.reduce((sum, month) => sum + month.spending, 0) / last6Months.length;

    return {
      topCategories,
      biggestTransactions,
      savingsVsWorstMonth,
      last6Months,
      overallTrend,
      maxSpendingMonth,
      minSpendingMonth,
      avgLast6Months
    };
  }, [expenses, creditCards, income, transfers, currentMonth, currentYear, financialOverview.totalMonthlySpending, allMonthsSpending, allMonthsIncome]);

  // 4. SEÇÃO: Alertas e Tendências
  const alertsAndTrends = useMemo(() => {
    const spendingValues = Object.values(allMonthsSpending) as number[];
    const monthlyAverageSpending = spendingValues.length > 0
      ? spendingValues.reduce((sum: number, amount: number) => sum + amount, 0) / spendingValues.length
      : 0;

    const isAboveAverage = financialOverview.totalMonthlySpending > monthlyAverageSpending;

    // Parcelamentos ativos - detalhes completos
    const expenseInstallments = Object.values(
      expenses
        .filter(item => item.isInstallment && item.installmentGroup)
        .reduce((acc, item) => {
          const key = item.installmentGroup as string;
          if (!acc[key]) {
            acc[key] = {
              description: item.description,
              monthlyAmount: item.amount,
              category: item.category,
              installments: []
            };
          }
          acc[key].installments.push(item);
          return acc;
        }, {} as Record<string, any>)
    )
      .map((group: any) => {
        const futureInstallments = group.installments.filter((inst: any) => parseDate(inst.date) >= now);
        return {
          ...group,
          remainingInstallments: futureInstallments.length,
          totalAmount: futureInstallments.reduce((sum: number, inst: any) => sum + inst.amount, 0),
        };
      })
      .filter(group => group.remainingInstallments > 0);

    const creditCardInstallments = Object.values(
      creditCards
        .filter(item => item.isInstallment)
        .map(item => {
          if (!item.installmentGroup) {
            return { ...item, installmentGroup: `synth-${item.description}-${item.date}` };
          }
          return item;
        })
        .reduce((acc, item) => {
          const key = item.installmentGroup as string;
          if (!acc[key]) {
            acc[key] = {
              description: item.description,
              monthlyAmount: item.amount,
              category: item.category,
              installments: []
            };
          }
          acc[key].installments.push(item);
          return acc;
        }, {} as Record<string, any>)
    )
      .map((group: any) => {
        const futureInstallments = group.installments.filter((inst: any) => parseDate(inst.date) >= now);
        return {
          ...group,
          remainingInstallments: futureInstallments.length,
          totalAmount: futureInstallments.reduce((sum: number, inst: any) => sum + inst.amount, 0),
        };
      })
      .filter(group => group.remainingInstallments > 0);

    const activeInstallmentsList = [...expenseInstallments, ...creditCardInstallments]
      .sort((a, b) => b.totalAmount - a.totalAmount)
      .slice(0, 10);

    return {
      isAboveAverage,
      monthlyAverageSpending,
      activeInstallmentsList
    };
  }, [expenses, creditCards, transfers, financialOverview.totalMonthlySpending, now]);

  // Componente Card reutilizável
  const StatCard: React.FC<{
    title: string;
    value: string;
    icon: React.ReactNode;
    trend?: 'up' | 'down' | 'neutral';
    color?: 'green' | 'red' | 'blue' | 'yellow' | 'purple';
    subtitle?: string;
  }> = ({ title, value, icon, trend, color = 'blue', subtitle }) => {
    const colorClasses = {
      green: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
      red: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
      blue: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
      yellow: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800',
      purple: 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800'
    };

    const iconColorClasses = {
      green: 'text-green-600',
      red: 'text-red-600',
      blue: 'text-blue-600',
      yellow: 'text-yellow-600',
      purple: 'text-purple-600'
    };

    return (
      <div className={`rounded-xl p-4 sm:p-6 border ${colorClasses[color]} min-h-[120px] flex flex-col justify-between`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400 truncate" title={title}>
              {title}
            </p>
            {subtitle && (
              <p className="text-xs text-gray-500 mt-1 truncate" title={subtitle}>
                {subtitle}
              </p>
            )}
          </div>
          <div className={`p-2 sm:p-3 rounded-lg ${colorClasses[color]} flex-shrink-0`}>
            <div className={iconColorClasses[color]}>{icon}</div>
          </div>
        </div>

        <div className="mt-3">
          <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white break-words" title={value}>
            {value}
          </p>
        </div>

        {trend && (
          <div className="mt-3 flex items-center">
            {trend === 'up' && <TrendingUp className="w-4 h-4 text-green-500 mr-1 flex-shrink-0" />}
            {trend === 'down' && <TrendingDown className="w-4 h-4 text-red-500 mr-1 flex-shrink-0" />}
            <span className={`text-sm ${trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-gray-600'} truncate`}>
              {trend === 'up' ? 'Tendência positiva' : trend === 'down' ? 'Tendência negativa' : 'Estável'}
            </span>
          </div>
        )}
      </div>
    );
  };

  const currentMonthName = selectedDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">HomeFinance</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">Visão completa da sua situação financeira</p>
            </div>

            {/* Seletor de Mês */}
            <div className="flex items-center space-x-4">
              <button
                onClick={goToPreviousMonth}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>

              <div className="text-center">
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {selectedDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                </p>
                <button
                  onClick={goToCurrentMonth}
                  className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200"
                >
                  Ir para mês atual
                </button>
              </div>

              <button
                onClick={goToNextMonth}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>
            </div>
          </div>
        </div>

        {/* SEÇÃO 1: Visão Geral Financeira */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Visão Geral Financeira</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <StatCard
              title="Saldo Total Disponível"
              subtitle={`Posição em ${currentMonthName}`}
              value={formatCurrency(financialOverview.totalBalance)}
              icon={<Wallet className="w-6 h-6" />}
              color="blue"
            />
            <StatCard
              title="Receitas do Mês"
              subtitle={currentMonthName}
              value={formatCurrency(financialOverview.monthlyIncome)}
              icon={<TrendingUp className="w-6 h-6" />}
              color="green"
              trend="up"
            />
            <StatCard
              title="Gastos do Mês"
              subtitle="Despesas do Mês"
              value={formatCurrency(financialOverview.totalMonthlySpending)}
              icon={<TrendingDown className="w-6 h-6" />}
              color="red"
              trend="down"
            />
            <StatCard
              title="Resultado do Mês"
              subtitle="Receitas - Gastos"
              value={formatCurrency(financialOverview.monthlyResult)}
              icon={<Target className="w-6 h-6" />}
              color={financialOverview.monthlyResult >= 0 ? 'green' : 'red'}
              trend={financialOverview.monthlyResult >= 0 ? 'up' : 'down'}
            />
          </div>
        </div>

        {/* SEÇÃO 2: Cartões de Crédito */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Cartões de Crédito</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <StatCard
              title="Fatura Atual"
              subtitle={currentMonthName}
              value={formatCurrency(creditCardAnalysis.currentInvoiceAmount)}
              icon={<CreditCard className="w-6 h-6" />}
              color="blue"
            />
            <StatCard
              title="Próxima Fatura"
              subtitle={new Date(currentYear, currentMonth + 1).toLocaleDateString('pt-BR', {
                month: 'long',
                year: 'numeric',
              })}
              value={formatCurrency(creditCardAnalysis.upcomingInvoiceAmount)}
              icon={<Calendar className="w-6 h-6" />}
              color="purple"
            />
            <StatCard
              title="Faturas Pendentes"
              subtitle="Total a pagar"
              value={formatCurrency(creditCardAnalysis.pendingInvoicesTotal)}
              icon={<AlertCircle className="w-6 h-6" />}
              color="yellow"
            />
            <StatCard
              title="Maior Fatura"
              subtitle={
                creditCardAnalysis.largestInvoice.amount > 0
                  ? `${creditCardAnalysis.largestInvoice.card} - ${new Date(
                      creditCardAnalysis.largestInvoice.year,
                      creditCardAnalysis.largestInvoice.month
                    ).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })}`
                  : 'Nenhuma fatura encontrada'
              }
              value={formatCurrency(creditCardAnalysis.largestInvoice.amount)}
              icon={<Target className="w-6 h-6" />}
              color="red"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 lg:gap-8 mb-8">
          {/* SEÇÃO 3: Análises Inteligentes */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Análises Inteligentes</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
              {/* Top 10 Categorias */}
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 lg:p-8 border border-gray-200 dark:border-gray-700 min-h-[400px]">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-6 flex items-center">
                  <PieChart className="w-5 h-5 mr-2 text-blue-600" />
                  Top 10 Categorias do Mês
                </h3>
                <div className="space-y-4">
                  {intelligentAnalysis.topCategories.map(([category, amount], index) => {
                    // Red (hue 0) for rank 1 (index 0) to Green (hue 120) for rank 10 (index 9)
                    const hue = (index / 9) * 120;
                    const color = `hsl(${hue} 70% 45%)`;

                    return (
                      <div key={category} className="flex items-center justify-between py-2">
                        <div className="flex items-center min-w-0 flex-1 mr-4">
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold mr-3 flex-shrink-0"
                            style={{ backgroundColor: color }}
                          >
                            {index + 1}
                          </div>
                          <span className="text-gray-900 dark:text-white text-sm truncate" title={category}>
                            {category}
                          </span>
                        </div>
                        <span className="font-semibold text-gray-900 dark:text-white text-sm flex-shrink-0">
                          {formatCurrency(Number(amount))}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Análise Multi-Mensal */}
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 lg:p-8 border border-gray-200 dark:border-gray-700 min-h-[400px]">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-6 flex items-center">
                  <BarChart3 className="w-5 h-5 mr-2 text-purple-600" />
                  Evolução dos Últimos 6 Meses
                </h3>

                {/* Gráfico de barras horizontal */}
                <div className="space-y-4 mb-6">
                  {intelligentAnalysis.last6Months.map((month: any, index: number) => {
                    const maxAbsValue = Math.max(
                      ...intelligentAnalysis.last6Months.map((m: any) => m.income),
                      ...intelligentAnalysis.last6Months.map((m: any) => m.spending)
                    );
                    const incomePercentage = maxAbsValue > 0 ? (month.income / maxAbsValue) * 100 : 0;
                    const spendingPercentage = maxAbsValue > 0 ? (month.spending / maxAbsValue) * 100 : 0;

                    return (
                      <div key={index} className="grid grid-cols-3 items-center gap-2">
                        {/* Mês */}
                        <div className="text-xs text-gray-600 dark:text-gray-400 truncate">
                          {month.name}
                        </div>

                        {/* Barras */}
                        <div className="col-span-2 space-y-1">
                          {/* Receita */}
                          <div className="flex items-center">
                            <div className="w-full bg-green-100 dark:bg-green-900/30 rounded-full h-3.5">
                              <div
                                className="bg-green-500 h-3.5 rounded-full"
                                style={{ width: `${incomePercentage}%` }}
                              ></div>
                            </div>
                            <div className="w-16 text-right text-xs text-green-600 ml-2">
                              {formatCurrency(month.income).replace('R$', '')}
                            </div>
                          </div>

                          {/* Despesa */}
                          <div className="flex items-center">
                            <div className="w-full bg-red-100 dark:bg-red-900/30 rounded-full h-3.5">
                              <div
                                className={`h-3.5 rounded-full ${month.isCurrentMonth ? 'bg-blue-500' : 'bg-red-500'}`}
                                style={{ width: `${spendingPercentage}%` }}
                              ></div>
                            </div>
                            <div className="w-16 text-right text-xs text-red-600 ml-2">
                              {formatCurrency(month.spending).replace('R$', '')}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Estatísticas */}
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="text-center">
                    <p className={`text-sm font-bold ${intelligentAnalysis.overallTrend >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {intelligentAnalysis.overallTrend >= 0 ? '+' : ''}{intelligentAnalysis.overallTrend.toFixed(1)}%
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Tendência</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-bold text-gray-900 dark:text-white">{formatCurrency(Number(intelligentAnalysis.avgLast6Months))}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Média</p>
                  </div>
                </div>
              </div>

              {/* Maiores Transações do Mês */}
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 md:col-span-2">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
                  <DollarSign className="w-5 h-5 mr-2 text-green-600" />
                  Maiores Transações do Mês
                </h3>
                <div className="space-y-3">
                  {intelligentAnalysis.biggestTransactions.length > 0 ? intelligentAnalysis.biggestTransactions.map((transaction: any, index: number) => (
                    <div key={index} className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate" title={transaction.description}>
                          {transaction.description}
                        </p>
                        <p className="text-xs text-gray-500 truncate" title={transaction.category}>
                          {transaction.category}
                        </p>
                      </div>
                      <span className="font-semibold text-gray-900 dark:text-white flex-shrink-0 text-sm">
                        {formatCurrency(transaction.amount)}
                      </span>
                    </div>
                  )) : (
                    <p className="text-gray-500 dark:text-gray-400 text-center">Nenhuma transação este mês</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* SEÇÃO 4: Alertas e Tendências */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Alertas e Tendências</h2>
            <div className="space-y-6">
              {/* Gastos vs Média Histórica */}
              <StatCard
                title={alertsAndTrends.isAboveAverage ? "Acima da Média" : "Abaixo da Média"}
                value={formatCurrency(financialOverview.totalMonthlySpending)}
                icon={alertsAndTrends.isAboveAverage ? <TrendingUp className="w-6 h-6" /> : <TrendingDown className="w-6 h-6" />}
                color={alertsAndTrends.isAboveAverage ? "red" : "green"}
                subtitle={`Média histórica: ${formatCurrency(alertsAndTrends.monthlyAverageSpending)}`}
                trend={alertsAndTrends.isAboveAverage ? "up" : "down"}
              />

              {/* Parcelamentos Ativos */}
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
                  <Clock className="w-5 h-5 mr-2 text-orange-600" />
                  Parcelamentos Ativos
                </h3>
                <div className="space-y-3">
                  {alertsAndTrends.activeInstallmentsList && alertsAndTrends.activeInstallmentsList.length > 0 ? alertsAndTrends.activeInstallmentsList.map((installment: any, index: number) => (
                    <div key={index} className="border-l-4 border-orange-500 pl-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate" title={installment.description}>
                            {installment.description}
                          </p>
                          <p className="text-xs text-gray-500 truncate" title={installment.category}>
                            {installment.category}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-sm font-semibold text-gray-900 dark:text-white">
                            {formatCurrency(installment.monthlyAmount)}/mês
                          </p>
                          <p className="text-xs text-orange-600">
                            {installment.remainingInstallments}x restantes
                          </p>
                        </div>
                      </div>
                      <div className="mt-2">
                        <p className="text-xs text-gray-500">
                          Total restante: {formatCurrency(installment.totalAmount)}
                        </p>
                      </div>
                    </div>
                  )) : (
                    <p className="text-gray-500 dark:text-gray-400 text-center">Nenhum parcelamento ativo</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;