import { useTasks } from "@/hooks/use-tasks";
import { useSettings } from "@/hooks/use-settings";
import { Navigation } from "@/components/Navigation";
import { FixedTaskModal } from "@/components/FixedTaskModal";
import { format, startOfWeek, addDays, isSameDay } from "date-fns";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { clsx } from "clsx";
import { useState } from "react";
import { Task } from "@shared/schema";
import { formatTime, getWeekStartDay } from "@/lib/settings";

export default function Weekly() {
  const { data: tasks, isLoading } = useTasks();
  const { settings } = useSettings();
  const [selectedDayIndex, setSelectedDayIndex] = useState(new Date().getDay());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | undefined>(undefined);
  
  const weekStartDay = getWeekStartDay(settings.weekStartsOn) as 0 | 1 | 2 | 3 | 4 | 5 | 6;
  const weekStart = startOfWeek(new Date(), { weekStartsOn: weekStartDay });
  const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i));

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Filter fixed tasks for selected day
  const dailyTasks = tasks?.filter(t => 
    t.type === 'fixed' && t.daysOfWeek?.includes(selectedDayIndex)
  ).sort((a, b) => a.startTime.localeCompare(b.startTime));

  const handleCreateFixedTask = () => {
    setEditingTask(undefined);
    setIsModalOpen(true);
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setIsModalOpen(true);
  };

  // Get the selected day name
  const getSelectedDayName = () => {
    const selectedWeekDay = weekDays.find((_, index) => {
      const dayIndex = (weekStartDay + index) % 7;
      return dayIndex === selectedDayIndex;
    });
    return selectedWeekDay ? format(selectedWeekDay, 'EEEE') : format(new Date(), 'EEEE');
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border p-4">
        <div className="max-w-md mx-auto">
          <h1 className="text-2xl font-bold mb-4">Fixed Tasks</h1>
          
          <div className="flex justify-between bg-secondary/30 p-1 rounded-xl overflow-x-auto scrollbar-hide">
            {weekDays.map((date, index) => {
              const dayIndex = (weekStartDay + index) % 7;
              const isSelected = dayIndex === selectedDayIndex;
              const isToday = isSameDay(date, new Date());
              return (
                <button
                  key={index}
                  onClick={() => setSelectedDayIndex(dayIndex)}
                  className={clsx(
                    "flex flex-col items-center justify-center w-12 h-14 rounded-lg transition-all duration-200 shrink-0",
                    isSelected ? "bg-primary text-primary-foreground shadow-md scale-105" : "hover:bg-muted",
                    isToday && !isSelected && "bg-secondary text-primary font-bold"
                  )}
                >
                  <span className="text-[10px] uppercase font-bold opacity-70">
                    {format(date, 'EEE')}
                  </span>
                  <span className="text-lg font-bold">
                    {format(date, 'd')}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-6 space-y-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-muted-foreground">
            Fixed Schedule for {getSelectedDayName()}
          </h2>
          <Button 
            size="sm" 
            onClick={handleCreateFixedTask}
            className="rounded-full shadow-lg shadow-primary/25"
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Fixed Task
          </Button>
        </div>

        {dailyTasks?.length === 0 ? (
          <div className="text-center py-10 border-2 border-dashed border-border rounded-xl">
            <p className="text-muted-foreground">No recurring tasks for this day.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {dailyTasks?.map(task => (
              <button
                key={task.id}
                onClick={() => handleEditTask(task)}
                className="w-full bg-card p-4 rounded-xl border border-border shadow-sm flex gap-4 items-center hover:bg-accent transition-colors"
                style={{ borderLeft: `4px solid ${task.color}` }}
              >
                <div className="flex flex-col text-center min-w-[60px]">
                  <span className="text-sm font-bold text-foreground">
                    {formatTime(task.startTime, settings.timeFormat)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatTime(task.endTime, settings.timeFormat)}
                  </span>
                </div>
                <div className="text-left">
                  <h3 className="font-semibold text-foreground">{task.title}</h3>
                  {task.description && (
                    <p className="text-xs text-muted-foreground line-clamp-1">{task.description}</p>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </main>

      <FixedTaskModal 
        open={isModalOpen} 
        onOpenChange={setIsModalOpen}
        initialData={editingTask}
        defaultDayOfWeek={selectedDayIndex}
        currentDate={format(new Date(), 'yyyy-MM-dd')} // Always use today for weekly view
        preservePastInstances={false} // Weekly view doesn't preserve past instances
      />

      <Navigation />
    </div>
  );
}
