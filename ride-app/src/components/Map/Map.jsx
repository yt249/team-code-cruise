import { useEffect, useRef } from 'react';
import './Map.css';

export default function Map({
  pickup,
  destination,
  showRoute = false,
  routeCompleted = false,
  driverPosition = null
}) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw grid background
    ctx.strokeStyle = '#d0d0d0';
    ctx.lineWidth = 1;
    const gridSize = 60;

    // Vertical lines
    for (let x = 0; x <= width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    // Horizontal lines
    for (let y = 0; y <= height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Draw thicker grid lines
    ctx.strokeStyle = '#a0a0a0';
    ctx.lineWidth = 2;
    const majorGridSize = gridSize * 4;

    for (let x = 0; x <= width; x += majorGridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    for (let y = 0; y <= height; y += majorGridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Convert lat/lng to canvas coordinates
    const latToY = (lat) => {
      const minLat = 40.75;
      const maxLat = 40.79;
      return height - ((lat - minLat) / (maxLat - minLat)) * height;
    };

    const lngToX = (lng) => {
      const minLng = -74.0;
      const maxLng = -73.96;
      return ((lng - minLng) / (maxLng - minLng)) * width;
    };

    // Draw route if needed
    if (showRoute && pickup && destination) {
      const startX = lngToX(pickup.lng);
      const startY = latToY(pickup.lat);
      const endX = lngToX(destination.lng);
      const endY = latToY(destination.lat);

      // Create a simple path (L-shaped for now)
      const midX = startX;
      const midY = endY;

      ctx.strokeStyle = routeCompleted ? '#00c853' : '#2196f3';
      ctx.lineWidth = 4;

      if (routeCompleted) {
        // Solid line for completed
        ctx.setLineDash([]);
      } else {
        // Dashed line for active
        ctx.setLineDash([10, 10]);
      }

      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(midX, midY);
      ctx.lineTo(endX, endY);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Calculate adaptive sizes based on canvas dimensions
    const baseSize = Math.min(width, height) / 60; // Adaptive base size
    const markerRadius = baseSize * 0.8;
    const carRadius = baseSize;
    const borderWidth = baseSize * 0.2;

    // Draw pickup marker (green circle)
    if (pickup) {
      const x = lngToX(pickup.lng);
      const y = latToY(pickup.lat);

      ctx.fillStyle = '#00c853';
      ctx.beginPath();
      ctx.arc(x, y, markerRadius, 0, Math.PI * 2);
      ctx.fill();

      // White border
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = borderWidth;
      ctx.stroke();
    }

    // Draw destination marker (red circle)
    if (destination) {
      const x = lngToX(destination.lng);
      const y = latToY(destination.lat);

      ctx.fillStyle = '#f44336';
      ctx.beginPath();
      ctx.arc(x, y, markerRadius, 0, Math.PI * 2);
      ctx.fill();

      // White border
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = borderWidth;
      ctx.stroke();
    }

    // Draw driver position (car icon)
    if (driverPosition) {
      const x = lngToX(driverPosition.lng);
      const y = latToY(driverPosition.lat);

      // Draw car as a white circle with black border
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(x, y, carRadius, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#000000';
      ctx.lineWidth = borderWidth;
      ctx.stroke();

      // Draw simplified car shape (scaled)
      ctx.fillStyle = '#000000';
      const carBodyWidth = baseSize * 0.8;
      const carBodyHeight = baseSize * 0.5;
      const carTopWidth = baseSize * 0.5;
      const carTopHeight = baseSize * 0.3;

      ctx.beginPath();
      // Car body
      ctx.fillRect(x - carBodyWidth/2, y - carBodyHeight/2, carBodyWidth, carBodyHeight);
      // Car top
      ctx.fillRect(x - carTopWidth/2, y - carBodyHeight/2 - carTopHeight, carTopWidth, carTopHeight);
      ctx.fill();
    }
  }, [pickup, destination, showRoute, routeCompleted, driverPosition]);

  return (
    <div className="map-container">
      <canvas
        ref={canvasRef}
        width={1200}
        height={800}
        className="map-canvas"
        aria-label="Map showing trip route"
      />
    </div>
  );
}
