import { Command } from 'commander';
import { createEvent } from '../../core/eventService.js';
import { findOrCreateTopic } from '../../core/topicService.js';

export function registerDecision(program: Command): void {
  program
    .command('decision')
    .description('Record a decision made')
    .requiredOption('--summary <text>', 'Decision summary (required)')
    .option('--importance <number>', 'Importance score (1-10)', parseFloat)
    .option('--task <id>', 'Task ID')
    .option('--topic <name>', 'Topic name')
    .option('--details <text>', 'Additional details')
    .action(async (options) => {
      try {
        const topicId = options.topic ? findOrCreateTopic(options.topic).id : undefined;
        const event = createEvent({
          event_type: 'decision_made',
          task_id: options.task,
          topic_id: topicId,
          actor: 'human',
          origin: 'manual',
          summary: options.summary,
          details: options.details,
          importance: options.importance,
        });

        console.log(`Decision recorded: ${event.id}`);
        console.log(`Summary: ${event.summary}`);
        if (event.importance != null) {
          console.log(`Importance: ${event.importance}`);
        }
        console.log(`Time: ${event.occurred_at}`);
      } catch (err) {
        console.error('Error:', err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });
}
