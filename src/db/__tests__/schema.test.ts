import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { initDb, closeDb, getDb } from '../client.js';

let tmpDir: string;
let dbPath: string;

beforeAll(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'worklog-test-'));
  dbPath = join(tmpDir, 'test.db');
  initDb(dbPath);
});

afterAll(() => {
  closeDb();
  rmSync(tmpDir, { recursive: true, force: true });
});

describe('schema migration', () => {
  it('creates all required tables', () => {
    const db = getDb();
    const tables = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
    ).all() as Array<{ name: string }>;

    const tableNames = tables.map(t => t.name);

    expect(tableNames).toContain('projects');
    expect(tableNames).toContain('tasks');
    expect(tableNames).toContain('topics');
    expect(tableNames).toContain('events');
    expect(tableNames).toContain('topic_metrics');
    expect(tableNames).toContain('task_metrics');
    expect(tableNames).toContain('reviews');
    expect(tableNames).toContain('review_topic_actions');
  });

  it('creates all required indexes', () => {
    const db = getDb();
    const indexes = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='index' ORDER BY name"
    ).all() as Array<{ name: string }>;

    const indexNames = indexes.map(i => i.name);

    expect(indexNames).toContain('idx_events_task_id');
    expect(indexNames).toContain('idx_events_topic_id');
    expect(indexNames).toContain('idx_events_event_type');
    expect(indexNames).toContain('idx_events_occurred_at');
    expect(indexNames).toContain('idx_topic_metrics_topic_id');
    expect(indexNames).toContain('idx_task_metrics_task_id');
    expect(indexNames).toContain('idx_tasks_status');
  });

  it('events table has correct columns', () => {
    const db = getDb();
    const cols = db.prepare(
      "PRAGMA table_info(events)"
    ).all() as Array<{ name: string; type: string; notnull: number }>;

    const colNames = cols.map(c => c.name);

    expect(colNames).toContain('id');
    expect(colNames).toContain('event_type');
    expect(colNames).toContain('project_id');
    expect(colNames).toContain('task_id');
    expect(colNames).toContain('topic_id');
    expect(colNames).toContain('actor');
    expect(colNames).toContain('origin');
    expect(colNames).toContain('summary');
    expect(colNames).toContain('details');
    expect(colNames).toContain('importance');
    expect(colNames).toContain('confidence');
    expect(colNames).toContain('scheduled');
    expect(colNames).toContain('source_type');
    expect(colNames).toContain('source_ref');
    expect(colNames).toContain('occurred_at');
    expect(colNames).toContain('created_at');
  });

  it('foreign keys are enabled', () => {
    const db = getDb();
    const fkStatus = db.pragma('foreign_keys') as Array<{ foreign_keys: number }>;
    expect(fkStatus[0].foreign_keys).toBe(1);
  });

  it('migration is idempotent (running twice does not fail)', () => {
    expect(() => initDb(dbPath)).not.toThrow();
  });
});
