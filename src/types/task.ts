export type TaskStatus = 'active' | 'paused' | 'blocked' | 'closed';

export interface Task {
  id: string;
  title: string;
  project_id: string | null;
  status: TaskStatus;
  importance: number;
  created_at: string;
  updated_at: string;
}
