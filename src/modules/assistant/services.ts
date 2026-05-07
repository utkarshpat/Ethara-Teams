import type { Priority } from "@prisma/client";
import { AppError } from "@/lib/guards";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { createCalendarEvent } from "@/modules/calendar/services";
import { createTask } from "@/modules/tasks/services";

type AssistantChatResult = {
  reply: string;
  summary: string | null;
};

type OpenRouterToolCall = {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
};

type OpenRouterMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_call_id?: string;
  tool_calls?: OpenRouterToolCall[];
};

type OpenRouterResponse = {
  choices?: Array<{
    message?: {
      content?: string | null;
      tool_calls?: OpenRouterToolCall[];
    };
  }>;
  error?: {
    message?: string;
  };
};

const RECENT_MESSAGE_LIMIT = 12;
const SUMMARY_THRESHOLD = 24;

function assistantModel() {
  return (
    process.env.OPENROUTER_MODEL ||
    "google/gemini-3.1-flash-lite-preview"
  );
}

const assistantTools = [
  {
    type: "function",
    function: {
      name: "create_task",
      description: "Create a task in one of the user's accessible projects.",
      parameters: {
        type: "object",
        properties: {
          projectId: { type: "string" },
          projectName: { type: "string" },
          title: { type: "string" },
          description: { type: "string" },
          priority: {
            type: "string",
            enum: ["LOW", "MEDIUM", "HIGH", "URGENT"],
          },
          dueDate: {
            type: "string",
            description: "ISO datetime if the user gave a due date.",
          },
          assignedEmail: { type: "string" },
        },
        required: ["title"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_calendar_event",
      description: "Create a calendar event or meeting for the current user.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string" },
          notes: { type: "string" },
          startAt: { type: "string", description: "ISO datetime" },
          endAt: { type: "string", description: "ISO datetime" },
          createGoogleMeet: { type: "boolean" },
        },
        required: ["title", "startAt", "endAt"],
      },
    },
  },
] as const;

async function callOpenRouter(
  messages: OpenRouterMessage[],
  systemInstruction: string,
  tools = true,
) {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new AppError("OpenRouter is not configured. Add OPENROUTER_API_KEY.", 503);
  }

  const response = await fetch(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.NEXTAUTH_URL ?? "http://localhost:3000",
        "X-Title": "Ethara Teams",
      },
      body: JSON.stringify({
        model: assistantModel(),
        messages: [{ role: "system", content: systemInstruction }, ...messages],
        tools: tools ? assistantTools : undefined,
        tool_choice: tools ? "auto" : undefined,
        parallel_tool_calls: false,
        max_tokens: 1800,
        temperature: 0.4,
      }),
    },
  );

  const payload = (await response.json().catch(() => ({}))) as OpenRouterResponse;

  if (!response.ok) {
    logger.error("assistant.openrouter_failed", {
      status: response.status,
      error: payload.error?.message,
    });
    throw new AppError(payload.error?.message ?? "OpenRouter request failed", 502);
  }

  return payload;
}

async function workspaceContext(userId: string) {
  const [user, projects, calendarEvents] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, role: true },
    }),
    prisma.project.findMany({
      where: {
        deletedAt: null,
        members: { some: { userId } },
      },
      select: {
        id: true,
        name: true,
        description: true,
        members: {
          select: {
            role: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
              },
            },
          },
          orderBy: { createdAt: "asc" },
        },
        tasks: {
          where: { deletedAt: null },
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
            dueDate: true,
            assignedTo: {
              select: { name: true, email: true },
            },
          },
          orderBy: [{ status: "asc" }, { order: "asc" }],
          take: 30,
        },
      },
      orderBy: { updatedAt: "desc" },
      take: 10,
    }),
    prisma.calendarEvent.findMany({
      where: {
        userId,
        deletedAt: null,
        startAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
      select: {
        id: true,
        title: true,
        type: true,
        status: true,
        startAt: true,
        endAt: true,
        location: true,
      },
      orderBy: { startAt: "asc" },
      take: 20,
    }),
  ]);

  return JSON.stringify({
    now: new Date().toISOString(),
    user,
    projects,
    calendarEvents,
  });
}

async function getConversation(userId: string) {
  return prisma.assistantConversation.upsert({
    where: { userId },
    update: {},
    create: { userId },
  });
}

function messageContent(message: { role: string; content: string }): OpenRouterMessage {
  return {
    role: message.role === "assistant" ? "assistant" : "user",
    content: message.content,
  };
}

function textFromResponse(response: OpenRouterResponse) {
  return response.choices?.[0]?.message?.content?.trim() || "I could not generate a response.";
}

function toolCallFromResponse(response: OpenRouterResponse) {
  return response.choices?.[0]?.message?.tool_calls?.[0] ?? null;
}

function stringArg(args: Record<string, unknown> | undefined, key: string) {
  const value = args?.[key];
  return typeof value === "string" ? value.trim() : "";
}

function parseToolArgs(toolCall: OpenRouterToolCall) {
  try {
    return JSON.parse(toolCall.function.arguments || "{}") as Record<string, unknown>;
  } catch {
    throw new AppError("Assistant tool arguments were invalid", 400);
  }
}

