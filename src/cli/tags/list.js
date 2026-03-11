import { listTags } from '../../utils/orchestrator.js';

export async function listTagsHandler() {
  try {
    const response = await listTags();
    const tags = response.data || [];

    if (tags.length === 0) {
      console.log('No tags found');
      return;
    }

    const idWidth = Math.max(2, ...tags.map(t => t.id.length));
    const nameWidth = Math.max(4, ...tags.map(t => t.name.length));
    const colorWidth = 7;

    const header = `${'ID'.padEnd(idWidth)}  ${'NAME'.padEnd(nameWidth)}  ${'COLOR'.padEnd(colorWidth)}  USAGE`;
    console.log(header);
    console.log('-'.repeat(header.length + 5));

    for (const tag of tags) {
      const id = tag.id.padEnd(idWidth);
      const name = tag.name.padEnd(nameWidth);
      const color = (tag.color || '-').padEnd(colorWidth);
      const usage = tag.usage ? tag.usage.total : 0;
      console.log(`${id}  ${name}  ${color}  ${usage}`);
    }

    console.log('');
    console.log(`Total: ${tags.length} tags`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}
