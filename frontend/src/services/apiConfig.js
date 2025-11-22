/**
 * Resolve the API base URL so services can run in browsers, Vite, or Jest.
 */
export function getApiBaseUrl() {
  // Check for global config override (used in tests)
  if (typeof globalThis !== 'undefined' && globalThis.__APP_CONFIG__?.apiBaseUrl) {
    return globalThis.__APP_CONFIG__.apiBaseUrl;
  }

  // Vite injects import.meta.env at build time
  // This works in browser with Vite
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }

  // Fallback for Node.js/Jest environment
  if (typeof process !== 'undefined' && process.env?.VITE_API_BASE_URL) {
    return process.env.VITE_API_BASE_URL;
  }

  // Default fallback
  return 'http://localhost:3000';
}
