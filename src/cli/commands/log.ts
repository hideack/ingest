import { Command } from 'commander';
import { getRecentEvents } from '../../core/eventService.js';
import { findTopicByName } from '../../core/topicService.js';
import { formatLogOutput } from '../../lib/formatting.js';

export function registerLog(program: Command): void {
  program
    .command('log')
    .description('Show recent events in chronological order')
    .option('--limit <n>', 'Number of events to show', '20')
    .option('--type <event_type>', 'Filter by event type (e.g. decision_made, blocker_found)')
    .option('--topic <name>', 'Filter by topic name')
    .action(async (options) => {
      try {
        const limit = parseInt(options.limit, 10);

        let topicId: string | undefined;
        if (options.topic) {
          const topic = findTopicByName(options.topic);
          if (!topic) {
            console.error(`Topic not found: ${options.topic}`);
            process.exit(1);
          }
          topicId = topic.id;
        }

        const events = getRecentEvents({
          topicId,
          limit,
          eventTypes: options.type ? [options.type] : undefined,
        });

        console.log(formatLogOutput(events));
      } catch (err) {
        console.error('Error:', err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });
}
