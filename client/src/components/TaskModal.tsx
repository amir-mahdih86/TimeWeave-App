import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertTaskSchema, InsertTask } from "@shared/schema";
import { useCreateTask, useUpdateTask, useDeleteTask } from "@/hooks/use-tasks";
import { useEffect } from "react";
import { Trash2 } from "lucide-react";
import { z } from "zod";

// Extended schema for form validation
const formSchema = insertTaskSchema.extend({
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format"),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format"),
});

interface TaskModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: InsertTask & { id?: string };
  defaultDate?: string; // For setting date when creating one-time tasks
  defaultStartTime?: string;
  defaultEndTime?: string;
}

export function TaskModal({ open, onOpenChange, initialData, defaultDate, defaultStartTime, defaultEndTime }: TaskModalProps) {
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();

  const form = useForm<InsertTask>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      type: "fixed",
      startTime: defaultStartTime || "09:00",
      endTime: defaultEndTime || "10:00",
      color: "hsl(262 83% 58%)",
      daysOfWeek: [1, 2, 3, 4, 5],
      date: defaultDate || new Date().toISOString().split('T')[0],
    }
  });

  useEffect(() => {
    if (open) {
      if (initialData) {
        form.reset({
          ...initialData,
          description: initialData.description || "",
          daysOfWeek: initialData.daysOfWeek || [1, 2, 3, 4, 5],
          date: initialData.date || new Date().toISOString().split('T')[0],
        });
      } else {
        form.reset({
          title: "",
          description: "",
          type: "fixed",
          startTime: defaultStartTime || "09:00",
          endTime: defaultEndTime || "10:00",
          color: "hsl(262 83% 58%)",
          daysOfWeek: [1, 2, 3, 4, 5],
          date: defaultDate || new Date().toISOString().split('T')[0],
        });
      }
    }
  }, [open, initialData, defaultDate, defaultStartTime, defaultEndTime, form]);

  const isFixed = form.watch("type") === "fixed";

  const onSubmit = async (data: InsertTask) => {
    try {
      if (initialData?.id) {
        await updateTask.mutateAsync({ id: initialData.id, ...data });
      } else {
        await createTask.mutateAsync(data);
      }
      onOpenChange(false);
    } catch (error) {
      console.error(error);
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
            {isFixed ? "This task repeats weekly." : "This is a one-time task."}
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
            <Label htmlFor="type">Task Type</Label>
            <Select 
              onValueChange={(val) => form.setValue("type", val as "fixed" | "one-time")} 
              defaultValue={form.watch("type")}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fixed">Fixed (Weekly)</SelectItem>
                <SelectItem value="one-time">One-time</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isFixed ? (
            <div className="space-y-2">
              <Label>Days of Week</Label>
              <div className="flex justify-between">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => {
                  const currentDays = form.watch("daysOfWeek") || [];
                  const isSelected = currentDays.includes(index);
                  return (
                    <button
                      key={index}
                      type="button"
                      onClick={() => {
                        const newDays = isSelected
                          ? currentDays.filter(d => d !== index)
                          : [...currentDays, index];
                        form.setValue("daysOfWeek", newDays.sort());
                      }}
                      className={`w-8 h-8 rounded-full text-xs font-bold transition-all ${
                        isSelected 
                          ? "bg-primary text-primary-foreground shadow-md" 
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input type="date" id="date" {...form.register("date")} />
            </div>
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
              disabled={createTask.isPending || updateTask.isPending}
            >
              {initialData ? "Save Changes" : "Create Task"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
