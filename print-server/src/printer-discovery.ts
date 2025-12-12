import { Logger } from './logger';
import * as dgram from 'dgram';
import * as net from 'net';

export interface DiscoveredPrinter {
  ip: string;
  port: number;
  type?: string;
  manufacturer?: string;
}

export class PrinterDiscovery {
  private logger: Logger;

  constructor() {
    this.logger = new Logger('Discovery');
  }

  /**
   * Scan local network for thermal printers
   * Checks common printer ports (9100 for ESC/POS)
   */
  async scanNetwork(): Promise<DiscoveredPrinter[]> {
    this.logger.info('Scanning network for printers...');
    
    const localIP = this.getLocalIP();
    if (!localIP) {
      this.logger.error('Could not determine local IP');
      return [];
    }

    const subnet = this.getSubnet(localIP);
    this.logger.info(`Scanning subnet: ${subnet}.0/24`);

    const printers: DiscoveredPrinter[] = [];
    const scanPromises: Promise<void>[] = [];

    // Scan all IPs in subnet
    for (let i = 1; i < 255; i++) {
      const ip = `${subnet}.${i}`;
      scanPromises.push(
        this.checkPrinter(ip, 9100).then(isOpen => {
          if (isOpen) {
            this.logger.info(`Found printer at ${ip}:9100`);
            printers.push({ ip, port: 9100 });
          }
        })
      );
    }

    await Promise.all(scanPromises);
    
    this.logger.info(`Found ${printers.length} printer(s)`);
    return printers;
  }

  /**
   * Check if a printer is accessible at IP:port
   */
  private checkPrinter(ip: string, port: number): Promise<boolean> {
    return new Promise((resolve) => {
      const socket = new net.Socket();
      const timeout = 1000; // 1 second timeout

      socket.setTimeout(timeout);

      socket.on('connect', () => {
        socket.destroy();
        resolve(true);
      });

      socket.on('timeout', () => {
        socket.destroy();
        resolve(false);
      });

      socket.on('error', () => {
        socket.destroy();
        resolve(false);
      });

      socket.connect(port, ip);
    });
  }

  /**
   * Get local machine's IP address
   */
  private getLocalIP(): string | null {
    const { networkInterfaces } = require('os');
    const nets = networkInterfaces();

    for (const name of Object.keys(nets)) {
      for (const net of nets[name]) {
        // Skip internal and non-IPv4
        if (net.family === 'IPv4' && !net.internal) {
          return net.address;
        }
      }
    }

    return null;
  }

  /**
   * Extract subnet from IP (e.g., 192.168.1.100 → 192.168.1)
   */
  private getSubnet(ip: string): string {
    const parts = ip.split('.');
    return parts.slice(0, 3).join('.');
  }

  /**
   * Discover printer using mDNS/Bonjour (for printers that support it)
   */
  async discoverViaMDNS(): Promise<DiscoveredPrinter[]> {
    // Note: Requires 'bonjour' package
    // npm install bonjour
    this.logger.info('Scanning via mDNS...');

    try {
      const Bonjour = require('bonjour');
      const bonjour = Bonjour();
      
      return new Promise((resolve) => {
        const printers: DiscoveredPrinter[] = [];
        
        // Look for _printer._tcp service type
        const browser = bonjour.find({ type: 'printer' });

        browser.on('up', (service: any) => {
          this.logger.info(`Found mDNS printer: ${service.name} at ${service.host}`);
          printers.push({
            ip: service.referer.address,
            port: service.port,
            type: service.txt?.ty,
            manufacturer: service.txt?.mfg
          });
        });

        // Wait 5 seconds for responses
        setTimeout(() => {
          browser.stop();
          resolve(printers);
        }, 5000);
      });
    } catch (error) {
      this.logger.warn('mDNS discovery not available (install bonjour package)');
      return [];
    }
  }

  /**
   * Auto-discover and return best printer
   */
  async findPrinter(): Promise<string | null> {
    this.logger.info('Starting printer auto-discovery...');

    // Try mDNS first (faster if printer supports it)
    try {
      const mdnsPrinters = await this.discoverViaMDNS();
      if (mdnsPrinters.length > 0) {
        const printer = mdnsPrinters[0];
        this.logger.info(`Using mDNS discovered printer: ${printer.ip}:${printer.port}`);
        return `tcp://${printer.ip}:${printer.port}`;
      }
    } catch (error) {
      this.logger.debug('mDNS discovery failed, falling back to network scan');
    }

    // Fall back to network scan
    const printers = await this.scanNetwork();
    
    if (printers.length === 0) {
      this.logger.error('No printers found on network');
      return null;
    }

    if (printers.length === 1) {
      const printer = printers[0];
      this.logger.info(`Using discovered printer: ${printer.ip}:${printer.port}`);
      return `tcp://${printer.ip}:${printer.port}`;
    }

    // Multiple printers found - log them all
    this.logger.warn(`Multiple printers found (${printers.length}):`);
    printers.forEach((p, i) => {
      this.logger.info(`  ${i + 1}. ${p.ip}:${p.port}`);
    });
    
    // Use first one by default
    const printer = printers[0];
    this.logger.info(`Using first printer: ${printer.ip}:${printer.port}`);
    return `tcp://${printer.ip}:${printer.port}`;
  }
}
