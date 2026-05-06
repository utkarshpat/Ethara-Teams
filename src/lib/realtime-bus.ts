import type { Server } from "socket.io";
import { logger } from "@/lib/logger";

type RealtimeServer = Server | null;

const globalForRealtime = globalThis as unknown as {
  etharaRealtime?: RealtimeServer;
};

export function setRealtimeServer(io: Server) {
  globalForRealtime.etharaRealtime = io;
}

export function projectRoom(projectId: string) {
  return `project:${projectId}`;
}

export function taskRoom(taskId: string) {
  return `task:${taskId}`;
}

export async function triggerProjectEvent(
  projectId: string,
  event: string,
  payload: unknown,
) {
  const io = globalForRealtime.etharaRealtime;

  if (!io) {
    logger.debug("realtime.project_emit_skipped", { projectId, event });
    return;
  }

  io.to(projectRoom(projectId)).emit(event, payload);
  logger.info("realtime.project_event_emitted", { projectId, event });
}

export async function triggerTaskEvent(
  taskId: string,
  event: string,
  payload: unknown,
) {
  const io = globalForRealtime.etharaRealtime;

  if (!io) {
    logger.debug("realtime.task_emit_skipped", { taskId, event });
    return;
  }

  io.to(taskRoom(taskId)).emit(event, payload);
  logger.info("realtime.task_event_emitted", { taskId, event });
}
