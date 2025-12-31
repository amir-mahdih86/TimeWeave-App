import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Task, Exception, Completion, InsertTask, InsertException, InsertCompletion } from '@shared/schema';
import { v4 as uuidv4 } from 'uuid';
import { format } from 'date-fns';

// Define the DB schema
interface TimeWeaveDB extends DBSchema {
  tasks: {
    key: string;
    value: Task;
    indexes: { 'by-date': string; 'by-template': string };
  };
  exceptions: {
    key: string;
    value: Exception;
    indexes: { 'by-task': string };
  };
  completions: {
    key: string;
    value: Completion;
    indexes: { 'by-task': string; 'by-date': string };
  };
}

const DB_NAME = 'timeweave-db';
const DB_VERSION = 3; // Incremented for canceled field

let dbPromise: Promise<IDBPDatabase<TimeWeaveDB>>;

export function initDB() {
  if (!dbPromise) {
    dbPromise = openDB<TimeWeaveDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('tasks')) {
          const taskStore = db.createObjectStore('tasks', { keyPath: 'id' });
          taskStore.createIndex('by-date', 'date');
          taskStore.createIndex('by-template', 'templateId');
        }
        if (!db.objectStoreNames.contains('exceptions')) {
          const store = db.createObjectStore('exceptions', { keyPath: 'id' });
          store.createIndex('by-task', 'taskId');
        }
        if (!db.objectStoreNames.contains('completions')) {
          const store = db.createObjectStore('completions', { keyPath: 'id' });
          store.createIndex('by-task', 'taskId');
          store.createIndex('by-date', 'date');
        }
      },
    });
  }
  return dbPromise;
}

// === Tasks ===
export async function getAllTasks(): Promise<Task[]> {
  const db = await initDB();
  return db.getAll('tasks');
}

export async function addTask(task: InsertTask): Promise<Task> {
  const db = await initDB();
  const newTask: Task = {
    ...task,
    id: uuidv4(),
    createdAt: new Date(),
    description: task.description || null,
    daysOfWeek: task.daysOfWeek || null,
    date: task.date || null,
    color: task.color || 'hsl(262 83% 58%)',
    templateId: task.templateId || null,
    canceled: task.canceled || false,
  };
  await db.put('tasks', newTask);
  
  // If this is a one-time task for a specific date, materialize fixed tasks for that date
  if (task.type === 'one-time' && task.date) {
    await materializeTasksForDate(task.date, true);
  }
  
  return newTask;
}

// Materialize fixed tasks for a specific date (only for today on first open)
export async function materializeTasksForDate(date: string, forceCreate: boolean = false): Promise<Task[]> {
  const db = await initDB();
  
  // Check if tasks are already materialized for this date
  const existingTasks = await db.getAllFromIndex('tasks', 'by-date', date);
  const hasMaterializedTasks = existingTasks.some(t => t.type === 'materialized');
  
  if (hasMaterializedTasks) {
    return existingTasks;
  }
  
  // Never materialize fixed tasks for past dates
  const today = format(new Date(), 'yyyy-MM-dd');
  if (date < today) {
    return existingTasks;
  }
  
  // Only materialize if:
  // 1. forceCreate is true (user is creating a one-time task for this date)
  // 2. OR it's today and we haven't materialized yet
  const shouldMaterialize = forceCreate || date === today;
  
  if (!shouldMaterialize) {
    return existingTasks;
  }
  
  // Get all fixed task templates
  const allTasks = await db.getAll('tasks');
  const templates = allTasks.filter(t => t.type === 'fixed');
  
  // Get day of week for the date
  const dateObj = new Date(date);
  const dayOfWeek = dateObj.getDay();
  
  // Materialize tasks for this date
  const materializedTasks: Task[] = [];
  
  for (const template of templates) {
    if (template.daysOfWeek?.includes(dayOfWeek)) {
      // Check if this task was previously materialized and canceled
      const existingCanceled = existingTasks.find(
        t => t.templateId === template.id && t.canceled === true
      );
      
      // Don't materialize if it was previously canceled
      if (existingCanceled) {
        continue;
      }
      
      const materializedTask: Task = {
        id: uuidv4(),
        title: template.title,
        description: template.description,
        type: 'materialized',
        startTime: template.startTime,
        endTime: template.endTime,
        color: template.color,
        date: date,
        templateId: template.id,
        daysOfWeek: null,
        canceled: false,
        createdAt: new Date(),
      };
      
      await db.put('tasks', materializedTask);
      materializedTasks.push(materializedTask);
    }
  }
  
  return [...existingTasks, ...materializedTasks];
}

