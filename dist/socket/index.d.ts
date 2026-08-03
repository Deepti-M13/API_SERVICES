import { Server as HttpServer } from 'http';
import { Server as SocketServer } from 'socket.io';
export declare function setupSocket(httpServer: HttpServer): SocketServer;
export declare function emitToUser(userId: string, event: string, data: unknown): void;
export declare function emitToWorkspace(workspaceId: string, event: string, data: unknown): void;
export declare function getIO(): SocketServer | null;
