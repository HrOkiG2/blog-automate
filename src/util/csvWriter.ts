import fs from 'fs';
import { ArticleData } from '@/types/article';

/**
 * article.csvに記事データを追加する
 */
export function appendArticleToCSV(filePath: string, article: ArticleData): ArticleData {
    // IDが未設定の場合は自動採番
    if (!article.id) {
        const existingArticles = readArticlesFromCSV(filePath);
        const maxId = existingArticles.reduce((max, a) => (a.id && a.id > max ? a.id : max), 0);
        article.id = maxId + 1;
    }

    // CSVの行を作成
    const csvLine = [
        article.id,
        article.category_id,
        escapeCSVField(article.title),
        escapeCSVField(article.body),
        article.slug,
        article.status,
        escapeCSVField(article.meta_title),
        escapeCSVField(article.meta_description),
        article.api_posted ? '1' : '0',
    ].join(',');

    // ファイルに追記
    fs.appendFileSync(filePath, csvLine + '\n', 'utf-8');

    return article;
}

/**
 * CSVフィールドをエスケープする
 * カンマや改行、ダブルクォートが含まれる場合に対応
 */
function escapeCSVField(field: string): string {
    if (field.includes(',') || field.includes('\n') || field.includes('"')) {
        return `"${field.replace(/"/g, '""')}"`;
    }
    return field;
}

/**
 * article.csvからすべての記事を読み込む
 */
export function readArticlesFromCSV(filePath: string): ArticleData[] {
    if (!fs.existsSync(filePath)) {
        return [];
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.trim().split('\n');

    if (lines.length <= 1) {
        return []; // ヘッダーのみまたは空
    }

    // ヘッダーを除外
    lines.shift();

    // クォートを考慮してCSV行を結合
    const records: string[] = [];
    let currentRecord = '';
    let insideQuotes = false;

    for (const line of lines) {
        if (currentRecord) {
            currentRecord += '\n';
        }
        currentRecord += line;

        // クォートの数をカウントして、偶数なら行が完結していると判断
        let quoteCount = 0;
        for (const char of currentRecord) {
            if (char === '"') quoteCount++;
        }
        insideQuotes = quoteCount % 2 !== 0;

        if (!insideQuotes) {
            records.push(currentRecord);
            currentRecord = '';
        }
    }

    // 未完結のレコードがあれば追加
    if (currentRecord) {
        records.push(currentRecord);
    }

    return records.map((record) => parseCSVLine(record));
}

/**
 * CSV行をパースしてArticleDataに変換
 */
function parseCSVLine(line: string): ArticleData {
    const fields: string[] = [];
    let currentField = '';
    let insideQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        const nextChar = line[i + 1];

        if (char === '"') {
            if (insideQuotes && nextChar === '"') {
                currentField += '"';
                i++; // Skip next quote
            } else {
                insideQuotes = !insideQuotes;
            }
        } else if (char === ',' && !insideQuotes) {
            fields.push(currentField);
            currentField = '';
        } else {
            currentField += char;
        }
    }
    fields.push(currentField);

    return {
        id: fields[0] ? parseInt(fields[0], 10) : undefined,
        category_id: fields[1],
        title: fields[2],
        body: fields[3],
        slug: fields[4],
        status: (fields[5] as 'draft' | 'published') || 'draft',
        meta_title: fields[6],
        meta_description: fields[7],
        api_posted: fields[8] === '1',
    };
}

/**
 * CSVの特定の記事を更新する
 */
export function updateArticleInCSV(
    filePath: string,
    articleId: number,
    updates: Partial<ArticleData>
): void {
    const articles = readArticlesFromCSV(filePath);
    const index = articles.findIndex((article) => article.id === articleId);

    if (index === -1) {
        throw new Error(`Article with id ${articleId} not found in CSV`);
    }

    // 記事を更新
    articles[index] = { ...articles[index], ...updates };

    // CSV全体を書き直す
    const header = 'id,category_id,title,body,slug,status,meta_title,meta_description,api_posted\n';
    const lines = articles.map((article) =>
        [
            article.id || '',
            article.category_id,
            escapeCSVField(article.title),
            escapeCSVField(article.body),
            article.slug,
            article.status,
            escapeCSVField(article.meta_title),
            escapeCSVField(article.meta_description),
            article.api_posted ? '1' : '0',
        ].join(',')
    );

    fs.writeFileSync(filePath, header + lines.join('\n') + '\n', 'utf-8');
}