// Get tasks for a specific date (automatically materializes only for today)
export async function getTasksForDate(date: string): Promise<Task[]> {
  const db = await initDB();
  
  // Materialize tasks for this date (only happens for today on first open)
  await materializeTasksForDate(date, false);
  
  // Get materialized and one-time tasks for this date, excluding canceled ones
  const allTasksForDate = await db.getAllFromIndex('tasks', 'by-date', date);
  const materializedTasks = allTasksForDate.filter(t => !t.canceled);
  
  // For future dates, also include virtual fixed tasks (not materialized yet)
  const today = format(new Date(), 'yyyy-MM-dd');
  const isPastDate = date < today;
  
  // If it's a past date and no materialized tasks exist, don't show fixed tasks
  if (isPastDate && !materializedTasks.some(t => t.type === 'materialized')) {
    return materializedTasks.filter(t => t.type === 'one-time');
  }
  
  // For today or future dates, include virtual fixed tasks if not materialized
  const hasMaterializedTasks = materializedTasks.some(t => t.type === 'materialized');
  
  if (!hasMaterializedTasks && date >= today) {
    // Get all fixed task templates
    const allTasks = await db.getAll('tasks');
    const templates = allTasks.filter(t => t.type === 'fixed');
    
    // Get day of week for the date
    const dateObj = new Date(date);
    const dayOfWeek = dateObj.getDay();
    
    // Create virtual tasks (not saved to DB), but exclude those that were previously canceled
    const canceledTemplateIds = allTasksForDate
      .filter(t => t.canceled === true && t.templateId)
      .map(t => t.templateId);
    
    const virtualTasks: Task[] = templates
      .filter(t => t.daysOfWeek?.includes(dayOfWeek) && !canceledTemplateIds.includes(t.id))
      .map(template => ({
        ...template,
        id: `virtual-${template.id}-${date}`, // Virtual ID
        date: date,
        type: 'materialized' as const, // Display as materialized but not saved
        canceled: false,
      }));
    
    return [...materializedTasks, ...virtualTasks];
  }
  
  return materializedTasks;
}

export async function updateTask(id: string, updates: Partial<InsertTask>): Promise<Task> {
  const db = await initDB();
  const tx = db.transaction('tasks', 'readwrite');
  const store = tx.objectStore('tasks');
  const existing = await store.get(id);
  
  if (!existing) throw new Error('Task not found');
  
  const updated = { ...existing, ...updates };
  await store.put(updated);
  await tx.done;
  return updated;
}

