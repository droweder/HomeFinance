import { useMemo } from 'react';
import { useFinance } from '../context/FinanceContext';
import { MonthlyData } from '../types';

export const useFinanceCalculations = () => {
  const { expenses, income } = useFinance();

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  const calculations = useMemo(() => {
    console.log('🔍 Debug - Dados brutos:', {
      totalExpenses: expenses.length,
      totalIncome: income.length,
      currentMonth,
      currentYear,
      expectedExpenses: 3530,
      actualExpenses: expenses.length,
      missingExpenses: expenses.length < 3530 ? 3530 - expenses.length : 0
    });

    // Log todas as despesas brutas para debug
    console.log('📋 Debug - Todas as despesas:', expenses.map(exp => ({
      id: exp.id,
      date: exp.date,
      dueDate: exp.dueDate,
      category: exp.category,
      amount: exp.amount,
      description: exp.description
    })));

    // Current month calculations - usar dueDate se disponível, senão date
    const currentMonthExpenses = expenses.filter(expense => {
      // Use a data de vencimento se disponível, senão a data de registro
      const dateToUse = expense.dueDate || expense.date;
      const expenseDate = new Date(dateToUse);
      const isCurrentMonth = expenseDate.getMonth() === currentMonth && expenseDate.getFullYear() === currentYear;
      
      if (isCurrentMonth) {
        console.log('✅ Despesa do mês atual:', {
          category: expense.category,
          amount: expense.amount,
          date: dateToUse,
          description: expense.description
        });
      }
      
      return isCurrentMonth;
    });

    const currentMonthIncome = income.filter(incomeItem => {
      const incomeDate = new Date(incomeItem.date);
      const isCurrentMonth = incomeDate.getMonth() === currentMonth && incomeDate.getFullYear() === currentYear;
      
      if (isCurrentMonth) {
        console.log('✅ Receita do mês atual:', {
          source: incomeItem.source,
          amount: incomeItem.amount,
          date: incomeItem.date
        });
      }
      
      return isCurrentMonth;
    });

    const totalExpensesThisMonth = currentMonthExpenses.reduce((sum, expense) => {
      const amount = expense.amount || 0;
      console.log('💰 Somando despesa:', { category: expense.category, amount, runningTotal: sum + amount });
      return sum + amount;
    }, 0);

    const totalIncomeThisMonth = currentMonthIncome.reduce((sum, incomeItem) => {
      const amount = incomeItem.amount || 0;
      console.log('💰 Somando receita:', { source: incomeItem.source, amount, runningTotal: sum + amount });
      return sum + amount;
    }, 0);

    const balanceThisMonth = totalIncomeThisMonth - totalExpensesThisMonth;

    console.log('💰 Debug - Cálculos do mês atual:', {
      despesasFiltradas: currentMonthExpenses.length,
      receitasFiltradas: currentMonthIncome.length,
      totalDespesas: totalExpensesThisMonth,
      totalReceitas: totalIncomeThisMonth,
      saldo: balanceThisMonth
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

    // Category breakdown - MELHORADO para capturar todas as categorias
    console.log('📊 Debug - Iniciando agregação por categoria...');
    
    const expensesByCategory = currentMonthExpenses.reduce((acc, expense) => {
      // Tratar categorias nulas ou indefinidas
      const category = expense.category || 'Sem Categoria';
      const amount = expense.amount || 0;
      
      console.log('📂 Processando categoria:', {
        originalCategory: expense.category,
        processedCategory: category,
        amount: amount,
        currentTotal: acc[category] || 0
      });
      
      acc[category] = (acc[category] || 0) + amount;
      
      console.log('📂 Categoria atualizada:', {
        category: category,
        newTotal: acc[category]
      });
      
      return acc;
    }, {} as Record<string, number>);

    console.log('📊 Debug - Despesas por categoria (resultado final):', expensesByCategory);
    
    // Verificar se o total das categorias bate com o total geral
    const totalFromCategories = Object.values(expensesByCategory).reduce((sum, amount) => sum + amount, 0);
    console.log('🔍 Verificação de consistência:', {
      totalGeralDespesas: totalExpensesThisMonth,
      totalDasCategorias: totalFromCategories,
      diferenca: Math.abs(totalExpensesThisMonth - totalFromCategories),
      saoIguais: Math.abs(totalExpensesThisMonth - totalFromCategories) < 0.01
    });

    // Verificar se há categorias com valores zerados ou negativos
    Object.entries(expensesByCategory).forEach(([category, amount]) => {
      if (amount <= 0) {
        console.warn('⚠️ Categoria com valor suspeito:', { category, amount });
      }
      if (amount > 100000) {
        console.warn('⚠️ Categoria com valor muito alto:', { category, amount });
      }
    });

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

    // Log final dos resultados
    console.log('📈 Debug - Resultados finais:', {
      totalExpensesThisMonth,
      totalIncomeThisMonth,
      balanceThisMonth,
      totalUpcomingExpenses,
      numeroDeCategoriasComDespesas: Object.keys(expensesByCategory).length,
      categoriasEncontradas: Object.keys(expensesByCategory),
      monthlyTrendLength: monthlyTrend.length
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