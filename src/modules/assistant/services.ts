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

type GeminiPart = {
  text?: string;
  thoughtSignature?: string;
  thought_signature?: string;
  functionCall?: {
    name: string;
    args?: Record<string, unknown>;
  };
  functionResponse?: {
    name: string;
    response: Record<string, unknown>;
  };
};

type GeminiContent = {
  role: "user" | "model" | "function";
  parts: GeminiPart[];
};

type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: GeminiPart[];
    };
  }>;
};

const RECENT_MESSAGE_LIMIT = 12;
const SUMMARY_THRESHOLD = 24;

function geminiModel() {
  return process.env.GEMINI_MODEL || "gemini-3.1-flash-lite-preview";
}

async function callGemini(
  contents: GeminiContent[],
  systemInstruction: string,
  tools = true,
) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new AppError("Gemini is not configured. Add GEMINI_API_KEY.", 503);
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel()}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: systemInstruction }],
        },
        contents,
        tools: tools
          ? [
              {
                functionDeclarations: [
                  {
                    name: "create_task",
                    description:
                      "Create a task in one of the user's accessible projects.",
                    parameters: {
                      type: "OBJECT",
                      properties: {
                        projectId: { type: "STRING" },
                        projectName: { type: "STRING" },
                        title: { type: "STRING" },
                        description: { type: "STRING" },
                        priority: {
                          type: "STRING",
                          enum: ["LOW", "MEDIUM", "HIGH", "URGENT"],
                        },
                        dueDate: {
                          type: "STRING",
                          description: "ISO datetime if the user gave a due date.",
                        },
                        assignedEmail: { type: "STRING" },
                      },
                      required: ["title"],
                    },
                  },
                  {
                    name: "create_calendar_event",
                    description:
                      "Create a calendar event or meeting for the current user.",
                    parameters: {
                      type: "OBJECT",
                      properties: {
                        title: { type: "STRING" },
                        notes: { type: "STRING" },
                        startAt: { type: "STRING", description: "ISO datetime" },
                        endAt: { type: "STRING", description: "ISO datetime" },
                        createGoogleMeet: { type: "BOOLEAN" },
                      },
                      required: ["title", "startAt", "endAt"],
                    },
                  },
                ],
              },
            ]
          : undefined,
      }),
    },
  );

  const payload = (await response.json().catch(() => ({}))) as GeminiResponse & {
    error?: { message?: string };
  };

  if (!response.ok) {
    logger.error("assistant.gemini_failed", {
      status: response.status,
      error: payload.error?.message,
    });
    throw new AppError(payload.error?.message ?? "Gemini request failed", 502);
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

function messageContent(message: { role: string; content: string }): GeminiContent {
  return {
    role: message.role === "assistant" ? "model" : "user",
    parts: [{ text: message.content }],
  };
}

function textFromResponse(response: GeminiResponse) {
  return (
    response.candidates?.[0]?.content?.parts
      ?.map((part) => part.text)
      .filter(Boolean)
      .join("\n")
      .trim() || "I could not generate a response."
  );
}

function functionCallFromResponse(response: GeminiResponse) {
  return response.candidates?.[0]?.content?.parts?.find((part) => part.functionCall)
    ?.functionCall;
}

function stringArg(args: Record<string, unknown> | undefined, key: string) {
  const value = args?.[key];
  return typeof value === "string" ? value.trim() : "";
}

async function executeTool(userId: string, call: NonNullable<ReturnType<typeof functionCallFromResponse>>) {
  if (call.name === "create_task") {
    const args = call.args ?? {};
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

  if (call.name === "create_calendar_event") {
    const args = call.args ?? {};
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
    const response = await callGemini(
      [
        {
          role: "user",
          parts: [{ text: transcript }],
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
  const firstResponse = await callGemini(contents, systemInstruction);
  const functionCall = functionCallFromResponse(firstResponse);

  let reply = textFromResponse(firstResponse);

  if (functionCall) {
    const result = await executeTool(userId, functionCall);
    const modelParts = firstResponse.candidates?.[0]?.content?.parts ?? [
      { functionCall },
    ];
    const secondResponse = await callGemini(
      [
        ...contents,
        {
          role: "model",
          parts: modelParts,
        },
        {
          role: "function",
          parts: [
            {
              functionResponse: {
                name: functionCall.name,
                response: result,
              },
            },
          ],
        },
      ],
      systemInstruction,
    );
    reply = textFromResponse(secondResponse);
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
