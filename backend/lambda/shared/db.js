const { Client } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL;

async function getClient() {
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false, checkServerIdentity: () => undefined }
  });
  await client.connect();
  return client;
}

module.exports = { getClient };
