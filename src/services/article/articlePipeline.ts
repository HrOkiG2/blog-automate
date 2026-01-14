import { ArticleGenerationInput, ArticleData } from '@/types/article';
import { generateArticleDraft } from './articleGenerator';
import { optimizeArticleForSEO } from './seoOptimizer';
import { outputConsole } from '@/util/outputConsole';
import { getCategoryIdFromPersona } from '@/util/categoryMapper';
import { sleep } from '@/util/common';

/**
 * 2段階の記事生成パイプライン
 * 1. 記事生成モデルで初稿を作成
 * 2. SEOモデルで最適化
 */
export async function generateArticle(input: ArticleGenerationInput): Promise<ArticleData> {
    const { seoKeyword } = input;

    outputConsole('info', `記事生成開始: ${seoKeyword.Title_Idea}`);

    // フェーズ1: 記事初稿の生成
    outputConsole('info', '  ステップ1: 記事生成モデルで初稿を作成中...');
    const draft = await generateArticleDraft(input);
    outputConsole('success', `  ✓ 初稿完成: ${draft.title}`);

    // フェーズ2: SEO最適化
    outputConsole('info', '  ステップ2: SEOモデルで最適化中...');
    const optimized = await optimizeArticleForSEO(draft, input);
    outputConsole('success', `  ✓ SEO最適化完了: ${optimized.title}`);

    // ペルソナカテゴリから数値カテゴリIDに変換
    const categoryId = getCategoryIdFromPersona(input.persona.Category);

    // ArticleData形式に変換
    const article: ArticleData = {
        category_id: categoryId.toString(),
        title: optimized.title,
        body: optimized.body,
        slug: optimized.slug,
        status: 'draft',
        meta_title: optimized.meta_title,
        meta_description: optimized.meta_description,
        api_posted: false,
    };

    outputConsole('success', `記事生成完了: ${article.title}`);
    return article;
}

/**
 * 複数の記事を一括生成
 */
export async function generateMultipleArticles(
    inputs: ArticleGenerationInput[]
): Promise<ArticleData[]> {
    const articles: ArticleData[] = [];

    outputConsole('info', `${inputs.length}件の記事を生成します`);

    for (let i = 0; i < inputs.length; i++) {
        const input = inputs[i];
        outputConsole('info', `\n[${i + 1}/${inputs.length}] 処理中...`);

        try {
            const article = await generateArticle(input);
            articles.push(article);

            // API rate limit対策として少し待機
            if (i < inputs.length - 1) {
                await sleep(2000);
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            outputConsole('error', `記事生成に失敗: ${errorMessage}`);
            // エラーが発生しても次の記事の生成は続行
        }
    }

    outputConsole(
        'success',
        `\n全体完了: ${articles.length}/${inputs.length}件の記事を生成しました`
    );
    return articles;
}
