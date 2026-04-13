import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { initDb, closeDb } from '../../db/client.js';
import {
  findOrCreateTask,
  getTask,
  findTaskByTitle,
  updateTask,
  updateTaskStatus,
  getActiveTasks,
} from '../taskService.js';

let tmpDir: string;
let dbPath: string;

beforeAll(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'worklog-test-task-'));
  dbPath = join(tmpDir, 'test.db');
  process.env.WORKLOG_DB_PATH = dbPath;
  initDb(dbPath);
});

afterAll(() => {
  closeDb();
  delete process.env.WORKLOG_DB_PATH;
  rmSync(tmpDir, { recursive: true, force: true });
});

describe('findOrCreateTask', () => {
  it('creates a new task with default values', () => {
    const task = findOrCreateTask('新しいタスク');
    expect(task.title).toBe('新しいタスク');
    expect(task.status).toBe('active');
    expect(task.importance).toBe(5.0);
    expect(task.project_id).toBeNull();
    expect(task.id).toBeTruthy();
    expect(task.created_at).toBeTruthy();
    expect(task.updated_at).toBeTruthy();
  });

  it('returns existing task when title matches', () => {
    const first = findOrCreateTask('重複タスク');
    const second = findOrCreateTask('重複タスク');
    expect(second.id).toBe(first.id);
  });
});

describe('getTask', () => {
  it('returns task by ID', () => {
    const created = findOrCreateTask('IDで取得するタスク');
    const found = getTask(created.id);
    expect(found).not.toBeNull();
    expect(found!.id).toBe(created.id);
    expect(found!.title).toBe('IDで取得するタスク');
  });

  it('returns null for unknown ID', () => {
    expect(getTask('nonexistent-id')).toBeNull();
  });
});

describe('findTaskByTitle', () => {
  it('returns task by title', () => {
    findOrCreateTask('タイトル検索タスク');
    const found = findTaskByTitle('タイトル検索タスク');
    expect(found).not.toBeNull();
    expect(found!.title).toBe('タイトル検索タスク');
  });

  it('returns null for unknown title', () => {
    expect(findTaskByTitle('存在しないタイトル')).toBeNull();
  });
});

describe('updateTaskStatus', () => {
  it('updates task status to closed', () => {
    const task = findOrCreateTask('ステータス変更タスク');
    updateTaskStatus(task.id, 'closed');
    const updated = getTask(task.id)!;
    expect(updated.status).toBe('closed');
  });

  it('updates task status to paused', () => {
    const task = findOrCreateTask('一時停止タスク');
    updateTaskStatus(task.id, 'paused');
    const updated = getTask(task.id)!;
    expect(updated.status).toBe('paused');
  });

  it('updates updated_at timestamp', () => {
    const task = findOrCreateTask('タイムスタンプ確認タスク');
    const before = task.updated_at;
    updateTaskStatus(task.id, 'blocked');
    const updated = getTask(task.id)!;
    expect(updated.updated_at >= before).toBe(true);
  });
});

describe('updateTask', () => {
  it('updates title', () => {
    const task = findOrCreateTask('変更前タイトル');
    updateTask(task.id, { title: '変更後タイトル' });
    const updated = getTask(task.id)!;
    expect(updated.title).toBe('変更後タイトル');
  });

  it('updates importance', () => {
    const task = findOrCreateTask('重要度変更タスク');
    expect(task.importance).toBe(5.0);
    updateTask(task.id, { importance: 9.0 });
    const updated = getTask(task.id)!;
    expect(updated.importance).toBe(9.0);
  });

  it('updates status', () => {
    const task = findOrCreateTask('ステータス一括変更タスク');
    updateTask(task.id, { status: 'paused' });
    const updated = getTask(task.id)!;
    expect(updated.status).toBe('paused');
  });

  it('updates multiple fields at once', () => {
    const task = findOrCreateTask('複数フィールド変更タスク');
    updateTask(task.id, { title: '変更済みタスク', importance: 7.5, status: 'blocked' });
    const updated = getTask(task.id)!;
    expect(updated.title).toBe('変更済みタスク');
    expect(updated.importance).toBe(7.5);
    expect(updated.status).toBe('blocked');
  });

  it('updates updated_at timestamp', () => {
    const task = findOrCreateTask('updated_at確認タスク');
    const before = task.updated_at;
    updateTask(task.id, { importance: 3.0 });
    const updated = getTask(task.id)!;
    expect(updated.updated_at >= before).toBe(true);
  });

  it('does nothing when no fields provided', () => {
    const task = findOrCreateTask('変更なしタスク');
    const before = task.updated_at;
    updateTask(task.id, {});
    const after = getTask(task.id)!;
    expect(after.title).toBe(task.title);
    expect(after.importance).toBe(task.importance);
    expect(after.updated_at).toBe(before);
  });
});

describe('getActiveTasks', () => {
  it('returns only active tasks', () => {
    const active = findOrCreateTask('アクティブタスク確認');
    const tasks = getActiveTasks();
    const ids = tasks.map(t => t.id);
    expect(ids).toContain(active.id);
    expect(tasks.every(t => t.status === 'active')).toBe(true);
  });
});
