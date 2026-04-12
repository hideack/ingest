export type EventType =
  | 'task_started'
  | 'task_resumed'
  | 'decision_made'
  | 'note_added'
  | 'blocker_found'
  | 'next_action_defined'
  | 'task_closed'
  | 'calendar_event_started'
  | 'calendar_event_ended'
  | 'artifact_updated'
  | 'git_commit'
  | 'session_summary_generated'
  | 'importance_reassessed'
  | 'topic_linked';

export type Actor = 'human' | 'ai' | 'system';
export type Origin = 'manual' | 'gcal' | 'git' | 'watcher' | 'personal';

export interface Event {
  id: string;
  event_type: EventType;
  project_id: string | null;
  task_id: string | null;
  topic_id: string | null;
  actor: Actor;
  origin: Origin;
  summary: string;
  details: string | null;
  importance: number | null;
  confidence: number | null;
  scheduled: number; // 0 or 1
  source_type: string | null;
  source_ref: string | null;
  occurred_at: string;
  created_at: string;
}

export interface GitCommit {
  hash: string;
  short_hash?: string;
  author: string;
  author_email?: string;
  date?: string;
  timestamp?: string;
  message: string;
  files?: string[];
  files_changed?: string[];
}

export interface CreateEventInput {
  event_type: EventType;
  project_id?: string;
  task_id?: string;
  topic_id?: string;
  actor: Actor;
  origin: Origin;
  summary: string;
  details?: string;
  importance?: number;
  confidence?: number;
  scheduled?: number;
  source_type?: string;
  source_ref?: string;
  occurred_at?: string;
}
