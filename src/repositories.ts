import { db } from './db.js';
import { Driver, PaymentIntent, Ride, UUID } from './types.js';
import { nowISO } from './utils.js';

export const UsersRepo = {
  upsert(u: {id:UUID,name:string,role:string}){
    db.prepare('insert into users(id,name,role) values(?,?,?) on conflict(id) do update set name=excluded.name, role=excluded.role').run(u.id,u.name,u.role);
  },
  findById(id:UUID){ return db.prepare('select id,name,role from users where id=?').get(id) as any; }
};

export const DriversRepo = {
  allAvailable(){ return db.prepare('select * from drivers where status=?').all('AVAILABLE') as Driver[] },
  updateLocation(id:UUID, lat:number, lon:number){ db.prepare('update drivers set lat=?, lon=? where id=?').run(lat,lon,id); },
  seed(){
    const rows = db.prepare('select count(*) c from drivers').get() as any;
    if(rows.c===0){
      const sample: Driver[] = [
        {id:'drv-ny-1', name:'Alice', lat:40.758, lon:-73.9855, status:'AVAILABLE'},
        {id:'drv-ny-2', name:'Bob', lat:40.7306, lon:-73.9866, status:'AVAILABLE'},
        {id:'drv-ny-3', name:'Cathy', lat:40.7128, lon:-74.0060, status:'AVAILABLE'}
      ];
      const stmt = db.prepare('insert into drivers(id,name,lat,lon,status) values (?,?,?,?,?)');
      db.transaction(()=> sample.forEach(d=> stmt.run(d.id,d.name,d.lat,d.lon,d.status)))();
    }
  }
};

export const RidesRepo = {
  insert(r: Ride){
    db.prepare(`insert into rides(id,rider_id,driver_id,pickup_lat,pickup_lon,dest_lat,dest_lon,status,fare_amount,surge,currency,started_at,completed_at,created_at,discount_percent,discounted_amount,discount_token_id)
      values(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
      r.id,r.rider_id,r.driver_id,r.pickup.lat,r.pickup.lon,r.destination.lat,r.destination.lon,r.status,r.fare_amount,r.surge,r.currency,r.started_at,r.completed_at,r.created_at,r.discount_percent??null,r.discounted_amount??null,r.discount_token_id??null
    );
  },
  get(id:UUID){ const row = db.prepare('select * from rides where id=?').get(id) as any; return row && rowToRide(row); },
  update(id:UUID, patch: Partial<Ride>){
    const cur = this.get(id); if(!cur) return;
    const merged: Ride = {...cur, ...patch};
    db.prepare(`update rides set rider_id=?, driver_id=?, pickup_lat=?, pickup_lon=?, dest_lat=?, dest_lon=?, status=?, fare_amount=?, surge=?, currency=?, started_at=?, completed_at=?, discount_percent=?, discounted_amount=?, discount_token_id=? where id=?`)
      .run(merged.rider_id, merged.driver_id, merged.pickup.lat, merged.pickup.lon, merged.destination.lat, merged.destination.lon, merged.status, merged.fare_amount, merged.surge, merged.currency, merged.started_at, merged.completed_at, merged.discount_percent??null, merged.discounted_amount??null, merged.discount_token_id??null, id);
  }
};

function rowToRide(row:any): Ride{
  return {
    id: row.id,
    rider_id: row.rider_id,
    driver_id: row.driver_id ?? null,
    pickup: { lat: row.pickup_lat, lon: row.pickup_lon },
    destination: { lat: row.dest_lat, lon: row.dest_lon },
    status: row.status,
    fare_amount: row.fare_amount,
    surge: row.surge,
    currency: row.currency,
    started_at: row.started_at,
    completed_at: row.completed_at,
    created_at: row.created_at,
    discount_percent: row.discount_percent,
    discounted_amount: row.discounted_amount,
    discount_token_id: row.discount_token_id,
  };
}

export const PaymentRepo = {
  upsert(pi: PaymentIntent){
    const row = db.prepare('select id from payment_intents where id=?').get(pi.id);
    if(row){ db.prepare('update payment_intents set amount=?, status=?, method=?, updated_at=? where id=?').run(pi.amount,pi.status,pi.method,nowISO(),pi.id); }
    else { db.prepare('insert into payment_intents(id,ride_id,amount,status,method,created_at,updated_at) values(?,?,?,?,?,?,?)').run(pi.id,pi.ride_id,pi.amount,pi.status,pi.method,pi.created_at,pi.updated_at); }
  },
  findByRide(rideId:UUID){ return db.prepare('select * from payment_intents where ride_id=?').get(rideId) as PaymentIntent|undefined; },
  get(id:string){ return db.prepare('select * from payment_intents where id=?').get(id) as PaymentIntent|undefined; }
}
