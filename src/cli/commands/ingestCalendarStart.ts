import { Command } from 'commander';
import { createEvent } from '../../core/eventService.js';
import { findOrCreateTopic } from '../../core/topicService.js';

export function registerIngestCalendarStart(program: Command): void {
  const ingest = program.commands.find(c => c.name() === 'ingest') ?? program.command('ingest').description('Ingest events from external sources');

  ingest
    .command('calendar-start')
    .description('Ingest a calendar event start')
    .requiredOption('--summary <text>', 'Calendar event title/summary (required)')
    .option('--occurred-at <datetime>', 'Event start time (ISO 8601)')
    .option('--task <id>', 'Associated task ID')
    .option('--topic <name>', 'Associated topic name')
    .option('--project <id>', 'Associated project ID')
    .option('--source-ref <ref>', 'Calendar event ID or reference')
    .action(async (options) => {
      try {
        const topicId = options.topic ? findOrCreateTopic(options.topic).id : undefined;
        const event = createEvent({
          event_type: 'calendar_event_started',
          task_id: options.task,
          topic_id: topicId,
          project_id: options.project,
          actor: 'ai',
          origin: 'gcal',
          summary: options.summary,
          scheduled: 1,
          source_type: 'gcal',
          source_ref: options.sourceRef,
          occurred_at: options.occurredAt,
        });

        console.log(`Calendar event start recorded: ${event.id}`);
        console.log(`Summary: ${event.summary}`);
        console.log(`Time: ${event.occurred_at}`);
      } catch (err) {
        console.error('Error:', err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });
}
