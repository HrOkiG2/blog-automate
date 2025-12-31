import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import { optimizeArticleForSEO } from '@/services/article/seoOptimizer';
import { ArticleGenerationInput } from '@/types/article';

vi.mock('axios');

describe('seoOptimizer', () => {
    const mockInput: ArticleGenerationInput = {
        persona: {
            Category: '現役施設介護士',
            Persona_Detail: '特養で働く介護士',
            Worry_Description: '給料が低い',
            Tone_Instruction: '共感型',
            Context_Scenario: '給料日の悩み',
        },
        seoKeyword: {
            ID: 'A-01',
            Category: '現役施設介護士',
            Main_Keyword: '介護職',
            Sub_Keywords: '副業, おすすめ',
            User_Intent: '副業を知りたい',
            Title_Idea: '介護職におすすめの副業',
        },
    };

    const mockDraft = {
        title: '介護職の副業について',
        body: '# はじめに\n介護職の皆さん...',
        slug: 'kaigo-fukugyo',
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('optimizeArticleForSEO', () => {
        it('should optimize article for SEO successfully', async () => {
            const mockResponse = {
                data: {
                    response: JSON.stringify({
                        title: '介護職におすすめの副業5選【2024年最新版】',
                        body: '# 介護職におすすめの副業\n介護職の皆さん...',
                        slug: 'kaigo-fukugyo',
                        meta_title: '介護職の副業 - おすすめランキング',
                        meta_description: '介護職でもできる副業を紹介します。',
                    }),
                },
            };

            vi.mocked(axios.post).mockResolvedValue(mockResponse);

            const result = await optimizeArticleForSEO(mockDraft, mockInput);

            expect(result).toEqual({
                title: '介護職におすすめの副業5選【2024年最新版】',
                body: '# 介護職におすすめの副業\n介護職の皆さん...',
                slug: 'kaigo-fukugyo',
                meta_title: '介護職の副業 - おすすめランキング',
                meta_description: '介護職でもできる副業を紹介します。',
            });

            expect(axios.post).toHaveBeenCalledWith(
                expect.stringContaining('/api/generate'),
                expect.objectContaining({
                    model: expect.any(String),
                    prompt: expect.stringContaining('SEO最適化'),
                    stream: false,
                }),
                expect.objectContaining({
                    timeout: expect.any(Number),
                })
            );
        });

        it('should use draft slug if not provided in response', async () => {
            const mockResponse = {
                data: {
                    response: JSON.stringify({
                        title: 'SEO最適化されたタイトル',
                        body: 'SEO最適化された本文',
                        meta_title: 'メタタイトル',
                        meta_description: 'メタディスクリプション',
                    }),
                },
            };

            vi.mocked(axios.post).mockResolvedValue(mockResponse);

            const result = await optimizeArticleForSEO(mockDraft, mockInput);

            expect(result.slug).toBe('kaigo-fukugyo');
        });

        it('should throw error if JSON parsing fails', async () => {
            const mockResponse = {
                data: {
                    response: 'Invalid JSON response',
                },
            };

            vi.mocked(axios.post).mockResolvedValue(mockResponse);

            await expect(optimizeArticleForSEO(mockDraft, mockInput)).rejects.toThrow(
                'Failed to parse JSON from SEO model response'
            );
        });

        it('should throw error if API call fails', async () => {
            vi.mocked(axios.post).mockRejectedValue(new Error('Network Error'));

            await expect(optimizeArticleForSEO(mockDraft, mockInput)).rejects.toThrow(
                'Network Error'
            );
        });
    });
});
