export interface Config {
    ollama: {
        baseUrl: string;
        modelName: string;
        contentModel: string;
        seoModel: string;
        timeout: number;
    };
    laravel: {
        endpoints: {
            healthCheck: string;
            store: string;
        };
        apiToken: string;
    };
    scheduler: {
        intervalHours: number;
    };
    database: {
        path: string;
    };
    logging: {
        level: 'debug' | 'info' | 'warn' | 'error';
        filePath?: string;
    };
}
