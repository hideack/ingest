import { describe, it, expect } from 'vitest';
import {
  calcFreshnessScore,
  calcActivityScore,
  calcAnomalyScore,
  calcDriftScore,
  calcTopicResumePriorityScore,
  calcTaskResumePriorityScore,
} from '../scoring.js';

describe('calcFreshnessScore', () => {
  it('returns 1.0 for events within 1 day', () => {
    const now = new Date().toISOString();
    const halfDayAgo = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();
    expect(calcFreshnessScore(halfDayAgo, now)).toBe(1.0);
  });

  it('returns 0.8 for events within 3 days', () => {
    const now = new Date().toISOString();
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
    expect(calcFreshnessScore(twoDaysAgo, now)).toBe(0.8);
  });

  it('returns 0.5 for events within 7 days', () => {
    const now = new Date().toISOString();
    const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();
    expect(calcFreshnessScore(fiveDaysAgo, now)).toBe(0.5);
  });

  it('returns 0.2 for events within 14 days', () => {
    const now = new Date().toISOString();
    const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
    expect(calcFreshnessScore(tenDaysAgo, now)).toBe(0.2);
  });

  it('returns 0.0 for events over 30 days ago', () => {
    const now = new Date().toISOString();
    const fortyDaysAgo = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString();
    expect(calcFreshnessScore(fortyDaysAgo, now)).toBe(0.0);
  });

  it('returns 0.0 for null lastSeenAt', () => {
    expect(calcFreshnessScore(null)).toBe(0.0);
  });

  it('decays correctly based on reference date', () => {
    const asOf = '2024-01-20T12:00:00.000Z';
    const twoDaysBefore = '2024-01-18T12:00:00.000Z';
    expect(calcFreshnessScore(twoDaysBefore, asOf)).toBe(0.8);
  });
});

describe('calcActivityScore', () => {
  it('returns 0.0 for zero occurrences', () => {
    expect(calcActivityScore(0)).toBe(0.0);
  });

  it('returns proportional score for fewer than 5 occurrences', () => {
    expect(calcActivityScore(1)).toBeCloseTo(0.2);
    expect(calcActivityScore(2)).toBeCloseTo(0.4);
    expect(calcActivityScore(3)).toBeCloseTo(0.6);
    expect(calcActivityScore(4)).toBeCloseTo(0.8);
  });

  it('returns 1.0 for exactly 5 occurrences', () => {
    expect(calcActivityScore(5)).toBe(1.0);
  });

  it('returns 1.0 for more than 5 occurrences (capped)', () => {
    expect(calcActivityScore(10)).toBe(1.0);
    expect(calcActivityScore(100)).toBe(1.0);
  });
});

describe('calcAnomalyScore', () => {
  it('returns 0.0 when all events are scheduled', () => {
    expect(calcAnomalyScore(0, 10)).toBe(0.0);
  });

  it('returns 1.0 when all events are unscheduled', () => {
    expect(calcAnomalyScore(10, 0)).toBe(1.0);
  });

  it('returns proportional score for mixed events', () => {
    expect(calcAnomalyScore(5, 5)).toBeCloseTo(0.5);
  });

  it('uses max(1, total) to avoid division by zero', () => {
    expect(calcAnomalyScore(0, 0)).toBe(0.0);
  });

  it('calculates correct ratio for given counts', () => {
    // unscheduled=3, scheduled=7, total=10
    // score = 3 / max(1, 10) = 0.3
    expect(calcAnomalyScore(3, 7)).toBeCloseTo(0.3);
  });
});

describe('calcDriftScore', () => {
  it('returns 0.0 when there are no occurrences', () => {
    expect(calcDriftScore({
      blockedCount30d: 0,
      occurrences30d: 0,
      nextActionCount30d: 0,
      decisionCount30d: 0,
    })).toBe(0.0);
  });

  it('returns higher score for blocked tasks with no action/decision', () => {
    const highDrift = calcDriftScore({
      blockedCount30d: 5,
      occurrences30d: 5,
      nextActionCount30d: 0,
      decisionCount30d: 0,
    });
    expect(highDrift).toBeGreaterThan(0.5);
  });

  it('returns lower score for tasks with many actions and decisions', () => {
    const lowDrift = calcDriftScore({
      blockedCount30d: 0,
      occurrences30d: 10,
      nextActionCount30d: 5,
      decisionCount30d: 5,
    });
    expect(lowDrift).toBeLessThan(0.3);
  });

  it('clamps result to [0.0, 1.0]', () => {
    const score = calcDriftScore({
      blockedCount30d: 1000,
      occurrences30d: 5,
      nextActionCount30d: 0,
      decisionCount30d: 0,
    });
    expect(score).toBeLessThanOrEqual(1.0);
    expect(score).toBeGreaterThanOrEqual(0.0);
  });
});

describe('calcTopicResumePriorityScore', () => {
  it('returns higher score for important, fresh, active topics', () => {
    const score = calcTopicResumePriorityScore({
      baseImportance: 10,
      freshnessScore: 1.0,
      activityScore: 1.0,
      anomalyScore: 0.0,
    });
    expect(score).toBeGreaterThan(0.8);
  });

  it('returns lower score for unimportant, stale, inactive topics', () => {
    const score = calcTopicResumePriorityScore({
      baseImportance: 1,
      freshnessScore: 0.0,
      activityScore: 0.0,
      anomalyScore: 0.0,
    });
    expect(score).toBeLessThan(0.2);
  });

  it('clamps result to [0.0, 1.0]', () => {
    const score = calcTopicResumePriorityScore({
      baseImportance: 100,
      freshnessScore: 2.0,
      activityScore: 2.0,
      anomalyScore: 2.0,
    });
    expect(score).toBeLessThanOrEqual(1.0);
    expect(score).toBeGreaterThanOrEqual(0.0);
  });
});

describe('calcTaskResumePriorityScore', () => {
  it('returns higher score for important, fresh, active tasks', () => {
    const score = calcTaskResumePriorityScore({
      importance: 10,
      freshnessScore: 1.0,
      activityScore: 1.0,
      driftScore: 0.0,
    });
    expect(score).toBeGreaterThan(0.8);
  });

  it('returns lower score for unimportant, stale tasks', () => {
    const score = calcTaskResumePriorityScore({
      importance: 1,
      freshnessScore: 0.0,
      activityScore: 0.0,
      driftScore: 0.0,
    });
    expect(score).toBeLessThan(0.2);
  });
});
