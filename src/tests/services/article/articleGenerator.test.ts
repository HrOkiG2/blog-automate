import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import { generateArticleDraft } from '@/services/article/articleGenerator';
import { ArticleGenerationInput } from '@/types/article';

vi.mock('axios');

describe('articleGenerator', () => {
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

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('generateArticleDraft', () => {
        it('should generate article draft successfully', async () => {
            const mockResponse = {
                data: {
                    response: JSON.stringify({
                        title: '介護職におすすめの副業5選',
                        body: '# はじめに\n介護職の皆さん...',
                        slug: 'kaigo-fukugyo-5',
                    }),
                },
            };

            vi.mocked(axios.post).mockResolvedValue(mockResponse);

            const result = await generateArticleDraft(mockInput);

            expect(result).toEqual({
                title: '介護職におすすめの副業5選',
                body: '# はじめに\n介護職の皆さん...',
                slug: 'kaigo-fukugyo-5',
            });

            expect(axios.post).toHaveBeenCalledWith(
                expect.stringContaining('/api/generate'),
                expect.objectContaining({
                    model: expect.any(String),
                    prompt: expect.stringContaining('介護職'),
                    stream: false,
                }),
                expect.objectContaining({
                    timeout: expect.any(Number),
                })
            );
        });

        it('should generate slug if not provided in response', async () => {
            const mockResponse = {
                data: {
                    response: JSON.stringify({
                        title: 'テスト記事タイトル',
                        body: 'テスト本文',
                    }),
                },
            };

            vi.mocked(axios.post).mockResolvedValue(mockResponse);

            const result = await generateArticleDraft(mockInput);

            expect(result.slug).toBeDefined();
            expect(result.slug).toBeTruthy();
        });

        it('should throw error if JSON parsing fails', async () => {
            const mockResponse = {
                data: {
                    response: 'This is not a valid JSON response',
                },
            };

            vi.mocked(axios.post).mockResolvedValue(mockResponse);

            await expect(generateArticleDraft(mockInput)).rejects.toThrow(
                'Failed to parse JSON from model response'
            );
        });

        it('should throw error if API call fails', async () => {
            vi.mocked(axios.post).mockRejectedValue(new Error('API Error'));

            await expect(generateArticleDraft(mockInput)).rejects.toThrow('API Error');
        });
    });
});
