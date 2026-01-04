import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import pino from 'pino';
import path from 'path';
import http from 'http';
import { bookingRouter } from './routes/booking';
import bookingSimpleRouter from './routes/bookingSimple';
import { authRouter } from './routes/auth';
import settingsRouter from './routes/settings';
import usersRouter from './routes/users';
import menuRouter from './routes/menu';
import receiptRouter from './routes/receipt';
import { printRouter } from './routes/print';
import contactRouter from './routes/contact';
import cookieParser from 'cookie-parser';
import { WebSocketManager } from './services/websocket-manager';

const app = express();
const logger = pino({ transport: { target: 'pino-pretty' } });

app.use(cors({ origin: process.env.CORS_ORIGIN?.split(',') || '*', credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.get('/health', (_req, res) => {
  res.json({ ok: true, uptime: process.uptime() });
});

// API routes
app.use('/api/auth', authRouter);
app.use('/api/bookings', bookingRouter);
app.use('/api/bookings/simple', bookingSimpleRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/users', usersRouter);
app.use('/api/menu', menuRouter);
app.use('/api/receipts', receiptRouter);
app.use('/api/print', printRouter);
app.use('/api/contact', contactRouter);

// Serve frontend static files (after API routes to avoid conflicts)
// With rootDir='.', structure is: dist/src/server.js and dist/public/
// From dist/src/, we go ../public to reach dist/public/
const publicPath = path.join(__dirname, '../public');
app.use(express.static(publicPath, {
  maxAge: '1h', // Cache static assets for 1 hour
  etag: true,
}));

// SPA fallback - serve index.html for all non-API routes
app.get('*', (_req, res) => {
  res.sendFile(path.join(publicPath, 'index.html'));
});

const port = process.env.PORT || 8080;

// Create HTTP server from Express app
const server = http.createServer(app);

// Initialize WebSocket server
let wsManager: WebSocketManager;
try {
  wsManager = new WebSocketManager(server);
  logger.info('WebSocket server initialized for print services');
} catch (error) {
  logger.error({ err: error }, 'Failed to initialize WebSocket server');
  process.exit(1);
}

// Export function to get WebSocket manager (for routes)
export function getWebSocketManager(): WebSocketManager {
  return wsManager;
}

// Start server
server.listen(port, () => {
  logger.info(`Backend listening on port ${port}`);
  logger.info(`Serving static files from ${publicPath}`);
  logger.info(`WebSocket available for print servers`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, closing server...');
  wsManager.close();
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});
