import { Command } from 'commander';
import { findOrCreateTask } from '../../core/taskService.js';
import { findOrCreateProject } from '../../core/projectService.js';
import { findOrCreateTopic } from '../../core/topicService.js';
import { createEvent } from '../../core/eventService.js';

export function registerStart(program: Command): void {
  program
    .command('start')
    .description('Start a new task session')
    .option('--project <name>', 'Project name')
    .option('--task <title>', 'Task title')
    .option('--topic <name>', 'Topic name')
    .option('--summary <text>', 'Summary')
    .action(async (options) => {
      try {
        let projectId: string | undefined;
        if (options.project) {
          const project = findOrCreateProject(options.project);
          projectId = project.id;
          console.log(`Project: ${project.name} (${project.id})`);
        }

        let taskId: string | undefined;
        if (options.task) {
          const task = findOrCreateTask(options.task, projectId);
          taskId = task.id;
          console.log(`Task: ${task.title} (${task.id})`);
        }

        let topicId: string | undefined;
        if (options.topic) {
          const topic = findOrCreateTopic(options.topic, projectId);
          topicId = topic.id;
          console.log(`Topic: ${topic.name} (${topic.id})`);
        }

        const summary = options.summary ?? (options.task ? `Started task: ${options.task}` : 'Started work session');

        const event = createEvent({
          event_type: 'task_started',
          project_id: projectId,
          task_id: taskId,
          topic_id: topicId,
          actor: 'human',
          origin: 'manual',
          summary,
        });

        console.log(`\nEvent created: ${event.id}`);
        console.log(`Type: ${event.event_type}`);
        console.log(`Summary: ${event.summary}`);
        console.log(`Time: ${event.occurred_at}`);
      } catch (err) {
        console.error('Error:', err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });
}
