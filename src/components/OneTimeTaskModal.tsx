import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertTaskSchema, InsertTask, ReminderMode } from "@/lib/schema";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateTask, useUpdateTask, useDeleteTask, useTasks } from "@/hooks/use-tasks";
import { useEffect, useState } from "react";
import { Trash2, AlertTriangle } from "lucide-react";
import { z } from "zod";
import { validateTask } from "@/lib/validation";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Custom form schema that matches our form fields
const formSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  type: z.literal("one-time"),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format"),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format"),
  color: z.string(),
  date: z.string(),
});

interface OneTimeTaskModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: InsertTask & { id?: string };
  defaultDate?: string;
  defaultStartTime?: string;
  defaultEndTime?: string;
  showDateField?: boolean; // New prop to control date field visibility
}

export function OneTimeTaskModal({ 
  open, 
  onOpenChange, 
  initialData, 
  defaultDate, 
  defaultStartTime, 
  defaultEndTime,
  showDateField = true // Default to true for backward compatibility
}: OneTimeTaskModalProps) {
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const { data: tasks } = useTasks();
  const [validationResult, setValidationResult] = useState<{ isValid: boolean; errors: string[]; warnings: string[] }>({ isValid: true, errors: [], warnings: [] });
  const [reminder, setReminder] = useState<ReminderMode>('inherit');

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      type: "one-time", // Always one-time for this modal
      startTime: defaultStartTime || "09:00",
      endTime: defaultEndTime || "10:00",
      color: "hsl(262 83% 58%)",
      date: defaultDate || new Date().toISOString().split('T')[0],
    }
  });

  useEffect(() => {
    if (open) {
      if (initialData) {
        setReminder(initialData.reminder ?? 'inherit');
        form.reset({
          title: initialData.title,
          description: initialData.description || "",
          type: "one-time" as const,
          startTime: initialData.startTime,
          endTime: initialData.endTime,
          color: initialData.color || "hsl(262 83% 58%)",
          date: initialData.date || new Date().toISOString().split('T')[0],
        });
      } else {
        setReminder('inherit');
        form.reset({
          title: "",
          description: "",
          type: "one-time" as const,
          startTime: defaultStartTime || "09:00",
          endTime: defaultEndTime || "10:00",
          color: "hsl(262 83% 58%)",
          date: defaultDate || new Date().toISOString().split('T')[0],
        });
      }
    }
  }, [open, initialData, defaultDate, defaultStartTime, defaultEndTime, form]);

  // Validate on form changes
  useEffect(() => {
    const subscription = form.watch((data) => {
      if (tasks && data.startTime && data.endTime && data.date) {
        const result = validateTask(
          {
            startTime: data.startTime,
            endTime: data.endTime,
            type: "one-time",
            date: data.date,
          },
          tasks,
          initialData?.id
        );
        setValidationResult(result);
      }
    });
    return () => subscription.unsubscribe();
  }, [form, tasks, initialData?.id]);

  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    try {
      console.log('Form validation errors:', form.formState.errors);
      console.log('Form is valid:', form.formState.isValid);
      console.log('Submitting task data:', data);
      
      // Convert form data to InsertTask format (without id for creation)
      const taskData: Omit<InsertTask, 'id' | 'createdAt'> = {
        ...data,
        type: "one-time" as const,
        reminder,
      };
      
      if (initialData?.id) {
        console.log('Updating existing task');
        await updateTask.mutateAsync({ id: initialData.id, ...taskData });
      } else {
        console.log('Creating new task');
        await createTask.mutateAsync(taskData as InsertTask);
      }
      console.log('Task operation successful');
      onOpenChange(false);
    } catch (error) {
      console.error('Error creating task:', error);
    }
  };

  const handleDelete = async () => {
    if (initialData?.id && confirm("Are you sure you want to delete this task?")) {
      await deleteTask.mutateAsync(initialData.id);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initialData ? "Edit Task" : "Add New Task"}</DialogTitle>
          <DialogDescription>
            {showDateField 
              ? "This is a one-time task for the selected date." 
              : "This is a one-time task for the current day."
            }
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

          {showDateField && !initialData && (
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input type="date" id="date" {...form.register("date")} />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="reminder">Reminder</Label>
            <Select value={reminder} onValueChange={(v: ReminderMode) => setReminder(v)}>
              <SelectTrigger id="reminder">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="inherit">Default (follow app settings)</SelectItem>
                <SelectItem value="none">Off — no reminder</SelectItem>
                <SelectItem value="notification">Notification only</SelectItem>
                <SelectItem value="alarm">Full-screen alarm</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Validation Messages */}
          {validationResult.errors.length > 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {validationResult.errors.map((error, i) => (
                  <div key={i}>{error}</div>
                ))}
              </AlertDescription>
            </Alert>
          )}

          {validationResult.warnings.length > 0 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {validationResult.warnings.map((warning, i) => (
                  <div key={i}>{warning}</div>
                ))}
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="color">Color Tag</Label>
            <div className="flex gap-2">
              {[
                "hsl(262 83% 58%)", // Purple (Default)
                "hsl(36 100% 50%)", // Orange
                "hsl(142 76% 36%)", // Green
                "hsl(200 98% 39%)", // Blue
                "hsl(0 84% 60%)",   // Red
              ].map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => form.setValue("color", color)}
                  className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${
                    form.watch("color") === color ? "border-foreground scale-110" : "border-transparent"
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea id="description" {...form.register("description")} placeholder="Add details..." />
          </div>

          <div className="flex gap-2 pt-4">
            {initialData?.id && (
              <Button 
                type="button" 
                variant="destructive" 
                size="icon"
                onClick={handleDelete}
                disabled={deleteTask.isPending}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
            <Button 
              type="submit" 
              className="flex-1"
              disabled={createTask.isPending || updateTask.isPending || !validationResult.isValid}
            >
              {initialData ? "Save Changes" : "Create Task"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}