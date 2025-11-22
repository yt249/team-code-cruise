#!/usr/bin/env node
/**
 * Clean database and seed fresh drivers
 * Run with: node clean-and-seed.js
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

async function cleanAndSeed() {
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

    // Check existing data
    const rideCount = await client.query('SELECT COUNT(*) as count FROM "Ride"');
    const driverCount = await client.query('SELECT COUNT(*) as count FROM "Driver"');
    const vehicleCount = await client.query('SELECT COUNT(*) as count FROM "Vehicle"');

    console.log('\n📊 Current database state:');
    console.log(`  Rides: ${rideCount.rows[0].count}`);
    console.log(`  Drivers: ${driverCount.rows[0].count}`);
    console.log(`  Vehicles: ${vehicleCount.rows[0].count}`);

    // Clean vehicles and drivers (cascade will handle rides)
    console.log('\n🧹 Cleaning database...');
    await client.query('DELETE FROM "Vehicle"');
    console.log('  ✅ Deleted all vehicles');
    await client.query('DELETE FROM "Driver"');
    console.log('  ✅ Deleted all drivers');

    // Seed fresh drivers
    console.log('\n🌱 Seeding fresh drivers...');
    for (const driver of drivers) {
      // Insert driver
      await client.query(`
        INSERT INTO "Driver" (id, name, rating, status)
        VALUES ($1, $2, $3, $4)
      `, [driver.id, driver.name, driver.rating, 'AVAILABLE']);

      // Insert vehicle
      await client.query(`
        INSERT INTO "Vehicle" (id, make, model, plate, type, "driverId")
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [driver.vehicleId, driver.vehicle.make, driver.vehicle.model, driver.vehicle.plate, driver.vehicle.type, driver.id]);

      console.log(`  ✅ ${driver.name} (${driver.vehicle.make} ${driver.vehicle.model})`);
    }

    // Verify final state
    const finalDrivers = await client.query(`
      SELECT d.id, d.name, d.rating, d.status, v.make, v.model, v.plate
      FROM "Driver" d
      LEFT JOIN "Vehicle" v ON v."driverId" = d.id
      ORDER BY d.name
    `);

    console.log('\n✅ Final database state:');
    console.log(`  Total drivers: ${finalDrivers.rows.length}`);
    console.log('\n📋 Driver list:');
    finalDrivers.rows.forEach(d => {
      const vehicle = `${d.make} ${d.model} (${d.plate})`;
      console.log(`  ${d.name} - ${vehicle} - ${d.rating}⭐ - ${d.status}`);
    });

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await client.end();
    console.log('\n✅ Done!');
  }
}

cleanAndSeed();
