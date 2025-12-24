import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// NOTE: This app is offline-first. These schemas are primarily used for 
// type definition and validation on the client side, though they follow 
// the server-side Drizzle pattern for consistency.

export const tasks = pgTable("tasks", {
  id: text("id").primaryKey(), // UUID generated client-side
  title: text("title").notNull(),
  description: text("description"),
  type: text("type").notNull(), // 'fixed' | 'one-time'
  
  // Time stored as HH:mm (24h format) for simplicity in time slot calculations
  startTime: text("start_time").notNull(), 
  endTime: text("end_time").notNull(),
  
  color: text("color").default("hsl(var(--primary))"),
  
  // For fixed tasks: [0, 1, 2, 3, 4, 5, 6] where 0=Sunday
  daysOfWeek: integer("days_of_week").array(), 
  
  // For one-time tasks: YYYY-MM-DD
  date: text("date"), 
  
  createdAt: timestamp("created_at").defaultNow(),
});

// Overrides for fixed tasks (e.g., class cancelled on a specific date)
export const exceptions = pgTable("exceptions", {
  id: text("id").primaryKey(),
  taskId: text("task_id").notNull(), // Reference to tasks.id
  date: text("date").notNull(), // YYYY-MM-DD
  type: text("type").notNull(), // 'modified' | 'cancelled'
  
  // If modified, these fields override the original task
  newStartTime: text("new_start_time"),
  newEndTime: text("new_end_time"),
  newDescription: text("new_description"),
});

// Completion status for any task instance
export const completions = pgTable("completions", {
  id: text("id").primaryKey(),
  taskId: text("task_id").notNull(),
  date: text("date").notNull(), // YYYY-MM-DD
  isDone: boolean("is_done").notNull().default(false),
});

// Zod Schemas
export const insertTaskSchema = createInsertSchema(tasks);
export const insertExceptionSchema = createInsertSchema(exceptions);
export const insertCompletionSchema = createInsertSchema(completions);

// Types
export type Task = typeof tasks.$inferSelect;
export type InsertTask = z.infer<typeof insertTaskSchema>;

export type Exception = typeof exceptions.$inferSelect;
export type InsertException = z.infer<typeof insertExceptionSchema>;

export type Completion = typeof completions.$inferSelect;
export type InsertCompletion = z.infer<typeof insertCompletionSchema>;

// Report Data Types
export interface DailyReport {
  date: string;
  totalTasks: number;
  completedTasks: number;
  completionPercentage: number;
  busyMinutes: number;
  freeMinutes: number;
}
