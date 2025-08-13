import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

interface Config {
	provider?: string; // 'Groq' | 'Ollama'
	apiKey?: string;
	baseUrl?: string;
	model?: string;
}

const CONFIG_DIR = '.groq'; // In home directory
const CONFIG_FILE = 'local-settings.json';

export class ConfigManager {
	private configPath: string;

	constructor() {
		const homeDir = os.homedir();
		this.configPath = path.join(homeDir, CONFIG_DIR, CONFIG_FILE);
	}

	private ensureConfigDir(): void {
		const configDir = path.dirname(this.configPath);
		if (!fs.existsSync(configDir)) {
			fs.mkdirSync(configDir, {recursive: true});
		}
	}

	public getConfig(): Config {
		try {
			if (!fs.existsSync(this.configPath)) {
				return {};
			}
			const configData = fs.readFileSync(this.configPath, 'utf8');
			return JSON.parse(configData) as Config;
		} catch (error) {
			console.warn('Failed to read config file:', error);
			return {};
		}
	}

	public setConfig(newConfig: Config): void {
		try {
			this.ensureConfigDir();
			let config: Config = {};
			if (fs.existsSync(this.configPath)) {
				const configData = fs.readFileSync(this.configPath, 'utf8');
				config = JSON.parse(configData);
			}
			config = {...config, ...newConfig};
			fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2), {
				mode: 0o600, // Read/write for owner only
			});
		} catch (error) {
			throw new Error(`Failed to save config: ${error}`);
		}
	}

	public clearConfig(): void {
		try {
			if (fs.existsSync(this.configPath)) {
				fs.unlinkSync(this.configPath);
			}
		} catch (error) {
			console.warn('Failed to clear config:', error);
		}
	}
}
