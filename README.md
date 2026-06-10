# 2026 FIFA WORLD CUP 予想メーカー

スマホ専用を前提にした、2026年ワールドカップ予想アプリです。

## 機能

- グループリーグ順位予想
- 丸型国旗表示
- ドラッグ操作と上下ボタンによる順位変更
- 決勝トーナメント自動生成
- 3位通過チーム選択
- 3位チームの重複選択防止
- 勝敗予想と次ラウンド自動反映
- 優勝予想表示
- MVP予想、得点王予想
- ローカルストレージ保存、読込、リセット
- PNG画像出力
- URL共有
- PWA対応
- ダークモード対応

## ローカル起動

```bash
npm install
npm run dev
```

## ビルド

```bash
npm run build
```

静的ファイルは `out/` に出力されます。

## Cloudflare Pages

Cloudflare Pages では以下の設定でデプロイできます。

- Framework preset: `Next.js`
- Build command: `npm run build`
- Build output directory: `out`
- Node.js version: `20`
