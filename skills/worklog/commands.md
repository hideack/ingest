# ingest コマンドリファレンス

各コマンドの意味と使い分けを解説します。

---

## 作業管理コマンド

### `ingest start <title>`

新しいタスクを開始します。

```bash
ingest start "認証機能の実装"
```

- 新しいタスクレコードを作成し、アクティブ状態にします
- 同時にアクティブなタスクは 1 つだけ推奨です（複数可だが混乱を避けるため）
- タイトルはのちに `match suggest` / `match apply` で正規化できます

---

### `ingest resume [--task <id>]`

前回のタスクを再開します。

```bash
# 直近のアクティブタスクを再開
ingest resume

# タスクID指定で再開
ingest resume --task abc123
```

- セッション開始時に最初に実行すべきコマンドです
- 前回の `next`（次アクション）も合わせて表示します

---

### `ingest decision <content>`

決定事項を記録します。

```bash
ingest decision "認証方式はJWTに統一する"
ingest decision "DBはSQLiteのみでよい（スケールアウト不要）"
```

- 方針・設計選択・採用技術など「決めたこと」を記録します
- 後から「なぜこうなったか」を参照するための重要な記録です

---

### `ingest note <content>`

メモ・気づきを記録します。

```bash
ingest note "better-sqlite3 は同期APIなので非同期ラッパー不要"
ingest note "外部APIのドキュメントはここ: https://example.com/docs"
```

- 調査結果・参考リンク・途中経過など、自由形式のメモです
- `decision` ほど強い意味は持ちませんが、後から文脈を補完するのに役立ちます

---

### `ingest blocker <content>`

ブロッカー（未解決の障害）を記録します。

```bash
ingest blocker "外部APIのレートリミット仕様が不明"
ingest blocker "デプロイ環境のNode.jsバージョンが古い"
```

- 作業を止めている問題や、確認が必要な課題を記録します
- `review weekly` の anomaly candidates として検出されます
- 解消したら `ingest note "ブロッカー解消: ..."` などで追記してください

---

### `ingest next <content>`

次のアクションを記録します。

```bash
ingest next "レートリミット仕様をベンダーに確認する"
ingest next "PR を作成してレビュー依頼を出す"
```

- セッション終了前に必ず記録してください
- 次回セッションの `resume` 時に表示されます
- 複数登録できます（優先度が高いものから登録推奨）

---

### `ingest close`

作業セッションを終了します。

```bash
ingest close
```

- 現在のアクティブタスクのセッションを閉じます
- 終了前に `ingest next` でアクションを残しておくことを強く推奨します
- タスク自体の完了ではなく、セッションの終了です（タスクは次回 `resume` で再開できます）

---

## 編集コマンド

### `ingest edit task <id|タイトル>`

登録済みタスクの情報を変更します。

```bash
# タイトルを変更
ingest edit task "旧タイトル" --title "新タイトル"

# 重要度を変更（0〜10）
ingest edit task <task-id> --importance 8.5

# ステータスを変更
ingest edit task <task-id> --status paused

# 複数フィールドを一度に変更
ingest edit task "タスク名" --title "新タイトル" --importance 7.0 --status active
```

**オプション**

| オプション | 説明 |
|---|---|
| `--title <text>` | タスクのタイトルを変更 |
| `--importance <0-10>` | 重要度スコアを変更（変更は `importance_reassessed` イベントとして記録） |
| `--status <status>` | ステータスを変更（`active` / `paused` / `blocked` / `closed`） |

- タスクは ID またはタイトルのどちらで指定しても検索されます
- 引数を何も指定しないとエラーになります

---

### `ingest edit topic <id|名前>`

登録済みトピックの情報を変更します。

```bash
# 名前を変更
ingest edit topic "旧名前" --name "新名前"

# 基本重要度を変更（0〜10）
ingest edit topic "トピック名" --importance 6.0

# 両方を一度に変更
ingest edit topic <topic-id> --name "新名前" --importance 6.0
```

**オプション**

| オプション | 説明 |
|---|---|
| `--name <text>` | トピック名を変更 |
| `--importance <0-10>` | 基本重要度スコアを変更 |

---

## ingest コマンド（外部イベントの取り込み）

### `ingest ingest calendar-start --title <title> --at <datetime>`

カレンダーイベントの開始を記録します。

```bash
ingest ingest calendar-start --title "定例ミーティング" --at "YYYY-MM-DDTHH:MM:SS"
```

- 会議・イベントの開始時刻をイベント層に記録します
- `calendar-end` と組み合わせることで時間帯コンテキストを保持します

---

### `ingest ingest calendar-end --title <title> --at <datetime>`

カレンダーイベントの終了を記録します。

```bash
ingest ingest calendar-end --title "定例ミーティング" --at "YYYY-MM-DDTHH:MM:SS"
```

---

### `ingest ingest git-commit --hash <hash> [--message <msg>]`

Git コミットをイベントとして取り込みます。

```bash
ingest ingest git-commit --hash "abc1234" --message "feat: add authentication"
```

- `sync git` コマンドの内部処理でも使用されます
- 手動でコミットを紐付けたい場合に利用します

---

### `ingest ingest artifact-updated --name <name> --path <path>`

成果物（ファイル・ドキュメント等）の更新を記録します。

```bash
ingest ingest artifact-updated --name "設計書" --path "docs/design.md"
```

- 重要なファイルの更新をイベントとして残したい場合に利用します

---

## レビューコマンド

### `ingest review weekly`

週次レビューを実行します。

```bash
ingest review weekly
```

- 過去1週間のイベントを集計し、以下を表示します
  - **hot topics**: 活発に活動しているタスク
  - **anomaly candidates**: 停滞・長期未更新のタスク、未解消ブロッカー
- レビュー結果は `reviews` テーブルに保存されます
- 結果をもとに `decision` や `next` で対処を記録してください

---

## 同期コマンド（外部スケジューラから実行）

### `ingest sync git`

Git リポジトリの差分を取り込みます。

```bash
ingest sync git
```

- 新しいコミットを自動的に `ingest git-commit` します
- **外部スケジューラ（cron・launchd 等）から定期実行** することを想定しています
- Claude が自発的に実行する必要はありません

---

### `ingest sync files`

ファイルシステムの変更を取り込みます。

```bash
ingest sync files
```

- 監視対象のファイル更新を `ingest artifact-updated` します
- **外部スケジューラから定期実行** することを想定しています

---

## マッチングコマンド（タイトル揺れの正規化）

### `ingest match suggest`

タイトル揺れの候補を提示します。

```bash
ingest match suggest
```

- 類似タイトルを持つタスクのグループを一覧表示します
- 完全一致ではなく、編集距離や形態素解析によって類似を判定します

---

### `ingest match apply`

提示されたタイトル揺れの正規化を適用します。

```bash
ingest match apply
```

- `match suggest` で提示された候補を確認しながら統合します
- 元のタスク ID は保持され、タイトルのみが正規化されます
