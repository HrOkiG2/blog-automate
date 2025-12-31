import path from 'path';
import { readPersonaCSV, readSeoKeywordCSV, matchPersonaWithKeywords } from '@/util/csvReader';
import { appendArticleToCSV } from '@/util/csvWriter';
import { generateArticle } from '@/services/article/articlePipeline';
import { outputConsole } from '@/util/outputConsole';

/**
 * 記事生成メインスクリプト
 */
async function main(): Promise<void> {
    try {
        outputConsole('info', '=== 記事生成スクリプト開始 ===\n');

        // データファイルのパス
        const dataDir = path.resolve(__dirname, '../data');
        const personaPath = path.join(dataDir, 'persona.csv');
        const seoKeywordPath = path.join(dataDir, 'seo-keyword.csv');
        const articlePath = path.join(dataDir, 'article.csv');

        // CSVデータの読み込み
        outputConsole('info', 'CSVデータを読み込み中...');
        const personas = readPersonaCSV(personaPath);
        const keywords = readSeoKeywordCSV(seoKeywordPath);
        outputConsole('success', `  ペルソナ: ${personas.length}件`);
        outputConsole('success', `  SEOキーワード: ${keywords.length}件`);

        // ペルソナとキーワードのマッチング
        outputConsole('info', '\nペルソナとキーワードをマッチング中...');
        const matches = matchPersonaWithKeywords(personas, keywords);
        outputConsole('success', `  マッチング完了: ${matches.length}件の組み合わせ\n`);

        if (matches.length === 0) {
            outputConsole('warn', '生成する記事がありません。');
            return;
        }

        // 1件ずつ記事を生成して即座にCSVに保存
        let successCount = 0;
        let failureCount = 0;

        for (let i = 0; i < matches.length; i++) {
            const match = matches[i];
            outputConsole('info', `\n[${i + 1}/${matches.length}] 処理中...`);

            try {
                const input = {
                    persona: match.persona,
                    seoKeyword: match.keyword,
                };

                // 記事を生成
                const article = await generateArticle(input);

                // 即座にCSVに保存
                appendArticleToCSV(articlePath, article);
                outputConsole('success', `  ✓ 保存完了: ${article.title}`);

                successCount++;

                // API rate limit対策として少し待機
                if (i < matches.length - 1) {
                    await sleep(2000);
                }
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                outputConsole('error', `  ✗ 生成失敗: ${errorMessage}`);
                failureCount++;
                // エラーが発生しても次の記事の生成は続行
            }
        }

        outputConsole(
            'success',
            `\n=== 記事生成スクリプト完了 ===\n成功: ${successCount}件 / 失敗: ${failureCount}件 / 合計: ${matches.length}件`
        );
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        outputConsole('error', `エラーが発生しました: ${errorMessage}`);
        process.exit(1);
    }
}

/**
 * 指定時間待機する
 */
function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

// スクリプト実行
void main();
