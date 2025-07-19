import { pgTable, text, serial, uuid, integer, boolean, decimal, date, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  created_at: timestamp("created_at").defaultNow(),
});

export const expenses = pgTable("expenses", {
  id: uuid("id").primaryKey().defaultRandom(),
  date: date("date").notNull(),
  category: text("category").notNull(),
  description: text("description").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  payment_method: text("payment_method").notNull(),
  location: text("location"),
  paid: boolean("paid").default(false),
  is_installment: boolean("is_installment").default(false),
  installment_number: integer("installment_number"),
  total_installments: integer("total_installments"),
  installment_group: text("installment_group"),
  due_date: date("due_date"),
  is_credit_card: boolean("is_credit_card").default(false),
  created_at: timestamp("created_at").defaultNow(),
  user_id: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
});

export const income = pgTable("income", {
  id: uuid("id").primaryKey().defaultRandom(),
  date: date("date").notNull(),
  source: text("source").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  notes: text("notes").default(""),
  location: text("location"),
  account: text("account"),
  is_credit_card: boolean("is_credit_card").default(false),
  created_at: timestamp("created_at").defaultNow(),
  user_id: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
});

export const categories = pgTable("categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  type: text("type").notNull(), // 'income' or 'expense'
  created_at: timestamp("created_at").defaultNow(),
  user_id: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
});

export const accounts = pgTable("accounts", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  initial_balance: decimal("initial_balance", { precision: 10, scale: 2 }).default("0"),
  created_at: timestamp("created_at").defaultNow(),
  user_id: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  email: true,
  password: true,
});

export const insertExpenseSchema = createInsertSchema(expenses).omit({
  id: true,
  created_at: true,
});

export const insertIncomeSchema = createInsertSchema(income).omit({
  id: true,
  created_at: true,
});

export const insertCategorySchema = createInsertSchema(categories).omit({
  id: true,
  created_at: true,
});

export const insertAccountSchema = createInsertSchema(accounts).omit({
  id: true,
  created_at: true,
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertExpense = z.infer<typeof insertExpenseSchema>;
export type Expense = typeof expenses.$inferSelect;

export type InsertIncome = z.infer<typeof insertIncomeSchema>;
export type Income = typeof income.$inferSelect;

export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type Category = typeof categories.$inferSelect;

export type InsertAccount = z.infer<typeof insertAccountSchema>;
export type Account = typeof accounts.$inferSelect;
