const { getClient } = require('./shared/db');
const { verifyToken } = require('./shared/auth');
const { success, error, unauthorized, notFound, badRequest } = require('./shared/response');

exports.handler = async (event) => {
  try {
    const decoded = verifyToken(event);
    if (!decoded) return unauthorized();

    const riderId = decoded.sub;
    const rideId = event.pathParameters?.id;

    const client = await getClient();
    const checkResult = await client.query(
      'SELECT * FROM "Ride" WHERE id = $1 AND "riderId" = $2',
      [rideId, riderId]
    );

    if (checkResult.rows.length === 0) {
      await client.end();
      return notFound('Ride not found');
    }

    const ride = checkResult.rows[0];
    if (ride.status === 'COMPLETED') {
      await client.end();
      return badRequest('Ride already completed');
    }

    if (ride.status === 'CANCELLED') {
      await client.end();
      return success({ status: 'CANCELLED' });
    }

    await client.query('UPDATE "Ride" SET status = $1 WHERE id = $2', ['CANCELLED', rideId]);

    if (ride.driverId) {
      await client.query("UPDATE \"Driver\" SET status = 'AVAILABLE' WHERE id = $1", [ride.driverId]);
    }
    await client.end();

    return success({ status: 'CANCELLED' });
  } catch (err) {
    console.error('Error:', err);
    return error(err.message);
  }
};
