import { Command } from 'commander';
import { createEvent } from '../../core/eventService.js';

export function registerNext(program: Command): void {
  program
    .command('next')
    .description('Define the next action')
    .requiredOption('--summary <text>', 'Next action summary (required)')
    .option('--task <id>', 'Task ID')
    .option('--topic <id>', 'Topic ID')
    .option('--details <text>', 'Additional details')
    .action(async (options) => {
      try {
        const event = createEvent({
          event_type: 'next_action_defined',
          task_id: options.task,
          topic_id: options.topic,
          actor: 'human',
          origin: 'manual',
          summary: options.summary,
          details: options.details,
        });

        console.log(`Next action defined: ${event.id}`);
        console.log(`Summary: ${event.summary}`);
        console.log(`Time: ${event.occurred_at}`);
      } catch (err) {
        console.error('Error:', err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });
}
