import { Command } from 'commander';
import { createEvent } from '../../core/eventService.js';

export function registerIngestArtifactUpdated(program: Command): void {
  const ingest = program.commands.find(c => c.name() === 'ingest') ?? program.command('ingest').description('Ingest events from external sources');

  ingest
    .command('artifact-updated')
    .description('Record an artifact update event')
    .requiredOption('--summary <text>', 'Summary of the artifact update (required)')
    .option('--file <path>', 'Path to the updated file/artifact')
    .option('--task <id>', 'Associated task ID')
    .option('--topic <id>', 'Associated topic ID')
    .option('--project <id>', 'Associated project ID')
    .option('--occurred-at <datetime>', 'Update time (ISO 8601)')
    .action(async (options) => {
      try {
        const event = createEvent({
          event_type: 'artifact_updated',
          task_id: options.task,
          topic_id: options.topic,
          project_id: options.project,
          actor: 'system',
          origin: 'watcher',
          summary: options.summary,
          details: options.file ? `File: ${options.file}` : undefined,
          source_type: 'file',
          source_ref: options.file,
          occurred_at: options.occurredAt,
        });

        console.log(`Artifact update recorded: ${event.id}`);
        console.log(`Summary: ${event.summary}`);
        if (options.file) {
          console.log(`File: ${options.file}`);
        }
        console.log(`Time: ${event.occurred_at}`);
      } catch (err) {
        console.error('Error:', err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });
}
