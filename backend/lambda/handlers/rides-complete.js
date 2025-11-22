const { getClient } = require('./shared/db');
const { verifyToken } = require('./shared/auth');
const { success, error, unauthorized, notFound, badRequest } = require('./shared/response');

exports.handler = async (event) => {
  try {
    const decoded = verifyToken(event);
    if (!decoded) return unauthorized();

    const riderId = decoded.sub;
    const rideId = event.pathParameters?.id;
    if (!rideId) return badRequest('Ride ID required');

    const client = await getClient();
    const result = await client.query(
      'UPDATE "Ride" SET status = $1, "completedAt" = $2 WHERE id = $3 AND "riderId" = $4 RETURNING "driverId"',
      ['COMPLETED', new Date(), rideId, riderId]
    );

    if (result.rows.length === 0) {
      await client.end();
      return notFound('Ride not found');
    }

    const driverId = result.rows[0].driverId;
    if (driverId) {
      await client.query("UPDATE \"Driver\" SET status = 'AVAILABLE' WHERE id = $1", [driverId]);
    }
    await client.end();

    return success({ status: 'COMPLETED' });
  } catch (err) {
    console.error('Error:', err);
    return error(err.message || 'Internal server error');
  }
};
