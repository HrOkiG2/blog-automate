const SEPARATE = '=';

export const useOutputConsole = (messages: string[]): void => {
    console.log(SEPARATE.repeat(60));

    messages.forEach((x: string) => {
        console.log(x);
    });

    console.log(SEPARATE.repeat(60));
};

/**
 * コンソール出力ユーティリティ
 */
export const outputConsole = (
    type: 'info' | 'success' | 'warn' | 'error',
    message: string
): void => {
    const prefix = {
        info: 'ℹ️',
        success: '✅',
        warn: '⚠️',
        error: '❌',
    };

    console.log(`${prefix[type]} ${message}`);
};
