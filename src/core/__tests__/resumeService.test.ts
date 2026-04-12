import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { initDb, closeDb, getDb } from '../../db/client.js';
import { createEvent } from '../eventService.js';
import { findOrCreateTask } from '../taskService.js';
import { buildResumeContext } from '../resumeService.js';

let tmpDir: string;
let dbPath: string;
let taskId: string;

beforeAll(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'worklog-resume-test-'));
  dbPath = join(tmpDir, 'test.db');
  process.env.WORKLOG_DB_PATH = dbPath;
  initDb(dbPath);

  // Create a task and some events
  const task = findOrCreateTask('Resume Test Task');
  taskId = task.id;

  // Create various events
  createEvent({
    event_type: 'task_started',
    task_id: taskId,
    actor: 'human',
    origin: 'manual',
    summary: 'Started the resume test task',
  });

  createEvent({
    event_type: 'decision_made',
    task_id: taskId,
    actor: 'human',
    origin: 'manual',
    summary: 'Decided to use vitest for testing',
  });

  createEvent({
    event_type: 'decision_made',
    task_id: taskId,
    actor: 'human',
    origin: 'manual',
    summary: 'Chose SQLite for storage',
  });

  createEvent({
    event_type: 'blocker_found',
    task_id: taskId,
    actor: 'human',
    origin: 'manual',
    summary: 'Cannot install dependencies without network',
  });

  createEvent({
    event_type: 'next_action_defined',
    task_id: taskId,
    actor: 'human',
    origin: 'manual',
    summary: 'Write unit tests for scoring functions',
  });

  createEvent({
    event_type: 'next_action_defined',
    task_id: taskId,
    actor: 'human',
    origin: 'manual',
    summary: 'Run integration tests',
  });
});

afterAll(() => {
  closeDb();
  delete process.env.WORKLOG_DB_PATH;
  rmSync(tmpDir, { recursive: true, force: true });
});

describe('buildResumeContext', () => {
  it('returns context for the specified task', () => {
    const context = buildResumeContext(taskId);
    expect(context.task.id).toBe(taskId);
    expect(context.task.title).toBe('Resume Test Task');
  });

  it('returns recent decisions for the task', () => {
    const context = buildResumeContext(taskId);
    expect(context.recentDecisions.length).toBeGreaterThanOrEqual(2);
    expect(context.recentDecisions.every(d => d.event_type === 'decision_made')).toBe(true);
    expect(context.recentDecisions.every(d => d.task_id === taskId)).toBe(true);
  });

  it('returns open blockers for the task', () => {
    const context = buildResumeContext(taskId);
    expect(context.openBlockers.length).toBeGreaterThanOrEqual(1);
    expect(context.openBlockers.every(b => b.event_type === 'blocker_found')).toBe(true);
    expect(context.openBlockers.every(b => b.task_id === taskId)).toBe(true);
  });

  it('returns next actions for the task', () => {
    const context = buildResumeContext(taskId);
    expect(context.nextActions.length).toBeGreaterThanOrEqual(2);
    expect(context.nextActions.every(a => a.event_type === 'next_action_defined')).toBe(true);
    expect(context.nextActions.every(a => a.task_id === taskId)).toBe(true);
  });

  it('returns recent events for the task', () => {
    const context = buildResumeContext(taskId);
    expect(context.recentEvents.length).toBeGreaterThanOrEqual(1);
    expect(context.recentEvents.every(e => e.task_id === taskId)).toBe(true);
  });

  it('returns lastEventAt as a non-null string', () => {
    const context = buildResumeContext(taskId);
    expect(context.lastEventAt).toBeTruthy();
    expect(typeof context.lastEventAt).toBe('string');
  });

  it('throws when no active tasks and no taskId given', () => {
    // Close our task first so no active tasks exist
    const db = getDb();
    db.prepare("UPDATE tasks SET status = 'closed' WHERE id = ?").run(taskId);

    expect(() => buildResumeContext()).toThrow(/No active tasks found/);

    // Restore
    db.prepare("UPDATE tasks SET status = 'active' WHERE id = ?").run(taskId);
  });
});
