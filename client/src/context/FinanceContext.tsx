import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Expense, Income, Category, FilterState } from '../types';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { withSupabaseRetry } from '../utils/supabaseRetry';

// Import Account type from types file
import { Account } from '../types';

interface FinanceContextType {
  expenses: Expense[];
  income: Income[];
  categories: Category[];
  filters: FilterState;
  addExpense: (expense: Omit<Expense, 'id' | 'createdAt'>) => void;
  addIncome: (income: Omit<Income, 'id' | 'createdAt'>) => void;
  addCategory: (category: Omit<Category, 'id' | 'createdAt'>) => void;
  updateExpense: (id: string, expense: Partial<Expense>) => void;
  updateIncome: (id: string, income: Partial<Income>) => void;
  updateCategory: (id: string, category: Partial<Category>) => void;
  deleteExpense: (id: string) => void;
  deleteIncome: (id: string) => void;
  deleteCategory: (id: string) => void;
  updateFilters: (section: keyof FilterState, newFilters: Partial<FilterState[keyof FilterState]>) => void;
  isLoading: boolean;
}

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

export const useFinance = () => {
  const context = useContext(FinanceContext);
  if (!context) {
    throw new Error('useFinance must be used within a FinanceProvider');
  }
  return context;
};

interface FinanceProviderProps {
  children: ReactNode;
}

