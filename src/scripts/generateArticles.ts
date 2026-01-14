import path from 'path';
import { readPersonaCSV, readSeoKeywordCSV, matchPersonaWithKeywords } from '@/util/csvReader';
import { appendArticleToCSV, updateArticleInCSV } from '@/util/csvWriter';
import { generateArticle } from '@/services/article/articlePipeline';
import {
    publishArticleToLaravel,
    checkLaravelApiHealth,
} from '@/services/laravel/articlePublisher';
import { outputConsole } from '@/util/outputConsole';
import { sleep, getErrorMessage } from '@/util/common';
import { PersonaData, SeoKeywordData, ArticleData } from '@/types/article';

export interface DataPaths {
    personaPath: string;
    seoKeywordPath: string;
    articlePath: string;
}

export interface MatchData {
    persona: PersonaData;
    keyword: SeoKeywordData;
}

export interface ProcessingStats {
    successCount: number;
    failureCount: number;
    publishedCount: number;
    publishFailureCount: number;
}

/**
 * データファイルのパスを取得
 */
export function getDataPaths(): DataPaths {
    const dataDir = path.resolve(__dirname, '../data');
    return {
        personaPath: path.join(dataDir, 'persona.csv'),
        seoKeywordPath: path.join(dataDir, 'seo-keyword.csv'),
        articlePath: path.join(dataDir, 'article.csv'),
    };
}

/**
 * CSVデータを読み込む
 */
export function loadCSVData(paths: DataPaths): MatchData[] {
    outputConsole('info', 'CSVデータを読み込み中...');
    const personas = readPersonaCSV(paths.personaPath);
    const keywords = readSeoKeywordCSV(paths.seoKeywordPath);
    outputConsole('success', `  ペルソナ: ${personas.length}件`);
    outputConsole('success', `  SEOキーワード: ${keywords.length}件`);

    outputConsole('info', '\nペルソナとキーワードをマッチング中...');
    const matches = matchPersonaWithKeywords(personas, keywords);
    outputConsole('success', `  マッチング完了: ${matches.length}件の組み合わせ\n`);

    return matches;
}

/**
 * Laravel APIのヘルスチェックを実行
 */
export async function performHealthCheck(): Promise<boolean> {
    outputConsole('info', 'Laravel APIヘルスチェック中...');
    const isHealthy = await checkLaravelApiHealth();

    if (isHealthy) {
        outputConsole('success', '  ✓ Laravel APIは正常です');
    } else {
        outputConsole('warn', '  Laravel APIに接続できません（記事生成は続行します）');
    }
    outputConsole('info', '');

    return isHealthy;
}

/**
 * 記事をLaravelに投稿し、結果に応じてCSVを更新
 */
export async function publishAndUpdateArticle(
    articlePath: string,
    article: ArticleData,
    stats: ProcessingStats
): Promise<void> {
    try {
        const publishResult = await publishArticleToLaravel(article);

        if (publishResult.success) {
            updateArticleInCSV(articlePath, article.id!, { api_posted: true });
            outputConsole('success', `  ✓ Laravel投稿成功`);
            if (publishResult.articleId) {
                outputConsole('success', `    Laravel記事ID: ${publishResult.articleId}`);
            }
            stats.publishedCount++;
        } else {
            outputConsole('warn', `  Laravel投稿失敗: ${publishResult.message}`);
            stats.publishFailureCount++;
        }
    } catch (publishError) {
        outputConsole('error', `  Laravel投稿エラー: ${getErrorMessage(publishError)}`);
        stats.publishFailureCount++;
    }
}

/**
 * 単一の記事を生成・保存・投稿
 */
export async function processArticle(
    match: MatchData,
    articlePath: string,
    isLaravelHealthy: boolean,
    stats: ProcessingStats
): Promise<void> {
    try {
        const input = {
            persona: match.persona,
            seoKeyword: match.keyword,
        };

        // 記事を生成
        const article = await generateArticle(input);
        outputConsole('success', `  ✓ 記事生成完了: ${article.title}`);

        // CSVに保存
        const savedArticle = appendArticleToCSV(articlePath, article);
        outputConsole('success', `  ✓ CSV保存完了 (ID: ${savedArticle.id})`);
        stats.successCount++;

        // Laravel投稿
        if (isLaravelHealthy) {
            await publishAndUpdateArticle(articlePath, savedArticle, stats);
        }
    } catch (error) {
        outputConsole('error', `  ✗ 生成失敗: ${getErrorMessage(error)}`);
        stats.failureCount++;
    }
}

/**
 * すべての記事を処理
 */
export async function processAllArticles(
    matches: MatchData[],
    articlePath: string,
    isLaravelHealthy: boolean
): Promise<ProcessingStats> {
    const stats: ProcessingStats = {
        successCount: 0,
        failureCount: 0,
        publishedCount: 0,
        publishFailureCount: 0,
    };

    for (let i = 0; i < matches.length; i++) {
        outputConsole('info', `\n[${i + 1}/${matches.length}] 処理中...`);

        await processArticle(matches[i], articlePath, isLaravelHealthy, stats);

        // Rate limit対策
        if (i < matches.length - 1) {
            await sleep(2000);
        }
    }

    return stats;
}

/**
 * 処理結果を表示
 */
export function displayResults(
    stats: ProcessingStats,
    isLaravelHealthy: boolean,
    totalCount: number
): void {
    outputConsole('success', '\n=== 記事生成スクリプト完了 ===');
    outputConsole(
        'success',
        `記事生成: 成功 ${stats.successCount}件 / 失敗 ${stats.failureCount}件`
    );

    if (isLaravelHealthy) {
        outputConsole(
            'success',
            `Laravel投稿: 成功 ${stats.publishedCount}件 / 失敗 ${stats.publishFailureCount}件`
        );
    }

    outputConsole('success', `合計: ${totalCount}件`);
}

/**
 * 記事生成メインスクリプト
 */
async function main(): Promise<void> {
    try {
        outputConsole('info', '=== 記事生成スクリプト開始 ===\n');

        const paths = getDataPaths();
        const matches = loadCSVData(paths);

        if (matches.length === 0) {
            outputConsole('warn', '生成する記事がありません。');
            return;
        }

        const isLaravelHealthy = await performHealthCheck();
        const stats = await processAllArticles(matches, paths.articlePath, isLaravelHealthy);
        displayResults(stats, isLaravelHealthy, matches.length);
    } catch (error) {
        outputConsole('error', `エラーが発生しました: ${getErrorMessage(error)}`);
        process.exit(1);
    }
}

// スクリプト実行（テスト環境では実行しない）
if (process.env.NODE_ENV !== 'test' && require.main === module) {
    void main();
}
