/** @jest-environment node */

// Mock auth token provider; individual tests can override return values
jest.mock('../src/services/authService', () => ({
  getAuthToken: jest.fn(() => 'test-token')
}))

const { getAuthToken } = require('../src/services/authService')

// Utility to create a fetch-like Response mock
const mockResponse = (status, jsonBody) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => jsonBody
})

// Ensure a stable Date.now for assertions involving createdAt
const FIXED_NOW = 1700000000000

describe('advertisementService', () => {
  let adService

  beforeAll(() => {
    jest.useFakeTimers().setSystemTime(FIXED_NOW)
  })

  beforeEach(() => {
    global.fetch = jest.fn()
    // default to authenticated unless a test overrides
    getAuthToken.mockReturnValue('test-token')
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  test('handleResponse returns JSON on ok responses', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce(mockResponse(200, { a: 1 }))
    adService = require('../src/services/advertisementService').adService
    const result = await adService.checkEligibility()
    expect(result).toEqual({ a: 1 })
  })

  test('handleResponse maps 401 to auth error', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce(mockResponse(401, { error: 'ignored' }))
    adService = require('../src/services/advertisementService').adService
    await expect(adService.checkEligibility()).rejects.toThrow('Session expired. Please log in again.')
  })

  test('handleResponse maps 409 with cooldownEndsAt to message containing time', async () => {
    const cooldownEndsAt = '2030-01-01T00:00:00Z'
    global.fetch = jest.fn().mockResolvedValueOnce(
      mockResponse(409, { cooldownEndsAt })
    )
    adService = require('../src/services/advertisementService').adService
    await expect(adService.checkEligibility()).rejects.toThrow('Please wait until')
  })

  test('handleResponse maps 410 to session expired', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce(mockResponse(410, {}))
    adService = require('../src/services/advertisementService').adService
    await expect(adService.checkEligibility()).rejects.toThrow('This ad session has expired.')
  })

  test('handleResponse uses server error message when present', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce(mockResponse(500, { error: 'X' }))
    adService = require('../src/services/advertisementService').adService
    await expect(adService.checkEligibility()).rejects.toThrow('X')
  })

  test('checkEligibility requires auth token', async () => {
    getAuthToken.mockReturnValue(null)
    adService = require('../src/services/advertisementService').adService
    await expect(adService.checkEligibility()).rejects.toThrow('Authentication required')
    expect(global.fetch).not.toHaveBeenCalled()
  })

  test('checkEligibility sends GET with auth and returns body', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce(mockResponse(200, { isEligible: true }))
    adService = require('../src/services/advertisementService').adService
    const result = await adService.checkEligibility()
    expect(result).toEqual({ isEligible: true })
    expect(global.fetch).toHaveBeenCalledTimes(1)
    const [url, init] = global.fetch.mock.calls[0]
    expect(url).toMatch(/\/ads\/eligibility$/)
    expect(init.headers.Authorization).toBe('Bearer test-token')
  })

  test('createSession normalizes response fields', async () => {
    const server = {
      sessionId: 's1', provider: 'Acme', percent: 15, expiresAt: '2030-01-01T00:00:00Z'
    }
    global.fetch = jest.fn().mockResolvedValueOnce(mockResponse(200, server))
    adService = require('../src/services/advertisementService').adService
    const result = await adService.createSession(15)
    expect(result).toMatchObject({
      id: 's1', sessionId: 's1', provider: 'Acme', percent: 15, discountPercentage: 15, status: 'Offered'
    })
    expect(typeof result.expiresAt).toBe('number')
    expect(result.createdAt).toBe(FIXED_NOW)
  })

  test('recordPlayback without timestamp sends minimal body', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce(mockResponse(200, { ok: true }))
    adService = require('../src/services/advertisementService').adService
    await adService.recordPlayback('s1', 'start')
    const [, init] = global.fetch.mock.calls[0]
    const body = JSON.parse(init.body)
    expect(body).toEqual({ sessionId: 's1', event: 'start' })
  })

  test('recordPlayback with timestamp includes ISO ts', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce(mockResponse(200, { ok: true }))
    adService = require('../src/services/advertisementService').adService
    const ts = new Date('2030-01-01T00:00:00Z')
    await adService.recordPlayback('s1', '50%', ts)
    const [, init] = global.fetch.mock.calls[0]
    const body = JSON.parse(init.body)
    expect(body.ts).toBe('2030-01-01T00:00:00.000Z')
  })

  test('completeSession normalizes token', async () => {
    const server = { tokenId: 't1', expiresAt: '2030-01-01T00:00:00Z' }
    global.fetch = jest.fn().mockResolvedValueOnce(mockResponse(200, server))
    adService = require('../src/services/advertisementService').adService
    const result = await adService.completeSession('s1')
    expect(result).toMatchObject({ tokenId: 't1', id: 't1' })
    expect(typeof result.expiresAt).toBe('number')
    expect(result.createdAt).toBe(FIXED_NOW)
  })

  test('recordStart delegates to recordPlayback("start")', async () => {
    adService = require('../src/services/advertisementService').adService
    const spy = jest.spyOn(adService, 'recordPlayback').mockResolvedValueOnce({ ok: true })
    await adService.recordStart('s1')
    expect(spy).toHaveBeenCalledTimes(1)
    const args = spy.mock.calls[0]
    expect(args[0]).toBe('s1')
    expect(args[1]).toBe('start')
    expect(args[2]).toBeInstanceOf(Date)
  })

  test('recordQuartile validates input and delegates', async () => {
    adService = require('../src/services/advertisementService').adService
    const spy = jest.spyOn(adService, 'recordPlayback').mockResolvedValueOnce({ ok: true })
    await adService.recordQuartile('s', '25%')
    expect(spy).toHaveBeenCalledWith('s', '25%', expect.any(Date))
  })

  test('recordQuartile rejects invalid quartile', async () => {
    adService = require('../src/services/advertisementService').adService
    await expect(adService.recordQuartile('s', '10%')).rejects.toThrow('Invalid quartile: 10%')
  })

  test('recordComplete delegates to recordPlayback("complete")', async () => {
    adService = require('../src/services/advertisementService').adService
    const spy = jest.spyOn(adService, 'recordPlayback').mockResolvedValueOnce({ ok: true })
    await adService.recordComplete('s1')
    expect(spy).toHaveBeenCalledWith('s1', 'complete', expect.any(Date))
  })
})
