const crypto = require('crypto');
const { getClient } = require('./shared/db');
const { verifyToken } = require('./shared/auth');
const { success, error, unauthorized } = require('./shared/response');

exports.handler = async (event) => {
  try {
    const decoded = verifyToken(event);
    if (!decoded) return unauthorized();

    const riderId = decoded.sub;
    const body = JSON.parse(event.body || '{}');
    const percent = body.discountPercent || body.percent || 12;
    const sessionId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 5 * 60000);

    const client = await getClient();
    await client.query(
      `INSERT INTO "AdSession" (id, "riderId", percent, provider, status, "playbackEvents", "expiresAt", "createdAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [sessionId, riderId, percent, 'mock-ads', 'OFFERED', JSON.stringify([]), expiresAt, new Date()]
    );
    await client.end();

    return success({ sessionId, provider: 'mock-ads', percent, expiresAt: expiresAt.toISOString() }, 201);
  } catch (err) {
    console.error('Error:', err);
    return error('Internal server error');
  }
};
