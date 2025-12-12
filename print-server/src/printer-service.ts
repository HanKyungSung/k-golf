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
        characterSet: this.config.characterSet || 'PC437_USA',
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
        // Keep printer object for formatting, but don't fail
        return;
      }

      this.logger.info('Printer initialized', { interface: this.config.interface });
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
              characterSet: this.config.characterSet || 'PC437_USA',
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
            return;
          }
        } catch (discoveryError) {
          this.logger.error('Auto-discovery fallback failed', discoveryError);
        }
      }
      
      // Don't throw - allow running in simulation mode
      this.logger.warn('No printer available - running in SIMULATION mode (will log output only)');
    }
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

      // DEBUG MODE: Log output instead of sending to printer
      const output = await this.printer.getText();
      this.logger.info('Print job formatted (DEBUG MODE - not sent to printer)', { jobId: job.id });
      this.logger.info('\n=== RECEIPT OUTPUT ===\n' + output + '\n=== END RECEIPT ===\n');

      // Uncomment to actually print:
      // await this.printer.execute();
      // this.logger.info('Print executed successfully', { jobId: job.id });

    } catch (error) {
      this.logger.error('Print failed', { jobId: job.id, error });
      throw error;
    }
  }

  private async printReceipt(job: PrintJob): Promise<void> {
    const { data } = job;
    const printer = this.printer!;

    // Header
    printer.alignCenter();
    printer.setTextSize(1, 1);
    printer.bold(true);
    printer.println('K-GOLF');
    printer.bold(false);
    printer.setTextNormal();
    printer.println('Golf Simulator');
    printer.drawLine();
    printer.newLine();

    // Receipt number
    printer.alignLeft();
    printer.println(`Receipt: ${data.receiptNumber || 'N/A'}`);
    printer.println(`Date: ${data.date}`);
    if (data.customerName) {
      printer.println(`Customer: ${data.customerName}`);
    }
    if (data.roomName) {
      printer.println(`Room: ${data.roomName}`);
    }
    printer.drawLine();
    printer.newLine();

    // Items
    printer.bold(true);
    printer.tableCustom([
      { text: 'Item', align: 'LEFT', width: 0.5 },
      { text: 'Qty', align: 'CENTER', width: 0.2 },
      { text: 'Price', align: 'RIGHT', width: 0.3 }
    ]);
    printer.bold(false);
    printer.drawLine();

    for (const item of data.items) {
      printer.tableCustom([
        { text: item.name, align: 'LEFT', width: 0.5 },
        { text: item.quantity.toString(), align: 'CENTER', width: 0.2 },
        { text: `$${item.price.toFixed(2)}`, align: 'RIGHT', width: 0.3 }
      ]);
    }

    printer.drawLine();
    printer.newLine();

    // Totals
    printer.alignRight();
    printer.println(`Subtotal: $${data.subtotal.toFixed(2)}`);
    printer.println(`Tax: $${data.tax.toFixed(2)}`);
    printer.bold(true);
    printer.setTextSize(1, 1);
    printer.println(`TOTAL: $${data.total.toFixed(2)}`);
    printer.bold(false);
    printer.setTextNormal();
    printer.newLine();

    // Footer
    printer.alignCenter();
    printer.drawLine();
    printer.println('Thank you for visiting K-Golf!');
    printer.newLine();
    printer.setTextSize(0, 0);
    printer.println('Printed: ' + new Date().toLocaleString());
    printer.newLine();

    // Cut paper
    printer.cut();
  }

  private async printSeatBill(job: PrintJob): Promise<void> {
    const { data } = job;
    const printer = this.printer!;

    // Header
    printer.alignCenter();
    printer.setTextSize(1, 1);
    printer.bold(true);
    printer.println(data.seatName || 'Seat Bill');
    printer.bold(false);
    printer.setTextNormal();
    printer.drawLine();
    printer.newLine();

    // Info
    printer.alignLeft();
    if (data.customerName) {
      printer.println(`Customer: ${data.customerName}`);
    }
    if (data.roomName) {
      printer.println(`Room: ${data.roomName}`);
    }
    printer.println(`Date: ${data.date}`);
    printer.drawLine();
    printer.newLine();

    // Items
    printer.bold(true);
    printer.tableCustom([
      { text: 'Item', align: 'LEFT', width: 0.6 },
      { text: 'Qty', align: 'CENTER', width: 0.2 },
      { text: 'Price', align: 'RIGHT', width: 0.2 }
    ]);
    printer.bold(false);

    for (const item of data.items) {
      printer.tableCustom([
        { text: item.name, align: 'LEFT', width: 0.6 },
        { text: item.quantity.toString(), align: 'CENTER', width: 0.2 },
        { text: `$${item.price.toFixed(2)}`, align: 'RIGHT', width: 0.2 }
      ]);
    }

    printer.newLine();
    printer.drawLine();

    // Total
    printer.alignRight();
    printer.bold(true);
    printer.setTextSize(1, 1);
    printer.println(`TOTAL: $${data.total.toFixed(2)}`);
    printer.bold(false);
    printer.setTextNormal();
    printer.newLine();

    // Footer
    printer.alignCenter();
    printer.println('K-Golf');
    printer.newLine();

    // Cut paper
    printer.cut();
  }

  async close(): Promise<void> {
    this.printer = null;
    this.logger.info('Printer service closed');
  }
}
