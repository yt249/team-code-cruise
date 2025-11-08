/** @jest-environment node */

jest.mock('../src/services/authService', () => ({
  getAuthToken: jest.fn(() => 'test-token')
}))

const { getAuthToken } = require('../src/services/authService')

const mockResponse = (status, jsonBody) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => jsonBody
})

describe('rideService', () => {
  let rideService

  beforeEach(() => {
    global.fetch = jest.fn()
    // default to authenticated unless a test overrides
    getAuthToken.mockReturnValue('test-token')
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  test('handleResponse returns JSON on ok', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce(mockResponse(200, { a: 1 }))
    rideService = require('../src/services/rideService').rideService
    const result = await rideService.getQuote({ lat: 0, lng: 0 }, { lat: 0, lng: 0 })
    expect(result).toBeDefined()
  })

  test('handleResponse 401 → auth error', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce(mockResponse(401, {}))
    rideService = require('../src/services/rideService').rideService
    await expect(rideService.getRide('r1')).rejects.toThrow('Session expired. Please log in again.')
  })

  test('handleResponse 403 → forbidden', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce(mockResponse(403, {}))
    rideService = require('../src/services/rideService').rideService
    await expect(rideService.getRide('r1')).rejects.toThrow('You do not have permission to perform this action.')
  })

  test('handleResponse 404 → not found', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce(mockResponse(404, {}))
    rideService = require('../src/services/rideService').rideService
    await expect(rideService.getRide('r1')).rejects.toThrow('Resource not found.')
  })

  test('handleResponse 409 → server error message shown', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce(mockResponse(409, { error: 'E' }))
    rideService = require('../src/services/rideService').rideService
    await expect(rideService.getRide('r1')).rejects.toThrow('E')
  })

  test('handleResponse 410 → expired', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce(mockResponse(410, {}))
    rideService = require('../src/services/rideService').rideService
    await expect(rideService.getRide('r1')).rejects.toThrow('This resource has expired.')
  })

  test('getQuote maps frontend → backend coords and optional auth header', async () => {
    const server = { id: 'q1', amount: 1234, surge: 1.2, currency: 'USD', etaMinutes: 5, expiresAt: '2030-01-01T00:00:00Z' }
    global.fetch = jest.fn().mockResolvedValueOnce(mockResponse(200, server))
    rideService = require('../src/services/rideService').rideService
    const result = await rideService.getQuote({ lat: 1, lng: 2 }, { lat: 3, lng: 4 })
    // Request body shape
    const [, init] = global.fetch.mock.calls[0]
    const body = JSON.parse(init.body)
    expect(body).toEqual({ pickup: { lat: 1, lon: 2 }, dest: { lat: 3, lon: 4 } })
    // Response mapping
    expect(result.baseFare).toBeCloseTo(12.34)
    expect(result.fare).toBeCloseTo(12.34)
    expect(typeof result.expiresAt).toBe('number')
  })

  test('getQuote with tokenId requires auth', async () => {
    getAuthToken.mockReturnValue(null) // no auth for all calls in this test
    rideService = require('../src/services/rideService').rideService
    await expect(rideService.getQuote({ lat: 1, lng: 2 }, { lat: 3, lng: 4 }, 'tk1')).rejects.toThrow('Authentication required to use discount token')
    expect(global.fetch).not.toHaveBeenCalled()
  })

  test('createRide requires auth', async () => {
    getAuthToken.mockReturnValue(null)
    rideService = require('../src/services/rideService').rideService
    await expect(rideService.createRide({ lat: 1, lng: 2 }, { lat: 3, lng: 4 }, 'q1')).rejects.toThrow('Authentication required')
    expect(global.fetch).not.toHaveBeenCalled()
  })

  test('createRide adds tokenId and transforms response including STATUS_MAP', async () => {
    const server = {
      id: 'r1', riderId: 'u1', driverId: 'd1', status: 'DRIVER_EN_ROUTE',
      pickup: { lat: 1, lon: 2 }, dest: { lat: 3, lon: 4 },
      fareAmount: 2000, discountedAmount: 1500, surge: '1.3', currency: 'USD',
      driver: { id: 'd1', name: 'Driver', rating: 4.5, phone: '123', vehicle: null, location: { lat: 10, lon: 20 } },
      startedAt: '2030-01-01T00:00:00Z', completedAt: null, createdAt: '2030-01-01T00:00:00Z'
    }
    global.fetch = jest.fn().mockResolvedValueOnce(mockResponse(200, server))
    rideService = require('../src/services/rideService').rideService
    const result = await rideService.createRide({ lat: 1, lng: 2 }, { lat: 3, lng: 4 }, 'q1', 'tk1')
    // Request included tokenId
    const [, init] = global.fetch.mock.calls[0]
    const body = JSON.parse(init.body)
    expect(body.tokenId).toBe('tk1')
    // Response mapping assertions
    expect(result.status).toBe('DriverEnRoute')
    expect(result.baseFare).toBe(20)
    expect(result.finalFare).toBe(15)
    expect(result.driver.location).toEqual({ lat: 10, lng: 20 })
  })

  test('getRide requires auth', async () => {
    getAuthToken.mockReturnValue(null)
    rideService = require('../src/services/rideService').rideService
    await expect(rideService.getRide('r1')).rejects.toThrow('Authentication required')
    expect(global.fetch).not.toHaveBeenCalled()
  })

  test('getRide transforms destination key to dropoff with lng', async () => {
    const server = {
      id: 'r1', riderId: 'u1', driverId: 'd1', status: 'COMPLETED',
      pickup: { lat: 1, lon: 2 }, destination: { lat: 3, lon: 4 },
      fareAmount: 1000, discountedAmount: null, surge: '1.0', currency: 'USD',
      driver: null, startedAt: null, completedAt: '2030-01-01T00:00:00Z', createdAt: '2030-01-01T00:00:00Z'
    }
    global.fetch = jest.fn().mockResolvedValueOnce(mockResponse(200, server))
    rideService = require('../src/services/rideService').rideService
    const result = await rideService.getRide('r1')
    expect(result.dropoff).toEqual({ lat: 3, lng: 4 })
  })

  test('cancelRide requires auth', async () => {
    getAuthToken.mockReturnValue(null)
    rideService = require('../src/services/rideService').rideService
    await expect(rideService.cancelRide('r1')).rejects.toThrow('Authentication required')
    expect(global.fetch).not.toHaveBeenCalled()
  })

  test('completeRide requires auth', async () => {
    getAuthToken.mockReturnValue(null)
    rideService = require('../src/services/rideService').rideService
    await expect(rideService.completeRide('r1')).rejects.toThrow('Authentication required')
    expect(global.fetch).not.toHaveBeenCalled()
  })
})
