import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { 
  getAllTasks, 
  addTask, 
  updateTask, 
  deleteTask, 
  updateFixedTaskForFuture,
  deleteFixedTaskForFuture,
  updateFixedTaskTemplate,
  deleteFixedTaskTemplate,
  getTasksForDate,
  getCanceledTasksForDate,
  restoreTask,
  getTasksForDateRange,
  getAllExceptions, 
  addException,
  getCompletionsByDate,
  getAllCompletions,
  toggleCompletion,
  initDB,
  seedInitialData
} from "@/lib/storage";
import { InsertTask, InsertException } from "@shared/schema";

// Initialize DB and seed data
initDB().then(() => {
  seedInitialData();
});

export function useTasks() {
  return useQuery({
    queryKey: ['tasks'],
    queryFn: getAllTasks,
  });
}

export function useTasksForDate(date: string) {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: ['tasks', date],
    queryFn: async () => {
      const tasks = await getTasksForDate(date);
      // If this is today and we potentially materialized tasks, invalidate range queries
      const today = format(new Date(), 'yyyy-MM-dd');
      if (date === today) {
        // Small delay to ensure this query completes first
        setTimeout(() => {
          queryClient.invalidateQueries({ queryKey: ['tasks', 'range'] });
        }, 0);
      }
      return tasks;
    },
  });
}

export function useCanceledTasksForDate(date: string) {
  return useQuery({
    queryKey: ['canceled-tasks', date],
    queryFn: () => getCanceledTasksForDate(date),
  });
}

export function useTasksForDateRange(startDate: string, endDate: string) {
  return useQuery({
    queryKey: ['tasks', 'range', startDate, endDate],
    queryFn: () => getTasksForDateRange(startDate, endDate),
  });
}

export function useExceptions() {
  return useQuery({
    queryKey: ['exceptions'],
    queryFn: getAllExceptions,
  });
}

export function useCompletions(date: string) {
  return useQuery({
    queryKey: ['completions', date],
    queryFn: () => getCompletionsByDate(date),
  });
}

export function useAllCompletions() {
  return useQuery({
    queryKey: ['completions'],
    queryFn: getAllCompletions,
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: InsertTask) => addTask(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      // Also invalidate date range queries for reports
      queryClient.invalidateQueries({ queryKey: ['tasks', 'range'] });
    },
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...updates }: { id: string } & Partial<InsertTask>) => updateTask(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

export function useUpdateFixedTaskTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<InsertTask> }) => 
      updateFixedTaskTemplate(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteTask(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['canceled-tasks'] });
    },
  });
}

export function useDeleteFixedTaskTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteFixedTaskTemplate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['canceled-tasks'] });
    },
  });
}

export function useAddException() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: InsertException) => addException(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exceptions'] });
    },
  });
}

export function useUpdateFixedTaskForFuture() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates, fromDate }: { id: string; updates: Partial<InsertTask>; fromDate: string }) => 
      updateFixedTaskForFuture(id, updates, fromDate),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['exceptions'] });
    },
  });
}

export function useDeleteFixedTaskForFuture() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, fromDate }: { id: string; fromDate: string }) => 
      deleteFixedTaskForFuture(id, fromDate),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['exceptions'] });
    },
  });
}

export function useToggleCompletion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, date, isDone }: { taskId: string, date: string, isDone: boolean }) => 
      toggleCompletion(taskId, date, isDone),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['completions'] });
    },
  });
}

export function useRestoreTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => restoreTask(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['canceled-tasks'] });
    },
  });
}