export async function deleteTask(id: string): Promise<void> {
  const db = await initDB();
  
  // Check if this is a virtual task (not yet materialized)
  if (id.startsWith('virtual-')) {
    // Extract template ID and date from virtual ID: "virtual-{templateId}-{date}"
    // The date is always in format yyyy-MM-dd (10 characters)
    // So we can extract the last 10 characters as the date
    const withoutPrefix = id.substring(8); // Remove "virtual-" prefix
    
    if (withoutPrefix.length < 11) { // At least 1 char for templateId + 10 for date
      throw new Error('Invalid virtual task ID format');
    }
    
    // Extract date (last 10 characters) and templateId (everything before the last dash)
    const date = withoutPrefix.slice(-10); // Last 10 characters: yyyy-MM-dd
    const templateId = withoutPrefix.slice(0, -11); // Everything except last 11 chars (dash + date)
    
    console.log('Parsing virtual task:', { id, templateId, date });
    
    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new Error('Invalid date format in virtual task ID');
    }
    
    // Get the template task
    const template = await db.get('tasks', templateId);
    if (!template || template.type !== 'fixed') {
      console.error('Template not found:', templateId, 'Available tasks:', await db.getAll('tasks'));
      throw new Error('Template task not found');
    }
    
    // Materialize the task for this date and immediately mark as canceled
    const materializedTask: Task = {
      id: uuidv4(),
      title: template.title,
      description: template.description,
      type: 'materialized',
      startTime: template.startTime,
      endTime: template.endTime,
      color: template.color,
      date: date,
      templateId: template.id,
      daysOfWeek: null,
      canceled: true, // Mark as canceled immediately
      createdAt: new Date(),
    };
    
    await db.put('tasks', materializedTask);
    return;
  }
  
  // Handle regular tasks
  const task = await db.get('tasks', id);
  
  if (!task) {
    throw new Error('Task not found');
  }
  
  // For materialized tasks, mark as canceled instead of deleting
  if (task.type === 'materialized') {
    await updateTask(id, { canceled: true });
  } else {
    // For fixed and one-time tasks, actually delete
    await db.delete('tasks', id);
  }
}

// Helper function to get past dates for a specific day of week
function getPastDatesForDayOfWeek(dayOfWeek: number, beforeDate: Date): Date[] {
  const dates: Date[] = [];
  const currentDate = new Date(beforeDate);
  
  // Go back up to 90 days to find past occurrences
  for (let i = 1; i <= 90; i++) {
    const checkDate = new Date(currentDate);
    checkDate.setDate(checkDate.getDate() - i);
    
    if (checkDate.getDay() === dayOfWeek) {
      dates.push(new Date(checkDate));
    }
  }
  
  return dates;
}

// Update a fixed task template and all future materialized instances
export async function updateFixedTaskTemplate(
  id: string,
  updates: Partial<InsertTask>
): Promise<{ template: Task; updatedInstances: Task[] }> {
  const db = await initDB();
  const template = await db.get('tasks', id);
  
  if (!template || template.type !== 'fixed') {
    throw new Error('Task not found or not a fixed task template');
  }
  
  // Update the template
  const updatedTemplate = await updateTask(id, updates);
  
  // Get today's date
  const today = format(new Date(), 'yyyy-MM-dd');
  
  // Update all future materialized instances
  const allTasks = await db.getAll('tasks');
  const futureInstances = allTasks.filter(
    t => t.templateId === id && t.date && t.date >= today
  );
  
  const updatedInstances: Task[] = [];
  for (const instance of futureInstances) {
    const updated = await updateTask(instance.id, {
      title: updates.title !== undefined ? updates.title : instance.title,
      description: updates.description !== undefined ? updates.description : instance.description,
      startTime: updates.startTime !== undefined ? updates.startTime : instance.startTime,
      endTime: updates.endTime !== undefined ? updates.endTime : instance.endTime,
      color: updates.color !== undefined ? updates.color : instance.color,
    });
    updatedInstances.push(updated);
  }
  
  return { template: updatedTemplate, updatedInstances };
}

// Delete a fixed task template and all future materialized instances
export async function deleteFixedTaskTemplate(id: string): Promise<void> {
  const db = await initDB();
  const template = await db.get('tasks', id);
  
  if (!template || template.type !== 'fixed') {
    throw new Error('Task not found or not a fixed task template');
  }
  
  // Get today's date
  const today = format(new Date(), 'yyyy-MM-dd');
  
  // Delete all future materialized instances
  const allTasks = await db.getAll('tasks');
  const futureInstances = allTasks.filter(
    t => t.templateId === id && t.date && t.date >= today
  );
  
  for (const instance of futureInstances) {
    await db.delete('tasks', instance.id);
  }
  
  // Delete the template
  await db.delete('tasks', id);
}

// Special function to handle fixed task updates that preserve past instances
export async function updateFixedTaskForFuture(
  id: string, 
  updates: Partial<InsertTask>, 
  fromDate: string
): Promise<{ task: Task; updatedInstances: Task[] }> {
  // With materialization, this is the same as updateFixedTaskTemplate
  // because we only update future instances
  const result = await updateFixedTaskTemplate(id, updates);
  return { task: result.template, updatedInstances: result.updatedInstances };
}