export const FinanceProvider: React.FC<FinanceProviderProps> = ({ children }) => {
  const { currentUser } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [income, setIncome] = useState<Income[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>({
    expenses: {
      category: '',
      account: '',
      description: '',
      location: '',
      startDate: '',
      endDate: '',
      installmentGroup: '',
      groupInstallments: false,
      sortBy: [],
    },
    income: {
      source: '',
      account: '',
      description: '',
      location: '',
      startDate: '',
      endDate: '',
      groupRecurring: false,
      sortBy: [],
    },
    dailySummary: {
      // Default to current month's first day
      startDate: (() => {
        const today = new Date();
        return new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
      })(),
      endDate: (() => {
        const today = new Date();
        const start = new Date(today.getFullYear(), today.getMonth(), 1);
        const end = new Date(start);
        end.setDate(start.getDate() + 89); // 90 days total
        return end.toISOString().split('T')[0];
      })(),
      visibleAccounts: [],
    },
  });

  // Load data from Supabase when user is authenticated
  useEffect(() => {
    const fetchData = async () => {
      if (!currentUser) {
        console.log('⚠️ User not authenticated - clearing data');
        setExpenses([]);
        setIncome([]);
        setCategories([]);
        setIsLoading(false);
        setLoadingError(null);
        return;
      }

      try {
        console.log('🔄 Loading financial data for user:', currentUser.username);
        setIsLoading(true);
        setLoadingError(null);

        // Load categories
        console.log('📂 Loading categories...');
        const { data: categoriesData, error: categoriesError } = await withSupabaseRetry(() =>
          supabase
            .from('categories')
            .select('*')
            .eq('user_id', currentUser.id)
            .limit(1000)
            .order('created_at', { ascending: true })
        );

        if (categoriesError) {
          console.error('❌ Error loading categories:', categoriesError);
          setLoadingError(`Error loading categories: ${categoriesError.message}`);
          throw categoriesError;
        } else {
          const mappedCategories: Category[] = categoriesData.map(cat => ({
            id: cat.id,
            name: cat.name,
            type: cat.type as 'income' | 'expense',
            createdAt: cat.created_at,
          }));
          setCategories(mappedCategories);
          console.log('✅ Categories loaded:', mappedCategories.length);
        }

        // Load expenses
        console.log('💳 Loading expenses...');
        const { data: expensesData, error: expensesError } = await withSupabaseRetry(() =>
          supabase
            .from('expenses')
            .select('*')
            .eq('user_id', currentUser.id)
            .order('created_at', { ascending: false })
        );

        if (expensesError) {
          console.error('❌ Error loading expenses:', expensesError);
          throw expensesError;
        }

        const mappedExpenses: Expense[] = expensesData.map(exp => ({
          id: exp.id,
          date: exp.date,
          category: exp.category,
          description: exp.description,
          amount: parseFloat(exp.amount.toString()),
          paymentMethod: exp.payment_method,
          location: exp.location,
          paid: exp.paid,
          isInstallment: exp.is_installment,
          installmentNumber: exp.installment_number,
          totalInstallments: exp.total_installments,
          installmentGroup: exp.installment_group,
          dueDate: exp.due_date,
          isCreditCard: exp.is_credit_card,
          createdAt: exp.created_at,
        }));
        setExpenses(mappedExpenses);
        console.log('✅ Expenses loaded:', mappedExpenses.length);

        // Load income
        console.log('💰 Loading income...');
        const { data: incomeData, error: incomeError } = await withSupabaseRetry(() =>
          supabase
            .from('income')
            .select('*')
            .eq('user_id', currentUser.id)
            .order('created_at', { ascending: false })
        );

        if (incomeError) {
          console.error('❌ Error loading income:', incomeError);
          setLoadingError(`Error loading income: ${incomeError.message}`);
          throw incomeError;
        } else {
          const mappedIncome: Income[] = incomeData.map(inc => ({
            id: inc.id,
            date: inc.date,
            source: inc.source,
            amount: parseFloat(inc.amount.toString()),
            notes: inc.notes,
            location: inc.location,
            account: inc.account,
            createdAt: inc.created_at,
          }));
          setIncome(mappedIncome);
          console.log('✅ Income loaded:', mappedIncome.length);
        }

        console.log('🎉 All financial data loaded successfully!');
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('❌ Critical error loading data:', error);
        setLoadingError(`Loading failed: ${errorMessage}`);
        // Clear data on error to avoid inconsistent state
        setExpenses([]);
        setIncome([]);
        setCategories([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [currentUser]);

  const addExpense = async (expense: Omit<Expense, 'id' | 'createdAt'>) => {
    if (!currentUser) {
      console.error('❌ User not authenticated');
      throw new Error('User not authenticated');
    }

    try {
      console.log('💾 Adding expense to Supabase:', expense);
      
      const { data, error } = await withSupabaseRetry(() =>
        supabase
          .from('expenses')
          .insert({
            date: expense.date,
            category: expense.category,
            description: expense.description,
            amount: expense.amount,
            payment_method: expense.paymentMethod,
            location: expense.location || null,
            paid: expense.paid || false,
            is_installment: expense.isInstallment || false,
            installment_number: expense.installmentNumber || null,
            total_installments: expense.totalInstallments || null,
            installment_group: expense.installmentGroup || null,
            due_date: expense.dueDate || null,
            is_credit_card: expense.isCreditCard || false,
            user_id: currentUser.id,
          })
          .select()
          .single()
      );

      if (error) {
        console.error('❌ Error adding expense:', error);
        throw new Error(`Supabase error: ${error.message}`);
      }

      const newExpense: Expense = {
        id: data.id,
        date: data.date,
        category: data.category,
        description: data.description,
        amount: parseFloat(data.amount.toString()),
        paymentMethod: data.payment_method,
        location: data.location,
        paid: data.paid,
        isInstallment: data.is_installment,
        installmentNumber: data.installment_number,
        totalInstallments: data.total_installments,
        installmentGroup: data.installment_group,
        dueDate: data.due_date,
        isCreditCard: data.is_credit_card,
        createdAt: data.created_at,
      };

      setExpenses(prev => [newExpense, ...prev]);
      console.log('✅ Expense added successfully:', newExpense.id);
    } catch (error) {
      console.error('❌ Error adding expense:', error);
      throw error;
    }
  };

  const addIncome = async (income: Omit<Income, 'id' | 'createdAt'>) => {
    if (!currentUser) {
      console.error('❌ User not authenticated');
      throw new Error('User not authenticated');
    }

    try {
      console.log('💾 Adding income to Supabase:', income);
      
      const { data, error } = await withSupabaseRetry(() =>
        supabase
          .from('income')
          .insert({
            date: income.date,
            source: income.source,
            amount: income.amount,
            notes: income.notes || '',
            location: income.location || null,
            account: income.account || null,
            user_id: currentUser.id,
          })
          .select()
          .single()
      );

      if (error) {
        console.error('❌ Error adding income:', error);
        throw new Error(`Supabase error: ${error.message}`);
      }

      const newIncome: Income = {
        id: data.id,
        date: data.date,
        source: data.source,
        amount: parseFloat(data.amount.toString()),
        notes: data.notes,
        location: data.location,
        account: data.account,
        createdAt: data.created_at,
      };

      setIncome(prev => [newIncome, ...prev]);
      console.log('✅ Income added successfully:', newIncome.id);
    } catch (error) {
      console.error('❌ Error adding income:', error);
      throw error;
    }
  };

  const addCategory = async (category: Omit<Category, 'id' | 'createdAt'>) => {
    if (!currentUser) {
      console.error('❌ User not authenticated');
      return;
    }

    try {
      const { data, error } = await withSupabaseRetry(() =>
        supabase
          .from('categories')
          .insert({
            name: category.name,
            type: category.type,
            user_id: currentUser.id,
          })
          .select()
          .single()
      );

      if (error) {
        console.error('❌ Error adding category:', error);
        return;
      }

      const newCategory: Category = {
        id: data.id,
        name: data.name,
        type: data.type,
        createdAt: data.created_at,
      };

      setCategories(prev => [...prev, newCategory]);
      console.log('✅ Category added');
    } catch (error) {
      console.error('❌ Error adding category:', error);
    }
  };

  const updateExpense = async (id: string, updatedExpense: Partial<Expense>) => {
    if (!currentUser) {
      console.error('❌ User not authenticated');
      return;
    }

    try {
      const updateData: any = {};
      if (updatedExpense.date !== undefined) updateData.date = updatedExpense.date;
      if (updatedExpense.category !== undefined) updateData.category = updatedExpense.category;
      if (updatedExpense.description !== undefined) updateData.description = updatedExpense.description;
      if (updatedExpense.amount !== undefined) updateData.amount = updatedExpense.amount;
      if (updatedExpense.paymentMethod !== undefined) updateData.payment_method = updatedExpense.paymentMethod;
      if (updatedExpense.location !== undefined) updateData.location = updatedExpense.location;
      if (updatedExpense.paid !== undefined) updateData.paid = updatedExpense.paid;
      if (updatedExpense.isCreditCard !== undefined) updateData.is_credit_card = updatedExpense.isCreditCard;
      if (updatedExpense.dueDate !== undefined) updateData.due_date = updatedExpense.dueDate;

      const { error } = await withSupabaseRetry(() =>
        supabase
          .from('expenses')
          .update(updateData)
          .eq('id', id)
          .eq('user_id', currentUser.id)
      );

      if (error) {
        console.error('❌ Error updating expense:', error);
        return;
      }

      setExpenses(prev => prev.map(expense => 
        expense.id === id ? { ...expense, ...updatedExpense } : expense
      ));
      console.log('✅ Expense updated');
    } catch (error) {
      console.error('❌ Error updating expense:', error);
    }
  };

  const updateIncome = async (id: string, updatedIncome: Partial<Income>) => {
    if (!currentUser) {
      console.error('❌ User not authenticated');
      return;
    }

    try {
      const updateData: any = {};
      if (updatedIncome.date !== undefined) updateData.date = updatedIncome.date;
      if (updatedIncome.source !== undefined) updateData.source = updatedIncome.source;
      if (updatedIncome.amount !== undefined) updateData.amount = updatedIncome.amount;
      if (updatedIncome.notes !== undefined) updateData.notes = updatedIncome.notes;
      if (updatedIncome.location !== undefined) updateData.location = updatedIncome.location;
      if (updatedIncome.account !== undefined) updateData.account = updatedIncome.account;

      const { error } = await withSupabaseRetry(() =>
        supabase
          .from('income')
          .update(updateData)
          .eq('id', id)
          .eq('user_id', currentUser.id)
      );

      if (error) {
        console.error('❌ Error updating income:', error);
        return;
      }

      setIncome(prev => prev.map(income => 
        income.id === id ? { ...income, ...updatedIncome } : income
      ));
      console.log('✅ Income updated');
    } catch (error) {
      console.error('❌ Error updating income:', error);
    }
  };

  const updateCategory = async (id: string, updatedCategory: Partial<Category>) => {
    if (!currentUser) {
      console.error('❌ User not authenticated');
      return;
    }

    try {
      const updateData: any = {};
      if (updatedCategory.name !== undefined) updateData.name = updatedCategory.name;
      if (updatedCategory.type !== undefined) updateData.type = updatedCategory.type;

      const { error } = await withSupabaseRetry(() =>
        supabase
          .from('categories')
          .update(updateData)
          .eq('id', id)
          .eq('user_id', currentUser.id)
      );

      if (error) {
        console.error('❌ Error updating category:', error);
        return;
      }

      setCategories(prev => prev.map(category => 
        category.id === id ? { ...category, ...updatedCategory } : category
      ));
      console.log('✅ Category updated');
    } catch (error) {
      console.error('❌ Error updating category:', error);
    }
  };

  const deleteExpense = async (id: string) => {
    if (!currentUser) {
      console.error('❌ User not authenticated');
      return;
    }

    try {
      const { error } = await withSupabaseRetry(() =>
        supabase
          .from('expenses')
          .delete()
          .eq('id', id)
          .eq('user_id', currentUser.id)
      );

      if (error) {
        console.error('❌ Error deleting expense:', error);
        return;
      }

      setExpenses(prev => prev.filter(expense => expense.id !== id));
      console.log('✅ Expense deleted');
    } catch (error) {
      console.error('❌ Error deleting expense:', error);
    }
  };

  const deleteIncome = async (id: string) => {
    if (!currentUser) {
      console.error('❌ User not authenticated');
      return;
    }

    try {
      const { error } = await withSupabaseRetry(() =>
        supabase
          .from('income')
          .delete()
          .eq('id', id)
          .eq('user_id', currentUser.id)
      );

      if (error) {
        console.error('❌ Error deleting income:', error);
        return;
      }

      setIncome(prev => prev.filter(income => income.id !== id));
      console.log('✅ Income deleted');
    } catch (error) {
      console.error('❌ Error deleting income:', error);
    }
  };

  const deleteCategory = async (id: string) => {
    if (!currentUser) {
      console.error('❌ User not authenticated');
      return;
    }

    try {
      const { error } = await withSupabaseRetry(() =>
        supabase
          .from('categories')
          .delete()
          .eq('id', id)
          .eq('user_id', currentUser.id)
      );

      if (error) {
        console.error('❌ Error deleting category:', error);
        return;
      }

      setCategories(prev => prev.filter(category => category.id !== id));
      console.log('✅ Category deleted');
    } catch (error) {
      console.error('❌ Error deleting category:', error);
    }
  };

  const updateFilters = (section: keyof FilterState, newFilters: Partial<FilterState[keyof FilterState]>) => {
    setFilters(prev => ({
      ...prev,
      [section]: { ...prev[section], ...newFilters }
    }));
  };

  return (
    <FinanceContext.Provider
      value={{
        expenses,
        income,
        categories,
        filters,
        addExpense,
        addIncome,
        addCategory,
        updateExpense,
        updateIncome,
        updateCategory,
        deleteExpense,
        deleteIncome,
        deleteCategory,
        updateFilters,
        isLoading,
      }}
    >
      {isLoading ? (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Carregando dados financeiros...</p>
            <p className="text-gray-500 dark:text-gray-500 text-sm mt-2">
              {expenses.length > 0 && `${expenses.length} despesas carregadas`}
              {income.length > 0 && ` • ${income.length} receitas carregadas`}
              {categories.length > 0 && ` • ${categories.length} categorias carregadas`}
            </p>
            {loadingError && (
              <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg max-w-md mx-auto">
                <p className="text-red-700 dark:text-red-400 text-sm">{loadingError}</p>
                <button
                  onClick={() => window.location.reload()}
                  className="mt-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                >
                  Recarregar Página
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        children
      )}
    </FinanceContext.Provider>
  );
};