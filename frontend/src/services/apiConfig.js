/**
 * Resolve the API base URL so services can run in browsers, Vite, or Jest.
 */
export function getApiBaseUrl() {
  if (typeof globalThis !== 'undefined' && globalThis.__APP_CONFIG__?.apiBaseUrl) {
    return globalThis.__APP_CONFIG__.apiBaseUrl;
  }

  const viteMeta = (() => {
    try {
      return eval('import.meta');
    } catch {
      return undefined;
    }
  })();

  if (viteMeta?.env?.VITE_API_BASE_URL) {
    return viteMeta.env.VITE_API_BASE_URL;
  }

  const globalProcess = typeof globalThis !== 'undefined' ? globalThis.process : undefined;
  if (globalProcess?.env?.VITE_API_BASE_URL) {
    return globalProcess.env.VITE_API_BASE_URL;
  }

  return 'http://localhost:3000';
}
