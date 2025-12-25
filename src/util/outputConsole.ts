const SEPARATE = '=';

export const useOutputConsole = (messages: string[]): void => {
    console.log(SEPARATE.repeat(60));

    messages.forEach((x: string) => {
        console.log(x);
    });

    console.log(SEPARATE.repeat(60));
};
