import { 
  users, expenses, income, categories, accounts,
  type User, type InsertUser,
  type Expense, type InsertExpense,
  type Income, type InsertIncome,
  type Category, type InsertCategory,
  type Account, type InsertAccount
} from "@shared/schema";
import { drizzle } from "drizzle-orm/neon-http";
import { eq, and } from "drizzle-orm";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Expense methods
  getExpenses(userId: string): Promise<Expense[]>;
  createExpense(expense: InsertExpense): Promise<Expense>;
  updateExpense(id: string, userId: string, expense: Partial<InsertExpense>): Promise<Expense | undefined>;
  deleteExpense(id: string, userId: string): Promise<boolean>;

  // Income methods
  getIncomes(userId: string): Promise<Income[]>;
  createIncome(income: InsertIncome): Promise<Income>;
  updateIncome(id: string, userId: string, income: Partial<InsertIncome>): Promise<Income | undefined>;
  deleteIncome(id: string, userId: string): Promise<boolean>;

  // Category methods
  getCategories(userId: string): Promise<Category[]>;
  createCategory(category: InsertCategory): Promise<Category>;
  updateCategory(id: string, userId: string, category: Partial<InsertCategory>): Promise<Category | undefined>;
  deleteCategory(id: string, userId: string): Promise<boolean>;

  // Account methods
  getAccounts(userId: string): Promise<Account[]>;
  createAccount(account: InsertAccount): Promise<Account>;
  updateAccount(id: string, userId: string, account: Partial<InsertAccount>): Promise<Account | undefined>;
  deleteAccount(id: string, userId: string): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  // User methods
  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
    return result[0];
  }

  async createUser(user: InsertUser): Promise<User> {
    const result = await db.insert(users).values(user).returning();
    return result[0];
  }

  // Expense methods
  async getExpenses(userId: string): Promise<Expense[]> {
    return await db.select().from(expenses).where(eq(expenses.user_id, userId));
  }

  async createExpense(expense: InsertExpense): Promise<Expense> {
    const result = await db.insert(expenses).values(expense).returning();
    return result[0];
  }

  async updateExpense(id: string, userId: string, expense: Partial<InsertExpense>): Promise<Expense | undefined> {
    const result = await db.update(expenses)
      .set(expense)
      .where(and(eq(expenses.id, id), eq(expenses.user_id, userId)))
      .returning();
    return result[0];
  }

  async deleteExpense(id: string, userId: string): Promise<boolean> {
    const result = await db.delete(expenses)
      .where(and(eq(expenses.id, id), eq(expenses.user_id, userId)));
    return result.rowCount > 0;
  }

  // Income methods
  async getIncomes(userId: string): Promise<Income[]> {
    return await db.select().from(income).where(eq(income.user_id, userId));
  }

  async createIncome(incomeData: InsertIncome): Promise<Income> {
    const result = await db.insert(income).values(incomeData).returning();
    return result[0];
  }

  async updateIncome(id: string, userId: string, incomeData: Partial<InsertIncome>): Promise<Income | undefined> {
    const result = await db.update(income)
      .set(incomeData)
      .where(and(eq(income.id, id), eq(income.user_id, userId)))
      .returning();
    return result[0];
  }

  async deleteIncome(id: string, userId: string): Promise<boolean> {
    const result = await db.delete(income)
      .where(and(eq(income.id, id), eq(income.user_id, userId)));
    return result.rowCount > 0;
  }

  // Category methods
  async getCategories(userId: string): Promise<Category[]> {
    return await db.select().from(categories).where(eq(categories.user_id, userId));
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    const result = await db.insert(categories).values(category).returning();
    return result[0];
  }

  async updateCategory(id: string, userId: string, category: Partial<InsertCategory>): Promise<Category | undefined> {
    const result = await db.update(categories)
      .set(category)
      .where(and(eq(categories.id, id), eq(categories.user_id, userId)))
      .returning();
    return result[0];
  }

  async deleteCategory(id: string, userId: string): Promise<boolean> {
    const result = await db.delete(categories)
      .where(and(eq(categories.id, id), eq(categories.user_id, userId)));
    return result.rowCount > 0;
  }

  // Account methods
  async getAccounts(userId: string): Promise<Account[]> {
    return await db.select().from(accounts).where(eq(accounts.user_id, userId));
  }

  async createAccount(account: InsertAccount): Promise<Account> {
    const result = await db.insert(accounts).values(account).returning();
    return result[0];
  }

  async updateAccount(id: string, userId: string, account: Partial<InsertAccount>): Promise<Account | undefined> {
    const result = await db.update(accounts)
      .set(account)
      .where(and(eq(accounts.id, id), eq(accounts.user_id, userId)))
      .returning();
    return result[0];
  }

  async deleteAccount(id: string, userId: string): Promise<boolean> {
    const result = await db.delete(accounts)
      .where(and(eq(accounts.id, id), eq(accounts.user_id, userId)));
    return result.rowCount > 0;
  }
}

export const storage = new DatabaseStorage();
