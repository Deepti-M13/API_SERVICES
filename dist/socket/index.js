// =============================================================
// Life OS — Socket.io Setup
// Real-time communication layer
// =============================================================
import { Server as SocketServer } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
let io = null;
export function setupSocket(httpServer) {
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
            const decoded = jwt.verify(token, env.JWT_SECRET);
            socket.data.user = decoded;
            next();
        }
        catch {
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
        socket.on('workspace:join', (workspaceId) => {
            socket.join(`workspace:${workspaceId}`);
        });
        socket.on('workspace:leave', (workspaceId) => {
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
export function emitToUser(userId, event, data) {
    io?.to(`user:${userId}`).emit(event, data);
}
export function emitToWorkspace(workspaceId, event, data) {
    io?.to(`workspace:${workspaceId}`).emit(event, data);
}
export function getIO() {
    return io;
}
//# sourceMappingURL=index.js.map