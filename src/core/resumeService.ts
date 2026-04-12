import { getDb } from '../db/client.js';
import { Event } from '../types/events.js';
import { Task } from '../types/task.js';
import { Topic } from '../types/topic.js';
import { TopicMetrics } from '../types/metrics.js';
import { TopicWithMetrics } from '../lib/formatting.js';
import {
  getRecentEvents,
  getOpenBlockers,
  getRecentDecisions,
  getNextActions,
} from './eventService.js';
import { getActiveTasks } from './taskService.js';

export interface ResumeContext {
  task: Task;
  lastEventAt: string | null;
  recentEvents: Event[];
  openBlockers: Event[];
  recentDecisions: Event[];
  nextActions: Event[];
  hotTopics: TopicWithMetrics[];
  staleImportantTopics: TopicWithMetrics[];
  personalInsights: Event[];
}

function getLatestTopicMetrics(topicId: string): TopicMetrics | null {
  const db = getDb();
  return (db.prepare(
    'SELECT * FROM topic_metrics WHERE topic_id = ? ORDER BY calculated_at DESC LIMIT 1'
  ).get(topicId) as TopicMetrics) ?? null;
}

function getAllTopicsWithMetrics(): TopicWithMetrics[] {
  const db = getDb();
  const topics = db.prepare('SELECT * FROM topics').all() as Topic[];
  return topics.map(topic => ({
    topic,
    metrics: getLatestTopicMetrics(topic.id),
  }));
}

export function buildResumeContext(taskId?: string): ResumeContext {
  const db = getDb();

  // Get the target task
  let task: Task | null = null;
  if (taskId) {
    task = (db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId) as Task) ?? null;
  }
  if (!task) {
    // Get the most recently active task
    const activeTasks = getActiveTasks();
    if (activeTasks.length === 0) {
      throw new Error('No active tasks found. Start a task first with `ingest start`.');
    }
    task = activeTasks[0];
  }

  // Get last event time for this task
  const lastEventRow = db.prepare(
    'SELECT MAX(occurred_at) as last_at FROM events WHERE task_id = ?'
  ).get(task.id) as { last_at: string | null };
  const lastEventAt = lastEventRow.last_at;

  // Get recent events (exclude personal origin — they appear in their own section)
  const recentEvents = getRecentEvents({ taskId: task.id, limit: 20, excludeOrigins: ['personal'] });

  // Get open blockers
  const openBlockers = getOpenBlockers(task.id);

  // Get recent decisions
  const recentDecisions = getRecentDecisions(task.id, 5);

  // Get next actions
  const nextActions = getNextActions(task.id);

  // Get all topics with metrics
  const allTopicsWithMetrics = getAllTopicsWithMetrics();

  // Hot topics: high resume_priority_score (>= 0.6)
  const hotTopics = allTopicsWithMetrics
    .filter(t => t.metrics && t.metrics.resume_priority_score >= 0.6)
    .sort((a, b) => (b.metrics?.resume_priority_score ?? 0) - (a.metrics?.resume_priority_score ?? 0))
    .slice(0, 5);

  // Stale but important: high base_importance but low freshness_score
  const staleImportantTopics = allTopicsWithMetrics
    .filter(t => t.topic.base_importance >= 7 && (!t.metrics || t.metrics.freshness_score <= 0.2))
    .sort((a, b) => b.topic.base_importance - a.topic.base_importance)
    .slice(0, 5);

  // Personal insights: personal-origin notes linked to the current task or its topics
  // Fetch from the last 30 days so older offline ideas can still surface
  const personalInsights = (db.prepare(`
    SELECT * FROM events
    WHERE origin = 'personal'
      AND (task_id = ? OR topic_id IN (
        SELECT id FROM topics WHERE project_id = (
          SELECT project_id FROM tasks WHERE id = ?
        )
      ))
      AND occurred_at >= datetime('now', '-30 days')
    ORDER BY occurred_at DESC
    LIMIT 5
  `).all(task.id, task.id) as Event[]);

  return {
    task,
    lastEventAt,
    recentEvents,
    openBlockers,
    recentDecisions,
    nextActions,
    hotTopics,
    staleImportantTopics,
    personalInsights,
  };
}
