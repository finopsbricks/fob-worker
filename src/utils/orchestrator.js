/**
 * Orchestrator API client
 *
 * Provides access to orchestrator endpoints for processes and work records.
 * Uses ORCHESTRATOR_API_KEY/SECRET for both v1 API and worker endpoints.
 */

/**
 * Get orchestrator URL and worker auth headers (for /api/worker/* endpoints)
 */
function getWorkerConfig() {
  const url = process.env.ORCHESTRATOR_URL;
  const apiKey = process.env.ORCHESTRATOR_API_KEY;
  const apiSecret = process.env.ORCHESTRATOR_API_SECRET;
  const stepPrefix = process.env.STEP_PREFIX;

  if (!apiKey || !apiSecret) {
    throw new Error('ORCHESTRATOR_API_KEY and ORCHESTRATOR_API_SECRET environment variables are required');
  }

  return {
    url,
    headers: {
      'api-key': apiKey,
      'api-secret': apiSecret,
      'X-Worker-Type': process.env.WORKER_TYPE || 'customer',
      'X-Step-Prefix': stepPrefix,
      'Content-Type': 'application/json',
    },
  };
}

/**
 * Get orchestrator URL and API key auth headers (for /api/v1/* endpoints)
 */
function getApiConfig() {
  const url = process.env.ORCHESTRATOR_URL;
  const apiKey = process.env.ORCHESTRATOR_API_KEY;
  const apiSecret = process.env.ORCHESTRATOR_API_SECRET;

  if (!apiKey || !apiSecret) {
    throw new Error('ORCHESTRATOR_API_KEY and ORCHESTRATOR_API_SECRET environment variables are required');
  }

  return {
    url,
    headers: {
      'api-key': apiKey,
      'api-secret': apiSecret,
      'Content-Type': 'application/json',
    },
  };
}

/**
 * Make API request to orchestrator (v1 endpoints)
 */
