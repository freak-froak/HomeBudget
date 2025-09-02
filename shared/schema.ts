import { sql } from "drizzle-orm";
import { pgTable, text, varchar, decimal, timestamp, boolean, integer, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

// Users table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").notNull().unique(),
  password: text("password").notNull(),
  firstName: varchar("first_name").notNull(),
  lastName: varchar("last_name").notNull(),
  profileImageUrl: varchar("profile_image_url"),
  language: varchar("language").default("en"),
  currency: varchar("currency").default("USD"),
  timezone: varchar("timezone").default("UTC"),
  theme: varchar("theme").default("light"),
  onboardingCompleted: boolean("onboarding_completed").default(false),
  settings: jsonb("settings").$type<{
    notifications: boolean;
    aiFeatures: boolean;
    widgetCustomization: Record<string, any>;
    dashboardLayout: string[];
  }>().default({
    notifications: true,
    aiFeatures: true,
    widgetCustomization: {},
    dashboardLayout: []
  }),
  createdAt: timestamp("created_at").default(sql`now()`),
  updatedAt: timestamp("updated_at").default(sql`now()`)
});

// Categories table
export const categories = pgTable("categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name").notNull(),
  icon: varchar("icon").notNull(),
  color: varchar("color").notNull(),
  isDefault: boolean("is_default").default(false),
  type: varchar("type").$type<"expense" | "income">().notNull(),
  createdAt: timestamp("created_at").default(sql`now()`)
});

// Expenses table
export const expenses = pgTable("expenses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  type: varchar("type").$type<"expense" | "income">().notNull(),
  description: text("description").notNull(),
  categoryId: varchar("category_id").references(() => categories.id),
  date: timestamp("date").notNull(),
  location: text("location"),
  latitude: decimal("latitude", { precision: 10, scale: 8 }),
  longitude: decimal("longitude", { precision: 11, scale: 8 }),
  mood: varchar("mood"),
  rating: integer("rating"),
  receiptUrl: varchar("receipt_url"),
  lifestylePhotoUrl: varchar("lifestyle_photo_url"),
  tags: text("tags").array(),
  isFixed: boolean("is_fixed").default(false),
  satisfactionRating: integer("satisfaction_rating"),
  aiCategoryConfidence: decimal("ai_category_confidence", { precision: 3, scale: 2 }),
  createdAt: timestamp("created_at").default(sql`now()`),
  updatedAt: timestamp("updated_at").default(sql`now()`)
});

// Budgets table
export const budgets = pgTable("budgets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  name: varchar("name").notNull(),
  categoryId: varchar("category_id").references(() => categories.id),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  period: varchar("period").$type<"weekly" | "monthly" | "yearly">().notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date"),
  isActive: boolean("is_active").default(true),
  alertThreshold: decimal("alert_threshold", { precision: 3, scale: 2 }).default("0.80"),
  createdAt: timestamp("created_at").default(sql`now()`)
});

// Goals table
export const goals = pgTable("goals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  name: varchar("name").notNull(),
  targetAmount: decimal("target_amount", { precision: 10, scale: 2 }).notNull(),
  currentAmount: decimal("current_amount", { precision: 10, scale: 2 }).default("0"),
  categoryId: varchar("category_id").references(() => categories.id),
  deadline: timestamp("deadline"),
  isCompleted: boolean("is_completed").default(false),
  priority: varchar("priority").$type<"low" | "medium" | "high">().default("medium"),
  createdAt: timestamp("created_at").default(sql`now()`)
});

// Notifications table
export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  title: varchar("title").notNull(),
  message: text("message").notNull(),
  type: varchar("type").$type<"budget_alert" | "goal_milestone" | "ai_insight" | "general">().notNull(),
  isRead: boolean("is_read").default(false),
  actionUrl: varchar("action_url"),
  createdAt: timestamp("created_at").default(sql`now()`)
});

// Sessions table for authentication
export const sessions = pgTable("sessions", {
  id: varchar("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").default(sql`now()`)
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  expenses: many(expenses),
  budgets: many(budgets),
  goals: many(goals),
  categories: many(categories),
  notifications: many(notifications),
  sessions: many(sessions)
}));

export const expensesRelations = relations(expenses, ({ one }) => ({
  user: one(users, {
    fields: [expenses.userId],
    references: [users.id]
  }),
  category: one(categories, {
    fields: [expenses.categoryId],
    references: [categories.id]
  })
}));

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  user: one(users, {
    fields: [categories.userId],
    references: [users.id]
  }),
  expenses: many(expenses),
  budgets: many(budgets),
  goals: many(goals)
}));

export const budgetsRelations = relations(budgets, ({ one }) => ({
  user: one(users, {
    fields: [budgets.userId],
    references: [users.id]
  }),
  category: one(categories, {
    fields: [budgets.categoryId],
    references: [categories.id]
  })
}));

export const goalsRelations = relations(goals, ({ one }) => ({
  user: one(users, {
    fields: [goals.userId],
    references: [users.id]
  }),
  category: one(categories, {
    fields: [goals.categoryId],
    references: [categories.id]
  })
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id]
  })
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id]
  })
}));

// Zod schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertExpenseSchema = createInsertSchema(expenses).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertBudgetSchema = createInsertSchema(budgets).omit({
  id: true,
  createdAt: true
});

export const insertGoalSchema = createInsertSchema(goals).omit({
  id: true,
  createdAt: true
});

export const insertCategorySchema = createInsertSchema(categories).omit({
  id: true,
  createdAt: true
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true
});

export const insertSessionSchema = createInsertSchema(sessions).omit({
  createdAt: true
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Expense = typeof expenses.$inferSelect;
export type InsertExpense = z.infer<typeof insertExpenseSchema>;
export type Budget = typeof budgets.$inferSelect;
export type InsertBudget = z.infer<typeof insertBudgetSchema>;
export type Goal = typeof goals.$inferSelect;
export type InsertGoal = z.infer<typeof insertGoalSchema>;
export type Category = typeof categories.$inferSelect;
export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Session = typeof sessions.$inferSelect;
export type InsertSession = z.infer<typeof insertSessionSchema>;

// Additional validation schemas
export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  firstName: z.string().min(1),
  lastName: z.string().min(1)
});

export const expenseFilterSchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  categoryId: z.string().optional(),
  tags: z.array(z.string()).optional(),
  minAmount: z.number().optional(),
  maxAmount: z.number().optional(),
  search: z.string().optional(),
  type: z.enum(["expense", "income"]).optional(),
  isFixed: z.boolean().optional()
});

export type ExpenseFilter = z.infer<typeof expenseFilterSchema>;
export type LoginData = z.infer<typeof loginSchema>;
export type RegisterData = z.infer<typeof registerSchema>;
