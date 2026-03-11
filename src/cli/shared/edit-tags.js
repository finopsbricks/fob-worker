import { getEntityTags, setEntityTags } from '../../utils/orchestrator.js';
import { ensureTag, resolveTagName } from '../../utils/tags.js';

/**
 * Process --add-tag and --remove-tag for an entity.
 * @param {string} entityType - URL segment: 'processes' | 'items' | 'work-records'
 * @param {string} entityId - Entity ID
 * @param {string[]} addTags - Tag names to add
 * @param {string[]} removeTags - Tag names to remove
 */
export async function editEntityTags(entityType, entityId, addTags, removeTags) {
  const response = await getEntityTags(entityType, entityId);
  const currentTags = response.data || [];
  let currentTagIds = currentTags.map(t => t.id);

  const changes = [];

  // Process additions
  for (const name of addTags) {
    const { id, created } = await ensureTag(name);
    if (!currentTagIds.includes(id)) {
      currentTagIds.push(id);
      changes.push(`  + ${name}${created ? ' (created)' : ''}`);
    } else {
      changes.push(`    ${name} (already present)`);
    }
  }

  // Process removals
  for (const name of removeTags) {
    const id = await resolveTagName(name);
    if (!id) {
      console.error(`  Warning: tag "${name}" not found, skipping removal`);
      continue;
    }
    if (currentTagIds.includes(id)) {
      currentTagIds = currentTagIds.filter(tid => tid !== id);
      changes.push(`  - ${name}`);
    } else {
      changes.push(`    ${name} (not present)`);
    }
  }

  // Apply the final set
  await setEntityTags(entityType, entityId, currentTagIds);

  for (const change of changes) {
    console.log(change);
  }
}
