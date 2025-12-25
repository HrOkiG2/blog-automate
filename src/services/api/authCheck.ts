import axios, { AxiosError } from 'axios';
import { config } from '@/config';
import { useOutputConsole } from '@/util/outputConsole';

/**
 * Laravel API connection check.
 */
export const authCheck = async (): Promise<boolean> => {
    try {
        const endpoint = config.laravel.endpoints.healthCheck;
        const apiToken = config.laravel.apiToken;

        if (!endpoint || !apiToken) {
            console.log('🔧 should be Laravel API auth check endopoint.');
            return false;
        }

        const response = await axios.get(endpoint, {
            headers: {
                Authorization: `Bearer ${apiToken}`,
                Accept: 'application/json',
            },
        });

        if (response.status === 200) {
            useOutputConsole([
                '✅ API connection successful.',
                `   ${JSON.stringify(response.data)}`,
            ]);
            return true;
        }
        return false;
    } catch (error) {
        if (error instanceof AxiosError) {
            if (error.response?.status === 401) {
                useOutputConsole([
                    '❌ Authentication failed: Invalid or expired Sanctum token',
                    '   Check your LARAVEL_API_TOKEN in .env',
                    '   To generate a new Sanctum token in Laravel:',
                    '   1. php artisan tinker',
                    '   2. $user = User::first()',
                    '   3. $token = $user->createToken("blog-automation")',
                    '   4. echo $token->plainTextToken',
                    '',
                ]);
            } else if (error.response?.status === 404) {
                useOutputConsole(['❌ API endpoint not found']);
            } else if (error.code === 'ECONNREFUSED') {
                useOutputConsole([
                    '❌ Connection refused: Laravel server is not running',
                    '   Start Laravel with: php artisan serve',
                ]);
            } else {
                useOutputConsole([`❌ Laravel API connection failed: ${error.message}`]);
            }
        } else if (error instanceof Error) {
            useOutputConsole([`❌ Laravel API connection failed: ${error.message}`]);
        } else {
            useOutputConsole(['❌ Laravel API connection failed: Unknown error']);
        }
        return false;
    }
};

if (require.main === module) {
    authCheck().catch((error) => {
        console.error('❌ Error:', error);
    });
}
