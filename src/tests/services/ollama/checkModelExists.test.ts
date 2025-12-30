import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { checkModelExists } from '@/services/ollama/checkModelExists';
import { ModelInfo } from '@/types/ollama';

describe('checkModelExists', () => {
    let mockAxios: MockAdapter;

    beforeEach(() => {
        mockAxios = new MockAdapter(axios);
    });

    afterEach(() => {
        mockAxios.restore();
        vi.restoreAllMocks();
    });

    describe('モデルの存在確認', () => {
        /**
         * テスト: モデルが存在する場合、trueを返す
         * - Ollama APIからモデルリストを取得
         * - 指定したモデル名が存在する場合はtrueを返す
         */
        it('should return true when model exists', async () => {
            // GIVEN: モデルリストに指定したモデルが存在する
            const baseUrl = 'http://localhost:11434';
            const modelName = 'test-model';

            const mockModels: ModelInfo[] = [
                {
                    name: 'test-model:latest',
                    size: 4360000000,
                    digest: 'abc123',
                    modified_at: '2025-12-26T00:00:00Z',
                },
                {
                    name: 'another-model:latest',
                    size: 8720000000,
                    digest: 'def456',
                    modified_at: '2025-12-25T00:00:00Z',
                },
            ];

            mockAxios.onGet(`${baseUrl}/api/tags`).reply(200, {
                models: mockModels,
            });

            // WHEN: モデルの存在を確認
            const result = await checkModelExists(baseUrl, modelName);

            // THEN: trueが返される
            expect(result).toBe(true);
        });

        /**
         * テスト: モデルが存在しない場合、falseを返す
         * - モデルリストに指定したモデルが含まれていない場合はfalseを返す
         */
        it('should return false when model does not exist', async () => {
            // GIVEN: モデルリストに指定したモデルが存在しない
            const baseUrl = 'http://localhost:11434';
            const modelName = 'non-existent-model';

            const mockModels: ModelInfo[] = [
                {
                    name: 'existing-model:latest',
                    size: 4360000000,
                    digest: 'abc123',
                    modified_at: '2025-12-26T00:00:00Z',
                },
            ];

            mockAxios.onGet(`${baseUrl}/api/tags`).reply(200, {
                models: mockModels,
            });

            // WHEN: 存在しないモデルを確認
            const result = await checkModelExists(baseUrl, modelName);

            // THEN: falseが返される
            expect(result).toBe(false);
        });

        /**
         * テスト: モデルリストが空の場合、falseを返す
         * - Ollamaにモデルが1つも登録されていない場合の処理を確認
         */
        it('should return false when model list is empty', async () => {
            // GIVEN: モデルリストが空
            const baseUrl = 'http://localhost:11434';
            const modelName = 'test-model';

            mockAxios.onGet(`${baseUrl}/api/tags`).reply(200, {
                models: [],
            });

            // WHEN: モデルの存在を確認
            const result = await checkModelExists(baseUrl, modelName);

            // THEN: falseが返される
            expect(result).toBe(false);
        });
    });

    describe('モデル名の正規化', () => {
        /**
         * テスト: タグなしのモデル名に:latestが自動的に付加される
         * - Ollamaは自動的に:latestタグを付加するため、
         *   モデル名にタグがない場合は:latestを付加して比較する
         */
        it('should normalize model name by adding :latest tag when not present', async () => {
            // GIVEN: モデルリストに:latestタグ付きでモデルが存在
            const baseUrl = 'http://localhost:11434';
            const modelName = 'test-model'; // タグなし

            const mockModels: ModelInfo[] = [
                {
                    name: 'test-model:latest', // タグあり
                    size: 4360000000,
                    digest: 'abc123',
                    modified_at: '2025-12-26T00:00:00Z',
                },
            ];

            mockAxios.onGet(`${baseUrl}/api/tags`).reply(200, {
                models: mockModels,
            });

            // WHEN: タグなしのモデル名で確認
            const result = await checkModelExists(baseUrl, modelName);

            // THEN: :latestが自動付加されて一致するためtrueが返される
            expect(result).toBe(true);
        });

        /**
         * テスト: タグ付きのモデル名はそのまま使用される
         * - モデル名にすでにタグが含まれている場合は、そのまま比較される
         */
        it('should not modify model name when tag is already present', async () => {
            // GIVEN: 特定のタグを持つモデルが存在
            const baseUrl = 'http://localhost:11434';
            const modelName = 'test-model:v1.0'; // カスタムタグ

            const mockModels: ModelInfo[] = [
                {
                    name: 'test-model:v1.0',
                    size: 4360000000,
                    digest: 'abc123',
                    modified_at: '2025-12-26T00:00:00Z',
                },
                {
                    name: 'test-model:latest',
                    size: 4360000000,
                    digest: 'def456',
                    modified_at: '2025-12-25T00:00:00Z',
                },
            ];

            mockAxios.onGet(`${baseUrl}/api/tags`).reply(200, {
                models: mockModels,
            });

            // WHEN: タグ付きのモデル名で確認
            const result = await checkModelExists(baseUrl, modelName);

            // THEN: 完全一致するためtrueが返される
            expect(result).toBe(true);
        });

        /**
         * テスト: 同名でタグが異なるモデルは別物として扱われる
         * - test-model:v1.0とtest-model:latestは異なるモデル
         */
        it('should distinguish between models with different tags', async () => {
            // GIVEN: 同名で異なるタグのモデルが存在
            const baseUrl = 'http://localhost:11434';
            const modelName = 'test-model:v2.0'; // v2.0を探す

            const mockModels: ModelInfo[] = [
                {
                    name: 'test-model:v1.0',
                    size: 4360000000,
                    digest: 'abc123',
                    modified_at: '2025-12-26T00:00:00Z',
                },
                {
                    name: 'test-model:latest',
                    size: 4360000000,
                    digest: 'def456',
                    modified_at: '2025-12-25T00:00:00Z',
                },
            ];

            mockAxios.onGet(`${baseUrl}/api/tags`).reply(200, {
                models: mockModels,
            });

            // WHEN: 存在しないタグのモデルを確認
            const result = await checkModelExists(baseUrl, modelName);

            // THEN: 一致しないためfalseが返される
            expect(result).toBe(false);
        });
    });

    describe('エラーハンドリング', () => {
        /**
         * テスト: Ollama APIへの接続に失敗した場合、エラーをスローする
         * - ネットワークエラーやサーバーダウン時の処理を確認
         */
        it('should throw error when API request fails', async () => {
            // GIVEN: APIへのリクエストが失敗
            const baseUrl = 'http://localhost:11434';
            const modelName = 'test-model';

            mockAxios.onGet(`${baseUrl}/api/tags`).networkError();

            // WHEN & THEN: エラーがスローされる
            await expect(checkModelExists(baseUrl, modelName)).rejects.toThrow(
                'Failed to check existing models: Network Error'
            );
        });

        /**
         * テスト: APIが500エラーを返した場合、適切なエラーメッセージをスローする
         * - HTTPステータスコード500の場合の処理を確認
         */
        it('should throw error when API returns server error', async () => {
            // GIVEN: APIが500エラーを返す
            const baseUrl = 'http://localhost:11434';
            const modelName = 'test-model';

            mockAxios.onGet(`${baseUrl}/api/tags`).reply(500, {
                error: 'Internal server error',
            });

            // WHEN & THEN: エラーがスローされる
            await expect(checkModelExists(baseUrl, modelName)).rejects.toThrow(
                'Failed to check existing models'
            );
        });

        /**
         * テスト: APIが不正なレスポンスを返した場合の処理
         * - modelsプロパティがない、または配列でない場合
         */
        it('should handle invalid API response gracefully', async () => {
            // GIVEN: 不正なレスポンス形式
            const baseUrl = 'http://localhost:11434';
            const modelName = 'test-model';

            // modelsが存在しないレスポンス
            mockAxios.onGet(`${baseUrl}/api/tags`).reply(200, {
                invalid: 'response',
            });

            // WHEN & THEN: エラーが発生する（modelsプロパティがundefined）
            await expect(checkModelExists(baseUrl, modelName)).rejects.toThrow();
        });

        /**
         * テスト: タイムアウトエラーが発生した場合の処理
         * - リクエストがタイムアウトした場合のエラーハンドリングを確認
         */
        it('should throw error when request times out', async () => {
            // GIVEN: リクエストがタイムアウト
            const baseUrl = 'http://localhost:11434';
            const modelName = 'test-model';

            mockAxios.onGet(`${baseUrl}/api/tags`).timeout();

            // WHEN & THEN: タイムアウトエラーがスローされる
            await expect(checkModelExists(baseUrl, modelName)).rejects.toThrow(
                'Failed to check existing models'
            );
        });
    });

    describe('複数モデルの検索', () => {
        /**
         * テスト: 多数のモデルが存在する場合でも正しく検索できる
         * - パフォーマンステストではなく、正確性の確認
         */
        it('should find model in a large list of models', async () => {
            // GIVEN: 多数のモデルが存在し、その中に目的のモデルがある
            const baseUrl = 'http://localhost:11434';
            const targetModel = 'target-model';

            const mockModels: ModelInfo[] = Array.from({ length: 100 }, (_, i) => ({
                name: `model-${i}:latest`,
                size: 4360000000,
                digest: `digest-${i}`,
                modified_at: '2025-12-26T00:00:00Z',
            }));

            // 50番目に目的のモデルを配置
            mockModels[50] = {
                name: 'target-model:latest',
                size: 4360000000,
                digest: 'target-digest',
                modified_at: '2025-12-26T00:00:00Z',
            };

            mockAxios.onGet(`${baseUrl}/api/tags`).reply(200, {
                models: mockModels,
            });

            // WHEN: モデルを検索
            const result = await checkModelExists(baseUrl, targetModel);

            // THEN: 正しく見つかる
            expect(result).toBe(true);
        });
    });
});
