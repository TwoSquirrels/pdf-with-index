# pdf-with-index

MD を索引付き PDF に変換する API サーバーと、traP CodiMD 用 UserScript

## ディレクトリ構成

```
pdf-with-index/
├── README.md           # このファイル
├── LICENSE             # MIT License
├── server/             # API サーバー (Python)
│   └── README.md       # サーバーの詳細
└── userscript/         # traP CodiMD 用 UserScript
    └── README.md       # UserScript の詳細
```

## コンポーネント

### [server/](./server/)

Markdown を索引付き PDF に変換する API サーバー

- Python で実装

### [userscript/](./userscript/)

traP CodiMD から API サーバーを利用して索引付き PDF をエクスポートするための UserScript

- JavaScript で実装
