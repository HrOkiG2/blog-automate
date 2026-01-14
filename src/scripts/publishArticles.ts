import path from 'path';
import { readArticlesFromCSV, updateArticleInCSV } from '@/util/csvWriter';
import {
    publishArticleToLaravel,
    checkLaravelApiHealth,
} from '@/services/laravel/articlePublisher';
import { outputConsole } from '@/util/outputConsole';
import { ArticleData } from '@/types/article';
import { getCategoryIdFromPersona } from '@/util/categoryMapper';
import { sleep, getErrorMessage } from '@/util/common';

export interface PublishStats {
    successCount: number;
    failureCount: number;
}

/**
 * 記事データファイルのパスを取得
 */
export function getArticlePath(): string {
    const dataDir = path.resolve(__dirname, '../data');
    return path.join(dataDir, 'article.csv');
}

/**
 * Laravel APIのヘルスチェックを実行し、失敗時は処理を終了
 */
export async function checkApiHealthOrExit(): Promise<void> {
    outputConsole('info', 'Laravel APIヘルスチェック中...');
    const isHealthy = await checkLaravelApiHealth();

    if (!isHealthy) {
        outputConsole('error', 'Laravel APIが利用できません。処理を中止します。');
        process.exit(1);
    }
    outputConsole('success', '  ✓ Laravel APIは正常です\n');
}

/**
 * CSVから記事を読み込み、未投稿の記事をフィルタリング
 */
export function loadUnpublishedArticles(articlePath: string): ArticleData[] {
    outputConsole('info', 'CSVから記事を読み込み中...');
    const articles = readArticlesFromCSV(articlePath);
    outputConsole('success', `  読み込み完了: ${articles.length}件\n`);

    const unpublishedArticles = articles.filter((article: ArticleData) => !article.api_posted);

    if (unpublishedArticles.length === 0) {
        outputConsole('warn', '投稿する記事がありません。');
        return [];
    }

    outputConsole(
        'info',
        `未投稿の記事: ${unpublishedArticles.length}件 / 合計: ${articles.length}件\n`
    );

    return unpublishedArticles;
}

/**
 * カテゴリIDを数値に変換
 */
export function convertCategoryIdToNumber(categoryId: string | number): number {
    if (typeof categoryId === 'string' && isNaN(Number(categoryId))) {
        const numericId = getCategoryIdFromPersona(categoryId);
        outputConsole('info', `  カテゴリ変換: "${categoryId}" → ${numericId}`);
        return numericId;
    }

    return typeof categoryId === 'number' ? categoryId : Number(categoryId);
}

/**
 * 記事データを投稿用に変換
 */
export function prepareArticleForPublish(article: ArticleData): ArticleData {
    const numericCategoryId = convertCategoryIdToNumber(article.category_id);
    return {
        ...article,
        category_id: numericCategoryId,
    };
}

/**
 * 単一の記事を投稿
 */
export async function publishSingleArticle(
    article: ArticleData,
    articlePath: string,
    stats: PublishStats
): Promise<void> {
    try {
        const articleToPublish = prepareArticleForPublish(article);
        const result = await publishArticleToLaravel(articleToPublish);

        if (result.success) {
            updateArticleInCSV(articlePath, article.id!, { api_posted: true });
            outputConsole('success', `  ✓ 投稿成功`);
            if (result.articleId) {
                outputConsole('success', `    Laravel記事ID: ${result.articleId}`);
            }
            stats.successCount++;
        } else {
            outputConsole('error', `  ✗ 投稿失敗: ${result.message}`);
            stats.failureCount++;
        }
    } catch (error) {
        outputConsole('error', `  ✗ 投稿エラー: ${getErrorMessage(error)}`);
        stats.failureCount++;
    }
}

/**
 * すべての記事を投稿
 */
export async function publishAllArticles(
    unpublishedArticles: ArticleData[],
    articlePath: string
): Promise<PublishStats> {
    const stats: PublishStats = {
        successCount: 0,
        failureCount: 0,
    };

    for (let i = 0; i < unpublishedArticles.length; i++) {
        const article = unpublishedArticles[i];
        outputConsole('info', `\n[${i + 1}/${unpublishedArticles.length}] 投稿中...`);
        outputConsole('info', `  タイトル: ${article.title}`);

        await publishSingleArticle(article, articlePath, stats);

        // Rate limit対策
        if (i < unpublishedArticles.length - 1) {
            await sleep(1000);
        }
    }

    return stats;
}

/**
 * 投稿結果を表示
 */
export function displayResults(stats: PublishStats, totalCount: number): void {
    outputConsole(
        'success',
        `\n=== 記事投稿スクリプト完了 ===\n成功: ${stats.successCount}件 / 失敗: ${stats.failureCount}件 / 合計: ${totalCount}件`
    );
}

/**
 * 記事投稿メインスクリプト
 * CSVから未投稿の記事を読み込み、Laravel APIに投稿する
 */
async function main(): Promise<void> {
    try {
        outputConsole('info', '=== 記事投稿スクリプト開始 ===\n');

        await checkApiHealthOrExit();

        const articlePath = getArticlePath();
        const unpublishedArticles = loadUnpublishedArticles(articlePath);

        if (unpublishedArticles.length === 0) {
            return;
        }

        const stats = await publishAllArticles(unpublishedArticles, articlePath);
        displayResults(stats, unpublishedArticles.length);
    } catch (error) {
        outputConsole('error', `エラーが発生しました: ${getErrorMessage(error)}`);
        process.exit(1);
    }
}

// スクリプト実行（テスト環境では実行しない）
if (process.env.NODE_ENV !== 'test' && require.main === module) {
    void main();
}
