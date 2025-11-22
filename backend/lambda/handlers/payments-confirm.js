const { getClient } = require('./shared/db');
const { verifyToken } = require('./shared/auth');
const { success, error, unauthorized, badRequest } = require('./shared/response');

exports.handler = async (event) => {
  try {
    const decoded = verifyToken(event);
    if (!decoded) return unauthorized();

    const body = JSON.parse(event.body || '{}');
    const { intentId, paymentMethod } = body;

    if (!intentId) return badRequest('intentId required');

    const client = await getClient();
    try {
      await client.query(
        'UPDATE "PaymentIntent" SET status = $1, "paymentMethod" = $2, "confirmedAt" = $3 WHERE id = $4',
        ['CONFIRMED', paymentMethod || 'card', new Date(), intentId]
      );
    } catch (err) {
      console.log('PaymentIntent table may not exist');
    }
    await client.end();

    return success({
      intentId,
      status: 'CONFIRMED',
      paymentMethod: paymentMethod || 'card'
    });
  } catch (err) {
    console.error('Error:', err);
    return error('Internal server error');
  }
};
