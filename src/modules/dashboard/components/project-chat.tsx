"use client";

import {
  type InfiniteData,
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { Hash, MessageCircle, Reply, Send } from "lucide-react";
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
import { cn } from "@/lib/utils";
import { useUiStore } from "@/stores/ui-store";

type ProjectChatProps = {
  projectId: string | null;
  members: DashboardMember[];
  tasks: DashboardTask[];
  currentUserId: string;
};

export type ProjectMessagesPage = {
  items: DashboardProjectMessage[];
  nextCursor: string | null;
};

export type ProjectMessagesData = InfiniteData<ProjectMessagesPage, string | null>;

export function upsertProjectMessage(
  data: ProjectMessagesData | undefined,
  message: DashboardProjectMessage,
  tempId?: string,
): ProjectMessagesData {
  const pages = data?.pages.length
    ? [...data.pages]
    : [{ items: [], nextCursor: null }];
  const pageParams = data?.pageParams.length ? [...data.pageParams] : [null];
  let found = false;

  const nextPages = pages.map((page, pageIndex) => {
    const items = page.items
      .filter((item) => item.id !== tempId)
      .map((item) => {
        if (item.id === message.id) {
          found = true;
          return message;
        }

        return item;
      });

    if (!found && pageIndex === 0) {
      return { ...page, items: [...items, message] };
    }

    return { ...page, items };
  });

  return { pages: nextPages, pageParams };
}

async function fetchMessagesPage(projectId: string, cursor?: string | null) {
  const query = new URLSearchParams({ limit: "20" });

  if (cursor) {
    query.set("cursor", cursor);
  }

  const response = await fetch(`/api/projects/${projectId}/messages?${query}`);

  if (!response.ok) {
    throw new Error("Could not load project chat");
  }

  return (await response.json()) as ProjectMessagesPage;
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

function splitReply(body: string) {
  if (!body.startsWith("Reply to ")) {
    return null;
  }

  const parts = body.split("\n\n");

  if (parts.length < 2) {
    return null;
  }

  return {
    quote: parts[0].replace(/^Reply to /, ""),
    body: parts.slice(1).join("\n\n"),
  };
}

export function ProjectChat({
  projectId,
  members,
  tasks,
  currentUserId,
}: ProjectChatProps) {
  const queryClient = useQueryClient();
  const setSelectedTaskId = useUiStore((state) => state.setSelectedTaskId);
  const [body, setBody] = useState("");
  const [cursor, setCursor] = useState(0);
  const [replyTo, setReplyTo] = useState<DashboardProjectMessage | null>(null);

  const messagesQuery = useInfiniteQuery<ProjectMessagesPage>({
    queryKey: ["project-messages", projectId],
    queryFn: ({ pageParam }) =>
      fetchMessagesPage(projectId ?? "", pageParam as string | null),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: Boolean(projectId),
  });

  const messages =
    messagesQuery.data?.pages
      .slice()
      .reverse()
      .flatMap((page) => page.items) ?? [];

  const messageMutation = useMutation({
    mutationFn: (messageBody: string) => postMessage(projectId ?? "", messageBody),
    onMutate: async (messageBody) => {
      if (!projectId) {
        return null;
      }

      await queryClient.cancelQueries({ queryKey: ["project-messages", projectId] });

      const tempId = `temp-${crypto.randomUUID()}`;
      const previous = queryClient.getQueryData<ProjectMessagesData>([
        "project-messages",
        projectId,
      ]);
      const optimisticMessage: DashboardProjectMessage = {
        id: tempId,
        body: messageBody,
        projectId,
        createdAt: new Date().toISOString(),
        user: {
          id: currentUserId,
          name: "You",
          email: null,
          username: null,
          image: null,
          role: "MEMBER",
        },
        referencedTasks: [],
      };

      setBody("");
      setReplyTo(null);
      queryClient.setQueryData<ProjectMessagesData>(
        ["project-messages", projectId],
        (current) => upsertProjectMessage(current, optimisticMessage),
      );

      return { previous, tempId, messageBody };
    },
    onSuccess: async (message, _messageBody, context) => {
      if (projectId) {
        queryClient.setQueryData<ProjectMessagesData>(
          ["project-messages", projectId],
          (current) => upsertProjectMessage(current, message, context?.tempId),
        );
      }
      await queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: (_error, _messageBody, context) => {
      if (projectId && context?.previous) {
        queryClient.setQueryData(["project-messages", projectId], context.previous);
      }

      setBody(context?.messageBody ?? "");
      toast.error("Project message could not be posted");
    },
  });

  function buildMessageBody() {
    const trimmed = body.trim();
    return replyTo
      ? `Reply to ${replyTo.user.name ?? replyTo.user.email}: ${replyTo.body.slice(0, 120)}\n\n${trimmed}`
      : trimmed;
  }

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
    <Card className="rounded-2xl border border-border bg-card/40 shadow-sm backdrop-blur-xl">
      <CardHeader className="border-b border-border/70">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-xl bg-primary/15 text-primary shadow-[0_0_18px_rgba(255,0,255,0.16)]">
              <MessageCircle />
            </div>
            <div>
              <CardTitle>Project chat</CardTitle>
              <CardDescription>
                All-member channel with @mentions, #task refs, and replies
              </CardDescription>
            </div>
          </div>
          <Badge variant="outline">{members.length} members</Badge>
        </div>
      </CardHeader>
      <CardContent className="flex min-h-[calc(100vh-14rem)] flex-col gap-3 p-4">
        <div className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto rounded-2xl border border-border/70 bg-background/35 p-4">
          {messagesQuery.hasNextPage ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mx-auto"
              disabled={messagesQuery.isFetchingNextPage}
              onClick={() => messagesQuery.fetchNextPage()}
            >
              Load older messages
            </Button>
          ) : null}
          {messages.map((message) => {
            const isMine = message.user.id === currentUserId;
            const reply = splitReply(message.body);

            return (
              <article
                key={message.id}
                className={cn(
                  "flex items-end gap-2",
                  isMine ? "justify-end" : "justify-start",
                )}
              >
                {!isMine ? (
                  <Avatar className="size-8 shrink-0">
                    <AvatarImage src={message.user.image ?? undefined} />
                    <AvatarFallback>{initials(message.user)}</AvatarFallback>
                  </Avatar>
                ) : null}
                <div
                  className={cn(
                    "group max-w-[min(58%,620px)] rounded-2xl border px-3 py-2.5 shadow-sm",
                    isMine
                      ? "rounded-br-md border-primary/30 bg-primary/90 text-primary-foreground shadow-[0_0_18px_rgba(255,0,255,0.16)]"
                      : "rounded-bl-md border-border bg-card/75",
                  )}
                >
                  <div className="mb-1 flex items-center justify-between gap-3">
                    <p
                      className={cn(
                        "truncate text-xs font-semibold",
                        isMine ? "text-white/86" : "text-foreground",
                      )}
                    >
                      {isMine ? "You" : message.user.name ?? message.user.email}
                    </p>
                    <p
                      className={cn(
                        "mono-meta shrink-0 text-[10px]",
                        isMine ? "text-white/64" : "text-muted-foreground",
                      )}
                    >
                      {new Intl.DateTimeFormat("en", {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      }).format(new Date(message.createdAt))}
                    </p>
                  </div>
                  {reply ? (
                    <div
                      className={cn(
                        "mb-2 rounded-xl border px-3 py-2 text-xs",
                        isMine
                          ? "border-white/20 bg-white/12 text-white/76"
                          : "border-border bg-background/45 text-muted-foreground",
                      )}
                    >
                      <span className="font-semibold">Reply:</span> {reply.quote}
                    </div>
                  ) : null}
                  <p className="whitespace-pre-wrap text-[13px] leading-5">
                    {reply?.body ?? message.body}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap gap-2">
                      {message.referencedTasks.map((task) => (
                        <Button
                          key={task.id}
                          type="button"
                          variant={isMine ? "secondary" : "outline"}
                          size="sm"
                          onClick={() => setSelectedTaskId(task.id)}
                        >
                          <Hash data-icon="inline-start" />
                          {task.title}
                        </Button>
                      ))}
                    </div>
                    <Button
                      type="button"
                      variant={isMine ? "secondary" : "ghost"}
                      size="icon-sm"
                      onClick={() => setReplyTo(message)}
                      aria-label="Reply"
                    >
                      <Reply />
                    </Button>
                  </div>
                </div>
                {isMine ? (
                  <Avatar className="size-8 shrink-0">
                    <AvatarImage src={message.user.image ?? undefined} />
                    <AvatarFallback>{initials(message.user)}</AvatarFallback>
                  </Avatar>
                ) : null}
              </article>
            );
          })}
          {!messages.length ? (
            <div className="grid min-h-56 place-items-center rounded-2xl border border-dashed border-border bg-muted/15 p-5 text-center">
              <div>
                <div className="mx-auto mb-3 grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary">
                  <MessageCircle />
                </div>
                <p className="text-sm font-semibold">Start the project conversation</p>
                <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                  Share blockers, decisions, handoffs, and task references with the full team.
                </p>
              </div>
            </div>
          ) : null}
        </div>
        <form
          className="rounded-2xl border border-border bg-background/55 p-3 shadow-inner"
          onSubmit={(event) => {
            event.preventDefault();
            if (!body.trim() || !projectId) {
              return;
            }
            messageMutation.mutate(buildMessageBody());
          }}
        >
          {replyTo ? (
            <div className="mb-3 flex items-start justify-between gap-3 rounded-xl border border-primary/20 bg-primary/10 p-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-primary">
                  Replying to {replyTo.user.name ?? replyTo.user.email}
                </p>
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                  {replyTo.body}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setReplyTo(null)}
              >
                Cancel
              </Button>
            </div>
          ) : null}
          <Textarea
            value={body}
            onChange={(event) => {
              setBody(event.target.value);
              setCursor(event.target.selectionStart);
            }}
            onKeyUp={(event) => setCursor(event.currentTarget.selectionStart)}
            onClick={(event) => setCursor(event.currentTarget.selectionStart)}
            placeholder={`Message project. Use ${mentionHint || "@username"} and #task-title`}
            rows={3}
            className="resize-none border-0 bg-transparent px-1 shadow-none focus-visible:ring-0"
          />
          {suggestions.length ? (
            <div className="mt-2 rounded-xl border border-border bg-card p-2 shadow-xl">
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
          <div className="mt-3 flex items-center justify-between gap-3">
            <Badge variant="outline" className="mono-meta">
              @mention / #task
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
