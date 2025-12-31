import { useState } from "react";
import { format, addDays, subDays, isSameDay } from "date-fns";
import { useTasks, useExceptions, useCompletions, useToggleCompletion, useTasksForDate, useRestoreTask, useCanceledTasksForDate } from "@/hooks/use-tasks";
import { TaskCard } from "@/components/TaskCard";
import { FreeTimeSlot } from "@/components/FreeTimeSlot";
import { OneTimeTaskModal } from "@/components/OneTimeTaskModal";
import { FixedTaskEditModal } from "@/components/FixedTaskEditModal";
import { CanceledTasksModal } from "@/components/CanceledTasksModal";
import { Navigation } from "@/components/Navigation";
import { ChevronLeft, ChevronRight, Plus, Loader2, Home as HomeIcon, Archive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Task } from "@shared/schema";
import { motion, AnimatePresence } from "framer-motion";

export default function Home() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const dateStr = format(selectedDate, 'yyyy-MM-dd');
  const dayOfWeek = selectedDate.getDay(); // 0 = Sunday

  const { data: tasksForDate, isLoading: isLoadingTasks } = useTasksForDate(dateStr);
  const { data: completions } = useCompletions(dateStr);
  const { data: canceledTasks } = useCanceledTasksForDate(dateStr);
  const toggleCompletion = useToggleCompletion();
  const restoreTask = useRestoreTask();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isFixedTaskEditModalOpen, setIsFixedTaskEditModalOpen] = useState(false);
  const [isCanceledTasksModalOpen, setIsCanceledTasksModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | undefined>(undefined);
  const [newSlotTime, setNewSlotTime] = useState<{start: string, end: string} | undefined>(undefined);
  const [isFromFreeTimeSlot, setIsFromFreeTimeSlot] = useState(false);

  const isToday = isSameDay(selectedDate, new Date());

  // === LOGIC: Build the Daily Schedule ===
  // Tasks are already materialized for this date, so we just need to sort them
  const sortedTasks = tasksForDate?.sort((a, b) => a.startTime.localeCompare(b.startTime)) || [];

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
    setIsFromFreeTimeSlot(false);
    
    if (task.type === 'fixed') {
      setIsFixedTaskEditModalOpen(true);
    } else {
      // For both one-time and materialized tasks, use the OneTimeTaskModal
      setIsModalOpen(true);
    }
  };

  const handleCreateTask = (start?: string, end?: string) => {
    setEditingTask(undefined);
    setNewSlotTime(start && end ? { start, end } : undefined);
    setIsFromFreeTimeSlot(Boolean(start && end)); // True if called from free time slot
    setIsModalOpen(true);
  };

  const goToToday = () => {
    setSelectedDate(new Date());
  };

  const handleRestoreTask = (task: Task) => {
    restoreTask.mutate(task.id);
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
              <h1 className="text-2xl font-bold text-foreground">TimeWeave</h1>
              <p className="text-sm text-muted-foreground">
                {format(selectedDate, "MMMM yyyy")}
              </p>
            </div>
            <div className="flex gap-2">
              {!isToday && (
                <Button 
                  size="icon" 
                  variant="outline"
                  className="rounded-full"
                  onClick={goToToday}
                >
                  <HomeIcon className="w-5 h-5" />
                </Button>
              )}
              <Button 
                size="icon" 
                className="rounded-full shadow-lg shadow-primary/25"
                onClick={() => handleCreateTask()}
              >
                <Plus className="w-5 h-5" />
              </Button>
            </div>
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
              {isToday ? "Today, " : ""}
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
        {/* Canceled Tasks Button */}
        <div className="flex justify-end">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setIsCanceledTasksModalOpen(true)}
            className="text-muted-foreground hover:text-foreground relative"
          >
            <Archive className="w-4 h-4 mr-2" />
            Canceled Tasks
            <span className="ml-2 bg-muted text-muted-foreground text-xs font-medium px-1.5 py-0.5 rounded-full min-w-[1.25rem] h-5 flex items-center justify-center">
              {canceledTasks?.length || 0}
            </span>
          </Button>
        </div>

        {timeSlots.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <p>No tasks scheduled.</p>
            <Button variant="ghost" onClick={() => handleCreateTask()}>Add a task</Button>
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

      <OneTimeTaskModal 
        open={isModalOpen} 
        onOpenChange={setIsModalOpen}
        initialData={editingTask}
        defaultDate={dateStr}
        defaultStartTime={newSlotTime?.start}
        defaultEndTime={newSlotTime?.end}
        showDateField={!isFromFreeTimeSlot} // Hide date field for free time slots
      />

      {editingTask && editingTask.type === 'fixed' && (
        <FixedTaskEditModal
          open={isFixedTaskEditModalOpen}
          onOpenChange={setIsFixedTaskEditModalOpen}
          task={editingTask}
          currentDate={dateStr}
        />
      )}

      <CanceledTasksModal
        open={isCanceledTasksModalOpen}
        onOpenChange={setIsCanceledTasksModalOpen}
        date={dateStr}
        onRestoreTask={handleRestoreTask}
      />
      
      <Navigation />
    </div>
  );
}
