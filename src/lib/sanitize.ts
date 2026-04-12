/**
 * sanitize.ts
 * CLI 出力・ファイルパス処理用のサニタイズ関数群
 *
 * セキュリティ方針:
 *  - ユーザー入力やGit/GCalから取得したテキストをターミナルに出力する前に
 *    必ず sanitizeForTerminal() を通すこと
 *  - ファイルパスは normalizePath() で絶対パスに変換し、
 *    HOME ディレクトリ外へのアクセスは警告を出すこと
 */

import * as path from 'path';
import * as os from 'os';

// ---------------------------------------------------------------------------
// ターミナル出力サニタイズ
// ---------------------------------------------------------------------------

/**
 * ターミナル出力用: ANSI エスケープシーケンス インジェクション防止
 *
 * 攻撃例:
 *   git commit メッセージに "\x1b[2J" を埋め込むとターミナル画面が消去される
 *   "\x1b]0;TITLE\x07" でウィンドウタイトルを書き換えられる
 *   "\x1b[?1049h" で代替スクリーンバッファに切り替えられる
 *
 * 対象:
 *   - CSI シーケンス: ESC [ ... (m, G, K, H, F, A, B, C, D, J, s, u 等)
 *   - OSC シーケンス: ESC ] ... (BEL または ST で終端)
 *   - SS2/SS3:        ESC N / ESC O
 *   - DCS:            ESC P ... ST
 *   - その他の ESC シーケンス
 *
 * NOTE: カラー出力が必要な場合は chalk 等の信頼できるライブラリを使い、
 *       ユーザー入力から直接 ANSI コードを生成しないこと。
 */
export function sanitizeForTerminal(value: string): string {
  return (
    value
      // CSI シーケンス: ESC [ 数値・セミコロン列 + 終端文字
      .replace(/\x1b\[[0-9;]*[mGKHFABCDJsu]/g, '')
      // OSC シーケンス: ESC ] ... BEL または ESC \
      .replace(/\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)/g, '')
      // DCS シーケンス: ESC P ... ST
      .replace(/\x1b[P][^\x1b]*\x1b\\/g, '')
      // SS2 / SS3
      .replace(/\x1b[NO]/g, '')
      // その他の ESC + 1文字シーケンス (上記で捕捉できなかった残余)
      .replace(/\x1b./g, '')
      // 残存する孤立 ESC 文字 (念のため)
      .replace(/\x1b/g, '')
  );
}

/**
 * ターミナル出力用: 複数フィールドをまとめてサニタイズするユーティリティ
 * オブジェクトの文字列フィールドを再帰的にサニタイズする
 */
export function sanitizeObjectForTerminal<T extends Record<string, unknown>>(obj: T): T {
  const result = { ...obj } as Record<string, unknown>;
  for (const key of Object.keys(result)) {
    const val = result[key];
    if (typeof val === 'string') {
      result[key] = sanitizeForTerminal(val);
    } else if (val !== null && typeof val === 'object' && !Array.isArray(val)) {
      result[key] = sanitizeObjectForTerminal(val as Record<string, unknown>);
    } else if (Array.isArray(val)) {
      result[key] = val.map((item) =>
        typeof item === 'string' ? sanitizeForTerminal(item) : item
      );
    }
  }
  return result as T;
}

// ---------------------------------------------------------------------------
// ファイルパス処理
// ---------------------------------------------------------------------------

/**
 * ファイルパスの正規化
 *
 * - path.resolve() を使って絶対パスに変換する
 * - ホームディレクトリ外へのアクセスは console.warn で警告を出す
 *   (禁止はしない: ユーザーが意図的に別ドライブ等を指定する場合を考慮)
 * - シンボリックリンクは解決しない (fs.realpath は呼ばない)
 *   実際のアクセス前に呼び出し元で realpathSync を使うかどうか判断すること
 *
 * @param filePath - 正規化するファイルパス (相対・絶対どちらでも可)
 * @returns 絶対パス
 */
export function normalizePath(filePath: string): string {
  if (typeof filePath !== 'string' || filePath.trim().length === 0) {
    throw new Error('normalizePath: filePath must be a non-empty string');
  }

  // null byte チェック (validateFilePath と二重防衛)
  if (filePath.includes('\0')) {
    throw new Error('normalizePath: filePath contains null byte');
  }

  const resolved = path.resolve(filePath.trim());
  const homeDir = os.homedir();

  // HOME ディレクトリ外へのアクセスを警告
  // path.resolve の結果が homeDir で始まらない場合に発火
  if (!resolved.startsWith(homeDir + path.sep) && resolved !== homeDir) {
    console.warn(
      `[SECURITY WARNING] Accessing path outside home directory: ${resolved}`
    );
  }

  return resolved;
}

/**
 * 2 つのパスが同じディレクトリ階層下に属するか検証する
 *
 * ユースケース: DB ファイルや設定ファイルへのアクセスが
 * 想定ディレクトリ内に収まっているかをチェックする
 *
 * @param basePath   - 許可するベースディレクトリ (絶対パス)
 * @param targetPath - チェック対象のパス (絶対パス)
 * @returns basePath 以下に targetPath が含まれる場合 true
 */
export function isPathUnder(basePath: string, targetPath: string): boolean {
  const normalizedBase = path.resolve(basePath);
  const normalizedTarget = path.resolve(targetPath);
  // パス区切り文字を末尾に付けて前方一致チェックすることで
  // /home/user と /home/user2 が混同されるのを防ぐ
  const baseWithSep = normalizedBase.endsWith(path.sep)
    ? normalizedBase
    : normalizedBase + path.sep;
  return normalizedTarget.startsWith(baseWithSep) || normalizedTarget === normalizedBase;
}
