# Server

MD を索引付き PDF に変換する API サーバー

## 概要

このディレクトリには、Markdown ファイルを索引付き PDF に変換する API サーバーのソースコードが含まれています。
MeCab による形態素解析で名詞を抽出し、Typst で索引を自動生成します。

## 技術スタック

- **Language**: Python 3.11+
- **Web Framework**: FastAPI, Uvicorn
- **NLP**:
  - MeCab (形態素解析エンジン)
  - mecab-ipadic-neologd (辞書)
  - panflute (Pandoc AST 操作)
- **Typesetting**:
  - Pandoc (Markdown → Typst 変換)
  - Typst (PDF 生成)
- **Fonts**: Noto Sans CJK JP

## ディレクトリ構成

```
server/
├── Dockerfile          # Docker 環境定義
├── README.md           # このファイル
├── requirements.txt    # Python 依存関係
├── main.py             # FastAPI エントリーポイント
├── filters/
│   └── auto_index.py   # Panflute フィルター (形態素解析 & 索引タグ注入)
├── templates/
│   └── main.typ        # Typst テンプレート (索引生成ロジック)
└── utils/
    └── typst_runner.py # Typst CLI 実行ラッパー
```

## API エンドポイント

### `POST /generate-pdf`

Markdown コンテンツから索引付き PDF を生成します。

#### リクエスト

```json
{
  "title": "ドキュメントタイトル",
  "content": "# Markdown 本文..."
}
```

#### レスポンス

- `application/pdf` (バイナリ)

## Docker での実行

```bash
# ビルド
docker build -t pdf-with-index .

# 実行
docker run -p 8000:8000 pdf-with-index
```

## ローカル開発

```bash
# 依存関係のインストール
pip install -r requirements.txt

# 開発サーバーの起動
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

**注意**: ローカル開発には MeCab, Pandoc, Typst のインストールが必要です。

