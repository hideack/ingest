import { Command } from 'commander';
import { createEvent } from '../../core/eventService.js';
import { findOrCreateTopic } from '../../core/topicService.js';

export function registerNote(program: Command): void {
  program
    .command('note')
    .description('Add a note')
    .requiredOption('--summary <text>', 'Note summary (required)')
    .option('--task <id>', 'Task ID')
    .option('--topic <name>', 'Topic name')
    .option('--details <text>', 'Additional details')
    .option('--personal', 'Mark as a personal note (e.g. from a walk, reading, etc.)')
    .action(async (options) => {
      try {
        const topicId = options.topic ? findOrCreateTopic(options.topic).id : undefined;
        const origin = options.personal ? 'personal' : 'manual';
        const event = createEvent({
          event_type: 'note_added',
          task_id: options.task,
          topic_id: topicId,
          actor: 'human',
          origin,
          summary: options.summary,
          details: options.details,
        });

        console.log(`Note added: ${event.id}`);
        console.log(`Summary: ${event.summary}`);
        console.log(`Time: ${event.occurred_at}`);
      } catch (err) {
        console.error('Error:', err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });
}
