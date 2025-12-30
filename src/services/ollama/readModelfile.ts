import * as fs from 'fs';
import * as path from 'path';

/**
 * Modelfileを読み込む
 * @param modelfilePath - Modelfileのパス（相対パスまたは絶対パス）
 * @returns Modelfileの内容
 * @throws Modelfileが見つからない場合はエラー
 */
export function readModelfile(modelfilePath: string): string {
    const absolutePath = path.isAbsolute(modelfilePath)
        ? modelfilePath
        : path.resolve(process.cwd(), modelfilePath);

    if (!fs.existsSync(absolutePath)) {
        throw new Error(`Modelfile not found: ${absolutePath}`);
    }

    return fs.readFileSync(absolutePath, 'utf-8');
}
