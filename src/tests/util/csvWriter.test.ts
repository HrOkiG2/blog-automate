import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { appendArticleToCSV, readArticlesFromCSV } from '@/util/csvWriter';
import { ArticleData } from '@/types/article';

describe('csvWriter', () => {
    const testDir = path.join(__dirname, '../../../test-data');
    const articlePath = path.join(testDir, 'test-article.csv');

    beforeEach(() => {
        // テスト用ディレクトリを作成
        if (!fs.existsSync(testDir)) {
            fs.mkdirSync(testDir, { recursive: true });
        }

        // テスト用article.csvのヘッダーを作成
        const header =
            'id,category_id,title,body,slug,status,meta_title,meta_description,api_posted,\n';
        fs.writeFileSync(articlePath, header, 'utf-8');
    });

    afterEach(() => {
        // テストファイルをクリーンアップ
        if (fs.existsSync(articlePath)) {
            fs.unlinkSync(articlePath);
        }
        if (fs.existsSync(testDir)) {
            fs.rmSync(testDir, { recursive: true, force: true });
        }
    });

    describe('appendArticleToCSV', () => {
        it('should append article to CSV', () => {
            const article: ArticleData = {
                id: 1,
                category_id: 'A-01',
                title: 'テスト記事',
                body: 'これはテスト記事です。',
                slug: 'test-article',
                status: 'draft',
                meta_title: 'テスト記事のメタタイトル',
                meta_description: 'テスト記事のメタディスクリプション',
                api_posted: false,
            };

            appendArticleToCSV(articlePath, article);

            const content = fs.readFileSync(articlePath, 'utf-8');
            const lines = content.trim().split('\n');

            expect(lines).toHaveLength(2); // ヘッダー + 1記事
            expect(lines[1]).toContain('A-01');
            expect(lines[1]).toContain('テスト記事');
            expect(lines[1]).toContain('test-article');
        });

        it('should escape CSV fields with commas', () => {
            const article: ArticleData = {
                category_id: 'A-01',
                title: 'タイトル, カンマ含む',
                body: '本文, にもカンマがある',
                slug: 'test-slug',
                status: 'draft',
                meta_title: 'メタタイトル',
                meta_description: 'メタディスクリプション',
                api_posted: false,
            };

            appendArticleToCSV(articlePath, article);

            const content = fs.readFileSync(articlePath, 'utf-8');
            expect(content).toContain('"タイトル, カンマ含む"');
            expect(content).toContain('"本文, にもカンマがある"');
        });

        it('should handle multiple articles', () => {
            const article1: ArticleData = {
                id: 1,
                category_id: 'A-01',
                title: '記事1',
                body: '本文1',
                slug: 'article-1',
                status: 'draft',
                meta_title: 'メタ1',
                meta_description: 'ディスクリプション1',
                api_posted: false,
            };

            const article2: ArticleData = {
                id: 2,
                category_id: 'A-02',
                title: '記事2',
                body: '本文2',
                slug: 'article-2',
                status: 'published',
                meta_title: 'メタ2',
                meta_description: 'ディスクリプション2',
                api_posted: true,
            };

            appendArticleToCSV(articlePath, article1);
            appendArticleToCSV(articlePath, article2);

            const content = fs.readFileSync(articlePath, 'utf-8');
            const lines = content.trim().split('\n');

            expect(lines).toHaveLength(3); // ヘッダー + 2記事
        });
    });

    describe('readArticlesFromCSV', () => {
        it('should return empty array if file does not exist', () => {
            const nonExistentPath = path.join(testDir, 'non-existent.csv');
            const articles = readArticlesFromCSV(nonExistentPath);

            expect(articles).toEqual([]);
        });

        it('should return empty array if CSV only has header', () => {
            const articles = readArticlesFromCSV(articlePath);

            expect(articles).toEqual([]);
        });

        it('should read articles from CSV', () => {
            const article: ArticleData = {
                id: 1,
                category_id: 'A-01',
                title: 'テスト記事',
                body: 'これはテスト記事です。',
                slug: 'test-article',
                status: 'draft',
                meta_title: 'テスト記事のメタタイトル',
                meta_description: 'テスト記事のメタディスクリプション',
                api_posted: false,
            };

            appendArticleToCSV(articlePath, article);
            const articles = readArticlesFromCSV(articlePath);

            expect(articles).toHaveLength(1);
            expect(articles[0].category_id).toBe('A-01');
            expect(articles[0].title).toBe('テスト記事');
            expect(articles[0].status).toBe('draft');
            expect(articles[0].api_posted).toBe(false);
        });
    });
});
