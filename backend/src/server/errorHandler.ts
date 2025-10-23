import { NextFunction, Request, Response } from 'express'
import { ZodError } from 'zod'

export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction) {
  console.error(err)
  const status = err.status || (err instanceof ZodError ? 400 : 500)
  const payload =
    err instanceof ZodError
      ? { error: 'Invalid request payload', details: err.errors }
      : { error: err.message || 'Internal Server Error' }
  res.status(status).json(payload)
}
