# Ollama モデル作成ガイド

このドキュメントでは、Ollamaを使用したカスタムモデルの作成方法について説明します。

## 📋 目次

- [前提条件](#前提条件)
- [Modelfileの種類](#modelfileの種類)
- [使用方法](#使用方法)
- [コマンドオプション](#コマンドオプション)
- [使用例](#使用例)
- [トラブルシューティング](#トラブルシューティング)

## 前提条件

- Ollamaがローカル環境にインストールされている
- Ollamaサービスが起動している（デフォルト: `http://localhost:11434`）
- `.env`ファイルに以下の設定がある:
  ```env
  OLLAMA_BASE_URL=http://localhost:11434
  OLLAMA_MODEL_NAME=your-model-name
  ```

## Modelfileの種類

プロジェクトには以下のModelfileが用意されています（`src/ollama/`ディレクトリ）:

### 1. `Modelfile.content`
ブログコンテンツ生成用のモデル設定。長文の記事作成や詳細な説明文の生成に最適化されています。

### 2. `Modelfile.seo`
SEO最適化されたコンテンツ生成用のモデル設定。メタディスクリプション、タイトル、キーワード最適化に特化しています。

### 3. `Modelfile.example`
サンプルファイル（モデル作成には使用されません）

## 使用方法

### 基本コマンド

```bash
npm run ollama:create [command] [options]
```

### コマンド

| コマンド | 説明 |
|---------|------|
| `create` | 新しいモデルを作成（デフォルト） |
| `list` | 利用可能なモデル一覧を表示 |
| `delete` | モデルを削除 |

### コマンドオプション

| オプション | 短縮形 | 説明 | デフォルト値 |
|-----------|--------|------|-------------|
| `--name` | `-n` | モデル名を指定 | `.env`の`OLLAMA_MODEL_NAME` |
| `--type` | `-t` | Modelfileタイプ（`content` または `seo`） | `content` |
| `--force` | - | 既存モデルを上書き | `false` |
| `--help` | `-h` | ヘルプメッセージを表示 | - |

## 使用例

### 1. デフォルト設定でモデルを作成

```bash
npm run ollama:create
```

`.env`で指定されたモデル名で、`Modelfile.content`を使用してモデルを作成します。

### 2. SEOタイプのモデルを作成

```bash
npm run ollama:create -- -t seo
```

`Modelfile.seo`を使用してモデルを作成します。

### 3. カスタム名でモデルを作成

```bash
npm run ollama:create -- -n my-blog-model -t content
```

指定した名前（`my-blog-model`）で、contentタイプのモデルを作成します。

### 4. 既存モデルを強制上書き

```bash
npm run ollama:create -- -n kaigo-expert -t content --force
```

既存の`kaigo-expert`モデルを上書きします。

### 5. 利用可能なモデル一覧を表示

```bash
npm run ollama:create list
```

現在Ollamaに登録されているすべてのモデルを表示します。

出力例:
```
📋 Available Ollama models:

  • kaigo-expert:latest
    Size: 4.36 GB
    Modified: 2025/12/26 14:45:28

  • kaigo-seo:latest
    Size: 4.36 GB
    Modified: 2025/12/26 14:45:25
```

### 6. モデルを削除

```bash
npm run ollama:create delete -- -n model-to-delete
```

指定したモデルを削除します。

## トラブルシューティング

### エラー: "Cannot connect to Ollama"

**原因**: Ollamaサービスが起動していない、または異なるポートで起動している

**解決方法**:
1. Ollamaが起動しているか確認:
   ```bash
   ollama list
   ```
2. `.env`ファイルの`OLLAMA_BASE_URL`を確認
3. Ollamaを起動:
   ```bash
   ollama serve
   ```

### エラー: "Model already exists"

**原因**: 同じ名前のモデルが既に存在している

**解決方法**:
1. `--force`オプションを使用して上書き:
   ```bash
   npm run ollama:create -- --force
   ```
2. または、既存モデルを削除してから再作成:
   ```bash
   npm run ollama:create delete -- -n existing-model
   npm run ollama:create
   ```

### エラー: "Invalid modelfile type"

**原因**: サポートされていないModelfileタイプを指定した

**解決方法**:
`--type`オプションには`content`または`seo`のみ指定可能です。

```bash
npm run ollama:create -- -t content  # ✅ 正しい
npm run ollama:create -- -t custom   # ❌ エラー
```

### エラー: "Modelfile not found"

**原因**: 指定されたModelfileが存在しない

**解決方法**:
1. `src/ollama/`ディレクトリに`Modelfile.content`または`Modelfile.seo`が存在するか確認
2. ファイルのパーミッションを確認

## 技術的な詳細

### モデル名の正規化

Ollamaは自動的にモデル名に`:latest`タグを付加します。例えば、`kaigo-expert`という名前でモデルを作成すると、実際には`kaigo-expert:latest`として保存されます。

### Modelfileの配置

すべてのModelfileは`src/ollama/`ディレクトリに配置されています。モデル作成時は、このディレクトリから自動的に読み込まれます。

### カスタムModelfileの追加

新しいタイプのModelfileを追加する場合:

1. `src/ollama/Modelfile.{type}`を作成
2. `src/types/ollama.ts`の`CreateModelOptions`インターフェースを更新:
   ```typescript
   export interface CreateModelOptions {
       modelName: string;
       modelfileType: 'content' | 'seo' | 'your-new-type';
       force?: boolean;
   }
   ```
3. スクリプトのヘルプメッセージを更新（必要に応じて）

## 関連ファイル

- **型定義**: [src/types/ollama.ts](src/types/ollama.ts)
- **モデル作成**: [src/services/ollama/createModel.ts](src/services/ollama/createModel.ts)
- **CLIスクリプト**: [src/scripts/createOllamaModel.ts](src/scripts/createOllamaModel.ts)
- **Modelfile**: [src/ollama/](src/ollama/)

## 参考リンク

- [Ollama公式ドキュメント](https://github.com/ollama/ollama)
- [Modelfile仕様](https://github.com/ollama/ollama/blob/main/docs/modelfile.md)
