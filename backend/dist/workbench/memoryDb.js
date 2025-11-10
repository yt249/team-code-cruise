import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
let memoryDb = null;
export function initMemoryDb({ seed = true } = {}) {
    if (!memoryDb) {
        memoryDb = {
            users: new Map(),
            drivers: new Map(),
            vehicles: new Map(),
            rides: new Map(),
            paymentIntents: new Map(),
            driverLocations: new Map(),
            adSessions: new Map(),
            discountTokens: new Map()
        };
    }
    else {
        resetMemoryDb({ seed: false });
    }
    if (seed)
        seedMemoryDb();
    return memoryDb;
}
export function getMemoryDb() {
    if (!memoryDb)
        throw new Error('Memory DB not initialized. Call initMemoryDb() first.');
    return memoryDb;
}
export function resetMemoryDb({ seed = true } = {}) {
    if (!memoryDb)
        return;
    memoryDb.users.clear();
    memoryDb.drivers.clear();
    memoryDb.vehicles.clear();
    memoryDb.rides.clear();
    memoryDb.paymentIntents.clear();
    memoryDb.driverLocations.clear();
    memoryDb.adSessions.clear();
    memoryDb.discountTokens.clear();
    if (seed)
        seedMemoryDb();
}
export function seedMemoryDb() {
    if (!memoryDb)
        throw new Error('Memory DB not initialized');
    // Create test rider
    const riderId = randomUUID();
    const passwordHash = bcrypt.hashSync('ride1234', 10);
    memoryDb.users.set(riderId, {
        id: riderId,
        name: 'Test Rider',
        email: 'rider@example.com',
        password: passwordHash,
        rating: 4.9,
        createdAt: new Date()
    });
    // Create 5 drivers with different vehicles and locations
    const drivers = [
        {
            name: 'John Smith',
            rating: 4.9,
            vehicle: { make: 'Toyota', model: 'Camry', plate: 'ABC-123', type: 'SEDAN' },
            location: { lat: 40.4443, lon: -79.9436 } // CMU Campus
        },
        {
            name: 'Maria Garcia',
            rating: 4.8,
            vehicle: { make: 'Honda', model: 'Accord', plate: 'XYZ-456', type: 'SEDAN' },
            location: { lat: 40.4506, lon: -79.9859 } // Oakland Pittsburgh
        },
        {
            name: 'David Chen',
            rating: 4.7,
            vehicle: { make: 'Ford', model: 'Fusion', plate: 'DEF-789', type: 'SEDAN' },
            location: { lat: 40.4306, lon: -80.0059 } // South Side Pittsburgh
        },
        {
            name: 'Sarah Johnson',
            rating: 4.9,
            vehicle: { make: 'Chevrolet', model: 'Malibu', plate: 'GHI-012', type: 'SEDAN' },
            location: { lat: 40.4606, lon: -79.9759 } // Shadyside Pittsburgh
        },
        {
            name: 'Michael Brown',
            rating: 4.6,
            vehicle: { make: 'Nissan', model: 'Altima', plate: 'JKL-345', type: 'SEDAN' },
            location: { lat: 40.4206, lon: -80.0159 } // West End Pittsburgh
        }
    ];
    drivers.forEach(({ name, rating, vehicle, location }) => {
        const driverId = randomUUID();
        const vehicleId = randomUUID();
        memoryDb.drivers.set(driverId, {
            id: driverId,
            name,
            rating,
            status: 'AVAILABLE',
            vehicleId
        });
        memoryDb.vehicles.set(vehicleId, {
            id: vehicleId,
            make: vehicle.make,
            model: vehicle.model,
            plate: vehicle.plate,
            type: vehicle.type,
            driverId
        });
        memoryDb.driverLocations.set(driverId, {
            lat: location.lat,
            lon: location.lon,
            available: true
        });
    });
}
