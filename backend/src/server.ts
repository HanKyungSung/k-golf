import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import pino from 'pino';
import { bookingRouter } from './routes/booking';
import { authRouter } from './routes/auth';
import cookieParser from 'cookie-parser';

const app = express();
const logger = pino({ transport: { target: 'pino-pretty' } });

app.use(cors({ origin: process.env.CORS_ORIGIN?.split(',') || '*'}));
app.use(express.json());
app.use(cookieParser());

app.get('/health', (_req, res) => {
  res.json({ ok: true, uptime: process.uptime() });
});

app.use('/api/auth', authRouter);
app.use('/api/bookings', bookingRouter);

const port = process.env.PORT || 8080;
app.listen(port, () => {
  logger.info(`Backend listening on port ${port}`);
});
