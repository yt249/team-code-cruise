#!/usr/bin/env node
/**
 * Seed drivers into PostgreSQL database
 * Run with: node seed-drivers.js
 */

const { Client } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL || "postgresql://codecruise_admin:CodeCruise2024%21SecurePass@codecruise-db.czwcgwu8yzh8.us-east-2.rds.amazonaws.com:5432/codecruise";

const drivers = [
  {
    id: 'd1000000-0000-0000-0000-000000000001',
    name: 'John Smith',
    rating: 4.9,
    vehicleId: 'v1000000-0000-0000-0000-000000000001',
    vehicle: { make: 'Toyota', model: 'Camry', plate: 'ABC-123', type: 'SEDAN' }
  },
  {
    id: 'd1000000-0000-0000-0000-000000000002',
    name: 'Maria Garcia',
    rating: 4.8,
    vehicleId: 'v1000000-0000-0000-0000-000000000002',
    vehicle: { make: 'Honda', model: 'Accord', plate: 'XYZ-456', type: 'SEDAN' }
  },
  {
    id: 'd1000000-0000-0000-0000-000000000003',
    name: 'David Chen',
    rating: 4.7,
    vehicleId: 'v1000000-0000-0000-0000-000000000003',
    vehicle: { make: 'Ford', model: 'Fusion', plate: 'DEF-789', type: 'SEDAN' }
  },
  {
    id: 'd1000000-0000-0000-0000-000000000004',
    name: 'Sarah Johnson',
    rating: 4.9,
    vehicleId: 'v1000000-0000-0000-0000-000000000004',
    vehicle: { make: 'Chevrolet', model: 'Malibu', plate: 'GHI-012', type: 'SEDAN' }
  },
  {
    id: 'd1000000-0000-0000-0000-000000000005',
    name: 'Michael Brown',
    rating: 4.6,
    vehicleId: 'v1000000-0000-0000-0000-000000000005',
    vehicle: { make: 'Nissan', model: 'Altima', plate: 'JKL-345', type: 'SEDAN' }
  }
];

async function seedDrivers() {
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    console.log('Connecting to database...');
    await client.connect();
    console.log('✅ Connected');

    // Check existing drivers
    const countResult = await client.query('SELECT COUNT(*) as count FROM "Driver"');
    const existingCount = parseInt(countResult.rows[0].count);
    console.log(`\nFound ${existingCount} existing drivers in database`);

    // Insert drivers
    for (const driver of drivers) {
      try {
        // Insert driver
        await client.query(`
          INSERT INTO "Driver" (id, name, rating, status)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (id) DO UPDATE
          SET name = EXCLUDED.name, rating = EXCLUDED.rating, status = EXCLUDED.status
        `, [driver.id, driver.name, driver.rating, 'AVAILABLE']);

        // Insert vehicle
        await client.query(`
          INSERT INTO "Vehicle" (id, make, model, plate, type, "driverId")
          VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT (plate) DO UPDATE
          SET make = EXCLUDED.make, model = EXCLUDED.model, type = EXCLUDED.type, "driverId" = EXCLUDED."driverId"
        `, [driver.vehicleId, driver.vehicle.make, driver.vehicle.model, driver.vehicle.plate, driver.vehicle.type, driver.id]);

        console.log(`✅ Seeded driver: ${driver.name} (${driver.vehicle.make} ${driver.vehicle.model})`);
      } catch (err) {
        console.error(`❌ Failed to seed ${driver.name}:`, err.message);
      }
    }

    // Verify
    const finalCount = await client.query('SELECT COUNT(*) as count FROM "Driver"');
    console.log(`\n✅ Total drivers in database: ${finalCount.rows[0].count}`);

    // List all drivers
    const allDrivers = await client.query(`
      SELECT d.id, d.name, d.rating, d.status, v.make, v.model, v.plate
      FROM "Driver" d
      LEFT JOIN "Vehicle" v ON v."driverId" = d.id
      ORDER BY d.name
    `);

    console.log('\n📋 All drivers:');
    allDrivers.rows.forEach(d => {
      const vehicle = d.make ? `${d.make} ${d.model} (${d.plate})` : 'No vehicle';
      console.log(`  - ${d.name} (${d.rating}⭐) - ${vehicle} - ${d.status}`);
    });

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
    console.log('\n✅ Database connection closed');
  }
}

seedDrivers();
