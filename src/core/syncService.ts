/**
 * syncService.ts
 * `worklog sync git` および `worklog sync files` 用のサービス
 *
 * セキュリティ方針:
 *  - 外部コマンド実行は execFile() を使い、shell 経由の実行を禁止する
 *    理由: exec() や shell:true はシェルを介するため、パス・引数にシェル
 *         特殊文字が含まれるとコマンドインジェクションが成立する
 *  - ファイルシステムの走査は fs.readdir / glob を使用し exec() は使わない
 *  - validateFilePath() を必ず通してから外部コマンドに渡す
 */

import { execFile } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import { validateFilePath, sanitizeText } from '../lib/validation.js';
import { sanitizeForTerminal } from '../lib/sanitize.js';
import { GitCommit } from '../types/events.js';

const execFileAsync = promisify(execFile);

// ---------------------------------------------------------------------------
// 定数
// ---------------------------------------------------------------------------

/** git log の出力フォーマット区切り文字 (フィールド間) */
const GIT_LOG_FIELD_SEP = '\x1f'; // US (Unit Separator)
/** git log の出力フォーマット区切り文字 (レコード間) */
const GIT_LOG_RECORD_SEP = '\x1e'; // RS (Record Separator)

/**
 * git log の --format 文字列
 * フィールド: hash, short_hash, author_name, author_email, committer_date, subject
 * 制御文字をデリミタに使用することでコミットメッセージ内の改行・特殊文字と
 * 混同しないようにする
 */
const GIT_LOG_FORMAT = [
  '%H',   // full hash
  '%h',   // short hash
  '%an',  // author name
  '%ae',  // author email
  '%cI',  // committer date ISO 8601
  '%s',   // subject (one-line summary)
].join(GIT_LOG_FIELD_SEP);

// ---------------------------------------------------------------------------
// Git 同期
// ---------------------------------------------------------------------------

/**
 * 指定リポジトリから git コミット履歴を取得する
 *
 * セキュリティ上の注意:
 *  - execFile を使用: 第一引数はコマンドパス、第二引数は配列
 *    → シェル展開が行われないため、パスやオプションに特殊文字が含まれていても安全
 *  - shell: false (execFile のデフォルト) を明示的に維持する
 *  - since パラメータは git に渡す前に ISO 8601 形式チェックをする
 *
 * @param repoPath - Git リポジトリのパス
 * @param since    - この日時以降のコミットを取得 (ISO 8601 形式、省略可)
 * @param maxCount - 取得する最大コミット数 (デフォルト: 100)
 * @returns GitCommit の配列
 */
