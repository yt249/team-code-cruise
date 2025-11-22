/**
 * Resolve the API base URL so services can run in browsers, Vite, or Jest.
 */
function getImportMetaEnv() {
  // Access import.meta.env lazily so CommonJS/Jest doesn't choke on the syntax
  try {
    return (0, eval)('import.meta.env');
  } catch {
    return undefined;
  }
}

export function getApiBaseUrl() {
  // Check for global config override (used in tests)
  if (
    typeof globalThis !== 'undefined' &&
    globalThis.__APP_CONFIG__?.apiBaseUrl
  ) {
    return globalThis.__APP_CONFIG__.apiBaseUrl;
  }

  // Fallback for Node.js/Jest environment
  if (typeof process !== 'undefined' && process.env?.VITE_API_BASE_URL) {
    return process.env.VITE_API_BASE_URL;
  }

  // Vite injects import.meta.env at build time for browser environments
  const importMetaEnv = getImportMetaEnv();
  if (importMetaEnv?.VITE_API_BASE_URL) {
    return importMetaEnv.VITE_API_BASE_URL;
  }

  // Production API URL (AWS API Gateway)
  return 'https://97lrpz7c1e.execute-api.us-east-2.amazonaws.com/prod';
}
