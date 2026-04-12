import { Command } from 'commander';
import { generateWeeklyReview } from '../../core/reviewService.js';
import { formatReviewOutput } from '../../lib/formatting.js';

export function registerReviewWeekly(program: Command): void {
  const review = program.command('review').description('Review commands');

  review
    .command('weekly')
    .description('Generate a weekly review')
    .option('--start <date>', 'Period start date (ISO 8601)')
    .option('--end <date>', 'Period end date (ISO 8601)')
    .option('--apply', 'Apply suggested changes', false)
    .action(async (options) => {
      try {
        const { data } = generateWeeklyReview({
          start: options.start,
          end: options.end,
          apply: options.apply,
        });

        const output = formatReviewOutput(data);
        console.log(output);

        if (options.apply) {
          console.log('\nChanges applied.');
        } else {
          console.log('\n(Use --apply to apply suggested changes)');
        }
      } catch (err) {
        console.error('Error:', err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });
}
