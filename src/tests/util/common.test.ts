import { describe, it, expect } from 'vitest';
import { sleep, getErrorMessage } from '@/util/common';

describe('common utilities', () => {
    describe('sleep', () => {
        it('should wait for specified milliseconds', async () => {
            const start = Date.now();
            await sleep(100);
            const elapsed = Date.now() - start;

            // Allow some margin for timing
            expect(elapsed).toBeGreaterThanOrEqual(90);
            expect(elapsed).toBeLessThan(200);
        });

        it('should return a promise', () => {
            const result = sleep(10);
            expect(result).toBeInstanceOf(Promise);
        });

        it('should resolve without value', async () => {
            const result = await sleep(10);
            expect(result).toBeUndefined();
        });
    });

    describe('getErrorMessage', () => {
        it('should extract message from Error instance', () => {
            const error = new Error('Test error message');
            expect(getErrorMessage(error)).toBe('Test error message');
        });

        it('should convert string to string', () => {
            expect(getErrorMessage('Simple error')).toBe('Simple error');
        });

        it('should convert number to string', () => {
            expect(getErrorMessage(404)).toBe('404');
        });

        it('should convert object to string', () => {
            const obj = { code: 'ERR_001', message: 'Error occurred' };
            expect(getErrorMessage(obj)).toBe('[object Object]');
        });

        it('should convert null to string', () => {
            expect(getErrorMessage(null)).toBe('null');
        });

        it('should convert undefined to string', () => {
            expect(getErrorMessage(undefined)).toBe('undefined');
        });

        it('should handle custom error classes', () => {
            class CustomError extends Error {
                constructor(message: string) {
                    super(message);
                    this.name = 'CustomError';
                }
            }

            const error = new CustomError('Custom error message');
            expect(getErrorMessage(error)).toBe('Custom error message');
        });
    });
});
