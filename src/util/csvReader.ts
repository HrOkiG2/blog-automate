import fs from 'fs';
import { PersonaData, SeoKeywordData } from '@/types/article';

/**
 * CSVファイルを読み込んでパースする共通関数
 */
function parseCSV(filePath: string): string[][] {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.trim().split('\n');
    return lines.map((line) => line.split(','));
}

/**
 * persona.csvを読み込む
 */
export function readPersonaCSV(filePath: string): PersonaData[] {
    const rows = parseCSV(filePath);
    const [_header, ...dataRows] = rows;

    return dataRows.map((row) => ({
        Category: row[0],
        Persona_Detail: row[1],
        Worry_Description: row[2],
        Tone_Instruction: row[3],
        Context_Scenario: row[4],
    }));
}

/**
 * seo-keyword.csvを読み込む
 */
export function readSeoKeywordCSV(filePath: string): SeoKeywordData[] {
    const rows = parseCSV(filePath);
    const [_header, ...dataRows] = rows;

    return dataRows.map((row) => ({
        ID: row[0],
        Category: row[1],
        Main_Keyword: row[2],
        Sub_Keywords: row[3],
        User_Intent: row[4],
        Title_Idea: row[5],
    }));
}

/**
 * PersonaとSEOキーワードをカテゴリでマッチングする
 */
export function matchPersonaWithKeywords(
    personas: PersonaData[],
    keywords: SeoKeywordData[]
): Array<{ persona: PersonaData; keyword: SeoKeywordData }> {
    const matches: Array<{ persona: PersonaData; keyword: SeoKeywordData }> = [];

    for (const keyword of keywords) {
        const matchingPersona = personas.find((p) => p.Category === keyword.Category);
        if (matchingPersona) {
            matches.push({
                persona: matchingPersona,
                keyword: keyword,
            });
        }
    }

    return matches;
}
