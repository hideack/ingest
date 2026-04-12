# ingest 実行例集

典型的なシナリオとコマンド実行例を示します。

---

## 1. 新しいタスクを開始する

新しい機能の実装を始めるケースです。

```bash
# 新しいタスクを作成
ingest start "ユーザー認証機能の実装"

# 調査中に気づいたことをメモ
ingest note "JWT ライブラリは jose を使う予定（Edge Runtime対応のため）"

# 設計の決定事項を記録
ingest decision "認証トークンの有効期限は 24 時間に統一する"

# ブロッカーを記録
ingest blocker "リフレッシュトークンの保存場所（Cookie vs localStorage）が未決定"

# 次のアクションを記録してセッションを終了
ingest next "セキュリティチームにトークン保存方針を確認する"
ingest close
```

出力例:
```
[ingest] タスク作成: ユーザー認証機能の実装 (id: xK9mP2)
[ingest] セッション終了。次のアクション 1 件を記録しました。
```

---

## 2. 既存タスクを再開する

前回のセッションの続きから作業を再開するケースです。

```bash
# セッション開始時は必ず resume から
ingest resume
```

出力例:
```
[ingest] 再開: ユーザー認証機能の実装 (id: xK9mP2)

--- 前回の next アクション ---
1. セキュリティチームにトークン保存方針を確認する (YYYY-MM-DD HH:MM)

--- 直近のイベント ---
- [decision] 認証トークンの有効期限は 24 時間に統一する
- [blocker]  リフレッシュトークンの保存場所（Cookie vs localStorage）が未決定
```

確認後、作業を継続します:

```bash
# ブロッカーが解消された場合はメモを残す
ingest note "ブロッカー解消: 保存方式を決定した"

# 決定事項として正式記録
ingest decision "トークン保存方式を〇〇に統一する"
```

---

## 3. 会議後に decision と next を残す

チームミーティングやレビュー後にすぐ記録するケースです。

```bash
# 会議中・直後に決定事項を次々と記録
ingest decision "API バージョニングは URL パス方式 (/v1/, /v2/) を採用する"
ingest decision "破壊的変更は最低 2 週間前にアナウンスする"
ingest decision "非推奨エンドポイントは 3 ヶ月後に廃止する"

# 会議で出た次のアクション
ingest next "APIバージョニングガイドラインをドキュメント化する（担当: 自分）"
ingest next "既存クライアントへの移行ガイドを作成する（担当: チームA）"

# 未解決の課題
ingest blocker "v1 と v2 の並行運用期間中のログ集計方法が未定"
```

---

## 4. 週次レビューで hot topics / anomaly candidates を確認する

毎週月曜朝などに実施する週次振り返りのケースです。

```bash
ingest review weekly
```

出力例:
```
[ingest] 週次レビュー (YYYY-MM-DD 〜 YYYY-MM-DD)

=== Hot Topics (活発なタスク) ===
1. ユーザー認証機能の実装 (xK9mP2)
   - イベント数: 12件 / この週
   - 直近: [decision] トークン保存方式を〇〇に統一する

2. API バージョニング設計 (mR4tL8)
   - イベント数: 8件 / この週
   - 直近: [next] APIバージョニングガイドラインをドキュメント化する

=== Anomaly Candidates (要確認) ===
1. レガシーシステムの移行 (aB2nQ5)
   - 最終更新: 23 日前
   - 未解消ブロッカー: 1件「外部コンプライアンス要件の確認が保留」

=== 今週のサマリー ===
- 記録されたイベント総数: 34件
- 決定事項: 7件
- 解消されたブロッカー: 2件
- 未解消ブロッカー: 3件
```

anomaly を受けて対処を記録:

```bash
# 停滞しているタスクを再確認してアクションを設定
ingest resume --task aB2nQ5
ingest next "外部コンプライアンス要件の確認を担当チームにエスカレーション"
```

---

## 5. Claude がカレンダーを取得して ingest するフロー

Claude Code セッション中にカレンダー情報を取得し、作業コンテキストに組み込む例です。
カレンダー情報の取得手段は問いません（Google Calendar MCP、各種 Google CLI ツール等）。

### Claude による対話フロー

**ユーザー**: 今日の会議を ingest に取り込んでください。

**Claude の操作**:

```
# Step 1: 利用可能な手段で今日のカレンダーイベントを取得する

取得結果（例）:
YYYY-MM-DD 10:00-11:00  定例ミーティング
YYYY-MM-DD 14:00-15:30  設計レビュー
YYYY-MM-DD 16:00-16:30  週次報告
```

```bash
# Step 2: 各イベントの開始・終了を ingest
ingest ingest calendar-start --title "定例ミーティング"   --at "YYYY-MM-DDTHH:MM:SS"
ingest ingest calendar-end   --title "定例ミーティング"   --at "YYYY-MM-DDTHH:MM:SS"

ingest ingest calendar-start --title "設計レビュー" --at "YYYY-MM-DDTHH:MM:SS"
ingest ingest calendar-end   --title "設計レビュー" --at "YYYY-MM-DDTHH:MM:SS"
```

出力例:
```
[ingest] ingest: calendar-start "定例ミーティング" at YYYY-MM-DDTHH:MM:SS
[ingest] ingest: calendar-end   "定例ミーティング" at YYYY-MM-DDTHH:MM:SS
[ingest] ingest: calendar-start "設計レビュー" at YYYY-MM-DDTHH:MM:SS
...
[ingest] 2件のカレンダーイベントを記録しました
```

```bash
# Step 3: 会議後にメモや決定事項を紐付けて記録
ingest note "定例ミーティング: 〇〇の方針を確認"
ingest decision "〇〇については今週中に方針を決定する"
```

---

## 6. タイトル揺れを正規化する

複数セッションにわたって類似タスクが別々に作られてしまった場合のケースです。

```bash
# 揺れの候補を確認
ingest match suggest
```

出力例:
```
[ingest] タイトル揺れ候補

グループ 1:
  - "認証機能の実装" (id: xK9mP2, 作成: YYYY-MM-DD)
  - "ユーザー認証機能の実装" (id: pL3wN7, 作成: YYYY-MM-DD)
  - "auth 実装" (id: qT8vM1, 作成: YYYY-MM-DD)
  → 統合候補タイトル: "ユーザー認証機能の実装"

グループ 2:
  - "API バージョン設計" (id: mR4tL8, 作成: YYYY-MM-DD)
  - "APIバージョニング設計" (id: hJ6cK4, 作成: YYYY-MM-DD)
  → 統合候補タイトル: "APIバージョニング設計"
```

```bash
# 候補を確認しながら正規化を適用
ingest match apply
```

正規化後はすべてのイベントが統合されたタスクに紐付きます。
