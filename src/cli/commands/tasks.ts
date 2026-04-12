import { Command } from 'commander';
import { getAllTasksWithMetrics } from '../../core/taskService.js';
import { formatTasksOutput } from '../../lib/formatting.js';
import { TaskStatus } from '../../types/task.js';

export function registerTasks(program: Command): void {
  program
    .command('tasks')
    .description('List tasks with metrics summary')
    .option('--status <status>', 'Filter by status (active, paused, blocked, closed)')
    .action(async (options) => {
      try {
        const status = options.status as TaskStatus | undefined;
        const entries = getAllTasksWithMetrics(status);
        console.log(formatTasksOutput(entries));
      } catch (err) {
        console.error('Error:', err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });
}
