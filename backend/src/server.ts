import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import pino from 'pino';
import path from 'path';
import { bookingRouter } from './routes/booking';
import bookingSimpleRouter from './routes/bookingSimple';
import { authRouter } from './routes/auth';
import settingsRouter from './routes/settings';
import usersRouter from './routes/users';
import menuRouter from './routes/menu';
import cookieParser from 'cookie-parser';

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

// Serve frontend static files (after API routes to avoid conflicts)
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
app.listen(port, () => {
  logger.info(`Backend listening on port ${port}`);
  logger.info(`Serving static files from ${publicPath}`);
});
