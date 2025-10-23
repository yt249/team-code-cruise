import { NextFunction, Request, Response } from 'express'
import jwt from 'jsonwebtoken'

type JwtPayload = { sub: string; role: string }

export class AuthService {
  static required(req: Request, res: Response, next: NextFunction) {
    try {
      const payload = AuthService.verify(req)
      if (!payload) return res.status(401).json({ error: 'Missing Authorization' })
      ;(req as any).user = payload
      next()
    } catch (err) {
      console.error(err)
      return res.status(401).json({ error: 'Invalid token' })
    }
  }

  static optional(req: Request, _res: Response, next: NextFunction) {
    try {
      const payload = AuthService.verify(req)
      if (payload) (req as any).user = payload
    } catch {
      // ignore optional auth failures
    }
    next()
  }

  static requireRole(role: string) {
    return (req: Request, res: Response, next: NextFunction) => {
      if (!req.user || req.user.role !== role) return res.status(403).json({ error: 'Forbidden' })
      next()
    }
  }

  private static verify(req: Request): JwtPayload | null {
    const hdr = req.headers.authorization
    if (!hdr) return null
    const token = hdr.replace('Bearer ', '')
    const secret = process.env.JWT_SECRET || 'secret'
    return jwt.verify(token, secret) as JwtPayload
  }
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload
    }
  }
}
