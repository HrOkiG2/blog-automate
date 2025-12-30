import axios from 'axios';
import { ModelInfo } from '@/types/ollama';

/**
 * Ollamaに登録されているモデル一覧を取得
 * @param baseUrl - OllamaのベースURL
 * @returns モデル情報の配列
 * @throws API通信に失敗した場合はエラー
 */
export async function listModels(baseUrl: string): Promise<ModelInfo[]> {
    try {
        const response = await axios.get<{ models: ModelInfo[] }>(`${baseUrl}/api/tags`);
        return response.data.models || [];
    } catch (error) {
        if (axios.isAxiosError(error)) {
            throw new Error(`Failed to list models: ${error.message}`);
        }
        throw error;
    }
}
