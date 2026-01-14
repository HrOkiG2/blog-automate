import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    getArticlePath,
    loadUnpublishedArticles,
    convertCategoryIdToNumber,
    prepareArticleForPublish,
    publishSingleArticle,
    publishAllArticles,
    displayResults,
    type PublishStats,
} from '@/scripts/publishArticles';
import * as csvWriter from '@/util/csvWriter';
import * as articlePublisher from '@/services/laravel/articlePublisher';
import * as categoryMapper from '@/util/categoryMapper';
import * as outputConsole from '@/util/outputConsole';
import { ArticleData } from '@/types/article';

// モック設定
vi.mock('@/util/csvWriter');
vi.mock('@/services/laravel/articlePublisher');
vi.mock('@/util/categoryMapper');
vi.mock('@/util/outputConsole');

describe('publishArticles', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('getArticlePath', () => {
        it('should return article CSV path', () => {
            const path = getArticlePath();
            expect(path).toContain('article.csv');
        });
    });

    describe('loadUnpublishedArticles', () => {
        it('should load and filter unpublished articles', () => {
            const mockArticles: ArticleData[] = [
                {
                    id: 1,
                    title: '投稿済み記事',
                    body: '本文',
                    category_id: '1',
                    api_posted: true,
                } as ArticleData,
                {
                    id: 2,
                    title: '未投稿記事',
                    body: '本文',
                    category_id: '1',
                    api_posted: false,
                } as ArticleData,
            ];

            vi.mocked(csvWriter.readArticlesFromCSV).mockReturnValue(mockArticles);

            const result = loadUnpublishedArticles('/test/article.csv');

            expect(csvWriter.readArticlesFromCSV).toHaveBeenCalledWith('/test/article.csv');
            expect(result).toHaveLength(1);
            expect(result[0].id).toBe(2);
            expect(result[0].api_posted).toBe(false);
        });

        it('should return empty array when all articles are published', () => {
            const mockArticles: ArticleData[] = [
                {
                    id: 1,
                    title: '投稿済み記事',
                    body: '本文',
                    category_id: '1',
                    api_posted: true,
                } as ArticleData,
            ];

            vi.mocked(csvWriter.readArticlesFromCSV).mockReturnValue(mockArticles);

            const result = loadUnpublishedArticles('/test/article.csv');

            expect(result).toHaveLength(0);
        });
    });

    describe('convertCategoryIdToNumber', () => {
        it('should convert persona category string to number', () => {
            vi.mocked(categoryMapper.getCategoryIdFromPersona).mockReturnValue(3);

            const result = convertCategoryIdToNumber('現役施設介護士');

            expect(categoryMapper.getCategoryIdFromPersona).toHaveBeenCalledWith('現役施設介護士');
            expect(result).toBe(3);
        });

        it('should convert numeric string to number', () => {
            const result = convertCategoryIdToNumber('42');

            expect(result).toBe(42);
            expect(categoryMapper.getCategoryIdFromPersona).not.toHaveBeenCalled();
        });

        it('should return number as is', () => {
            const result = convertCategoryIdToNumber(42);

            expect(result).toBe(42);
            expect(categoryMapper.getCategoryIdFromPersona).not.toHaveBeenCalled();
        });
    });

    describe('prepareArticleForPublish', () => {
        it('should prepare article with converted category ID', () => {
            vi.mocked(categoryMapper.getCategoryIdFromPersona).mockReturnValue(3);

            const article: ArticleData = {
                id: 1,
                title: 'テスト記事',
                body: '本文',
                category_id: '現役施設介護士',
                api_posted: false,
            } as ArticleData;

            const result = prepareArticleForPublish(article);

            expect(result.category_id).toBe(3);
            expect(result.title).toBe('テスト記事');
        });

        it('should handle numeric category ID', () => {
            const article: ArticleData = {
                id: 1,
                title: 'テスト記事',
                body: '本文',
                category_id: 5,
                api_posted: false,
            } as ArticleData;

            const result = prepareArticleForPublish(article);

            expect(result.category_id).toBe(5);
        });
    });

    describe('publishSingleArticle', () => {
        it('should publish article successfully', async () => {
            const mockArticle: ArticleData = {
                id: 1,
                title: 'テスト記事',
                body: '本文',
                category_id: '1',
                api_posted: false,
            } as ArticleData;

            const mockStats: PublishStats = {
                successCount: 0,
                failureCount: 0,
            };

            vi.mocked(articlePublisher.publishArticleToLaravel).mockResolvedValue({
                success: true,
                articleId: 123,
                message: 'Success',
            });

            await publishSingleArticle(mockArticle, '/test/article.csv', mockStats);

            expect(articlePublisher.publishArticleToLaravel).toHaveBeenCalled();
            expect(csvWriter.updateArticleInCSV).toHaveBeenCalledWith('/test/article.csv', 1, {
                api_posted: true,
            });
            expect(mockStats.successCount).toBe(1);
            expect(mockStats.failureCount).toBe(0);
        });

        it('should handle publish failure', async () => {
            const mockArticle: ArticleData = {
                id: 1,
                title: 'テスト記事',
                body: '本文',
                category_id: '1',
                api_posted: false,
            } as ArticleData;

            const mockStats: PublishStats = {
                successCount: 0,
                failureCount: 0,
            };

            vi.mocked(articlePublisher.publishArticleToLaravel).mockResolvedValue({
                success: false,
                message: 'Validation error',
            });

            await publishSingleArticle(mockArticle, '/test/article.csv', mockStats);

            expect(mockStats.successCount).toBe(0);
            expect(mockStats.failureCount).toBe(1);
            expect(csvWriter.updateArticleInCSV).not.toHaveBeenCalled();
        });

        it('should handle publish error', async () => {
            const mockArticle: ArticleData = {
                id: 1,
                title: 'テスト記事',
                body: '本文',
                category_id: '1',
                api_posted: false,
            } as ArticleData;

            const mockStats: PublishStats = {
                successCount: 0,
                failureCount: 0,
            };

            vi.mocked(articlePublisher.publishArticleToLaravel).mockRejectedValue(
                new Error('Network error')
            );

            await publishSingleArticle(mockArticle, '/test/article.csv', mockStats);

            expect(mockStats.successCount).toBe(0);
            expect(mockStats.failureCount).toBe(1);
        });
    });

    describe('publishAllArticles', () => {
        it('should publish all articles', async () => {
            const mockArticles: ArticleData[] = [
                {
                    id: 1,
                    title: '記事1',
                    body: '本文1',
                    category_id: '1',
                } as ArticleData,
                {
                    id: 2,
                    title: '記事2',
                    body: '本文2',
                    category_id: '2',
                } as ArticleData,
            ];

            vi.mocked(articlePublisher.publishArticleToLaravel).mockResolvedValue({
                success: true,
                articleId: 123,
                message: 'Success',
            });

            const stats = await publishAllArticles(mockArticles, '/test/article.csv');

            expect(stats.successCount).toBe(2);
            expect(stats.failureCount).toBe(0);
        });

        it('should handle mixed success and failure', async () => {
            const mockArticles: ArticleData[] = [
                { id: 1, title: '記事1', category_id: '1' } as ArticleData,
                { id: 2, title: '記事2', category_id: '2' } as ArticleData,
            ];

            vi.mocked(articlePublisher.publishArticleToLaravel)
                .mockResolvedValueOnce({
                    success: true,
                    articleId: 123,
                    message: 'Success',
                })
                .mockResolvedValueOnce({
                    success: false,
                    message: 'Failed',
                });

            const stats = await publishAllArticles(mockArticles, '/test/article.csv');

            expect(stats.successCount).toBe(1);
            expect(stats.failureCount).toBe(1);
        });
    });

    describe('displayResults', () => {
        it('should display publish results', () => {
            const stats: PublishStats = {
                successCount: 8,
                failureCount: 2,
            };

            displayResults(stats, 10);

            expect(outputConsole.outputConsole).toHaveBeenCalledWith(
                'success',
                expect.stringContaining('成功: 8件')
            );
            expect(outputConsole.outputConsole).toHaveBeenCalledWith(
                'success',
                expect.stringContaining('失敗: 2件')
            );
        });
    });
});
