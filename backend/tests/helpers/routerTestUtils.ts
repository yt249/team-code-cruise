import type { Router, RequestHandler } from 'express'
import { errorHandler } from '../../src/server/errorHandler.js'

export type ExecuteRouteOptions = {
  body?: any
  headers?: Record<string, string>
  params?: Record<string, string>
  query?: Record<string, string>
}

type MockResponse = {
  statusCode: number
  body: any
  headers: Record<string, string>
  finished: boolean
  locals: Record<string, any>
  status: (code: number) => MockResponse
  json: (payload: any) => MockResponse
  send: (payload: any) => MockResponse
  setHeader: (name: string, value: string) => MockResponse
}

function normalizeHeaders(headers?: Record<string, string>) {
  const normalized: Record<string, string> = {}
  if (!headers) return normalized
  for (const [key, value] of Object.entries(headers)) {
    normalized[key.toLowerCase()] = value
  }
  return normalized
}

function createRequest(
  method: string,
  path: string,
  opts: ExecuteRouteOptions = {}
) {
  const headers = normalizeHeaders(opts.headers)
  return {
    method: method.toUpperCase(),
    url: path,
    path,
    originalUrl: path,
    headers,
    body: opts.body ?? {},
    params: opts.params ?? {},
    query: opts.query ?? {},
    user: undefined,
    get(name: string) {
      return headers[name.toLowerCase()]
    },
    header(name: string) {
      return headers[name.toLowerCase()]
    }
  }
}

function createResponse(): MockResponse {
  const headers: Record<string, string> = {}
  return {
    statusCode: 200,
    body: undefined,
    headers,
    finished: false,
    locals: {},
    status(code: number) {
      this.statusCode = code
      return this
    },
    json(payload: any) {
      this.body = payload
      this.finished = true
      return this
    },
    send(payload: any) {
      this.body = payload
      this.finished = true
      return this
    },
    setHeader(name: string, value: string) {
      headers[name.toLowerCase()] = value
      return this
    }
  }
}

function resolveHandlers(router: Router, method: string, path: string) {
  const stack = (router as any).stack as Array<any>
  const layer = stack.find(
    (entry) =>
      entry.route &&
      entry.route.path === path &&
      entry.route.methods?.[method.toLowerCase()]
  )
  if (!layer) {
    throw new Error(`Route ${method} ${path} not found on router`)
  }
  return layer.route.stack.map((entry: any) => entry.handle as RequestHandler)
}

export async function executeRouterRoute(
  router: Router,
  method: string,
  path: string,
  options: ExecuteRouteOptions = {}
) {
  const handlers = resolveHandlers(router, method, path)
  const req = createRequest(method, path, options)
  const res = createResponse()

  for (const handler of handlers) {
    try {
      await new Promise<void>((resolve, reject) => {
        let settled = false
        const finish = () => {
          if (!settled) {
            settled = true
            resolve()
          }
        }
        const fail = (err: unknown) => {
          if (!settled) {
            settled = true
            reject(err)
          }
        }

        const result = handler(
          req as any,
          res as any,
          (err?: unknown) => (err ? fail(err) : finish())
        )

        if (result && typeof (result as Promise<void>).then === 'function') {
          ;(result as Promise<void>).then(() => finish()).catch(fail)
        } else if (handler.length < 3 || res.finished) {
          finish()
        }
      })
    } catch (err) {
      errorHandler(err, req as any, res as any, () => {})
      break
    }

    if (res.finished) break
  }

  return { status: res.statusCode, body: res.body, headers: res.headers }
}
