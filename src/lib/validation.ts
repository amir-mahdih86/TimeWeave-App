import { Task } from "@/lib/schema";
import { todayLocalISO } from "@/lib/utils";

export interface TimeSlot {
  startTime: string;
  endTime: string;
}

export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

export function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

export function isTaskCurrentlyActive(task: { startTime: string; endTime: string; date?: string | null }): boolean {
  // Only check for current activity if it's today
  const today = todayLocalISO();
  if (task.date && task.date !== today) {
    return false;
  }
  
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const startMinutes = timeToMinutes(task.startTime);
  const endMinutes = timeToMinutes(task.endTime);
  
  return currentMinutes >= startMinutes && currentMinutes < endMinutes;
}

export function isValidTimeRange(startTime: string, endTime: string): boolean {
  return timeToMinutes(startTime) < timeToMinutes(endTime);
}

export function doTimeSlotsOverlap(slot1: TimeSlot, slot2: TimeSlot): boolean {
  const start1 = timeToMinutes(slot1.startTime);
  const end1 = timeToMinutes(slot1.endTime);
  const start2 = timeToMinutes(slot2.startTime);
  const end2 = timeToMinutes(slot2.endTime);

  return start1 < end2 && start2 < end1;
}

export function findOverlappingTasks(
  newTask: TimeSlot,
  existingTasks: Task[],
  dayOfWeek?: number,
  date?: string,
  excludeTaskId?: string
): Task[] {
  return existingTasks.filter(task => {
    // Skip the task being edited
    if (excludeTaskId && task.id === excludeTaskId) return false;
    
    // Skip canceled tasks
    if (task.canceled) return false;

    // Check if task applies to the same day
    let taskApplies = false;
    if (task.type === 'fixed' && dayOfWeek !== undefined) {
      taskApplies = task.daysOfWeek?.includes(dayOfWeek) || false;
    } else if ((task.type === 'one-time' || task.type === 'materialized') && date) {
      taskApplies = task.date === date;
    }

    if (!taskApplies) return false;

    // Check for time overlap
    return doTimeSlotsOverlap(newTask, {
      startTime: task.startTime,
      endTime: task.endTime
    });
  });
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateTask(
  taskData: {
    startTime: string;
    endTime: string;
    type: 'fixed' | 'one-time';
    daysOfWeek?: number[];
    date?: string;
  },
  existingTasks: Task[],
  editingTaskId?: string
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate time range
  if (!isValidTimeRange(taskData.startTime, taskData.endTime)) {
    errors.push("Start time must be before end time");
  }

  // Check for overlaps
  if (taskData.type === 'fixed' && taskData.daysOfWeek) {
    for (const dayOfWeek of taskData.daysOfWeek) {
      const overlapping = findOverlappingTasks(
        { startTime: taskData.startTime, endTime: taskData.endTime },
        existingTasks,
        dayOfWeek,
        undefined,
        editingTaskId
      );
      
      if (overlapping.length > 0) {
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        warnings.push(`Overlaps with "${overlapping[0].title}" on ${dayNames[dayOfWeek]}`);
      }
    }
  } else if (taskData.type === 'one-time' && taskData.date) {
    const overlapping = findOverlappingTasks(
      { startTime: taskData.startTime, endTime: taskData.endTime },
      existingTasks,
      undefined,
      taskData.date,
      editingTaskId
    );
    
    if (overlapping.length > 0) {
      warnings.push(`Overlaps with "${overlapping[0].title}" on this date`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}