#!/usr/bin/env node
import { Command } from 'commander';
import { mkdirSync } from 'fs';
import { join } from 'path';
import { initDb } from '../db/client.js';
import { registerStart } from './commands/start.js';
import { registerResume } from './commands/resume.js';
import { registerDecision } from './commands/decision.js';
import { registerNote } from './commands/note.js';
import { registerBlocker } from './commands/blocker.js';
import { registerNext } from './commands/next.js';
import { registerClose } from './commands/close.js';
import { registerReviewWeekly } from './commands/reviewWeekly.js';
import { registerIngestCalendarStart } from './commands/ingestCalendarStart.js';
import { registerIngestCalendarEnd } from './commands/ingestCalendarEnd.js';
import { registerIngestGitCommit } from './commands/ingestGitCommit.js';
import { registerIngestArtifactUpdated } from './commands/ingestArtifactUpdated.js';
import { registerSkill } from './commands/skill.js';
import { registerLog } from './commands/log.js';
import { registerTopics } from './commands/topics.js';
import { registerTasks } from './commands/tasks.js';
import { registerShow } from './commands/show.js';
import { registerPromote } from './commands/promote.js';
import { registerEdit } from './commands/edit.js';

// Ensure ~/.worklog directory and DB exist on startup
const worklogDir = join(process.env.HOME ?? '.', '.worklog');
mkdirSync(worklogDir, { recursive: true });
initDb();

const program = new Command();

program
  .name('ingest')
  .description('CLI tool for logging work events and generating summaries')
  .version('0.1.0');

registerStart(program);
registerResume(program);
registerDecision(program);
registerNote(program);
registerBlocker(program);
registerNext(program);
registerClose(program);
registerReviewWeekly(program);
registerIngestCalendarStart(program);
registerIngestCalendarEnd(program);
registerIngestGitCommit(program);
registerIngestArtifactUpdated(program);
registerSkill(program);
registerLog(program);
registerTopics(program);
registerTasks(program);
registerShow(program);
registerPromote(program);
registerEdit(program);

program.parse();
