const { getClient } = require('../shared/db');
const { verifyToken } = require('../shared/auth');
const { success, error, unauthorized } = require('../shared/response');

exports.handler = async (event) => {
  try {
    const decoded = verifyToken(event);
    if (!decoded) return unauthorized();

    const client = await getClient();
    const result = await client.query("UPDATE \"Driver\" SET status = 'AVAILABLE'");
    await client.end();

    return success({
      message: 'Test data reset successfully',
      driversReset: result.rowCount
    });
  } catch (err) {
    console.error('Error:', err);
    return error('Internal server error');
  }
};
