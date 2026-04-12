import { Event } from '../types/events.js';
import { Task } from '../types/task.js';
import { Topic } from '../types/topic.js';
import { TopicMetrics } from '../types/metrics.js';

export interface TopicWithMetrics {
  topic: Topic;
  metrics: TopicMetrics | null;
}

export interface ResumeData {
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

export interface ReviewData {
  periodStart: string;
  periodEnd: string;
  totalEvents: number;
  hotTopics: TopicWithMetrics[];
  staleImportantTopics: TopicWithMetrics[];
  anomalyCandidates: TopicWithMetrics[];
  driftTasks: Array<{ task: Task; metrics: import('../types/metrics.js').TaskMetrics | null }>;
  personalInsights: Event[];
}

function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 3) + '...';
}

export function formatResumeOutput(data: ResumeData): string {
  const lines: string[] = [];

  lines.push('='.repeat(60));
  lines.push(`RESUME: ${data.task.title}`);
  lines.push('='.repeat(60));
  lines.push(`Status   : ${data.task.status}`);
  lines.push(`Importance: ${data.task.importance}`);
  if (data.lastEventAt) {
    lines.push(`Last seen : ${formatDate(data.lastEventAt)}`);
  } else {
    lines.push(`Last seen : (none)`);
  }
  lines.push('');

  if (data.openBlockers.length > 0) {
    lines.push('--- OPEN BLOCKERS ---');
    for (const b of data.openBlockers) {
      lines.push(`  [!] ${truncate(b.summary, 70)}`);
    }
    lines.push('');
  }

  if (data.nextActions.length > 0) {
    lines.push('--- NEXT ACTIONS ---');
    for (const a of data.nextActions) {
      lines.push(`  [ ] ${truncate(a.summary, 70)}`);
    }
    lines.push('');
  }

  if (data.recentDecisions.length > 0) {
    lines.push('--- RECENT DECISIONS ---');
    for (const d of data.recentDecisions) {
      lines.push(`  * ${truncate(d.summary, 70)}`);
    }
    lines.push('');
  }

  if (data.recentEvents.length > 0) {
    lines.push('--- RECENT EVENTS ---');
    for (const e of data.recentEvents.slice(0, 10)) {
      lines.push(`  [${formatDate(e.occurred_at)}] ${e.event_type}: ${truncate(e.summary, 50)}`);
    }
    lines.push('');
  }

  if (data.hotTopics.length > 0) {
    lines.push('--- HOT TOPICS ---');
    for (const t of data.hotTopics) {
      const score = t.metrics ? t.metrics.resume_priority_score.toFixed(2) : 'N/A';
      lines.push(`  ${t.topic.name} (score: ${score})`);
    }
    lines.push('');
  }

  if (data.staleImportantTopics.length > 0) {
    lines.push('--- STALE BUT IMPORTANT TOPICS ---');
    for (const t of data.staleImportantTopics) {
      const lastSeen = t.metrics?.last_seen_at ? formatDate(t.metrics.last_seen_at) : 'never';
      lines.push(`  ${t.topic.name} (last seen: ${lastSeen}, importance: ${t.topic.base_importance})`);
    }
    lines.push('');
  }

  if (data.personalInsights.length > 0) {
    lines.push('--- PERSONAL INSIGHTS (linked to this context) ---');
    for (const e of data.personalInsights) {
      lines.push(`  [${formatDate(e.occurred_at)}] ${truncate(e.summary, 65)}`);
    }
    lines.push('');
  }

  lines.push('='.repeat(60));

  return lines.join('\n');
}

export function formatReviewOutput(data: ReviewData): string {
  const lines: string[] = [];

  lines.push('='.repeat(60));
  lines.push('WEEKLY REVIEW');
  lines.push('='.repeat(60));
  lines.push(`Period     : ${formatDate(data.periodStart)} - ${formatDate(data.periodEnd)}`);
  lines.push(`Total events: ${data.totalEvents}`);
  lines.push('');

  if (data.hotTopics.length > 0) {
    lines.push('--- HOT TOPICS (high activity) ---');
    for (const t of data.hotTopics) {
      const score = t.metrics ? t.metrics.resume_priority_score.toFixed(2) : 'N/A';
      const occ = t.metrics ? t.metrics.occurrences_7d : 0;
      lines.push(`  ${t.topic.name} (score: ${score}, events/7d: ${occ})`);
    }
    lines.push('');
  }

  if (data.staleImportantTopics.length > 0) {
    lines.push('--- STALE BUT IMPORTANT TOPICS ---');
    for (const t of data.staleImportantTopics) {
      const lastSeen = t.metrics?.last_seen_at ? formatDate(t.metrics.last_seen_at) : 'never';
      lines.push(`  ${t.topic.name} (importance: ${t.topic.base_importance}, last seen: ${lastSeen})`);
    }
    lines.push('');
  }

  if (data.anomalyCandidates.length > 0) {
    lines.push('--- ANOMALY CANDIDATES (high unscheduled ratio) ---');
    for (const t of data.anomalyCandidates) {
      const anomaly = t.metrics ? t.metrics.anomaly_score.toFixed(2) : 'N/A';
      lines.push(`  ${t.topic.name} (anomaly score: ${anomaly})`);
    }
    lines.push('');
  }

  if (data.driftTasks.length > 0) {
    lines.push('--- DRIFT TASKS (stalled/blocked) ---');
    for (const dt of data.driftTasks) {
      const drift = dt.metrics ? dt.metrics.drift_score.toFixed(2) : 'N/A';
      lines.push(`  ${dt.task.title} (drift score: ${drift}, status: ${dt.task.status})`);
    }
    lines.push('');
  }

  if (data.personalInsights.length > 0) {
    lines.push('--- PERSONAL INSIGHTS (offline ideas linked to work topics) ---');
    for (const e of data.personalInsights) {
      lines.push(`  [${formatDate(e.occurred_at)}] ${truncate(e.summary, 65)}`);
    }
    lines.push('');
  }

  lines.push('='.repeat(60));

  return lines.join('\n');
}
