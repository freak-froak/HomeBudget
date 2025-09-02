import { 
  users, expenses, budgets, goals, categories, notifications, sessions,
  type User, type InsertUser, type Expense, type InsertExpense, 
  type Budget, type InsertBudget, type Goal, type InsertGoal,
  type Category, type InsertCategory, type Notification, type InsertNotification,
  type Session, type InsertSession, type ExpenseFilter
} from "@shared/schema";
import { db } from "./db";
import { eq, and, gte, lte, desc, asc, ilike, inArray, sql, between } from "drizzle-orm";
import bcrypt from "bcryptjs";

export interface IStorage {
  // User management
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User | undefined>;
  deleteUser(id: string): Promise<void>;

  // Authentication
  createSession(session: InsertSession): Promise<Session>;
  getSession(id: string): Promise<Session | undefined>;
  deleteSession(id: string): Promise<void>;
  cleanupExpiredSessions(): Promise<void>;

  // Categories
  getCategories(userId: string): Promise<Category[]>;
  createCategory(category: InsertCategory): Promise<Category>;
  updateCategory(id: string, updates: Partial<Category>): Promise<Category | undefined>;
  deleteCategory(id: string): Promise<void>;
  getDefaultCategories(): Promise<Category[]>;

  // Expenses
  getExpenses(userId: string, filters?: ExpenseFilter): Promise<Expense[]>;
  getExpense(id: string, userId: string): Promise<Expense | undefined>;
  createExpense(expense: InsertExpense): Promise<Expense>;
  updateExpense(id: string, updates: Partial<Expense>): Promise<Expense | undefined>;
  deleteExpense(id: string, userId: string): Promise<void>;
  getExpensesByDateRange(userId: string, startDate: Date, endDate: Date): Promise<Expense[]>;

  // Budgets
  getBudgets(userId: string): Promise<Budget[]>;
  createBudget(budget: InsertBudget): Promise<Budget>;
  updateBudget(id: string, updates: Partial<Budget>): Promise<Budget | undefined>;
  deleteBudget(id: string, userId: string): Promise<void>;

  // Goals
  getGoals(userId: string): Promise<Goal[]>;
  createGoal(goal: InsertGoal): Promise<Goal>;
  updateGoal(id: string, updates: Partial<Goal>): Promise<Goal | undefined>;
  deleteGoal(id: string, userId: string): Promise<void>;

  // Notifications
  getNotifications(userId: string): Promise<Notification[]>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  markNotificationAsRead(id: string, userId: string): Promise<void>;
  deleteNotification(id: string, userId: string): Promise<void>;

  // Analytics
  getDashboardStats(userId: string): Promise<{
    totalBalance: number;
    thisMonthExpenses: number;
    thisMonthIncome: number;
    expenseChange: number;
    incomeChange: number;
    savingsRate: number;
  }>;
  getCategoryBreakdown(userId: string, period?: string): Promise<{
    category: string;
    amount: number;
    percentage: number;
    color: string;
    transactionCount: number;
  }[]>;
  getSpendingTrends(userId: string, months: number): Promise<{
    month: string;
    totalExpenses: number;
    totalIncome: number;
    netSavings: number;
  }[]>;
}

