# ingest

人間と AI の協働を支える、外部記憶層としての作業ログ CLI ツールです。

---

## このツールの目的

AI（Claude など）はセッションをまたいだ記憶を持ちません。  
`ingest` はその制約を補うために設計された **外部記憶層** です。

- AI のメモリに依存せず、ローカルの SQLite DB に全イベントを記録します
- イベントソーシングの思想で「何が起きたか」を蓄積し、必要な時に再評価します
- Claude はあくまで「操作 UI および再評価主体」であり、このツールの定期実行主体ではありません

---

## 3 層設計

| 層 | テーブル | 役割 |
|---|---|---|
| 1. イベント層 | `events` | 作業の生の記録（note, decision, blocker, next, calendar, git-commit など） |
| 2. メトリクス層 | `metrics` | 集計・定量データ（ベロシティ、ブロッカー解消時間など） |
| 3. レビュー層 | `reviews` | 週次サマリー、異常候補、hot topics など |

イベント層がすべての情報源となり、メトリクスとレビューはそこから派生します。  
タスク間のタイトル揺れは完全一致ではなく `match suggest` / `match apply` コマンドで正規化します。

---

## インストール

```bash
npm install
npm run build
```

グローバルにリンクする場合:

```bash
npm link
```

初回はマイグレーションを実行してください:

```bash
npm run migrate
```

---

## 基本的な使い方の流れ

### 1. 新しい作業を開始する

```bash
ingest start "機能Aの設計"
```

### 2. 既存の作業を再開する

```bash
ingest resume
# または task ID を指定
ingest resume --task abc123
```

### 3. 作業中にメモ・決定・ブロッカーを記録する

```bash
ingest note "APIの仕様を確認した"
ingest decision "認証方式はJWTに統一する"
ingest blocker "外部APIのレートリミットが不明"
```

### 4. 次のアクションを登録する

```bash
ingest next "レートリミット仕様をベンダーに確認する"
```

### 5. 作業を終了する

```bash
ingest close
```

### 6. 週次レビューを実行する

```bash
ingest review weekly
```

---

## コマンド一覧

詳細は [commands.md](./commands.md) を参照してください。  
Claude Code との連携フローは [SKILL.md](./SKILL.md) を参照してください。  
実際のコマンド実行例は [examples.md](./examples.md) を参照してください。
