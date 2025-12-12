#!/usr/bin/env node

/**
 * K-Golf Print Server
 * Connects to backend WebSocket and prints receipts to thermal printer
 */

import { WebSocketClient } from './websocket-client';
import { PrinterService } from './printer-service';
import { UpdateService } from './update-service';
import { PrinterDiscovery } from './printer-discovery';
import { Logger } from './logger';
import { loadConfig } from './config';

const VERSION = '1.0.0';

async function main() {
  const logger = new Logger('Main');
  logger.info(`K-Golf Print Server v${VERSION} starting...`);
  logger.info('Testing printer auto-discovery...\n');

  try {
    // Load configuration
    const config = loadConfig();
    logger.info('Configuration loaded', { serverUrl: config.serverUrl });

    // Auto-discover printer if interface is "auto"
    if (config.printer.interface === 'auto') {
      logger.info('Auto-discovery enabled, scanning for printers...');
      const discovery = new PrinterDiscovery();
      const discoveredInterface = await discovery.findPrinter();
      
      if (discoveredInterface) {
        config.printer.interface = discoveredInterface;
        logger.info(`Auto-discovered printer: ${discoveredInterface}`);
        
        // Save discovered IP to config for future use
        const { updateConfig } = require('./config');
        updateConfig({
          printer: {
            ...config.printer,
            interface: discoveredInterface
          }
        });
        logger.info(`Saved printer to config: ${discoveredInterface}`);
        logger.info('\n✅ Discovery test completed successfully!');
        logger.info('Check config.json - the printer IP should be saved there.');
      } else {
        logger.error('❌ No printer found on network.');
        logger.info('Make sure:');
        logger.info('  1. Printer is powered on');
        logger.info('  2. Printer is connected to the same network');
        logger.info('  3. Printer is listening on port 9100');
      }
    } else {
      logger.info(`Printer interface is already set: ${config.printer.interface}`);
    }

    // Initialize printer service
    const printerService = new PrinterService(config.printer);
    await printerService.initialize();
    logger.info('Printer service initialized');

    // Initialize WebSocket client
    const wsClient = new WebSocketClient(config.serverUrl, config.reconnectInterval);
    
    // Handle incoming print jobs
    wsClient.on('print-job', async (job) => {
      logger.info('Received print job', { jobId: job.id, type: job.type });
      try {
        await printerService.print(job);
        wsClient.sendJobStatus(job.id, 'completed');
        logger.info('Print job completed', { jobId: job.id });
      } catch (error) {
        logger.error('Print job failed', { jobId: job.id, error });
        wsClient.sendJobStatus(job.id, 'failed', (error as Error).message);
      }
    });

    // Connect to backend
    await wsClient.connect();
    logger.info('Connected to backend WebSocket');

    // Initialize update service (checks for updates periodically)
    const updateService = new UpdateService(
      config.serverUrl,
      VERSION,
      config.updateCheckInterval
    );
    updateService.on('update-available', (newVersion) => {
      logger.info(`Update available: ${newVersion}`);
    });
    updateService.startChecking();

    // Graceful shutdown
    process.on('SIGINT', async () => {
      logger.info('Shutting down...');
      updateService.stopChecking();
      await wsClient.disconnect();
      await printerService.close();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      logger.info('Received SIGTERM, shutting down...');
      updateService.stopChecking();
      await wsClient.disconnect();
      await printerService.close();
      process.exit(0);
    });

    logger.info('Print server running and ready to receive jobs');

  } catch (error) {
    logger.error('Failed to start print server', error);
    process.exit(1);
  }
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

main();
