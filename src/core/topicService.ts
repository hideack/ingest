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

export function updateTopic(id: string, fields: { name?: string; base_importance?: number }): void {
  const db = getDb();
  const now = nowISO();
  const sets: string[] = [];
  const values: unknown[] = [];
  if (fields.name !== undefined) { sets.push('name = ?'); values.push(fields.name); }
  if (fields.base_importance !== undefined) { sets.push('base_importance = ?'); values.push(fields.base_importance); }
  if (sets.length === 0) return;
  sets.push('updated_at = ?');
  values.push(now, id);
  db.prepare(`UPDATE topics SET ${sets.join(', ')} WHERE id = ?`).run(...values);
}

export function findTopicByName(name: string): Topic | null {
  const db = getDb();
  return (db.prepare('SELECT * FROM topics WHERE name = ? LIMIT 1').get(name) as Topic) ?? null;
}

export function getAllTopicsWithMetrics(): Array<{ topic: Topic; metrics: import('../types/metrics.js').TopicMetrics | null }> {
  const db = getDb();
  const topics = db.prepare('SELECT * FROM topics ORDER BY name ASC').all() as Topic[];

  return topics.map((topic) => {
    const metrics = (db.prepare(
      `SELECT * FROM topic_metrics WHERE topic_id = ? ORDER BY calculated_at DESC LIMIT 1`
    ).get(topic.id) as import('../types/metrics.js').TopicMetrics) ?? null;
    return { topic, metrics };
  });
}
