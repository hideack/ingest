import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

let db: Database.Database | null = null;

export function getDb(dbPath?: string): Database.Database {
  if (!db) {
    const path = dbPath ?? process.env.WORKLOG_DB_PATH ?? join(process.env.HOME ?? '.', '.worklog', 'worklog.db');
    db = new Database(path);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
  }
  return db;
}

export function closeDb(): void {
  db?.close();
  db = null;
}

export function initDb(dbPath?: string): void {
  const database = getDb(dbPath);
  const schemaPath = join(__dirname, 'schema.sql');
  const schema = readFileSync(schemaPath, 'utf-8');
  // Execute each statement
  const statements = schema.split(';').filter(s => s.trim().length > 0);
  for (const stmt of statements) {
    database.exec(stmt + ';');
  }
}
