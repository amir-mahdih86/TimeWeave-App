import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Task } from "@/lib/schema";
import { FixedTaskModal } from "./FixedTaskModal";
import { FixedTaskExceptionModal } from "./FixedTaskExceptionModal";
import { OneTimeTaskModal } from "./OneTimeTaskModal";
import { useState } from "react";
import { format, startOfDay } from "date-fns";
import { useDeleteTask } from "@/hooks/use-tasks";

interface FixedTaskEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: Task;
  currentDate: string;
}

export function FixedTaskEditModal({ 
  open, 
  onOpenChange, 
  task, 
  currentDate 
}: FixedTaskEditModalProps) {
  const [showFixedModal, setShowFixedModal] = useState(false);
  const [showExceptionModal, setShowExceptionModal] = useState(false);
  const [showOneTimeModal, setShowOneTimeModal] = useState(false);
  const deleteTask = useDeleteTask();

  const today = startOfDay(new Date());
  const editDate = new Date(currentDate);
  const isEditingFromPast = editDate < today;
  const isMaterialized = task.type === 'materialized';

  const handleEditSchedule = () => {
    setShowFixedModal(true);
    onOpenChange(false);
  };

  const handleEditThisInstance = () => {
    if (isMaterialized) {
      // For materialized tasks, edit directly as one-time task
      setShowOneTimeModal(true);
    } else {
      // For fixed tasks, use exception system
      setShowExceptionModal(true);
    }
    onOpenChange(false);
  };

  const handleCancelInstance = async () => {
    if (confirm("Cancel this task? This won't affect other days.")) {
      try {
        await deleteTask.mutateAsync(task.id);
        onOpenChange(false);
      } catch (error) {
        console.error('Error canceling task:', error);
      }
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit {isMaterialized ? 'Materialized' : 'Fixed'} Task</DialogTitle>
            <DialogDescription>
              "{task.title}" is a recurring task. How would you like to edit it?
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {!isMaterialized && (
              <Button 
                onClick={handleEditSchedule}
                className="w-full justify-start h-auto p-4"
                variant="outline"
              >
                <div className="text-left">
                  <div className="font-medium">Edit the recurring schedule</div>
                  <div className="text-sm text-muted-foreground">
                    {isEditingFromPast 
                      ? "Changes will only affect future occurrences. Past instances will remain unchanged." 
                      : "Changes will affect this and all future occurrences"
                    }
                  </div>
                </div>
              </Button>
            )}

            <Button 
              onClick={handleEditThisInstance}
              className="w-full justify-start h-auto p-4"
              variant="outline"
            >
              <div className="text-left">
                <div className="font-medium">Edit only this instance</div>
                <div className="text-sm text-muted-foreground">
                  Make changes just for {format(editDate, 'MMM d, yyyy')}. The recurring schedule stays the same.
                </div>
              </div>
            </Button>

            {isMaterialized && (
              <Button 
                onClick={handleCancelInstance}
                className="w-full justify-start h-auto p-4"
                variant="outline"
                disabled={deleteTask.isPending}
              >
                <div className="text-left">
                  <div className="font-medium">Cancel this instance</div>
                  <div className="text-sm text-muted-foreground">
                    Remove this task for {format(editDate, 'MMM d, yyyy')} only.
                  </div>
                </div>
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {!isMaterialized && (
        <FixedTaskModal 
          open={showFixedModal} 
          onOpenChange={setShowFixedModal}
          initialData={task}
          currentDate={currentDate}
          preservePastInstances={true} // Always preserve past instances when editing recurring schedule
        />
      )}

      {!isMaterialized && (
        <FixedTaskExceptionModal
          open={showExceptionModal}
          onOpenChange={setShowExceptionModal}
          task={task}
          currentDate={currentDate}
        />
      )}

      {isMaterialized && (
        <OneTimeTaskModal
          open={showOneTimeModal}
          onOpenChange={setShowOneTimeModal}
          initialData={task}
          defaultDate={currentDate}
          showDateField={false}
        />
      )}
    </>
  );
}