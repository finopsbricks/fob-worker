import { editEntityTags } from '../shared/edit-tags.js';
import { updateStation } from '../../utils/orchestrator.js';

export async function editStationHandler(argv) {
  const { id, shortCode, addTag, removeTag } = argv;

  const addTags = addTag ? [].concat(addTag) : [];
  const removeTags = removeTag ? [].concat(removeTag) : [];
  const hasTagChanges = addTags.length > 0 || removeTags.length > 0;

  if (!hasTagChanges && shortCode === undefined) {
    console.error('Usage: fob stations edit <id|short_code> --short-code P1 --add-tag <name> [--remove-tag <name>]');
    console.error('At least one of --short-code, --add-tag, or --remove-tag is required');
    process.exit(1);
  }

  console.log(`Station: ${id}`);

  try {
    if (shortCode !== undefined) {
      await updateStation(id, { short_code: shortCode || null });
      console.log(`Short code set: ${shortCode || '(cleared)'}`);
    }

    if (hasTagChanges) {
      // 'processes' is the API URL segment — kept until the orchestrator API renames it.
      await editEntityTags('processes', id, addTags, removeTags);
      console.log('Tags updated');
    }
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}
