import { Command } from 'commander';
import { getEventById, getRecentEvents, createEvent } from '../../core/eventService.js';
import { findOrCreateTask } from '../../core/taskService.js';
import { findOrCreateTopic } from '../../core/topicService.js';
import { findOrCreateProject } from '../../core/projectService.js';
import { formatNextActionsOutput } from '../../lib/formatting.js';

export function registerPromote(program: Command): void {
  program
    .command('promote')
    .description('Promote a next action to a task (list next actions if --next is omitted)')
    .option('--next <event-id>', 'Next action event ID to promote')
    .option('--title <text>', 'Task title (defaults to next action summary)')
    .option('--topic <name>', 'Topic name')
    .option('--project <name>', 'Project name')
    .action(async (options) => {
      try {
        // No --next: list recent next actions
        if (!options.next) {
          const events = getRecentEvents({
            eventTypes: ['next_action_defined'],
            limit: 20,
          });
          console.log(formatNextActionsOutput(events));
          return;
        }

        // Find the target event
        const event = getEventById(options.next);
        if (!event) {
          console.error(`Event not found: ${options.next}`);
          process.exit(1);
        }
        if (event.event_type !== 'next_action_defined') {
          console.error(`Event ${options.next} is not a next_action_defined event (got: ${event.event_type})`);
          process.exit(1);
        }

        // Resolve project / topic
        let projectId: string | undefined;
        if (options.project) {
          const project = findOrCreateProject(options.project);
          projectId = project.id;
        }

        let topicId: string | undefined;
        if (options.topic) {
          topicId = findOrCreateTopic(options.topic, projectId).id;
        } else if (event.topic_id) {
          // Inherit topic from the original next_action event
          topicId = event.topic_id;
        }

        // Create the task
        const taskTitle = options.title ?? event.summary;
        const task = findOrCreateTask(taskTitle, projectId);

        // Record task_started event linked to the new task
        const startEvent = createEvent({
          event_type: 'task_started',
          task_id: task.id,
          topic_id: topicId,
          project_id: projectId,
          actor: 'human',
          origin: 'manual',
          summary: `Promoted from next action: ${event.summary}`,
        });

        console.log(`Task created: ${task.id}`);
        console.log(`Title  : ${task.title}`);
        console.log(`Event  : ${startEvent.id}`);
        console.log(`Source : next_action ${event.id} (${event.occurred_at})`);
        if (topicId) console.log(`Topic  : ${topicId}`);
      } catch (err) {
        console.error('Error:', err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });
}
