import { ThermalPrinter, PrinterTypes } from 'node-thermal-printer';
import { Logger } from './logger';
import type { PrintJob } from './websocket-client';

export interface PrinterConfig {
  type: string;
  interface: string;
  characterSet?: string;
  removeSpecialCharacters?: boolean;
  lineCharacter?: string;
  width?: number;
}

export class PrinterService {
  private printer: ThermalPrinter | null = null;
  private logger: Logger;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private lastConnectionStatus: boolean = false;

  constructor(private config: PrinterConfig) {
    this.logger = new Logger('Printer');
  }

  async initialize(): Promise<void> {
    try {
      // Map config type to PrinterTypes enum
      const printerType = this.getPrinterType(this.config.type);

      this.printer = new ThermalPrinter({
        type: printerType,
        interface: this.config.interface,
        characterSet: (this.config.characterSet || 'PC437_USA') as any,
        removeSpecialCharacters: this.config.removeSpecialCharacters ?? false,
        lineCharacter: this.config.lineCharacter || '-',
        width: this.config.width || 48,
        options: {
          timeout: 5000
        }
      });

      // Test connection
      const isConnected = await this.printer.isPrinterConnected();
      if (!isConnected) {
        this.logger.warn('Printer not connected - running in SIMULATION mode');
        this.lastConnectionStatus = false;
        // Keep printer object for formatting, but don't fail
        return;
      }

      this.logger.info('Printer initialized', { interface: this.config.interface });
      this.lastConnectionStatus = true;
    } catch (error) {
      this.logger.error('Failed to initialize printer', error);
      
      // Try auto-discovery as fallback
      if (this.config.interface !== 'auto') {
        this.logger.warn(`Saved printer ${this.config.interface} not reachable, trying auto-discovery...`);
        
        try {
          const { PrinterDiscovery } = require('./printer-discovery');
          const { updateConfig } = require('./config');
          
          const discovery = new PrinterDiscovery();
          const discoveredInterface = await discovery.findPrinter();
          
          if (discoveredInterface) {
            this.logger.info(`Auto-discovered new printer: ${discoveredInterface}`);
            this.config.interface = discoveredInterface;
            
            // Retry initialization with new interface
            this.printer = new ThermalPrinter({
              type: this.getPrinterType(this.config.type),
              interface: discoveredInterface,
              characterSet: (this.config.characterSet || 'PC437_USA') as any,
              removeSpecialCharacters: this.config.removeSpecialCharacters ?? false,
              lineCharacter: this.config.lineCharacter || '-',
              width: this.config.width || 48,
              options: {
                timeout: 5000
              }
            });
            
            const isConnectedRetry = await this.printer.isPrinterConnected();
            if (!isConnectedRetry) {
              this.logger.warn('Auto-discovered printer not connected - running in SIMULATION mode');
              this.lastConnectionStatus = false;
              return;
            }
            
            // Save new IP to config
            updateConfig({
              printer: {
                ...this.config,
                interface: discoveredInterface
              }
            });
            this.logger.info(`Updated config with new printer: ${discoveredInterface}`);
            this.lastConnectionStatus = true;
            return;
          }
        } catch (discoveryError) {
          this.logger.error('Auto-discovery fallback failed', discoveryError);
        }
      }
      
      // Don't throw - allow running in simulation mode
      this.logger.warn('No printer available - running in SIMULATION mode (will log output only)');
    }
    
    // Start periodic health checks
    this.startHealthCheck();
  }

  private getPrinterType(type: string): PrinterTypes {
    switch (type.toLowerCase()) {
      case 'epson':
        return PrinterTypes.EPSON;
      case 'star':
        return PrinterTypes.STAR;
      case 'tanca':
        return PrinterTypes.TANCA;
      default:
        return PrinterTypes.EPSON;
    }
  }

  async print(job: PrintJob): Promise<void> {
    if (!this.printer) {
      throw new Error('Printer not initialized');
    }

    try {
      this.printer.clear();

      // Execute commands from backend
      for (const cmd of job.commands) {
        switch (cmd.type) {
          case 'text':
            this.printer.print(cmd.value as string);
            break;
          case 'bold':
            this.printer.bold(cmd.value as boolean);
            break;
          case 'align':
            if (cmd.value === 'left') this.printer.alignLeft();
            else if (cmd.value === 'center') this.printer.alignCenter();
            else if (cmd.value === 'right') this.printer.alignRight();
            break;
          case 'size':
            const [width, height] = (cmd.value as string).split(',').map(Number);
            this.printer.setTextSize(width, height);
            break;
          case 'line':
            this.printer.drawLine();
            break;
          case 'newline':
            this.printer.newLine();
            break;
          case 'cut':
            this.printer.cut();
            break;
        }
      }

      // Check if printer is actually connected
      const isConnected = await this.printer.isPrinterConnected();
      
      if (!isConnected) {
        // SIMULATION MODE: Only log output when printer is not connected
        const output = await this.printer.getText();
        this.logger.warn('Printer not connected - SIMULATION MODE (logging output only)', { jobId: job.id });
        this.logger.info('\n=== RECEIPT OUTPUT ===\n' + output + '\n=== END RECEIPT ===\n');
      } else {
        // Execute actual print to thermal printer
        await this.printer.execute();
        this.logger.info('Print executed successfully', { jobId: job.id });
      }

    } catch (error) {
      this.logger.error('Print failed', { jobId: job.id, error });
      throw error;
    }
  }

  async close(): Promise<void> {
    // Stop health checks
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
    
    this.printer = null;
    this.logger.info('Printer service closed');
  }

  /**
   * Start periodic health checks for printer connection
   * Only logs when connection status changes
   */
  private startHealthCheck(): void {
    // Check every 60 seconds
    this.healthCheckInterval = setInterval(async () => {
      if (!this.printer) return;

      try {
        const isConnected = await this.printer.isPrinterConnected();
        
        // Only log if status changed
        if (isConnected !== this.lastConnectionStatus) {
          if (isConnected) {
            this.logger.info(`✅ Printer reconnected (${this.config.interface})`);
          } else {
            this.logger.warn(`⚠️  Printer disconnected (${this.config.interface}) - switching to simulation mode`);
          }
          this.lastConnectionStatus = isConnected;
        }
      } catch (error) {
        if (this.lastConnectionStatus) {
          this.logger.error('Printer health check failed', error);
          this.lastConnectionStatus = false;
        }
      }
    }, 60000); // 60 seconds

    this.logger.info('Printer health check started (60s interval)');
  }
}
