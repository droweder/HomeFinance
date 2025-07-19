import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, insertExpenseSchema, insertIncomeSchema, insertCategorySchema, insertAccountSchema } from "@shared/schema";
import bcrypt from "bcryptjs";
import session from "express-session";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";

export async function registerRoutes(app: Express): Promise<Server> {
  // Session configuration
  app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key-here',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 } // 24 hours
  }));

  app.use(passport.initialize());
  app.use(passport.session());

  // Passport configuration
  passport.use(new LocalStrategy(
    { usernameField: 'email' },
    async (email, password, done) => {
      try {
        const user = await storage.getUserByEmail(email);
        if (!user) {
          return done(null, false, { message: 'User not found' });
        }

        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
          return done(null, false, { message: 'Invalid password' });
        }

        return done(null, user);
      } catch (error) {
        return done(error);
      }
    }
  ));

  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  // Authentication middleware
  const requireAuth = (req: any, res: any, next: any) => {
    if (req.isAuthenticated()) {
      return next();
    }
    res.status(401).json({ message: 'Authentication required' });
  };

  // Auth routes
  app.post('/api/auth/register', async (req, res) => {
    try {
      const { email, password } = insertUserSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: 'User already exists' });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);
      
      // Create user
      const user = await storage.createUser({ email, password: hashedPassword });
      
      // Log in the user
      req.login(user, (err: any) => {
        if (err) {
          return res.status(500).json({ message: 'Login failed after registration' });
        }
        res.json({ user: { id: user.id, email: user.email } });
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(400).json({ message: 'Registration failed' });
    }
  });

  app.post('/api/auth/login', passport.authenticate('local'), (req, res) => {
    const user = req.user as any;
    res.json({ user: { id: user.id, email: user.email } });
  });

  app.post('/api/auth/logout', (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ message: 'Logout failed' });
      }
      res.json({ message: 'Logged out successfully' });
    });
  });

  app.get('/api/auth/session', (req, res) => {
    if (req.isAuthenticated()) {
      const user = req.user as any;
      res.json({ user: { id: user.id, email: user.email } });
    } else {
      res.status(401).json({ message: 'Not authenticated' });
    }
  });

  // Expense routes
  app.get('/api/expenses', requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      const expenses = await storage.getExpenses(user.id);
      res.json(expenses);
    } catch (error) {
      console.error('Get expenses error:', error);
      res.status(500).json({ message: 'Failed to fetch expenses' });
    }
  });

  app.post('/api/expenses', requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      const expenseData = insertExpenseSchema.parse({ ...req.body, user_id: user.id });
      const expense = await storage.createExpense(expenseData);
      res.json(expense);
    } catch (error) {
      console.error('Create expense error:', error);
      res.status(400).json({ message: 'Failed to create expense' });
    }
  });

  app.put('/api/expenses/:id', requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      const { id } = req.params;
      const expenseData = req.body;
      delete expenseData.user_id; // Prevent changing user_id
      
      const expense = await storage.updateExpense(id, user.id, expenseData);
      if (!expense) {
        return res.status(404).json({ message: 'Expense not found' });
      }
      res.json(expense);
    } catch (error) {
      console.error('Update expense error:', error);
      res.status(400).json({ message: 'Failed to update expense' });
    }
  });

  app.delete('/api/expenses/:id', requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      const { id } = req.params;
      const success = await storage.deleteExpense(id, user.id);
      if (!success) {
        return res.status(404).json({ message: 'Expense not found' });
      }
      res.json({ message: 'Expense deleted successfully' });
    } catch (error) {
      console.error('Delete expense error:', error);
      res.status(500).json({ message: 'Failed to delete expense' });
    }
  });

  // Income routes
  app.get('/api/income', requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      const incomes = await storage.getIncomes(user.id);
      res.json(incomes);
    } catch (error) {
      console.error('Get income error:', error);
      res.status(500).json({ message: 'Failed to fetch income' });
    }
  });

  app.post('/api/income', requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      const incomeData = insertIncomeSchema.parse({ ...req.body, user_id: user.id });
      const income = await storage.createIncome(incomeData);
      res.json(income);
    } catch (error) {
      console.error('Create income error:', error);
      res.status(400).json({ message: 'Failed to create income' });
    }
  });

  app.put('/api/income/:id', requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      const { id } = req.params;
      const incomeData = req.body;
      delete incomeData.user_id;
      
      const income = await storage.updateIncome(id, user.id, incomeData);
      if (!income) {
        return res.status(404).json({ message: 'Income not found' });
      }
      res.json(income);
    } catch (error) {
      console.error('Update income error:', error);
      res.status(400).json({ message: 'Failed to update income' });
    }
  });

  app.delete('/api/income/:id', requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      const { id } = req.params;
      const success = await storage.deleteIncome(id, user.id);
      if (!success) {
        return res.status(404).json({ message: 'Income not found' });
      }
      res.json({ message: 'Income deleted successfully' });
    } catch (error) {
      console.error('Delete income error:', error);
      res.status(500).json({ message: 'Failed to delete income' });
    }
  });

  // Category routes
  app.get('/api/categories', requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      const categories = await storage.getCategories(user.id);
      res.json(categories);
    } catch (error) {
      console.error('Get categories error:', error);
      res.status(500).json({ message: 'Failed to fetch categories' });
    }
  });

  app.post('/api/categories', requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      const categoryData = insertCategorySchema.parse({ ...req.body, user_id: user.id });
      const category = await storage.createCategory(categoryData);
      res.json(category);
    } catch (error) {
      console.error('Create category error:', error);
      res.status(400).json({ message: 'Failed to create category' });
    }
  });

  app.put('/api/categories/:id', requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      const { id } = req.params;
      const categoryData = req.body;
      delete categoryData.user_id;
      
      const category = await storage.updateCategory(id, user.id, categoryData);
      if (!category) {
        return res.status(404).json({ message: 'Category not found' });
      }
      res.json(category);
    } catch (error) {
      console.error('Update category error:', error);
      res.status(400).json({ message: 'Failed to update category' });
    }
  });

  app.delete('/api/categories/:id', requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      const { id } = req.params;
      const success = await storage.deleteCategory(id, user.id);
      if (!success) {
        return res.status(404).json({ message: 'Category not found' });
      }
      res.json({ message: 'Category deleted successfully' });
    } catch (error) {
      console.error('Delete category error:', error);
      res.status(500).json({ message: 'Failed to delete category' });
    }
  });

  // Account routes
  app.get('/api/accounts', requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      const accounts = await storage.getAccounts(user.id);
      res.json(accounts);
    } catch (error) {
      console.error('Get accounts error:', error);
      res.status(500).json({ message: 'Failed to fetch accounts' });
    }
  });

  app.post('/api/accounts', requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      const accountData = insertAccountSchema.parse({ ...req.body, user_id: user.id });
      const account = await storage.createAccount(accountData);
      res.json(account);
    } catch (error) {
      console.error('Create account error:', error);
      res.status(400).json({ message: 'Failed to create account' });
    }
  });

  app.put('/api/accounts/:id', requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      const { id } = req.params;
      const accountData = req.body;
      delete accountData.user_id;
      
      const account = await storage.updateAccount(id, user.id, accountData);
      if (!account) {
        return res.status(404).json({ message: 'Account not found' });
      }
      res.json(account);
    } catch (error) {
      console.error('Update account error:', error);
      res.status(400).json({ message: 'Failed to update account' });
    }
  });

  app.delete('/api/accounts/:id', requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      const { id } = req.params;
      const success = await storage.deleteAccount(id, user.id);
      if (!success) {
        return res.status(404).json({ message: 'Account not found' });
      }
      res.json({ message: 'Account deleted successfully' });
    } catch (error) {
      console.error('Delete account error:', error);
      res.status(500).json({ message: 'Failed to delete account' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
