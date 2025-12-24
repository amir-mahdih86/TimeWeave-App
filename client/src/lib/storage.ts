import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Task, Exception, Completion, InsertTask, InsertException, InsertCompletion } from '@shared/schema';
import { v4 as uuidv4 } from 'uuid';

// Define the DB schema
interface TimeWeaveDB extends DBSchema {
  tasks: {
    key: string;
    value: Task;
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
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<TimeWeaveDB>>;

export function initDB() {
  if (!dbPromise) {
    dbPromise = openDB<TimeWeaveDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('tasks')) {
          db.createObjectStore('tasks', { keyPath: 'id' });
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
    color: task.color || 'hsl(262 83% 58%)'
  };
  await db.put('tasks', newTask);
  return newTask;
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
  await db.delete('tasks', id);
  // Also clean up related exceptions and completions? 
  // For now, keeping it simple. In a real app, we'd cascade delete.
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
  const db = await initDB();
  const count = await db.count('tasks');
  if (count > 0) return;

  console.log('Seeding initial data...');
  
  const today = new Date().toISOString().split('T')[0];

  await addTask({
    title: 'Morning Routine',
    type: 'fixed',
    startTime: '07:00',
    endTime: '08:00',
    daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
    color: 'hsl(36 100% 50%)',
    description: 'Meditation, exercise, and breakfast'
  });

  await addTask({
    title: 'Deep Work',
    type: 'fixed',
    startTime: '09:00',
    endTime: '11:00',
    daysOfWeek: [1, 2, 3, 4, 5], // Mon-Fri
    color: 'hsl(262 83% 58%)',
    description: 'Focus on coding and difficult tasks'
  });

  await addTask({
    title: 'Lunch Break',
    type: 'fixed',
    startTime: '12:00',
    endTime: '13:00',
    daysOfWeek: [1, 2, 3, 4, 5],
    color: 'hsl(142 76% 36%)',
    description: 'Away from keyboard'
  });

  await addTask({
    title: 'Project Review',
    type: 'one-time',
    date: today,
    startTime: '14:00',
    endTime: '15:00',
    color: 'hsl(200 98% 39%)',
    description: 'Review Q1 goals'
  });
}
