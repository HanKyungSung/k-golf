import WebSocket from 'ws';
import { EventEmitter } from 'events';
import { Logger } from './logger';

export interface ThermalCommand {
  type: 'text' | 'bold' | 'align' | 'size' | 'line' | 'cut' | 'newline';
  value?: string | number | boolean;
}

export interface PrintJob {
  id: string;
  type: 'receipt' | 'seat-bill';
  commands: ThermalCommand[];
}

export class WebSocketClient extends EventEmitter {
  private ws: WebSocket | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private isConnecting = false;
  private shouldReconnect = true;
  private logger: Logger;

  constructor(
    private serverUrl: string,
    private reconnectInterval: number = 5000
  ) {
    super();
    this.logger = new Logger('WebSocket');
  }

  async connect(): Promise<void> {
    if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.OPEN)) {
      return;
    }

    this.isConnecting = true;
    this.logger.info('Connecting to backend...', { url: this.serverUrl });

    try {
      // Connect to WebSocket endpoint
      const wsUrl = `${this.serverUrl}/print-jobs`;
      this.ws = new WebSocket(wsUrl, {
        headers: {
          'X-Client-Type': 'print-server',
          'X-Client-Version': '1.0.0'
        }
      });

      this.ws.on('open', () => {
        this.logger.info('WebSocket connected');
        this.isConnecting = false;
        this.emit('connected');
        
        // Send registration message
        this.send({
          type: 'register',
          clientType: 'print-server'
        });
      });

      this.ws.on('message', (data: WebSocket.Data) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleMessage(message);
        } catch (error) {
          this.logger.error('Failed to parse message', error);
        }
      });

      this.ws.on('close', (code, reason) => {
        this.logger.warn('WebSocket closed', { code, reason: reason.toString() });
        this.ws = null;
        this.isConnecting = false;
        this.emit('disconnected');
        this.scheduleReconnect();
      });

      this.ws.on('error', (error) => {
        this.logger.error('WebSocket error', error);
        this.isConnecting = false;
      });

      this.ws.on('ping', () => {
        this.ws?.pong();
      });

    } catch (error) {
      this.logger.error('Failed to connect', error);
      this.isConnecting = false;
      this.scheduleReconnect();
    }
  }

  private handleMessage(message: any): void {
    switch (message.type) {
      case 'print-job':
        this.emit('print-job', message.job as PrintJob);
        break;
      
      case 'ping':
        this.send({ type: 'pong' });
        break;
      
      case 'registered':
        this.logger.info('Successfully registered with backend');
        break;
      
      case 'connected':
        // Backend confirmation message
        this.logger.info('Backend confirmed connection', { message: message.message });
        break;
      
      default:
        this.logger.warn('Unknown message type', { type: message.type });
    }
  }

  private scheduleReconnect(): void {
    if (!this.shouldReconnect || this.reconnectTimer) {
      return;
    }

    this.logger.info(`Reconnecting in ${this.reconnectInterval}ms...`);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, this.reconnectInterval);
  }

  send(data: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    } else {
      this.logger.warn('Cannot send - WebSocket not connected');
    }
  }

  sendJobStatus(jobId: string, status: 'completed' | 'failed', error?: string): void {
    this.send({
      type: 'job-status',
      jobId,
      status,
      error,
      timestamp: new Date().toISOString()
    });
  }

  async disconnect(): Promise<void> {
    this.shouldReconnect = false;
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.logger.info('Disconnected');
  }
}
