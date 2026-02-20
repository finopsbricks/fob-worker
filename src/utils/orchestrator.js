/**
 * Orchestrator API client
 *
 * Provides access to orchestrator endpoints for processes and work records.
 * Uses ORCHESTRATOR_API_KEY/SECRET for v1 API, WORKER_SECRET for worker endpoints.
 */

import { loadConfig } from './config.js';

/**
 * Get orchestrator URL and worker auth headers (for /api/worker/* endpoints)
 */
function getWorkerConfig() {
  const config = loadConfig();

  const url = config.orchestrator.url;
  const org = config.orchestrator.org;
  const secret = process.env.WORKER_SECRET;

  if (!secret) {
    throw new Error('WORKER_SECRET environment variable is required');
  }

  return {
    url,
    headers: {
      Authorization: `Bearer ${secret}`,
      'X-Worker-Org': org,
      'Content-Type': 'application/json',
    },
  };
}

/**
 * Get orchestrator URL and API key auth headers (for /api/v1/* endpoints)
 */
function getApiConfig() {
  const config = loadConfig();

  const url = config.orchestrator.url;
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
  const config = loadConfig();
  return {
    url: config.orchestrator.url,
    org: config.orchestrator.org,
    hasSecret: !!process.env.WORKER_SECRET,
    hasApiKey: !!process.env.ORCHESTRATOR_API_KEY && !!process.env.ORCHESTRATOR_API_SECRET,
  };
}
