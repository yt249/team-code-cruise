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
          fullscreenControl: true,
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

  // DEBUG: Log all props whenever they change
  useEffect(() => {
    console.log('🔍 MAP PROPS CHANGED:', {
      pickup,
      destination,
      showRoute,
      useDirections,
      mapLoaded,
      hasGoogleMaps: !!window.google,
      hasMap: !!googleMapRef.current
    });
  }, [pickup, destination, showRoute, useDirections, mapLoaded]);

  // SEPARATE EFFECT: Render route (runs independently of markers)
  useEffect(() => {
    if (!mapLoaded || !googleMapRef.current || !window.google) {
      console.log('Route effect: Map not ready');
      return;
    }

    const map = googleMapRef.current;

    // If showRoute is false or locations are missing, clear any existing route
    if (!showRoute || !pickup || !destination) {
      console.log('Route rendering skipped, clearing existing route:', { showRoute, pickup: !!pickup, destination: !!destination });

      if (directionsRendererRef.current) {
        console.log('Clearing directions renderer because showRoute is false');
        directionsRendererRef.current.setMap(null);
        directionsRendererRef.current = null;
      }
      if (routePolylineRef.current) {
        console.log('Clearing polyline because showRoute is false');
        routePolylineRef.current.setMap(null);
        routePolylineRef.current = null;
      }

      return;
    }

    // Create a unique key for this route
    const routeKey = `${pickup.lat},${pickup.lng}-${destination.lat},${destination.lng}`;

    // Skip if we already rendered this exact route
    if (lastRenderedRouteRef.current === routeKey && directionsRendererRef.current) {
      console.log('⏭️ Same route already rendered, skipping');
      return;
    }

    console.log('=== ROUTE RENDERING EFFECT ===');
    console.log('Route key:', routeKey);
    console.log('showRoute:', showRoute, 'pickup:', pickup, 'destination:', destination);
    console.log('useDirections:', useDirections, 'routeCompleted:', routeCompleted);

    // ALWAYS clear any existing route FIRST (even if request in progress)
    // This ensures old routes disappear when user changes destination
    if (directionsRendererRef.current) {
      console.log('Clearing old directions renderer');
      directionsRendererRef.current.setMap(null);
      directionsRendererRef.current = null;
    }
    if (routePolylineRef.current) {
      console.log('Clearing old polyline');
      routePolylineRef.current.setMap(null);
      routePolylineRef.current = null;
    }

    // Skip if a request is already in progress (after clearing old route)
    if (routeRequestInProgressRef.current) {
      console.log('⏳ Route request already in progress, skipping duplicate');
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

      console.log('Requesting Google Directions from', pickup, 'to', destination);

      directionsService.route(
        {
          origin: pickup,
          destination: destination,
          travelMode: window.google.maps.TravelMode.DRIVING,
        },
        (result, status) => {
          console.log('Directions API response:', status);
          routeRequestInProgressRef.current = false;

          if (status === 'OK') {
            directionsRenderer.setDirections(result);
            lastRenderedRouteRef.current = routeKey;
            console.log('✅ ROUTE RENDERED SUCCESSFULLY!');
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
            console.log('Using fallback polyline');
          }
        }
      );
    } else {
      // Simple polyline
      console.log('Using simple polyline (no directions)');
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
      console.log('✅ POLYLINE RENDERED!');
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
      console.log('Driver position received:', driverPosition);
      if (markersRef.current.driver) {
        // Smooth animation for existing marker
        const currentPos = markersRef.current.driver.getPosition();
        if (currentPos && (currentPos.lat() !== driverPosition.lat || currentPos.lng() !== driverPosition.lng)) {
          console.log('Updating driver position');
          markersRef.current.driver.setPosition(driverPosition);
        }
        bounds.extend(driverPosition);
      } else {
        // Create new driver marker with CAR ICON
        console.log('Creating new driver marker (car icon) at', driverPosition);

        // SVG car icon
        const carIcon = {
          path: 'M17.402,0H5.643C2.526,0,0,3.467,0,6.584v34.804c0,3.116,2.526,5.644,5.643,5.644h11.759c3.116,0,5.644-2.527,5.644-5.644 V6.584C23.044,3.467,20.518,0,17.402,0z M22.057,14.188v11.665l-2.729,0.351v-4.806L22.057,14.188z M20.625,10.773 c-1.016,3.9-2.219,8.51-2.219,8.51H4.638l-2.222-8.51C2.417,10.773,11.3,7.755,20.625,10.773z M3.748,21.713v4.492l-2.73-0.349 V14.502L3.748,21.713z M1.018,37.938V27.579l2.73,0.343v8.196L1.018,37.938z M2.575,40.882l2.218-3.336h13.771l2.219,3.336H2.575z M19.328,35.805v-7.872l2.729-0.355v10.048L19.328,35.805z',
          fillColor: '#FFD60A',
          fillOpacity: 1,
          strokeColor: '#FFFFFF',
          strokeWeight: 1,
          scale: 0.6,
          anchor: new window.google.maps.Point(11.5, 23),
        };

        updateOrCreateMarker('driver', driverPosition, {
          icon: carIcon,
          title: 'Driver Location',
          animation: window.google.maps.Animation.DROP,
          zIndex: 1000,
        });
      }
    } else {
      console.log('No driver position - driverPosition is', driverPosition);
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
      console.log('Rendering nearby drivers on map:', nearbyDrivers.length);

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
        console.log(`Creating marker for driver ${driver.name} at`, driver.location);

        // Gray car icon for nearby drivers
        const nearbyCarIcon = {
          path: 'M17.402,0H5.643C2.526,0,0,3.467,0,6.584v34.804c0,3.116,2.526,5.644,5.643,5.644h11.759c3.116,0,5.644-2.527,5.644-5.644 V6.584C23.044,3.467,20.518,0,17.402,0z M22.057,14.188v11.665l-2.729,0.351v-4.806L22.057,14.188z M20.625,10.773 c-1.016,3.9-2.219,8.51-2.219,8.51H4.638l-2.222-8.51C2.417,10.773,11.3,7.755,20.625,10.773z M3.748,21.713v4.492l-2.73-0.349 V14.502L3.748,21.713z M1.018,37.938V27.579l2.73,0.343v8.196L1.018,37.938z M2.575,40.882l2.218-3.336h13.771l2.219,3.336H2.575z M19.328,35.805v-7.872l2.729-0.355v10.048L19.328,35.805z',
          fillColor: '#CCCCCC',
          fillOpacity: 0.6,
          strokeColor: '#999999',
          strokeWeight: 0.8,
          scale: 0.4,
          anchor: new window.google.maps.Point(11.5, 23),
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

    console.log('Bounds check:', { hasMarkers, shouldFitBounds, boundsEmpty: bounds.isEmpty(), nearbyDriversCount: nearbyDrivers?.length || 0 });

    if (shouldFitBounds && bounds && !bounds.isEmpty()) {
      console.log('Fitting bounds to include all markers');

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
  }, [mapLoaded, pickup, destination, currentLocation, showRoute, routeCompleted, driverPosition, useDirections, nearbyDrivers]);

  // Center map on driver during trip
  useEffect(() => {
    if (!mapLoaded || !googleMapRef.current || !driverPosition) return;

    const map = googleMapRef.current;

    // Smoothly pan to driver's location to keep them centered
    console.log('Centering map on driver at:', driverPosition);
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

    console.log('🔄 Route changed - flags reset');
  }, [pickup, destination]);

  // Reset bounds when nearby drivers change
  useEffect(() => {
    if (nearbyDrivers && nearbyDrivers.length > 0) {
      console.log('Nearby drivers changed, resetting bounds');
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