async function executeTool(userId: string, call: OpenRouterToolCall) {
  if (call.function.name === "create_task") {
    const args = parseToolArgs(call);
    const projectIdArg = stringArg(args, "projectId");
    const projectName = stringArg(args, "projectName").toLowerCase();
    const title = stringArg(args, "title");
    const assignedEmail = stringArg(args, "assignedEmail").toLowerCase();

    const project = await prisma.project.findFirst({
      where: {
        deletedAt: null,
        members: { some: { userId } },
        ...(projectIdArg
          ? { id: projectIdArg }
          : projectName
            ? { name: { contains: projectName, mode: "insensitive" } }
            : {}),
      },
      include: {
        members: {
          include: {
            user: { select: { id: true, email: true } },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    if (!project) {
      throw new AppError("Choose a project before I create the task.", 400);
    }

    const assignee = assignedEmail
      ? project.members.find(
          (member) => member.user.email?.toLowerCase() === assignedEmail,
        )
      : null;

    const task = await createTask(userId, project.id, {
      title,
      description: stringArg(args, "description"),
      priority: (stringArg(args, "priority") || "MEDIUM") as Priority,
      dueDate: stringArg(args, "dueDate") || null,
      assignedToId: assignee?.user.id ?? null,
    });

    return {
      ok: true,
      action: "task_created",
      taskId: task.id,
      projectId: project.id,
      title: task.title,
    };
  }

  if (call.function.name === "create_calendar_event") {
    const args = parseToolArgs(call);
    const event = await createCalendarEvent(userId, {
      title: stringArg(args, "title"),
      notes: stringArg(args, "notes"),
      location: "",
      type: "MEETING",
      startAt: stringArg(args, "startAt"),
      endAt: stringArg(args, "endAt"),
      reminderMinutes: null,
      createGoogleMeet: args.createGoogleMeet === true,
    });

    return {
      ok: true,
      action: "calendar_event_created",
      eventId: event.id,
      title: event.title,
      location: event.location,
    };
  }

  throw new AppError("Unsupported assistant action", 400);
}

function toolResultReply(result: Awaited<ReturnType<typeof executeTool>>) {
  if (result.action === "task_created") {
    return `Done. I created "${result.title}" in this project.`;
  }

  if (result.action === "calendar_event_created") {
    return result.location
      ? `Done. I created "${result.title}" and added the meeting link.`
      : `Done. I created "${result.title}" on your calendar.`;
  }

  return "Done. I completed that action.";
}

async function summarizeIfNeeded(conversationId: string) {
  const messages = await prisma.assistantMessage.findMany({
    where: { conversationId },
    orderBy: { createdAt: "desc" },
    skip: RECENT_MESSAGE_LIMIT,
    take: SUMMARY_THRESHOLD,
  });

  if (messages.length < SUMMARY_THRESHOLD) {
    return;
  }

  const oldestFirst = messages.reverse();
  const transcript = oldestFirst
    .map((message) => `${message.role}: ${message.content}`)
    .join("\n");

  let summary = transcript.slice(0, 3000);

  try {
    const response = await callOpenRouter(
      [
        {
          role: "user",
          content: transcript,
        },
      ],
      "Summarize this assistant conversation into durable user preferences, decisions, unresolved tasks, and created actions. Keep it under 1200 characters.",
      false,
    );
    summary = textFromResponse(response).slice(0, 1400);
  } catch (error) {
    logger.warn("assistant.summary_fallback", {
      conversationId,
      error: error instanceof Error ? error.message : "unknown",
    });
  }

  await prisma.assistantConversation.update({
    where: { id: conversationId },
    data: { summary },
  });
}

export async function chatWithAssistant(
  userId: string,
  message: string,
): Promise<AssistantChatResult> {
  const conversation = await getConversation(userId);

  await prisma.assistantMessage.create({
    data: {
      conversationId: conversation.id,
      role: "user",
      content: message,
    },
  });

  const [recentMessages, context] = await Promise.all([
    prisma.assistantMessage.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: "desc" },
      take: RECENT_MESSAGE_LIMIT,
    }),
    workspaceContext(userId),
  ]);

  const systemInstruction = [
    "You are Ethara Teams' in-app assistant.",
    "Answer in the user's language and be concise.",
    "Use clean plain text. Avoid Markdown tables. If listing items, use short bullet lines without decorative emphasis unless necessary.",
    "Use the provided workspace context only for project, team, task, and calendar facts.",
    "If creating tasks or calendar events, call the available function. Ask a clarifying question if required data is missing.",
    "Older conversation has been decay-summarized; prefer recent messages for current intent.",
    `Workspace context JSON: ${context}`,
    conversation.summary ? `Conversation summary: ${conversation.summary}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  const contents = recentMessages.reverse().map(messageContent);
  const firstResponse = await callOpenRouter(contents, systemInstruction);
  const toolCall = toolCallFromResponse(firstResponse);

  let reply = textFromResponse(firstResponse);

  if (toolCall) {
    const result = await executeTool(userId, toolCall);
    reply = toolResultReply(result);
  }

  await prisma.assistantMessage.create({
    data: {
      conversationId: conversation.id,
      role: "assistant",
      content: reply,
    },
  });

  await summarizeIfNeeded(conversation.id);

  const refreshed = await prisma.assistantConversation.findUnique({
    where: { id: conversation.id },
    select: { summary: true },
  });

  return {
    reply,
    summary: refreshed?.summary ?? null,
  };
}
