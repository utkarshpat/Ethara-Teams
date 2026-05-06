"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Hash, MessageCircle, Send } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import type {
  DashboardMember,
  DashboardProjectMessage,
  DashboardTask,
  DashboardUser,
} from "@/modules/dashboard/types";
import { useUiStore } from "@/stores/ui-store";

type ProjectChatProps = {
  projectId: string | null;
  members: DashboardMember[];
  tasks: DashboardTask[];
};

async function fetchMessages(projectId: string) {
  const response = await fetch(`/api/projects/${projectId}/messages`);

  if (!response.ok) {
    throw new Error("Could not load project chat");
  }

  return (await response.json()) as DashboardProjectMessage[];
}

async function postMessage(projectId: string, body: string) {
  const response = await fetch(`/api/projects/${projectId}/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ body }),
  });

  if (!response.ok) {
    throw new Error("Could not post project message");
  }

  return (await response.json()) as DashboardProjectMessage;
}

function initials(user: DashboardUser) {
  const source = user.name || user.email || "ET";
  return source
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function mentionValue(user: DashboardUser) {
  return `@${user.username ?? user.email?.split("@")[0] ?? "user"}`;
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

export function ProjectChat({ projectId, members, tasks }: ProjectChatProps) {
  const queryClient = useQueryClient();
  const setSelectedTaskId = useUiStore((state) => state.setSelectedTaskId);
  const [body, setBody] = useState("");
  const [cursor, setCursor] = useState(0);

  const messagesQuery = useQuery({
    queryKey: ["project-messages", projectId],
    queryFn: () => fetchMessages(projectId ?? ""),
    enabled: Boolean(projectId),
  });

  const messageMutation = useMutation({
    mutationFn: () => postMessage(projectId ?? "", body),
    onSuccess: async () => {
      setBody("");
      await queryClient.invalidateQueries({
        queryKey: ["project-messages", projectId],
      });
      await queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: () => toast.error("Project message could not be posted"),
  });

  const mentionHint = members
    .map((member) => mentionValue(member.user))
    .slice(0, 3)
    .join(" ");
  const token = activeToken(body, cursor);
  const suggestions =
    token?.marker === "@"
      ? members
          .map((member) => ({
            id: member.user.id,
            label: member.user.name ?? member.user.email ?? "Unknown user",
            value: mentionValue(member.user),
          }))
          .filter((member) => member.value.toLowerCase().includes(token.query))
          .slice(0, 5)
      : token?.marker === "#"
        ? tasks
            .map((task) => ({
              id: task.id,
              label: task.title,
              value: `#${taskSlug(task.title)}`,
            }))
            .filter((task) => task.value.toLowerCase().includes(token.query))
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
    <Card className="glass-panel rounded-lg">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="grid size-9 place-items-center rounded-md bg-primary/15 text-primary">
            <MessageCircle />
          </div>
          <div>
            <CardTitle>Project chat</CardTitle>
            <CardDescription>All-member channel with @mentions and #task refs</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex max-h-[300px] flex-col gap-3 overflow-y-auto pr-1">
          {(messagesQuery.data ?? []).map((message) => (
            <article
              key={message.id}
              className="rounded-md border border-white/10 bg-[#11182766] p-3"
            >
              <div className="mb-2 flex items-center gap-2">
                <Avatar className="size-7">
                  <AvatarImage src={message.user.image ?? undefined} />
                  <AvatarFallback>{initials(message.user)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {message.user.name ?? message.user.email}
                  </p>
                  <p className="mono-meta text-xs text-muted-foreground">
                    {new Intl.DateTimeFormat("en", {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    }).format(new Date(message.createdAt))}
                  </p>
                </div>
              </div>
              <p className="whitespace-pre-wrap text-sm leading-6">{message.body}</p>
              {message.referencedTasks.length ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {message.referencedTasks.map((task) => (
                    <Button
                      key={task.id}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedTaskId(task.id)}
                    >
                      <Hash data-icon="inline-start" />
                      {task.title}
                    </Button>
                  ))}
                </div>
              ) : null}
            </article>
          ))}
          {!messagesQuery.data?.length ? (
            <div className="rounded-md border border-dashed border-white/10 bg-[#030712]/50 p-5 text-sm text-muted-foreground">
              Start a project-wide thread for decisions, blockers, and handoffs.
            </div>
          ) : null}
        </div>
        <form
          className="flex flex-col gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            if (!body.trim() || !projectId) {
              return;
            }
            messageMutation.mutate();
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
            placeholder={`Use ${mentionHint || "@username"} and #task-title`}
            rows={3}
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
          <div className="flex items-center justify-between gap-3">
            <Badge variant="outline" className="mono-meta">
              #task-title
            </Badge>
            <Button type="submit" disabled={messageMutation.isPending || !projectId}>
              <Send data-icon="inline-start" />
              Send
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
