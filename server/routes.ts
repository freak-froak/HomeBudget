import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { aiService } from "./services/aiService";
import { currencyService } from "./services/currencyService";
import { requireAuth, optionalAuth, createSession, verifyPassword } from "./middleware/auth";
import { 
  loginSchema, registerSchema, insertExpenseSchema, insertBudgetSchema, 
  insertGoalSchema, insertCategorySchema, expenseFilterSchema 
} from "@shared/schema";
import multer from "multer";
import path from "path";
import { randomUUID } from "crypto";

// File upload configuration
const storage_multer = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueName = `${randomUUID()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({ 
  storage: storage_multer,
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Cleanup expired sessions periodically
  setInterval(() => {
    storage.cleanupExpiredSessions().catch(console.error);
  }, 60 * 60 * 1000); // Every hour

  // Auth routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      const userData = registerSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(userData.email);
      if (existingUser) {
        return res.status(400).json({ error: "User already exists" });
      }

      const user = await storage.createUser(userData);
      const sessionId = await createSession(user.id);

      res.cookie("sessionId", sessionId, { 
        httpOnly: true, 
        secure: process.env.NODE_ENV === "production",
        maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
      });

      res.json({ user: { 
        id: user.id, 
        email: user.email, 
        firstName: user.firstName, 
        lastName: user.lastName,
        onboardingCompleted: user.onboardingCompleted
      } });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(400).json({ error: "Registration failed" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = loginSchema.parse(req.body);
      
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const isValidPassword = await verifyPassword(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const sessionId = await createSession(user.id);

      res.cookie("sessionId", sessionId, { 
        httpOnly: true, 
        secure: process.env.NODE_ENV === "production",
        maxAge: 30 * 24 * 60 * 60 * 1000
      });

      res.json({ user: { 
        id: user.id, 
        email: user.email, 
        firstName: user.firstName, 
        lastName: user.lastName,
        onboardingCompleted: user.onboardingCompleted
      } });
    } catch (error) {
      console.error("Login error:", error);
      res.status(401).json({ error: "Login failed" });
    }
  });

  app.post("/api/auth/logout", requireAuth, async (req, res) => {
    try {
      const sessionId = req.cookies?.sessionId;
      if (sessionId) {
        await storage.deleteSession(sessionId);
      }
      res.clearCookie("sessionId");
      res.json({ success: true });
    } catch (error) {
      console.error("Logout error:", error);
      res.status(500).json({ error: "Logout failed" });
    }
  });

  app.get("/api/auth/user", optionalAuth, async (req, res) => {
    if (req.user) {
      const fullUser = await storage.getUser(req.user.id);
      res.json({ 
        user: { 
          id: fullUser!.id, 
          email: fullUser!.email, 
          firstName: fullUser!.firstName, 
          lastName: fullUser!.lastName,
          onboardingCompleted: fullUser!.onboardingCompleted,
          settings: fullUser!.settings,
          currency: fullUser!.currency,
          language: fullUser!.language,
          theme: fullUser!.theme
        } 
      });
    } else {
      res.json({ user: null });
    }
  });

  app.patch("/api/auth/user", requireAuth, async (req, res) => {
    try {
      const updates = req.body;
      const user = await storage.updateUser(req.user.id, updates);
      res.json({ user });
    } catch (error) {
      console.error("User update error:", error);
      res.status(500).json({ error: "Failed to update user" });
    }
  });

  // Categories routes
  app.get("/api/categories", requireAuth, async (req, res) => {
    try {
      const categories = await storage.getCategories(req.user.id);
      res.json(categories);
    } catch (error) {
      console.error("Get categories error:", error);
      res.status(500).json({ error: "Failed to get categories" });
    }
  });

  app.post("/api/categories", requireAuth, async (req, res) => {
    try {
      const categoryData = insertCategorySchema.parse({
        ...req.body,
        userId: req.user.id
      });
      const category = await storage.createCategory(categoryData);
      res.json(category);
    } catch (error) {
      console.error("Create category error:", error);
      res.status(500).json({ error: "Failed to create category" });
    }
  });

  app.patch("/api/categories/:id", requireAuth, async (req, res) => {
    try {
      const category = await storage.updateCategory(req.params.id, req.body);
      res.json(category);
    } catch (error) {
      console.error("Update category error:", error);
      res.status(500).json({ error: "Failed to update category" });
    }
  });

  app.delete("/api/categories/:id", requireAuth, async (req, res) => {
    try {
      await storage.deleteCategory(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete category error:", error);
      res.status(500).json({ error: "Failed to delete category" });
    }
  });

  // Expenses routes
  app.get("/api/expenses", requireAuth, async (req, res) => {
    try {
      const filters = expenseFilterSchema.parse(req.query);
      const expenses = await storage.getExpenses(req.user.id, filters);
      res.json(expenses);
    } catch (error) {
      console.error("Get expenses error:", error);
      res.status(500).json({ error: "Failed to get expenses" });
    }
  });

  app.post("/api/expenses", requireAuth, upload.fields([
    { name: 'receipt', maxCount: 1 },
    { name: 'lifestylePhoto', maxCount: 1 }
  ]), async (req, res) => {
    try {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      const receiptUrl = files?.receipt?.[0]?.filename;
      const lifestylePhotoUrl = files?.lifestylePhoto?.[0]?.filename;

      const expenseData = insertExpenseSchema.parse({
        ...req.body,
        userId: req.user.id,
        amount: parseFloat(req.body.amount),
        date: new Date(req.body.date),
        receiptUrl,
        lifestylePhotoUrl,
        tags: req.body.tags ? JSON.parse(req.body.tags) : []
      });

      const expense = await storage.createExpense(expenseData);
      res.json(expense);
    } catch (error) {
      console.error("Create expense error:", error);
      res.status(500).json({ error: "Failed to create expense" });
    }
  });

  app.get("/api/expenses/:id", requireAuth, async (req, res) => {
    try {
      const expense = await storage.getExpense(req.params.id, req.user.id);
      if (!expense) {
        return res.status(404).json({ error: "Expense not found" });
      }
      res.json(expense);
    } catch (error) {
      console.error("Get expense error:", error);
      res.status(500).json({ error: "Failed to get expense" });
    }
  });

  app.patch("/api/expenses/:id", requireAuth, async (req, res) => {
    try {
      const expense = await storage.updateExpense(req.params.id, req.body);
      res.json(expense);
    } catch (error) {
      console.error("Update expense error:", error);
      res.status(500).json({ error: "Failed to update expense" });
    }
  });

  app.delete("/api/expenses/:id", requireAuth, async (req, res) => {
    try {
      await storage.deleteExpense(req.params.id, req.user.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete expense error:", error);
      res.status(500).json({ error: "Failed to delete expense" });
    }
  });

  // Budgets routes
  app.get("/api/budgets", requireAuth, async (req, res) => {
    try {
      const budgets = await storage.getBudgets(req.user.id);
      res.json(budgets);
    } catch (error) {
      console.error("Get budgets error:", error);
      res.status(500).json({ error: "Failed to get budgets" });
    }
  });

  app.post("/api/budgets", requireAuth, async (req, res) => {
    try {
      const budgetData = insertBudgetSchema.parse({
        ...req.body,
        userId: req.user.id
      });
      const budget = await storage.createBudget(budgetData);
      res.json(budget);
    } catch (error) {
      console.error("Create budget error:", error);
      res.status(500).json({ error: "Failed to create budget" });
    }
  });

  // Goals routes
  app.get("/api/goals", requireAuth, async (req, res) => {
    try {
      const goals = await storage.getGoals(req.user.id);
      res.json(goals);
    } catch (error) {
      console.error("Get goals error:", error);
      res.status(500).json({ error: "Failed to get goals" });
    }
  });

  app.post("/api/goals", requireAuth, async (req, res) => {
    try {
      const goalData = insertGoalSchema.parse({
        ...req.body,
        userId: req.user.id
      });
      const goal = await storage.createGoal(goalData);
      res.json(goal);
    } catch (error) {
      console.error("Create goal error:", error);
      res.status(500).json({ error: "Failed to create goal" });
    }
  });

  // Dashboard analytics routes
  app.get("/api/dashboard/stats", requireAuth, async (req, res) => {
    try {
      const stats = await storage.getDashboardStats(req.user.id);
      res.json(stats);
    } catch (error) {
      console.error("Dashboard stats error:", error);
      res.status(500).json({ error: "Failed to get dashboard stats" });
    }
  });

  app.get("/api/dashboard/category-breakdown", requireAuth, async (req, res) => {
    try {
      const period = req.query.period as string || "thisMonth";
      const breakdown = await storage.getCategoryBreakdown(req.user.id, period);
      res.json(breakdown);
    } catch (error) {
      console.error("Category breakdown error:", error);
      res.status(500).json({ error: "Failed to get category breakdown" });
    }
  });

  app.get("/api/dashboard/spending-trends", requireAuth, async (req, res) => {
    try {
      const months = parseInt(req.query.months as string) || 6;
      const trends = await storage.getSpendingTrends(req.user.id, months);
      res.json(trends);
    } catch (error) {
      console.error("Spending trends error:", error);
      res.status(500).json({ error: "Failed to get spending trends" });
    }
  });

  // AI routes
  app.post("/api/ai/analyze-expense", requireAuth, async (req, res) => {
    try {
      const { description, amount, location } = req.body;
      const analysis = await aiService.analyzeExpense(description, amount, location);
      res.json(analysis);
    } catch (error) {
      console.error("AI expense analysis error:", error);
      res.status(500).json({ error: "Failed to analyze expense" });
    }
  });

  app.post("/api/ai/financial-advice", requireAuth, async (req, res) => {
    try {
      const { question } = req.body;
      const expenses = await storage.getExpenses(req.user.id);
      const expensesSummary = expenses.slice(0, 50).map(e => 
        `${e.type}: $${e.amount} - ${e.description} (${e.categoryId || 'uncategorized'})`
      ).join("; ");
      
      const advice = await aiService.getFinancialAdvice(expensesSummary, question);
      res.json(advice);
    } catch (error) {
      console.error("AI financial advice error:", error);
      res.status(500).json({ error: "Failed to get financial advice" });
    }
  });

  app.get("/api/ai/spending-insights", requireAuth, async (req, res) => {
    try {
      const expenses = await storage.getExpenses(req.user.id);
      const expensesSummary = expenses.slice(0, 100).map(e => 
        `${e.type}: $${e.amount} - ${e.description} (${e.categoryId || 'uncategorized'})`
      ).join("; ");
      
      const insights = await aiService.generateSpendingInsights(expensesSummary);
      res.json(insights);
    } catch (error) {
      console.error("AI spending insights error:", error);
      res.status(500).json({ error: "Failed to get spending insights" });
    }
  });

  // Currency routes
  app.get("/api/currencies", (req, res) => {
    try {
      const currencies = currencyService.getSupportedCurrencies();
      res.json(currencies);
    } catch (error) {
      console.error("Get currencies error:", error);
      res.status(500).json({ error: "Failed to get currencies" });
    }
  });

  app.post("/api/currencies/convert", async (req, res) => {
    try {
      const { amount, fromCurrency, toCurrency } = req.body;
      const result = await currencyService.convert(amount, fromCurrency, toCurrency);
      res.json(result);
    } catch (error) {
      console.error("Currency conversion error:", error);
      res.status(500).json({ error: "Failed to convert currency" });
    }
  });

  // File upload routes
  app.post("/api/upload", requireAuth, upload.single('file'), (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }
      res.json({ filename: req.file.filename, url: `/uploads/${req.file.filename}` });
    } catch (error) {
      console.error("File upload error:", error);
      res.status(500).json({ error: "Failed to upload file" });
    }
  });

  // Serve uploaded files
  app.use("/uploads", express.static("uploads"));

  // Notifications routes
  app.get("/api/notifications", requireAuth, async (req, res) => {
    try {
      const notifications = await storage.getNotifications(req.user.id);
      res.json(notifications);
    } catch (error) {
      console.error("Get notifications error:", error);
      res.status(500).json({ error: "Failed to get notifications" });
    }
  });

  app.patch("/api/notifications/:id/read", requireAuth, async (req, res) => {
    try {
      await storage.markNotificationAsRead(req.params.id, req.user.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Mark notification read error:", error);
      res.status(500).json({ error: "Failed to mark notification as read" });
    }
  });

  // Data management routes
  app.delete("/api/user/data", requireAuth, async (req, res) => {
    try {
      await storage.deleteUser(req.user.id);
      res.clearCookie("sessionId");
      res.json({ success: true });
    } catch (error) {
      console.error("Delete user data error:", error);
      res.status(500).json({ error: "Failed to delete user data" });
    }
  });

  app.get("/api/user/export", requireAuth, async (req, res) => {
    try {
      const [expenses, budgets, goals, categories] = await Promise.all([
        storage.getExpenses(req.user.id),
        storage.getBudgets(req.user.id),
        storage.getGoals(req.user.id),
        storage.getCategories(req.user.id)
      ]);

      const exportData = {
        user: req.user,
        expenses,
        budgets,
        goals,
        categories,
        exportDate: new Date().toISOString()
      };

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename="expense-journal-export.json"');
      res.json(exportData);
    } catch (error) {
      console.error("Export data error:", error);
      res.status(500).json({ error: "Failed to export data" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
