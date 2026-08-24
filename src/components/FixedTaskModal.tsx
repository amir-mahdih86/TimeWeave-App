import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertTaskSchema, InsertTask, ReminderMode } from "@/lib/schema";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TimePicker } from "@/components/ui/time-picker";
import { useCreateTask, useUpdateTask, useDeleteTask, useUpdateFixedTaskForFuture, useDeleteFixedTaskForFuture, useUpdateFixedTaskTemplate, useDeleteFixedTaskTemplate, useTasks } from "@/hooks/use-tasks";
import { useEffect, useState } from "react";
import { Trash2, AlertTriangle } from "lucide-react";
import { z } from "zod";
import { validateTask } from "@/lib/validation";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { format, isAfter, startOfDay } from "date-fns";

// Custom form schema that matches our form fields
const formSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  type: z.literal("fixed"),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format"),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format"),
  color: z.string(),
  daysOfWeek: z.array(z.number()).optional(),
});

interface FixedTaskModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: InsertTask & { id?: string };
  defaultDayOfWeek?: number; // 0-6, where 0 is Sunday
  currentDate?: string; // Current date context for determining past/future
  preservePastInstances?: boolean; // Whether to preserve past instances when editing
}

export function FixedTaskModal({ 
  open, 
  onOpenChange, 
  initialData, 
  defaultDayOfWeek,
  currentDate,
  preservePastInstances = false
}: FixedTaskModalProps) {
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const updateFixedTaskForFuture = useUpdateFixedTaskForFuture();
  const deleteFixedTaskForFuture = useDeleteFixedTaskForFuture();
  const updateFixedTaskTemplate = useUpdateFixedTaskTemplate();
  const deleteFixedTaskTemplate = useDeleteFixedTaskTemplate();
  const { data: tasks } = useTasks();
  const [validationResult, setValidationResult] = useState<{ isValid: boolean; errors: string[]; warnings: string[] }>({ isValid: true, errors: [], warnings: [] });
  const [reminder, setReminder] = useState<ReminderMode>('inherit');

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      type: "fixed", // Always fixed for this modal
      startTime: "09:00",
      endTime: "10:00",
      color: "hsl(262 83% 58%)",
      daysOfWeek: defaultDayOfWeek !== undefined ? [defaultDayOfWeek] : [1, 2, 3, 4, 5],
    }
  });

  useEffect(() => {
    if (open) {
      if (initialData) {
        setReminder(initialData.reminder ?? 'inherit');
        form.reset({
          title: initialData.title,
          description: initialData.description || "",
          type: "fixed" as const,
          startTime: initialData.startTime,
          endTime: initialData.endTime,
          color: initialData.color || "hsl(262 83% 58%)",
          daysOfWeek: initialData.daysOfWeek || [1, 2, 3, 4, 5],
        });
      } else {
        setReminder('inherit');
        form.reset({
          title: "",
          description: "",
          type: "fixed" as const,
          startTime: "09:00",
          endTime: "10:00",
          color: "hsl(262 83% 58%)",
          daysOfWeek: defaultDayOfWeek !== undefined ? [defaultDayOfWeek] : [1, 2, 3, 4, 5],
        });
      }
    }
  }, [open, initialData, defaultDayOfWeek, form]);

  // Validate on form changes
  useEffect(() => {
    const subscription = form.watch((data) => {
      if (tasks && data.startTime && data.endTime && data.daysOfWeek && data.daysOfWeek.length > 0) {
        const result = validateTask(
          {
            startTime: data.startTime,
            endTime: data.endTime,
            type: "fixed",
            daysOfWeek: data.daysOfWeek.filter((day): day is number => day !== undefined),
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
      console.log('Fixed task form validation errors:', form.formState.errors);
      console.log('Fixed task form is valid:', form.formState.isValid);
      console.log('Submitting fixed task data:', data);
      
      // Convert form data to InsertTask format (without id for creation)
      const taskData: Omit<InsertTask, 'id' | 'createdAt'> = {
        ...data,
        type: "fixed" as const,
        reminder,
      };
      
      if (initialData?.id) {
        console.log('Updating existing fixed task');
        
        if (preservePastInstances) {
          // Use the template update function that only affects future instances
          await updateFixedTaskTemplate.mutateAsync({ 
            id: initialData.id, 
            updates: taskData
          });
        } else {
          // Normal update for all occurrences
          await updateTask.mutateAsync({ id: initialData.id, ...taskData });
        }
      } else {
        console.log('Creating new fixed task');
        await createTask.mutateAsync(taskData as InsertTask);
      }
      console.log('Fixed task operation successful');
      onOpenChange(false);
    } catch (error) {
      console.error('Error creating fixed task:', error);
    }
  };

  const handleDelete = async () => {
    if (initialData?.id && confirm("Are you sure you want to delete this task?")) {
      if (preservePastInstances) {
        // Use the template delete function that only affects future instances
        await deleteFixedTaskTemplate.mutateAsync(initialData.id);
      } else {
        // Normal delete for all occurrences
        await deleteTask.mutateAsync(initialData.id);
      }
      
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initialData ? "Edit Fixed Task" : "Add Fixed Task"}</DialogTitle>
          <DialogDescription>
            This task will repeat weekly on the selected day.
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
              <TimePicker
                id="startTime"
                value={form.watch("startTime")}
                onChange={(v) => form.setValue("startTime", v, { shouldValidate: true })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endTime">End Time</Label>
              <TimePicker
                id="endTime"
                value={form.watch("endTime")}
                onChange={(v) => form.setValue("endTime", v, { shouldValidate: true })}
              />
            </div>
          </div>

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
                disabled={deleteTask.isPending || deleteFixedTaskTemplate.isPending}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
            <Button 
              type="submit" 
              className="flex-1"
              disabled={createTask.isPending || updateTask.isPending || updateFixedTaskTemplate.isPending || !validationResult.isValid}
            >
              {initialData ? "Save Changes" : "Create Task"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}