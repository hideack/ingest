import { Command } from 'commander';
import { createEvent } from '../../core/eventService.js';

export function registerIngestCalendarEnd(program: Command): void {
  const ingest = program.commands.find(c => c.name() === 'ingest') ?? program.command('ingest').description('Ingest events from external sources');

  ingest
    .command('calendar-end')
    .description('Ingest a calendar event end')
    .requiredOption('--summary <text>', 'Calendar event title/summary (required)')
    .option('--occurred-at <datetime>', 'Event end time (ISO 8601)')
    .option('--task <id>', 'Associated task ID')
    .option('--topic <id>', 'Associated topic ID')
    .option('--project <id>', 'Associated project ID')
    .option('--source-ref <ref>', 'Calendar event ID or reference')
    .action(async (options) => {
      try {
        const event = createEvent({
          event_type: 'calendar_event_ended',
          task_id: options.task,
          topic_id: options.topic,
          project_id: options.project,
          actor: 'ai',
          origin: 'gcal',
          summary: options.summary,
          scheduled: 1,
          source_type: 'gcal',
          source_ref: options.sourceRef,
          occurred_at: options.occurredAt,
        });

        console.log(`Calendar event end recorded: ${event.id}`);
        console.log(`Summary: ${event.summary}`);
        console.log(`Time: ${event.occurred_at}`);
      } catch (err) {
        console.error('Error:', err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });
}
