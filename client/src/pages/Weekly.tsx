import { useTasks } from "@/hooks/use-tasks";
import { Navigation } from "@/components/Navigation";
import { format, startOfWeek, addDays, isSameDay } from "date-fns";
import { Loader2 } from "lucide-react";
import { clsx } from "clsx";
import { useState } from "react";
import { Task } from "@shared/schema";

export default function Weekly() {
  const { data: tasks, isLoading } = useTasks();
  const [selectedDayIndex, setSelectedDayIndex] = useState(new Date().getDay());
  
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 0 }); // Start Sunday
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

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border p-4">
        <div className="max-w-md mx-auto">
          <h1 className="text-2xl font-bold mb-4">Weekly Schedule</h1>
          
          <div className="flex justify-between bg-secondary/30 p-1 rounded-xl overflow-x-auto scrollbar-hide">
            {weekDays.map((date, index) => {
              const isSelected = index === selectedDayIndex;
              const isToday = isSameDay(date, new Date());
              return (
                <button
                  key={index}
                  onClick={() => setSelectedDayIndex(index)}
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
        <h2 className="text-lg font-semibold text-muted-foreground mb-4">
          Fixed Schedule for {format(weekDays[selectedDayIndex], 'EEEE')}
        </h2>

        {dailyTasks?.length === 0 ? (
          <div className="text-center py-10 border-2 border-dashed border-border rounded-xl">
            <p className="text-muted-foreground">No recurring tasks for this day.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {dailyTasks?.map(task => (
              <div 
                key={task.id}
                className="bg-card p-4 rounded-xl border border-border shadow-sm flex gap-4 items-center"
                style={{ borderLeft: `4px solid ${task.color}` }}
              >
                <div className="flex flex-col text-center min-w-[60px]">
                  <span className="text-sm font-bold text-foreground">{task.startTime}</span>
                  <span className="text-xs text-muted-foreground">{task.endTime}</span>
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">{task.title}</h3>
                  {task.description && (
                    <p className="text-xs text-muted-foreground line-clamp-1">{task.description}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <Navigation />
    </div>
  );
}
