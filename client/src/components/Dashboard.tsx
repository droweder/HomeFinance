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

const Dashboard: React.FC = () => {
  const { expenses, income, transfers } = useFinance();
  const { creditCards } = useCreditCard();
  const { accounts } = useAccounts();
  const { formatCurrency, settings } = useSettings();

  // Estado para controlar o mês selecionado
  const now = new Date();
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

  // Calcula todos os gastos mensais (exceto transferências e faturas) para análises de tendência
  const allMonthsSpending = useMemo(() => {
    const spending = {} as Record<string, number>;
    
    expenses
      .filter(exp => exp.category?.toLowerCase() !== 'transferência' && exp.category?.toLowerCase() !== 'cartão de crédito')
      .forEach(exp => {
        const itemDate = new Date(exp.date);
        const monthKey = `${itemDate.getFullYear()}-${itemDate.getMonth()}`;
        spending[monthKey] = (spending[monthKey] || 0) + exp.amount;
      });

    return spending;
  }, [expenses]);

  // 1. SEÇÃO: Visão Geral Financeira
  const financialOverview = useMemo(() => {
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);

    // Saldo Total Disponível: saldo no final do mês selecionado
    const initialBalance = accounts.reduce((sum, account) => sum + account.initialBalance, 0);

    const incomeUpToSelectedMonth = income
      .filter(inc => new Date(inc.date) <= lastDayOfMonth && inc.source?.toLowerCase() !== 'transferência')
      .reduce((sum, inc) => sum + inc.amount, 0);

    const expensesUpToSelectedMonth = expenses
      .filter(exp => new Date(exp.date) <= lastDayOfMonth && exp.category?.toLowerCase() !== 'transferência')
      .reduce((sum, exp) => sum + exp.amount, 0);

    const totalBalance = initialBalance + incomeUpToSelectedMonth - expensesUpToSelectedMonth;

    // Receitas do Mês: A soma de receitas do mês selecionado, sem contar transferências.
    const monthlyIncome = income
      .filter(inc => {
        const incomeDate = new Date(inc.date);
        return incomeDate.getMonth() === currentMonth &&
               incomeDate.getFullYear() === currentYear &&
               inc.source?.toLowerCase() !== 'transferência';
      })
      .reduce((sum, inc) => sum + inc.amount, 0);

    // Gastos do Mês: A soma de despesas do mês selecionado, sem contar transferências.
    const totalMonthlySpending = expenses
      .filter(exp => {
        const expenseDate = new Date(exp.date);
        return expenseDate.getMonth() === currentMonth && 
               expenseDate.getFullYear() === currentYear &&
               exp.category?.toLowerCase() !== 'transferência';
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
    const allInvoices = creditCards.reduce((acc, card) => {
      const transactionDate = new Date(card.date);
      // Assumindo que a fatura vence no mês seguinte à transação
      const invoiceDate = new Date(transactionDate.getFullYear(), transactionDate.getMonth() + 1, 1);
      const monthKey = `${invoiceDate.getFullYear()}-${invoiceDate.getMonth()}`;

      if (!acc[monthKey]) {
        acc[monthKey] = {
          total: 0,
          month: invoiceDate.getMonth(),
          year: invoiceDate.getFullYear(),
          cards: {}
        };
      }

      acc[monthKey].total += card.amount;
      const cardName = card.cardName || 'Desconhecido';
      acc[monthKey].cards[cardName] = (acc[monthKey].cards[cardName] || 0) + card.amount;

      return acc;
    }, {} as Record<string, { total: number; month: number; year: number, cards: Record<string, number> }>);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Faturas Pendentes: A soma do valor das faturas cuja o dia de pagamento é futuro.
    const pendingInvoices = Object.values(allInvoices)
      .filter(invoice => new Date(invoice.year, invoice.month, 1) >= today)
      .reduce((sum, inv) => sum + inv.total, 0);

    // Próximas Faturas: fatura do mês seguinte ao selecionado.
    const nextMonthDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 1);
    const nextMonthKey = `${nextMonthDate.getFullYear()}-${nextMonthDate.getMonth()}`;
    const upcomingInvoice = allInvoices[nextMonthKey] || { total: 0, month: nextMonthDate.getMonth(), year: nextMonthDate.getFullYear() };

    // Maior Fatura: De todas as faturas existentes.
    const largestInvoice = Object.values(allInvoices).reduce((max, inv) => {
      if (inv.total > max.amount) {
        // Encontra o cartão com o maior gasto nessa fatura
        const largestCardInInvoice = Object.entries(inv.cards).sort(([, a], [, b]) => b - a)[0];
        return {
          amount: inv.total,
          card: largestCardInInvoice ? largestCardInInvoice[0] : 'Múltiplos',
          month: inv.month,
          year: inv.year
        };
      }
      return max;
    }, { amount: 0, card: 'Nenhum', month: 0, year: 0 });

    return {
      pendingInvoices,
      upcomingInvoice,
      largestInvoice
    };
  }, [creditCards, selectedDate]);

  // 3. SEÇÃO: Análises Inteligentes
  const intelligentAnalysis = useMemo(() => {
    // Top 5 categorias do mês (despesas reais, excluindo pagamentos de fatura e transferências)
    const categorySpending = expenses
      .filter(item => {
        const itemDate = new Date(item.date);
        return itemDate.getMonth() === currentMonth &&
               itemDate.getFullYear() === currentYear &&
               item.category?.toLowerCase() !== 'cartão de crédito' &&
               item.category?.toLowerCase() !== 'transferência';
      })
      .reduce((acc, item) => {
        const category = item.category || 'Sem Categoria';
        acc[category] = (acc[category] || 0) + item.amount;
        return acc;
      }, {} as Record<string, number>);

    const topCategories = Object.entries(categorySpending)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5);

    // Maiores transações de despesa do mês
    const biggestTransactions = expenses
      .filter(item => {
        const itemDate = new Date(item.date);
        return itemDate.getMonth() === currentMonth &&
               itemDate.getFullYear() === currentYear &&
               item.category?.toLowerCase() !== 'cartão de crédito' &&
               item.category?.toLowerCase() !== 'transferência';
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
      
      last6Months.push({
        name: monthName,
        value: spending,
        isCurrentMonth: month === currentMonth && year === currentYear
      });
    }

    // Tendência geral (comparando primeiro com último mês da série)
    const firstMonthSpending = last6Months[0]?.value || 0;
    const lastMonthSpending = last6Months[last6Months.length - 1]?.value || 0;
    const overallTrend = firstMonthSpending > 0 
      ? ((lastMonthSpending - firstMonthSpending) / firstMonthSpending) * 100
      : 0;

    // Mês com maior e menor gasto
    const maxSpendingMonth = last6Months.reduce((max, month) => month.value > max.value ? month : max, last6Months[0] || { name: '', value: 0 });
    const minSpendingMonth = last6Months.reduce((min, month) => month.value < min.value && month.value > 0 ? month : min, last6Months[0] || { name: '', value: Infinity });

    // Média dos últimos 6 meses
    const avgLast6Months = last6Months.reduce((sum, month) => sum + month.value, 0) / last6Months.length;

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
  }, [expenses, creditCards, income, transfers, currentMonth, currentYear, financialOverview.totalMonthlySpending, allMonthsSpending]);

  // 4. SEÇÃO: Alertas e Tendências
  const alertsAndTrends = useMemo(() => {
    const spendingValues = Object.values(allMonthsSpending) as number[];
    const monthlyAverageSpending = spendingValues.length > 0
      ? spendingValues.reduce((sum: number, amount: number) => sum + amount, 0) / spendingValues.length
      : 0;

    const isAboveAverage = financialOverview.totalMonthlySpending > monthlyAverageSpending;

    // Parcelamentos ativos - detalhes completos
    const activeInstallmentsDetails = creditCards
      .filter(cc => cc.isInstallment && new Date(cc.date) > now)
      .reduce((acc, cc) => {
        const key = `${cc.description}_${cc.installmentGroup || 'no-group'}`;
        if (!acc[key]) {
          acc[key] = {
            description: cc.description,
            totalAmount: 0,
            remainingInstallments: 0,
            monthlyAmount: cc.amount,
            category: cc.category
          };
        }
        acc[key].totalAmount += cc.amount;
        acc[key].remainingInstallments += 1;
        return acc;
      }, {} as Record<string, any>);

    const activeInstallmentsList = Object.values(activeInstallmentsDetails).slice(0, 5);

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
              subtitle="Despesas + Cartões"
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            <StatCard
              title="Faturas Pendentes"
              subtitle="Total a pagar"
              value={formatCurrency(creditCardAnalysis.pendingInvoices)}
              icon={<CreditCard className="w-6 h-6" />}
              color="yellow"
            />
            <StatCard
              title="Próxima Fatura"
              subtitle={new Date(creditCardAnalysis.upcomingInvoice.year, creditCardAnalysis.upcomingInvoice.month).toLocaleDateString('pt-BR', {
                month: 'long',
                year: 'numeric',
              })}
              value={formatCurrency(creditCardAnalysis.upcomingInvoice.total)}
              icon={<Calendar className="w-6 h-6" />}
              color="purple"
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
              icon={<AlertCircle className="w-6 h-6" />}
              color="red"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 lg:gap-8 mb-8">
          {/* SEÇÃO 3: Análises Inteligentes */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Análises Inteligentes</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
              {/* Top 5 Categorias */}
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 lg:p-8 border border-gray-200 dark:border-gray-700 min-h-[400px]">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-6 flex items-center">
                  <PieChart className="w-5 h-5 mr-2 text-blue-600" />
                  Top 5 Categorias do Mês
                </h3>
                <div className="space-y-4">
                  {intelligentAnalysis.topCategories.map(([category, amount], index) => (
                    <div key={category} className="flex items-center justify-between py-2">
                      <div className="flex items-center min-w-0 flex-1 mr-4">
                        <div className={`w-8 h-8 rounded-full bg-blue-${(index + 1) * 100} flex items-center justify-center text-white text-sm font-bold mr-3 flex-shrink-0`}>
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
                  ))}
                </div>
              </div>

              {/* Análise Multi-Mensal */}
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 lg:p-8 border border-gray-200 dark:border-gray-700 min-h-[400px]">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-6 flex items-center">
                  <BarChart3 className="w-5 h-5 mr-2 text-purple-600" />
                  Evolução dos Últimos 6 Meses
                </h3>
                
                {/* Gráfico de barras simples */}
                <div className="space-y-3 mb-6">
                  {intelligentAnalysis.last6Months.map((month: any, index: number) => {
                    const maxValue = Math.max(...intelligentAnalysis.last6Months.map((m: any) => m.value));
                    const percentage = maxValue > 0 ? (month.value / maxValue) * 100 : 0;
                    
                    return (
                      <div key={index} className="flex items-center py-1">
                        <div className="w-12 text-xs text-gray-600 dark:text-gray-400 flex-shrink-0">
                          {month.name}
                        </div>
                        <div className="flex-1 mx-3">
                          <div className="bg-gray-200 dark:bg-gray-700 rounded-full h-4 relative">
                            <div 
                              className={`h-4 rounded-full ${month.isCurrentMonth ? 'bg-blue-500' : 'bg-purple-500'}`}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                        <div className="w-20 text-xs text-gray-900 dark:text-white text-right flex-shrink-0">
                          {formatCurrency(Number(month.value)).replace('R$', '')}
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