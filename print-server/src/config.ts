import * as fs from 'fs';
import * as path from 'path';
import 'dotenv/config';

export interface Config {
  serverUrl: string;
  reconnectInterval: number;
  updateCheckInterval: number;
  printer: {
    type: string;
    interface: string;  // Can be "auto" for auto-discovery or "tcp://IP:PORT"
    characterSet?: string;
    removeSpecialCharacters?: boolean;
    lineCharacter?: string;
    width?: number;
  };
  logging: {
    level: string;
    file: string;
  };
}

export function updateConfig(updates: Partial<Config>): void {
  // Find the config file path
  const configPaths = [
    path.join(process.cwd(), 'config.json'),
    path.join(path.dirname(process.execPath), 'config.json'),
    path.join(__dirname, '../config.json')
  ];

  let configPath = configPaths.find(p => fs.existsSync(p));
  if (!configPath) {
    configPath = configPaths[0]; // Default to first path if none exist
  }

  try {
    // Load current config
    let currentConfig: Config;
    if (fs.existsSync(configPath)) {
      const content = fs.readFileSync(configPath, 'utf-8');
      currentConfig = JSON.parse(content);
    } else {
      // Use default config if file doesn't exist
      currentConfig = {
        serverUrl: 'wss://k-golf.ca',
        reconnectInterval: 5000,
        updateCheckInterval: 6 * 60 * 60 * 1000,
        printer: {
          type: 'epson',
          interface: 'auto',
          characterSet: 'PC437_USA',
          width: 48
        },
        logging: {
          level: 'info',
          file: 'print-server.log'
        }
      };
    }

    // Merge updates
    const newConfig = {
      ...currentConfig,
      ...updates,
      printer: {
        ...currentConfig.printer,
        ...(updates.printer || {})
      },
      logging: {
        ...currentConfig.logging,
        ...(updates.logging || {})
      }
    };

    // Save to file
    fs.writeFileSync(configPath, JSON.stringify(newConfig, null, 2), 'utf-8');
    console.log(`Config updated and saved to: ${configPath}`);
  } catch (error) {
    console.error(`Failed to update config:`, error);
    throw error;
  }
}

export function loadConfig(): Config {
  // Try to load config from current directory or executable directory
  const configPaths = [
    path.join(process.cwd(), 'config.json'),
    path.join(path.dirname(process.execPath), 'config.json'),
    path.join(__dirname, '../config.json')
  ];

  for (const configPath of configPaths) {
    if (fs.existsSync(configPath)) {
      try {
        const content = fs.readFileSync(configPath, 'utf-8');
        const config = JSON.parse(content) as Config;
        
        // Override serverUrl with environment variable if provided
        if (process.env.SERVER_URL) {
          config.serverUrl = process.env.SERVER_URL;
          console.log(`Config loaded from: ${configPath} (SERVER_URL overridden by .env)`);
        } else {
          console.log(`Config loaded from: ${configPath}`);
        }
        
        return config;
      } catch (error) {
        console.warn(`Failed to load config from ${configPath}:`, error);
      }
    }
  }

  // No config file found, create one with defaults
  console.warn('No config file found, creating default config.json');
  const defaultConfig: Config = {
    serverUrl: process.env.SERVER_URL || 'wss://k-golf.ca',
    reconnectInterval: 5000,
    updateCheckInterval: 6 * 60 * 60 * 1000,
    printer: {
      type: 'epson',
      interface: 'auto',
      characterSet: 'PC437_USA',
      width: 48
    },
    logging: {
      level: 'info',
      file: 'print-server.log'
    }
  };

  // Try to create config file in the first available path
  for (const configPath of configPaths) {
    try {
      const dir = path.dirname(configPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2), 'utf-8');
      console.log(`Default config created at: ${configPath}`);
      return defaultConfig;
    } catch (error) {
      console.warn(`Failed to create config at ${configPath}:`, error);
    }
  }

  // If we can't write anywhere, return defaults
  console.warn('Could not create config file, using in-memory defaults');
  return defaultConfig;
}
