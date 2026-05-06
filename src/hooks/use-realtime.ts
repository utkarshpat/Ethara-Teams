"use client";

import { useEffect, useMemo, useRef } from "react";
import { io, type Socket } from "socket.io-client";

let socketClient: Socket | null = null;
let activeSubscribers = 0;
let disconnectTimer: ReturnType<typeof setTimeout> | null = null;

type EventHandlers = Record<string, (payload: unknown) => void>;

function getSocket() {
  if (!socketClient) {
    socketClient = io({
      path: "/api/socket",
      withCredentials: true,
      autoConnect: false,
      transports: ["websocket"],
      timeout: 8000,
      reconnectionAttempts: 5,
    });
  }

  return socketClient;
}

function retainSocket(socket: Socket) {
  activeSubscribers += 1;

  if (disconnectTimer) {
    clearTimeout(disconnectTimer);
    disconnectTimer = null;
  }

  if (!socket.connected && !socket.active) {
    socket.connect();
  }
}

function releaseSocket(socket: Socket) {
  activeSubscribers = Math.max(0, activeSubscribers - 1);

  if (activeSubscribers > 0 || disconnectTimer) {
    return;
  }

  disconnectTimer = setTimeout(() => {
    if (activeSubscribers === 0 && socket.connected) {
      socket.disconnect();
    }
    disconnectTimer = null;
  }, 1500);
}

function useRealtimeEvents(
  joinEvent: "project:join" | "task:join",
  joinPayload: Record<string, string> | null,
  handlers: EventHandlers,
) {
  const socket = useMemo(() => getSocket(), []);
  const handlersRef = useRef(handlers);

  useEffect(() => {
    handlersRef.current = handlers;
  });

  useEffect(() => {
    if (!joinPayload) {
      return;
    }

    retainSocket(socket);

    const join = () => socket.emit(joinEvent, joinPayload);

    if (socket.connected) {
      join();
    } else {
      socket.once("connect", join);
    }

    const boundHandlers = Object.keys(handlersRef.current).map((eventName) => {
      const handler = (payload: unknown) => {
        handlersRef.current[eventName]?.(payload);
      };

      socket.on(eventName, handler);
      return { eventName, handler };
    });

    return () => {
      socket.off("connect", join);
      boundHandlers.forEach(({ eventName, handler }) => {
        socket.off(eventName, handler);
      });
      releaseSocket(socket);
    };
  }, [joinEvent, joinPayload, socket]);
}

export function useProjectRealtime(
  projectId: string | null,
  handlers: EventHandlers,
) {
  const joinPayload = useMemo(() => (projectId ? { projectId } : null), [projectId]);

  useRealtimeEvents(
    "project:join",
    joinPayload,
    handlers,
  );
}

export function useTaskRealtime(taskId: string | null, handlers: EventHandlers) {
  const joinPayload = useMemo(() => (taskId ? { taskId } : null), [taskId]);

  useRealtimeEvents("task:join", joinPayload, handlers);
}
