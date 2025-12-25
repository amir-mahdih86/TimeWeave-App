import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Task } from "@shared/schema";
import { FixedTaskModal } from "./FixedTaskModal";
import { FixedTaskExceptionModal } from "./FixedTaskExceptionModal";
import { useState } from "react";
import { format, startOfDay } from "date-fns";

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

  const today = startOfDay(new Date());
  const editDate = new Date(currentDate);
  const isEditingFromPast = editDate < today;

  const handleEditSchedule = () => {
    setShowFixedModal(true);
    onOpenChange(false);
  };

  const handleEditThisInstance = () => {
    setShowExceptionModal(true);
    onOpenChange(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Fixed Task</DialogTitle>
            <DialogDescription>
              "{task.title}" is a recurring task. How would you like to edit it?
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
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
          </div>
        </DialogContent>
      </Dialog>

      <FixedTaskModal 
        open={showFixedModal} 
        onOpenChange={setShowFixedModal}
        initialData={task}
        currentDate={currentDate}
        preservePastInstances={true} // Always preserve past instances when editing recurring schedule
      />

      <FixedTaskExceptionModal
        open={showExceptionModal}
        onOpenChange={setShowExceptionModal}
        task={task}
        currentDate={currentDate}
      />
    </>
  );
}