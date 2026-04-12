import { getDb } from '../db/client.js';
import { Project } from '../types/project.js';
import { generateId } from '../lib/ids.js';
import { nowISO } from '../lib/time.js';

export function findOrCreateProject(name: string): Project {
  const db = getDb();

  const existing = db.prepare(
    'SELECT * FROM projects WHERE name = ? LIMIT 1'
  ).get(name) as Project | undefined;

  if (existing) return existing;

  const id = generateId();
  const now = nowISO();
  db.prepare(`
    INSERT INTO projects (id, name, description, created_at, updated_at)
    VALUES (@id, @name, @description, @created_at, @updated_at)
  `).run({
    id,
    name,
    description: null,
    created_at: now,
    updated_at: now,
  });

  return getProject(id)!;
}

export function getProject(id: string): Project | null {
  const db = getDb();
  return (db.prepare('SELECT * FROM projects WHERE id = ?').get(id) as Project) ?? null;
}