export async function getGitCommits(
  repoPath: string,
  since?: string,
  maxCount = 100
): Promise<GitCommit[]> {
  // パストラバーサル・null byte チェック
  const safePath = validateFilePath(repoPath);

  // since が指定された場合は ISO 8601 形式かチェックする
  // シェル特殊文字が混入していないことを保証するため厳格なパターンで検証する
  let safeSince: string | undefined;
  if (since !== undefined && since !== '') {
    if (!/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:[+-]\d{2}:\d{2}|Z)?)?$/.test(since)) {
      throw new Error(`since must be an ISO 8601 date string, got: ${since}`);
    }
    safeSince = since;
  }

  // maxCount は正の整数に制限する
  if (!Number.isInteger(maxCount) || maxCount <= 0 || maxCount > 10000) {
    throw new Error(`maxCount must be a positive integer up to 10000, got: ${maxCount}`);
  }

  // git コマンド引数を配列として組み立てる
  // IMPORTANT: 文字列結合・テンプレートリテラルでシェルに渡すのではなく、
  //            必ず配列で execFile の第二引数に渡すこと
  const args: string[] = [
    '-C', safePath,                              // 作業ディレクトリを指定
    'log',
    `--format=${GIT_LOG_FORMAT}${GIT_LOG_RECORD_SEP}`, // 構造化フォーマット
    `-n`, String(maxCount),
  ];

  if (safeSince) {
    args.push(`--since=${safeSince}`);
  }

  let stdout: string;
  try {
    // shell: false がデフォルト (execFile は常に shell を使わない)
    // タイムアウト: 30 秒
    const result = await execFileAsync('git', args, {
      maxBuffer: 10 * 1024 * 1024, // 10 MB
      timeout: 30_000,
      // cwd は '-C safePath' で指定するため ここでは不要だが念のため設定
      cwd: safePath,
    });
    stdout = result.stdout;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to run git log in ${safePath}: ${message}`);
  }

  return parseGitLog(stdout);
}

/**
 * git log の出力を GitCommit 配列にパースする
 * 内部関数: getGitCommits からのみ呼ばれる
 */
function parseGitLog(raw: string): GitCommit[] {
  const commits: GitCommit[] = [];
  const records = raw.split(GIT_LOG_RECORD_SEP);

  for (const record of records) {
    const trimmed = record.trim();
    if (!trimmed) continue;

    const fields = trimmed.split(GIT_LOG_FIELD_SEP);
    if (fields.length < 6) continue;

    const [hash, shortHash, author, authorEmail, timestamp, ...subjectParts] = fields;
    // subject に GIT_LOG_FIELD_SEP が含まれる場合を考慮して結合
    const subject = subjectParts.join(GIT_LOG_FIELD_SEP);

    // hash の形式チェック (不正なデータが混入した場合に備えて)
    if (!/^[a-fA-F0-9]{40}$/.test(hash)) continue;
    if (!/^[a-fA-F0-9]{7,}$/.test(shortHash)) continue;

    commits.push({
      hash: hash.trim(),
      short_hash: shortHash.trim(),
      // 著者名・メールはサニタイズして格納 (制御文字除去)
      author: sanitizeText(author.trim()),
      author_email: sanitizeText(authorEmail.trim()),
      timestamp: timestamp.trim(),
      // コミットメッセージは制御文字除去 (ANSI エスケープは表示時に除去)
      message: sanitizeText(subject.trim()),
    });
  }

  return commits;
}

// ---------------------------------------------------------------------------
// ファイル変更検知
// ---------------------------------------------------------------------------

/**
 * 指定ディレクトリ配下で変更されたファイルの一覧を取得する
 *
 * セキュリティ上の注意:
 *  - exec() / find コマンドは使用しない
 *  - fs.readdir() で再帰的に走査する
 *  - シンボリックリンクはスキップする (循環参照防止)
 *  - since が指定された場合は mtime で比較する
 *
 * @param dirPath   - 走査するディレクトリのパス
 * @param since     - この日時以降に変更されたファイルのみ取得 (ISO 8601、省略可)
 * @param maxFiles  - 取得する最大ファイル数 (デフォルト: 1000)
 * @returns 変更ファイルパスの配列 (絶対パス)
 */
export async function getModifiedFiles(
  dirPath: string,
  since?: string,
  maxFiles = 1000
): Promise<string[]> {
  // パストラバーサル・null byte チェック
  const safePath = validateFilePath(dirPath);

  let sinceDate: Date | undefined;
  if (since !== undefined && since !== '') {
    if (!/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:[+-]\d{2}:\d{2}|Z)?)?$/.test(since)) {
      throw new Error(`since must be an ISO 8601 date string, got: ${since}`);
    }
    sinceDate = new Date(since);
    if (isNaN(sinceDate.getTime())) {
      throw new Error(`since is not a valid date: ${since}`);
    }
  }

  if (!Number.isInteger(maxFiles) || maxFiles <= 0 || maxFiles > 100_000) {
    throw new Error(`maxFiles must be a positive integer up to 100000, got: ${maxFiles}`);
  }

  const results: string[] = [];
  await walkDirectory(safePath, sinceDate, results, maxFiles);
  return results;
}

/**
 * ディレクトリを再帰的に走査してファイルパスを収集する
 * シンボリックリンクはスキップする
 */
async function walkDirectory(
  dir: string,
  sinceDate: Date | undefined,
  results: string[],
  maxFiles: number,
  depth = 0
): Promise<void> {
  // 深さ制限: 無限再帰・深いシンボリックリンクツリーを防ぐ
  const MAX_DEPTH = 50;
  if (depth > MAX_DEPTH) {
    console.warn(`[SECURITY WARNING] Directory depth limit reached at: ${dir}`);
    return;
  }

  if (results.length >= maxFiles) return;

  let entries: fs.Dirent[];
  try {
    entries = await fs.promises.readdir(dir, { withFileTypes: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    // アクセス権限エラー等は警告を出してスキップ
    console.warn(`[WARNING] Cannot read directory ${dir}: ${message}`);
    return;
  }

  for (const entry of entries) {
    if (results.length >= maxFiles) break;

    // シンボリックリンクはスキップ (循環参照・パストラバーサル対策)
    if (entry.isSymbolicLink()) continue;

    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      // .git ディレクトリはスキップ (大量のオブジェクトファイルを除外)
      if (entry.name === '.git') continue;
      await walkDirectory(fullPath, sinceDate, results, maxFiles, depth + 1);
    } else if (entry.isFile()) {
      if (sinceDate !== undefined) {
        try {
          const stat = await fs.promises.stat(fullPath);
          if (stat.mtime < sinceDate) continue;
        } catch {
          // stat に失敗したファイルはスキップ
          continue;
        }
      }
      results.push(fullPath);
    }
  }
}

// ---------------------------------------------------------------------------
// ユーティリティ
// ---------------------------------------------------------------------------

/**
 * 指定パスが Git リポジトリかどうかを確認する
 * .git ディレクトリまたはファイル (worktree) の存在チェック
 *
 * @param dirPath - チェックするディレクトリ
 * @returns Git リポジトリの場合 true
 */
export async function isGitRepository(dirPath: string): Promise<boolean> {
  const safePath = validateFilePath(dirPath);
  const gitPath = path.join(safePath, '.git');
  try {
    await fs.promises.access(gitPath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Git リポジトリのルートディレクトリを取得する
 *
 * セキュリティ注意: execFile を使用し、shell=false を維持する
 *
 * @param repoPath - リポジトリ内の任意のパス
 * @returns リポジトリルートの絶対パス
 */
export async function getGitRoot(repoPath: string): Promise<string> {
  const safePath = validateFilePath(repoPath);

  let stdout: string;
  try {
    const result = await execFileAsync(
      'git',
      ['-C', safePath, 'rev-parse', '--show-toplevel'],
      { timeout: 10_000, cwd: safePath }
    );
    stdout = result.stdout;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Not a git repository or git not available: ${message}`);
  }

  const root = stdout.trim();
  // 取得したパスに制御文字が含まれていないことを確認
  if (root.includes('\0') || /[\x01-\x1f\x7f]/.test(root)) {
    throw new Error('git returned an unexpected path containing control characters');
  }
  return root;
}

/**
 * ターミナルに表示する前にコミット情報をサニタイズする
 * Git コミットメッセージには ANSI エスケープシーケンスが含まれる場合があるため
 * 表示前に必ずこの関数を通すこと
 */
export function sanitizeCommitForDisplay(commit: GitCommit): GitCommit {
  return {
    ...commit,
    author: sanitizeForTerminal(commit.author),
    author_email: commit.author_email ? sanitizeForTerminal(commit.author_email) : undefined,
    message: sanitizeForTerminal(commit.message),
    files_changed: commit.files_changed?.map(sanitizeForTerminal),
  };
}
