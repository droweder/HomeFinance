import { useMemo } from 'react';
import { useFinance } from '../context/FinanceContext';
import { MonthlyData } from '../types';

export const useFinanceCalculations = () => {
  const { expenses, income } = useFinance();

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  const calculations = useMemo(() => {
    console.log('🔄 Recalculating financial metrics...');
    
    // Only log basic stats to reduce console noise
    const debugStats = {
      totalExpenses: expenses.length,
      totalIncome: income.length,
      currentMonth: `${currentYear}-${(currentMonth + 1).toString().padStart(2, '0')}`
    };
    console.log('📊 Financial data:', debugStats);

    // Current month calculations - usar dueDate se disponível, senão date
    const currentMonthExpenses = expenses.filter(expense => {
      // Use a data de vencimento se disponível, senão a data de registro
      const dateToUse = expense.dueDate || expense.date;
      const expenseDate = new Date(dateToUse);
      const isCurrentMonth = expenseDate.getMonth() === currentMonth && expenseDate.getFullYear() === currentYear;
      
      // Remove individual expense logging to reduce noise
      
      return isCurrentMonth;
    });

    const currentMonthIncome = income.filter(incomeItem => {
      const incomeDate = new Date(incomeItem.date);
      const isCurrentMonth = incomeDate.getMonth() === currentMonth && incomeDate.getFullYear() === currentYear;
      
      // Remove individual income logging to reduce noise
      
      return isCurrentMonth;
    });

    const totalExpensesThisMonth = currentMonthExpenses.reduce((sum, expense) => {
      return sum + (expense.amount || 0);
    }, 0);

    const totalIncomeThisMonth = currentMonthIncome.reduce((sum, incomeItem) => {
      return sum + (incomeItem.amount || 0);
    }, 0);

    const balanceThisMonth = totalIncomeThisMonth - totalExpensesThisMonth;

    // Log final summary only
    console.log('📈 Monthly totals:', {
      expenses: currentMonthExpenses.length,
      income: currentMonthIncome.length,
      totalExpenses: totalExpensesThisMonth,
      totalIncome: totalIncomeThisMonth,
      balance: balanceThisMonth
    });

    // Upcoming expenses (future dates from today)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const upcomingExpenses = expenses.filter(expense => {
      // Use a data de vencimento se disponível, senão a data de registro
      const dateToUse = expense.dueDate || expense.date;
      const expenseDate = new Date(dateToUse);
      expenseDate.setHours(0, 0, 0, 0);
      return expenseDate > today;
    });
    const totalUpcomingExpenses = upcomingExpenses.reduce((sum, expense) => sum + (expense.amount || 0), 0);

    // Category aggregation - optimized without excessive logging
    const expensesByCategory = currentMonthExpenses.reduce((acc, expense) => {
      const category = expense.category || 'Sem Categoria';
      const amount = expense.amount || 0;
      acc[category] = (acc[category] || 0) + amount;
      return acc;
    }, {} as Record<string, number>);

    // Monthly trend (last 6 months)
    const monthlyTrend: MonthlyData[] = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date(currentYear, currentMonth - i, 1);
      const monthExpenses = expenses.filter(expense => {
        // Use a data de vencimento se disponível, senão a data de registro
        const dateToUse = expense.dueDate || expense.date;
        const expenseDate = new Date(dateToUse);
        return expenseDate.getMonth() === date.getMonth() && expenseDate.getFullYear() === date.getFullYear();
      });

      const monthIncome = income.filter(incomeItem => {
        const incomeDate = new Date(incomeItem.date);
        return incomeDate.getMonth() === date.getMonth() && incomeDate.getFullYear() === date.getFullYear();
      });

      const totalExpenses = monthExpenses.reduce((sum, expense) => sum + (expense.amount || 0), 0);
      const totalIncome = monthIncome.reduce((sum, incomeItem) => sum + (incomeItem.amount || 0), 0);

      monthlyTrend.push({
        month: date.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }),
        totalIncome,
        totalExpenses,
        balance: totalIncome - totalExpenses,
      });
    }

    // Final summary (minimal logging)
    console.log('✅ Calculations complete:', {
      categories: Object.keys(expensesByCategory).length,
      monthlyData: monthlyTrend.length
    });

    return {
      totalExpensesThisMonth,
      totalIncomeThisMonth,
      balanceThisMonth,
      totalUpcomingExpenses,
      expensesByCategory,
      monthlyTrend,
      upcomingExpenses,
    };
  }, [expenses, income, currentMonth, currentYear]);

  return calculations;
};