import dayjs from 'dayjs';

/**
 * Calculates freshness score based on how recently a topic/task was seen.
 * - Within 1 day: 1.0
 * - Within 3 days: 0.8
 * - Within 7 days: 0.5
 * - Within 14 days: 0.2
 * - Over 30 days or null: 0.0
 */
export function calcFreshnessScore(lastSeenAt: string | null, asOf?: string): number {
  if (!lastSeenAt) return 0.0;

  const reference = asOf ? dayjs(asOf) : dayjs();
  const last = dayjs(lastSeenAt);
  const diffDays = reference.diff(last, 'day');

  if (diffDays <= 1) return 1.0;
  if (diffDays <= 3) return 0.8;
  if (diffDays <= 7) return 0.5;
  if (diffDays <= 14) return 0.2;
  return 0.0;
}

/**
 * Calculates activity score based on occurrences in the last 7 days.
 * min(1.0, occurrences7d / 5.0)
 */
export function calcActivityScore(occurrences7d: number): number {
  return Math.min(1.0, occurrences7d / 5.0);
}

/**
 * Calculates anomaly score based on unscheduled vs scheduled events in last 30 days.
 * unscheduled_count_30d / max(1, scheduled + unscheduled)
 */
export function calcAnomalyScore(unscheduledCount30d: number, scheduledCount30d: number): number {
  const total = unscheduledCount30d + scheduledCount30d;
  return unscheduledCount30d / Math.max(1, total);
}

/**
 * Calculates drift score based on task activity patterns.
 * Spec section 10.8: measures how much a task is drifting (blocked/stalled).
 * Result is clamped to [0.0, 1.0].
 */
export function calcDriftScore(params: {
  blockedCount30d: number;
  occurrences30d: number;
  nextActionCount30d: number;
  decisionCount30d: number;
}): number {
  const { blockedCount30d, occurrences30d, nextActionCount30d, decisionCount30d } = params;

  if (occurrences30d === 0) return 0.0;

  // Blocker ratio contributes heavily to drift
  const blockerRatio = blockedCount30d / Math.max(1, occurrences30d);

  // Low action/decision ratio indicates stagnation
  const actionDecisionRatio = (nextActionCount30d + decisionCount30d) / Math.max(1, occurrences30d);
  const stagnationFactor = Math.max(0, 1.0 - actionDecisionRatio);

  const raw = 0.6 * blockerRatio + 0.4 * stagnationFactor;

  return Math.min(1.0, Math.max(0.0, raw));
}

/**
 * Calculates topic resume priority score.
 * Spec section 10.9.
 */
export function calcTopicResumePriorityScore(params: {
  baseImportance: number;
  freshnessScore: number;
  activityScore: number;
  anomalyScore: number;
}): number {
  const { baseImportance, freshnessScore, activityScore, anomalyScore } = params;

  // Normalize importance to 0-1 range (assuming importance is 1-10)
  const normalizedImportance = Math.min(1.0, baseImportance / 10.0);

  const score =
    0.4 * normalizedImportance +
    0.3 * freshnessScore +
    0.2 * activityScore +
    0.1 * anomalyScore;

  return Math.min(1.0, Math.max(0.0, score));
}

/**
 * Calculates task resume priority score.
 * Spec section 10.9.
 */
export function calcTaskResumePriorityScore(params: {
  importance: number;
  freshnessScore: number;
  activityScore: number;
  driftScore: number;
}): number {
  const { importance, freshnessScore, activityScore, driftScore } = params;

  // Normalize importance to 0-1 range (assuming importance is 1-10)
  const normalizedImportance = Math.min(1.0, importance / 10.0);

  const score =
    0.4 * normalizedImportance +
    0.3 * freshnessScore +
    0.2 * activityScore +
    0.1 * driftScore;

  return Math.min(1.0, Math.max(0.0, score));
}
