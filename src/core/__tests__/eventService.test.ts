import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { initDb, closeDb } from '../../db/client.js';
import { createEvent, getRecentDecisions, getOpenBlockers, getRecentEvents } from '../eventService.js';

let tmpDir: string;
let dbPath: string;

beforeAll(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'worklog-test-'));
  dbPath = join(tmpDir, 'test.db');
  // Set env so getDb uses our test db
  process.env.WORKLOG_DB_PATH = dbPath;
  initDb(dbPath);
});

afterAll(() => {
  closeDb();
  delete process.env.WORKLOG_DB_PATH;
  rmSync(tmpDir, { recursive: true, force: true });
});

describe('createEvent', () => {
  it('creates a decision_made event', () => {
    const event = createEvent({
      event_type: 'decision_made',
      actor: 'human',
      origin: 'manual',
      summary: 'Decided to use TypeScript',
      importance: 8,
    });

    expect(event.event_type).toBe('decision_made');
    expect(event.summary).toBe('Decided to use TypeScript');
    expect(event.importance).toBe(8);
    expect(event.actor).toBe('human');
    expect(event.origin).toBe('manual');
    expect(event.id).toBeTruthy();
    expect(event.created_at).toBeTruthy();
  });

  it('creates a blocker_found event', () => {
    const event = createEvent({
      event_type: 'blocker_found',
      actor: 'human',
      origin: 'manual',
      summary: 'API rate limit exceeded',
      details: 'We are hitting the rate limit on external API calls',
    });

    expect(event.event_type).toBe('blocker_found');
    expect(event.summary).toBe('API rate limit exceeded');
    expect(event.details).toBe('We are hitting the rate limit on external API calls');
    expect(event.id).toBeTruthy();
  });

  it('creates a git_commit event with source_ref', () => {
    const event = createEvent({
      event_type: 'git_commit',
      actor: 'system',
      origin: 'git',
      summary: 'feat: add user authentication',
      source_type: 'git',
      source_ref: 'abc123def456',
    });

    expect(event.event_type).toBe('git_commit');
    expect(event.source_ref).toBe('abc123def456');
    expect(event.source_type).toBe('git');
    expect(event.actor).toBe('system');
    expect(event.origin).toBe('git');
  });

  it('creates event with null optional fields', () => {
    const event = createEvent({
      event_type: 'note_added',
      actor: 'human',
      origin: 'manual',
      summary: 'Just a note',
    });

    expect(event.project_id).toBeNull();
    expect(event.task_id).toBeNull();
    expect(event.topic_id).toBeNull();
    expect(event.details).toBeNull();
    expect(event.importance).toBeNull();
    expect(event.confidence).toBeNull();
    expect(event.source_type).toBeNull();
    expect(event.source_ref).toBeNull();
    expect(event.scheduled).toBe(0);
  });
});

describe('getRecentDecisions', () => {
  it('retrieves decision_made events', () => {
    // Already created one in prior test
    const decisions = getRecentDecisions();
    expect(decisions.length).toBeGreaterThanOrEqual(1);
    expect(decisions.every(d => d.event_type === 'decision_made')).toBe(true);
  });
});

describe('getOpenBlockers', () => {
  it('retrieves blocker_found events', () => {
    const blockers = getOpenBlockers();
    expect(blockers.length).toBeGreaterThanOrEqual(1);
    expect(blockers.every(b => b.event_type === 'blocker_found')).toBe(true);
  });
});

describe('getRecentEvents', () => {
  it('retrieves events filtered by event type', () => {
    const gitEvents = getRecentEvents({ eventTypes: ['git_commit'] });
    expect(gitEvents.length).toBeGreaterThanOrEqual(1);
    expect(gitEvents.every(e => e.event_type === 'git_commit')).toBe(true);
  });

  it('respects limit option', () => {
    const events = getRecentEvents({ limit: 2 });
    expect(events.length).toBeLessThanOrEqual(2);
  });

  it('returns events in occurred_at DESC order', () => {
    const events = getRecentEvents({ limit: 10 });
    for (let i = 1; i < events.length; i++) {
      const prev = new Date(events[i - 1].occurred_at).getTime();
      const curr = new Date(events[i].occurred_at).getTime();
      expect(prev >= curr).toBe(true);
    }
  });
});
