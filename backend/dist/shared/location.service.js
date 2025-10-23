export class LocationService {
    static async eta(pickup, dest) {
        const dx = dest.lat - pickup.lat;
        const dy = dest.lon - pickup.lon;
        const dist = Math.sqrt(dx * dx + dy * dy);
        return Math.max(3, Math.round(dist * 120));
    }
}
