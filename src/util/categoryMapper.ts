import fs from 'fs';
import path from 'path';

/**
 * 記事カテゴリの型定義
 */
interface ArticleCategory {
    id: number;
    name: string;
    slug: string;
}

/**
 * ペルソナカテゴリから数値カテゴリIDへのマッピング型
 *
 * Persona Category → Article Category Name のマッピング:
 * - 現役施設介護士 (Current facility care worker) → お仕事の相談 (Job consultation)
 * - 潜在有資格者 (Latent qualified person) → 介護資格 (Care qualifications)
 * - 収入・条件重視 (Income/conditions priority) → 訪問介護 (Visiting care services)
 */
interface PersonaCategoryMapping {
    [personaCategory: string]: number;
}

/**
 * ペルソナとカテゴリ名の対応関係
 * ARTICLE_CATEGORIES.jsonのnameと対応
 */
const PERSONA_TO_CATEGORY_NAME: { [key: string]: string } = {
    現役施設介護士: 'お仕事の相談',
    潜在有資格者: '介護資格',
    '収入・条件重視': '訪問介護',
};

/**
 * ARTICLE_CATEGORIES.jsonを読み込む
 */
function loadArticleCategories(): ArticleCategory[] {
    const categoriesPath = path.resolve(__dirname, '../data/ARTICLE_CATEGORIES.json');

    if (!fs.existsSync(categoriesPath)) {
        throw new Error(
            `ARTICLE_CATEGORIES.json not found at ${categoriesPath}. Please create this file.`
        );
    }

    const categoriesData = fs.readFileSync(categoriesPath, 'utf-8');
    return JSON.parse(categoriesData) as ArticleCategory[];
}

/**
 * ペルソナカテゴリから数値カテゴリIDへのマッピングを取得
 */
export function getPersonaCategoryMapping(): PersonaCategoryMapping {
    const categories = loadArticleCategories();
    const mapping: PersonaCategoryMapping = {};

    for (const [personaCategory, categoryName] of Object.entries(PERSONA_TO_CATEGORY_NAME)) {
        const category = categories.find((cat) => cat.name === categoryName);
        if (!category) {
            throw new Error(
                `Category name "${categoryName}" not found in ARTICLE_CATEGORIES.json for persona "${personaCategory}"`
            );
        }
        mapping[personaCategory] = category.id;
    }

    return mapping;
}

/**
 * ペルソナカテゴリから数値カテゴリIDに変換
 * @param personaCategory ペルソナのカテゴリ（例: "現役施設介護士"）
 * @returns 数値カテゴリID（例: 3）
 * @throws ペルソナカテゴリがマッピングに存在しない場合
 */
export function getCategoryIdFromPersona(personaCategory: string): number {
    const mapping = getPersonaCategoryMapping();

    if (!(personaCategory in mapping)) {
        throw new Error(
            `Persona category "${personaCategory}" not found. Available categories: ${Object.keys(mapping).join(', ')}`
        );
    }

    return mapping[personaCategory];
}
