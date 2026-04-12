import { Command } from 'commander';
import { findOrCreateTask } from '../../core/taskService.js';
import { findOrCreateProject } from '../../core/projectService.js';
import { findOrCreateTopic } from '../../core/topicService.js';
import { createEvent } from '../../core/eventService.js';

function defaultTaskTitle(summary?: string): string {
  if (summary) return summary;
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `Session ${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

export function registerStart(program: Command): void {
  program
    .command('start')
    .description('Start a new task session')
    .option('--project <name>', 'Project name')
    .option('--task <title>', 'Task title (auto-generated from --summary or timestamp if omitted)')
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

        // Always create/find a task so that subsequent events are linked
        const taskTitle = options.task ?? defaultTaskTitle(options.summary);
        const task = findOrCreateTask(taskTitle, projectId);
        const taskId = task.id;
        console.log(`Task: ${task.title} (${task.id})`);

        let topicId: string | undefined;
        if (options.topic) {
          const topic = findOrCreateTopic(options.topic, projectId);
          topicId = topic.id;
          console.log(`Topic: ${topic.name} (${topic.id})`);
        }

        const summary = options.summary ?? `Started task: ${taskTitle}`;

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
