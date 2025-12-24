import { useState } from "react";
import { format, addDays, subDays, parseISO, isSameDay } from "date-fns";
import { useTasks, useExceptions, useCompletions, useToggleCompletion } from "@/hooks/use-tasks";
import { TaskCard } from "@/components/TaskCard";
import { FreeTimeSlot } from "@/components/FreeTimeSlot";
import { TaskModal } from "@/components/TaskModal";
import { Navigation } from "@/components/Navigation";
import { ChevronLeft, ChevronRight, Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Task } from "@shared/schema";
import { motion, AnimatePresence } from "framer-motion";

export default function Home() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const dateStr = format(selectedDate, 'yyyy-MM-dd');
  const dayOfWeek = selectedDate.getDay(); // 0 = Sunday

  const { data: tasks, isLoading: isLoadingTasks } = useTasks();
  const { data: exceptions } = useExceptions();
  const { data: completions } = useCompletions(dateStr);
  const toggleCompletion = useToggleCompletion();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | undefined>(undefined);
  const [newSlotTime, setNewSlotTime] = useState<{start: string, end: string} | undefined>(undefined);

  // === LOGIC: Build the Daily Schedule ===
  // 1. Filter tasks valid for this day
  const validTasks = tasks?.filter(task => {
    // Check if task is fixed and runs on this day of week
    if (task.type === 'fixed') {
      return task.daysOfWeek?.includes(dayOfWeek);
    }
    // Check if task is one-time and matches date
    if (task.type === 'one-time') {
      return task.date === dateStr;
    }
    return false;
  }).map(task => {
    // Check for exceptions
    const exception = exceptions?.find(e => 
      e.taskId === task.id && e.date === dateStr
    );
    
    // If cancelled, return null (filter out later)
    if (exception?.type === 'cancelled') return null;

    // Apply modifications if any
    if (exception?.type === 'modified') {
      return {
        ...task,
        startTime: exception.newStartTime || task.startTime,
        endTime: exception.newEndTime || task.endTime,
        description: exception.newDescription || task.description,
      };
    }
    return task;
  }).filter(Boolean) as Task[] || [];

  // 2. Sort tasks by start time
  const sortedTasks = validTasks.sort((a, b) => a.startTime.localeCompare(b.startTime));

  // 3. Compute Free Time Slots
  const timeSlots: Array<{ type: 'task', data: Task } | { type: 'free', start: string, end: string }> = [];
  let lastEndTime = "06:00"; // Start day at 6 AM

  sortedTasks.forEach(task => {
    if (task.startTime > lastEndTime) {
      timeSlots.push({ type: 'free', start: lastEndTime, end: task.startTime });
    }
    timeSlots.push({ type: 'task', data: task });
    // Use the later end time if overlapping (simple collision handling)
    if (task.endTime > lastEndTime) {
      lastEndTime = task.endTime;
    }
  });

  // End day at 10 PM
  if (lastEndTime < "22:00") {
    timeSlots.push({ type: 'free', start: lastEndTime, end: "22:00" });
  }

  // === HANDLERS ===
  const handleToggle = (task: Task) => {
    const isDone = completions?.some(c => c.taskId === task.id && c.isDone) || false;
    toggleCompletion.mutate({ taskId: task.id, date: dateStr, isDone: !isDone });
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setNewSlotTime(undefined);
    setIsModalOpen(true);
  };

  const handleCreateTask = (start?: string, end?: string) => {
    setEditingTask(undefined);
    setNewSlotTime(start && end ? { start, end } : undefined);
    setIsModalOpen(true);
  };

  if (isLoadingTasks) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-md mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h1 className="text-2xl font-bold text-foreground">My Day</h1>
              <p className="text-sm text-muted-foreground">
                {format(selectedDate, "MMMM yyyy")}
              </p>
            </div>
            <Button 
              size="icon" 
              className="rounded-full shadow-lg shadow-primary/25"
              onClick={() => handleCreateTask()}
            >
              <Plus className="w-5 h-5" />
            </Button>
          </div>
          
          {/* Date Scroller */}
          <div className="flex items-center justify-between bg-secondary/50 rounded-xl p-1">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setSelectedDate(subDays(selectedDate, 1))}
              className="h-8 w-8 p-0"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="font-semibold text-sm">
              {isSameDay(selectedDate, new Date()) ? "Today, " : ""}
              {format(selectedDate, "EEE d")}
            </span>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setSelectedDate(addDays(selectedDate, 1))}
              className="h-8 w-8 p-0"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-md mx-auto px-4 py-6 space-y-4">
        {timeSlots.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <p>No tasks scheduled.</p>
            <Button variant="link" onClick={() => handleCreateTask()}>Add a task</Button>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {timeSlots.map((slot, i) => {
              if (slot.type === 'free') {
                return (
                  <motion.div key={`free-${i}`} layout>
                    <FreeTimeSlot 
                      startTime={slot.start} 
                      endTime={slot.end} 
                      onClick={() => handleCreateTask(slot.start, slot.end)} 
                    />
                  </motion.div>
                );
              } else {
                const isDone = completions?.some(c => c.taskId === slot.data.id && c.isDone) || false;
                return (
                  <motion.div key={slot.data.id} layout>
                    <TaskCard 
                      task={slot.data} 
                      isDone={isDone} 
                      onToggle={() => handleToggle(slot.data)}
                      onClick={() => handleEditTask(slot.data)}
                    />
                  </motion.div>
                );
              }
            })}
          </AnimatePresence>
        )}
      </main>

      <TaskModal 
        open={isModalOpen} 
        onOpenChange={setIsModalOpen}
        initialData={editingTask}
        defaultDate={dateStr}
        defaultStartTime={newSlotTime?.start}
        defaultEndTime={newSlotTime?.end}
      />
      
      <Navigation />
    </div>
  );
}
