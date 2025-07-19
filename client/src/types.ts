// Type definitions for the financial management application

export interface User {
  id: string;
  username: string;
  password: string;
  isAdmin: boolean;
  createdAt: string;
}

export interface Expense {
  id: string;
  date: string;
  category: string;
  description: string;
  amount: number;
  paymentMethod: string;
  location?: string;
  paid: boolean;
  isInstallment: boolean;
  installmentNumber?: number;
  totalInstallments?: number;
  installmentGroup?: string;
  dueDate?: string;
  isCreditCard: boolean;
  createdAt: string;
}

export interface Income {
  id: string;
  date: string;
  source: string;
  amount: number;
  notes: string;
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

export interface FilterState {
  expenses: {
    category: string;
    account: string;
    description: string;
    location: string;
    startDate: string;
    endDate: string;
    installmentGroup: string;
    groupInstallments: boolean;
    sortBy: string[];
  };
  income: {
    source: string;
    account: string;
    description: string;
    location: string;
    startDate: string;
    endDate: string;
    groupRecurring: boolean;
    sortBy: string[];
  };
  dailySummary: {
    startDate: string;
    endDate: string;
    visibleAccounts: string[];
  };
}