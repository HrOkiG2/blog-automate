import fs from 'fs';
import { ArticleData } from '@/types/article';

/**
 * article.csvに記事データを追加する
 */
export function appendArticleToCSV(filePath: string, article: ArticleData): void {
    // CSVの行を作成
    const csvLine = [
        article.id || '',
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

    const [_header, ...dataRows] = lines;
    return dataRows.map((line) => parseCSVLine(line));
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
