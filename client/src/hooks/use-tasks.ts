import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  getAllTasks, 
  addTask, 
  updateTask, 
  deleteTask, 
  getAllExceptions, 
  addException,
  getCompletionsByDate,
  toggleCompletion,
  initDB,
  seedInitialData
} from "@/lib/storage";
import { InsertTask, InsertException } from "@shared/schema";

// Initialize DB and seed data
initDB().then(() => seedInitialData());

export function useTasks() {
  return useQuery({
    queryKey: ['tasks'],
    queryFn: getAllTasks,
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

export function useDeleteTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteTask(id),
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

export function useToggleCompletion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, date, isDone }: { taskId: string, date: string, isDone: boolean }) => 
      toggleCompletion(taskId, date, isDone),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['completions', variables.date] });
    },
  });
}
