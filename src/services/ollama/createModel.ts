import axios, { AxiosError } from 'axios';
import * as path from 'path';
import { readModelfile } from './readModelfile';
import { checkModelExists } from './checkModelExists';
import { CreateModelOptions } from '@/types/ollama';
import { useOutputConsole } from '@/util/outputConsole';

/**
 * Ollamaでモデルを作成
 * @param baseUrl - OllamaのベースURL
 * @param options - モデル作成オプション
 * @throws モデルが既に存在する場合、またはAPI通信に失敗した場合はエラー
 */
export async function createModel(baseUrl: string, options: CreateModelOptions): Promise<void> {
    const { modelName, modelfileType, force = false } = options;

    const modelfilePath = path.join(__dirname, '../../ollama', `Modelfile.${modelfileType}`);
    const modelfileContent = readModelfile(modelfilePath);

    const exists = await checkModelExists(baseUrl, modelName);
    if (exists && !force) {
        throw new Error(`Model "${modelName}" already exists. Use --force to overwrite.`);
    }

    try {
        useOutputConsole([
            `🚀 Creating model "${modelName}"...`,
            `📝 Using modelfile: Modelfile.${modelfileType}`,
        ]);

        await axios.post(
            `${baseUrl}/api/create`,
            {
                name: modelName,
                modelfile: modelfileContent,
            },
            {
                timeout: 300000,
                headers: {
                    'Content-Type': 'application/json',
                },
                onDownloadProgress: (progressEvent) => {
                    const event = progressEvent.event as unknown;
                    if (
                        event &&
                        typeof event === 'object' &&
                        'target' in event &&
                        event.target &&
                        typeof event.target === 'object' &&
                        'responseText' in event.target
                    ) {
                        const target = event.target as { responseText: string };
                        const responseText = target.responseText;

                        if (typeof responseText === 'string') {
                            const lines = responseText.trim().split('\n');
                            const lastLine = lines[lines.length - 1];

                            try {
                                const progress = JSON.parse(lastLine) as { status?: string };
                                if (progress.status) {
                                    process.stdout.write(`\r${progress.status}`);
                                }
                            } catch {
                                // パース失敗は無視
                            }
                        }
                    }
                },
            }
        );

        process.stdout.write('\n');
        useOutputConsole([`✅ Model "${modelName}" created successfully!`]);

        const verifyExists = await checkModelExists(baseUrl, modelName);
        if (!verifyExists) {
            useOutputConsole([
                `⚠️  Warning: Model created but not found in model list. Please verify manually.`,
            ]);
        }
    } catch (error) {
        if (axios.isAxiosError(error)) {
            const axiosError = error as AxiosError;
            if (axiosError.code === 'ECONNREFUSED') {
                throw new Error(`Cannot connect to Ollama at ${baseUrl}. Is Ollama running?`);
            }
            throw new Error(`Failed to create model: ${axiosError.message}`);
        }
        throw error;
    }
}
