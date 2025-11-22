const crypto = require('crypto');
const { getClient } = require('../shared/db');
const { success, error, badRequest } = require('../shared/response');

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

exports.handler = async (event) => {
  try {
    const body = JSON.parse(event.body || '{}');
    const { pickup, dest } = body;

    if (!pickup || !dest || !pickup.lat || !pickup.lon || !dest.lat || !dest.lon) {
      return badRequest('pickup and dest with lat/lon required');
    }

    const distanceKm = calculateDistance(pickup.lat, pickup.lon, dest.lat, dest.lon);
    const baseFare = 10;
    const perKm = 2.5;
    const surge = 1.0;
    const amount = Math.round((baseFare + distanceKm * perKm) * surge * 100) / 100;
    const etaMinutes = Math.ceil(distanceKm / 0.5);
    const quoteId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 10 * 60000);

    const client = await getClient();
    try {
      await client.query(
        'INSERT INTO "Quote" (id, "pickupLat", "pickupLon", "destLat", "destLon", amount, surge, currency, "expiresAt", "createdAt") VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)',
        [quoteId, pickup.lat, pickup.lon, dest.lat, dest.lon, amount, surge, 'USD', expiresAt, new Date()]
      );
    } catch (err) {
      console.log('Quote table may not exist');
    }
    await client.end();

    return success({
      id: quoteId,
      amount,
      surge,
      currency: 'USD',
      expiresAt: expiresAt.toISOString(),
      etaMinutes
    });
  } catch (err) {
    console.error('Error:', err);
    return error('Internal server error');
  }
};
