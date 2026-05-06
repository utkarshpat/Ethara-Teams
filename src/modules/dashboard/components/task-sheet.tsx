"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { TaskStatus } from "@prisma/client";
import { Send } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { useTaskRealtime } from "@/hooks/use-realtime";
import type {
  DashboardComment,
  DashboardMember,
  DashboardTask,
} from "@/modules/dashboard/types";
import { useUiStore } from "@/stores/ui-store";

type TaskSheetProps = {
  task: DashboardTask | null;
  members: DashboardMember[];
  tasks: DashboardTask[];
  canManageProject: boolean;
};

const selectClassName =
  "h-9 w-full rounded-lg border border-input bg-input px-3 text-sm text-foreground outline-none transition focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/35";

async function fetchComments(taskId: string) {
  const response = await fetch(`/api/tasks/${taskId}/comments`);

  if (!response.ok) {
    throw new Error("Could not load comments");
  }

  return (await response.json()) as DashboardComment[];
}

async function postComment(taskId: string, body: string) {
  const response = await fetch(`/api/tasks/${taskId}/comments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ body }),
  });

  if (!response.ok) {
    throw new Error("Could not post comment");
  }

  return (await response.json()) as DashboardComment;
}

async function patchTask(
  taskId: string,
  payload: {
    status?: TaskStatus;
    assignedToId?: string | null;
  },
) {
  const response = await fetch(`/api/tasks/${taskId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error("Could not update task");
  }

  return (await response.json()) as DashboardTask;
}

function initials(name: string | null, email: string | null) {
  const source = name || email || "ET";
  return source
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function mentionValue(member: DashboardMember) {
  return `@${member.user.username ?? member.user.email?.split("@")[0] ?? "user"}`;
}

function taskSlug(title: string) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function activeToken(value: string, cursor: number) {
  const prefix = value.slice(0, cursor);
  const match = prefix.match(/(^|\s)([@#])([a-zA-Z0-9._-]{3,})$/);

  if (!match) {
    return null;
  }

  return {
    marker: match[2] as "@" | "#",
    query: match[3].toLowerCase(),
    start: prefix.length - match[0].trimStart().length,
    end: cursor,
  };
}

function AdminTaskControls({
  task,
  members,
  isPending,
  onSubmit,
}: {
  task: DashboardTask;
  members: DashboardMember[];
  isPending: boolean;
  onSubmit: (payload: { status: TaskStatus; assignedToId: string | null }) => void;
}) {
  const [status, setStatus] = useState<TaskStatus>(task.status);
  const [assignedToId, setAssignedToId] = useState(task.assignedToId ?? "unassigned");

  return (
    <form
      className="grid gap-3 rounded-md border border-white/10 bg-[#11182766] p-4 text-sm backdrop-blur-xl"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit({
          status,
          assignedToId: assignedToId === "unassigned" ? null : assignedToId,
        });
      }}
    >
      <div>
        <h3 className="text-sm font-semibold tracking-normal">
          Admin task controls
        </h3>
        <p className="text-xs text-muted-foreground">
          Reassign ownership or update workflow status.
        </p>
      </div>
      <div className="grid gap-2">
        <span className="text-xs font-medium text-muted-foreground">Status</span>
        <select
          className={selectClassName}
          value={status}
          onChange={(event) => setStatus(event.target.value as TaskStatus)}
        >
          {["TODO", "IN_PROGRESS", "REVIEW", "DONE"].map((value) => (
            <option key={value} value={value}>
              {value.replace("_", " ")}
            </option>
          ))}
        </select>
      </div>
      <div className="grid gap-2">
        <span className="text-xs font-medium text-muted-foreground">Assignee</span>
        <select
          className={selectClassName}
          value={assignedToId}
          onChange={(event) => setAssignedToId(event.target.value)}
        >
          <option value="unassigned">Unassigned</option>
          {members.map((member) => (
            <option key={member.user.id} value={member.user.id}>
              {member.user.name ?? member.user.email}
            </option>
          ))}
        </select>
      </div>
      <Button type="submit" disabled={isPending}>
        Save assignment
      </Button>
    </form>
  );
}

export function TaskSheet({
  task,
  members,
  tasks,
  canManageProject,
}: TaskSheetProps) {
  const queryClient = useQueryClient();
  const selectedTaskId = useUiStore((state) => state.selectedTaskId);
  const setSelectedTaskId = useUiStore((state) => state.setSelectedTaskId);
  const [body, setBody] = useState("");
  const [cursor, setCursor] = useState(0);
  useTaskRealtime(task?.id ?? null, {
    "comment:created": () => {
      if (!task) {
        return;
      }

      queryClient.invalidateQueries({ queryKey: ["comments", task.id] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const commentsQuery = useQuery({
    queryKey: ["comments", task?.id],
    queryFn: () => fetchComments(task?.id ?? ""),
    enabled: Boolean(task),
  });

  const commentMutation = useMutation({
    mutationFn: () => postComment(task?.id ?? "", body),
    onSuccess: () => {
      setBody("");
      queryClient.invalidateQueries({ queryKey: ["comments", task?.id] });
      queryClient.invalidateQueries({ queryKey: ["tasks", task?.projectId] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: () => toast.error("Comment could not be posted"),
  });

  const taskMutation = useMutation({
    mutationFn: (payload: { status: TaskStatus; assignedToId: string | null }) =>
      patchTask(task?.id ?? "", payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["tasks", task?.projectId] });
      await queryClient.invalidateQueries({
        queryKey: ["analytics", task?.projectId],
      });
      await queryClient.invalidateQueries({ queryKey: ["notifications"] });
      toast.success("Task updated");
    },
    onError: () => toast.error("Task could not be updated"),
  });

  const mentionHint = members
    .map((member) => mentionValue(member))
    .slice(0, 4)
    .join(" ");
  const token = activeToken(body, cursor);
  const suggestions =
    token?.marker === "@"
      ? members
          .map((member) => ({
            id: member.user.id,
            label: member.user.name ?? member.user.email ?? "Unknown user",
            value: mentionValue(member),
          }))
          .filter((member) => member.value.toLowerCase().includes(token.query))
          .slice(0, 5)
      : token?.marker === "#"
        ? tasks
            .map((taskItem) => ({
              id: taskItem.id,
              label: taskItem.title,
              value: `#${taskSlug(taskItem.title)}`,
            }))
            .filter((taskItem) => taskItem.value.toLowerCase().includes(token.query))
            .slice(0, 5)
        : [];

  function insertSuggestion(value: string) {
    if (!token) {
      return;
    }

    setBody(`${body.slice(0, token.start)}${value} ${body.slice(token.end)}`);
    setCursor(token.start + value.length + 1);
  }

  return (
    <Sheet
      open={Boolean(selectedTaskId && task)}
      onOpenChange={(open) => {
        if (!open) {
          setSelectedTaskId(null);
        }
      }}
    >
      <SheetContent className="flex w-full flex-col gap-5 overflow-y-auto sm:max-w-xl">
        {task ? (
          <>
            <SheetHeader>
              <SheetTitle>{task.title}</SheetTitle>
              <SheetDescription>
                {task.description ?? "No description has been added yet."}
              </SheetDescription>
            </SheetHeader>
            <div className="grid gap-3 rounded-md border border-white/10 bg-[#11182766] p-4 text-sm backdrop-blur-xl">
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">Status</span>
                <span className="font-medium">{task.status.replace("_", " ")}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">Priority</span>
                <span className="font-medium">{task.priority}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">Assignee</span>
                <span className="font-medium">
                  {task.assignedTo?.name ?? "Unassigned"}
                </span>
              </div>
            </div>
            {canManageProject ? (
              <AdminTaskControls
                key={task.id}
                task={task}
                members={members}
                isPending={taskMutation.isPending}
                onSubmit={(payload) => taskMutation.mutate(payload)}
              />
            ) : null}
            <section className="flex flex-1 flex-col gap-4">
              <div>
                <h3 className="text-sm font-semibold tracking-normal">
                  Task thread
                </h3>
                <p className="text-xs text-muted-foreground">
                  Mention teammates like {mentionHint || "@username"}.
                </p>
              </div>
              <div className="flex flex-col gap-3">
                {(commentsQuery.data ?? []).map((comment) => (
                  <article key={comment.id} className="rounded-md border border-white/10 bg-[#11182766] p-3 backdrop-blur-xl">
                    <div className="mb-2 flex items-center gap-2">
                      <Avatar className="size-8">
                        <AvatarImage src={comment.user.image ?? undefined} />
                        <AvatarFallback>
                          {initials(comment.user.name, comment.user.email)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">
                          {comment.user.name ?? comment.user.email}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Intl.DateTimeFormat("en", {
                            month: "short",
                            day: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                          }).format(new Date(comment.createdAt))}
                        </p>
                      </div>
                    </div>
                    <p className="whitespace-pre-wrap text-sm leading-6">{comment.body}</p>
                    {comment.referencedTasks.length ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {comment.referencedTasks.map((referencedTask) => (
                          <Button
                            key={referencedTask.id}
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedTaskId(referencedTask.id)}
                          >
                            #{referencedTask.title}
                          </Button>
                        ))}
                      </div>
                    ) : null}
                  </article>
                ))}
                {!commentsQuery.data?.length ? (
                  <div className="rounded-md border border-dashed border-white/10 bg-[#030712]/50 p-6 text-center text-sm text-muted-foreground">
                    No comments yet. Start the task conversation.
                  </div>
                ) : null}
              </div>
            </section>
            <form
              className="sticky bottom-0 flex flex-col gap-3 bg-background/85 py-3 backdrop-blur"
              onSubmit={(event) => {
                event.preventDefault();
                if (!body.trim()) {
                  return;
                }
                commentMutation.mutate();
              }}
            >
              <Textarea
                value={body}
                onChange={(event) => {
                  setBody(event.target.value);
                  setCursor(event.target.selectionStart);
                }}
                onKeyUp={(event) => setCursor(event.currentTarget.selectionStart)}
                onClick={(event) => setCursor(event.currentTarget.selectionStart)}
                placeholder="Write a comment or mention @mira"
                rows={4}
              />
              {suggestions.length ? (
                <div className="rounded-md border border-white/10 bg-[#030712]/95 p-1 shadow-2xl shadow-black/40">
                  {suggestions.map((suggestion) => (
                    <button
                      key={suggestion.id}
                      type="button"
                      className="flex w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left text-sm hover:bg-primary/10"
                      onClick={() => insertSuggestion(suggestion.value)}
                    >
                      <span className="truncate">{suggestion.label}</span>
                      <span className="mono-meta text-xs text-primary">
                        {suggestion.value}
                      </span>
                    </button>
                  ))}
                </div>
              ) : null}
              <Button type="submit" disabled={commentMutation.isPending}>
                <Send data-icon="inline-start" />
                Send comment
              </Button>
            </form>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
