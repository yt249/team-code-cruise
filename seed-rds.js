// Seed RDS database with initial data
const { Client } = require('pg');
const bcrypt = require('bcryptjs');
const { randomUUID } = require('crypto');

const DATABASE_URL = 'postgresql://codecruise_admin:CodeCruise2024!SecurePass@codecruise-db.czwcgwu8yzh8.us-east-2.rds.amazonaws.com:5432/codecruise';

async function seed() {
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: {
      rejectUnauthorized: false,
      checkServerIdentity: () => undefined
    }
  });

  try {
    await client.connect();
    console.log('Connected to RDS');

    // Create test rider
    console.log('Creating test rider...');
    const riderId = randomUUID();
    const passwordHash = await bcrypt.hash('ride1234', 10);

    await client.query(`
      INSERT INTO "User" (id, name, email, password, rating, "createdAt")
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (email) DO NOTHING
    `, [riderId, 'Test Rider', 'rider@example.com', passwordHash, 4.9, new Date()]);
    console.log('✅ Test rider created: rider@example.com / ride1234');

    // Create 5 drivers with vehicles
    const drivers = [
      { name: 'John Smith', lat: 37.7749, lng: -122.4194, make: 'Toyota', model: 'Camry', plate: 'ABC-123', rating: 4.8 },
      { name: 'Maria Garcia', lat: 37.7875, lng: -122.4075, make: 'Honda', model: 'Accord', plate: 'XYZ-456', rating: 4.9 },
      { name: 'David Chen', lat: 37.7599, lng: -122.4148, make: 'Ford', model: 'Fusion', plate: 'DEF-789', rating: 4.7 },
      { name: 'Sarah Johnson', lat: 37.7919, lng: -122.3993, make: 'Chevrolet', model: 'Malibu', plate: 'GHI-012', rating: 4.6 },
      { name: 'Michael Brown', lat: 37.7750, lng: -122.4183, make: 'Nissan', model: 'Altima', plate: 'JKL-345', rating: 4.8 }
    ];

    console.log('Creating drivers and vehicles...');
    for (const driver of drivers) {
      const driverId = randomUUID();
      const vehicleId = randomUUID();

      // Create driver
      await client.query(`
        INSERT INTO "Driver" (id, name, rating, status)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT DO NOTHING
      `, [driverId, driver.name, driver.rating, 'AVAILABLE']);

      // Create vehicle
      await client.query(`
        INSERT INTO "Vehicle" (id, make, model, plate, type, "driverId")
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (plate) DO NOTHING
      `, [vehicleId, driver.make, driver.model, driver.plate, 'SEDAN', driverId]);

      console.log(`✅ Created driver: ${driver.name} (${driver.plate})`);
    }

    console.log('\n=== Database Seeded Successfully! ===');
    console.log('Test Credentials:');
    console.log('  Email: rider@example.com');
    console.log('  Password: ride1234');
    console.log('\nDrivers available:', drivers.length);

  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

seed();
