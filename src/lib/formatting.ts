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

const EVENT_TYPE_LABELS: Record<string, string> = {
  task_started: 'START',
  task_resumed: 'RESUME',
  decision_made: 'DECISION',
  note_added: 'NOTE',
  blocker_found: 'BLOCKER',
  next_action_defined: 'NEXT',
  task_closed: 'CLOSE',
  calendar_event_started: 'CAL_START',
  calendar_event_ended: 'CAL_END',
  artifact_updated: 'ARTIFACT',
  git_commit: 'GIT',
  session_summary_generated: 'SUMMARY',
  importance_reassessed: 'IMPORTANCE',
  topic_linked: 'TOPIC',
};

export function formatLogOutput(events: Event[]): string {
  if (events.length === 0) {
    return 'No events found.';
  }

  const lines: string[] = [];
  lines.push('='.repeat(72));
  lines.push(`EVENT LOG  (${events.length} entries)`);
  lines.push('='.repeat(72));

  for (const e of events) {
    const label = (EVENT_TYPE_LABELS[e.event_type] ?? e.event_type).padEnd(10);
    lines.push(`[${formatDate(e.occurred_at)}] ${label} ${truncate(e.summary, 48)}`);
    if (e.details) {
      lines.push(`           ${truncate(e.details, 58)}`);
    }
  }

  lines.push('='.repeat(72));
  return lines.join('\n');
}

export function formatTopicsOutput(
  entries: Array<{ topic: Topic; metrics: TopicMetrics | null }>
): string {
  if (entries.length === 0) {
    return 'No topics found.';
  }

  const lines: string[] = [];
  lines.push('='.repeat(72));
  lines.push(`TOPICS  (${entries.length} total)`);
  lines.push('='.repeat(72));
  lines.push(
    `${'NAME'.padEnd(24)} ${'IMP'.padStart(4)} ${'PRI'.padStart(5)} ${'7d'.padStart(4)} ${'LAST SEEN'.padEnd(16)}`
  );
  lines.push('-'.repeat(72));

  const sorted = [...entries].sort(
    (a, b) => (b.metrics?.resume_priority_score ?? 0) - (a.metrics?.resume_priority_score ?? 0)
  );

  for (const { topic, metrics } of sorted) {
    const imp = topic.base_importance.toFixed(1).padStart(4);
    const pri = metrics ? metrics.resume_priority_score.toFixed(2).padStart(5) : ' N/A ';
    const occ7 = metrics ? String(metrics.occurrences_7d).padStart(4) : '   -';
    const lastSeen = metrics?.last_seen_at ? formatDate(metrics.last_seen_at) : 'never';
    lines.push(`${truncate(topic.name, 24).padEnd(24)} ${imp} ${pri} ${occ7} ${lastSeen}`);
  }

  lines.push('='.repeat(72));
  return lines.join('\n');
}

const STATUS_LABELS: Record<string, string> = {
  active: 'ACTIVE',
  paused: 'PAUSED',
  blocked: 'BLOCKED',
  closed: 'CLOSED',
};

export function formatTasksOutput(
  entries: Array<{ task: Task; metrics: import('../types/metrics.js').TaskMetrics | null }>
): string {
  if (entries.length === 0) {
    return 'No tasks found.';
  }

  const lines: string[] = [];
  lines.push('='.repeat(72));
  lines.push(`TASKS  (${entries.length} total)`);
  lines.push('='.repeat(72));
  lines.push(
    `${'TITLE'.padEnd(28)} ${'STATUS'.padEnd(7)} ${'IMP'.padStart(4)} ${'DRIFT'.padStart(5)} ${'LAST SEEN'.padEnd(16)}`
  );
  lines.push('-'.repeat(72));

  for (const { task, metrics } of entries) {
    const title = truncate(task.title, 28).padEnd(28);
    const status = (STATUS_LABELS[task.status] ?? task.status).padEnd(7);
    const imp = task.importance.toFixed(1).padStart(4);
    const drift = metrics ? metrics.drift_score.toFixed(2).padStart(5) : '  N/A';
    const lastSeen = metrics?.last_seen_at ? formatDate(metrics.last_seen_at) : 'never';
    lines.push(`${title} ${status} ${imp} ${drift} ${lastSeen}`);
  }

  lines.push('='.repeat(72));
  return lines.join('\n');
}

export function formatShowOutput(
  topic: Topic,
  events: Event[],
  metrics: TopicMetrics | null
): string {
  const lines: string[] = [];

  lines.push('='.repeat(72));
  lines.push(`TOPIC: ${topic.name}`);
  lines.push('='.repeat(72));
  lines.push(`Importance : ${topic.base_importance}`);
  if (metrics) {
    lines.push(`Priority   : ${metrics.resume_priority_score.toFixed(2)}`);
    lines.push(`Freshness  : ${metrics.freshness_score.toFixed(2)}`);
    lines.push(`Activity   : ${metrics.activity_score.toFixed(2)}`);
    lines.push(`Events/7d  : ${metrics.occurrences_7d}`);
    lines.push(`Events/30d : ${metrics.occurrences_30d}`);
    lines.push(`Last seen  : ${metrics.last_seen_at ? formatDate(metrics.last_seen_at) : 'never'}`);
  }
  lines.push('');

  if (events.length === 0) {
    lines.push('No events recorded for this topic.');
  } else {
    lines.push(`--- EVENTS (${events.length}) ---`);
    for (const e of events) {
      const label = (EVENT_TYPE_LABELS[e.event_type] ?? e.event_type).padEnd(10);
      lines.push(`[${formatDate(e.occurred_at)}] ${label} ${truncate(e.summary, 44)}`);
      if (e.details) {
        lines.push(`           ${truncate(e.details, 58)}`);
      }
    }
  }

  lines.push('='.repeat(72));
  return lines.join('\n');
}
