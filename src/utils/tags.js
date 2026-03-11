/**
 * Tag name ↔ ID resolution helpers.
 * Used by CLI edit commands and process push.
 */

import { listTags, createTag } from './orchestrator.js';

/**
 * Resolve a tag name to its ID.
 * @param {string} name - Tag name
 * @returns {Promise<string|null>} Tag ID, or null if not found
 */
export async function resolveTagName(name) {
  const response = await listTags();
  const tags = response.data || [];
  const tag = tags.find(t => t.name === name);
  return tag ? tag.id : null;
}

/**
 * Resolve a tag name to its ID, creating the tag if it doesn't exist.
 * @param {string} name - Tag name
 * @returns {Promise<{ id: string, created: boolean }>}
 */
export async function ensureTag(name) {
  const response = await listTags();
  const tags = response.data || [];
  const existing = tags.find(t => t.name === name);

  if (existing) {
    return { id: existing.id, created: false };
  }

  const createResponse = await createTag({ name });
  return { id: createResponse.data.id, created: true };
}

/**
 * Batch-resolve tag names to IDs, auto-creating missing tags.
 * Fetches the full tag list once, then creates only the missing ones.
 * @param {string[]} names - Tag names
 * @returns {Promise<{ tagIds: string[], createdNames: string[] }>}
 */
export async function resolveTagNames(names) {
  if (!names || names.length === 0) {
    return { tagIds: [], createdNames: [] };
  }

  const response = await listTags();
  const tags = response.data || [];
  const tagMap = new Map(tags.map(t => [t.name, t.id]));

  const tagIds = [];
  const createdNames = [];

  for (const name of names) {
    if (tagMap.has(name)) {
      tagIds.push(tagMap.get(name));
    } else {
      const createResponse = await createTag({ name });
      tagIds.push(createResponse.data.id);
      createdNames.push(name);
    }
  }

  return { tagIds, createdNames };
}