async function apiRequest(endpoint, options = {}) {
  const { url, headers } = getApiConfig();

  const response = await fetch(`${url}${endpoint}`, {
    ...options,
    headers: {
      ...headers,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Orchestrator API error (${response.status}): ${text}`);
  }

  return response.json();
}

/**
 * Check connection to orchestrator (worker endpoint)
 */
export async function checkConnection() {
  const { url, headers } = getWorkerConfig();

  try {
    const response = await fetch(`${url}/api/worker/poll`, {
      method: 'GET',
      headers,
    });

    return {
      connected: response.ok,
      status: response.status,
      url,
    };
  } catch (error) {
    return {
      connected: false,
      error: error.message,
      url,
    };
  }
}

/**
 * List processes
 */
export async function listProcesses(options = {}) {
  const params = new URLSearchParams();
  if (options.tag) params.set('tag', options.tag);
  const query = params.toString();
  return apiRequest(`/api/v1/processes${query ? `?${query}` : ''}`);
}

/**
 * Get process by ID
 */
export async function getProcess(id) {
  return apiRequest(`/api/v1/processes/${id}`);
}

/**
 * Create a new process
 * @param {object} data - Process definition (without id)
 * @returns {object} Created process (with id assigned by server)
 */
export async function createProcess(data) {
  return apiRequest('/api/v1/processes', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Update process by ID
 * @param {string} id - Process ID
 * @param {object} data - Process fields to update
 */
export async function updateProcess(id, data) {
  return apiRequest(`/api/v1/processes/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

/**
 * List work records
 */
export async function listWorkRecords(options = {}) {
  const params = new URLSearchParams();
  if (options.limit) params.set('limit', options.limit);
  if (options.status) params.set('status', options.status);
  if (options.process) params.set('process', options.process);
  if (options.tag) params.set('tag', options.tag);

  const query = params.toString();
  return apiRequest(`/api/v1/work-records${query ? `?${query}` : ''}`);
}

/**
 * Get work record by ID
 * @param {string} id - Work record ID
 * @param {object} [options]
 * @param {string[]} [options.include] - Optional fields to include: 'report', 'step_outputs', 'supporting_docs'
 */
export async function getWorkRecord(id, options = {}) {
  const params = new URLSearchParams();
  if (options.include && options.include.length > 0) {
    params.set('include', options.include.join(','));
  }
  const query = params.toString();
  return apiRequest(`/api/v1/work-records/${id}${query ? `?${query}` : ''}`);
}

/**
 * Get activity events for a work record
 * @param {string} id - Work record ID
 */
export async function getWorkRecordActivity(id) {
  return apiRequest(`/api/v1/work-records/${id}/activity`);
}

/**
 * Cancel a running or pending work record
 * @param {string} id - Work record ID
 */
export async function cancelWorkRecord(id) {
  return apiRequest(`/api/v1/work-records/${id}/cancel`, {
    method: 'POST',
  });
}

// ============================================================================
// Tags
// ============================================================================

/**
 * List all tags
 */
export async function listTags() {
  return apiRequest('/api/v1/tags');
}

/**
 * Create a tag
 * @param {object} data - { name, color?, description? }
 */
export async function createTag(data) {
  return apiRequest('/api/v1/tags', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Delete a tag by ID
 * @param {string} id - Tag ID
 */
export async function deleteTag(id) {
  const { url, headers } = getApiConfig();
  const response = await fetch(`${url}/api/v1/tags/${id}`, {
    method: 'DELETE',
    headers,
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Orchestrator API error (${response.status}): ${text}`);
  }
}

/**
 * Update an existing tag
 * @param {string} id - Tag ID
 * @param {Object} data - Fields to update (name, color, description)
 */
export async function updateTag(id, data) {
  return apiRequest(`/api/v1/tags/${id}`, { method: 'PUT', body: JSON.stringify(data) });
}

// ============================================================================
// Items
// ============================================================================

/**
 * List items
 */
export async function listItems(options = {}) {
  const params = new URLSearchParams();
  if (options.type) params.set('type', options.type);
  if (options.status) params.set('status', options.status);
  if (options.tag) params.set('tag', options.tag);
  if (options.limit) params.set('limit', options.limit);
  const query = params.toString();
  return apiRequest(`/api/v1/items${query ? `?${query}` : ''}`);
}

/**
 * Get item by ID
 */
export async function getItem(id) {
  return apiRequest(`/api/v1/items/${id}`);
}

// ============================================================================
// Process Execution
// ============================================================================

/**
 * Trigger a process run
 * @param {string} processId - Process ID or short_code
 * @param {string} [itemId] - Item ID (required if process has applies_to)
 */
export async function runProcess(processId, itemId) {
  const body = {};
  if (itemId) body.item_id = itemId;
  return apiRequest(`/api/v1/processes/${processId}/run`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

// ============================================================================
// Cross-Entity (ItemProcesses join)
// ============================================================================

/**
 * Get items linked to a process
 */
export async function getProcessItems(processId) {
  return apiRequest(`/api/v1/processes/${processId}/items`);
}

/**
 * Get processes linked to an item
 */
export async function getItemProcesses(itemId) {
  return apiRequest(`/api/v1/items/${itemId}/processes`);
}

// ============================================================================
// Supporting Documents
// ============================================================================

/**
 * Get a supporting document by ID (metadata + content for markdown)
 */
export async function getSupportingDoc(id) {
  return apiRequest(`/api/v1/supporting-docs/${id}`);
}

/**
 * Download a supporting document's binary content to a file
 * @param {string} id - Document ID
 * @param {string} filePath - Local path to save the file
 */
export async function downloadSupportingDoc(id, filePath) {
  const { url, headers } = getApiConfig();
  const response = await fetch(`${url}/api/v1/supporting-docs/${id}/download`, { headers });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Orchestrator API error (${response.status}): ${text}`);
  }

  const { writeFile } = await import('fs/promises');
  const buffer = Buffer.from(await response.arrayBuffer());
  await writeFile(filePath, buffer);
  return filePath;
}

// ============================================================================
// Entity Tags
// ============================================================================

/**
 * Get tags for an entity
 * @param {string} entityType - URL segment: 'processes' | 'items' | 'work-records'
 * @param {string} entityId - Entity ID
 */
export async function getEntityTags(entityType, entityId) {
  return apiRequest(`/api/v1/${entityType}/${entityId}/tags`);
}

/**
 * Set tags on an entity (full replace)
 * @param {string} entityType - URL segment: 'processes' | 'items' | 'work-records'
 * @param {string} entityId - Entity ID
 * @param {string[]} tagIds - Array of tag IDs
 */
export async function setEntityTags(entityType, entityId, tagIds) {
  return apiRequest(`/api/v1/${entityType}/${entityId}/tags`, {
    method: 'PUT',
    body: JSON.stringify({ tags: tagIds }),
  });
}

