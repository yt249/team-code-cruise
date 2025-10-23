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
            driverLocations: new Map()
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
    if (seed)
        seedMemoryDb();
}
export function seedMemoryDb() {
    if (!memoryDb)
        throw new Error('Memory DB not initialized');
    const riderId = randomUUID();
    const driverId = randomUUID();
    const vehicleId = randomUUID();
    const passwordHash = bcrypt.hashSync('ride1234', 10);
    memoryDb.users.set(riderId, {
        id: riderId,
        name: 'Test Rider',
        email: 'rider@example.com',
        password: passwordHash,
        rating: 4.9,
        createdAt: new Date()
    });
    memoryDb.drivers.set(driverId, {
        id: driverId,
        name: 'Driver One',
        rating: 4.8,
        status: 'AVAILABLE',
        vehicleId
    });
    memoryDb.vehicles.set(vehicleId, {
        id: vehicleId,
        make: 'Toyota',
        model: 'Prius',
        plate: 'TEST-123',
        type: 'SEDAN',
        driverId
    });
    memoryDb.driverLocations.set(driverId, { lat: 37.7749, lon: -122.4194, available: true });
}
