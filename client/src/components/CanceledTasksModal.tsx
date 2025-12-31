import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Task } from "@shared/schema";
import { useCanceledTasksForDate } from "@/hooks/use-tasks";
import { format } from "date-fns";
import { Clock, RotateCcw } from "lucide-react";
import { useSettings } from "@/hooks/use-settings";
import { formatTime } from "@/lib/settings";

interface CanceledTasksModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: string;
  onRestoreTask?: (task: Task) => void;
}

export function CanceledTasksModal({ 
  open, 
  onOpenChange, 
  date,
  onRestoreTask
}: CanceledTasksModalProps) {
  const { data: canceledTasks, isLoading } = useCanceledTasksForDate(date);
  const { settings } = useSettings();

  const handleRestore = (task: Task) => {
    onRestoreTask?.(task);
  };

  const calculateDuration = (start: string, end: string): number => {
    const [startH, startM] = start.split(':').map(Number);
    const [endH, endM] = end.split(':').map(Number);
    return (endH * 60 + endM) - (startH * 60 + startM);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Canceled Tasks</DialogTitle>
          <p className="text-sm text-muted-foreground">
            {format(new Date(date), 'EEEE, MMMM d, yyyy')}
          </p>
        </DialogHeader>

        <div className="space-y-3">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading...
            </div>
          ) : canceledTasks?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No canceled tasks for this day.</p>
            </div>
          ) : (
            canceledTasks?.map(task => {
              const duration = calculateDuration(task.startTime, task.endTime);
              return (
                <div
                  key={task.id}
                  className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/30"
                  style={{
                    borderLeftWidth: '4px',
                    borderLeftColor: task.color || 'var(--primary)'
                  }}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                        {formatTime(task.startTime, settings.timeFormat)} - {formatTime(task.endTime, settings.timeFormat)}
                      </span>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {duration}m
                      </span>
                    </div>
                    
                    <h3 className="font-semibold text-foreground line-through opacity-60">
                      {task.title}
                    </h3>
                    
                    {task.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2 opacity-60">
                        {task.description}
                      </p>
                    )}
                  </div>

                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRestore(task)}
                      className="h-8 w-8 p-0"
                      title="Restore task"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}