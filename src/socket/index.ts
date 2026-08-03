// =============================================================
// Life OS — Socket.io Setup
// Real-time communication layer
// =============================================================

import { Server as HttpServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import type { JwtPayload } from '../core/middleware/auth.middleware.js';

let io: SocketServer | null = null;

export function setupSocket(httpServer: HttpServer): SocketServer {
  io = new SocketServer(httpServer, {
    cors: {
      origin: env.CLIENT_URL,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // Authentication middleware for WebSocket
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication required'));
    }

    try {
      const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
      socket.data.user = decoded;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.data.user?.userId;
    if (!userId) {
      socket.disconnect();
      return;
    }

    console.log(`🔌 User connected: ${userId}`);

    // Join user's personal room
    socket.join(`user:${userId}`);

    // Handle workspace rooms
    socket.on('workspace:join', (workspaceId: string) => {
      socket.join(`workspace:${workspaceId}`);
    });

    socket.on('workspace:leave', (workspaceId: string) => {
      socket.leave(`workspace:${workspaceId}`);
    });

    socket.on('disconnect', () => {
      console.log(`🔌 User disconnected: ${userId}`);
    });
  });

  console.log('✅ Socket.io initialized');
  return io;
}

// Emit helpers for other modules
export function emitToUser(userId: string, event: string, data: unknown): void {
  io?.to(`user:${userId}`).emit(event, data);
}

export function emitToWorkspace(workspaceId: string, event: string, data: unknown): void {
  io?.to(`workspace:${workspaceId}`).emit(event, data);
}

export function getIO(): SocketServer | null {
  return io;
}
