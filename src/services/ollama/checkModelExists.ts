import axios from 'axios';
import { ModelInfo } from '@/types/ollama';

/**
 * モデルが既に存在するかチェック
 * @param baseUrl - OllamaのベースURL
 * @param modelName - チェックするモデル名
 * @returns モデルが存在する場合はtrue
 * @throws API通信に失敗した場合はエラー
 */
export async function checkModelExists(baseUrl: string, modelName: string): Promise<boolean> {
    try {
        const response = await axios.get<{ models: ModelInfo[] }>(`${baseUrl}/api/tags`);
        // モデル名にタグが含まれていない場合は :latest を付加して比較
        const normalizedModelName = modelName.includes(':') ? modelName : `${modelName}:latest`;
        return response.data.models.some((model) => model.name === normalizedModelName);
    } catch (error) {
        if (axios.isAxiosError(error)) {
            throw new Error(`Failed to check existing models: ${error.message}`);
        }
        throw error;
    }
}
