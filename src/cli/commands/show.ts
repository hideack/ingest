import { Command } from 'commander';
import { getRecentEvents } from '../../core/eventService.js';
import { findTopicByName } from '../../core/topicService.js';
import { getDb } from '../../db/client.js';
import { TopicMetrics } from '../../types/metrics.js';
import { formatShowOutput } from '../../lib/formatting.js';

export function registerShow(program: Command): void {
  program
    .command('show <topic>')
    .description('Show detailed event history for a topic')
    .option('--limit <n>', 'Number of events to show', '50')
    .action(async (topicName: string, options) => {
      try {
        const topic = findTopicByName(topicName);
        if (!topic) {
          console.error(`Topic not found: ${topicName}`);
          process.exit(1);
        }

        const limit = parseInt(options.limit, 10);
        const events = getRecentEvents({ topicId: topic.id, limit });

        const db = getDb();
        const metrics = (db.prepare(
          `SELECT * FROM topic_metrics WHERE topic_id = ? ORDER BY calculated_at DESC LIMIT 1`
        ).get(topic.id) as TopicMetrics) ?? null;

        console.log(formatShowOutput(topic, events, metrics));
      } catch (err) {
        console.error('Error:', err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });
}
