import { getDb } from '../db/client.js';
import { generateId } from '../lib/ids.js';
import { nowISO } from '../lib/time.js';
import {
  calcFreshnessScore,
  calcActivityScore,
  calcAnomalyScore,
  calcDriftScore,
  calcTopicResumePriorityScore,
  calcTaskResumePriorityScore,
} from '../lib/scoring.js';
import { getTopic } from './topicService.js';
import { getTask } from './taskService.js';

export function updateTopicMetrics(topicId: string, asOf?: string): void {
  const db = getDb();
  const now = asOf ?? nowISO();

  const topic = getTopic(topicId);
  if (!topic) return;

  // Calculate occurrences in last 7 days
  const occ7d = (db.prepare(`
    SELECT COUNT(*) as cnt FROM events
    WHERE topic_id = ? AND occurred_at >= datetime(?, '-7 days')
  `).get(topicId, now) as { cnt: number }).cnt;

  // Calculate occurrences in last 30 days
  const occ30d = (db.prepare(`
    SELECT COUNT(*) as cnt FROM events
    WHERE topic_id = ? AND occurred_at >= datetime(?, '-30 days')
  `).get(topicId, now) as { cnt: number }).cnt;

  // Unscheduled count in last 30 days
  const unscheduled30d = (db.prepare(`
    SELECT COUNT(*) as cnt FROM events
    WHERE topic_id = ? AND scheduled = 0 AND occurred_at >= datetime(?, '-30 days')
  `).get(topicId, now) as { cnt: number }).cnt;

  // Scheduled count in last 30 days
  const scheduled30d = (db.prepare(`
    SELECT COUNT(*) as cnt FROM events
    WHERE topic_id = ? AND scheduled = 1 AND occurred_at >= datetime(?, '-30 days')
  `).get(topicId, now) as { cnt: number }).cnt;

  // Last seen at
  const lastSeenRow = db.prepare(`
    SELECT MAX(occurred_at) as last_seen FROM events WHERE topic_id = ?
  `).get(topicId) as { last_seen: string | null };
  const lastSeenAt = lastSeenRow.last_seen;

  const freshnessScore = calcFreshnessScore(lastSeenAt, now);
  const activityScore = calcActivityScore(occ7d);
  const anomalyScore = calcAnomalyScore(unscheduled30d, scheduled30d);
  const resumePriorityScore = calcTopicResumePriorityScore({
    baseImportance: topic.base_importance,
    freshnessScore,
    activityScore,
    anomalyScore,
  });

  const id = generateId();
  const calculatedAt = nowISO();

  db.prepare(`
    INSERT INTO topic_metrics (
      id, topic_id, as_of,
      occurrences_7d, occurrences_30d,
      unscheduled_count_30d, scheduled_count_30d,
      freshness_score, activity_score, anomaly_score, resume_priority_score,
      last_seen_at, calculated_at
    ) VALUES (
      @id, @topic_id, @as_of,
      @occurrences_7d, @occurrences_30d,
      @unscheduled_count_30d, @scheduled_count_30d,
      @freshness_score, @activity_score, @anomaly_score, @resume_priority_score,
      @last_seen_at, @calculated_at
    )
  `).run({
    id,
    topic_id: topicId,
    as_of: now,
    occurrences_7d: occ7d,
    occurrences_30d: occ30d,
    unscheduled_count_30d: unscheduled30d,
    scheduled_count_30d: scheduled30d,
    freshness_score: freshnessScore,
    activity_score: activityScore,
    anomaly_score: anomalyScore,
    resume_priority_score: resumePriorityScore,
    last_seen_at: lastSeenAt,
    calculated_at: calculatedAt,
  });
}

