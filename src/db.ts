import Database from 'better-sqlite3';
import path from 'node:path';

const dbFile = path.join(process.cwd(), 'data.sqlite');
export const db = new Database(dbFile);


db.pragma('journal_mode = wal');

export function initSchema(){
  db.exec(`
  create table if not exists users (
    id text primary key,
    name text not null,
    role text not null
  );
  create table if not exists drivers (
    id text primary key,
    name text not null,
    lat real not null,
    lon real not null,
    status text not null
  );
  create table if not exists rides (
    id text primary key,
    rider_id text not null,
    driver_id text,
    pickup_lat real not null,
    pickup_lon real not null,
    dest_lat real not null,
    dest_lon real not null,
    status text not null,
    fare_amount integer not null,
    surge real not null,
    currency text not null,
    started_at text,
    completed_at text,
    created_at text not null,
    discount_percent integer,
    discounted_amount integer,
    discount_token_id text
  );
  create table if not exists payment_intents (
    id text primary key,
    ride_id text not null unique,
    amount integer not null,
    status text not null,
    method text,
    created_at text not null,
    updated_at text not null
  );
  `);
}