// Special function to handle fixed task deletion that preserves past instances
export async function deleteFixedTaskForFuture(
  id: string, 
  fromDate: string
): Promise<void> {
  // With materialization, this is the same as deleteFixedTaskTemplate
  // because we only delete future instances
  return deleteFixedTaskTemplate(id);
}

// === Exceptions ===
export async function getExceptionsForTask(taskId: string): Promise<Exception[]> {
  const db = await initDB();
  return db.getAllFromIndex('exceptions', 'by-task', taskId);
}

export async function getAllExceptions(): Promise<Exception[]> {
  const db = await initDB();
  return db.getAll('exceptions');
}

export async function addException(exception: InsertException): Promise<Exception> {
  const db = await initDB();
  const newException: Exception = {
    ...exception,
    id: uuidv4(),
    newStartTime: exception.newStartTime || null,
    newEndTime: exception.newEndTime || null,
    newDescription: exception.newDescription || null,
  };
  await db.put('exceptions', newException);
  return newException;
}

// === Completions ===
export async function getCompletionsByDate(date: string): Promise<Completion[]> {
  const db = await initDB();
  return db.getAllFromIndex('completions', 'by-date', date);
}

export async function getAllCompletions(): Promise<Completion[]> {
  const db = await initDB();
  return db.getAll('completions');
}

export async function toggleCompletion(taskId: string, date: string, isDone: boolean): Promise<Completion> {
  const db = await initDB();
  const tx = db.transaction('completions', 'readwrite');
  const store = tx.objectStore('completions');
  const index = store.index('by-date');
  
  // Find existing completion for this task on this date
  let cursor = await index.openCursor(IDBKeyRange.only(date));
  let existing: Completion | undefined;
  
  while (cursor) {
    if (cursor.value.taskId === taskId) {
      existing = cursor.value;
      break;
    }
    cursor = await cursor.continue();
  }

  if (existing) {
    const updated = { ...existing, isDone };
    await store.put(updated);
    await tx.done;
    return updated;
  } else {
    const newCompletion: Completion = {
      id: uuidv4(),
      taskId,
      date,
      isDone,
    };
    await store.put(newCompletion);
    await tx.done;
    return newCompletion;
  }
}

// === Seeding ===
export async function seedInitialData() {
  // No default tasks - users start with a clean slate
  return;
}

// Get canceled tasks for a specific date
export async function getCanceledTasksForDate(date: string): Promise<Task[]> {
  const db = await initDB();
  const allTasksForDate = await db.getAllFromIndex('tasks', 'by-date', date);
  return allTasksForDate.filter(t => t.canceled === true);
}

// Restore a canceled task
export async function restoreTask(id: string): Promise<Task> {
  return updateTask(id, { canceled: false });
}
export async function getTasksForDateRange(startDate: string, endDate: string): Promise<Map<string, Task[]>> {
  const db = await initDB();
  const result = new Map<string, Task[]>();
  
  // Get all tasks from DB
  const allTasks = await db.getAll('tasks');
  
  // Group tasks by date
  const start = new Date(startDate);
  const end = new Date(endDate);
  const today = format(new Date(), 'yyyy-MM-dd');
  
  for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
    const dateStr = format(date, 'yyyy-MM-dd');
    
    // For today, make sure tasks are materialized
    if (dateStr === today) {
      await materializeTasksForDate(dateStr, false);
      // Refresh tasks after potential materialization
      const refreshedTasks = await db.getAll('tasks');
      const tasksForDate = refreshedTasks.filter(t => t.date === dateStr && !t.canceled);
      result.set(dateStr, tasksForDate);
    } else {
      // Get materialized and one-time tasks for this date, excluding canceled ones
      const tasksForDate = allTasks.filter(t => t.date === dateStr && !t.canceled);
      result.set(dateStr, tasksForDate);
    }
  }
  
  return result;
}