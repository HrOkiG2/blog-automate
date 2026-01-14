import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateArticle, generateMultipleArticles } from '@/services/article/articlePipeline';
import * as articleGenerator from '@/services/article/articleGenerator';
import * as seoOptimizer from '@/services/article/seoOptimizer';
import { ArticleGenerationInput } from '@/types/article';

vi.mock('@/services/article/articleGenerator');
vi.mock('@/services/article/seoOptimizer');
vi.mock('@/util/outputConsole', () => ({
    outputConsole: vi.fn(),
}));
vi.mock('@/util/categoryMapper', () => ({
    getCategoryIdFromPersona: vi.fn((category: string) => {
        const mapping: { [key: string]: number } = {
            現役施設介護士: 3,
            潜在有資格者: 2,
            '収入・条件重視': 1,
        };
        return mapping[category];
    }),
}));

describe('articlePipeline', () => {
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

    const mockOptimized = {
        title: '介護職におすすめの副業5選【2024年最新版】',
        body: '# 介護職におすすめの副業\n介護職の皆さん...',
        slug: 'kaigo-fukugyo',
        meta_title: '介護職の副業 - おすすめランキング',
        meta_description: '介護職でもできる副業を紹介します。',
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('generateArticle', () => {
        it('should generate article through two-phase pipeline', async () => {
            vi.spyOn(articleGenerator, 'generateArticleDraft').mockResolvedValue(mockDraft);
            vi.spyOn(seoOptimizer, 'optimizeArticleForSEO').mockResolvedValue(mockOptimized);

            const result = await generateArticle(mockInput);

            expect(articleGenerator.generateArticleDraft).toHaveBeenCalledWith(mockInput);
            expect(seoOptimizer.optimizeArticleForSEO).toHaveBeenCalledWith(mockDraft, mockInput);

            expect(result).toEqual({
                category_id: '3', // 現役施設介護士 → category ID 3
                title: '介護職におすすめの副業5選【2024年最新版】',
                body: '# 介護職におすすめの副業\n介護職の皆さん...',
                slug: 'kaigo-fukugyo',
                status: 'draft',
                meta_title: '介護職の副業 - おすすめランキング',
                meta_description: '介護職でもできる副業を紹介します。',
                api_posted: false,
            });
        });

        it('should throw error if draft generation fails', async () => {
            vi.spyOn(articleGenerator, 'generateArticleDraft').mockRejectedValue(
                new Error('Draft generation failed')
            );

            await expect(generateArticle(mockInput)).rejects.toThrow('Draft generation failed');
        });

        it('should throw error if SEO optimization fails', async () => {
            vi.spyOn(articleGenerator, 'generateArticleDraft').mockResolvedValue(mockDraft);
            vi.spyOn(seoOptimizer, 'optimizeArticleForSEO').mockRejectedValue(
                new Error('SEO optimization failed')
            );

            await expect(generateArticle(mockInput)).rejects.toThrow('SEO optimization failed');
        });
    });

    describe('generateMultipleArticles', () => {
        it('should generate multiple articles successfully', async () => {
            vi.spyOn(articleGenerator, 'generateArticleDraft').mockResolvedValue(mockDraft);
            vi.spyOn(seoOptimizer, 'optimizeArticleForSEO').mockResolvedValue(mockOptimized);

            const inputs = [mockInput, mockInput];
            const results = await generateMultipleArticles(inputs);

            expect(results).toHaveLength(2);
            expect(results[0].title).toBe('介護職におすすめの副業5選【2024年最新版】');
            expect(results[1].title).toBe('介護職におすすめの副業5選【2024年最新版】');
        });

        it('should continue processing even if one article fails', async () => {
            vi.spyOn(articleGenerator, 'generateArticleDraft')
                .mockRejectedValueOnce(new Error('First article failed'))
                .mockResolvedValueOnce(mockDraft);
            vi.spyOn(seoOptimizer, 'optimizeArticleForSEO').mockResolvedValue(mockOptimized);

            const inputs = [mockInput, mockInput];
            const results = await generateMultipleArticles(inputs);

            expect(results).toHaveLength(1); // 1つ目は失敗、2つ目は成功
            expect(results[0].title).toBe('介護職におすすめの副業5選【2024年最新版】');
        });

        it('should return empty array if all articles fail', async () => {
            vi.spyOn(articleGenerator, 'generateArticleDraft').mockRejectedValue(
                new Error('All failed')
            );

            const inputs = [mockInput, mockInput];
            const results = await generateMultipleArticles(inputs);

            expect(results).toHaveLength(0);
        });
    });
});
