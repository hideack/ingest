export interface TopicMetrics {
  id: string;
  topic_id: string;
  as_of: string;
  occurrences_7d: number;
  occurrences_30d: number;
  unscheduled_count_30d: number;
  scheduled_count_30d: number;
  freshness_score: number;
  activity_score: number;
  anomaly_score: number;
  resume_priority_score: number;
  last_seen_at: string | null;
  calculated_at: string;
}

export interface TaskMetrics {
  id: string;
  task_id: string;
  as_of: string;
  occurrences_7d: number;
  occurrences_30d: number;
  blocked_count_30d: number;
  next_action_count_30d: number;
  decision_count_30d: number;
  freshness_score: number;
  activity_score: number;
  drift_score: number;
  resume_priority_score: number;
  last_seen_at: string | null;
  calculated_at: string;
}
