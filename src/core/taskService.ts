import { getDb } from '../db/client.js';
import { Task, TaskStatus } from '../types/task.js';
import { TaskMetrics } from '../types/metrics.js';
import { generateId } from '../lib/ids.js';
import { nowISO } from '../lib/time.js';

export function findOrCreateTask(title: string, projectId?: string): Task {
  const db = getDb();

  // Search for existing task by title (and optionally project_id)
  if (projectId) {
    const existing = db.prepare(
      'SELECT * FROM tasks WHERE title = ? AND project_id = ? LIMIT 1'
    ).get(title, projectId) as Task | undefined;
    if (existing) return existing;
  } else {
    const existing = db.prepare(
      'SELECT * FROM tasks WHERE title = ? LIMIT 1'
    ).get(title) as Task | undefined;
    if (existing) return existing;
  }

  // Create new task
  const id = generateId();
  const now = nowISO();
  db.prepare(`
    INSERT INTO tasks (id, title, project_id, status, importance, created_at, updated_at)
    VALUES (@id, @title, @project_id, @status, @importance, @created_at, @updated_at)
  `).run({
    id,
    title,
    project_id: projectId ?? null,
    status: 'active',
    importance: 5.0,
    created_at: now,
    updated_at: now,
  });

  return getTask(id)!;
}

export function getTask(id: string): Task | null {
  const db = getDb();
  return (db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as Task) ?? null;
}

export function updateTaskStatus(id: string, status: TaskStatus): void {
  const db = getDb();
  const now = nowISO();
  db.prepare('UPDATE tasks SET status = ?, updated_at = ? WHERE id = ?').run(status, now, id);
}

export function getActiveTasks(): Task[] {
  const db = getDb();
  return db.prepare(
    "SELECT * FROM tasks WHERE status = 'active' ORDER BY importance DESC, updated_at DESC"
  ).all() as Task[];
}

export function findTaskByTitle(title: string): Task | null {
  const db = getDb();
  return (db.prepare('SELECT * FROM tasks WHERE title = ? LIMIT 1').get(title) as Task) ?? null;
}

export function getLastStartedActiveTask(): Task | null {
  const db = getDb();
  const row = db.prepare(`
    SELECT t.* FROM tasks t
    INNER JOIN events e ON e.task_id = t.id
    WHERE t.status = 'active' AND e.event_type = 'task_started'
    ORDER BY e.occurred_at DESC
    LIMIT 1
  `).get() as Task | undefined;
  return row ?? null;
}

export function getAllTasksWithMetrics(
  status?: TaskStatus
): Array<{ task: Task; metrics: TaskMetrics | null }> {
  const db = getDb();
  const tasks = status
    ? (db.prepare('SELECT * FROM tasks WHERE status = ? ORDER BY importance DESC, updated_at DESC').all(status) as Task[])
    : (db.prepare("SELECT * FROM tasks WHERE status != 'closed' ORDER BY importance DESC, updated_at DESC").all() as Task[]);

  return tasks.map((task) => {
    const metrics = (db.prepare(
      'SELECT * FROM task_metrics WHERE task_id = ? ORDER BY calculated_at DESC LIMIT 1'
    ).get(task.id) as TaskMetrics) ?? null;
    return { task, metrics };
  });
}
