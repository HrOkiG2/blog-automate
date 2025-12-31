import axios from 'axios';
import { config } from '@/config';
import { ArticleGenerationInput } from '@/types/article';

/**
 * 記事生成モデルの応答型
 */
interface ArticleGenerationResponse {
    title: string;
    body: string;
    slug: string;
}

/**
 * 記事生成モデルに問い合わせて初稿を生成する
 */
export async function generateArticleDraft(
    input: ArticleGenerationInput
): Promise<ArticleGenerationResponse> {
    const { persona, seoKeyword } = input;

    const prompt = `
あなたは介護業界に特化したブログ記事のライターです。

## ペルソナ情報
- カテゴリ: ${persona.Category}
- ペルソナ詳細: ${persona.Persona_Detail}
- 悩み: ${persona.Worry_Description}
- トーン: ${persona.Tone_Instruction}
- コンテキスト: ${persona.Context_Scenario}

## SEO要件
- メインキーワード: ${seoKeyword.Main_Keyword}
- サブキーワード: ${seoKeyword.Sub_Keywords}
- ユーザー意図: ${seoKeyword.User_Intent}
- タイトル案: ${seoKeyword.Title_Idea}

上記の情報を元に、ペルソナに響く記事を作成してください。

## 重要な指示
出力は必ずJSON形式のみとし、説明文や前置き、後置きのコメントは一切含めないでください。
JSONオブジェクトのみを出力してください。

## 記事のトーン（Few-Shot Examples）

【NG例：冷たい・一般的・AIっぽい】
訪問介護のメリットは、時間の融通が利くことです。主婦の方でも働きやすい環境が整っています。また、時給も比較的高く設定されているため、効率よく稼ぐことができます。

【OK例：共感・具体的・先輩口調】
「家事の合間にサクッと働きたい」。そう思っても、普通のパートだと時間の調整が難しいですよね。
でも、登録ヘルパーなら大丈夫。「午前中の2時間だけ」といった働き方ができるので、お子さんが学校に行っている間だけ稼ぐ、なんてことも可能なんです。
実はこれ、コンビニバイトより時給が良いので、主婦の皆さんの間で密かな人気なんですよ。

## 出力形式
{
  "title": "記事タイトル（50文字以内）",
  "body": "記事本文（2000文字以上、見出しを含む）",
  "slug": "url-friendly-slug"
}
`;

    try {
        const response = await axios.post<{ response: string }>(
            `${config.ollama.baseUrl}/api/generate`,
            {
                model: config.ollama.contentModel,
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
        console.log('===== Generated Text (first 500 chars) =====');
        console.log(generatedText.substring(0, 500));
        console.log('===== End of Generated Text =====');

        // JSONオブジェクトを抽出（複数行対応、最後の}まで貪欲マッチ）
        const jsonMatch = generatedText.match(/\{[\s\S]*\}/);

        if (!jsonMatch) {
            console.error('Full generated text:', generatedText);
            throw new Error('Failed to parse JSON from model response');
        }

        let parsed: {
            title: string;
            body: string;
            slug?: string;
        };

        try {
            parsed = JSON.parse(jsonMatch[0]) as {
                title: string;
                body: string;
                slug?: string;
            };
        } catch (parseError) {
            console.error('JSON parsing failed. Extracted text:', jsonMatch[0]);
            throw new Error(
                `Failed to parse JSON: ${parseError instanceof Error ? parseError.message : String(parseError)}`
            );
        }

        // 必須フィールドの検証
        if (!parsed.title || !parsed.body) {
            console.error('Parsed JSON missing required fields:', parsed);
            throw new Error('Generated article is missing required fields (title or body)');
        }
        return {
            title: parsed.title,
            body: parsed.body,
            slug: parsed.slug || generateSlug(parsed.title),
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
                'Error generating article draft (Axios):',
                JSON.stringify(errorDetails, null, 2)
            );
        } else {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error('Error generating article draft:', errorMessage);
            if (error instanceof Error && error.stack) {
                console.error('Stack trace:', error.stack);
            }
        }
        throw error;
    }
}

/**
 * タイトルからスラッグを生成する補助関数
 */
function generateSlug(title: string): string {
    return title
        .toLowerCase()
        .replace(/[^a-z0-9\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]+/g, '-')
        .replace(/^-|-$/g, '')
        .substring(0, 100);
}
