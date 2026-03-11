import { deleteTag } from '../../utils/orchestrator.js';

export async function deleteTagHandler(argv) {
  const { id } = argv;

  try {
    await deleteTag(id);
    console.log(`Deleted tag: ${id}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}
