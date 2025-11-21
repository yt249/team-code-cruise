const DEFAULT_API_BASE =
  process.env.CLOUD_API_BASE_URL ||
  process.env.VITE_API_BASE_URL ||
  'https://97lrpz7c1e.execute-api.us-east-2.amazonaws.com/prod';

const DEFAULT_FRONTEND_BASE =
  process.env.CLOUD_FRONTEND_URL ||
  process.env.VITE_CLOUD_FRONTEND_URL ||
  'https://your-frontend-host.example.com';

const riderCredentials = {
  email: process.env.CLOUD_RIDER_EMAIL || 'rider@example.com',
  password: process.env.CLOUD_RIDER_PASSWORD || 'ride1234'
};

const isLocalApi = DEFAULT_API_BASE.includes('localhost');

const defaultRoute = isLocalApi
  ? {
      // Pittsburgh (matches seeded drivers in memory mode)
      pickup: { lat: 40.4443, lng: -79.9436 },
      dropoff: { lat: 40.4606, lng: -79.9759 }
    }
  : {
      // San Francisco defaults for cloud
      pickup: { lat: 37.7749, lng: -122.4194 },
      dropoff: { lat: 37.8044, lng: -122.2712 }
    };

const cloudTestConfig = {
  apiBaseUrl: DEFAULT_API_BASE,
  frontendBaseUrl: DEFAULT_FRONTEND_BASE,
  riderCredentials,
  defaultRoute,
  adPercent: Number(process.env.CLOUD_AD_PERCENT || 12)
};

process.env.VITE_API_BASE_URL = cloudTestConfig.apiBaseUrl;

if (typeof globalThis !== 'undefined') {
  globalThis.__APP_CONFIG__ = {
    ...(globalThis.__APP_CONFIG__ || {}),
    apiBaseUrl: cloudTestConfig.apiBaseUrl,
    frontendBaseUrl: cloudTestConfig.frontendBaseUrl
  };
}

module.exports = {
  cloudTestConfig
};
