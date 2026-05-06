import type { Server as HttpServer } from "node:http";
import { getToken } from "next-auth/jwt";
import { Server } from "socket.io";
import { ensureProjectMembership, ensureTaskAccess } from "@/lib/guards";
import { logger } from "@/lib/logger";
import { projectRoom, setRealtimeServer, taskRoom } from "@/lib/realtime-bus";

type AuthedSocketData = {
  userId: string;
  email?: string | null;
  name?: string | null;
};

export function attachRealtimeServer(httpServer: HttpServer) {
  const io = new Server(httpServer, {
    path: "/api/socket",
    cors: {
      origin: process.env.NEXTAUTH_URL ?? "http://localhost:3000",
      credentials: true,
    },
  });

  io.use(async (socket, next) => {
    try {
      const token = await getToken({
        req: socket.request as Parameters<typeof getToken>[0]["req"],
        secret: process.env.NEXTAUTH_SECRET,
      });

      if (!token?.sub) {
        logger.warn("realtime.auth_denied", { socketId: socket.id });
        next(new Error("Authentication required"));
        return;
      }

      socket.data.user = {
        userId: token.sub,
        email: token.email,
        name: token.name,
      } satisfies AuthedSocketData;
      next();
    } catch (error) {
      logger.error("realtime.auth_error", error);
      next(new Error("Realtime authentication failed"));
    }
  });

  io.on("connection", (socket) => {
    const user = socket.data.user as AuthedSocketData;
    logger.info("realtime.connected", { socketId: socket.id, userId: user.userId });

    socket.on("project:join", async ({ projectId }: { projectId: string }) => {
      try {
        await ensureProjectMembership({ userId: user.userId, projectId });
        await socket.join(projectRoom(projectId));
        socket.emit("project:joined", { projectId });
        logger.info("realtime.project_joined", {
          socketId: socket.id,
          userId: user.userId,
          projectId,
        });
      } catch (error) {
        logger.error("realtime.project_join_failed", error, {
          socketId: socket.id,
          userId: user.userId,
          projectId,
        });
        socket.emit("realtime:error", { message: "Project access denied" });
      }
    });

    socket.on("task:join", async ({ taskId }: { taskId: string }) => {
      try {
        await ensureTaskAccess(user.userId, taskId);
        await socket.join(taskRoom(taskId));
        const sockets = await io.in(taskRoom(taskId)).fetchSockets();
        io.to(taskRoom(taskId)).emit("presence:updated", {
          taskId,
          viewers: sockets.map((viewer) => viewer.data.user),
        });
        logger.info("realtime.task_joined", {
          socketId: socket.id,
          userId: user.userId,
          taskId,
        });
      } catch (error) {
        logger.error("realtime.task_join_failed", error, {
          socketId: socket.id,
          userId: user.userId,
          taskId,
        });
        socket.emit("realtime:error", { message: "Task access denied" });
      }
    });

    socket.on("disconnect", (reason) => {
      logger.info("realtime.disconnected", {
        socketId: socket.id,
        userId: user.userId,
        reason,
      });
    });
  });

  setRealtimeServer(io);
  logger.info("realtime.server_ready");
  return io;
}
