const { getClient } = require('./shared/db');
const { verifyToken } = require('./shared/auth');
const { success, error, unauthorized, notFound } = require('./shared/response');

exports.handler = async (event) => {
  try {
    const decoded = verifyToken(event);
    if (!decoded) return unauthorized();

    const client = await getClient();
    const result = await client.query(
      'SELECT id, name, email, rating, "createdAt" FROM "User" WHERE id = $1',
      [decoded.sub]
    );
    await client.end();

    if (result.rows.length === 0) {
      return notFound('User not found');
    }

    return success(result.rows[0]);
  } catch (err) {
    console.error('Error:', err);
    return error('Internal server error');
  }
};
