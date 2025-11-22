const { getClient } = require('../shared/db');
const { verifyToken } = require('../shared/auth');
const { success, error, unauthorized, notFound, badRequest } = require('../shared/response');

exports.handler = async (event) => {
  try {
    const decoded = verifyToken(event);
    if (!decoded) return unauthorized();

    const body = JSON.parse(event.body || '{}');
    const { tokenId, rideId } = body;

    if (!tokenId || !rideId) return badRequest('tokenId and rideId required');

    const client = await getClient();
    const tokenResult = await client.query('SELECT * FROM "DiscountToken" WHERE id = $1', [tokenId]);

    if (tokenResult.rows.length === 0) {
      await client.end();
      return notFound('Token not found');
    }

    const discountToken = tokenResult.rows[0];
    if (discountToken.state !== 'ACTIVE') {
      await client.end();
      return badRequest('Token already redeemed or invalid');
    }

    if (new Date(discountToken.expiresAt) < new Date()) {
      await client.end();
      return badRequest('Token expired');
    }

    await client.query('UPDATE "DiscountToken" SET state = $1 WHERE id = $2', ['REDEEMED', tokenId]);
    await client.end();

    return success({ state: 'REDEEMED' });
  } catch (err) {
    console.error('Error:', err);
    return error(err.message);
  }
};
