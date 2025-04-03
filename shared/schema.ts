import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  name: text("name"),
  allergies: text("allergies").array(),
});

export const glucoseReadings = pgTable("glucose_readings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  value: integer("value").notNull(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  type: text("type").notNull(), // before_breakfast, after_breakfast, before_lunch, etc.
  note: text("note"),
});

export const mealPlans = pgTable("meal_plans", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  mealType: text("meal_type").notNull(), // breakfast, lunch, dinner, snack
  imageUrl: text("image_url"),
  carbs: integer("carbs"),
  servings: integer("servings"),
  prepTime: integer("prep_time"),
  tags: text("tags").array(),
  ingredients: text("ingredients").array(),
  instructions: text("instructions").array(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const notes = pgTable("notes", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  category: text("category"),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  email: true,
  password: true,
  name: true,
  allergies: true,
});

export const insertGlucoseReadingSchema = createInsertSchema(glucoseReadings).pick({
  userId: true,
  value: true,
  timestamp: true,
  type: true,
  note: true,
});

export const insertMealPlanSchema = createInsertSchema(mealPlans).pick({
  userId: true,
  name: true,
  description: true,
  mealType: true,
  imageUrl: true,
  carbs: true,
  servings: true,
  prepTime: true,
  tags: true,
  ingredients: true,
  instructions: true,
});

export const insertNoteSchema = createInsertSchema(notes).pick({
  userId: true,
  title: true,
  content: true,
  timestamp: true,
  category: true,
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertGlucoseReading = z.infer<typeof insertGlucoseReadingSchema>;
export type GlucoseReading = typeof glucoseReadings.$inferSelect;

export type InsertMealPlan = z.infer<typeof insertMealPlanSchema>;
export type MealPlan = typeof mealPlans.$inferSelect;

export type InsertNote = z.infer<typeof insertNoteSchema>;
export type Note = typeof notes.$inferSelect;

// Request schemas for API endpoints
export const loginSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(6),
});

export const registerSchema = insertUserSchema.extend({
  confirmPassword: z.string().min(6),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export const mealPlanRequestSchema = z.object({
  mealType: z.enum(["breakfast", "lunch", "dinner", "snack"]),
  allergies: z.array(z.string()).optional(),
});
