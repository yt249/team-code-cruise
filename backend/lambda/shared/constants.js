// Pittsburgh area driver locations (drivers don't have location in DB)
const DRIVER_LOCATIONS = {
  'd1000000-0000-0000-0000-000000000001': { lat: 40.4406, lon: -79.9959 }, // Downtown Pittsburgh
  'd1000000-0000-0000-0000-000000000002': { lat: 40.4443, lon: -79.9436 }, // Oakland
  'd1000000-0000-0000-0000-000000000003': { lat: 40.4506, lon: -79.9329 }, // Shadyside
  'd1000000-0000-0000-0000-000000000004': { lat: 40.4618, lon: -79.9262 }, // East Liberty
  'd1000000-0000-0000-0000-000000000005': { lat: 40.4314, lon: -79.9810 }  // South Side
};

// Ad cooldown in milliseconds (15 seconds)
const AD_COOLDOWN_MS = 15 * 1000;

module.exports = { DRIVER_LOCATIONS, AD_COOLDOWN_MS };
