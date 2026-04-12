import { Command } from 'commander';
import { createEvent } from '../../core/eventService.js';
import { buildResumeContext } from '../../core/resumeService.js';
import { formatResumeOutput } from '../../lib/formatting.js';

export function registerResume(program: Command): void {
  program
    .command('resume')
    .description('Resume a task and show context')
    .option('--task <id>', 'Task ID to resume')
    .option('--summary <text>', 'Summary for the resume event')
    .action(async (options) => {
      try {
        const context = buildResumeContext(options.task);

        // Create task_resumed event
        const summary = options.summary ?? `Resumed task: ${context.task.title}`;
        createEvent({
          event_type: 'task_resumed',
          task_id: context.task.id,
          project_id: context.task.project_id ?? undefined,
          actor: 'human',
          origin: 'manual',
          summary,
        });

        const output = formatResumeOutput({
          task: context.task,
          lastEventAt: context.lastEventAt,
          recentEvents: context.recentEvents,
          openBlockers: context.openBlockers,
          recentDecisions: context.recentDecisions,
          nextActions: context.nextActions,
          hotTopics: context.hotTopics,
          staleImportantTopics: context.staleImportantTopics,
          personalInsights: context.personalInsights,
        });

        console.log(output);
      } catch (err) {
        console.error('Error:', err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });
}
