export interface Review {
  id: string;
  review_type: string;
  period_start: string;
  period_end: string;
  total_events: number;
  hot_topics: string | null;      // JSON array of topic IDs
  stale_topics: string | null;    // JSON array of topic IDs
  anomaly_topics: string | null;  // JSON array of topic IDs
  drift_tasks: string | null;     // JSON array of task IDs
  summary: string | null;
  applied: number;                // 0 or 1
  created_at: string;
}

export interface ReviewTopicAction {
  id: string;
  review_id: string;
  topic_id: string;
  action_type: string;
  old_importance: number | null;
  new_importance: number | null;
  reason: string | null;
  applied: number;  // 0 or 1
  created_at: string;
}
