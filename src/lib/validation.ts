/**
 * validation.ts
 * 入力値のバリデーション関数群
 *
 * セキュリティ方針:
 *  - 外部から受け取る全ての値はここで型チェック・範囲チェックを行う
 *  - 失敗時は例外を投げ、呼び出し元でハンドリングする
 *  - SQL パラメータに渡す前に必ずこの関数群を通すこと
 */

import { Actor, Origin, EventType } from '../types/events.js';

// ---------------------------------------------------------------------------
// Enum バリデーション
// ---------------------------------------------------------------------------

/**
 * Actor の型チェック
 * CLI 引数・DB からの読み込み時に使用する
 */
export function isValidActor(value: unknown): value is Actor {
  return typeof value === 'string' && ['human', 'ai', 'system'].includes(value);
}

/**
 * Origin の型チェック
 * CLI 引数・DB からの読み込み時に使用する
 */
export function isValidOrigin(value: unknown): value is Origin {
  return typeof value === 'string' && ['manual', 'gcal', 'git', 'watcher', 'personal'].includes(value);
}

/**
 * EventType の型チェック
 * CLI 引数・DB からの読み込み時に使用する
 */
export function isValidEventType(value: unknown): value is EventType {
  const validTypes: EventType[] = [
    'task_started',
    'task_resumed',
    'decision_made',
    'note_added',
    'blocker_found',
    'next_action_defined',
    'task_closed',
    'calendar_event_started',
    'calendar_event_ended',
    'artifact_updated',
    'git_commit',
    'session_summary_generated',
    'importance_reassessed',
    'topic_linked',
  ];
  return typeof value === 'string' && validTypes.includes(value as EventType);
}

// ---------------------------------------------------------------------------
// フィールドバリデーション
// ---------------------------------------------------------------------------

/**
 * importance (重要度) のバリデーション
 * - undefined / null は許容 → null を返す
 * - 0〜100 の整数のみ有効
 * - 小数・範囲外・非数値は例外
 */
export function validateImportance(value: unknown): number | null {
  if (value === undefined || value === null) return null;

  const num = Number(value);
  if (Number.isNaN(num)) {
    throw new Error(`importance must be an integer between 0 and 100, got: ${value}`);
  }
  if (!Number.isInteger(num) || num < 0 || num > 100) {
    throw new Error(`importance must be an integer between 0 and 100, got: ${value}`);
  }
  return num;
}

/**
 * summary (概要) のバリデーション
 * - 空文字列・空白のみは不可
 * - 最大 1000 文字
 * - 前後の空白はトリムして返す
 */
export function validateSummary(value: unknown): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error('summary is required and must be a non-empty string');
  }
  if (value.length > 1000) {
    throw new Error('summary must be at most 1000 characters');
  }
  return value.trim();
}

/**
 * ファイルパスのバリデーション (パストラバーサル・null byte インジェクション防止)
 * - null byte (\0) が含まれるパスは拒否する (OS レベルのパス切り捨て悪用対策)
 * - 空文字列は不可
 * - .. 自体は許容するが、呼び出し元で path.resolve() を使って絶対パスに変換すること
 *
 * NOTE: Windows の : や | など OS 依存の危険文字は現状チェックしていない。
 *       macOS/Linux 専用ツールのため今後必要であれば追加する。
 */
export function validateFilePath(value: unknown): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error('file path must be a non-empty string');
  }
  // null byte インジェクション防止
  // 例: "safe/path\0/etc/passwd" → open() は \0 以降を無視する OS がある
  if (value.includes('\0')) {
    throw new Error('file path contains invalid characters');
  }
  return value.trim();
}

/**
 * source_ref (git hash 等) のバリデーション
 * - undefined / null / 空文字は許容 → null を返す
 * - git の short hash (7文字) 〜 full hash (40文字) の 16 進数のみ有効
 * - それ以外の文字列は例外 (コマンドインジェクション・SQLインジェクション防止)
 */
export function validateSourceRef(value: unknown): string | null {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string') {
    throw new Error('source_ref must be a string');
  }
  // git hash: 7〜40 文字の 16 進数のみ許可
  // それ以外の文字列 (シェル特殊文字、SQL 特殊文字等) は全て拒否
  if (!/^[a-fA-F0-9]{7,40}$/.test(value)) {
    throw new Error(`source_ref appears to be an invalid git hash: ${value}`);
  }
  return value;
}

/**
 * ISO 8601 形式のタイムスタンプのバリデーション
 * DB への INSERT 前に必ず通すこと
 */
export function validateTimestamp(value: unknown): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error('timestamp must be a non-empty string');
  }
  const date = new Date(value);
  if (isNaN(date.getTime())) {
    throw new Error(`timestamp is not a valid ISO 8601 date: ${value}`);
  }
  return value.trim();
}

/**
 * tags 配列のバリデーション
 * - undefined は許容 → 空配列を返す
 * - 各タグは空文字列不可・最大 100 文字
 * - タグ数は最大 50 件
 */
export function validateTags(value: unknown): string[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) {
    throw new Error('tags must be an array of strings');
  }
  if (value.length > 50) {
    throw new Error('tags must have at most 50 items');
  }
  return value.map((tag, i) => {
    if (typeof tag !== 'string' || tag.trim().length === 0) {
      throw new Error(`tags[${i}] must be a non-empty string`);
    }
    if (tag.length > 100) {
      throw new Error(`tags[${i}] must be at most 100 characters`);
    }
    return tag.trim();
  });
}

// ---------------------------------------------------------------------------
// テキストサニタイズ
// ---------------------------------------------------------------------------

/**
 * テキストフィールドのサニタイズ (制御文字除去)
 * - null byte (\0) を除去
 * - タブ (\t, 0x09) と改行 (\n, 0x0a, \r, 0x0d) は保持
 * - その他の制御文字 (0x01-0x08, 0x0b, 0x0c, 0x0e-0x1f, 0x7f) を除去
 *
 * DB 格納前・ターミナル出力前に呼ぶこと。
 * ANSI エスケープシーケンス除去は sanitize.ts の sanitizeForTerminal() を使うこと。
 */
export function sanitizeText(value: string): string {
  return value
    // null byte 除去
    .replace(/\0/g, '')
    // タブ・改行以外の制御文字を除去
    .replace(/[\x01-\x08\x0b\x0c\x0e-\x1f\x7f]/g, '');
}
