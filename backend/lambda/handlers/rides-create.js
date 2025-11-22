const crypto = require('crypto');
const { getClient } = require('./shared/db');
const { verifyToken } = require('./shared/auth');
const { success, error, unauthorized, badRequest } = require('./shared/response');
const { DRIVER_LOCATIONS } = require('./shared/constants');

exports.handler = async (event) => {
  try {
    const decoded = verifyToken(event);
    if (!decoded) return unauthorized();

    const riderId = decoded.sub;
    const body = JSON.parse(event.body || '{}');
    const { pickup, dest, dropoff, quoteId } = body;
    const destination = dest || dropoff;

    if (!pickup || !destination || !quoteId) {
      return badRequest('pickup, dest/dropoff, and quoteId required');
    }

    // Accept both lon and lng
    const pickupLon = pickup.lon ?? pickup.lng;
    const destLon = destination.lon ?? destination.lng;

    const client = await getClient();

    // Get fare from quote
    let fareAmount = 15;
    try {
      const quoteResult = await client.query('SELECT amount FROM "Quote" WHERE id = $1', [quoteId]);
      if (quoteResult.rows.length > 0) fareAmount = quoteResult.rows[0].amount;
    } catch (err) {
      console.log('Using default fare');
    }

    // Create ride
    const rideId = crypto.randomUUID();
    await client.query(
      `INSERT INTO "Ride" (id, "riderId", pickup, destination, "fareAmount", surge, currency, status, "createdAt")
       VALUES ($1, $2, ST_SetSRID(ST_MakePoint($3, $4), 4326)::geography, ST_SetSRID(ST_MakePoint($5, $6), 4326)::geography, $7, $8, $9, $10, $11)`,
      [rideId, riderId, pickupLon, pickup.lat, destLon, destination.lat, fareAmount, 1.0, 'USD', 'REQUESTED', new Date()]
    );

    // Assign driver
    const driverResult = await client.query("SELECT id FROM \"Driver\" WHERE status = 'AVAILABLE' LIMIT 1");
    let driverId = null;
    if (driverResult.rows.length > 0) {
      driverId = driverResult.rows[0].id;
      await client.query('UPDATE "Ride" SET "driverId" = $1, status = $2 WHERE id = $3', [driverId, 'DRIVER_ASSIGNED', rideId]);
      await client.query("UPDATE \"Driver\" SET status = 'BUSY' WHERE id = $1", [driverId]);
    }

    // Get ride details
    const rideDetails = await client.query(
      `SELECT r.id, r."riderId", r."driverId", r."fareAmount", r.status,
              ST_Y(r.pickup::geometry) as "pickupLat", ST_X(r.pickup::geometry) as "pickupLon",
              ST_Y(r.destination::geometry) as "destLat", ST_X(r.destination::geometry) as "destLon",
              d.name as "driverName", d.rating as "driverRating",
              CONCAT(v.make, ' ', v.model) as "driverVehicle", v.plate as "driverPlate"
       FROM "Ride" r
       LEFT JOIN "Driver" d ON r."driverId" = d.id
       LEFT JOIN "Vehicle" v ON v."driverId" = d.id
       WHERE r.id = $1`,
      [rideId]
    );
    await client.end();

    const ride = rideDetails.rows[0];
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
    }, 201);
  } catch (err) {
    console.error('Error:', err);
    return error(err.message || 'Internal server error');
  }
};
