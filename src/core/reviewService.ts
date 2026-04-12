import { getDb } from '../db/client.js';
import { generateId } from '../lib/ids.js';
import { nowISO, startOfWeek, endOfWeek } from '../lib/time.js';
import { Event } from '../types/events.js';
import { Task } from '../types/task.js';
import { Topic } from '../types/topic.js';
import { TopicMetrics, TaskMetrics } from '../types/metrics.js';
import { Review } from '../types/review.js';
import { TopicWithMetrics, ReviewData } from '../lib/formatting.js';
import { recalculateAllMetrics } from './metricsService.js';

type TaskWithMetrics = { task: Task; metrics: TaskMetrics | null };

function getLatestTopicMetrics(topicId: string): TopicMetrics | null {
  const db = getDb();
  return (db.prepare(
    'SELECT * FROM topic_metrics WHERE topic_id = ? ORDER BY calculated_at DESC LIMIT 1'
  ).get(topicId) as TopicMetrics) ?? null;
}

function getLatestTaskMetrics(taskId: string): TaskMetrics | null {
  const db = getDb();
  return (db.prepare(
    'SELECT * FROM task_metrics WHERE task_id = ? ORDER BY calculated_at DESC LIMIT 1'
  ).get(taskId) as TaskMetrics) ?? null;
}

export function generateWeeklyReview(options: {
  start?: string;
  end?: string;
  apply?: boolean;
}): { review: Review; data: ReviewData } {
  const db = getDb();

  const periodStart = options.start ?? startOfWeek();
  const periodEnd = options.end ?? endOfWeek();
  const now = nowISO();

  // Recalculate all metrics as of the review period end
  recalculateAllMetrics(periodEnd);

  // Count total events in period
  const totalEventsRow = db.prepare(`
    SELECT COUNT(*) as cnt FROM events
    WHERE occurred_at >= ? AND occurred_at <= ?
  `).get(periodStart, periodEnd) as { cnt: number };
  const totalEvents = totalEventsRow.cnt;

  // Get all topics with their latest metrics
  const topics = db.prepare('SELECT * FROM topics').all() as Topic[];
  const allTopicsWithMetrics: TopicWithMetrics[] = topics.map(topic => ({
    topic,
    metrics: getLatestTopicMetrics(topic.id),
  }));

  // Hot topics: highest resume_priority_score
  const hotTopics = allTopicsWithMetrics
    .filter(t => t.metrics && t.metrics.occurrences_7d > 0)
    .sort((a, b) => (b.metrics?.resume_priority_score ?? 0) - (a.metrics?.resume_priority_score ?? 0))
    .slice(0, 5);

  // Stale but important: high importance but low freshness
  const staleImportantTopics = allTopicsWithMetrics
    .filter(t => t.topic.base_importance >= 7 && (!t.metrics || t.metrics.freshness_score <= 0.2))
    .sort((a, b) => b.topic.base_importance - a.topic.base_importance)
    .slice(0, 5);

  // Anomaly candidates: high anomaly score
  const anomalyCandidates = allTopicsWithMetrics
    .filter(t => t.metrics && t.metrics.anomaly_score >= 0.7)
    .sort((a, b) => (b.metrics?.anomaly_score ?? 0) - (a.metrics?.anomaly_score ?? 0))
    .slice(0, 5);

  // Drift tasks
  const tasks = db.prepare('SELECT * FROM tasks WHERE status != ?').all('closed') as Task[];
  const allTasksWithMetrics: TaskWithMetrics[] = tasks.map(task => ({
    task,
    metrics: getLatestTaskMetrics(task.id),
  }));

  const driftTasks = allTasksWithMetrics
    .filter(t => t.metrics && t.metrics.drift_score >= 0.5)
    .sort((a, b) => (b.metrics?.drift_score ?? 0) - (a.metrics?.drift_score ?? 0))
    .slice(0, 5);

  // Personal insights: personal-origin notes recorded in the review period
  const personalInsights = db.prepare(`
    SELECT * FROM events
    WHERE origin = 'personal'
      AND occurred_at >= ? AND occurred_at <= ?
    ORDER BY occurred_at DESC
    LIMIT 10
  `).all(periodStart, periodEnd) as Event[];

  // Create review record
  const reviewId = generateId();
  const applied = options.apply ? 1 : 0;

  db.prepare(`
    INSERT INTO reviews (
      id, review_type, period_start, period_end, total_events,
      hot_topics, stale_topics, anomaly_topics, drift_tasks,
      summary, applied, created_at
    ) VALUES (
      @id, @review_type, @period_start, @period_end, @total_events,
      @hot_topics, @stale_topics, @anomaly_topics, @drift_tasks,
      @summary, @applied, @created_at
    )
  `).run({
    id: reviewId,
    review_type: 'weekly',
    period_start: periodStart,
    period_end: periodEnd,
    total_events: totalEvents,
    hot_topics: JSON.stringify(hotTopics.map(t => t.topic.id)),
    stale_topics: JSON.stringify(staleImportantTopics.map(t => t.topic.id)),
    anomaly_topics: JSON.stringify(anomalyCandidates.map(t => t.topic.id)),
    drift_tasks: JSON.stringify(driftTasks.map(t => t.task.id)),
    summary: null,
    applied,
    created_at: now,
  });

  const review = db.prepare('SELECT * FROM reviews WHERE id = ?').get(reviewId) as Review;

  const data: ReviewData = {
    periodStart,
    periodEnd,
    totalEvents,
    hotTopics,
    staleImportantTopics,
    anomalyCandidates,
    driftTasks,
    personalInsights,
  };

  return { review, data };
}
