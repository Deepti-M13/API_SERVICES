// =============================================================
// Life OS — Server Entry Point
// Starts HTTP server with Socket.io
// =============================================================
import { createServer } from 'http';
import app from './app.js';
import { env } from './config/env.js';
import { connectRedis, disconnectRedis } from './config/redis.js';
import { setupSocket } from './socket/index.js';
const httpServer = createServer(app);
// Setup Socket.io
setupSocket(httpServer);
async function start() {
    try {
        // Connect to Redis (optional, will log warning if unavailable)
        await connectRedis();
        // Start server
        httpServer.listen(env.API_PORT, () => {
            console.log(`
╔══════════════════════════════════════════╗
║         🚀 Life OS API Server            ║
║──────────────────────────────────────────║
║  Port:        ${String(env.API_PORT).padEnd(26)}║
║  Environment: ${env.NODE_ENV.padEnd(26)}║
║  URL:         ${env.API_URL.padEnd(26)}║
╚══════════════════════════════════════════╝
      `);
        });
    }
    catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}
// Graceful shutdown
async function shutdown(signal) {
    console.log(`\n${signal} received. Shutting down gracefully...`);
    httpServer.close(() => {
        console.log('HTTP server closed');
    });
    await disconnectRedis();
    console.log('Redis disconnected');
    process.exit(0);
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
start();
//# sourceMappingURL=server.js.map