import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
  getTasksForDateRange,
  getAllExceptions, 
  addException,
  getCompletionsByDate,
  getAllCompletions,
  toggleCompletion,
  initDB,
  seedInitialData,
  initializeTodaysTasks
} from "@/lib/storage";
import { InsertTask, InsertException } from "@shared/schema";

// Initialize DB and seed data
initDB().then(() => {
  seedInitialData();
  initializeTodaysTasks(); // Materialize today's tasks on app start
});

export function useTasks() {
  return useQuery({
    queryKey: ['tasks'],
    queryFn: getAllTasks,
  });
}

export function useTasksForDate(date: string) {
  return useQuery({
    queryKey: ['tasks', date],
    queryFn: () => getTasksForDate(date),
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
    },
  });
}

export function useDeleteFixedTaskTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteFixedTaskTemplate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
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
