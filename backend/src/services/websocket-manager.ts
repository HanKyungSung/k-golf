import { WebSocketServer, WebSocket } from 'ws';
import { Server as HttpServer } from 'http';
import pino from 'pino';

const logger = pino({ name: 'WebSocketManager' });

export interface ThermalCommand {
  type: 'text' | 'bold' | 'align' | 'size' | 'line' | 'cut' | 'newline';
  value?: string | number | boolean;
}

export interface PrintJob {
  id: string;
  type: 'receipt' | 'seat-bill';
  commands: ThermalCommand[];
}

export interface JobStatusMessage {
  type: 'job-status';
  jobId: string;
  status: 'completed' | 'failed';
  error?: string;
}

export class WebSocketManager {
  private wss: WebSocketServer;
  private clients: Set<WebSocket> = new Set();

  constructor(server: HttpServer) {
    this.wss = new WebSocketServer({ server });

    this.wss.on('connection', (ws: WebSocket) => {
      logger.info('Print server connected');
      this.clients.add(ws);

      ws.on('message', (data: Buffer) => {
        try {
          const message = JSON.parse(data.toString()) as JobStatusMessage;
          if (message.type === 'job-status') {
            logger.info('Job status received', {
              jobId: message.jobId,
              status: message.status,
              error: message.error
            });
            // TODO: Store job status in database or emit event
          }
        } catch (error) {
          logger.error('Failed to parse WebSocket message', error);
        }
      });

      ws.on('close', () => {
        logger.info('Print server disconnected');
        this.clients.delete(ws);
      });

      ws.on('error', (error) => {
        logger.error('WebSocket error', error);
        this.clients.delete(ws);
      });

      // Send connection confirmation
      ws.send(JSON.stringify({ type: 'connected', message: 'Connected to K-Golf backend' }));
    });

    logger.info('WebSocket server initialized');
  }

  /**
   * Broadcast a print job to all connected print servers
   */
  broadcastPrintJob(job: PrintJob): void {
    const message = JSON.stringify({
      type: 'print-job',
      job
    });

    let sentCount = 0;
    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
        sentCount++;
      }
    });

    logger.info('Print job broadcasted', {
      jobId: job.id,
      type: job.type,
      clients: sentCount
    });

    if (sentCount === 0) {
      logger.warn('No print servers connected to receive job', { jobId: job.id });
    }
  }

  /**
   * Get count of connected print servers
   */
  getConnectedCount(): number {
    return Array.from(this.clients).filter(
      (client) => client.readyState === WebSocket.OPEN
    ).length;
  }

  /**
   * Close all connections
   */
  close(): void {
    this.clients.forEach((client) => {
      client.close();
    });
    this.wss.close();
    logger.info('WebSocket server closed');
  }
}
