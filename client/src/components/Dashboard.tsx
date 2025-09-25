import React, { useMemo, useState } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  AlertCircle, 
  CreditCard, 
  Calendar, 
  Target,
  Wallet,
  PieChart,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { useAccounts } from '../context/AccountContext';
import { useSettings } from '../context/SettingsContext';

const Dashboard: React.FC = () => {
  const { expenses, income } = useFinance();
  const { accounts } = useAccounts();
  const { formatCurrency } = useSettings();

  const [selectedDate, setSelectedDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const currentMonth = selectedDate.getMonth();
  const currentYear = selectedDate.getFullYear();

  const goToPreviousMonth = () => setSelectedDate(new Date(currentYear, currentMonth - 1, 1));
  const goToNextMonth = () => setSelectedDate(new Date(currentYear, currentMonth + 1, 1));
  const goToCurrentMonth = () => setSelectedDate(new Date(new Date().getFullYear(), new Date().getMonth(), 1));

  const financialOverview = useMemo(() => {
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);
    const initialBalance = accounts.reduce((sum, account) => sum + account.initialBalance, 0);
    const incomeUpToSelectedMonth = income
      .filter(inc => new Date(`${inc.date}T00:00:00`) <= lastDayOfMonth)
      .reduce((sum, inc) => sum + inc.amount, 0);
    const expensesUpToSelectedMonth = expenses
      .filter(exp => new Date(`${exp.date}T00:00:00`) <= lastDayOfMonth)
      .reduce((sum, exp) => sum + exp.amount, 0);
    const totalBalance = initialBalance + incomeUpToSelectedMonth - expensesUpToSelectedMonth;
    const monthlyIncome = income
      .filter(inc => {
        const incomeDate = new Date(`${inc.date}T00:00:00`);
        return incomeDate.getMonth() === currentMonth && incomeDate.getFullYear() === currentYear;
      })
      .reduce((sum, inc) => sum + inc.amount, 0);
    const totalMonthlySpending = expenses
      .filter(exp => {
        const expenseDate = new Date(`${exp.date}T00:00:00`);
        return expenseDate.getMonth() === currentMonth && expenseDate.getFullYear() === currentYear;
      })
      .reduce((sum, exp) => sum + exp.amount, 0);
    const monthlyResult = monthlyIncome - totalMonthlySpending;
    return { totalBalance, monthlyIncome, totalMonthlySpending, monthlyResult };
  }, [accounts, income, expenses, currentMonth, currentYear]);

  const creditCardAnalysis = useMemo(() => {
    const creditCardInvoices = expenses.filter(e => e.category === 'Cartão de Crédito');
    const monthlyInvoiceTotals = creditCardInvoices.reduce((acc, invoice) => {
      const invoiceDate = new Date(`${invoice.date}T00:00:00`);
      const monthKey = `${invoiceDate.getFullYear()}-${invoiceDate.getMonth()}`;
      acc[monthKey] = (acc[monthKey] || 0) + invoice.amount;
      return acc;
    }, {} as Record<string, number>);

    const currentMonthKey = `${selectedDate.getFullYear()}-${selectedDate.getMonth()}`;
    const currentInvoiceTotal = monthlyInvoiceTotals[currentMonthKey] || 0;

    const nextMonthDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 1);
    const nextMonthKey = `${nextMonthDate.getFullYear()}-${nextMonthDate.getMonth()}`;
    const upcomingInvoiceTotal = monthlyInvoiceTotals[nextMonthKey] || 0;

    const largestInvoice = Object.entries(monthlyInvoiceTotals).reduce((max, [key, total]) => {
      if (total > max.amount) {
        const [year, month] = key.split('-');
        return { amount: total, year: parseInt(year), month: parseInt(month) };
      }
      return max;
    }, { amount: 0, year: 0, month: 0 });

    return { currentInvoiceTotal, upcomingInvoiceTotal, largestInvoice };
  }, [expenses, selectedDate]);

  const intelligentAnalysis = useMemo(() => {
    const categorySpending = expenses
      .filter(item => {
        const itemDate = new Date(`${item.date}T00:00:00`);
        return itemDate.getMonth() === currentMonth && itemDate.getFullYear() === currentYear;
      })
      .reduce((acc, item) => {
        const category = item.category || 'Sem Categoria';
        acc[category] = (acc[category] || 0) + item.amount;
        return acc;
      }, {} as Record<string, number>);
    const topCategories = Object.entries(categorySpending).sort(([,a], [,b]) => b - a).slice(0, 5);

    const biggestTransactions = expenses
      .filter(item => {
        const itemDate = new Date(`${item.date}T00:00:00`);
        return itemDate.getMonth() === currentMonth && itemDate.getFullYear() === currentYear;
      })
      .sort((a, b) => b.amount - a.amount).slice(0, 3);

    return { topCategories, biggestTransactions };
  }, [expenses, currentMonth, currentYear]);

  const StatCard: React.FC<{
    title: string; value: string; icon: React.ReactNode;
    color?: 'green' | 'red' | 'blue' | 'yellow' | 'purple'; subtitle?: string;
  }> = ({ title, value, icon, color = 'blue', subtitle }) => {
    const colorClasses = {
      green: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
      red: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
      blue: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
      yellow: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800',
      purple: 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800'
    };
    const iconColorClasses = {
        green: 'text-green-600', red: 'text-red-600', blue: 'text-blue-600',
        yellow: 'text-yellow-600', purple: 'text-purple-600'
    };
    return (
      <div className={`rounded-xl p-4 sm:p-6 border ${colorClasses[color]} min-h-[120px] flex flex-col justify-between`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400 truncate" title={title}>{title}</p>
            {subtitle && <p className="text-xs text-gray-500 mt-1 truncate" title={subtitle}>{subtitle}</p>}
          </div>
          <div className={`p-2 sm:p-3 rounded-lg ${colorClasses[color]} flex-shrink-0`}>
            <div className={iconColorClasses[color]}>{icon}</div>
          </div>
        </div>
        <div className="mt-3">
          <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white break-words" title={value}>{value}</p>
        </div>
      </div>
    );
  };

  const currentMonthName = selectedDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">HomeFinance</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">Visão completa da sua situação financeira</p>
            </div>
            <div className="flex items-center space-x-4">
              <button onClick={goToPreviousMonth} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"><ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" /></button>
              <div className="text-center">
                <p className="text-lg font-semibold text-gray-900 dark:text-white">{currentMonthName}</p>
                <button onClick={goToCurrentMonth} className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200">Ir para mês atual</button>
              </div>
              <button onClick={goToNextMonth} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"><ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-400" /></button>
            </div>
          </div>
        </div>

        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Visão Geral Financeira</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <StatCard title="Saldo Total Disponível" subtitle={`Posição em ${currentMonthName}`} value={formatCurrency(financialOverview.totalBalance)} icon={<Wallet className="w-6 h-6" />} color="blue" />
            <StatCard title="Receitas do Mês" subtitle={currentMonthName} value={formatCurrency(financialOverview.monthlyIncome)} icon={<TrendingUp className="w-6 h-6" />} color="green" />
            <StatCard title="Gastos do Mês" subtitle="Despesas" value={formatCurrency(financialOverview.totalMonthlySpending)} icon={<TrendingDown className="w-6 h-6" />} color="red" />
            <StatCard title="Resultado do Mês" subtitle="Receitas - Gastos" value={formatCurrency(financialOverview.monthlyResult)} icon={<Target className="w-6 h-6" />} color={financialOverview.monthlyResult >= 0 ? 'green' : 'red'} />
          </div>
        </div>

        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Cartões de Crédito</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
            <StatCard title="Fatura Atual" subtitle={currentMonthName} value={formatCurrency(creditCardAnalysis.currentInvoiceTotal)} icon={<CreditCard className="w-6 h-6" />} color="yellow" />
            <StatCard title="Próxima Fatura" subtitle={new Date(new Date().setMonth(selectedDate.getMonth() + 1)).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })} value={formatCurrency(creditCardAnalysis.upcomingInvoiceTotal)} icon={<Calendar className="w-6 h-6" />} color="purple" />
            <StatCard title="Maior Fatura" subtitle={creditCardAnalysis.largestInvoice.amount > 0 ? new Date(creditCardAnalysis.largestInvoice.year, creditCardAnalysis.largestInvoice.month).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }) : 'Nenhuma fatura encontrada'} value={formatCurrency(creditCardAnalysis.largestInvoice.amount)} icon={<AlertCircle className="w-6 h-6" />} color="red" />
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 lg:gap-8 mb-8">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Análises Inteligentes</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 lg:p-8 border border-gray-200 dark:border-gray-700 min-h-[400px]">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-6 flex items-center"><PieChart className="w-5 h-5 mr-2 text-blue-600" />Top 5 Categorias do Mês</h3>
                <div className="space-y-4">
                  {intelligentAnalysis.topCategories.map(([category, amount], index) => (
                    <div key={category} className="flex items-center justify-between py-2">
                      <div className="flex items-center min-w-0 flex-1 mr-4">
                        <div className={`w-8 h-8 rounded-full bg-blue-${(index + 1) * 100} flex items-center justify-center text-white text-sm font-bold mr-3 flex-shrink-0`}>{index + 1}</div>
                        <span className="text-gray-900 dark:text-white text-sm truncate" title={category}>{category}</span>
                      </div>
                      <span className="font-semibold text-gray-900 dark:text-white text-sm flex-shrink-0">{formatCurrency(Number(amount))}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 md:col-span-2">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center"><DollarSign className="w-5 h-5 mr-2 text-green-600" />Maiores Transações do Mês</h3>
                <div className="space-y-3">
                  {intelligentAnalysis.biggestTransactions.length > 0 ? intelligentAnalysis.biggestTransactions.map((transaction: any, index: number) => (
                    <div key={index} className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate" title={transaction.description}>{transaction.description}</p>
                        <p className="text-xs text-gray-500 truncate" title={transaction.category}>{transaction.category}</p>
                      </div>
                      <span className="font-semibold text-gray-900 dark:text-white flex-shrink-0 text-sm">{formatCurrency(transaction.amount)}</span>
                    </div>
                  )) : (
                    <p className="text-gray-500 dark:text-gray-400 text-center">Nenhuma transação este mês</p>
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