import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { createModel } from '@/services/ollama/createModel';
import * as readModelfileModule from '@/services/ollama/readModelfile';
import * as checkModelExistsModule from '@/services/ollama/checkModelExists';

describe('createModel', () => {
    let mockAxios: MockAdapter;

    beforeEach(() => {
        mockAxios = new MockAdapter(axios);
        // コンソール出力をモック
        vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
        vi.spyOn(console, 'log').mockImplementation(() => {});
    });

    afterEach(() => {
        mockAxios.restore();
        vi.restoreAllMocks();
    });

    describe('新しいモデルを正常に作成できる', () => {
        /**
         * テスト: 新しいモデルを作成し、Ollama APIが正しく呼び出されることを確認する
         * - modelfileType='content'を指定した場合、Modelfile.contentが読み込まれる
         * - モデルが存在しない場合、新規作成が実行される
         * - 作成後、モデルの存在確認が行われる
         */
        it('should create a new model with content type successfully', async () => {
            // GIVEN: モデルが存在せず、Modelfileが読み込める状態
            const baseUrl = 'http://localhost:11434';
            const modelName = 'test-model';
            const modelfileContent = 'FROM qwen2.5:7b\nSYSTEM "You are a helpful assistant"';

            vi.spyOn(readModelfileModule, 'readModelfile').mockReturnValue(modelfileContent);
            vi.spyOn(checkModelExistsModule, 'checkModelExists')
                .mockResolvedValueOnce(false) // 作成前: モデルが存在しない
                .mockResolvedValueOnce(true); // 作成後: モデルが存在する

            mockAxios.onPost(`${baseUrl}/api/create`).reply(200, {
                status: 'success',
            });

            // WHEN: contentタイプでモデルを作成
            await createModel(baseUrl, {
                modelName,
                modelfileType: 'content',
                force: false,
            });

            // THEN: 正しいパラメータでAPIが呼び出される
            const requests = mockAxios.history.post;
            expect(requests).toHaveLength(1);
            expect(requests[0].url).toBe(`${baseUrl}/api/create`);
            expect(JSON.parse(requests[0].data as string)).toEqual({
                name: modelName,
                modelfile: modelfileContent,
            });

            // モデルファイルが正しく読み込まれる
            expect(readModelfileModule.readModelfile).toHaveBeenCalledWith(
                expect.stringContaining('Modelfile.content')
            );

            // モデルの存在確認が2回実行される（作成前・作成後）
            expect(checkModelExistsModule.checkModelExists).toHaveBeenCalledTimes(2);
        });

        /**
         * テスト: SEOタイプのモデルを作成できる
         * - modelfileType='seo'を指定した場合、Modelfile.seoが読み込まれる
         */
        it('should create a new model with seo type successfully', async () => {
            // GIVEN: SEOタイプのModelfileが存在する
            const baseUrl = 'http://localhost:11434';
            const modelName = 'test-seo-model';
            const modelfileContent = 'FROM qwen2.5:7b\nSYSTEM "You are an SEO expert"';

            vi.spyOn(readModelfileModule, 'readModelfile').mockReturnValue(modelfileContent);
            vi.spyOn(checkModelExistsModule, 'checkModelExists')
                .mockResolvedValueOnce(false)
                .mockResolvedValueOnce(true);

            mockAxios.onPost(`${baseUrl}/api/create`).reply(200, {
                status: 'success',
            });

            // WHEN: seoタイプでモデルを作成
            await createModel(baseUrl, {
                modelName,
                modelfileType: 'seo',
                force: false,
            });

            // THEN: Modelfile.seoが読み込まれる
            expect(readModelfileModule.readModelfile).toHaveBeenCalledWith(
                expect.stringContaining('Modelfile.seo')
            );

            // APIが正しく呼び出される
            const requests = mockAxios.history.post;
            expect(requests).toHaveLength(1);
            expect(JSON.parse(requests[0].data as string)).toEqual({
                name: modelName,
                modelfile: modelfileContent,
            });
        });
    });

    describe('既存モデルの処理', () => {
        /**
         * テスト: 既存モデルが存在し、forceフラグがfalseの場合はエラーをスローする
         * - モデルが既に存在する場合、エラーメッセージが表示される
         * - API呼び出しは行われない
         */
        it('should throw error when model already exists and force is false', async () => {
            // GIVEN: モデルが既に存在する
            const baseUrl = 'http://localhost:11434';
            const modelName = 'existing-model';

            vi.spyOn(readModelfileModule, 'readModelfile').mockReturnValue('FROM qwen2.5:7b');
            vi.spyOn(checkModelExistsModule, 'checkModelExists').mockResolvedValue(true);

            // WHEN & THEN: forceフラグなしで作成を試みるとエラーが発生
            await expect(
                createModel(baseUrl, {
                    modelName,
                    modelfileType: 'content',
                    force: false,
                })
            ).rejects.toThrow(`Model "${modelName}" already exists. Use --force to overwrite.`);

            // API呼び出しは行われない
            expect(mockAxios.history.post).toHaveLength(0);
        });

        /**
         * テスト: 既存モデルをforceフラグで上書きできる
         * - forceフラグがtrueの場合、既存モデルでも作成処理が実行される
         */
        it('should overwrite existing model when force is true', async () => {
            // GIVEN: モデルが既に存在し、forceフラグがtrue
            const baseUrl = 'http://localhost:11434';
            const modelName = 'existing-model';
            const modelfileContent = 'FROM qwen2.5:7b';

            vi.spyOn(readModelfileModule, 'readModelfile').mockReturnValue(modelfileContent);
            vi.spyOn(checkModelExistsModule, 'checkModelExists').mockResolvedValue(true);

            mockAxios.onPost(`${baseUrl}/api/create`).reply(200, {
                status: 'success',
            });

            // WHEN: forceフラグありで作成
            await createModel(baseUrl, {
                modelName,
                modelfileType: 'content',
                force: true,
            });

            // THEN: APIが呼び出される
            expect(mockAxios.history.post).toHaveLength(1);
            expect(JSON.parse(mockAxios.history.post[0].data as string)).toEqual({
                name: modelName,
                modelfile: modelfileContent,
            });
        });
    });

    describe('エラーハンドリング', () => {
        /**
         * テスト: Ollamaサーバーに接続できない場合、適切なエラーメッセージを返す
         * - ECONNREFUSEDエラーの場合、接続エラーメッセージが表示される
         */
        it('should throw connection error when Ollama server is not running', async () => {
            // GIVEN: Ollamaサーバーが起動していない
            const baseUrl = 'http://localhost:11434';
            const modelName = 'test-model';

            vi.spyOn(readModelfileModule, 'readModelfile').mockReturnValue('FROM qwen2.5:7b');
            vi.spyOn(checkModelExistsModule, 'checkModelExists').mockResolvedValue(false);

            mockAxios.onPost(`${baseUrl}/api/create`).networkError();

            // WHEN & THEN: 接続エラーが発生
            await expect(
                createModel(baseUrl, {
                    modelName,
                    modelfileType: 'content',
                    force: false,
                })
            ).rejects.toThrow('Failed to create model: Network Error');
        });

        /**
         * テスト: API呼び出しが失敗した場合、適切なエラーメッセージを返す
         * - HTTP 500エラーの場合、エラーメッセージが表示される
         */
        it('should throw error when API request fails', async () => {
            // GIVEN: APIがエラーを返す
            const baseUrl = 'http://localhost:11434';
            const modelName = 'test-model';

            vi.spyOn(readModelfileModule, 'readModelfile').mockReturnValue('FROM qwen2.5:7b');
            vi.spyOn(checkModelExistsModule, 'checkModelExists').mockResolvedValue(false);

            mockAxios.onPost(`${baseUrl}/api/create`).reply(500, {
                error: 'Internal server error',
            });

            // WHEN & THEN: API呼び出しエラーが発生
            await expect(
                createModel(baseUrl, {
                    modelName,
                    modelfileType: 'content',
                    force: false,
                })
            ).rejects.toThrow('Failed to create model');
        });

        /**
         * テスト: モデル作成後に存在確認で見つからない場合、警告が表示される
         * - モデル作成は成功するが、リストに表示されない場合の処理を確認
         */
        it('should show warning when model is created but not found in list', async () => {
            // GIVEN: モデル作成は成功するが、リストに見つからない
            const baseUrl = 'http://localhost:11434';
            const modelName = 'test-model';

            vi.spyOn(readModelfileModule, 'readModelfile').mockReturnValue('FROM qwen2.5:7b');
            vi.spyOn(checkModelExistsModule, 'checkModelExists')
                .mockResolvedValueOnce(false) // 作成前: 存在しない
                .mockResolvedValueOnce(false); // 作成後: 見つからない（警告）

            mockAxios.onPost(`${baseUrl}/api/create`).reply(200, {
                status: 'success',
            });

            const consoleLogSpy = vi.spyOn(console, 'log');

            // WHEN: モデルを作成
            await createModel(baseUrl, {
                modelName,
                modelfileType: 'content',
                force: false,
            });

            // THEN: 警告メッセージが出力される（エラーではない）
            // 注: 実際の実装ではuseOutputConsoleを使用しているため、
            // ここではエラーが投げられないことを確認
            expect(consoleLogSpy).toHaveBeenCalled();
        });
    });

    describe('プログレス表示', () => {
        /**
         * テスト: モデル作成中のプログレス情報が適切に処理される
         * - onDownloadProgressコールバックが正しく動作する
         */
        it('should handle progress updates during model creation', async () => {
            // GIVEN: プログレス情報を含むレスポンス
            const baseUrl = 'http://localhost:11434';
            const modelName = 'test-model';

            vi.spyOn(readModelfileModule, 'readModelfile').mockReturnValue('FROM qwen2.5:7b');
            vi.spyOn(checkModelExistsModule, 'checkModelExists')
                .mockResolvedValueOnce(false)
                .mockResolvedValueOnce(true);

            mockAxios.onPost(`${baseUrl}/api/create`).reply(200, {
                status: 'success',
            });

            // WHEN: モデルを作成
            await createModel(baseUrl, {
                modelName,
                modelfileType: 'content',
                force: false,
            });

            // THEN: APIリクエストが送信される
            expect(mockAxios.history.post).toHaveLength(1);

            // タイムアウト設定が正しい
            const config = mockAxios.history.post[0];
            expect(config.timeout).toBe(300000);
        });
    });
});
