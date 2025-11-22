const { getClient } = require('../shared/db');
const { verifyToken } = require('../shared/auth');
const { success, error, unauthorized, notFound, badRequest } = require('../shared/response');
const { DRIVER_LOCATIONS } = require('../shared/constants');

exports.handler = async (event) => {
  try {
    const decoded = verifyToken(event);
    if (!decoded) return unauthorized();

    const riderId = decoded.sub;
    const rideId = event.pathParameters?.id;
    if (!rideId) return badRequest('Ride ID required');

    const client = await getClient();
    const result = await client.query(
      `SELECT r.id, r."riderId", r."driverId", r."fareAmount", r.status,
              ST_Y(r.pickup::geometry) as "pickupLat", ST_X(r.pickup::geometry) as "pickupLon",
              ST_Y(r.destination::geometry) as "destLat", ST_X(r.destination::geometry) as "destLon",
              d.name as "driverName", d.rating as "driverRating",
              CONCAT(v.make, ' ', v.model) as "driverVehicle", v.plate as "driverPlate"
       FROM "Ride" r
       LEFT JOIN "Driver" d ON r."driverId" = d.id
       LEFT JOIN "Vehicle" v ON v."driverId" = d.id
       WHERE r.id = $1 AND r."riderId" = $2`,
      [rideId, riderId]
    );
    await client.end();

    if (result.rows.length === 0) return notFound('Ride not found');

    const ride = result.rows[0];
    const driverLocation = ride.driverId ? (DRIVER_LOCATIONS[ride.driverId] || { lat: 40.4406, lon: -79.9959 }) : null;

    return success({
      id: ride.id,
      riderId: ride.riderId,
      driverId: ride.driverId,
      pickup: { lat: ride.pickupLat, lon: ride.pickupLon },
      dest: { lat: ride.destLat, lon: ride.destLon },
      fareAmount: ride.fareAmount,
      status: ride.status,
      driver: ride.driverId ? {
        name: ride.driverName,
        rating: ride.driverRating,
        vehicle: ride.driverVehicle,
        plate: ride.driverPlate,
        location: driverLocation
      } : null
    });
  } catch (err) {
    console.error('Error:', err);
    return error('Internal server error');
  }
};
