import { editEntityTags } from '../shared/edit-tags.js';

export async function editItemHandler(argv) {
  const { id, addTag, removeTag } = argv;

  const addTags = addTag ? [].concat(addTag) : [];
  const removeTags = removeTag ? [].concat(removeTag) : [];

  if (addTags.length === 0 && removeTags.length === 0) {
    console.error('Usage: fob items edit <id> --add-tag <name> [--remove-tag <name>]');
    console.error('At least one --add-tag or --remove-tag is required');
    process.exit(1);
  }

  console.log(`Item: ${id}`);

  try {
    await editEntityTags('items', id, addTags, removeTags);
    console.log('');
    console.log('Tags updated');
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}
