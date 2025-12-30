import axios from 'axios';
import { useOutputConsole } from '@/util/outputConsole';

/**
 * Ollamaからモデルを削除
 * @param baseUrl - OllamaのベースURL
 * @param modelName - 削除するモデル名
 * @throws API通信に失敗した場合はエラー
 */
export async function deleteModel(baseUrl: string, modelName: string): Promise<void> {
    try {
        await axios.delete(`${baseUrl}/api/delete`, {
            data: { name: modelName },
        });
        useOutputConsole([`✅ Model "${modelName}" deleted successfully!`]);
    } catch (error) {
        if (axios.isAxiosError(error)) {
            throw new Error(`Failed to delete model: ${error.message}`);
        }
        throw error;
    }
}
