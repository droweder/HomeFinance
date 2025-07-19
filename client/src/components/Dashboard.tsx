import React, { useMemo } from 'react';
import { TrendingUp, TrendingDown, DollarSign, AlertCircle, PieChart, BarChart3, CreditCard, Calendar, Target } from 'lucide-react';
import { useFinanceCalculations } from '../hooks/useFinanceCalculations';
import { useFinance } from '../context/FinanceContext';
import { useSettings } from '../context/SettingsContext';

const Dashboard: React.FC = () => {
  const {
    totalExpensesThisMonth,
    totalIncomeThisMonth,
    balanceThisMonth,
    totalUpcomingExpenses,
    expensesByCategory,
    monthlyTrend,
  } = useFinanceCalculations();

  const { expenses, income } = useFinance();
  const { formatCurrency, settings } = useSettings();

  // Cálculos de cartão de crédito por mês
  const creditCardAnalysis = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const monthlyData = [];
    
    for (let month = 0; month < 12; month++) {
      const monthExpenses = expenses.filter(expense => {
        const expenseDate = new Date(expense.date);
        return expenseDate.getFullYear() === currentYear && 
               expenseDate.getMonth() === month &&
               expense.isCreditCard;
      });
      
      // Agrupar por método de pagamento (cartão de crédito)
      const accountTotals = monthExpenses.reduce((acc, expense) => {
        const account = expense.paymentMethod || 'Sem conta';
        acc[account] = (acc[account] || 0) + expense.amount;
        return acc;
      }, {});
      
      const total = monthExpenses.reduce((sum, expense) => sum + expense.amount, 0);
      
      monthlyData.push({
        month: month + 1,
        monthName: new Date(currentYear, month).toLocaleDateString('pt-BR', { month: 'short' }),
        total,
        accounts: accountTotals
      });
    }
    
    return monthlyData;
  }, [expenses]);

  // Indicadores adicionais
  const additionalMetrics = useMemo(() => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    // Cartão de crédito este mês
    const creditCardThisMonth = expenses
      .filter(expense => {
        const expenseDate = new Date(expense.date);
        return expenseDate.getMonth() === currentMonth && 
               expenseDate.getFullYear() === currentYear &&
               expense.isCreditCard;
      })
      .reduce((sum, expense) => sum + expense.amount, 0);
    
    // Receitas futuras
    const futureIncome = income
      .filter(inc => new Date(inc.date) > new Date())
      .reduce((sum, inc) => sum + inc.amount, 0);
    
    // Maior gasto individual do mês
    const monthlyExpenses = expenses.filter(expense => {
      const expenseDate = new Date(expense.date);
      return expenseDate.getMonth() === currentMonth && 
             expenseDate.getFullYear() === currentYear;
    });
    
    const biggestExpense = monthlyExpenses.length > 0 ? 
      Math.max(...monthlyExpenses.map(e => e.amount)) : 0;
    
    return {
      creditCardThisMonth,
      futureIncome,
      biggestExpense,
      totalCreditCardYear: creditCardAnalysis.reduce((sum, month) => sum + month.total, 0)
    };
  }, [expenses, creditCardAnalysis]);

  // Memoized calculations to prevent unnecessary recalculations
  const categoryData = useMemo(() => {
    console.log('🔄 Recalculating category data...');
    
    const data = Object.entries(expensesByCategory)
      .filter(([category, amount]) => {
        // Filtrar categorias com valores válidos
        if (amount <= 0) {
          console.warn('⚠️ Categoria filtrada (valor inválido):', { category, amount });
          return false;
        }
        return true;
      })
      .map(([category, amount]) => ({
        category,
        amount,
        percentage: totalExpensesThisMonth > 0 ? (amount / totalExpensesThisMonth) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount); // Ordenar por valor decrescente

    console.log('✅ Category data calculated:', data.length, 'categories');
    return data;
  }, [expensesByCategory, totalExpensesThisMonth]);

  // Debug only when values actually change
  useMemo(() => {
    console.log('📊 Dashboard Debug - Financial summary:', {
      totalExpensesThisMonth,
      totalIncomeThisMonth,
      balanceThisMonth,
      totalUpcomingExpenses,
      categoriesCount: categoryData.length
    });
  }, [totalExpensesThisMonth, totalIncomeThisMonth, balanceThisMonth, totalUpcomingExpenses, categoryData.length]);

  const StatCard: React.FC<{
    title: string;
    value: string;
    icon: React.ReactNode;
    trend?: 'up' | 'down' | 'neutral';
    period?: string;
    className?: string;
  }> = ({ title, value, icon, trend, period, className = '' }) => (
    <div className={`bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 ${className}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{title}</p>
          {period && (
            <p className="text-xs text-gray-500 dark:text-gray-500 mb-1">{period}</p>
          )}
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{value}</p>
        </div>
        <div className="p-3 bg-blue-50 dark:bg-blue-900 rounded-lg">
          {icon}
        </div>
      </div>
      {trend && (
        <div className="mt-4 flex items-center">
          {trend === 'up' && <TrendingUp className="w-4 h-4 text-green-500 mr-1" />}
          {trend === 'down' && <TrendingDown className="w-4 h-4 text-red-500 mr-1" />}
          <span className={`text-sm ${trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-gray-600'}`}>
            {settings.language === 'pt-BR' ? 'vs. mês anterior' : 'vs. last month'}
          </span>
        </div>
      )}
    </div>
  );

  const currentMonthName = new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  const currentYear = new Date().getFullYear();

  const labels = {
    title: settings.language === 'pt-BR' ? 'Dashboard' : 'Dashboard',
    subtitle: settings.language === 'pt-BR' ? 'Visão geral da sua atividade financeira' : 'Overview of your financial activity',
    totalIncome: settings.language === 'pt-BR' ? 'Total de Receitas' : 'Total Income',
    totalExpenses: settings.language === 'pt-BR' ? 'Total de Despesas' : 'Total Expenses',
    balance: settings.language === 'pt-BR' ? 'Saldo' : 'Balance',
    upcomingExpenses: settings.language === 'pt-BR' ? 'Despesas Futuras' : 'Upcoming Expenses',
    creditCardMonth: settings.language === 'pt-BR' ? 'Cartão de Crédito' : 'Credit Card',
    futureIncome: settings.language === 'pt-BR' ? 'Receitas Futuras' : 'Future Income',
    biggestExpense: settings.language === 'pt-BR' ? 'Maior Gasto' : 'Biggest Expense',
    expensesByCategory: settings.language === 'pt-BR' ? 'Despesas por Categoria' : 'Expenses by Category',
    creditCardAnalysis: settings.language === 'pt-BR' ? 'Cartão de Crédito por Mês' : 'Credit Card by Month',
    monthlyTrend: settings.language === 'pt-BR' ? 'Tendência Mensal' : 'Monthly Trend',
    income: settings.language === 'pt-BR' ? 'Receitas' : 'Income',
    expenses: settings.language === 'pt-BR' ? 'Despesas' : 'Expenses',
    monthPeriod: currentMonthName,
    yearPeriod: `Ano ${currentYear}`,
    allTimePeriod: 'Todos os períodos',
    alertMessage: settings.language === 'pt-BR' ? 
      `Suas despesas excedem suas receitas este mês em ${formatCurrency(Math.abs(balanceThisMonth))}` :
      `Your expenses exceed your income this month by ${formatCurrency(Math.abs(balanceThisMonth))}`,
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Fixed Header */}
        <div className="fixed top-16 left-0 right-0 z-30 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{labels.title}</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">{labels.subtitle}</p>
          </div>
        </div>

        {/* Content with top margin to account for fixed header */}
        <div className="pt-32">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard
              title={labels.totalIncome}
              period={labels.monthPeriod}
              value={formatCurrency(totalIncomeThisMonth)}
              icon={<TrendingUp className="w-6 h-6 text-green-600" />}
              trend="up"
            />
            <StatCard
              title={labels.totalExpenses}
              period={labels.monthPeriod}
              value={formatCurrency(totalExpensesThisMonth)}
              icon={<TrendingDown className="w-6 h-6 text-red-600" />}
              trend="down"
            />
            <StatCard
              title={labels.balance}
              period={labels.monthPeriod}
              value={formatCurrency(balanceThisMonth)}
              icon={<DollarSign className="w-6 h-6 text-blue-600" />}
              className={balanceThisMonth < 0 ? 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20' : ''}
            />
            <StatCard
              title={labels.creditCardMonth}
              period={labels.monthPeriod}
              value={formatCurrency(additionalMetrics.creditCardThisMonth)}
              icon={<CreditCard className="w-6 h-6 text-purple-600" />}
            />
          </div>

          {/* Additional Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <StatCard
              title={labels.upcomingExpenses}
              period="Próximas datas"
              value={formatCurrency(totalUpcomingExpenses)}
              icon={<Calendar className="w-6 h-6 text-amber-600" />}
            />
            <StatCard
              title={labels.futureIncome}
              period="Próximas datas"
              value={formatCurrency(additionalMetrics.futureIncome)}
              icon={<TrendingUp className="w-6 h-6 text-green-600" />}
              className={additionalMetrics.futureIncome > 0 ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20' : ''}
            />
            <StatCard
              title={labels.biggestExpense}
              period={labels.monthPeriod}
              value={formatCurrency(additionalMetrics.biggestExpense)}
              icon={<Target className="w-6 h-6 text-red-600" />}
            />
          </div>

          {/* Alert for negative balance */}
          {balanceThisMonth < 0 && (
            <div className="mb-8 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <div className="flex items-center">
                <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
                <span className="text-red-800 dark:text-red-300 font-medium">
                  {labels.alertMessage}
                </span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Credit Card Analysis */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{labels.creditCardAnalysis}</h2>
                <CreditCard className="w-5 h-5 text-purple-600" />
              </div>
              
              <div className="space-y-3 max-h-96 overflow-y-auto">
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                  Total do ano: {formatCurrency(additionalMetrics.totalCreditCardYear)}
                </div>
                
                {creditCardAnalysis.filter(month => month.total > 0).map((month) => (
                  <div key={month.month} className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white capitalize">
                        {month.monthName} 2025
                      </h3>
                      <span className="text-lg font-bold text-purple-600 dark:text-purple-400 bg-white dark:bg-gray-800 px-2 py-1 rounded text-sm">
                        {formatCurrency(month.total)}
                      </span>
                    </div>
                    
                    {Object.keys(month.accounts).length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Por cartão:
                        </h4>
                        <div className="space-y-2">
                          {Object.entries(month.accounts)
                            .sort(([,a], [,b]) => (b as number) - (a as number))
                            .map(([account, amount]) => (
                            <div key={account} className="bg-white dark:bg-gray-800 rounded p-2 flex items-center justify-between shadow-sm">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                                <span className="text-xs font-medium text-gray-800 dark:text-gray-200">
                                  {account}
                                </span>
                              </div>
                              <div className="text-right">
                                <span className="text-sm font-bold text-purple-600 dark:text-purple-400">
                                  {formatCurrency(amount as number)}
                                </span>
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                  {((amount as number / month.total) * 100).toFixed(0)}%
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Expenses by Category */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{labels.expensesByCategory}</h2>
                <PieChart className="w-5 h-5 text-gray-500" />
              </div>
              
              {categoryData.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <PieChart className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhuma despesa encontrada para este mês</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                    Mostrando {categoryData.length} categoria(s) • Total: {formatCurrency(totalExpensesThisMonth)}
                  </div>
                  <div className="max-h-96 overflow-y-auto space-y-4">
                    {categoryData.map(({ category, amount, percentage }) => (
                      <div key={category} className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate pr-2">
                              {category}
                            </span>
                            <span className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
                              {formatCurrency(amount)}
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {percentage.toFixed(1)}%
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Monthly Trend */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{labels.monthlyTrend}</h2>
                <BarChart3 className="w-5 h-5 text-gray-500" />
              </div>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {monthlyTrend.map((month, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{month.month}</span>
                      <span className={`text-sm font-medium ${month.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(month.balance)}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">{labels.income}</div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div
                            className="bg-green-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${Math.min((month.totalIncome / Math.max(...monthlyTrend.map(m => m.totalIncome))) * 100, 100)}%` }}
                          />
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">{formatCurrency(month.totalIncome)}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">{labels.expenses}</div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div
                            className="bg-red-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${Math.min((month.totalExpenses / Math.max(...monthlyTrend.map(m => m.totalExpenses))) * 100, 100)}%` }}
                          />
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">{formatCurrency(month.totalExpenses)}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;