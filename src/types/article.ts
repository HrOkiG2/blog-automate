/**
 * Personaデータの型定義
 */
export interface PersonaData {
    Category: string;
    Persona_Detail: string;
    Worry_Description: string;
    Tone_Instruction: string;
    Context_Scenario: string;
}

/**
 * SEOキーワードデータの型定義
 */
export interface SeoKeywordData {
    ID: string;
    Category: string;
    Main_Keyword: string;
    Sub_Keywords: string;
    User_Intent: string;
    Title_Idea: string;
}

/**
 * 生成された記事データの型定義
 */
export interface ArticleData {
    id?: number;
    category_id: string | number;
    title: string;
    body: string;
    slug: string;
    status: 'draft' | 'published';
    meta_title: string;
    meta_description: string;
    api_posted: boolean;
}

/**
 * 記事生成のための組み合わせデータ
 */
export interface ArticleGenerationInput {
    persona: PersonaData;
    seoKeyword: SeoKeywordData;
}
