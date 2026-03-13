import { updateTag } from '../../utils/orchestrator.js';

export async function editTagHandler(argv) {
  const { id, name, color, description } = argv;

  if (!name && !color && !description) {
    console.error('At least one of --name, --color, or --description is required');
    process.exit(1);
  }

  try {
    const data = {};
    if (name) data.name = name;
    if (color) data.color = color;
    if (description) data.description = description;

    const response = await updateTag(id, data);
    const tag = response.data;

    console.log(`Updated tag: ${tag.name} (${tag.id})`);
    console.log(`  Color: ${tag.color}`);
    if (tag.description) {
      console.log(`  Description: ${tag.description}`);
    }
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}
