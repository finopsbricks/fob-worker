import path from 'path';
import { loadConfig } from '../../utils/config.js';
import { loadStepsWithFiles } from '../../utils/steps-loader.js';

export async function listStepsHandler() {
  const config = loadConfig();
  const { steps, files } = await loadStepsWithFiles(config.stepsPath);
  const slugs = Object.keys(steps);

  console.log(`Source: ${path.relative(process.cwd(), config.stepsPath)}`);
  console.log('');

  if (slugs.length === 0) {
    console.log('No steps found');
    return;
  }

  // Parse folder and file from paths
  const parsed = slugs.map(slug => {
    const filePath = files[slug] || '';
    const parts = filePath.replace(/^\.\//, '').split('/');
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
  for (const { slug, folder, file } of parsed.sort((a, b) => a.slug.localeCompare(b.slug))) {
    console.log(`${slug.padEnd(slugWidth)}  ${folder.padEnd(folderWidth)}  ${file}`);
  }

  console.log('');
  console.log(`Total: ${slugs.length} steps`);
}
