import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { readPersonaCSV, readSeoKeywordCSV, matchPersonaWithKeywords } from '@/util/csvReader';

describe('csvReader', () => {
    const testDir = path.join(__dirname, '../../../test-data');
    const personaPath = path.join(testDir, 'test-persona.csv');
    const seoKeywordPath = path.join(testDir, 'test-seo-keyword.csv');

    beforeEach(() => {
        // テスト用ディレクトリを作成
        if (!fs.existsSync(testDir)) {
            fs.mkdirSync(testDir, { recursive: true });
        }

        // テスト用persona.csvを作成
        const personaContent = `Category,Persona_Detail,Worry_Description,Tone_Instruction,Context_Scenario
現役施設介護士,特養で働く介護士,給料が低い,共感型,給料日の悩み
潜在有資格者,元ヘルパー,ブランクがある,安心感のあるトーン,資格を活かしたい`;

        fs.writeFileSync(personaPath, personaContent, 'utf-8');

        // テスト用seo-keyword.csvを作成
        const seoKeywordContent = `ID,Category,Main_Keyword,Sub_Keywords,User_Intent,Title_Idea
A-01,現役施設介護士,介護職,副業,副業を知りたい,介護職におすすめの副業
B-01,潜在有資格者,初任者研修,活かす,資格を活かしたい,初任者研修を活かす方法`;

        fs.writeFileSync(seoKeywordPath, seoKeywordContent, 'utf-8');
    });

    afterEach(() => {
        // テストファイルをクリーンアップ
        if (fs.existsSync(personaPath)) {
            fs.unlinkSync(personaPath);
        }
        if (fs.existsSync(seoKeywordPath)) {
            fs.unlinkSync(seoKeywordPath);
        }
        if (fs.existsSync(testDir)) {
            fs.rmSync(testDir, { recursive: true, force: true });
        }
    });

    describe('readPersonaCSV', () => {
        it('should read persona CSV correctly', () => {
            const personas = readPersonaCSV(personaPath);

            expect(personas).toHaveLength(2);
            expect(personas[0]).toEqual({
                Category: '現役施設介護士',
                Persona_Detail: '特養で働く介護士',
                Worry_Description: '給料が低い',
                Tone_Instruction: '共感型',
                Context_Scenario: '給料日の悩み',
            });
            expect(personas[1].Category).toBe('潜在有資格者');
        });
    });

    describe('readSeoKeywordCSV', () => {
        it('should read SEO keyword CSV correctly', () => {
            const keywords = readSeoKeywordCSV(seoKeywordPath);

            expect(keywords).toHaveLength(2);
            expect(keywords[0]).toEqual({
                ID: 'A-01',
                Category: '現役施設介護士',
                Main_Keyword: '介護職',
                Sub_Keywords: '副業',
                User_Intent: '副業を知りたい',
                Title_Idea: '介護職におすすめの副業',
            });
            expect(keywords[1].Category).toBe('潜在有資格者');
        });
    });

    describe('matchPersonaWithKeywords', () => {
        it('should match personas with keywords by category', () => {
            const personas = readPersonaCSV(personaPath);
            const keywords = readSeoKeywordCSV(seoKeywordPath);
            const matches = matchPersonaWithKeywords(personas, keywords);

            expect(matches).toHaveLength(2);
            expect(matches[0].persona.Category).toBe('現役施設介護士');
            expect(matches[0].keyword.ID).toBe('A-01');
            expect(matches[1].persona.Category).toBe('潜在有資格者');
            expect(matches[1].keyword.ID).toBe('B-01');
        });

        it('should not match if categories do not align', () => {
            const personas = readPersonaCSV(personaPath);
            const keywords = [
                {
                    ID: 'C-01',
                    Category: '存在しないカテゴリ',
                    Main_Keyword: 'テスト',
                    Sub_Keywords: 'テスト',
                    User_Intent: 'テスト',
                    Title_Idea: 'テスト',
                },
            ];
            const matches = matchPersonaWithKeywords(personas, keywords);

            expect(matches).toHaveLength(0);
        });
    });
});
