import { Task, Completion } from "@/lib/schema";
import { Clock, CheckCircle2, Circle, Calendar } from "lucide-react";
import { clsx } from "clsx";
import { motion } from "framer-motion";
import { useSettings } from "@/hooks/use-settings";
import { useCurrentTime } from "@/hooks/use-current-time";
import { formatTime } from "@/lib/settings";
import { isTaskCurrentlyActive } from "@/lib/validation";

interface TaskCardProps {
  task: Task;
  isDone: boolean;
  onToggle: () => void;
  onClick: () => void;
}

export function TaskCard({ task, isDone, onToggle, onClick }: TaskCardProps) {
  const { settings } = useSettings();
  const currentTime = useCurrentTime(); // This will cause re-render every minute
  const duration = calculateDuration(task.startTime, task.endTime);
  const isCurrentlyActive = isTaskCurrentlyActive(task);

  // Hide completed tasks if setting is disabled
  if (isDone && !settings.showCompletedTasks) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileTap={{ scale: 0.98 }}
      className={clsx(
        "relative group flex flex-col p-4 rounded-2xl border transition-all duration-300",
        isDone 
          ? "bg-card/50 border-border/50 opacity-60" 
          : isCurrentlyActive
          ? "shadow-lg border-2"
          : "bg-card border-border shadow-sm hover:shadow-md hover:border-primary/20"
      )}
      style={{
        borderLeftWidth: '4px',
        borderLeftColor: task.color || 'var(--primary)',
        ...(isCurrentlyActive && !isDone ? {
          backgroundColor: task.color || 'var(--primary)',
          borderColor: task.color || 'var(--primary)',
          boxShadow: `0 8px 25px -5px color-mix(in srgb, ${task.color || 'var(--primary)'} 25%, transparent)`,
          color: 'white'
        } : {})
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div 
          className="flex-1 cursor-pointer" 
          onClick={onClick}
        >
          <div className="flex items-center gap-2 mb-1">
            <span className={clsx(
              "text-xs font-bold px-2 py-0.5 rounded-full",
              isDone 
                ? "bg-muted text-muted-foreground" 
                : isCurrentlyActive
                ? "text-white"
                : "bg-primary/10 text-primary"
            )}
            style={isCurrentlyActive && !isDone ? {
              backgroundColor: `color-mix(in srgb, ${task.color || 'var(--primary)'} 100%, black 7%)`,
              color: 'white'
            } : {}}
            >
              {formatTime(task.startTime, settings.timeFormat)} - {formatTime(task.endTime, settings.timeFormat)}
            </span>
            <span className="text-xs flex items-center gap-1">
              <Clock className={clsx("w-3 h-3", isCurrentlyActive && !isDone ? "text-white/80" : "text-muted-foreground")} />
              <span className={clsx(
                isCurrentlyActive && !isDone ? "text-white/90 font-semibold" : "text-muted-foreground font-normal"
              )}>
                {duration}m
              </span>
            </span>
            {(task.type === 'fixed' || task.type === 'materialized') && (
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300 flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                Fixed
              </span>
            )}
            {isCurrentlyActive && !isDone && (
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-white/20 text-white animate-pulse">
                • ACTIVE
              </span>
            )}
          </div>
          
          <h3 className={clsx(
            "font-semibold text-lg leading-tight mb-1 transition-all",
            isDone 
              ? "line-through text-muted-foreground" 
              : isCurrentlyActive 
              ? "text-white" 
              : "text-foreground"
          )}>
            {task.title}
          </h3>
          
          {task.description && (
            <p className={clsx(
              "text-sm line-clamp-2",
              isCurrentlyActive && !isDone ? "text-white/80" : "text-muted-foreground"
            )}>
              {task.description}
            </p>
          )}
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
          className={clsx(
            "mt-1 p-1 rounded-full transition-all duration-300",
            isDone 
              ? "text-primary" 
              : isCurrentlyActive
              ? "text-white/80 hover:text-white hover:bg-white/10"
              : "text-muted-foreground hover:text-primary hover:bg-primary/5"
          )}
        >
          {isDone ? (
            <CheckCircle2 className="w-8 h-8 fill-primary/10" />
          ) : (
            <Circle className="w-8 h-8" strokeWidth={1.5} />
          )}
        </button>
      </div>
    </motion.div>
  );
}

function calculateDuration(start: string, end: string): number {
  const [startH, startM] = start.split(':').map(Number);
  const [endH, endM] = end.split(':').map(Number);
  return (endH * 60 + endM) - (startH * 60 + startM);
}