export function updateTaskMetrics(taskId: string, asOf?: string): void {
  const db = getDb();
  const now = asOf ?? nowISO();

  const task = getTask(taskId);
  if (!task) return;

  // Calculate occurrences in last 7 days
  const occ7d = (db.prepare(`
    SELECT COUNT(*) as cnt FROM events
    WHERE task_id = ? AND occurred_at >= datetime(?, '-7 days')
  `).get(taskId, now) as { cnt: number }).cnt;

  // Calculate occurrences in last 30 days
  const occ30d = (db.prepare(`
    SELECT COUNT(*) as cnt FROM events
    WHERE task_id = ? AND occurred_at >= datetime(?, '-30 days')
  `).get(taskId, now) as { cnt: number }).cnt;

  // Blocked count in last 30 days
  const blocked30d = (db.prepare(`
    SELECT COUNT(*) as cnt FROM events
    WHERE task_id = ? AND event_type = 'blocker_found' AND occurred_at >= datetime(?, '-30 days')
  `).get(taskId, now) as { cnt: number }).cnt;

  // Next action count in last 30 days
  const nextAction30d = (db.prepare(`
    SELECT COUNT(*) as cnt FROM events
    WHERE task_id = ? AND event_type = 'next_action_defined' AND occurred_at >= datetime(?, '-30 days')
  `).get(taskId, now) as { cnt: number }).cnt;

  // Decision count in last 30 days
  const decision30d = (db.prepare(`
    SELECT COUNT(*) as cnt FROM events
    WHERE task_id = ? AND event_type = 'decision_made' AND occurred_at >= datetime(?, '-30 days')
  `).get(taskId, now) as { cnt: number }).cnt;

  // Last seen at
  const lastSeenRow = db.prepare(`
    SELECT MAX(occurred_at) as last_seen FROM events WHERE task_id = ?
  `).get(taskId) as { last_seen: string | null };
  const lastSeenAt = lastSeenRow.last_seen;

  const freshnessScore = calcFreshnessScore(lastSeenAt, now);
  const activityScore = calcActivityScore(occ7d);
  const driftScore = calcDriftScore({
    blockedCount30d: blocked30d,
    occurrences30d: occ30d,
    nextActionCount30d: nextAction30d,
    decisionCount30d: decision30d,
  });
  const resumePriorityScore = calcTaskResumePriorityScore({
    importance: task.importance,
    freshnessScore,
    activityScore,
    driftScore,
  });

  const id = generateId();
  const calculatedAt = nowISO();

  db.prepare(`
    INSERT INTO task_metrics (
      id, task_id, as_of,
      occurrences_7d, occurrences_30d,
      blocked_count_30d, next_action_count_30d, decision_count_30d,
      freshness_score, activity_score, drift_score, resume_priority_score,
      last_seen_at, calculated_at
    ) VALUES (
      @id, @task_id, @as_of,
      @occurrences_7d, @occurrences_30d,
      @blocked_count_30d, @next_action_count_30d, @decision_count_30d,
      @freshness_score, @activity_score, @drift_score, @resume_priority_score,
      @last_seen_at, @calculated_at
    )
  `).run({
    id,
    task_id: taskId,
    as_of: now,
    occurrences_7d: occ7d,
    occurrences_30d: occ30d,
    blocked_count_30d: blocked30d,
    next_action_count_30d: nextAction30d,
    decision_count_30d: decision30d,
    freshness_score: freshnessScore,
    activity_score: activityScore,
    drift_score: driftScore,
    resume_priority_score: resumePriorityScore,
    last_seen_at: lastSeenAt,
    calculated_at: calculatedAt,
  });
}

export function recalculateAllMetrics(asOf?: string): void {
  const db = getDb();

  const topics = db.prepare('SELECT id FROM topics').all() as Array<{ id: string }>;
  for (const { id } of topics) {
    updateTopicMetrics(id, asOf);
  }

  const tasks = db.prepare('SELECT id FROM tasks').all() as Array<{ id: string }>;
  for (const { id } of tasks) {
    updateTaskMetrics(id, asOf);
  }
}
