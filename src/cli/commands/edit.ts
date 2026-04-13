import { Command } from 'commander';
import { getTask, findTaskByTitle, updateTask } from '../../core/taskService.js';
import { getTopic, findTopicByName, updateTopic } from '../../core/topicService.js';
import { createEvent } from '../../core/eventService.js';
import { TaskStatus } from '../../types/task.js';

const VALID_STATUSES: TaskStatus[] = ['active', 'paused', 'blocked', 'closed'];

export function registerEdit(program: Command): void {
  const edit = program
    .command('edit')
    .description('Edit a registered task or topic');

  // --- edit task ---
  edit
    .command('task <id-or-title>')
    .description('Edit a task (title, importance, status)')
    .option('--title <text>', 'New title')
    .option('--importance <number>', 'New importance (0–10)', parseFloat)
    .option('--status <status>', `New status (${VALID_STATUSES.join(' | ')})`)
    .action(async (idOrTitle: string, options) => {
      try {
        const task = getTask(idOrTitle) ?? findTaskByTitle(idOrTitle);
        if (!task) {
          console.error(`Task not found: ${idOrTitle}`);
          process.exit(1);
        }

        const fields: { title?: string; importance?: number; status?: TaskStatus } = {};

        if (options.title !== undefined) {
          fields.title = options.title;
        }

        if (options.importance !== undefined) {
          const imp = options.importance;
          if (isNaN(imp) || imp < 0 || imp > 10) {
            console.error('--importance must be a number between 0 and 10');
            process.exit(1);
          }
          fields.importance = imp;
        }

        if (options.status !== undefined) {
          if (!VALID_STATUSES.includes(options.status as TaskStatus)) {
            console.error(`--status must be one of: ${VALID_STATUSES.join(', ')}`);
            process.exit(1);
          }
          fields.status = options.status as TaskStatus;
        }

        if (Object.keys(fields).length === 0) {
          console.error('Nothing to update. Specify at least one of --title, --importance, --status.');
          process.exit(1);
        }

        updateTask(task.id, fields);

        // Record importance change as an auditable event
        if (fields.importance !== undefined) {
          createEvent({
            event_type: 'importance_reassessed',
            task_id: task.id,
            project_id: task.project_id ?? undefined,
            actor: 'human',
            origin: 'manual',
            summary: `Importance updated: ${task.importance} → ${fields.importance}`,
            importance: fields.importance,
          });
        }

        console.log(`Task updated: ${task.id}`);
        if (fields.title) console.log(`  title:      ${task.title} → ${fields.title}`);
        if (fields.importance !== undefined) console.log(`  importance: ${task.importance} → ${fields.importance}`);
        if (fields.status) console.log(`  status:     ${task.status} → ${fields.status}`);
      } catch (err) {
        console.error('Error:', err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });

  // --- edit topic ---
  edit
    .command('topic <id-or-name>')
    .description('Edit a topic (name, base_importance)')
    .option('--name <text>', 'New name')
    .option('--importance <number>', 'New base importance (0–10)', parseFloat)
    .action(async (idOrName: string, options) => {
      try {
        const topic = getTopic(idOrName) ?? findTopicByName(idOrName);
        if (!topic) {
          console.error(`Topic not found: ${idOrName}`);
          process.exit(1);
        }

        const fields: { name?: string; base_importance?: number } = {};

        if (options.name !== undefined) {
          fields.name = options.name;
        }

        if (options.importance !== undefined) {
          const imp = options.importance;
          if (isNaN(imp) || imp < 0 || imp > 10) {
            console.error('--importance must be a number between 0 and 10');
            process.exit(1);
          }
          fields.base_importance = imp;
        }

        if (Object.keys(fields).length === 0) {
          console.error('Nothing to update. Specify at least one of --name, --importance.');
          process.exit(1);
        }

        updateTopic(topic.id, fields);

        console.log(`Topic updated: ${topic.id}`);
        if (fields.name) console.log(`  name:            ${topic.name} → ${fields.name}`);
        if (fields.base_importance !== undefined) console.log(`  base_importance: ${topic.base_importance} → ${fields.base_importance}`);
      } catch (err) {
        console.error('Error:', err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });
}
