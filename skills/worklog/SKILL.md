---
name: ingest
description: "作業ログの記録・再開・週次レビューを `ingest` CLI で行う。セッション開始時は `ingest resume`、意思決定は `ingest decision`、詰まりは `ingest blocker`、次アクションは `ingest next`、終了時は `ingest close`。Google Calendar 取り込みや Git 同期も担当する。"
---

# ingest スキル運用ルール（Claude Code 参照用）

このドキュメントは Claude Code がセッション中に `ingest` CLI を利用する際の運用ルールを定義します。

---

## ツールの位置づけ

- `ingest` は **AI 依存のメモリではなく外部記憶層** です
- Claude はセッションをまたいだ記憶を持たないため、このツールが作業状態の唯一の信頼できる記録源となります
- Claude は **操作 UI および再評価主体** です。定期実行（cronジョブなど）の主体ではありません
- 外部スケジューラ（cron・launchd 等）が `sync git` / `sync files` などのサイドカー処理を担当します

---

## セッション開始時の手順

1. **まず `ingest resume` を実行する**  
   前回セッションの継続作業がある場合は `resume` を優先してください。
   ```bash
   ingest resume
   ```

2. 継続すべき作業が見つからない場合のみ `ingest start` で新規タスクを作成する
   ```bash
   ingest start "タスクのタイトル"
   ```

---

## 記録コマンドの使い分け

| コマンド | タイミング |
|---|---|
| `ingest decision "内容"` | 何かを決定したとき（方針・設計・採用技術など） |
| `ingest note "内容"` | 気づき・調査メモ・途中経過などの記録 |
| `ingest blocker "内容"` | 作業が止まる問題・未解決の課題 |
| `ingest next "内容"` | 次に実施すべきアクション（セッション終了前に必ず残す） |

### セッション終了時

```bash
ingest close
```

セッション終了前に必ず `ingest next` で次のアクションを記録してから `close` してください。

---

## 週次レビュー

```bash
ingest review weekly
```

- hot topics（活発に動いているタスク）と anomaly candidates（停滞・異常なタスク）を表示します
- レビュー結果をもとに `ingest decision` や `ingest next` で対処を記録してください

---

## Google Calendar 取り込みフロー

ユーザーから「カレンダーを取り込んで」と依頼されたら、以下の手順を実行する。

### ステップ 1: 利用可能な手段でイベント一覧を取得する

Google Calendar の情報は、利用可能な任意の手段（Google Calendar MCP、`gog` 等の Google CLI ツール、その他 API クライアント）で取得する。
取得結果が JSON の場合は以下のフィールドを参照する。

```bash
# 例: Google Calendar MCP を使う場合
# MCP ツールで今日の予定を取得する

# 例: gog CLI を使う場合
# gog calendar list --today --json
```

JSON のフィールド対応:

| JSON フィールド | 説明 | ingest への渡し方 |
|---|---|---|
| `summary` | 予定タイトル | `--title` |
| `start.dateTime` | 開始日時 (RFC3339) | calendar-start の `--at` |
| `end.dateTime` | 終了日時 (RFC3339) | calendar-end の `--at` |
| `id` | カレンダーイベントID | `--source-ref` |

### ステップ 2: 各イベントを ingest に渡す

取得した各イベントについて、開始・終了をそれぞれ記録する。

```bash
ingest ingest calendar-start \
  --title "<予定タイトル>" \
  --at "<開始日時 RFC3339>" \
  --source-ref "<event id>"

ingest ingest calendar-end \
  --title "<予定タイトル>" \
  --at "<終了日時 RFC3339>" \
  --source-ref "<event id>"
```

- `start.dateTime` / `end.dateTime` が存在しない終日イベントは取り込みをスキップしてよい
- 複数イベントがある場合は全件まとめて実行する
- 取り込んだイベント数をユーザーに報告する

---

## 仕事外のアイデア・気づきの記録

業務時間外の活動の中で仕事に関連する着想が生まれたときは `--personal` フラグをつけて記録する。

```bash
ingest note "〇〇の設計方針のヒントが浮かんだ" --personal --topic <topic-id>
ingest note "〇〇という概念が今の課題に使えるかも" --personal
```

- `--personal` をつけたメモは通常の作業ログとは分離され、`resume` や `review weekly` に **PERSONAL INSIGHTS** セクションとして別表示される
- `--topic` で仕事のトピックと紐づけると、そのタスクの `resume` 時に自動的に浮上する
- 活動の事実そのものは残さなくてよい。**着想が生まれたときだけ記録する**

### `--personal` を自動的につける判断基準

ユーザーが以下のような言い方をしたときは、明示的な指示がなくても `--personal` をつけて記録する。

- 業務時間外・オフラインの活動中に思いついたと分かる言い方
  （例: 「〜しながら思ったんだけど」「移動中に気づいた」「昨日の夜に〜」）
- 「ふと思ったんだけど〜」「仕事と関係ないかもだけど〜」
- 「〜というアイデアが浮かんだ」（業務中の文脈でない場合）

仕事中のセッション内で発生した気づきには `--personal` をつけない。あくまで**業務時間外・業務文脈外**での着想に限定する。

## Git / ファイル同期

これらのコマンドは **外部スケジューラ（cron・launchd 等）から定期実行** することを想定しています。  
Claude が自発的に実行する必要はありません。

```bash
# Gitコミットをイベントとして取り込む
ingest sync git

# ファイルシステムの変更を取り込む
ingest sync files
```

---

## タイトル揺れへの対処

タスクタイトルの表記揺れ（例: 「機能A設計」と「機能Aの設計」）は完全一致で判定しません。  
以下のコマンドで正規化してください。

```bash
# 揺れの候補を提示する
ingest match suggest

# 提示された正規化を適用する
ingest match apply
```

---

## 禁止事項・注意事項

- Claude はこのツールの定期実行主体にはなりません（外部スケジューラに委ねる）
- `ingest review weekly` の結果を勝手に削除・修正しません。記録として残し、判断を人間に委ねます
- タスク ID は自動生成される nanoid を使用します。手動での ID 指定は避けてください
