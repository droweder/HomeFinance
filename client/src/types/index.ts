export interface Expense {
  id: string;
  date: string; // Stored in YYYY-MM-DD format
  category: string;
  description: string;
  amount: number;
  paymentMethod: string;
  location?: string;
  isInstallment?: boolean;
  installmentNumber?: number;
  totalInstallments?: number;
  installmentGroup?: string;
  // Removido dueDate - usando apenas date
  isCreditCard?: boolean;
  paid?: boolean;
  createdAt: string;
  // Propriedades para agrupamento de parcelas
  isGroupRepresentative?: boolean;
  groupedExpenses?: Expense[];
  totalGroupAmount?: number;
  groupStartDate?: string;
  groupEndDate?: string;
}

export interface Income {
  id: string;
  date: string; // Stored in YYYY-MM-DD format
  source: string;
  amount: number;
  notes?: string;
  location?: string;
  account?: string;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  type: 'income' | 'expense';
  createdAt: string;
}

export interface Account {
  id: string;
  name: string;
  initialBalance: number;
  createdAt: string;
}

export interface User {
  id: string;
  username: string;
  password: string;
  isAdmin: boolean;
  createdAt: string;
}

export interface AppSettings {
  theme: 'light' | 'dark';
  language: 'pt-BR';
  currency: 'BRL';
  geminiApiKey?: string;
  aiSettings?: {
    grokApiKey?: string;
    geminiApiKey?: string;
    preferredProvider?: 'grok' | 'gemini';
    enableAI?: boolean;
  };
}

export interface MonthlyData {
  month: string;
  totalIncome: number;
  totalExpenses: number;
  balance: number;
}

export interface DailyAccountSummary {
  date: string;
  accounts: Record<string, {
    dailyIncome: number;
    dailyExpenses: number;
    finalBalance: number;
  }>;
  totalDailyBalance: number;
}

export interface FilterState {
  expenses: {
    category: string;
    account: string;
    description?: string;
    location?: string;
    startDate: string;
    endDate: string;
    installmentGroup?: string;
    groupInstallments?: boolean;
    isCreditCard?: string; // 'all' | 'yes' | 'no'
    sortBy?: Array<{
      column: string;
      direction: 'asc' | 'desc';
    }>;
  };
  income: {
    source: string;
    account: string;
    description?: string;
    location?: string;
    startDate: string;
    endDate: string;
    groupRecurring?: boolean;
    sortBy?: Array<{
      column: string;
      direction: 'asc' | 'desc';
    }>;
  };
  dailySummary: {
    startDate: string;
    endDate: string;
    visibleAccounts: string[];
  };
  transfers: {
    fromAccount: string;
    toAccount: string;
    description?: string;
    startDate: string;
    endDate: string;
    sortBy?: Array<{
      column: string;
      direction: 'asc' | 'desc';
    }>;
  };
}

export interface Transfer {
  id: string;
  date: string;
  amount: number;
  fromAccount: string;
  toAccount: string;
  description: string;
  createdAt: string;
  userId: string;
}