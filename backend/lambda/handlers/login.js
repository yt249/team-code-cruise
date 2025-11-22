const bcrypt = require('bcryptjs');
const { getClient } = require('../shared/db');
const { signToken } = require('../shared/auth');
const { success, error, badRequest } = require('../shared/response');

exports.handler = async (event) => {
  try {
    const body = JSON.parse(event.body || '{}');
    const { email, password } = body;

    if (!email || !password) {
      return badRequest('Email and password required');
    }

    const client = await getClient();
    const result = await client.query('SELECT * FROM "User" WHERE email = $1', [email]);
    await client.end();

    if (result.rows.length === 0) {
      return error('Invalid credentials', 401);
    }

    const user = result.rows[0];
    const isValid = await bcrypt.compare(password, user.password);

    if (!isValid) {
      return error('Invalid credentials', 401);
    }

    const token = signToken({ sub: user.id, role: user.role });
    return success({ token });
  } catch (err) {
    console.error('Error:', err);
    return error('Internal server error');
  }
};
