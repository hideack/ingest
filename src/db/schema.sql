-- Projects table
CREATE TABLE IF NOT EXISTS projects (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- Tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  project_id  TEXT REFERENCES projects(id),
  status      TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'blocked', 'closed')),
  importance  REAL NOT NULL DEFAULT 5.0,
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- Topics table
CREATE TABLE IF NOT EXISTS topics (
  id               TEXT PRIMARY KEY,
  name             TEXT NOT NULL UNIQUE,
  project_id       TEXT REFERENCES projects(id),
  base_importance  REAL NOT NULL DEFAULT 5.0,
  created_at       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- Events table
CREATE TABLE IF NOT EXISTS events (
  id           TEXT PRIMARY KEY,
  event_type   TEXT NOT NULL,
  project_id   TEXT REFERENCES projects(id),
  task_id      TEXT REFERENCES tasks(id),
  topic_id     TEXT REFERENCES topics(id),
  actor        TEXT NOT NULL DEFAULT 'human' CHECK (actor IN ('human', 'ai', 'system')),
  origin       TEXT NOT NULL DEFAULT 'manual' CHECK (origin IN ('manual', 'gcal', 'git', 'watcher')),
  summary      TEXT NOT NULL,
  details      TEXT,
  importance   REAL,
  confidence   REAL,
  scheduled    INTEGER NOT NULL DEFAULT 0 CHECK (scheduled IN (0, 1)),
  source_type  TEXT,
  source_ref   TEXT,
  occurred_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- Topic metrics table
CREATE TABLE IF NOT EXISTS topic_metrics (
  id                     TEXT PRIMARY KEY,
  topic_id               TEXT NOT NULL REFERENCES topics(id),
  as_of                  TEXT NOT NULL,
  occurrences_7d         INTEGER NOT NULL DEFAULT 0,
  occurrences_30d        INTEGER NOT NULL DEFAULT 0,
  unscheduled_count_30d  INTEGER NOT NULL DEFAULT 0,
  scheduled_count_30d    INTEGER NOT NULL DEFAULT 0,
  freshness_score        REAL NOT NULL DEFAULT 0.0,
  activity_score         REAL NOT NULL DEFAULT 0.0,
  anomaly_score          REAL NOT NULL DEFAULT 0.0,
  resume_priority_score  REAL NOT NULL DEFAULT 0.0,
  last_seen_at           TEXT,
  calculated_at          TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- Task metrics table
CREATE TABLE IF NOT EXISTS task_metrics (
  id                     TEXT PRIMARY KEY,
  task_id                TEXT NOT NULL REFERENCES tasks(id),
  as_of                  TEXT NOT NULL,
  occurrences_7d         INTEGER NOT NULL DEFAULT 0,
  occurrences_30d        INTEGER NOT NULL DEFAULT 0,
  blocked_count_30d      INTEGER NOT NULL DEFAULT 0,
  next_action_count_30d  INTEGER NOT NULL DEFAULT 0,
  decision_count_30d     INTEGER NOT NULL DEFAULT 0,
  freshness_score        REAL NOT NULL DEFAULT 0.0,
  activity_score         REAL NOT NULL DEFAULT 0.0,
  drift_score            REAL NOT NULL DEFAULT 0.0,
  resume_priority_score  REAL NOT NULL DEFAULT 0.0,
  last_seen_at           TEXT,
  calculated_at          TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- Reviews table
CREATE TABLE IF NOT EXISTS reviews (
  id              TEXT PRIMARY KEY,
  review_type     TEXT NOT NULL DEFAULT 'weekly',
  period_start    TEXT NOT NULL,
  period_end      TEXT NOT NULL,
  total_events    INTEGER NOT NULL DEFAULT 0,
  hot_topics      TEXT,
  stale_topics    TEXT,
  anomaly_topics  TEXT,
  drift_tasks     TEXT,
  summary         TEXT,
  applied         INTEGER NOT NULL DEFAULT 0 CHECK (applied IN (0, 1)),
  created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- Review topic actions table
CREATE TABLE IF NOT EXISTS review_topic_actions (
  id               TEXT PRIMARY KEY,
  review_id        TEXT NOT NULL REFERENCES reviews(id),
  topic_id         TEXT NOT NULL REFERENCES topics(id),
  action_type      TEXT NOT NULL,
  old_importance   REAL,
  new_importance   REAL,
  reason           TEXT,
  applied          INTEGER NOT NULL DEFAULT 0 CHECK (applied IN (0, 1)),
  created_at       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_events_task_id ON events(task_id);
CREATE INDEX IF NOT EXISTS idx_events_topic_id ON events(topic_id);
CREATE INDEX IF NOT EXISTS idx_events_project_id ON events(project_id);
CREATE INDEX IF NOT EXISTS idx_events_event_type ON events(event_type);
CREATE INDEX IF NOT EXISTS idx_events_occurred_at ON events(occurred_at);
CREATE INDEX IF NOT EXISTS idx_events_actor ON events(actor);
CREATE INDEX IF NOT EXISTS idx_events_origin ON events(origin);
CREATE INDEX IF NOT EXISTS idx_topic_metrics_topic_id ON topic_metrics(topic_id);
CREATE INDEX IF NOT EXISTS idx_topic_metrics_as_of ON topic_metrics(as_of);
CREATE INDEX IF NOT EXISTS idx_task_metrics_task_id ON task_metrics(task_id);
CREATE INDEX IF NOT EXISTS idx_task_metrics_as_of ON task_metrics(as_of);
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_topics_project_id ON topics(project_id);
CREATE INDEX IF NOT EXISTS idx_review_topic_actions_review_id ON review_topic_actions(review_id);
CREATE INDEX IF NOT EXISTS idx_review_topic_actions_topic_id ON review_topic_actions(topic_id)
