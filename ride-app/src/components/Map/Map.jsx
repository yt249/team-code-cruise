import { useEffect, useRef, useState } from 'react';
import './Map.css';

// Initialize the map callback globally
window.initMap = function() {
  console.log('Google Maps loaded');
};

export default function Map({
  pickup,
  destination,
  currentLocation = null,
  showRoute = false,
  routeCompleted = false,
  driverPosition = null,
  useDirections = false
}) {
  const mapRef = useRef(null);
  const googleMapRef = useRef(null);
  const markersRef = useRef({});
  const routePolylineRef = useRef(null);
  const directionsRendererRef = useRef(null);
  const boundsFittedRef = useRef(false);
  const userInteractedRef = useRef(false);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Dark theme map styles
  const darkMapStyles = [
    { elementType: "geometry", stylers: [{ color: "#1a1a1a" }] },
    { elementType: "labels.text.stroke", stylers: [{ color: "#0a0a0a" }] },
    { elementType: "labels.text.fill", stylers: [{ color: "#a0a0a0" }] },
    {
      featureType: "administrative.locality",
      elementType: "labels.text.fill",
      stylers: [{ color: "#FFD60A" }],
    },
    {
      featureType: "poi",
      elementType: "labels.text.fill",
      stylers: [{ color: "#666666" }],
    },
    {
      featureType: "poi.park",
      elementType: "geometry",
      stylers: [{ color: "#1f3a1f" }],
    },
    {
      featureType: "poi.park",
      elementType: "labels.text.fill",
      stylers: [{ color: "#4d7d4d" }],
    },
    {
      featureType: "road",
      elementType: "geometry",
      stylers: [{ color: "#2a2a2a" }],
    },
    {
      featureType: "road",
      elementType: "geometry.stroke",
      stylers: [{ color: "#333333" }],
    },
    {
      featureType: "road.highway",
      elementType: "geometry",
      stylers: [{ color: "#3d3d3d" }],
    },
    {
      featureType: "road.highway",
      elementType: "geometry.stroke",
      stylers: [{ color: "#4d4d4d" }],
    },
    {
      featureType: "road",
      elementType: "labels.text.fill",
      stylers: [{ color: "#808080" }],
    },
    {
      featureType: "transit",
      elementType: "geometry",
      stylers: [{ color: "#2a2a2a" }],
    },
    {
      featureType: "transit.station",
      elementType: "labels.text.fill",
      stylers: [{ color: "#666666" }],
    },
    {
      featureType: "water",
      elementType: "geometry",
      stylers: [{ color: "#0d1f2e" }],
    },
    {
      featureType: "water",
      elementType: "labels.text.fill",
      stylers: [{ color: "#3d5a6e" }],
    },
  ];

  // Initialize Google Map
  useEffect(() => {
    const checkGoogleMaps = setInterval(() => {
      if (window.google && window.google.maps && mapRef.current && !googleMapRef.current) {
        // Determine initial center based on available data
        let initialCenter = { lat: 40.7580, lng: -73.9855 }; // Default to NYC
        let initialZoom = 13;

        if (currentLocation) {
          initialCenter = currentLocation;
          initialZoom = 14;
        } else if (pickup) {
          initialCenter = pickup;
          initialZoom = 14;
        }

        const map = new window.google.maps.Map(mapRef.current, {
          center: initialCenter,
          zoom: initialZoom,
          styles: darkMapStyles,
          disableDefaultUI: false,
          zoomControl: true,
          mapTypeControl: false,
          scaleControl: false,
          streetViewControl: false,
          rotateControl: false,
          fullscreenControl: true,
        });

        googleMapRef.current = map;
        setMapLoaded(true);
        clearInterval(checkGoogleMaps);

        // Track user interactions (zoom, pan, drag)
        map.addListener('zoom_changed', () => {
          userInteractedRef.current = true;
        });
        map.addListener('dragstart', () => {
          userInteractedRef.current = true;
        });
      }
    }, 100);

    return () => clearInterval(checkGoogleMaps);
  }, [currentLocation, pickup]);

  // Update markers and route
  useEffect(() => {
    if (!mapLoaded || !googleMapRef.current || !window.google) return;

    const map = googleMapRef.current;
    const bounds = new window.google.maps.LatLngBounds();

    // Helper function to update or create marker
    const updateOrCreateMarker = (key, position, config) => {
      if (markersRef.current[key]) {
        // Update existing marker position with animation
        markersRef.current[key].setPosition(position);
      } else {
        // Create new marker
        markersRef.current[key] = new window.google.maps.Marker({
          ...config,
          position,
          map
        });
      }
      bounds.extend(position);
    };

    // Remove markers that are no longer needed
    if (!pickup && markersRef.current.pickup) {
      markersRef.current.pickup.setMap(null);
      delete markersRef.current.pickup;
    }
    if (!destination && markersRef.current.destination) {
      markersRef.current.destination.setMap(null);
      delete markersRef.current.destination;
    }
    if (!driverPosition && markersRef.current.driver) {
      markersRef.current.driver.setMap(null);
      delete markersRef.current.driver;
    }
    if ((!currentLocation || pickup) && markersRef.current.currentLocation) {
      markersRef.current.currentLocation.setMap(null);
      delete markersRef.current.currentLocation;
    }
    if ((!currentLocation || pickup) && markersRef.current.pulseCircle) {
      markersRef.current.pulseCircle.setMap(null);
      delete markersRef.current.pulseCircle;
    }

    // Add or update pickup marker
    if (pickup) {
      updateOrCreateMarker('pickup', pickup, {
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          fillColor: '#FFD60A',
          fillOpacity: 1,
          strokeColor: '#FFC300',
          strokeWeight: 3,
          scale: 10,
        },
        title: 'Pickup Location',
      });
    }

    // Add or update destination marker
    if (destination) {
      updateOrCreateMarker('destination', destination, {
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          fillColor: '#FF5252',
          fillOpacity: 1,
          strokeColor: '#FF1744',
          strokeWeight: 3,
          scale: 10,
        },
        title: 'Destination',
      });
    }

    // Add or update driver marker with smooth animation
    if (driverPosition) {
      if (markersRef.current.driver) {
        // Smooth animation for existing marker
        const currentPos = markersRef.current.driver.getPosition();
        if (currentPos && (currentPos.lat() !== driverPosition.lat || currentPos.lng() !== driverPosition.lng)) {
          markersRef.current.driver.setPosition(driverPosition);
        }
        bounds.extend(driverPosition);
      } else {
        // Create new driver marker
        updateOrCreateMarker('driver', driverPosition, {
          icon: {
            path: 'M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z',
            fillColor: '#FFFFFF',
            fillOpacity: 1,
            strokeColor: '#FFD60A',
            strokeWeight: 2,
            scale: 1.5,
            anchor: new window.google.maps.Point(12, 12),
          },
          title: 'Driver Location',
          animation: window.google.maps.Animation.DROP,
        });
      }
    }

    // Add or update current location marker (blue dot)
    if (currentLocation && !pickup) {
      if (!markersRef.current.currentLocation) {
        markersRef.current.currentLocation = new window.google.maps.Marker({
          position: currentLocation,
          map: map,
          icon: {
            path: window.google.maps.SymbolPath.CIRCLE,
            fillColor: '#4285F4',
            fillOpacity: 1,
            strokeColor: '#FFFFFF',
            strokeWeight: 3,
            scale: 8,
          },
          title: 'Your Current Location',
          zIndex: 1000,
        });

        // Add a pulsing circle around current location
        markersRef.current.pulseCircle = new window.google.maps.Circle({
          strokeColor: '#4285F4',
          strokeOpacity: 0.8,
          strokeWeight: 2,
          fillColor: '#4285F4',
          fillOpacity: 0.15,
          map: map,
          center: currentLocation,
          radius: 100, // 100 meters
        });
      }
      bounds.extend(currentLocation);
    }

    // Draw route if needed
    if (showRoute && pickup && destination) {
      if (useDirections) {
        // Use Google Directions API for real navigation
        const directionsService = new window.google.maps.DirectionsService();

        // Clear existing directions renderer
        if (directionsRendererRef.current) {
          directionsRendererRef.current.setMap(null);
        }

        const directionsRenderer = new window.google.maps.DirectionsRenderer({
          map: map,
          suppressMarkers: true, // We'll use custom markers
          polylineOptions: {
            strokeColor: routeCompleted ? '#00E676' : '#40C4FF',
            strokeOpacity: 1.0,
            strokeWeight: 4,
          }
        });

        directionsRendererRef.current = directionsRenderer;

        directionsService.route(
          {
            origin: pickup,
            destination: destination,
            travelMode: window.google.maps.TravelMode.DRIVING,
          },
          (result, status) => {
            if (status === 'OK') {
              directionsRenderer.setDirections(result);
            } else {
              console.error('Directions request failed:', status);
              // Fallback to simple polyline
              const polyline = new window.google.maps.Polyline({
                path: [pickup, destination],
                geodesic: true,
                strokeColor: routeCompleted ? '#00E676' : '#40C4FF',
                strokeOpacity: 1.0,
                strokeWeight: 4,
              });
              polyline.setMap(map);
              routePolylineRef.current = polyline;
            }
          }
        );
      } else {
        // Simple polyline
        const routePath = [pickup, destination];

        const polyline = new window.google.maps.Polyline({
          path: routePath,
          geodesic: true,
          strokeColor: routeCompleted ? '#00E676' : '#40C4FF',
          strokeOpacity: 1.0,
          strokeWeight: 4,
        });

        polyline.setMap(map);
        routePolylineRef.current = polyline;
      }
    }

    // Fit bounds only when:
    // 1. First time markers are added (boundsFittedRef is false)
    // 2. Pickup or destination changes (new route)
    // 3. User hasn't interacted with the map
    const hasMarkers = pickup || destination || currentLocation;
    const shouldFitBounds = hasMarkers && !userInteractedRef.current && !boundsFittedRef.current;

    if (shouldFitBounds && bounds && !bounds.isEmpty()) {
      map.fitBounds(bounds);
      boundsFittedRef.current = true;

      // Add some padding
      const listener = window.google.maps.event.addListenerOnce(map, 'bounds_changed', () => {
        if (map.getZoom() > 15) {
          map.setZoom(15);
        }
      });
    }

    // Reset boundsFitted when route changes (pickup/destination change)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapLoaded, pickup, destination, currentLocation, showRoute, routeCompleted, driverPosition, useDirections]);

  // Reset bounds fitted flag when pickup or destination changes
  useEffect(() => {
    boundsFittedRef.current = false;
    userInteractedRef.current = false;
  }, [pickup, destination]);

  return (
    <div className="map-container">
      <div
        ref={mapRef}
        className="google-map"
        style={{ width: '100%', height: '100%' }}
      />
      {!mapLoaded && (
        <div className="map-loading">
          <div className="spinner"></div>
          <p>Loading Map...</p>
        </div>
      )}
    </div>
  );
}
