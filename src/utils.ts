import { LatLng } from './types.js';
export function haversineKm(a: LatLng, b: LatLng){
  const R = 6371;
  const toRad = (d:number)=> d*Math.PI/180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const s = Math.sin(dLat/2)**2 + Math.cos(toRad(a.lat))*Math.cos(toRad(b.lat))*Math.sin(dLon/2)**2;
  return 2*R*Math.asin(Math.sqrt(s));
}
export function nowISO(){ return new Date().toISOString(); }