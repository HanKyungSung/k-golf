import { EventEmitter } from 'events';
import { Logger } from './logger';
import * as https from 'https';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

export class UpdateService extends EventEmitter {
  private checkTimer: NodeJS.Timeout | null = null;
  private logger: Logger;

  constructor(
    private serverUrl: string,
    private currentVersion: string,
    private checkInterval: number = 6 * 60 * 60 * 1000 // 6 hours
  ) {
    super();
    this.logger = new Logger('Updater');
  }

  startChecking(): void {
    this.logger.info('Update checking enabled', {
      interval: `${this.checkInterval / 1000}s`,
      currentVersion: this.currentVersion
    });

    // Check immediately on start
    this.checkForUpdates();

    // Then check periodically
    this.checkTimer = setInterval(() => {
      this.checkForUpdates();
    }, this.checkInterval);
  }

  stopChecking(): void {
    if (this.checkTimer) {
      clearInterval(this.checkTimer);
      this.checkTimer = null;
      this.logger.info('Update checking stopped');
    }
  }

  private async checkForUpdates(): Promise<void> {
    try {
      this.logger.info('Checking for updates...');

      const versionInfo = await this.fetchVersionInfo();
      
      if (this.isNewerVersion(versionInfo.version, this.currentVersion)) {
        this.logger.info('Update available', {
          current: this.currentVersion,
          latest: versionInfo.version
        });

        this.emit('update-available', versionInfo.version);

        // Auto-download and install
        if (versionInfo.autoUpdate) {
          await this.downloadAndInstall(versionInfo);
        }
      } else {
        this.logger.info('Already up to date', { version: this.currentVersion });
      }

    } catch (error) {
      this.logger.error('Update check failed', error);
    }
  }

  private async fetchVersionInfo(): Promise<any> {
    return new Promise((resolve, reject) => {
      const url = `${this.serverUrl}/api/printer-updates/version.json`;
      
      https.get(url, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            const versionInfo = JSON.parse(data);
            resolve(versionInfo);
          } catch (error) {
            reject(new Error('Failed to parse version info'));
          }
        });

      }).on('error', (error) => {
        reject(error);
      });
    });
  }

  private isNewerVersion(latest: string, current: string): boolean {
    const latestParts = latest.split('.').map(Number);
    const currentParts = current.split('.').map(Number);

    for (let i = 0; i < Math.max(latestParts.length, currentParts.length); i++) {
      const l = latestParts[i] || 0;
      const c = currentParts[i] || 0;
      
      if (l > c) return true;
      if (l < c) return false;
    }

    return false;
  }

  private async downloadAndInstall(versionInfo: any): Promise<void> {
    try {
      this.logger.info('Downloading update...', { version: versionInfo.version });

      const platform = process.platform;
      const isWindows = platform === 'win32';
      const newExeName = isWindows ? 'k-golf-printer-new.exe' : 'k-golf-printer-new';
      const updatePath = path.join(process.cwd(), newExeName);
      
      await this.downloadFile(versionInfo.downloadUrl, updatePath);

      this.logger.info('Update downloaded, preparing to install...');

      const currentExe = process.execPath;
      
      if (isWindows) {
        // Windows update script
        const updateScript = path.join(process.cwd(), 'update.bat');
        const scriptContent = `
@echo off
echo Updating K-Golf Print Server...
timeout /t 2 /nobreak > nul
move /y "${updatePath}" "${currentExe}"
echo Update complete!
start "" "${currentExe}"
exit
`;
        fs.writeFileSync(updateScript, scriptContent);

        this.logger.info('Update ready, restarting...');
        this.emit('update-ready', versionInfo.version);

        // Execute update script and exit
        execSync(`start /min cmd /c "${updateScript}"`, {
          detached: true,
          stdio: 'ignore'
        });
      } else {
        // macOS/Linux update script
        const updateScript = path.join(process.cwd(), 'update.sh');
        const scriptContent = `#!/bin/bash
echo "Updating K-Golf Print Server..."
sleep 2
mv -f "${updatePath}" "${currentExe}"
chmod +x "${currentExe}"
echo "Update complete!"
"${currentExe}" &
`;
        fs.writeFileSync(updateScript, scriptContent);
        fs.chmodSync(updateScript, '755');

        this.logger.info('Update ready, restarting...');
        this.emit('update-ready', versionInfo.version);

        // Execute update script and exit
        execSync(`"${updateScript}" &`, {
          detached: true,
          stdio: 'ignore'
        });
      }

      // Exit current process to allow update
      setTimeout(() => {
        process.exit(0);
      }, 1000);

    } catch (error) {
      this.logger.error('Update installation failed', error);
      this.emit('update-failed', error);
    }
  }

  private async downloadFile(url: string, dest: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const file = fs.createWriteStream(dest);

      https.get(url, (response) => {
        response.pipe(file);

        file.on('finish', () => {
          file.close();
          resolve();
        });

      }).on('error', (error) => {
        fs.unlink(dest, () => {}); // Delete partial file
        reject(error);
      });
    });
  }
}
