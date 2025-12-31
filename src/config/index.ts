import dotenv from 'dotenv';
import { Config } from '@/types/config';

dotenv.config();

/**
 * 環境変数を取得
 */
function loadConfig(): Config {
    return {
        ollama: {
            baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
            modelName: process.env.OLLAMA_MODEL_NAME || 'kaigo-expert',
            contentModel:
                process.env.OLLAMA_CONTENT_MODEL ||
                process.env.OLLAMA_MODEL_NAME ||
                'kaigo-content',
            seoModel: process.env.OLLAMA_SEO_MODEL || process.env.OLLAMA_MODEL_NAME || 'kaigo-seo',
            timeout: parseInt(process.env.OLLAMA_TIMEOUT || '120000', 10),
        },
        laravel: {
            endpoints: {
                healthCheck: process.env.LARAVEL_API_AUTH_CHECK || '',
                store: process.env.LARAVEL_API_STORE_ENDPOINT || '',
            },
            apiToken: process.env.LARAVEL_API_TOKEN || '',
        },
        scheduler: {
            intervalHours: parseInt(process.env.SCHEDULER_INTERVAL_HOURS || '6', 10),
        },
        database: {
            path: process.env.DATABASE_PATH || './data/blog_automation.db',
        },
        logging: {
            level: ['debug', 'info', 'warn', 'error'].includes(process.env.LOG_LEVEL || '')
                ? (process.env.LOG_LEVEL as 'debug' | 'info' | 'warn' | 'error')
                : 'info',
            filePath: process.env.LOG_FILE_PATH,
        },
    };
}

export const config = loadConfig();

/**
 * Laravel APIのモックモードかどうか
 */
export function isLaravelMockMode(): boolean {
    return process.env.LARAVEL_MOCK_MODE === 'true';
}

/**
 * 設定を表示
 */
export function displayConfig(): void {
    console.log('📋 Configuration:');
    console.log('  Ollama:');
    console.log(`    - Base URL: ${config.ollama.baseUrl}`);
    console.log(`    - Model: ${config.ollama.modelName}`);
    console.log(`    - Timeout: ${config.ollama.timeout}ms`);
    console.log('  Laravel API:');
    console.log(`    - HealthCheck URL: ${config.laravel.endpoints.healthCheck}`);
    console.log(`    - Store Endpoint: ${config.laravel.endpoints.store}`);
    console.log(`    - Mock Mode: ${isLaravelMockMode() ? 'Enabled' : 'Disabled'}`);
    console.log('  Scheduler:');
    console.log(`    - Interval: Every ${config.scheduler.intervalHours} hour(s)`);
    console.log('  Database:');
    console.log(`    - Path: ${config.database.path}`);
    console.log('  Logging:');
    console.log(`    - Level: ${config.logging.level}`);
    if (config.logging.filePath) {
        console.log(`    - File: ${config.logging.filePath}`);
    }
    console.log('');
}
