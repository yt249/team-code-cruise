import { useEffect, useRef, useState } from 'react';
import './Map.css';

// Initialize the map callback globally
window.initMap = function() {
};

export default function Map({
  pickup,
  destination,
  currentLocation = null,
  showRoute = false,
  routeCompleted = false,
  driverPosition = null,
  useDirections = false,
  nearbyDrivers = []
}) {
  const mapRef = useRef(null);
  const googleMapRef = useRef(null);
  const markersRef = useRef({});
  const routePolylineRef = useRef(null);
  const directionsRendererRef = useRef(null);
  const boundsFittedRef = useRef(false);
  const userInteractedRef = useRef(false);
  const routeRenderedRef = useRef(false);
  const routeRequestInProgressRef = useRef(false);
  const lastRenderedRouteRef = useRef(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const previousDriverPositionRef = useRef(null);
  const [driverHeading, setDriverHeading] = useState(0);

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

        // Detect mobile viewport for padding adjustment
        const isMobile = window.innerWidth <= 768;
        // On mobile: UI takes bottom 1/3 (33.33vh), so center in top 2/3 area
        // Bottom padding = 1/2 of bottom panel height = 16.67% of viewport
        const mobilePadding = isMobile ? { bottom: window.innerHeight * 0.1667 } : undefined;

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
          fullscreenControl: !isMobile, // Enable on desktop only
          fullscreenControlOptions: {
            position: window.google.maps.ControlPosition.RIGHT_TOP
          },
          // Add bottom padding on mobile so visual center is in top 2/3 area
          ...(mobilePadding && { padding: mobilePadding })
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


  // SEPARATE EFFECT: Render route (runs independently of markers)
  useEffect(() => {
    if (!mapLoaded || !googleMapRef.current || !window.google) {
      return;
    }

    const map = googleMapRef.current;

    // If showRoute is false or locations are missing, clear any existing route
    if (!showRoute || !pickup || !destination) {

      if (directionsRendererRef.current) {
        directionsRendererRef.current.setMap(null);
        directionsRendererRef.current = null;
      }
      if (routePolylineRef.current) {
        routePolylineRef.current.setMap(null);
        routePolylineRef.current = null;
      }

      return;
    }

    // Create a unique key for this route
    const routeKey = `${pickup.lat},${pickup.lng}-${destination.lat},${destination.lng}`;

    // Skip if we already rendered this exact route
    if (lastRenderedRouteRef.current === routeKey && directionsRendererRef.current) {
      return;
    }


    // ALWAYS clear any existing route FIRST (even if request in progress)
    // This ensures old routes disappear when user changes destination
    if (directionsRendererRef.current) {
      directionsRendererRef.current.setMap(null);
      directionsRendererRef.current = null;
    }
    if (routePolylineRef.current) {
      routePolylineRef.current.setMap(null);
      routePolylineRef.current = null;
    }

    // Skip if a request is already in progress (after clearing old route)
    if (routeRequestInProgressRef.current) {
      return;
    }

    if (useDirections) {
      // Use Google Directions API for real navigation
      routeRequestInProgressRef.current = true;
      const directionsService = new window.google.maps.DirectionsService();
      const directionsRenderer = new window.google.maps.DirectionsRenderer({
        map: map,
        suppressMarkers: true,
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
          routeRequestInProgressRef.current = false;

          if (status === 'OK') {
            directionsRenderer.setDirections(result);
            lastRenderedRouteRef.current = routeKey;
          } else {
            console.error('❌ Directions request failed:', status);
            // Fallback polyline
            const polyline = new window.google.maps.Polyline({
              path: [pickup, destination],
              geodesic: true,
              strokeColor: routeCompleted ? '#00E676' : '#40C4FF',
              strokeOpacity: 1.0,
              strokeWeight: 4,
            });
            polyline.setMap(map);
            routePolylineRef.current = polyline;
            lastRenderedRouteRef.current = routeKey;
          }
        }
      );
    } else {
      // Simple polyline
      const polyline = new window.google.maps.Polyline({
        path: [pickup, destination],
        geodesic: true,
        strokeColor: routeCompleted ? '#00E676' : '#40C4FF',
        strokeOpacity: 1.0,
        strokeWeight: 4,
      });
      polyline.setMap(map);
      routePolylineRef.current = polyline;
      lastRenderedRouteRef.current = routeKey;
    }
  }, [mapLoaded, showRoute, pickup, destination, useDirections, routeCompleted]);

  // Update markers
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

    // Add or update driver marker with smooth animation (CAR ICON)
    if (driverPosition) {

      // Calculate heading if we have a previous position
      let currentHeading = driverHeading;
      if (previousDriverPositionRef.current) {
        const prev = previousDriverPositionRef.current;
        const curr = driverPosition;

        // Calculate bearing from previous to current position using Haversine formula
        const lat1 = prev.lat * Math.PI / 180;
        const lat2 = curr.lat * Math.PI / 180;
        const dLon = (curr.lng - prev.lng) * Math.PI / 180;

        const y = Math.sin(dLon) * Math.cos(lat2);
        const x = Math.cos(lat1) * Math.sin(lat2) -
                  Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
        currentHeading = Math.atan2(y, x) * 180 / Math.PI;

        setDriverHeading(currentHeading);
      }

      // Store current position as previous for next update
      previousDriverPositionRef.current = { ...driverPosition };

      // Professional taxi icon using emoji with rotation
      const carIcon = {
        url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="50" height="50">
            <g transform="translate(50,50) rotate(${currentHeading}) translate(-50,-50)">
              <!-- Car body main -->
              <rect x="30" y="20" width="40" height="60" rx="6" fill="#FFD60A" stroke="#000" stroke-width="2.5"/>
              <!-- Front windshield -->
              <rect x="35" y="25" width="30" height="15" rx="2" fill="#1a1a1a" opacity="0.5"/>
              <!-- Rear windshield -->
              <rect x="35" y="60" width="30" height="15" rx="2" fill="#1a1a1a" opacity="0.5"/>
              <!-- Left wheels with white frame -->
              <ellipse cx="28" cy="35" rx="5" ry="8" fill="#000" stroke="#FFF" stroke-width="1.5"/>
              <ellipse cx="28" cy="65" rx="5" ry="8" fill="#000" stroke="#FFF" stroke-width="1.5"/>
              <!-- Right wheels with white frame -->
              <ellipse cx="72" cy="35" rx="5" ry="8" fill="#000" stroke="#FFF" stroke-width="1.5"/>
              <ellipse cx="72" cy="65" rx="5" ry="8" fill="#000" stroke="#FFF" stroke-width="1.5"/>
              <!-- Top taxi sign -->
              <rect x="42" y="15" width="16" height="6" rx="2" fill="#000"/>
              <!-- Direction indicator (triangle at front) -->
              <polygon points="50,12 45,20 55,20" fill="#FF0000"/>
            </g>
          </svg>
        `)}`,
        scaledSize: new window.google.maps.Size(50, 50),
        anchor: new window.google.maps.Point(25, 25)
      };

      if (markersRef.current.driver) {
        // Smooth animation for existing marker
        const currentPos = markersRef.current.driver.getPosition();
        if (currentPos && (currentPos.lat() !== driverPosition.lat || currentPos.lng() !== driverPosition.lng)) {
          markersRef.current.driver.setPosition(driverPosition);
          markersRef.current.driver.setIcon(carIcon);
        }
        bounds.extend(driverPosition);
      } else {
        // Create new driver marker with CAR ICON

        updateOrCreateMarker('driver', driverPosition, {
          icon: carIcon,
          title: 'Driver Location',
          animation: window.google.maps.Animation.DROP,
          zIndex: 1000,
        });
      }
    } else {
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

    // Add or update nearby driver markers
    if (nearbyDrivers && nearbyDrivers.length > 0) {

      // Remove markers for drivers that are no longer in the list
      const nearbyDriverIds = nearbyDrivers.map(d => `nearby-${d.id}`);
      Object.keys(markersRef.current).forEach(key => {
        if (key.startsWith('nearby-') && !nearbyDriverIds.includes(key)) {
          markersRef.current[key].setMap(null);
          delete markersRef.current[key];
        }
      });

      // Add or update markers for each nearby driver (CAR ICONS)
      nearbyDrivers.forEach(driver => {
        const markerKey = `nearby-${driver.id}`;

        // Car icon for nearby drivers - gray version
        const nearbyCarIcon = {
          url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="42" height="42">
              <!-- Car body main -->
              <rect x="30" y="20" width="40" height="60" rx="6" fill="#888888" stroke="#444" stroke-width="2"/>
              <!-- Front windshield -->
              <rect x="35" y="25" width="30" height="15" rx="2" fill="#1a1a1a" opacity="0.4"/>
              <!-- Rear windshield -->
              <rect x="35" y="60" width="30" height="15" rx="2" fill="#1a1a1a" opacity="0.4"/>
              <!-- Left wheels with white frame -->
              <ellipse cx="28" cy="35" rx="4" ry="7" fill="#333" stroke="#FFF" stroke-width="1.2"/>
              <ellipse cx="28" cy="65" rx="4" ry="7" fill="#333" stroke="#FFF" stroke-width="1.2"/>
              <!-- Right wheels with white frame -->
              <ellipse cx="72" cy="35" rx="4" ry="7" fill="#333" stroke="#FFF" stroke-width="1.2"/>
              <ellipse cx="72" cy="65" rx="4" ry="7" fill="#333" stroke="#FFF" stroke-width="1.2"/>
            </svg>
          `)}`,
          scaledSize: new window.google.maps.Size(42, 42),
          anchor: new window.google.maps.Point(21, 21)
        };

        updateOrCreateMarker(markerKey, driver.location, {
          icon: nearbyCarIcon,
          title: `${driver.name} - ${driver.vehicle.make} ${driver.vehicle.model}`,
          zIndex: 100,
        });
      });
    } else {
      // Remove all nearby driver markers if list is empty
      Object.keys(markersRef.current).forEach(key => {
        if (key.startsWith('nearby-')) {
          markersRef.current[key].setMap(null);
          delete markersRef.current[key];
        }
      });
    }

    // NOTE: Route rendering is now handled by the dedicated useEffect above (lines 160-244)
    // This prevents duplicate route rendering and timing conflicts

    // Fit bounds only when:
    // 1. First time markers are added (boundsFittedRef is false)
    // 2. Pickup or destination changes (new route)
    // 3. User hasn't interacted with the map
    const hasMarkers = pickup || destination || currentLocation || (nearbyDrivers && nearbyDrivers.length > 0);
    const shouldFitBounds = hasMarkers && !userInteractedRef.current && !boundsFittedRef.current;


    if (shouldFitBounds && bounds && !bounds.isEmpty()) {

      // Add mobile padding to fitBounds so markers fit in visible area
      // On mobile: bottom UI is 1/3, so use 16.67% padding to center in top 2/3
      const isMobile = window.innerWidth <= 768;
      const padding = isMobile ? { bottom: window.innerHeight * 0.1667, top: 80, left: 20, right: 20 } : 50;

      map.fitBounds(bounds, padding);
      boundsFittedRef.current = true;

      // Add some zoom limit
      const listener = window.google.maps.event.addListenerOnce(map, 'bounds_changed', () => {
        if (map.getZoom() > 15) {
          map.setZoom(15);
        }
      });
    }

    // Reset boundsFitted when route changes (pickup/destination change)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapLoaded, pickup, destination, currentLocation, showRoute, routeCompleted, driverPosition, useDirections, nearbyDrivers, driverHeading]);

  // Center map on driver during trip
  useEffect(() => {
    if (!mapLoaded || !googleMapRef.current || !driverPosition) return;

    const map = googleMapRef.current;

    // Smoothly pan to driver's location to keep them centered
    map.panTo(driverPosition);

    // Keep a comfortable zoom level (not too close, not too far)
    const currentZoom = map.getZoom();
    if (currentZoom < 14) {
      map.setZoom(14);
    } else if (currentZoom > 16) {
      map.setZoom(16);
    }
  }, [mapLoaded, driverPosition]);

  // Reset flags when pickup or destination changes (new route)
  useEffect(() => {
    // Reset flags to allow new route rendering
    boundsFittedRef.current = false;
    userInteractedRef.current = false;
    lastRenderedRouteRef.current = null; // Clear last rendered route key

    // NOTE: We do NOT clear directionsRendererRef or routePolylineRef here!
    // The route effect (lines 195-205) handles cleanup at the START of rendering.
    // Clearing here causes race condition: effect runs, starts async API call,
    // then this reset effect clears the renderer before the API returns.

    // We also do NOT reset routeRequestInProgressRef - let the API callback handle it

  }, [pickup, destination]);

  // Reset bounds when nearby drivers change
  useEffect(() => {
    if (nearbyDrivers && nearbyDrivers.length > 0) {
      boundsFittedRef.current = false;
    }
  }, [nearbyDrivers]);

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
