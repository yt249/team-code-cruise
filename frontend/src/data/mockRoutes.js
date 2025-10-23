// Mock location and route data

// Predefined locations
export const mockLocations = {
  'here': {
    lat: 40.7580,
    lng: -73.9855,
    address: 'here'
  },
  'there': {
    lat: 40.7829,
    lng: -73.9654,
    address: 'there'
  },
  'downtown': {
    lat: 40.7128,
    lng: -74.0060,
    address: 'Downtown Manhattan, New York, NY'
  },
  'airport': {
    lat: 40.6413,
    lng: -73.7781,
    address: 'JFK Airport, Queens, NY 11430'
  }
};

// Calculate distance between two points (Haversine formula)
export function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 3959; // Earth's radius in miles
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return distance;
}

function toRad(degrees) {
  return degrees * (Math.PI / 180);
}

// Calculate fare based on distance
export function calculateFare(distance) {
  const baseFare = 10;
  const perMileRate = 2.5;
  const surgeFactor = 1 + (Math.random() * 0.5); // Random surge 1.0 - 1.5x

  const fare = (baseFare + (distance * perMileRate)) * surgeFactor;
  return Math.round(fare * 100) / 100; // Round to 2 decimals
}

// Calculate ETA in minutes
export function calculateETA(distance) {
  const avgSpeed = 25; // mph in city traffic
  const minutes = (distance / avgSpeed) * 60;
  return Math.ceil(minutes);
}

// Mock geocoding - convert text to location
export function geocodeLocation(locationText) {
  const lowerText = locationText.toLowerCase().trim();

  // Check if it matches a predefined location
  if (mockLocations[lowerText]) {
    return mockLocations[lowerText];
  }

  // Generate a random location in NYC area
  const randomLocation = {
    lat: 40.7580 + (Math.random() - 0.5) * 0.1,
    lng: -73.9855 + (Math.random() - 0.5) * 0.1,
    address: `${locationText}, New York, NY`
  };

  return randomLocation;
}

// Get route between two points
export function getRoute(pickup, dropoff) {
  const distance = calculateDistance(
    pickup.lat,
    pickup.lng,
    dropoff.lat,
    dropoff.lng
  );

  const fare = calculateFare(distance);
  const estimatedTime = calculateETA(distance);

  return {
    distance: Math.round(distance * 10) / 10, // Round to 1 decimal
    fare,
    estimatedTime, // Changed from 'eta' to 'estimatedTime'
    pickup,
    dropoff
  };
}
