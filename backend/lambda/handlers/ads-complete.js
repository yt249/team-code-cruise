const crypto = require('crypto');
const { getClient } = require('./shared/db');
const { verifyToken } = require('./shared/auth');
const { success, error, unauthorized, notFound, badRequest } = require('./shared/response');

exports.handler = async (event) => {
  try {
    const decoded = verifyToken(event);
    if (!decoded) return unauthorized();

    const body = JSON.parse(event.body || '{}');
    const { sessionId } = body;

    if (!sessionId) return badRequest('sessionId required');

    const client = await getClient();
    const sessionResult = await client.query('SELECT * FROM "AdSession" WHERE id = $1', [sessionId]);

    if (sessionResult.rows.length === 0) {
      await client.end();
      return notFound('Session not found');
    }

    const session = sessionResult.rows[0];
    const tokenId = crypto.randomUUID();
    const tokenExpiresAt = new Date(Date.now() + 10 * 60000);

    await client.query(
      `INSERT INTO "DiscountToken" (id, "riderId", "sessionId", percent, state, "expiresAt", "createdAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [tokenId, session.riderId, sessionId, session.percent, 'ACTIVE', tokenExpiresAt, new Date()]
    );

    await client.query(
      'UPDATE "AdSession" SET status = $1, "completedAt" = $2 WHERE id = $3',
      ['COMPLETED', new Date(), sessionId]
    );
    await client.end();

    return success({ tokenId, expiresAt: tokenExpiresAt.toISOString() });
  } catch (err) {
    console.error('Error:', err);
    return error('Internal server error');
  }
};
