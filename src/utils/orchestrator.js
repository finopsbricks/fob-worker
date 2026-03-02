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
  console.log(headers);

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
    console.log("\n\n\nerror");
    console.log(error);
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
export async function listProcesses() {
  return apiRequest('/api/v1/processes');
}

/**
 * Get process by ID
 */
export async function getProcess(id) {
  return apiRequest(`/api/v1/processes/${id}`);
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

  const query = params.toString();
  return apiRequest(`/api/v1/work-records${query ? `?${query}` : ''}`);
}

/**
 * Get work record by ID
 */
export async function getWorkRecord(id) {
  return apiRequest(`/api/v1/work-records/${id}`);
}

/**
 * Get orchestrator config for display
 */
export function getOrchestratorConfig() {
  return {
    url: process.env.ORCHESTRATOR_URL,
    step_prefix: process.env.STEP_PREFIX,
    hasApiKey: !!process.env.ORCHESTRATOR_API_KEY && !!process.env.ORCHESTRATOR_API_SECRET,
  };
}
