import { describe, it, expect } from 'vitest';
import { getCategoryIdFromPersona, getPersonaCategoryMapping } from '@/util/categoryMapper';

describe('categoryMapper', () => {
    describe('getPersonaCategoryMapping', () => {
        it('should load persona category mapping from ARTICLE_CATEGORIES.json', () => {
            const mapping = getPersonaCategoryMapping();

            expect(mapping).toBeDefined();
            expect(typeof mapping).toBe('object');
            expect(mapping['現役施設介護士']).toBe(3);
            expect(mapping['潜在有資格者']).toBe(2);
            expect(mapping['収入・条件重視']).toBe(1);
        });
    });

    describe('getCategoryIdFromPersona', () => {
        it('should return correct category ID for 現役施設介護士', () => {
            const categoryId = getCategoryIdFromPersona('現役施設介護士');
            expect(categoryId).toBe(3);
        });

        it('should return correct category ID for 潜在有資格者', () => {
            const categoryId = getCategoryIdFromPersona('潜在有資格者');
            expect(categoryId).toBe(2);
        });

        it('should return correct category ID for 収入・条件重視', () => {
            const categoryId = getCategoryIdFromPersona('収入・条件重視');
            expect(categoryId).toBe(1);
        });

        it('should throw error for unknown persona category', () => {
            expect(() => getCategoryIdFromPersona('Unknown Category')).toThrow(
                /Persona category "Unknown Category" not found/
            );
        });
    });
});
