import { Command } from 'commander';
import { createEvent } from '../../core/eventService.js';
import { updateTaskStatus, getTask, getActiveTasks } from '../../core/taskService.js';

export function registerClose(program: Command): void {
  program
    .command('close')
    .description('Close a task (closes the most recently active task if --task is omitted)')
    .option('--task <id>', 'Task ID to close')
    .option('--summary <text>', 'Closing summary')
    .action(async (options) => {
      try {
        let taskId: string | undefined = options.task;

        // If no task ID specified, fall back to the most recently active task
        if (!taskId) {
          const activeTasks = getActiveTasks();
          if (activeTasks.length === 0) {
            console.error('No active tasks found. Nothing to close.');
            process.exit(1);
          }
          taskId = activeTasks[0].id;
        }

        const task = getTask(taskId);
        if (!task) {
          console.error(`Task not found: ${taskId}`);
          process.exit(1);
        }

        const summary = options.summary ?? `Closed task: ${task.title}`;

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
      } catch (err) {
        console.error('Error:', err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });
}
