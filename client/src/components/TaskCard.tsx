import { Task, Completion } from "@shared/schema";
import { Clock, CheckCircle2, Circle } from "lucide-react";
import { clsx } from "clsx";
import { motion } from "framer-motion";

interface TaskCardProps {
  task: Task;
  isDone: boolean;
  onToggle: () => void;
  onClick: () => void;
}

export function TaskCard({ task, isDone, onToggle, onClick }: TaskCardProps) {
  const duration = calculateDuration(task.startTime, task.endTime);

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
          : "bg-card border-border shadow-sm hover:shadow-md hover:border-primary/20"
      )}
      style={{
        borderLeftWidth: '4px',
        borderLeftColor: task.color || 'var(--primary)'
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
              isDone ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary"
            )}>
              {task.startTime} - {task.endTime}
            </span>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {duration}m
            </span>
          </div>
          
          <h3 className={clsx(
            "font-semibold text-lg leading-tight mb-1 transition-all",
            isDone ? "line-through text-muted-foreground" : "text-foreground"
          )}>
            {task.title}
          </h3>
          
          {task.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">
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
