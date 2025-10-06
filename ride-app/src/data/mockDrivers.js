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

  // In a real app, we'd calculate distance
  // For mock, just return a random available driver
  return available[Math.floor(Math.random() * available.length)];
}

// Function to simulate driver movement
export function simulateDriverMovement(driver, destination, callback) {
  const steps = 20; // Number of position updates
  let currentStep = 0;

  const startLat = driver.location.lat;
  const startLng = driver.location.lng;
  const endLat = destination.lat;
  const endLng = destination.lng;

  // Create L-shaped path matching the map route: vertical first, then horizontal
  // Route on map: (startLng, startLat) -> (startLng, endLat) -> (endLng, endLat)

  const interval = setInterval(() => {
    currentStep++;
    const progress = currentStep / steps;

    let newLocation;

    // First half: move vertically (latitude changes, longitude stays same)
    if (progress <= 0.5) {
      const verticalProgress = progress * 2; // 0 to 1 in first half
      newLocation = {
        lat: startLat + ((endLat - startLat) * verticalProgress),
        lng: startLng
      };
    } else {
      // Second half: move horizontally (longitude changes, latitude stays at endLat)
      const horizontalProgress = (progress - 0.5) * 2; // 0 to 1 in second half
      newLocation = {
        lat: endLat,
        lng: startLng + ((endLng - startLng) * horizontalProgress)
      };
    }

    callback(newLocation, progress); // Progress 0-1

    if (currentStep >= steps) {
      clearInterval(interval);
    }
  }, 1000); // Update every second

  return interval;
}
