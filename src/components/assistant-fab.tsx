"use client";

import { Bot, Send, Sparkles, X } from "lucide-react";
import { useSession } from "next-auth/react";
import type { ReactNode } from "react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type AssistantMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

function normalizeAssistantText(content: string) {
  return content
    .replace(/\r\n/g, "\n")
    .replace(/\s+\*\s+\*\*/g, "\n* **")
    .replace(/\s+\*\s+/g, "\n* ")
    .trim();
}

function renderInline(content: string) {
  const parts = content.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);

  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }

    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code key={index} className="rounded bg-background/65 px-1 py-0.5 text-[0.9em]">
          {part.slice(1, -1)}
        </code>
      );
    }

    return <span key={index}>{part}</span>;
  });
}

function AssistantContent({ content }: { content: string }) {
  const lines = normalizeAssistantText(content)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const blocks: ReactNode[] = [];
  let bulletItems: string[] = [];

  function flushBullets() {
    if (!bulletItems.length) {
      return;
    }

    blocks.push(
      <ul key={`list-${blocks.length}`} className="ml-4 list-disc space-y-1">
        {bulletItems.map((item, index) => (
          <li key={`${item}-${index}`}>{renderInline(item)}</li>
        ))}
      </ul>,
    );
    bulletItems = [];
  }

  lines.forEach((line) => {
    const bullet = line.match(/^[-*]\s+(.+)$/);

    if (bullet) {
      bulletItems.push(bullet[1]);
      return;
    }

    flushBullets();
    blocks.push(
      <p key={`p-${blocks.length}`} className="whitespace-pre-wrap">
        {renderInline(line)}
      </p>,
    );
  });

  flushBullets();

  return <div className="flex flex-col gap-2">{blocks}</div>;
}

async function sendAssistantMessage(message: string) {
  const response = await fetch("/api/assistant/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.error ?? "Assistant request failed");
  }

  return (await response.json()) as { reply: string; summary: string | null };
}

export function AssistantFab() {
  const { status } = useSession();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [isPending, setPending] = useState(false);
  const [messages, setMessages] = useState<AssistantMessage[]>([
    {
      id: "hello",
      role: "assistant",
      content: "May I help you? Ask about projects, teams, tasks, or calendar events.",
    },
  ]);

  async function handleSend() {
    const message = input.trim();

    if (!message || isPending) {
      return;
    }

    if (status !== "authenticated") {
      toast.info("Sign in to use the workspace assistant");
      return;
    }

    const userMessage: AssistantMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: message,
    };

    setMessages((current) => [...current, userMessage]);
    setInput("");
    setPending(true);

    try {
      const result = await sendAssistantMessage(message);
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: result.reply,
        },
      ]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Assistant failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <Button
        type="button"
        className="fixed bottom-5 right-5 z-40 h-12 rounded-full px-4 shadow-2xl shadow-primary/25"
        onClick={() => setOpen(true)}
      >
        <Sparkles data-icon="inline-start" />
        May I help you?
      </Button>
      {open ? (
        <div className="fixed bottom-20 right-5 z-50 flex h-[min(620px,calc(100dvh-6rem))] w-[min(390px,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-2xl border border-border bg-popover/95 text-popover-foreground shadow-2xl shadow-primary/15 backdrop-blur-xl">
          <div className="flex items-start justify-between gap-3 border-b border-border/70 p-4">
            <div>
              <h2 className="flex items-center gap-2 font-heading text-base font-medium text-foreground">
              <Bot />
              Ethara AI
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Workspace-aware help for projects, team, tasks, and calendar.
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => setOpen(false)}
              aria-label="Close assistant"
            >
              <X />
            </Button>
          </div>
          <ScrollArea className="min-h-0 flex-1 px-4">
            <div className="flex flex-col gap-3 py-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "max-w-[88%] rounded-2xl px-3 py-2 text-sm leading-relaxed",
                    message.role === "user"
                      ? "ml-auto bg-primary text-primary-foreground"
                      : "bg-muted text-foreground",
                  )}
                >
                  {message.role === "assistant" ? (
                    <AssistantContent content={message.content} />
                  ) : (
                    <span className="whitespace-pre-wrap">{message.content}</span>
                  )}
                </div>
              ))}
              {isPending ? (
                <div className="w-fit rounded-2xl bg-muted px-3 py-2 text-sm text-muted-foreground">
                  Thinking...
                </div>
              ) : null}
            </div>
          </ScrollArea>
          <div className="border-t border-border/70 p-4">
            <form
              className="flex flex-col gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                void handleSend();
              }}
            >
              <Textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void handleSend();
                  }
                }}
                rows={3}
                placeholder="Ask or say: create a meeting tomorrow at 4..."
              />
              <Button type="submit" disabled={isPending || !input.trim()}>
                <Send data-icon="inline-start" />
                Send
              </Button>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
