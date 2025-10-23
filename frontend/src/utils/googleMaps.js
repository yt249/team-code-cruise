/**
 * Google Maps API Utilities
 * Calculates distance and duration between locations
 */

/**
 * Calculate distance and duration between two locations using Google Maps Distance Matrix API
 * @param {Object} origin - { lat, lng }
 * @param {Object} destination - { lat, lng }
 * @returns {Promise<Object>} { distance: number (km), duration: number (minutes), distanceText: string, durationText: string }
 */
export async function calculateDistance(origin, destination) {
  return new Promise((resolve, reject) => {
    if (!window.google || !window.google.maps) {
      reject(new Error('Google Maps API not loaded'));
      return;
    }

    const service = new window.google.maps.DistanceMatrixService();

    service.getDistanceMatrix(
      {
        origins: [{ lat: origin.lat, lng: origin.lng }],
        destinations: [{ lat: destination.lat, lng: destination.lng }],
        travelMode: window.google.maps.TravelMode.DRIVING,
        unitSystem: window.google.maps.UnitSystem.METRIC,
      },
      (response, status) => {
        if (status === 'OK' && response.rows[0].elements[0].status === 'OK') {
          const element = response.rows[0].elements[0];

          resolve({
            distance: element.distance.value / 1000, // Convert meters to km
            duration: element.duration.value / 60, // Convert seconds to minutes
            distanceText: element.distance.text,
            durationText: element.duration.text
          });
        } else {
          reject(new Error(`Distance Matrix API error: ${status}`));
        }
      }
    );
  });
}

/**
 * Calculate distance between driver and pickup location
 * @param {Object} driverLocation - { lat, lng }
 * @param {Object} pickupLocation - { lat, lng }
 * @returns {Promise<Object>} { distance: number (km), duration: number (minutes), distanceText: string, durationText: string }
 */
export async function calculateDriverETA(driverLocation, pickupLocation) {
  return calculateDistance(driverLocation, pickupLocation);
}

/**
 * Calculate total trip distance
 * @param {Object} pickup - { lat, lng }
 * @param {Object} dropoff - { lat, lng }
 * @returns {Promise<Object>} { distance: number (km), duration: number (minutes), distanceText: string, durationText: string }
 */
export async function calculateTripDistance(pickup, dropoff) {
  return calculateDistance(pickup, dropoff);
}

/**
 * Get the actual route path between two locations using Google Directions API
 * Returns an array of lat/lng coordinates along the route
 * @param {Object} origin - { lat, lng }
 * @param {Object} destination - { lat, lng }
 * @returns {Promise<Array>} Array of { lat, lng } coordinates along the route
 */
export async function getRoutePath(origin, destination) {
  return new Promise((resolve, reject) => {
    if (!window.google || !window.google.maps) {
      reject(new Error('Google Maps API not loaded'));
      return;
    }

    const directionsService = new window.google.maps.DirectionsService();

    directionsService.route(
      {
        origin: { lat: origin.lat, lng: origin.lng },
        destination: { lat: destination.lat, lng: destination.lng },
        travelMode: window.google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === 'OK' && result.routes && result.routes.length > 0) {
          const route = result.routes[0];
          const path = [];

          // Extract all points from all steps in the route
          route.legs.forEach(leg => {
            leg.steps.forEach(step => {
              // Each step has a path array with lat/lng points
              step.path.forEach(point => {
                path.push({
                  lat: point.lat(),
                  lng: point.lng()
                });
              });
            });
          });

          resolve(path);
        } else {
          reject(new Error(`Directions API error: ${status}`));
        }
      }
    );
  });
}
