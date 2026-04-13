import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { initDb, closeDb } from '../../db/client.js';
import {
  findOrCreateTopic,
  getTopic,
  findTopicByName,
  updateTopic,
} from '../topicService.js';

let tmpDir: string;
let dbPath: string;

beforeAll(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'worklog-test-topic-'));
  dbPath = join(tmpDir, 'test.db');
  process.env.WORKLOG_DB_PATH = dbPath;
  initDb(dbPath);
});

afterAll(() => {
  closeDb();
  delete process.env.WORKLOG_DB_PATH;
  rmSync(tmpDir, { recursive: true, force: true });
});

describe('findOrCreateTopic', () => {
  it('creates a new topic with default values', () => {
    const topic = findOrCreateTopic('新しいトピック');
    expect(topic.name).toBe('新しいトピック');
    expect(topic.base_importance).toBe(5.0);
    expect(topic.project_id).toBeNull();
    expect(topic.id).toBeTruthy();
    expect(topic.created_at).toBeTruthy();
    expect(topic.updated_at).toBeTruthy();
  });

  it('returns existing topic when name matches', () => {
    const first = findOrCreateTopic('重複トピック');
    const second = findOrCreateTopic('重複トピック');
    expect(second.id).toBe(first.id);
  });
});

describe('getTopic', () => {
  it('returns topic by ID', () => {
    const created = findOrCreateTopic('IDで取得するトピック');
    const found = getTopic(created.id);
    expect(found).not.toBeNull();
    expect(found!.id).toBe(created.id);
    expect(found!.name).toBe('IDで取得するトピック');
  });

  it('returns null for unknown ID', () => {
    expect(getTopic('nonexistent-id')).toBeNull();
  });
});

describe('findTopicByName', () => {
  it('returns topic by name', () => {
    findOrCreateTopic('名前検索トピック');
    const found = findTopicByName('名前検索トピック');
    expect(found).not.toBeNull();
    expect(found!.name).toBe('名前検索トピック');
  });

  it('returns null for unknown name', () => {
    expect(findTopicByName('存在しない名前')).toBeNull();
  });
});

describe('updateTopic', () => {
  it('updates name', () => {
    const topic = findOrCreateTopic('変更前トピック名');
    updateTopic(topic.id, { name: '変更後トピック名' });
    const updated = getTopic(topic.id)!;
    expect(updated.name).toBe('変更後トピック名');
  });

  it('updates base_importance', () => {
    const topic = findOrCreateTopic('重要度変更トピック');
    expect(topic.base_importance).toBe(5.0);
    updateTopic(topic.id, { base_importance: 8.0 });
    const updated = getTopic(topic.id)!;
    expect(updated.base_importance).toBe(8.0);
  });

  it('updates both name and base_importance at once', () => {
    const topic = findOrCreateTopic('複数フィールド変更トピック');
    updateTopic(topic.id, { name: '変更済みトピック', base_importance: 3.5 });
    const updated = getTopic(topic.id)!;
    expect(updated.name).toBe('変更済みトピック');
    expect(updated.base_importance).toBe(3.5);
  });

  it('updates updated_at timestamp', () => {
    const topic = findOrCreateTopic('updated_at確認トピック');
    const before = topic.updated_at;
    updateTopic(topic.id, { base_importance: 7.0 });
    const updated = getTopic(topic.id)!;
    expect(updated.updated_at >= before).toBe(true);
  });

  it('does nothing when no fields provided', () => {
    const topic = findOrCreateTopic('変更なしトピック');
    const before = topic.updated_at;
    updateTopic(topic.id, {});
    const after = getTopic(topic.id)!;
    expect(after.name).toBe(topic.name);
    expect(after.base_importance).toBe(topic.base_importance);
    expect(after.updated_at).toBe(before);
  });
});
