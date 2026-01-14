import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import {
    publishArticleToLaravel,
    checkLaravelApiHealth,
} from '@/services/laravel/articlePublisher';
import { ArticleData } from '@/types/article';
import * as configModule from '@/config';

describe('articlePublisher', () => {
    let mock: MockAdapter;

    beforeEach(() => {
        mock = new MockAdapter(axios);
        // モックモードを無効化
        vi.spyOn(configModule, 'isLaravelMockMode').mockReturnValue(false);
    });

    afterEach(() => {
        mock.reset();
        vi.restoreAllMocks();
    });

    describe('publishArticleToLaravel', () => {
        const mockArticle: ArticleData = {
            id: 1,
            category_id: 'A-01',
            title: 'テスト記事',
            body: 'テスト本文',
            slug: 'test-article',
            status: 'draft',
            meta_title: 'メタタイトル',
            meta_description: 'メタディスクリプション',
            api_posted: false,
        };

        it('should publish article successfully', async () => {
            const endpoint = 'http://localhost:9000/api/articles';
            vi.spyOn(configModule.config.laravel.endpoints, 'store', 'get').mockReturnValue(
                endpoint
            );
            vi.spyOn(configModule.config.laravel, 'apiToken', 'get').mockReturnValue('test-token');

            mock.onPost(endpoint).reply(201, {
                article: { id: 123 },
            });

            const result = await publishArticleToLaravel(mockArticle);

            expect(result.success).toBe(true);
            expect(result.articleId).toBe(123);
            expect(result.message).toBe('Article published successfully');
        });

        it('should handle API error response', async () => {
            const endpoint = 'http://localhost:9000/api/articles';
            vi.spyOn(configModule.config.laravel.endpoints, 'store', 'get').mockReturnValue(
                endpoint
            );
            vi.spyOn(configModule.config.laravel, 'apiToken', 'get').mockReturnValue('test-token');

            mock.onPost(endpoint).reply(422, {
                success: false,
                message: 'Validation error',
                errors: { title: ['Title is required'] },
            });

            const result = await publishArticleToLaravel(mockArticle);

            expect(result.success).toBe(false);
            expect(result.message).toContain('422');
            expect(result.message).toContain('Validation error');
        });

        it('should handle network error', async () => {
            const endpoint = 'http://localhost:9000/api/articles';
            vi.spyOn(configModule.config.laravel.endpoints, 'store', 'get').mockReturnValue(
                endpoint
            );
            vi.spyOn(configModule.config.laravel, 'apiToken', 'get').mockReturnValue('test-token');

            mock.onPost(endpoint).networkError();

            const result = await publishArticleToLaravel(mockArticle);

            expect(result.success).toBe(false);
            expect(result.message).toContain('Network Error');
        });

        it('should work in mock mode', async () => {
            vi.spyOn(configModule, 'isLaravelMockMode').mockReturnValue(true);

            const result = await publishArticleToLaravel(mockArticle);

            expect(result.success).toBe(true);
            expect(result.articleId).toBeDefined();
            expect(result.message).toContain('Mock mode');
        });

        it('should throw error if endpoint is not configured', async () => {
            vi.spyOn(configModule.config.laravel.endpoints, 'store', 'get').mockReturnValue('');
            vi.spyOn(configModule.config.laravel, 'apiToken', 'get').mockReturnValue('test-token');

            await expect(publishArticleToLaravel(mockArticle)).rejects.toThrow(
                'Laravel API store endpoint is not configured'
            );
        });
    });

    describe('checkLaravelApiHealth', () => {
        it('should return true when health check succeeds', async () => {
            const endpoint = 'http://localhost:9000/api/admin/auth-check';
            vi.spyOn(configModule.config.laravel.endpoints, 'healthCheck', 'get').mockReturnValue(
                endpoint
            );
            vi.spyOn(configModule.config.laravel, 'apiToken', 'get').mockReturnValue('test-token');

            mock.onGet(endpoint).reply(200, { authenticated: true });

            const result = await checkLaravelApiHealth();

            expect(result).toBe(true);
        });

        it('should return false when health check fails', async () => {
            const endpoint = 'http://localhost:9000/api/admin/auth-check';
            vi.spyOn(configModule.config.laravel.endpoints, 'healthCheck', 'get').mockReturnValue(
                endpoint
            );
            vi.spyOn(configModule.config.laravel, 'apiToken', 'get').mockReturnValue('test-token');

            mock.onGet(endpoint).reply(401, { error: 'Unauthorized' });

            const result = await checkLaravelApiHealth();

            expect(result).toBe(false);
        });

        it('should return false when endpoint is not configured', async () => {
            vi.spyOn(configModule.config.laravel.endpoints, 'healthCheck', 'get').mockReturnValue(
                ''
            );

            const result = await checkLaravelApiHealth();

            expect(result).toBe(false);
        });

        it('should return true in mock mode', async () => {
            vi.spyOn(configModule, 'isLaravelMockMode').mockReturnValue(true);

            const result = await checkLaravelApiHealth();

            expect(result).toBe(true);
        });
    });
});
