import { Command } from 'commander';
import { getAllTopicsWithMetrics } from '../../core/topicService.js';
import { formatTopicsOutput } from '../../lib/formatting.js';

export function registerTopics(program: Command): void {
  program
    .command('topics')
    .description('List all topics with metrics summary')
    .action(async () => {
      try {
        const entries = getAllTopicsWithMetrics();
        console.log(formatTopicsOutput(entries));
      } catch (err) {
        console.error('Error:', err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });
}
