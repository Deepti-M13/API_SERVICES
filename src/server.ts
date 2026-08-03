// =============================================================
// Life OS — Server Entry Point
// Starts HTTP server
// =============================================================

import app from './app.js';
import { env } from './config/env.js';

async function start() {
  try {
    // Start server
    const server = app.listen(env.API_PORT, () => {
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

    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('\nSIGTERM received. Shutting down gracefully...');
      server.close(() => {
        console.log('Server closed');
        process.exit(0);
      });
    });

    process.on('SIGINT', () => {
      console.log('\nSIGINT received. Shutting down gracefully...');
      server.close(() => {
        console.log('Server closed');
        process.exit(0);
      });
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

start();
