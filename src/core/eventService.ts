import { getDb } from '../db/client.js';
import { CreateEventInput, Event } from '../types/events.js';
import { generateId } from '../lib/ids.js';
import { nowISO } from '../lib/time.js';

export function createEvent(input: CreateEventInput): Event {
  const db = getDb();
  const id = generateId();
  const now = nowISO();
  const occurredAt = input.occurred_at ?? now;

  const stmt = db.prepare(`
    INSERT INTO events (
      id, event_type, project_id, task_id, topic_id,
      actor, origin, summary, details,
      importance, confidence, scheduled,
      source_type, source_ref,
      occurred_at, created_at
    ) VALUES (
      @id, @event_type, @project_id, @task_id, @topic_id,
      @actor, @origin, @summary, @details,
      @importance, @confidence, @scheduled,
      @source_type, @source_ref,
      @occurred_at, @created_at
    )
  `);

  stmt.run({
    id,
    event_type: input.event_type,
    project_id: input.project_id ?? null,
    task_id: input.task_id ?? null,
    topic_id: input.topic_id ?? null,
    actor: input.actor,
    origin: input.origin,
    summary: input.summary,
    details: input.details ?? null,
    importance: input.importance ?? null,
    confidence: input.confidence ?? null,
    scheduled: input.scheduled ?? 0,
    source_type: input.source_type ?? null,
    source_ref: input.source_ref ?? null,
    occurred_at: occurredAt,
    created_at: now,
  });

  return getEventById(id)!;
}

function getEventById(id: string): Event | null {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM events WHERE id = ?');
  return (stmt.get(id) as Event) ?? null;
}

export function getRecentEvents(options: {
  taskId?: string;
  topicId?: string;
  projectId?: string;
  limit?: number;
  eventTypes?: string[];
  excludeOrigins?: string[];
}): Event[] {
  const db = getDb();
  const conditions: string[] = [];
  const params: Record<string, unknown> = {};

  if (options.taskId) {
    conditions.push('task_id = @task_id');
    params['task_id'] = options.taskId;
  }
  if (options.topicId) {
    conditions.push('topic_id = @topic_id');
    params['topic_id'] = options.topicId;
  }
  if (options.projectId) {
    conditions.push('project_id = @project_id');
    params['project_id'] = options.projectId;
  }
  if (options.eventTypes && options.eventTypes.length > 0) {
    const placeholders = options.eventTypes.map((_, i) => `@et${i}`).join(', ');
    conditions.push(`event_type IN (${placeholders})`);
    options.eventTypes.forEach((et, i) => {
      params[`et${i}`] = et;
    });
  }
  if (options.excludeOrigins && options.excludeOrigins.length > 0) {
    const placeholders = options.excludeOrigins.map((_, i) => `@exo${i}`).join(', ');
    conditions.push(`origin NOT IN (${placeholders})`);
    options.excludeOrigins.forEach((o, i) => {
      params[`exo${i}`] = o;
    });
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const limit = options.limit ?? 50;
  // datetime() normalizes timezone-offset strings (e.g. +09:00) to UTC before
  // sorting, ensuring correct ordering when events come from git or calendar
  // sources that may store occurred_at in local-time ISO 8601 format.
  // The secondary sort on occurred_at provides a deterministic tiebreaker
  // for events within the same UTC second (datetime() drops milliseconds).
  const sql = `SELECT * FROM events ${where} ORDER BY datetime(occurred_at) DESC, occurred_at DESC LIMIT ${limit}`;

  const stmt = db.prepare(sql);
  return stmt.all(params) as Event[];
}

export function getOpenBlockers(taskId?: string): Event[] {
  const db = getDb();
  if (taskId) {
    const stmt = db.prepare(
      `SELECT * FROM events WHERE event_type = 'blocker_found' AND task_id = ? ORDER BY datetime(occurred_at) DESC`
    );
    return stmt.all(taskId) as Event[];
  } else {
    const stmt = db.prepare(
      `SELECT * FROM events WHERE event_type = 'blocker_found' ORDER BY datetime(occurred_at) DESC`
    );
    return stmt.all() as Event[];
  }
}

export function getRecentDecisions(taskId?: string, limit?: number): Event[] {
  const db = getDb();
  const lim = limit ?? 10;
  if (taskId) {
    const stmt = db.prepare(
      `SELECT * FROM events WHERE event_type = 'decision_made' AND task_id = ? ORDER BY datetime(occurred_at) DESC LIMIT ?`
    );
    return stmt.all(taskId, lim) as Event[];
  } else {
    const stmt = db.prepare(
      `SELECT * FROM events WHERE event_type = 'decision_made' ORDER BY datetime(occurred_at) DESC LIMIT ?`
    );
    return stmt.all(lim) as Event[];
  }
}

export function getNextActions(taskId?: string): Event[] {
  const db = getDb();
  if (taskId) {
    const stmt = db.prepare(
      `SELECT * FROM events WHERE event_type = 'next_action_defined' AND task_id = ? ORDER BY datetime(occurred_at) DESC`
    );
    return stmt.all(taskId) as Event[];
  } else {
    const stmt = db.prepare(
      `SELECT * FROM events WHERE event_type = 'next_action_defined' ORDER BY datetime(occurred_at) DESC`
    );
    return stmt.all() as Event[];
  }
}
