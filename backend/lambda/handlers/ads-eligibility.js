const { getClient } = require('../shared/db');
const { verifyToken } = require('../shared/auth');
const { success, error, unauthorized } = require('../shared/response');
const { AD_COOLDOWN_MS } = require('../shared/constants');

exports.handler = async (event) => {
  try {
    const decoded = verifyToken(event);
    if (!decoded) return unauthorized();

    const riderId = decoded.sub;
    const client = await getClient();
    const lastAdResult = await client.query(
      `SELECT "completedAt" FROM "AdSession" WHERE "riderId" = $1 AND status = 'COMPLETED' ORDER BY "completedAt" DESC LIMIT 1`,
      [riderId]
    );
    await client.end();

    if (lastAdResult.rows.length > 0) {
      const lastCompletedAt = new Date(lastAdResult.rows[0].completedAt).getTime();
      const now = Date.now();
      const timeSinceLastAd = now - lastCompletedAt;

      if (timeSinceLastAd < AD_COOLDOWN_MS) {
        const cooldownEndsAt = new Date(lastCompletedAt + AD_COOLDOWN_MS).toISOString();
        return success({ eligible: false, reason: 'COOLDOWN', cooldownEndsAt });
      }
    }

    return success({ eligible: true });
  } catch (err) {
    console.error('Error:', err);
    return error('Internal server error');
  }
};
