import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    getDataPaths,
    loadCSVData,
    performHealthCheck,
    publishAndUpdateArticle,
    processArticle,
    processAllArticles,
    displayResults,
    type DataPaths,
    type MatchData,
    type ProcessingStats,
} from '@/scripts/generateArticles';
import { PersonaData, SeoKeywordData, ArticleData } from '@/types/article';
import * as csvReader from '@/util/csvReader';
import * as csvWriter from '@/util/csvWriter';
import * as articlePipeline from '@/services/article/articlePipeline';
import * as articlePublisher from '@/services/laravel/articlePublisher';
import * as outputConsole from '@/util/outputConsole';

// モック設定
vi.mock('@/util/csvReader');
vi.mock('@/util/csvWriter');
vi.mock('@/services/article/articlePipeline');
vi.mock('@/services/laravel/articlePublisher');
vi.mock('@/util/outputConsole');

describe('generateArticles', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('getDataPaths', () => {
        it('should return correct data paths', () => {
            const paths = getDataPaths();

            expect(paths).toHaveProperty('personaPath');
            expect(paths).toHaveProperty('seoKeywordPath');
            expect(paths).toHaveProperty('articlePath');
            expect(paths.personaPath).toContain('persona.csv');
            expect(paths.seoKeywordPath).toContain('seo-keyword.csv');
            expect(paths.articlePath).toContain('article.csv');
        });
    });

    describe('loadCSVData', () => {
        it('should load and match CSV data', () => {
            const mockPersonas: PersonaData[] = [
                { Category: 'カテゴリA', Age: '20-30', Income: '300-400' } as PersonaData,
            ];
            const mockKeywords: SeoKeywordData[] = [
                { Title_Idea: 'テストタイトル', Target_Persona: 'カテゴリA' } as SeoKeywordData,
            ];
            const mockMatches: MatchData[] = [
                {
                    persona: mockPersonas[0],
                    keyword: mockKeywords[0],
                },
            ];

            vi.mocked(csvReader.readPersonaCSV).mockReturnValue(mockPersonas);
            vi.mocked(csvReader.readSeoKeywordCSV).mockReturnValue(mockKeywords);
            vi.mocked(csvReader.matchPersonaWithKeywords).mockReturnValue(mockMatches);

            const paths: DataPaths = {
                personaPath: '/test/persona.csv',
                seoKeywordPath: '/test/keyword.csv',
                articlePath: '/test/article.csv',
            };

            const result = loadCSVData(paths);

            expect(csvReader.readPersonaCSV).toHaveBeenCalledWith(paths.personaPath);
            expect(csvReader.readSeoKeywordCSV).toHaveBeenCalledWith(paths.seoKeywordPath);
            expect(csvReader.matchPersonaWithKeywords).toHaveBeenCalledWith(
                mockPersonas,
                mockKeywords
            );
            expect(result).toEqual(mockMatches);
        });
    });

    describe('performHealthCheck', () => {
        it('should return true when API is healthy', async () => {
            vi.mocked(articlePublisher.checkLaravelApiHealth).mockResolvedValue(true);

            const result = await performHealthCheck();

            expect(result).toBe(true);
            expect(articlePublisher.checkLaravelApiHealth).toHaveBeenCalled();
        });

        it('should return false when API is unhealthy', async () => {
            vi.mocked(articlePublisher.checkLaravelApiHealth).mockResolvedValue(false);

            const result = await performHealthCheck();

            expect(result).toBe(false);
        });
    });

    describe('publishAndUpdateArticle', () => {
        it('should publish and update CSV on success', async () => {
            const mockArticle = {
                id: 1,
                title: 'テスト記事',
                body: '本文',
                category_id: '1',
            };
            const mockStats: ProcessingStats = {
                successCount: 0,
                failureCount: 0,
                publishedCount: 0,
                publishFailureCount: 0,
            };

            vi.mocked(articlePublisher.publishArticleToLaravel).mockResolvedValue({
                success: true,
                articleId: 123,
                message: 'Success',
            });

            await publishAndUpdateArticle('/test/article.csv', mockArticle, mockStats);

            expect(articlePublisher.publishArticleToLaravel).toHaveBeenCalledWith(mockArticle);
            expect(csvWriter.updateArticleInCSV).toHaveBeenCalledWith('/test/article.csv', 1, {
                api_posted: true,
            });
            expect(mockStats.publishedCount).toBe(1);
        });

        it('should increment failure count on publish failure', async () => {
            const mockArticle = { id: 1, title: 'テスト記事' };
            const mockStats: ProcessingStats = {
                successCount: 0,
                failureCount: 0,
                publishedCount: 0,
                publishFailureCount: 0,
            };

            vi.mocked(articlePublisher.publishArticleToLaravel).mockResolvedValue({
                success: false,
                message: 'Failed',
            });

            await publishAndUpdateArticle('/test/article.csv', mockArticle, mockStats);

            expect(mockStats.publishFailureCount).toBe(1);
            expect(csvWriter.updateArticleInCSV).not.toHaveBeenCalled();
        });

        it('should handle publish error', async () => {
            const mockArticle = { id: 1, title: 'テスト記事' };
            const mockStats: ProcessingStats = {
                successCount: 0,
                failureCount: 0,
                publishedCount: 0,
                publishFailureCount: 0,
            };

            vi.mocked(articlePublisher.publishArticleToLaravel).mockRejectedValue(
                new Error('Network error')
            );

            await publishAndUpdateArticle('/test/article.csv', mockArticle, mockStats);

            expect(mockStats.publishFailureCount).toBe(1);
        });
    });

    describe('processArticle', () => {
        it('should process article successfully', async () => {
            const mockMatch: MatchData = {
                persona: { Category: 'カテゴリA' } as any,
                keyword: { Title_Idea: 'テストタイトル' } as any,
            };
            const mockArticle = {
                id: 1,
                title: 'テスト記事',
                body: '本文',
                category_id: '1',
            };
            const mockStats: ProcessingStats = {
                successCount: 0,
                failureCount: 0,
                publishedCount: 0,
                publishFailureCount: 0,
            };

            vi.mocked(articlePipeline.generateArticle).mockResolvedValue(
                mockArticle as ArticleData
            );
            vi.mocked(csvWriter.appendArticleToCSV).mockReturnValue(mockArticle as ArticleData);

            await processArticle(mockMatch, '/test/article.csv', false, mockStats);

            expect(articlePipeline.generateArticle).toHaveBeenCalled();
            expect(csvWriter.appendArticleToCSV).toHaveBeenCalledWith(
                '/test/article.csv',
                mockArticle
            );
            expect(mockStats.successCount).toBe(1);
        });

        it('should handle generation error', async () => {
            const mockMatch: MatchData = {
                persona: { Category: 'カテゴリA' } as any,
                keyword: { Title_Idea: 'テストタイトル' } as any,
            };
            const mockStats: ProcessingStats = {
                successCount: 0,
                failureCount: 0,
                publishedCount: 0,
                publishFailureCount: 0,
            };

            vi.mocked(articlePipeline.generateArticle).mockRejectedValue(
                new Error('Generation failed')
            );

            await processArticle(mockMatch, '/test/article.csv', false, mockStats);

            expect(mockStats.failureCount).toBe(1);
        });
    });

    describe('processAllArticles', () => {
        it('should process all articles', async () => {
            const mockMatches: MatchData[] = [
                {
                    persona: { Category: 'カテゴリA' } as any,
                    keyword: { Title_Idea: 'タイトル1' } as any,
                },
                {
                    persona: { Category: 'カテゴリB' } as any,
                    keyword: { Title_Idea: 'タイトル2' } as any,
                },
            ];

            vi.mocked(articlePipeline.generateArticle).mockResolvedValue({
                id: 1,
                title: 'テスト',
                body: '本文',
            } as ArticleData);
            vi.mocked(csvWriter.appendArticleToCSV).mockReturnValue({ id: 1 } as ArticleData);

            const stats = await processAllArticles(mockMatches, '/test/article.csv', false);

            expect(stats.successCount).toBe(2);
            expect(stats.failureCount).toBe(0);
        });
    });

    describe('displayResults', () => {
        it('should display results without Laravel info', () => {
            const stats: ProcessingStats = {
                successCount: 10,
                failureCount: 2,
                publishedCount: 8,
                publishFailureCount: 2,
            };

            displayResults(stats, false, 12);

            expect(outputConsole.outputConsole).toHaveBeenCalledWith(
                'success',
                expect.stringContaining('成功 10件')
            );
        });

        it('should display results with Laravel info', () => {
            const stats: ProcessingStats = {
                successCount: 10,
                failureCount: 2,
                publishedCount: 8,
                publishFailureCount: 2,
            };

            displayResults(stats, true, 12);

            expect(outputConsole.outputConsole).toHaveBeenCalledWith(
                'success',
                expect.stringContaining('成功 8件')
            );
        });
    });
});
