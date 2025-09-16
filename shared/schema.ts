// Simplified types for Supabase-only implementation
import { z } from "zod";

// TypeScript interfaces for Supabase data types
export interface User {
  id: string;
  email: string;
  password?: string;
  created_at?: string;
}

export interface Expense {
  id: string;
  date: string;
  category: string;
  description: string;
  amount: number;
  payment_method: string;
  location?: string;
  paid: boolean;
  is_installment: boolean;
  installment_number?: number;
  total_installments?: number;
  installment_group?: string;
  due_date?: string;
  is_credit_card: boolean;
  created_at?: string;
  user_id: string;
}

export interface Income {
  id: string;
  date: string;
  source: string;
  amount: number;
  notes?: string;
  location?: string;
  account?: string;
  is_credit_card: boolean;
  created_at?: string;
  user_id: string;
}

export interface Category {
  id: string;
  name: string;
  type: 'income' | 'expense';
  created_at?: string;
  user_id: string;
}

export interface Account {
  id: string;
  name: string;
  initial_balance: number;
  created_at?: string;
  user_id: string;
}

export interface Transfer {
  id: string;
  date: string;
  from_account: string;
  to_account: string;
  amount: number;
  description?: string;
  created_at?: string;
  user_id: string;
}

// Insert types (without id and created_at)
export type InsertUser = Omit<User, 'id' | 'created_at'>;
export type InsertExpense = Omit<Expense, 'id' | 'created_at'>;
export type InsertIncome = Omit<Income, 'id' | 'created_at'>;
export type InsertCategory = Omit<Category, 'id' | 'created_at'>;
export type InsertAccount = Omit<Account, 'id' | 'created_at'>;
export type InsertTransfer = Omit<Transfer, 'id' | 'created_at'>;

// Validation schemas
export const insertUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const insertExpenseSchema = z.object({
  date: z.string(),
  category: z.string(),
  description: z.string(),
  amount: z.number(),
  payment_method: z.string(),
  location: z.string().optional(),
  paid: z.boolean().default(false),
  is_installment: z.boolean().default(false),
  installment_number: z.number().optional(),
  total_installments: z.number().optional(),
  installment_group: z.string().optional(),
  due_date: z.string().optional(),
  is_credit_card: z.boolean().default(false),
  user_id: z.string(),
});

export const insertIncomeSchema = z.object({
  date: z.string(),
  source: z.string(),
  amount: z.number(),
  notes: z.string().default(""),
  location: z.string().optional(),
  account: z.string().optional(),
  is_credit_card: z.boolean().default(false),
  user_id: z.string(),
});

export const insertCategorySchema = z.object({
  name: z.string(),
  type: z.enum(['income', 'expense']),
  user_id: z.string(),
});

export const insertAccountSchema = z.object({
  name: z.string(),
  initial_balance: z.number().default(0),
  user_id: z.string(),
});

export const insertTransferSchema = z.object({
  date: z.string(),
  from_account: z.string(),
  to_account: z.string(),
  amount: z.number(),
  description: z.string().optional(),
  user_id: z.string(),
});

// New schema for credit_card_advances
export interface CreditCardAdvance {
  id: string;
  user_id: string;
  payment_method: string;
  amount: number;
  date: string;
  remaining_amount: number;
}

export type InsertCreditCardAdvance = Omit<CreditCardAdvance, 'id'>;

export const insertCreditCardAdvanceSchema = z.object({
  user_id: z.string(),
  payment_method: z.string(),
  amount: z.number(),
  date: z.string(),
  remaining_amount: z.number(),
});
