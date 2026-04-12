import { Command } from 'commander';
import { createEvent } from '../../core/eventService.js';
import { updateTaskStatus, getTask } from '../../core/taskService.js';

export function registerClose(program: Command): void {
  program
    .command('close')
    .description('Close a task')
    .option('--task <id>', 'Task ID to close')
    .option('--summary <text>', 'Closing summary')
    .action(async (options) => {
      try {
        let taskId = options.task;

        // If no task specified, we still create the event
        const summary = options.summary ?? (taskId ? `Closed task` : 'Closed work session');

        if (taskId) {
          const task = getTask(taskId);
          if (!task) {
            console.error(`Task not found: ${taskId}`);
            process.exit(1);
          }

          const event = createEvent({
            event_type: 'task_closed',
            task_id: taskId,
            project_id: task.project_id ?? undefined,
            actor: 'human',
            origin: 'manual',
            summary,
          });

          updateTaskStatus(taskId, 'closed');

          console.log(`Task closed: ${event.id}`);
          console.log(`Task: ${task.title}`);
          console.log(`Summary: ${event.summary}`);
          console.log(`Time: ${event.occurred_at}`);
        } else {
          const event = createEvent({
            event_type: 'task_closed',
            actor: 'human',
            origin: 'manual',
            summary,
          });

          console.log(`Session closed: ${event.id}`);
          console.log(`Summary: ${event.summary}`);
          console.log(`Time: ${event.occurred_at}`);
        }
      } catch (err) {
        console.error('Error:', err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });
}