export class DatabaseStorage implements IStorage {
  // User management
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(userData: InsertUser): Promise<User> {
    const hashedPassword = await bcrypt.hash(userData.password, 10);
    const [user] = await db
      .insert(users)
      .values({
        ...userData,
        password: hashedPassword
      })
      .returning();
    return user;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ ...updates, updatedAt: sql`now()` })
      .where(eq(users.id, id))
      .returning();
    return user || undefined;
  }

  async deleteUser(id: string): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  // Authentication
  async createSession(sessionData: InsertSession): Promise<Session> {
    const [session] = await db
      .insert(sessions)
      .values(sessionData)
      .returning();
    return session;
  }

  async getSession(id: string): Promise<Session | undefined> {
    const [session] = await db
      .select()
      .from(sessions)
      .where(and(eq(sessions.id, id), gte(sessions.expiresAt, sql`now()`)));
    return session || undefined;
  }

  async deleteSession(id: string): Promise<void> {
    await db.delete(sessions).where(eq(sessions.id, id));
  }

  async cleanupExpiredSessions(): Promise<void> {
    await db.delete(sessions).where(lte(sessions.expiresAt, sql`now()`));
  }

  // Categories
  async getCategories(userId: string): Promise<Category[]> {
    return await db
      .select()
      .from(categories)
      .where(eq(categories.userId, userId))
      .orderBy(asc(categories.name));
  }

  async createCategory(categoryData: InsertCategory): Promise<Category> {
    const [category] = await db
      .insert(categories)
      .values(categoryData)
      .returning();
    return category;
  }

  async updateCategory(id: string, updates: Partial<Category>): Promise<Category | undefined> {
    const [category] = await db
      .update(categories)
      .set(updates)
      .where(eq(categories.id, id))
      .returning();
    return category || undefined;
  }

  async deleteCategory(id: string): Promise<void> {
    await db.delete(categories).where(eq(categories.id, id));
  }

  async getDefaultCategories(): Promise<Category[]> {
    return await db
      .select()
      .from(categories)
      .where(eq(categories.isDefault, true));
  }

  // Expenses
  async getExpenses(userId: string, filters?: ExpenseFilter): Promise<Expense[]> {
    let query = db.select().from(expenses).where(eq(expenses.userId, userId));

    if (filters) {
      const conditions = [eq(expenses.userId, userId)];

      if (filters.startDate) {
        conditions.push(gte(expenses.date, new Date(filters.startDate)));
      }
      if (filters.endDate) {
        conditions.push(lte(expenses.date, new Date(filters.endDate)));
      }
      if (filters.categoryId) {
        conditions.push(eq(expenses.categoryId, filters.categoryId));
      }
      if (filters.type) {
        conditions.push(eq(expenses.type, filters.type));
      }
      if (filters.isFixed !== undefined) {
        conditions.push(eq(expenses.isFixed, filters.isFixed));
      }
      if (filters.search) {
        conditions.push(ilike(expenses.description, `%${filters.search}%`));
      }
      if (filters.minAmount !== undefined) {
        conditions.push(gte(expenses.amount, filters.minAmount.toString()));
      }
      if (filters.maxAmount !== undefined) {
        conditions.push(lte(expenses.amount, filters.maxAmount.toString()));
      }

      query = db.select().from(expenses).where(and(...conditions));
    }

    return await query.orderBy(desc(expenses.date));
  }

  async getExpense(id: string, userId: string): Promise<Expense | undefined> {
    const [expense] = await db
      .select()
      .from(expenses)
      .where(and(eq(expenses.id, id), eq(expenses.userId, userId)));
    return expense || undefined;
  }

  async createExpense(expenseData: InsertExpense): Promise<Expense> {
    const [expense] = await db
      .insert(expenses)
      .values(expenseData)
      .returning();
    return expense;
  }

  async updateExpense(id: string, updates: Partial<Expense>): Promise<Expense | undefined> {
    const [expense] = await db
      .update(expenses)
      .set({ ...updates, updatedAt: sql`now()` })
      .where(eq(expenses.id, id))
      .returning();
    return expense || undefined;
  }

  async deleteExpense(id: string, userId: string): Promise<void> {
    await db
      .delete(expenses)
      .where(and(eq(expenses.id, id), eq(expenses.userId, userId)));
  }

  async getExpensesByDateRange(userId: string, startDate: Date, endDate: Date): Promise<Expense[]> {
    return await db
      .select()
      .from(expenses)
      .where(
        and(
          eq(expenses.userId, userId),
          between(expenses.date, startDate, endDate)
        )
      )
      .orderBy(desc(expenses.date));
  }

  // Budgets
  async getBudgets(userId: string): Promise<Budget[]> {
    return await db
      .select()
      .from(budgets)
      .where(eq(budgets.userId, userId))
      .orderBy(desc(budgets.createdAt));
  }

  async createBudget(budgetData: InsertBudget): Promise<Budget> {
    const [budget] = await db
      .insert(budgets)
      .values(budgetData)
      .returning();
    return budget;
  }

  async updateBudget(id: string, updates: Partial<Budget>): Promise<Budget | undefined> {
    const [budget] = await db
      .update(budgets)
      .set(updates)
      .where(eq(budgets.id, id))
      .returning();
    return budget || undefined;
  }

  async deleteBudget(id: string, userId: string): Promise<void> {
    await db
      .delete(budgets)
      .where(and(eq(budgets.id, id), eq(budgets.userId, userId)));
  }

  // Goals
  async getGoals(userId: string): Promise<Goal[]> {
    return await db
      .select()
      .from(goals)
      .where(eq(goals.userId, userId))
      .orderBy(desc(goals.createdAt));
  }

  async createGoal(goalData: InsertGoal): Promise<Goal> {
    const [goal] = await db
      .insert(goals)
      .values(goalData)
      .returning();
    return goal;
  }

  async updateGoal(id: string, updates: Partial<Goal>): Promise<Goal | undefined> {
    const [goal] = await db
      .update(goals)
      .set(updates)
      .where(eq(goals.id, id))
      .returning();
    return goal || undefined;
  }

  async deleteGoal(id: string, userId: string): Promise<void> {
    await db
      .delete(goals)
      .where(and(eq(goals.id, id), eq(goals.userId, userId)));
  }

  // Notifications
  async getNotifications(userId: string): Promise<Notification[]> {
    return await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt));
  }

  async createNotification(notificationData: InsertNotification): Promise<Notification> {
    const [notification] = await db
      .insert(notifications)
      .values(notificationData)
      .returning();
    return notification;
  }

  async markNotificationAsRead(id: string, userId: string): Promise<void> {
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(and(eq(notifications.id, id), eq(notifications.userId, userId)));
  }

  async deleteNotification(id: string, userId: string): Promise<void> {
    await db
      .delete(notifications)
      .where(and(eq(notifications.id, id), eq(notifications.userId, userId)));
  }

  // Analytics
  async getDashboardStats(userId: string) {
    const now = new Date();
    const firstDayThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    // Get this month's data
    const thisMonthExpenses = await db
      .select({ total: sql<number>`COALESCE(SUM(${expenses.amount}), 0)` })
      .from(expenses)
      .where(
        and(
          eq(expenses.userId, userId),
          eq(expenses.type, "expense"),
          gte(expenses.date, firstDayThisMonth)
        )
      );

    const thisMonthIncome = await db
      .select({ total: sql<number>`COALESCE(SUM(${expenses.amount}), 0)` })
      .from(expenses)
      .where(
        and(
          eq(expenses.userId, userId),
          eq(expenses.type, "income"),
          gte(expenses.date, firstDayThisMonth)
        )
      );

    // Get last month's data for comparison
    const lastMonthExpenses = await db
      .select({ total: sql<number>`COALESCE(SUM(${expenses.amount}), 0)` })
      .from(expenses)
      .where(
        and(
          eq(expenses.userId, userId),
          eq(expenses.type, "expense"),
          between(expenses.date, firstDayLastMonth, lastDayLastMonth)
        )
      );

    const lastMonthIncome = await db
      .select({ total: sql<number>`COALESCE(SUM(${expenses.amount}), 0)` })
      .from(expenses)
      .where(
        and(
          eq(expenses.userId, userId),
          eq(expenses.type, "income"),
          between(expenses.date, firstDayLastMonth, lastDayLastMonth)
        )
      );

    const thisMonthExp = Number(thisMonthExpenses[0]?.total || 0);
    const thisMonthInc = Number(thisMonthIncome[0]?.total || 0);
    const lastMonthExp = Number(lastMonthExpenses[0]?.total || 0);
    const lastMonthInc = Number(lastMonthIncome[0]?.total || 0);

    const totalBalance = thisMonthInc - thisMonthExp;
    const expenseChange = lastMonthExp > 0 ? ((thisMonthExp - lastMonthExp) / lastMonthExp) * 100 : 0;
    const incomeChange = lastMonthInc > 0 ? ((thisMonthInc - lastMonthInc) / lastMonthInc) * 100 : 0;
    const savingsRate = thisMonthInc > 0 ? ((thisMonthInc - thisMonthExp) / thisMonthInc) * 100 : 0;

    return {
      totalBalance,
      thisMonthExpenses: thisMonthExp,
      thisMonthIncome: thisMonthInc,
      expenseChange,
      incomeChange,
      savingsRate
    };
  }

  async getCategoryBreakdown(userId: string, period = "thisMonth") {
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case "thisMonth":
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case "lastMonth":
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        break;
      case "thisYear":
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    const breakdown = await db
      .select({
        categoryId: expenses.categoryId,
        categoryName: categories.name,
        categoryColor: categories.color,
        total: sql<number>`SUM(${expenses.amount})`,
        count: sql<number>`COUNT(*)`
      })
      .from(expenses)
      .leftJoin(categories, eq(expenses.categoryId, categories.id))
      .where(
        and(
          eq(expenses.userId, userId),
          eq(expenses.type, "expense"),
          gte(expenses.date, startDate)
        )
      )
      .groupBy(expenses.categoryId, categories.name, categories.color);

    const totalExpenses = breakdown.reduce((sum, item) => sum + Number(item.total), 0);

    return breakdown.map(item => ({
      category: item.categoryName || "Uncategorized",
      amount: Number(item.total),
      percentage: totalExpenses > 0 ? (Number(item.total) / totalExpenses) * 100 : 0,
      color: item.categoryColor || "#6B7280",
      transactionCount: Number(item.count)
    }));
  }

  async getSpendingTrends(userId: string, months: number = 6) {
    const trends = await db
      .select({
        month: sql<string>`TO_CHAR(${expenses.date}, 'YYYY-MM')`,
        totalExpenses: sql<number>`SUM(CASE WHEN ${expenses.type} = 'expense' THEN ${expenses.amount} ELSE 0 END)`,
        totalIncome: sql<number>`SUM(CASE WHEN ${expenses.type} = 'income' THEN ${expenses.amount} ELSE 0 END)`
      })
      .from(expenses)
      .where(
        and(
          eq(expenses.userId, userId),
          gte(expenses.date, sql`NOW() - INTERVAL '${months} months'`)
        )
      )
      .groupBy(sql`TO_CHAR(${expenses.date}, 'YYYY-MM')`)
      .orderBy(sql`TO_CHAR(${expenses.date}, 'YYYY-MM')`);

    return trends.map(trend => ({
      month: trend.month,
      totalExpenses: Number(trend.totalExpenses),
      totalIncome: Number(trend.totalIncome),
      netSavings: Number(trend.totalIncome) - Number(trend.totalExpenses)
    }));
  }
}

export const storage = new DatabaseStorage();
