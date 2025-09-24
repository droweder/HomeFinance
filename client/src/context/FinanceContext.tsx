import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import { Expense, Income, Category, FilterState, Transfer } from '../types';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { withSupabaseRetry } from '../utils/supabaseRetry';
import { storage } from '../utils/localStorage';

// Import Account type from types file
import { Account } from '../types';

interface FinanceContextType {
  expenses: Expense[];
  income: Income[];
  categories: Category[];
  transfers: Transfer[];
  filters: FilterState;
  addExpense: (expense: Omit<Expense, 'id' | 'createdAt'>) => Promise<Expense>;
  addIncome: (income: Omit<Income, 'id' | 'createdAt'>) => void;
  addCategory: (category: Omit<Category, 'id' | 'createdAt'>) => void;
  addTransfer: (transfer: Omit<Transfer, 'id' | 'createdAt' | 'userId'>) => void;
  updateExpense: (id: string, expense: Partial<Expense>) => void;
  updateIncome: (id: string, income: Partial<Income>) => void;
  updateCategory: (id: string, category: Partial<Category>) => void;
  updateTransfer: (id: string, transfer: Partial<Transfer>) => void;
  deleteExpense: (id: string) => void;
  deleteIncome: (id: string) => void;
  deleteCategory: (id: string) => void;
  deleteTransfer: (id: string) => void;
  updateFilters: (section: keyof FilterState, newFilters: Partial<FilterState[keyof FilterState]>) => void;
  refreshData: () => Promise<void>;
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
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [lastLoadTime, setLastLoadTime] = useState<number>(0);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [loadedUserId, setLoadedUserId] = useState<string | null>(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [lastUserInteraction, setLastUserInteraction] = useState<number>(Date.now());
  const [dataLoadingDisabled, setDataLoadingDisabled] = useState(false);
  const [isLoadingHistorical, setIsLoadingHistorical] = useState(false);
  const [hasAllData, setHasAllData] = useState(false);
  
  // Global flag to prevent any data loading
  const isLoadingBlocked = () => {
    const hasData = expenses.length > 0 && income.length > 0 && categories.length > 0;
    const isLoaded = isDataLoaded && loadedUserId === currentUser?.id;
    return hasData && isLoaded && dataLoadingDisabled;
  };
  // Persistent filters with localStorage
  const getDefaultFilters = (): FilterState => ({
    expenses: {
      category: '',
      account: '',
      description: '',
      location: '',
      startDate: '',
      endDate: '',
      installmentGroup: '',
      groupInstallments: false,
      isCreditCard: 'all',
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
      startDate: (() => {
        const today = new Date();
        return new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
      })(),
      endDate: (() => {
        const today = new Date();
        const start = new Date(today.getFullYear(), today.getMonth(), 1);
        const end = new Date(start);
        end.setDate(start.getDate() + 89);
        return end.toISOString().split('T')[0];
      })(),
      visibleAccounts: [],
    },
    transfers: {
      fromAccount: '',
      toAccount: '',
      description: '',
      startDate: '',
      endDate: '',
      sortBy: [],
    },
  });

  const [filters, setFilters] = useState<FilterState>(() => {
    try {
      const stored = localStorage.getItem('finance-app-filters');
      if (stored) {
        const parsed = JSON.parse(stored);
        console.log('📖 Filtros carregados do localStorage');
        
        // Validate dailySummary dates and reset if too old/future
        const defaults = getDefaultFilters();
        const correctedFilters = { ...defaults, ...parsed };
        
        // Always force dailySummary to current month for consistency
        if (correctedFilters.dailySummary?.startDate) {
          const startDate = new Date(correctedFilters.dailySummary.startDate);
          const now = new Date();
          const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
          
          // If not exactly the current month, reset to current month
          if (startDate.getTime() !== currentMonthStart.getTime()) {
            console.log('🔄 Resetando datas do dailySummary para o mês atual');
            correctedFilters.dailySummary = {
              ...correctedFilters.dailySummary,
              startDate: defaults.dailySummary.startDate,
              endDate: defaults.dailySummary.endDate,
            };
            
            // Save corrected filters back to localStorage
            localStorage.setItem('finance-app-filters', JSON.stringify(correctedFilters));
          }
        }
        
        return correctedFilters;
      }
    } catch (error) {
      console.error('❌ Erro ao carregar filtros:', error);
    }
    return getDefaultFilters();
  });

  // Track page visibility to prevent reload on tab changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // User returned to tab - update interaction time but don't reload
        setLastUserInteraction(Date.now());
        console.log('👁️ User returned to tab - preventing unnecessary reload');
      }
    };

    const handleUserInteraction = () => {
      setLastUserInteraction(Date.now());
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('click', handleUserInteraction);
    document.addEventListener('keydown', handleUserInteraction);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('keydown', handleUserInteraction);
    };
  }, []);

  // Memoize current user ID to prevent unnecessary effect triggers
  const currentUserId = useMemo(() => currentUser?.id || null, [currentUser?.id]);
  
  // Load data from Supabase when user is authenticated (only when necessary)
  useEffect(() => {
    console.log('🔄 useEffect triggered', {
      currentUserId,
      dataLoadingDisabled,
      isDataLoaded,
      loadedUserId,
      expensesCount: expenses.length
    });

    // FIRST CHECK: If data loading is disabled, exit immediately
    if (dataLoadingDisabled) {
      console.log('🚫 DATA LOADING PERMANENTLY DISABLED - useEffect blocked');
      return;
    }

    let loadTimeout: NodeJS.Timeout;

    const fetchData = async () => {
      // DOUBLE CHECK: If data loading is disabled, don't load anything
      if (dataLoadingDisabled) {
        console.log('🚫 DATA LOADING PERMANENTLY DISABLED - fetchData blocked');
        return;
      }

      if (!currentUser) {
        // Only clear data if we actually had data before
        if (isDataLoaded) {
          console.log('⚠️ User logged out - clearing data');
          setExpenses([]);
          setIncome([]);
          setCategories([]);
          setTransfers([]);
          setIsDataLoaded(false);
          setLoadedUserId(null);
          setDataLoadingDisabled(false); // Re-enable for next user
          localStorage.removeItem('finance-data-user-id');
          // Clear data lock on logout
          if (currentUser) {
            localStorage.removeItem(`finance-data-lock-${currentUser.id}`);
            console.log('🔓 Data lock cleared on logout');
          }
        }
        setIsLoading(false);
        setLoadingError(null);
        return;
      }

      // ABSOLUTE BLOCK: Check data lock first (but only if data was actually loaded)
      if (isDataLoaded && expenses.length > 0 && isDataLocked()) {
        console.log('🔒 DATA LOCKED - Absolutely no reload allowed');
        return;
      }

      // Check if data is already loaded for this user (STRICT CHECK)
      const storedUserId = localStorage.getItem('finance-data-user-id');
      if (storedUserId === currentUser.id && loadedUserId === currentUser.id && expenses.length > 0) {
        console.log('🛡️ Data already loaded and cached for user:', currentUser.email || currentUser.username, '- BLOCKED reload');
        createDataLock(); // Create lock to prevent future reloads
        return;
      }

      // For subsequent loads after initial, be more restrictive
      if (!isInitialLoad && isDataLoaded && storedUserId === currentUser.id && expenses.length > 0) {
        console.log('🛡️ Blocking subsequent reload - data already exists');
        createDataLock(); // Create lock
        return;
      }

      // Don't reload if user just switched tabs recently (within 10 seconds)
      const timeSinceInteraction = Date.now() - lastUserInteraction;
      if (timeSinceInteraction < 10000 && !isInitialLoad && expenses.length > 0) {
        console.log('⏸️ Recent tab switch detected - blocking reload to preserve user experience');
        createDataLock(); // Create lock
        return;
      }

      // Prevent rapid successive loads
      const now = Date.now();
      if (isLoading) {
        console.log('⏸️ Already loading, skipping duplicate request');
        return;
      }

      // Debounce: prevent loading if less than 5 seconds since last load (increased)
      if (now - lastLoadTime < 5000) {
        console.log('⏸️ Debouncing: skipping load (too soon since last load)');
        return;
      }

      try {
        // FINAL BLOCK: Check global loading block
        if (isLoadingBlocked()) {
          console.log('🔒 GLOBAL BLOCK: Data already loaded, preventing reload');
          return;
        }

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
            .limit(5000) // Increase limit for categories as well
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

        // Load ALL expenses - use pagination to ensure we get all records
        console.log('💳 Loading ALL expenses...');
        let allExpenses: any[] = [];
        let hasMore = true;
        let offset = 0;
        const batchSize = 1000;

        while (hasMore) {
          const { data: batchData, error: batchError } = await withSupabaseRetry(() =>
            supabase
              .from('expenses')
              .select('*')
              .eq('user_id', currentUser.id)
              .order('created_at', { ascending: false })
              .range(offset, offset + batchSize - 1)
          );

          if (batchError) {
            console.error('❌ Error loading expenses batch:', batchError);
            throw batchError;
          }

          if (batchData && batchData.length > 0) {
            allExpenses = [...allExpenses, ...batchData];
            offset += batchSize;
            console.log(`📦 Loaded batch: ${batchData.length} expenses (total: ${allExpenses.length})`);

            if (batchData.length < batchSize) {
              hasMore = false;
            }
          } else {
            hasMore = false;
          }
        }

        const expensesData = allExpenses;
        const expensesError = null;

        if (expensesError) {
          console.error('❌ Error loading expenses:', expensesError);
          setLoadingError(`Error loading expenses: ${expensesError.message}`);
          throw expensesError;
        }

        const mappedExpenses: Expense[] = (expensesData || []).map(exp => ({
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
          // Removido dueDate - usando apenas date
          isCreditCard: exp.is_credit_card,
          createdAt: exp.created_at,
        }));
        setExpenses(mappedExpenses);
        console.log(`✅ ALL Expenses loaded: ${mappedExpenses.length}`);

        if (mappedExpenses.length < 3000) {
          console.warn(`⚠️ Loaded fewer expenses than expected! Got ${mappedExpenses.length}, expected 3500+`);
        }

        // Load ALL income
        console.log('💰 Loading ALL income...');
        const { data: incomeData, error: incomeError } = await withSupabaseRetry(() =>
          supabase
            .from('income')
            .select('*')
            .eq('user_id', currentUser.id)
            .order('created_at', { ascending: false })
            .limit(10000)
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

        // Load ALL transfers
        console.log('🔄 Loading ALL transfers...');
        try {
          const { data: transfersData, error: transfersError } = await withSupabaseRetry(() =>
            supabase
              .from('transfers')
              .select('*')
              .eq('user_id', currentUser.id)
              .order('created_at', { ascending: false })
              .limit(10000)
          );

          if (transfersError) {
            if (transfersError.code === '42P01') {
              console.log('⚠️ Transfers table does not exist yet - skipping transfer loading');
              setTransfers([]);
            } else {
              console.error('❌ Error loading transfers:', transfersError);
              setLoadingError(`Error loading transfers: ${transfersError.message}`);
              throw transfersError;
            }
          } else {
            const mappedTransfers: Transfer[] = (transfersData || []).map(trans => ({
              id: trans.id.toString(),
              date: trans.date,
              amount: parseFloat(trans.amount.toString()),
              fromAccount: trans.from_account,
              toAccount: trans.to_account,
              description: trans.description,
              createdAt: trans.created_at,
              userId: trans.user_id,
            }));
            setTransfers(mappedTransfers);
            console.log('✅ Transfers loaded:', mappedTransfers.length);
          }
        } catch (transferError) {
          console.log('⚠️ Transfer loading failed - table may not exist yet');
          setTransfers([]);
        }

        console.log('🎉 All financial data loaded successfully!');
        setIsDataLoaded(true);
        setLastLoadTime(Date.now());
        setLoadedUserId(currentUser.id);
        setIsInitialLoad(false);

        // PERMANENTLY DISABLE data loading for this session
        setDataLoadingDisabled(true);
        console.log('🔒 DATA LOADING PERMANENTLY DISABLED for session');

        // Save user ID to prevent unnecessary reloads
        localStorage.setItem('finance-data-user-id', currentUser.id);

        // Create data lock to absolutely prevent future reloads
        createDataLock();
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('❌ Critical error loading data:', error);
        setLoadingError(`Loading failed: ${errorMessage}`);
        // Clear data on error to avoid inconsistent state
        setExpenses([]);
        setIncome([]);
        setCategories([]);
        setTransfers([]);
      } finally {
        setIsLoading(false);
      }
    };

    // Only execute if we have a user and haven't loaded data for this user yet
    if (currentUserId && (!loadedUserId || loadedUserId !== currentUserId || !isDataLoaded)) {
      console.log('✅ Conditions met for data loading', {
        hasUserId: !!currentUserId,
        loadedUserId,
        isDataLoaded,
        dataLoadingDisabled
      });

      // Debounce loading to prevent rapid successive calls when tab switching
      loadTimeout = setTimeout(() => {
        fetchData();
      }, 100);
    } else {
      console.log('⏸️ Skipping data load - conditions not met', {
        hasUserId: !!currentUserId,
        loadedUserId,
        currentUserId,
        isDataLoaded,
        dataLoadingDisabled
      });
    }

    return () => {
      if (loadTimeout) {
        clearTimeout(loadTimeout);
      }
    };
  }, [currentUserId, dataLoadingDisabled]); // Include dataLoadingDisabled in dependencies

  const addExpense = async (expense: Omit<Expense, 'id' | 'createdAt'>): Promise<Expense> => {
    if (!currentUser) {
      console.error('❌ User not authenticated');
      throw new Error('User not authenticated');
    }

    // Optimistic update - add expense immediately with temp ID
    const tempId = `temp-${Date.now()}`;
    const optimisticExpense: Expense = {
      id: tempId,
      ...expense,
      createdAt: new Date().toISOString(),
    };

    setExpenses(prev => [optimisticExpense, ...prev]);
    console.log('⚡ Optimistic expense added');

    try {
      console.log('💾 Syncing expense to Supabase...');
      
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
            // Removido due_date - usando apenas date
            is_credit_card: expense.isCreditCard || false,
            user_id: currentUser.id,
          })
          .select()
          .single()
      );

      if (error) {
        console.error('❌ Error syncing expense:', error);
        // Revert optimistic update on error
        setExpenses(prev => prev.filter(exp => exp.id !== tempId));
        throw new Error(`Supabase error: ${error.message}`);
      }

      // Replace temp expense with real data from database
      const confirmedExpense: Expense = {
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
        dueDate: data.date, // Map date to dueDate for consistency
        isCreditCard: data.is_credit_card,
        createdAt: data.created_at,
      };

      setExpenses(prev => prev.map(exp => exp.id === tempId ? confirmedExpense : exp));
      console.log('✅ Expense synced successfully:', confirmedExpense.id);
      return confirmedExpense;
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

    // Optimistic update - add income immediately with temp ID
    const tempId = `temp-${Date.now()}`;
    const optimisticIncome: Income = {
      id: tempId,
      ...income,
      createdAt: new Date().toISOString(),
    };

    setIncome(prev => [optimisticIncome, ...prev]);
    console.log('⚡ Optimistic income added');

    try {
      console.log('💾 Syncing income to Supabase...');
      
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
        console.error('❌ Error syncing income:', error);
        // Revert optimistic update on error
        setIncome(prev => prev.filter(inc => inc.id !== tempId));
        throw new Error(`Supabase error: ${error.message}`);
      }

      // Replace temp income with real data from database
      const confirmedIncome: Income = {
        id: data.id,
        date: data.date,
        source: data.source,
        amount: parseFloat(data.amount.toString()),
        notes: data.notes,
        location: data.location,
        account: data.account,
        createdAt: data.created_at,
      };

      setIncome(prev => prev.map(inc => inc.id === tempId ? confirmedIncome : inc));
      console.log('✅ Income synced successfully:', confirmedIncome.id);
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

    console.log('🔄 Iniciando atualização de despesa:', { id, updatedExpense });
    console.log('🔄 Usuario atual:', currentUser);
    console.log('🔄 Despesas atuais:', expenses.length);
    console.log('🔄 Despesa a ser atualizada encontrada:', expenses.find(e => e.id === id));

    // Optimistic update - update UI immediately
    const previousExpenses = [...expenses];
    setExpenses(prev => prev.map(expense => 
      expense.id === id ? { ...expense, ...updatedExpense } : expense
    ));
    console.log('⚡ Optimistic expense update applied');

    try {
      const updateData: any = {};
      
      // Validação e logging específico para data
      if (updatedExpense.date !== undefined) {
        console.log('📅 Validando data para update:', updatedExpense.date);
        
        // Validar formato da data
        if (!/^\d{4}-\d{2}-\d{2}$/.test(updatedExpense.date)) {
          throw new Error(`Formato de data inválido: ${updatedExpense.date}. Esperado: YYYY-MM-DD`);
        }
        
        // Validar se é uma data válida
        const dateObj = new Date(updatedExpense.date);
        if (isNaN(dateObj.getTime())) {
          throw new Error(`Data inválida: ${updatedExpense.date}`);
        }
        
        updateData.date = updatedExpense.date;
        console.log('✅ Data validada com sucesso:', updatedExpense.date);
      }
      
      if (updatedExpense.category !== undefined) updateData.category = updatedExpense.category;
      if (updatedExpense.description !== undefined) updateData.description = updatedExpense.description;
      if (updatedExpense.amount !== undefined) updateData.amount = updatedExpense.amount;
      if (updatedExpense.paymentMethod !== undefined) updateData.payment_method = updatedExpense.paymentMethod;
      if (updatedExpense.location !== undefined) updateData.location = updatedExpense.location;
      if (updatedExpense.paid !== undefined) updateData.paid = updatedExpense.paid;
      if (updatedExpense.isCreditCard !== undefined) updateData.is_credit_card = updatedExpense.isCreditCard;
      // Remove due_date - usando apenas date
      if (updatedExpense.isInstallment !== undefined) updateData.is_installment = updatedExpense.isInstallment;
      if (updatedExpense.installmentNumber !== undefined) updateData.installment_number = updatedExpense.installmentNumber;
      if (updatedExpense.totalInstallments !== undefined) updateData.total_installments = updatedExpense.totalInstallments;
      if (updatedExpense.installmentGroup !== undefined) updateData.installment_group = updatedExpense.installmentGroup;

      console.log('📤 Dados preparados para atualização no Supabase:', updateData);
      console.log('📤 ID da despesa:', id);
      console.log('📤 ID do usuário:', currentUser.id);

      const { error, data } = await withSupabaseRetry(() =>
        supabase
          .from('expenses')
          .update(updateData)
          .eq('id', id)
          .eq('user_id', currentUser.id)
          .select()
      );

      console.log('📤 Resposta do Supabase:', { error, data });

      if (error) {
        console.error('❌ Error syncing expense update:', error);
        // Revert optimistic update on error
        setExpenses(previousExpenses);
        throw new Error(`Falha na atualização: ${error.message}`);
      }

      console.log('✅ Expense update synced successfully');
    } catch (error) {
      console.error('❌ Error updating expense:', error);
      // Revert optimistic update on any error
      setExpenses(previousExpenses);
      throw error;
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

    // Optimistic update - remove from UI immediately
    const previousExpenses = [...expenses];
    const expenseToDelete = expenses.find(exp => exp.id === id);
    setExpenses(prev => prev.filter(expense => expense.id !== id));
    console.log('⚡ Optimistic expense deletion');

    try {
      const { error } = await withSupabaseRetry(() =>
        supabase
          .from('expenses')
          .delete()
          .eq('id', id)
          .eq('user_id', currentUser.id)
      );

      if (error) {
        console.error('❌ Error syncing expense deletion:', error);
        // Revert optimistic update on error
        setExpenses(previousExpenses);
        throw new Error(`Delete failed: ${error.message}`);
      }

      console.log('✅ Expense deletion synced');
    } catch (error) {
      console.error('❌ Error deleting expense:', error);
      throw error;
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

  const addTransfer = async (transfer: Omit<Transfer, 'id' | 'createdAt' | 'userId'>) => {
    if (!currentUser) {
      console.error('❌ User not authenticated');
      throw new Error('User not authenticated');
    }

    // Optimistic update - add transfer immediately with temp ID
    const tempId = `temp-${Date.now()}`;
    const optimisticTransfer: Transfer = {
      id: tempId,
      ...transfer,
      userId: currentUser.id,
      createdAt: new Date().toISOString(),
    };

    setTransfers(prev => [optimisticTransfer, ...prev]);
    console.log('⚡ Optimistic transfer added');

    try {
      console.log('💾 Syncing transfer to Supabase...');
      
      const { data, error } = await withSupabaseRetry(() =>
        supabase
          .from('transfers')
          .insert({
            date: transfer.date,
            amount: transfer.amount,
            from_account: transfer.fromAccount,
            to_account: transfer.toAccount,
            description: transfer.description,
            user_id: currentUser.id,
          })
          .select()
          .single()
      );

      if (error) {
        console.error('❌ Error syncing transfer:', error);
        // Revert optimistic update on error
        setTransfers(prev => prev.filter(tr => tr.id !== tempId));
        throw new Error(`Supabase error: ${error.message}`);
      }

      // Replace temp transfer with real data from database
      const confirmedTransfer: Transfer = {
        id: data.id.toString(),
        date: data.date,
        amount: parseFloat(data.amount.toString()),
        fromAccount: data.from_account,
        toAccount: data.to_account,
        description: data.description,
        userId: data.user_id,
        createdAt: data.created_at,
      };

      setTransfers(prev => prev.map(tr => tr.id === tempId ? confirmedTransfer : tr));
      console.log('✅ Transfer synced successfully:', confirmedTransfer.id);
    } catch (error) {
      console.error('❌ Error adding transfer:', error);
      throw error;
    }
  };

  const updateTransfer = async (id: string, updatedTransfer: Partial<Transfer>) => {
    if (!currentUser) {
      console.error('❌ User not authenticated');
      return;
    }

    // Optimistic update - update transfer immediately
    const previousTransfers = transfers;
    setTransfers(prev => prev.map(transfer => 
      transfer.id === id ? { ...transfer, ...updatedTransfer } : transfer
    ));
    console.log('⚡ Optimistic transfer update');

    try {
      const updateData: any = {};
      if (updatedTransfer.date !== undefined) updateData.date = updatedTransfer.date;
      if (updatedTransfer.amount !== undefined) updateData.amount = updatedTransfer.amount;
      if (updatedTransfer.fromAccount !== undefined) updateData.from_account = updatedTransfer.fromAccount;
      if (updatedTransfer.toAccount !== undefined) updateData.to_account = updatedTransfer.toAccount;
      if (updatedTransfer.description !== undefined) updateData.description = updatedTransfer.description;

      const { data, error } = await withSupabaseRetry(() =>
        supabase
          .from('transfers')
          .update(updateData)
          .eq('id', id)
          .eq('user_id', currentUser.id)
          .select()
          .single()
      );

      if (error) {
        console.error('❌ Error syncing transfer update:', error);
        // Revert optimistic update on error
        setTransfers(previousTransfers);
        throw new Error(`Update failed: ${error.message}`);
      }

      // Update with confirmed data from database
      const confirmedTransfer: Transfer = {
        id: data.id,
        date: data.date,
        amount: parseFloat(data.amount.toString()),
        fromAccount: data.from_account,
        toAccount: data.to_account,
        description: data.description,
        userId: data.user_id,
        createdAt: data.created_at,
      };

      setTransfers(prev => prev.map(transfer => 
        transfer.id === id ? confirmedTransfer : transfer
      ));
      console.log('✅ Transfer update synced successfully');
    } catch (error) {
      console.error('❌ Error updating transfer:', error);
      throw error;
    }
  };

  const deleteTransfer = async (id: string) => {
    if (!currentUser) {
      console.error('❌ User not authenticated');
      return;
    }

    // Optimistic update - remove transfer immediately
    const previousTransfers = transfers;
    setTransfers(prev => prev.filter(transfer => transfer.id !== id));
    console.log('⚡ Optimistic transfer deletion');

    try {
      const { error } = await withSupabaseRetry(() =>
        supabase
          .from('transfers')
          .delete()
          .eq('id', id)
          .eq('user_id', currentUser.id)
      );

      if (error) {
        console.error('❌ Error syncing transfer deletion:', error);
        // Revert optimistic update on error
        setTransfers(previousTransfers);
        throw new Error(`Delete failed: ${error.message}`);
      }

      console.log('✅ Transfer deletion synced');
    } catch (error) {
      console.error('❌ Error deleting transfer:', error);
      throw error;
    }
  };

  const updateFilters = (section: keyof FilterState, newFilters: Partial<FilterState[keyof FilterState]>) => {
    setFilters(prev => {
      const updated = {
        ...prev,
        [section]: { ...prev[section], ...newFilters }
      };
      
      // Save to localStorage with debounce
      try {
        localStorage.setItem('finance-app-filters', JSON.stringify(updated));
        console.log('💾 Filtros salvos no localStorage');
      } catch (error) {
        console.error('❌ Erro ao salvar filtros:', error);
      }
      
      return updated;
    });
  };

  const refreshData = async () => {
    if (!currentUser) {
      console.log('⚠️ Cannot refresh data - user not authenticated');
      return;
    }
    
    console.log('🔄 Manual data refresh requested - clearing ALL locks');
    // Clear localStorage to force reload
    localStorage.removeItem('finance-data-user-id');
    localStorage.removeItem(`finance-data-lock-${currentUser.id}`);
    setIsDataLoaded(false);
    setLoadedUserId(null);
    setIsInitialLoad(true);
    setLastLoadTime(0);
    setDataLoadingDisabled(false); // Re-enable loading for manual refresh
    
    // Trigger data reload
    setIsLoading(true);
    try {
      // The useEffect will handle the actual loading
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.error('❌ Error during manual refresh:', error);
    }
  };

  // Create a data lock system to absolutely prevent reloads after successful load
  const createDataLock = () => {
    if (currentUser) {
      const lockKey = `finance-data-lock-${currentUser.id}`;
      localStorage.setItem(lockKey, Date.now().toString());
      console.log('🔒 Data lock created for user:', currentUser.email || currentUser.username);
    }
  };

  const isDataLocked = () => {
    if (!currentUser || !isDataLoaded) return false;
    const lockKey = `finance-data-lock-${currentUser.id}`;
    const lockTime = localStorage.getItem(lockKey);

    if (lockTime) {
      const timeSinceLock = Date.now() - parseInt(lockTime);
      // Lock expires after 30 minutes to allow eventual refresh
      if (timeSinceLock < 30 * 60 * 1000) {
        return true;
      } else {
        // Remove expired lock
        localStorage.removeItem(lockKey);
        console.log('🔓 Expired data lock removed');
      }
    }
    return false;
  };

  return (
    <FinanceContext.Provider
      value={{
        expenses,
        income,
        categories,
        transfers,
        filters,
        addExpense,
        addIncome,
        addCategory,
        addTransfer,
        updateExpense,
        updateIncome,
        updateCategory,
        updateTransfer,
        deleteExpense,
        deleteIncome,
        deleteCategory,
        deleteTransfer,
        updateFilters,
        refreshData,
    loadHistoricalData: () => loadHistoricalData(),
    isLoadingHistorical,
    hasAllData,
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