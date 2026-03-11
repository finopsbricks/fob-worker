import { createTag } from '../../utils/orchestrator.js';

export async function createTagHandler(argv) {
  const { name, color, description } = argv;

  try {
    const data = { name };
    if (color) data.color = color;
    if (description) data.description = description;

    const response = await createTag(data);
    const tag = response.data;

    console.log(`Created tag: ${tag.name} (${tag.id})`);
    console.log(`  Color: ${tag.color}`);
    if (tag.description) {
      console.log(`  Description: ${tag.description}`);
    }
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}
