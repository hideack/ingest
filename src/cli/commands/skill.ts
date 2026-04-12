import { Command } from 'commander';
import { mkdirSync, copyFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export function registerSkill(program: Command): void {
  program
    .command('skill')
    .description('Install ingest skill into Claude Code (~/.claude/skills/ingest/)')
    .option('--force', 'Overwrite existing skill if already installed')
    .action((options: { force?: boolean }) => {
      const targetDir = join(process.env.HOME ?? '.', '.claude', 'skills', 'ingest');
      const targetFile = join(targetDir, 'SKILL.md');

      if (existsSync(targetFile) && !options.force) {
        console.error(`Skill already installed at: ${targetFile}`);
        console.error('Use --force to overwrite.');
        process.exit(1);
      }

      // skills/worklog/SKILL.md のパスをバイナリ位置から解決する
      // dist/cli/commands/skill.js → ../../.. → プロジェクトルート
      const projectRoot = join(__dirname, '..', '..', '..');
      const sourceFile = join(projectRoot, 'skills', 'worklog', 'SKILL.md');

      if (!existsSync(sourceFile)) {
        console.error(`Source SKILL.md not found: ${sourceFile}`);
        process.exit(1);
      }

      mkdirSync(targetDir, { recursive: true });
      copyFileSync(sourceFile, targetFile);

      console.log(`Skill installed: ${targetFile}`);
      console.log('Reload Claude Code to activate the ingest skill.');
    });
}
