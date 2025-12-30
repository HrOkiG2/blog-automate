import { config } from '@/config';
import { createModel, listModels, deleteModel } from '@/services/ollama';
import { useOutputConsole } from '@/util/outputConsole';

/**
 * CLIの引数を解析
 */
function parseArgs() {
    const args = process.argv.slice(2);
    const options = {
        command: 'create',
        modelName: config.ollama.modelName,
        modelfileType: 'content' as 'content' | 'seo',
        force: false,
        help: false,
    };

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];

        switch (arg) {
            case '--help':
            case '-h':
                options.help = true;
                break;
            case '--name':
            case '-n':
                options.modelName = args[++i];
                break;
            case '--type':
            case '-t':
                const type = args[++i];
                if (type !== 'content' && type !== 'seo') {
                    throw new Error(`Invalid modelfile type: ${type}. Must be 'content' or 'seo'.`);
                }
                options.modelfileType = type;
                break;
            case '--force':
                options.force = true;
                break;
            case 'create':
            case 'list':
            case 'delete':
                options.command = arg;
                break;
        }
    }

    return options;
}

/**
 * ヘルプメッセージを表示
 */
function showHelp() {
    console.log(`
📚 Ollama Model Manager

Usage:
  npm run ollama:create [command] [options]

Commands:
  create              Create a new Ollama model (default)
  list                List all available models
  delete              Delete a model

Options:
  -n, --name <name>   Model name (default: from .env OLLAMA_MODEL_NAME)
  -t, --type <type>   Modelfile type: 'content' or 'seo' (default: content)
  --force             Overwrite existing model
  -h, --help          Show this help message

Examples:
  # Create a model with default settings (content type)
  npm run ollama:create

  # Create a model with custom name
  npm run ollama:create -- -n my-custom-model

  # Create a model with SEO type
  npm run ollama:create -- -t seo

  # Force overwrite existing model
  npm run ollama:create -- --force

  # List all models
  npm run ollama:create list

  # Delete a model
  npm run ollama:create delete -- -n model-to-delete
  `);
}

/**
 * メイン処理
 */
async function main() {
    const options = parseArgs();

    if (options.help) {
        showHelp();
        return;
    }

    try {
        const baseUrl = config.ollama.baseUrl;

        switch (options.command) {
            case 'create':
                await createModel(baseUrl, {
                    modelName: options.modelName,
                    modelfileType: options.modelfileType,
                    force: options.force,
                });
                break;

            case 'list':
                const models = await listModels(baseUrl);
                if (models.length === 0) {
                    useOutputConsole(['📋 Available Ollama models:', '', 'No models found.']);
                } else {
                    const modelList = ['📋 Available Ollama models:', ''];
                    models.forEach((model) => {
                        modelList.push(`  • ${model.name}`);
                        modelList.push(
                            `    Size: ${(model.size / 1024 / 1024 / 1024).toFixed(2)} GB`
                        );
                        modelList.push(
                            `    Modified: ${new Date(model.modified_at).toLocaleString()}`
                        );
                        modelList.push('');
                    });
                    useOutputConsole(modelList);
                }
                break;

            case 'delete':
                await deleteModel(baseUrl, options.modelName);
                break;

            default:
                console.error(`Unknown command: ${options.command}`);
                showHelp();
                process.exit(1);
        }
    } catch (error) {
        if (error instanceof Error) {
            console.error(`❌ Error: ${error.message}`);
        } else {
            console.error('❌ Unknown error occurred');
        }
        process.exit(1);
    }
}

void main();
