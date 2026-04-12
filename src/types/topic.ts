export interface Topic {
  id: string;
  name: string;
  project_id: string | null;
  base_importance: number;
  created_at: string;
  updated_at: string;
}
