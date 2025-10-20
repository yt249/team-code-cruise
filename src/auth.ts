import jwt from 'jsonwebtoken';
import { UserProfile } from './types.js';

env();
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

export function env(){ /* noop to declare dotenv-like env if needed */ }

export function signToken(user: UserProfile){
  return jwt.sign(user, JWT_SECRET, { expiresIn: '7d' });
}
export function verifyToken(token: string): UserProfile{
  return jwt.verify(token, JWT_SECRET) as UserProfile;
}

// Middleware
import type { Request, Response, NextFunction } from 'express';
export function requireAuth(req: Request, res: Response, next: NextFunction){
  const h = req.header('authorization');
  if(!h) return res.status(401).json({error:'missing Authorization'});
  const m = h.split(' ');
  try{
    (req as any).user = verifyToken(m[1]);
    next();
  }catch(e){
    return res.status(401).json({error:'invalid token'});
  }
}