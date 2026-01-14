import axios, { AxiosError } from 'axios';
import { config, isLaravelMockMode } from '@/config';
import { ArticleData } from '@/types/article';
import { outputConsole } from '@/util/outputConsole';

/**
 * Laravel APIへの記事投稿レスポンス型
 */
export interface ArticlePublishResponse {
    success: boolean;
    articleId?: number;
    message?: string;
}

/**
 * Laravel APIへ記事を投稿する
 */
export async function publishArticleToLaravel(
    article: ArticleData
): Promise<ArticlePublishResponse> {
    // モックモードの場合は成功を返す
    if (isLaravelMockMode()) {
        console.log('[MOCK MODE] Article would be published:', article.title);
        return {
            success: true,
            articleId: Math.floor(Math.random() * 10000),
            message: 'Mock mode: Article published successfully',
        };
    }

    const endpoint = config.laravel.endpoints.store;

    if (!endpoint) {
        throw new Error('Laravel API store endpoint is not configured');
    }

    if (!config.laravel.apiToken) {
        throw new Error('Laravel API token is not configured');
    }

    try {
        const payload = {
            category_id: article.category_id,
            title: article.title,
            body: article.body,
            slug: article.slug,
            status: article.status,
            meta_title: article.meta_title,
            meta_description: article.meta_description,
        };

        const response = await axios.post<{
            article: { id: number; [key: string]: unknown };
        }>(endpoint, payload, {
            headers: {
                Authorization: `Bearer ${config.laravel.apiToken}`,
                'Content-Type': 'application/json',
                Accept: 'application/json',
            },
            timeout: 30000, // 30秒
            withCredentials: false,
        });

        console.log('Response status:', response.status);
        console.log('Response data:', JSON.stringify(response.data, null, 2));

        // 201ステータスコードとarticleオブジェクトの存在をチェック
        if (response.status === 201 && response.data.article) {
            return {
                success: true,
                articleId: response.data.article.id,
                message: 'Article published successfully',
            };
        } else {
            return {
                success: false,
                message: 'Failed to publish article',
            };
        }
    } catch (error) {
        if (axios.isAxiosError(error)) {
            const axiosError = error as AxiosError<{ message?: string; errors?: unknown }>;
            const errorMessage =
                axiosError.response?.data?.message || axiosError.message || 'Unknown error';
            const statusCode = axiosError.response?.status;

            console.error('Error publishing article to Laravel (Axios):', {
                message: errorMessage,
                status: statusCode,
                data: axiosError.response?.data,
            });

            return {
                success: false,
                message: `API Error (${statusCode || 'N/A'}): ${errorMessage}`,
            };
        } else {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error('Error publishing article to Laravel:', errorMessage);

            return {
                success: false,
                message: `Unexpected error: ${errorMessage}`,
            };
        }
    }
}

/**
 * Laravel APIのヘルスチェック
 */
export async function checkLaravelApiHealth(): Promise<boolean> {
    if (isLaravelMockMode()) {
        outputConsole('info', `  [MOCK MODE] Health check would succeed`);
        return true;
    }

    const endpoint = config.laravel.endpoints.healthCheck;

    if (!endpoint) {
        outputConsole('warn', `  Laravel API health check endpoint is not configured`);
        return false;
    }

    try {
        const response = await axios.get(endpoint, {
            headers: {
                Authorization: `Bearer ${config.laravel.apiToken}`,
                Accept: 'application/json',
            },
            timeout: 10000, // 10秒
        });

        return response.status === 200;
    } catch (error) {
        if (axios.isAxiosError(error)) {
            outputConsole(
                'error',
                `  Laravel API health check failed: {message: ${error.message}, status: ${error.response?.status}}`
            );
        } else {
            outputConsole('error', `  Laravel API health check failed: ${JSON.stringify(error)}}`);
        }
        return false;
    }
}
