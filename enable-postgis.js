// Enable PostGIS extension on RDS
const { Client } = require('pg');

const DATABASE_URL = 'postgresql://codecruise_admin:CodeCruise2024!SecurePass@codecruise-db.czwcgwu8yzh8.us-east-2.rds.amazonaws.com:5432/codecruise';

async function enablePostGIS() {
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false } // RDS requires SSL
  });

  try {
    console.log('Connecting to RDS...');
    await client.connect();
    console.log('Connected!');

    console.log('Enabling PostGIS extension...');
    await client.query('CREATE EXTENSION IF NOT EXISTS postgis;');
    console.log('✅ PostGIS extension enabled!');

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

enablePostGIS();
