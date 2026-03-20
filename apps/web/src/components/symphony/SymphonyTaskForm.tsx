import type {
  ProjectId,
  SymphonyCreateTaskInput,
  SymphonyTask,
  SymphonyTaskPriority,
  SymphonyUpdateTaskInput,
} from "@t3tools/contracts";
import { useEffect, useState, type FormEvent } from "react";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Textarea } from "~/components/ui/textarea";
import { toastManager } from "~/components/ui/toast";
import { readNativeApi } from "~/nativeApi";
import { formatLabelsInput, parseLabelsInput } from "./presentation";

interface SymphonyTaskFormProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly projectId: ProjectId;
  readonly task?: SymphonyTask | null;
}

const PRIORITY_LABELS: Record<SymphonyTaskPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

export function SymphonyTaskForm({ open, onOpenChange, projectId, task }: SymphonyTaskFormProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<SymphonyTaskPriority>("medium");
  const [labelsInput, setLabelsInput] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitle(task?.title ?? "");
    setDescription(task?.description ?? "");
    setPriority(task?.priority ?? "medium");
    setLabelsInput(formatLabelsInput(task?.labels ?? []));
  }, [open, task]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const api = readNativeApi();
    if (!api) return;

    const trimmedTitle = title.trim();
    if (trimmedTitle.length === 0) {
      toastManager.add({
        type: "warning",
        title: "Task title is required",
      });
      return;
    }

    setSubmitting(true);

    try {
      if (task) {
        const input: SymphonyUpdateTaskInput = {
          taskId: task.id,
          title: trimmedTitle,
          description,
          priority,
          labels: parseLabelsInput(labelsInput),
        };
        await api.symphony.updateTask(input);
      } else {
        const input: SymphonyCreateTaskInput = {
          projectId,
          title: trimmedTitle,
          description,
          priority,
          labels: parseLabelsInput(labelsInput),
        };
        await api.symphony.createTask(input);
      }

      onOpenChange(false);
    } catch (error) {
      toastManager.add({
        type: "error",
        title: task ? "Failed to update task" : "Failed to create task",
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPopup className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{task ? "Edit task" : "Create task"}</DialogTitle>
          <DialogDescription>
            {task
              ? "Update the task title, details, priority, and labels."
              : "Add a new Symphony task for this project."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={(event) => void handleSubmit(event)}>
          <DialogPanel className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="symphony-task-title">Title</Label>
              <Input
                id="symphony-task-title"
                autoFocus
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Ship Symphony task detail panel"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="symphony-task-description">Description</Label>
              <Textarea
                id="symphony-task-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Context, constraints, acceptance criteria..."
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select
                  value={priority}
                  onValueChange={(value) => {
                    if (value === "low" || value === "medium" || value === "high") {
                      setPriority(value);
                    }
                  }}
                >
                  <SelectTrigger aria-label="Task priority">
                    <SelectValue>{PRIORITY_LABELS[priority]}</SelectValue>
                  </SelectTrigger>
                  <SelectPopup>
                    <SelectItem value="low">{PRIORITY_LABELS.low}</SelectItem>
                    <SelectItem value="medium">{PRIORITY_LABELS.medium}</SelectItem>
                    <SelectItem value="high">{PRIORITY_LABELS.high}</SelectItem>
                  </SelectPopup>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="symphony-task-labels">Labels</Label>
                <Input
                  id="symphony-task-labels"
                  value={labelsInput}
                  onChange={(event) => setLabelsInput(event.target.value)}
                  placeholder="frontend, ux, bugfix"
                />
              </div>
            </div>
          </DialogPanel>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving..." : task ? "Save changes" : "Create task"}
            </Button>
          </DialogFooter>
        </form>
      </DialogPopup>
    </Dialog>
  );
}
