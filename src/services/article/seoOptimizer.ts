import axios from 'axios';
import { config } from '@/config';
import { ArticleGenerationInput } from '@/types/article';

/**
 * SEO最適化後の記事データ
 */
export interface SeoOptimizedArticle {
    title: string;
    body: string;
    slug: string;
    meta_title: string;
    meta_description: string;
}

/**
 * 記事初稿をSEO最適化する
 */
export async function optimizeArticleForSEO(
    draft: {
        title: string;
        body: string;
        slug: string;
    },
    input: ArticleGenerationInput
): Promise<SeoOptimizedArticle> {
    const { seoKeyword } = input;

    const prompt = `
あなたはSEOの専門家です。以下の記事をSEO最適化してください。

## 現在の記事
タイトル: ${draft.title}
本文: ${draft.body}

## SEO要件
- メインキーワード: ${seoKeyword.Main_Keyword}
- サブキーワード: ${seoKeyword.Sub_Keywords}
- ユーザー意図: ${seoKeyword.User_Intent}

## 最適化タスク
1. タイトルにメインキーワードを自然に含める（50文字以内）
2. 本文にメインキーワードとサブキーワードを適切な頻度で配置
3. meta_title（60文字以内）とmeta_description（120文字以内）を作成
4. 読みやすさと検索エンジン最適化のバランスを取る

## 重要な指示
出力は必ずJSON形式のみとし、説明文や前置き、後置きのコメントは一切含めないでください。
JSONオブジェクトのみを出力してください。

## 出力形式
{
  "title": "SEO最適化されたタイトル",
  "body": "SEO最適化された本文",
  "slug": "${draft.slug}",
  "meta_title": "メタタイトル（60文字以内）",
  "meta_description": "メタディスクリプション（120文字以内）"
}
`;

    try {
        const response = await axios.post<{ response: string }>(
            `${config.ollama.baseUrl}/api/generate`,
            {
                model: config.ollama.seoModel,
                prompt: prompt,
                stream: false,
                format: 'json',
                options: {
                    temperature: 0.7,
                    top_p: 0.9,
                },
            },
            {
                timeout: config.ollama.timeout,
            }
        );

        const generatedText: string = response.data.response;

        // デバッグ: 生成されたテキストを出力
        console.log('===== SEO Optimized Text (first 500 chars) =====');
        console.log(generatedText.substring(0, 500));
        console.log('===== End of SEO Optimized Text =====');

        // JSONオブジェクトを抽出（複数行対応、最後の}まで貪欲マッチ）
        const jsonMatch = generatedText.match(/\{[\s\S]*\}/);

        if (!jsonMatch) {
            console.error('Full generated text:', generatedText);
            throw new Error('Failed to parse JSON from SEO model response');
        }

        let parsed: {
            title: string;
            body: string;
            slug?: string;
            meta_title: string;
            meta_description: string;
        };

        try {
            parsed = JSON.parse(jsonMatch[0]) as {
                title: string;
                body: string;
                slug?: string;
                meta_title: string;
                meta_description: string;
            };
        } catch (parseError) {
            console.error('JSON parsing failed. Extracted text:', jsonMatch[0]);
            throw new Error(
                `Failed to parse JSON: ${parseError instanceof Error ? parseError.message : String(parseError)}`
            );
        }

        // 必須フィールドの検証
        if (!parsed.title || !parsed.body || !parsed.meta_title || !parsed.meta_description) {
            console.error('Parsed JSON missing required fields:', parsed);
            throw new Error(
                'SEO optimized article is missing required fields (title, body, meta_title, or meta_description)'
            );
        }
        return {
            title: parsed.title,
            body: parsed.body,
            slug: parsed.slug || draft.slug,
            meta_title: parsed.meta_title,
            meta_description: parsed.meta_description,
        };
    } catch (error) {
        if (axios.isAxiosError(error)) {
            const errorDetails = {
                message: error.message,
                code: error.code,
                status: error.response?.status,
                statusText: error.response?.statusText,
                data: error.response?.data as unknown,
            };
            console.error(
                'Error optimizing article for SEO (Axios):',
                JSON.stringify(errorDetails, null, 2)
            );
        } else {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error('Error optimizing article for SEO:', errorMessage);
            if (error instanceof Error && error.stack) {
                console.error('Stack trace:', error.stack);
            }
        }
        throw error;
    }
}
