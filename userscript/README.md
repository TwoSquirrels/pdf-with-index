# UserScript

traP CodiMD 用 UserScript

## 概要

このディレクトリには、traP CodiMD (md.trap.jp) から API サーバーを利用して索引付き PDF をエクスポートするための Tampermonkey UserScript が含まれています。

## 技術スタック

- JavaScript (UserScript/Tampermonkey)

## ファイル構成

```
userscript/
├── README.md                   # このファイル
└── pdf-with-index.user.js      # UserScript 本体
```

## インストール方法

1. [Tampermonkey](https://www.tampermonkey.net/) をブラウザにインストール
2. `pdf-with-index.user.js` を開き、「RAW」ボタンをクリック
3. Tampermonkey のインストール確認で「インストール」をクリック

## 使い方

1. md.trap.jp でノートを開く
2. ツールバーに表示される「📄 索引付きPDF」ボタンをクリック
3. PDF が自動的にダウンロードされます

## 設定

⚙️ ボタンをクリックして API エンドポイント URL を変更できます。

デフォルト: `http://localhost:8000/generate-pdf`

## 機能

- CodeMirror エディタから Markdown コンテンツを取得
- ドキュメントタイトルの自動検出
- API サーバーへの非同期リクエスト
- PDF ファイルの自動ダウンロード
- 生成中のローディング表示
- エラー通知
