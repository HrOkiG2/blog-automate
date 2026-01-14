# Blog Automation
SaaS side project

AIを活用したブログ記事自動生成システム

## 概要

Blog Automationは、ペルソナとSEOキーワードを組み合わせて、Ollama（ローカルLLM）を使用してブログ記事を自動生成・投稿するシステムです。介護・福祉業界に特化した記事生成を行い、Laravel APIと連携して自動投稿を実現します。

## 特徴

- **2段階の記事生成プロセス**
  - 記事生成モデルで初稿を作成
  - SEOモデルで最適化を実施
- **CSVベースのデータ管理**
  - ペルソナ、キーワード、記事データをCSVで管理
  - 投稿状態の追跡が可能
- **Laravel API連携**
  - 生成された記事を自動投稿
  - ヘルスチェック機能で接続確認
- **カテゴリマッピング**
  - ペルソナカテゴリから記事カテゴリIDへ自動変換
- **モックモード対応**
  - API未接続でもテスト実行可能
- **Rate Limit対策**
  - 生成・投稿時の適切な遅延処理

## 技術スタック

### 言語・ランタイム
- TypeScript 5.9.3
- Node.js

### 主要ライブラリ
- **axios** - HTTP通信
- **dotenv** - 環境変数管理
- **better-sqlite3** - SQLiteデータベース
- **node-cron** - スケジューラ
- **zod** - スキーマ検証

### 開発ツール
- **vitest** - ユニットテスト
- **eslint** - コード品質チェック
- **prettier** - コードフォーマット
- **husky** - Gitフック

### AI
- **Ollama** - ローカルLLM

## 前提条件

- Node.js v18以上
- npm
- Ollama インストール済み
- Laravel API（オプション、モックモードでも動作可能）

## セットアップ

### 1. リポジトリのクローン

```bash
git clone <repository-url>
cd blog-automate
```

### 2. 依存関係のインストール

```bash
npm install
```

### 3. 環境変数の設定

`.env.example`を`.env`にコピーして編集します。

```bash
cp .env.example .env
```

必須の環境変数:

```env
# Ollama設定
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL_NAME=kaigo-expert
OLLAMA_TIMEOUT=120000

# Laravel API設定
LARAVEL_API_AUTH_CHECK=http://localhost:8000/api/health-check
LARAVEL_API_STORE_ENDPOINT=http://localhost:8000/api/blog-store
LARAVEL_API_TOKEN=your-api-token-here
LARAVEL_MOCK_MODE=false

# スケジューラ設定
SCHEDULER_INTERVAL_HOURS=6

# データベース設定
DATABASE_PATH=./data/blog_automation.db

# ロギング設定
LOG_LEVEL=info
LOG_FILE_PATH=./logs/app.log
```

### 4. Ollamaモデルの作成

```bash
npm run ollama:create
```

### 5. CSVデータの準備

以下のCSVファイルを`src/data/`に配置します:

- `persona.csv` - ペルソナ情報
- `seo-keyword.csv` - SEOキーワード情報
- `article.csv` - 生成記事の保存先（空でOK）

## 使い方

### 記事の生成

ペルソナとSEOキーワードを組み合わせて記事を生成します。

```bash
npm run article:generate
```

生成された記事は`src/data/article.csv`に保存されます。

### 記事の投稿

生成済みの記事をLaravel APIに投稿します。

```bash
npm run article:publish
```

### その他のコマンド

| コマンド | 説明 |
|---------|------|
| `npm run ollama:create` | Ollamaカスタムモデルを作成 |
| `npm run api:auth:check` | Laravel API認証チェック |
| `npm test` | ユニットテスト実行 |
| `npm run test:ui` | テストUIを起動 |
| `npm run test:coverage` | カバレッジレポート生成 |
| `npm run lint` | ESLint実行 |
| `npm run lint:fix` | ESLint自動修正 |
| `npm run format` | Prettierでフォーマット |

## ディレクトリ構成

```
blog-automate/
├── src/
│   ├── config/              # 環境設定
│   ├── data/                # CSVデータファイル
│   │   ├── persona.csv
│   │   ├── seo-keyword.csv
│   │   ├── article.csv
│   │   └── ARTICLE_CATEGORIES.json
│   ├── scripts/             # メインスクリプト
│   │   ├── generateArticles.ts
│   │   ├── publishArticles.ts
│   │   └── createOllamaModel.ts
│   ├── services/            # ビジネスロジック
│   │   ├── article/         # 記事生成・最適化
│   │   ├── laravel/         # Laravel API連携
│   │   ├── ollama/          # Ollama API操作
│   │   └── api/             # 認証チェック
│   ├── util/                # ユーティリティ関数
│   ├── types/               # TypeScript型定義
│   └── tests/               # ユニットテスト
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

## カテゴリマッピング

ペルソナカテゴリは自動的に記事カテゴリIDにマッピングされます。

| ペルソナカテゴリ | 記事カテゴリ | カテゴリID |
|----------------|-------------|-----------|
| 現役施設介護士 | お仕事の相談 | 3 |
| 潜在有資格者 | 介護資格 | 2 |
| 収入・条件重視 | 訪問介護 | 1 |

マッピング設定は[src/data/ARTICLE_CATEGORIES.json](src/data/ARTICLE_CATEGORIES.json)で管理されています。

## 開発

### コード規約

- **ESLint** - コード品質チェック
- **Prettier** - コードフォーマット
- **Husky** - pre-commitフックでlintとformatを自動実行

### テスト実行

```bash
# 全テスト実行
npm run test

# ウォッチモード
npm run test:watch
```

### パスエイリアス

`@/`で`src/`ディレクトリを参照できます。

```typescript
import { getCategoryIdFromPersona } from '@/util/categoryMapper';
```

## トラブルシューティング

### Ollama接続エラー

```
Error: connect ECONNREFUSED 127.0.0.1:11434
```

**解決方法:**
1. Ollamaが起動しているか確認
2. `OLLAMA_BASE_URL`が正しいか確認
3. ファイアウォール設定を確認

### Laravel API認証エラー

```
Error: Request failed with status code 401
```

**解決方法:**
1. `LARAVEL_API_TOKEN`が正しいか確認
2. Laravel側のトークン設定を確認
3. モックモードで動作確認（`LARAVEL_MOCK_MODE=true`）

### CSV読み込みエラー

```
Error: ENOENT: no such file or directory
```

**解決方法:**
1. CSVファイルが`src/data/`に配置されているか確認
2. ファイル名が正しいか確認（`persona.csv`, `seo-keyword.csv`）
3. CSVファイルのエンコーディングを確認（UTF-8推奨）

## 参考ドキュメント

- [ARTICLE_GENERATION.md](ARTICLE_GENERATION.md) - 記事生成の詳細仕様

