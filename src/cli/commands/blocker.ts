import { Command } from 'commander';
import { createEvent } from '../../core/eventService.js';
import { updateTaskStatus } from '../../core/taskService.js';
import { findOrCreateTopic } from '../../core/topicService.js';

export function registerBlocker(program: Command): void {
  program
    .command('blocker')
    .description('Record a blocker')
    .requiredOption('--summary <text>', 'Blocker summary (required)')
    .option('--task <id>', 'Task ID')
    .option('--topic <name>', 'Topic name')
    .option('--details <text>', 'Additional details')
    .option('--block-task', 'Update task status to blocked')
    .action(async (options) => {
      try {
        const topicId = options.topic ? findOrCreateTopic(options.topic).id : undefined;
        const event = createEvent({
          event_type: 'blocker_found',
          task_id: options.task,
          topic_id: topicId,
          actor: 'human',
          origin: 'manual',
          summary: options.summary,
          details: options.details,
        });

        console.log(`Blocker recorded: ${event.id}`);
        console.log(`Summary: ${event.summary}`);
        console.log(`Time: ${event.occurred_at}`);

        // Optionally update task status to blocked
        if (options.blockTask && options.task) {
          updateTaskStatus(options.task, 'blocked');
          console.log(`Task ${options.task} status updated to: blocked`);
        }
      } catch (err) {
        console.error('Error:', err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });
}
