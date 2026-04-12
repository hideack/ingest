import { Command } from 'commander';
import { createEvent } from '../../core/eventService.js';
import { findOrCreateTopic } from '../../core/topicService.js';

export function registerIngestGitCommit(program: Command): void {
  const ingest = program.commands.find(c => c.name() === 'ingest') ?? program.command('ingest').description('Ingest events from external sources');

  ingest
    .command('git-commit')
    .description('Ingest a git commit as an event')
    .requiredOption('--hash <hash>', 'Git commit hash (required)')
    .requiredOption('--message <text>', 'Commit message (required)')
    .option('--files <files>', 'Comma-separated list of changed files')
    .option('--task <id>', 'Associated task ID')
    .option('--topic <name>', 'Associated topic name')
    .option('--project <id>', 'Associated project ID')
    .option('--occurred-at <datetime>', 'Commit time (ISO 8601)')
    .action(async (options) => {
      try {
        const topicId = options.topic ? findOrCreateTopic(options.topic).id : undefined;
        const details = options.files ? `Changed files: ${options.files}` : undefined;

        const event = createEvent({
          event_type: 'git_commit',
          task_id: options.task,
          topic_id: topicId,
          project_id: options.project,
          actor: 'system',
          origin: 'git',
          summary: options.message,
          details,
          source_type: 'git',
          source_ref: options.hash,
          occurred_at: options.occurredAt,
        });

        console.log(`Git commit recorded: ${event.id}`);
        console.log(`Hash: ${event.source_ref}`);
        console.log(`Message: ${event.summary}`);
        console.log(`Time: ${event.occurred_at}`);
      } catch (err) {
        console.error('Error:', err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });
}
