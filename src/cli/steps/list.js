import path from 'path';
import { loadConfig } from '../../utils/config.js';
import { loadSteps } from '../../utils/steps-loader.js';

export async function listStepsHandler() {
  const config = loadConfig();
  const steps = await loadSteps(config.stepsDir);
  const slugs = Object.keys(steps);

  console.log(`Source: ${path.relative(process.cwd(), config.stepsDir)}/`);
  console.log('');

  if (slugs.length === 0) {
    console.log('No steps found');
    return;
  }

  // Parse folder and file from _file path set by discoverSteps
  const parsed = slugs.map(slug => {
    const filePath = steps[slug]._file || '';
    const parts = filePath.split('/');
    const file = parts.pop() || '-';
    const folder = parts.join('/') || '-';
    return { slug, folder, file };
  });

  // Calculate column widths
  const slugWidth = Math.max(4, ...parsed.map(p => p.slug.length));
  const folderWidth = Math.max(6, ...parsed.map(p => p.folder.length));

  // Header
  console.log(`${'SLUG'.padEnd(slugWidth)}  ${'FOLDER'.padEnd(folderWidth)}  FILE`);
  console.log('-'.repeat(slugWidth + folderWidth + 30));

  // Rows (sorted)
  for (const { slug, folder, file } of parsed.sort((a, b) => a.folder.localeCompare(b.folder) || a.file.localeCompare(b.file))) {
    console.log(`${slug.padEnd(slugWidth)}  ${folder.padEnd(folderWidth)}  ${file}`);
  }

  console.log('');
  console.log(`Total: ${slugs.length} steps`);
}
