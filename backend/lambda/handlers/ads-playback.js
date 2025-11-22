const { getClient } = require('./shared/db');
const { verifyToken } = require('./shared/auth');
const { success, error, unauthorized, notFound, badRequest } = require('./shared/response');

exports.handler = async (event) => {
  try {
    const decoded = verifyToken(event);
    if (!decoded) return unauthorized();

    const body = JSON.parse(event.body || '{}');
    const { sessionId, event: playbackEvent } = body;

    if (!sessionId || !playbackEvent) {
      return badRequest('sessionId and event required');
    }

    const client = await getClient();
    try {
      const result = await client.query('SELECT * FROM "AdSession" WHERE id = $1', [sessionId]);
      if (result.rows.length > 0) {
        const session = result.rows[0];
        const events = JSON.parse(session.playbackEvents || '[]');
        events.push({ event: playbackEvent, timestamp: new Date().toISOString() });

        let newStatus = session.status;
        if (playbackEvent === 'start') newStatus = 'WATCHING';

        await client.query(
          'UPDATE "AdSession" SET "playbackEvents" = $1, status = $2 WHERE id = $3',
          [JSON.stringify(events), newStatus, sessionId]
        );
      }
    } catch (dbErr) {
      console.log('AdSession table may not exist');
    }
    await client.end();

    return success({ recorded: true });
  } catch (err) {
    console.error('Error:', err);
    return error('Internal server error');
  }
};
