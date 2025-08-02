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

  // Calcula todos os gastos mensais primeiro (para usar em várias análises)
  const allMonthsSpending = useMemo(() => {
    const spending = {} as Record<string, number>;
    
    // Adicionar despesas (exceto faturas de cartão)
    expenses
      .filter(exp => exp.category !== 'Cartão de Crédito')
      .forEach(exp => {
        const itemDate = new Date(exp.date);
        const monthKey = `${itemDate.getFullYear()}-${itemDate.getMonth()}`;
        spending[monthKey] = (spending[monthKey] || 0) + exp.amount;
      });
    
    // Adicionar cartões de crédito
    creditCards.forEach(cc => {
      const itemDate = new Date(cc.date);
      const monthKey = `${itemDate.getFullYear()}-${itemDate.getMonth()}`;
      spending[monthKey] = (spending[monthKey] || 0) + cc.amount;
    });

    return spending;
  }, [expenses, creditCards]);

  // 1. SEÇÃO: Visão Geral Financeira
  const financialOverview = useMemo(() => {
    // Saldo total das contas
    const totalBalance = accounts.reduce((sum, account) => sum + account.initialBalance, 0);

    // Receitas do mês atual
    const monthlyIncome = income
      .filter(inc => {
        const incomeDate = new Date(inc.date);
        return incomeDate.getMonth() === currentMonth && incomeDate.getFullYear() === currentYear;
      })
      .reduce((sum, inc) => sum + inc.amount, 0);

    // Gastos do mês: despesas (exceto faturas de cartão) + cartões de crédito
    const monthlyExpenses = expenses
      .filter(exp => {
        const expenseDate = new Date(exp.date);
        return expenseDate.getMonth() === currentMonth && 
               expenseDate.getFullYear() === currentYear &&
               exp.category !== 'Cartão de Crédito'; // Excluir faturas para evitar duplicidade
      })
      .reduce((sum, exp) => sum + exp.amount, 0);

    const monthlyCreditCards = creditCards
      .filter(cc => {
        const ccDate = new Date(cc.date);
        return ccDate.getMonth() === currentMonth && ccDate.getFullYear() === currentYear;
      })
      .reduce((sum, cc) => sum + cc.amount, 0);

    const totalMonthlySpending = monthlyExpenses + monthlyCreditCards;
    const monthlyResult = monthlyIncome - totalMonthlySpending;

    return {
      totalBalance,
      monthlyIncome,
      totalMonthlySpending,
      monthlyResult
    };
  }, [accounts, income, expenses, creditCards, currentMonth, currentYear]);

  // 2. SEÇÃO: Cartões de Crédito
  const creditCardAnalysis = useMemo(() => {
    // Faturas pendentes (futuras, baseado na data)
    const pendingInvoices = creditCards
      .filter(cc => new Date(cc.date) > now)
      .reduce((sum, cc) => sum + cc.amount, 0);

    // Próximas faturas (próximos 30 dias)
    const next30Days = new Date();
    next30Days.setDate(next30Days.getDate() + 30);
    
    const upcomingInvoices = creditCards
      .filter(cc => {
        const ccDate = new Date(cc.date);
        return ccDate <= next30Days && ccDate >= now;
      })
      .reduce((sum, cc) => sum + cc.amount, 0);

    // Maior fatura por cartão (baseado na data, não no status)
    const invoicesByCard = creditCards
      .filter(cc => new Date(cc.date) > now)
      .reduce((acc, cc) => {
        acc[cc.paymentMethod] = (acc[cc.paymentMethod] || 0) + cc.amount;
        return acc;
      }, {} as Record<string, number>);

    const largestInvoice = Object.entries(invoicesByCard)
      .sort(([,a], [,b]) => (b as number) - (a as number))[0] || ['Nenhum', 0];

    return {
      pendingInvoices,
      upcomingInvoices,
      largestInvoice: {
        card: largestInvoice[0],
        amount: largestInvoice[1]
      }
    };
  }, [creditCards, now]);

  // 3. SEÇÃO: Análises Inteligentes
  const intelligentAnalysis = useMemo(() => {
    // Top 5 categorias do mês (despesas exceto faturas + cartões de crédito)
    const filteredExpenses = expenses.filter(exp => exp.category !== 'Cartão de Crédito');
    const categorySpending = [...filteredExpenses, ...creditCards]
      .filter(item => {
        const itemDate = new Date(item.date);
        return itemDate.getMonth() === currentMonth && itemDate.getFullYear() === currentYear;
      })
      .reduce((acc, item) => {
        acc[item.category] = (acc[item.category] || 0) + item.amount;
        return acc;
      }, {} as Record<string, number>);

    const topCategories = Object.entries(categorySpending)
      .sort(([,a], [,b]) => (b as number) - (a as number))
      .slice(0, 5);

    // Maiores transações do mês
    const biggestTransactions = [...filteredExpenses, ...creditCards]
      .filter(item => {
        const itemDate = new Date(item.date);
        return itemDate.getMonth() === currentMonth && itemDate.getFullYear() === currentYear;
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

    // Parcelamentos ativos (considerando todos os lançamentos como pagos na data)
    const activeInstallments = creditCards
      .filter(cc => cc.isInstallment && new Date(cc.date) > now)
      .length;

    // Transferências recentes (últimas 5)
    const recentTransfers = transfers
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);

    return {
      isAboveAverage,
      monthlyAverageSpending,
      activeInstallments,
      recentTransfers
    };
  }, [expenses, creditCards, transfers, financialOverview.totalMonthlySpending]);

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
      <div className={`rounded-xl p-6 border ${colorClasses[color]}`}>
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{title}</p>
            {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">{value}</p>
          </div>
          <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
            <div className={iconColorClasses[color]}>{icon}</div>
          </div>
        </div>
        {trend && (
          <div className="mt-4 flex items-center">
            {trend === 'up' && <TrendingUp className="w-4 h-4 text-green-500 mr-1" />}
            {trend === 'down' && <TrendingDown className="w-4 h-4 text-red-500 mr-1" />}
            <span className={`text-sm ${trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-gray-600'}`}>
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
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard Financeiro</h1>
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard
              title="Saldo Total Disponível"
              subtitle="Todas as contas"
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatCard
              title="Faturas Pendentes"
              subtitle="Total a pagar"
              value={formatCurrency(creditCardAnalysis.pendingInvoices)}
              icon={<CreditCard className="w-6 h-6" />}
              color="yellow"
            />
            <StatCard
              title="Próximas Faturas"
              subtitle="Próximos 30 dias"
              value={formatCurrency(creditCardAnalysis.upcomingInvoices)}
              icon={<Calendar className="w-6 h-6" />}
              color="purple"
            />
            <StatCard
              title="Maior Fatura"
              subtitle={creditCardAnalysis.largestInvoice.card}
              value={formatCurrency(creditCardAnalysis.largestInvoice.amount)}
              icon={<AlertCircle className="w-6 h-6" />}
              color="red"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* SEÇÃO 3: Análises Inteligentes */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Análises Inteligentes</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Top 5 Categorias */}
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
                  <PieChart className="w-5 h-5 mr-2 text-blue-600" />
                  Top 5 Categorias do Mês
                </h3>
                <div className="space-y-3">
                  {intelligentAnalysis.topCategories.map(([category, amount], index) => (
                    <div key={category} className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className={`w-8 h-8 rounded-full bg-blue-${(index + 1) * 100} flex items-center justify-center text-white text-sm font-bold mr-3`}>
                          {index + 1}
                        </div>
                        <span className="text-gray-900 dark:text-white">{category}</span>
                      </div>
                      <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(Number(amount))}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Análise Multi-Mensal */}
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
                  <BarChart3 className="w-5 h-5 mr-2 text-purple-600" />
                  Evolução dos Últimos 6 Meses
                </h3>
                
                {/* Gráfico de barras simples */}
                <div className="space-y-2 mb-4">
                  {intelligentAnalysis.last6Months.map((month: any, index: number) => {
                    const maxValue = Math.max(...intelligentAnalysis.last6Months.map((m: any) => m.value));
                    const percentage = maxValue > 0 ? (month.value / maxValue) * 100 : 0;
                    
                    return (
                      <div key={index} className="flex items-center">
                        <div className="w-10 text-xs text-gray-600 dark:text-gray-400">{month.name}</div>
                        <div className="flex-1 mx-2">
                          <div className="bg-gray-200 dark:bg-gray-700 rounded-full h-3 relative">
                            <div 
                              className={`h-3 rounded-full ${month.isCurrentMonth ? 'bg-blue-500' : 'bg-purple-500'}`}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                        <div className="w-16 text-xs text-gray-900 dark:text-white text-right">
                          {formatCurrency(Number(month.value)).replace('R$', '')}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Estatísticas */}
                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                  <div className="text-center">
                    <p className={`text-sm font-bold ${intelligentAnalysis.overallTrend >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {intelligentAnalysis.overallTrend >= 0 ? '+' : ''}{intelligentAnalysis.overallTrend.toFixed(1)}%
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Tendência</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-bold text-gray-900 dark:text-white">{formatCurrency(Number(intelligentAnalysis.avgLast6Months))}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Média</p>
                  </div>
                </div>
              </div>

              {/* Grid para os cards menores */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 lg:col-span-2">
                {/* Maiores Transações */}
                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
                    <DollarSign className="w-5 h-5 mr-2 text-green-600" />
                    Maiores Transações do Mês
                  </h3>
                  <div className="space-y-3">
                    {intelligentAnalysis.biggestTransactions.length > 0 ? intelligentAnalysis.biggestTransactions.map((transaction: any, index: number) => (
                      <div key={index} className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{transaction.description}</p>
                          <p className="text-xs text-gray-500">{transaction.category}</p>
                        </div>
                        <span className="font-semibold text-gray-900 dark:text-white ml-2">{formatCurrency(transaction.amount)}</span>
                      </div>
                    )) : (
                      <p className="text-gray-500 dark:text-gray-400 text-center">Nenhuma transação este mês</p>
                    )}
                  </div>
                </div>

                {/* Economia vs Pior Mês */}
                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
                    <Target className="w-5 h-5 mr-2 text-blue-600" />
                    Economia vs Pior Mês
                  </h3>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600">{formatCurrency(intelligentAnalysis.savingsVsWorstMonth)}</p>
                    <p className="text-gray-600 dark:text-gray-400">
                      {intelligentAnalysis.savingsVsWorstMonth > 0 ? 'economizados' : 'a mais que o recorde'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* SEÇÃO 4: Alertas e Tendências */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Alertas e Tendências</h2>
            <div className="space-y-6">
              {/* Gastos Acima da Média */}
              <div className={`rounded-xl p-6 border ${alertsAndTrends.isAboveAverage ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' : 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'}`}>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
                  <AlertCircle className={`w-5 h-5 mr-2 ${alertsAndTrends.isAboveAverage ? 'text-red-600' : 'text-green-600'}`} />
                  {alertsAndTrends.isAboveAverage ? 'Gastos Acima da Média' : 'Gastos Dentro da Média'}
                </h3>
                <p className="text-gray-700 dark:text-gray-300">
                  {alertsAndTrends.isAboveAverage
                    ? `Seus gastos estão ${formatCurrency(financialOverview.totalMonthlySpending - alertsAndTrends.monthlyAverageSpending)} acima da média histórica.`
                    : 'Seus gastos estão dentro da média histórica. Parabéns pelo controle!'}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                  Média histórica: {formatCurrency(alertsAndTrends.monthlyAverageSpending)}
                </p>
              </div>

              {/* Parcelamentos Ativos */}
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
                  <Clock className="w-5 h-5 mr-2 text-blue-600" />
                  Parcelamentos Ativos
                </h3>
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{alertsAndTrends.activeInstallments}</p>
                  <p className="text-gray-600 dark:text-gray-400">parcelas pendentes</p>
                </div>
              </div>

              {/* Transferências Recentes */}
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
                  <ArrowUpDown className="w-5 h-5 mr-2 text-indigo-600" />
                  Transferências Recentes
                </h3>
                <div className="space-y-3">
                  {alertsAndTrends.recentTransfers.length > 0 ? alertsAndTrends.recentTransfers.map((transfer: any, index: number) => (
                    <div key={index} className="flex items-center justify-between text-sm">
                      <div>
                        <p className="text-gray-900 dark:text-white">{transfer.fromAccount} → {transfer.toAccount}</p>
                        <p className="text-gray-500">{new Date(transfer.date).toLocaleDateString('pt-BR')}</p>
                      </div>
                      <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(transfer.amount)}</span>
                    </div>
                  )) : (
                    <p className="text-gray-500 dark:text-gray-400 text-center">Nenhuma transferência recente</p>
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