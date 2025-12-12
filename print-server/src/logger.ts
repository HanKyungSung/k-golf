import * as fs from 'fs';
import * as path from 'path';

export class Logger {
  private logFile: string;

  constructor(private context: string) {
    this.logFile = path.join(process.cwd(), 'print-server.log');
  }

  private log(level: string, message: string, meta?: any): void {
    const timestamp = new Date().toISOString();
    const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
    const logMessage = `[${timestamp}] [${level}] [${this.context}] ${message}${metaStr}`;

    // Console output
    console.log(logMessage);

    // File output
    try {
      fs.appendFileSync(this.logFile, logMessage + '\n');
    } catch (error) {
      // Ignore file write errors
    }
  }

  info(message: string, meta?: any): void {
    this.log('INFO', message, meta);
  }

  warn(message: string, meta?: any): void {
    this.log('WARN', message, meta);
  }

  error(message: string, error?: any): void {
    const errorMeta = error instanceof Error 
      ? { message: error.message, stack: error.stack }
      : error;
    this.log('ERROR', message, errorMeta);
  }

  debug(message: string, meta?: any): void {
    this.log('DEBUG', message, meta);
  }
}
