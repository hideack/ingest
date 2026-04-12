import { mkdirSync } from 'fs';
import { join } from 'path';
import { initDb } from './client.js';

const worklogDir = join(process.env.HOME ?? '.', '.worklog');

// Create ~/.worklog/ directory if it doesn't exist
mkdirSync(worklogDir, { recursive: true });

// Initialize database (creates tables if they don't exist via IF NOT EXISTS)
initDb();

console.log('Database initialized successfully.');
console.log(`Database location: ${join(worklogDir, 'worklog.db')}`);
