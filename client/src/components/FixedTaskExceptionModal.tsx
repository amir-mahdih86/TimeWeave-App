import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertTaskSchema, InsertTask, Task } from "@shared/schema";
import { useAddException } from "@/hooks/use-tasks";
import { useEffect } from "react";
import { Calendar } from "lucide-react";
import { z } from "zod";
import { v4 as uuidv4 } from 'uuid';

// Extended schema for form validation
const formSchema = insertTaskSchema.extend({
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format"),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format"),
});

interface FixedTaskExceptionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: Task;
  currentDate: string; // The date for which we're creating an exception
}

export function FixedTaskExceptionModal({ 
  open, 
  onOpenChange, 
  task,
  currentDate
}: FixedTaskExceptionModalProps) {
  const addException = useAddException();

  const form = useForm<InsertTask>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: task.title,
      description: task.description || "",
      type: task.type,
      startTime: task.startTime,
      endTime: task.endTime,
      color: task.color,
      daysOfWeek: task.daysOfWeek,
    }
  });

  useEffect(() => {
    if (open) {
      form.reset({
        title: task.title,
        description: task.description || "",
        type: task.type,
        startTime: task.startTime,
        endTime: task.endTime,
        color: task.color,
        daysOfWeek: task.daysOfWeek,
      });
    }
  }, [open, task, form]);

  const onSubmit = async (data: InsertTask) => {
    try {
      // Check if anything changed
      const hasChanges = 
        data.title !== task.title ||
        data.description !== task.description ||
        data.startTime !== task.startTime ||
        data.endTime !== task.endTime;

      if (hasChanges) {
        // Create a modification exception
        await addException.mutateAsync({
          id: uuidv4(),
          taskId: task.id,
          date: currentDate,
          type: 'modified',
          newStartTime: data.startTime !== task.startTime ? data.startTime : undefined,
          newEndTime: data.endTime !== task.endTime ? data.endTime : undefined,
          newDescription: data.description !== task.description ? data.description : undefined,
        });
      }
      
      onOpenChange(false);
    } catch (error) {
      console.error('Error creating exception:', error);
    }
  };

  const handleCancelForToday = async () => {
    if (confirm("Cancel this task for today only? This won't affect other days.")) {
      try {
        await addException.mutateAsync({
          id: uuidv4(),
          taskId: task.id,
          date: currentDate,
          type: 'cancelled',
        });
        onOpenChange(false);
      } catch (error) {
        console.error('Error cancelling task:', error);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-orange-500" />
            Edit Fixed Task
          </DialogTitle>
          <DialogDescription>
            This is a recurring task. Changes will only affect today.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input id="title" {...form.register("title")} placeholder="What needs to be done?" />
            {form.formState.errors.title && (
              <p className="text-sm text-destructive">{form.formState.errors.title.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startTime">Start Time</Label>
              <Input type="time" id="startTime" {...form.register("startTime")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endTime">End Time</Label>
              <Input type="time" id="endTime" {...form.register("endTime")} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea id="description" {...form.register("description")} placeholder="Add details..." />
          </div>

          <div className="flex flex-col gap-2 pt-4">
            <Button 
              type="submit" 
              className="w-full"
              disabled={addException.isPending}
            >
              Save Changes (Today Only)
            </Button>
            
            <Button 
              type="button" 
              variant="outline"
              onClick={handleCancelForToday}
              disabled={addException.isPending}
              className="w-full"
            >
              Cancel Today
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}