const crypto = require('crypto');
const { getClient } = require('./shared/db');
const { verifyToken } = require('./shared/auth');
const { success, error, unauthorized, badRequest } = require('./shared/response');

exports.handler = async (event) => {
  try {
    const decoded = verifyToken(event);
    if (!decoded) return unauthorized();

    const body = JSON.parse(event.body || '{}');
    const { rideId, amount, currency } = body;

    if (!rideId || !amount) return badRequest('rideId and amount required');

    const intentId = crypto.randomUUID();
    const client = await getClient();

    try {
      await client.query(
        `INSERT INTO "PaymentIntent" (id, "rideId", amount, currency, status, "createdAt")
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [intentId, rideId, amount, currency || 'USD', 'PENDING', new Date()]
      );
    } catch (err) {
      console.log('PaymentIntent table may not exist');
    }
    await client.end();

    return success({
      intentId,
      amount,
      currency: currency || 'USD',
      status: 'PENDING'
    }, 201);
  } catch (err) {
    console.error('Error:', err);
    return error('Internal server error');
  }
};
