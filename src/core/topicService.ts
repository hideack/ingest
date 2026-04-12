import { getDb } from '../db/client.js';
import { Topic } from '../types/topic.js';
import { generateId } from '../lib/ids.js';
import { nowISO } from '../lib/time.js';

export function findOrCreateTopic(name: string, projectId?: string): Topic {
  const db = getDb();

  const existing = db.prepare(
    'SELECT * FROM topics WHERE name = ? LIMIT 1'
  ).get(name) as Topic | undefined;

  if (existing) return existing;

  const id = generateId();
  const now = nowISO();
  db.prepare(`
    INSERT INTO topics (id, name, project_id, base_importance, created_at, updated_at)
    VALUES (@id, @name, @project_id, @base_importance, @created_at, @updated_at)
  `).run({
    id,
    name,
    project_id: projectId ?? null,
    base_importance: 5.0,
    created_at: now,
    updated_at: now,
  });

  return getTopic(id)!;
}

export function getTopic(id: string): Topic | null {
  const db = getDb();
  return (db.prepare('SELECT * FROM topics WHERE id = ?').get(id) as Topic) ?? null;
}
