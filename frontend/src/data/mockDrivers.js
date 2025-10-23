// Mock driver data
export const mockDrivers = [
  {
    id: 'driver-1',
    name: 'John Smith',
    rating: 4.9,
    vehicle: {
      make: 'Toyota',
      model: 'Camry',
      color: 'Silver',
      plate: 'ABC-1234'
    },
    phone: '+1 (555) 123-4567',
    photo: 'https://i.pravatar.cc/150?img=12',
    location: { lat: 40.7580, lng: -73.9855 }, // Times Square area
    available: true
  },
  {
    id: 'driver-2',
    name: 'Sarah Johnson',
    rating: 4.95,
    vehicle: {
      make: 'Honda',
      model: 'Accord',
      color: 'Black',
      plate: 'XYZ-5678'
    },
    phone: '+1 (555) 234-5678',
    photo: 'https://i.pravatar.cc/150?img=5',
    location: { lat: 40.7589, lng: -73.9851 },
    available: true
  },
  {
    id: 'driver-3',
    name: 'Michael Chen',
    rating: 4.85,
    vehicle: {
      make: 'Ford',
      model: 'Fusion',
      color: 'Blue',
      plate: 'DEF-9012'
    },
    phone: '+1 (555) 345-6789',
    photo: 'https://i.pravatar.cc/150?img=33',
    location: { lat: 40.7614, lng: -73.9776 },
    available: true
  },
  {
    id: 'driver-4',
    name: 'Emily Davis',
    rating: 4.92,
    vehicle: {
      make: 'Nissan',
      model: 'Altima',
      color: 'White',
      plate: 'GHI-3456'
    },
    phone: '+1 (555) 456-7890',
    photo: 'https://i.pravatar.cc/150?img=9',
    location: { lat: 40.7505, lng: -73.9934 },
    available: true
  },
  {
    id: 'driver-5',
    name: 'David Martinez',
    rating: 4.88,
    vehicle: {
      make: 'Chevrolet',
      model: 'Malibu',
      color: 'Gray',
      plate: 'JKL-7890'
    },
    phone: '+1 (555) 567-8901',
    photo: 'https://i.pravatar.cc/150?img=68',
    location: { lat: 40.7549, lng: -73.9840 },
    available: true
  }
];

// Function to get nearest available driver
export function getNearestDriver(pickupLocation) {
  // Simple mock: return first available driver
  const available = mockDrivers.filter(d => d.available);
  if (available.length === 0) return null;

  // Get a random available driver
  const selectedDriver = available[Math.floor(Math.random() * available.length)];

  // Place driver near the pickup location (within 0.01 degrees ~= 1km)
  const nearbyDriver = {
    ...selectedDriver,
    location: {
      lat: pickupLocation.lat + (Math.random() - 0.5) * 0.02,
      lng: pickupLocation.lng + (Math.random() - 0.5) * 0.02
    }
  };

  console.log('Assigned driver near pickup:', nearbyDriver.location, 'Pickup:', pickupLocation);

  return nearbyDriver;
}

// Function to simulate driver movement using Google Directions API
export function simulateDriverMovement(driver, destination, callback) {
  // Check if Google Maps is loaded
  if (!window.google || !window.google.maps) {
    console.error('Google Maps not loaded');
    return fallbackMovement(driver, destination, callback);
  }

  const directionsService = new window.google.maps.DirectionsService();

  console.log('Starting driver movement simulation from', driver.location, 'to', destination);

  // Get actual route from Directions API
  directionsService.route(
    {
      origin: driver.location,
      destination: destination,
      travelMode: window.google.maps.TravelMode.DRIVING,
    },
    (result, status) => {
      if (status === 'OK') {
        // Extract all points from the route
        const route = result.routes[0];
        const path = route.overview_path; // Array of LatLng points along the route

        if (!path || path.length === 0) {
          console.error('No path found in route');
          return;
        }

        // Convert path to simple objects
        const waypoints = path.map(point => ({
          lat: point.lat(),
          lng: point.lng()
        }));

        console.log('Got route with', waypoints.length, 'waypoints');

        // Simulate movement along the path
        const totalSteps = 30; // Number of position updates
        let currentStep = 0;

        const interval = setInterval(() => {
          currentStep++;
          const progress = currentStep / totalSteps;

          // Calculate which segment of the path we're on
          const pathProgress = progress * (waypoints.length - 1);
          const segmentIndex = Math.floor(pathProgress);
          const segmentProgress = pathProgress - segmentIndex;

          let newLocation;
          if (segmentIndex >= waypoints.length - 1) {
            // At the end
            newLocation = waypoints[waypoints.length - 1];
          } else {
            // Interpolate between two waypoints
            const start = waypoints[segmentIndex];
            const end = waypoints[segmentIndex + 1];
            newLocation = {
              lat: start.lat + (end.lat - start.lat) * segmentProgress,
              lng: start.lng + (end.lng - start.lng) * segmentProgress
            };
          }

          console.log('Driver moving to:', newLocation, 'progress:', progress);
          callback(newLocation, progress);

          if (currentStep >= totalSteps) {
            clearInterval(interval);
            console.log('Driver movement complete');
          }
        }, 1000); // Update every second
      } else {
        console.error('Directions request failed:', status);
        // Fallback to simple linear movement
        fallbackMovement(driver, destination, callback);
      }
    }
  );

  // Return a placeholder - the actual interval is created in the async callback
  return 'pending';
}

// Fallback movement if Directions API fails
function fallbackMovement(driver, destination, callback) {
  const steps = 20;
  let currentStep = 0;

  const startLat = driver.location.lat;
  const startLng = driver.location.lng;
  const endLat = destination.lat;
  const endLng = destination.lng;

  const interval = setInterval(() => {
    currentStep++;
    const progress = currentStep / steps;

    const newLocation = {
      lat: startLat + ((endLat - startLat) * progress),
      lng: startLng + ((endLng - startLng) * progress)
    };

    callback(newLocation, progress);

    if (currentStep >= steps) {
      clearInterval(interval);
    }
  }, 1000);

  return interval;
}
