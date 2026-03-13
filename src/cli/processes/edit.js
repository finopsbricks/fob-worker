import { editEntityTags } from '../shared/edit-tags.js';
import { updateProcess } from '../../utils/orchestrator.js';

export async function editProcessHandler(argv) {
  const { id, shortCode, addTag, removeTag } = argv;

  const addTags = addTag ? [].concat(addTag) : [];
  const removeTags = removeTag ? [].concat(removeTag) : [];
  const hasTagChanges = addTags.length > 0 || removeTags.length > 0;

  if (!hasTagChanges && shortCode === undefined) {
    console.error('Usage: fob processes edit <id|short_code> --short-code P1 --add-tag <name> [--remove-tag <name>]');
    console.error('At least one of --short-code, --add-tag, or --remove-tag is required');
    process.exit(1);
  }

  console.log(`Process: ${id}`);

  try {
    if (shortCode !== undefined) {
      await updateProcess(id, { short_code: shortCode || null });
      console.log(`Short code set: ${shortCode || '(cleared)'}`);
    }

    if (hasTagChanges) {
      await editEntityTags('processes', id, addTags, removeTags);
      console.log('Tags updated');
    }
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}
