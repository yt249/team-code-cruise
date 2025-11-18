/** @jest-environment node */

import { authRouter } from '../src/web/auth.controller.ts'
import { initMemoryDb, resetMemoryDb } from '../src/workbench/memoryDb.ts'
import { executeRouterRoute } from './helpers/routerTestUtils'

const TEST_EMAIL = 'rider@example.com'
const TEST_PASSWORD = 'ride1234'

describe('Auth integration', () => {
  let consoleErrorSpy: jest.SpyInstance

  beforeAll(() => {
    initMemoryDb({ seed: true })
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    resetMemoryDb({ seed: true })
  })

  afterAll(() => {
    consoleErrorSpy.mockRestore()
  })

  test('allows a rider to log in and fetch /me with the returned JWT', async () => {
    const login = await executeRouterRoute(authRouter, 'POST', '/login', {
      body: { email: TEST_EMAIL, password: TEST_PASSWORD }
    })

    expect(login.status).toBe(200)
    expect(login.body).toHaveProperty('token')

    const profile = await executeRouterRoute(authRouter, 'GET', '/me', {
      headers: {
        Authorization: `Bearer ${login.body.token}`
      }
    })

    expect(profile.status).toBe(200)
    expect(profile.body).toMatchObject({
      email: TEST_EMAIL,
      id: expect.any(String),
      name: expect.any(String),
      rating: expect.any(Number)
    })
  })

  test('rejects invalid credentials with a 401 error', async () => {
    const response = await executeRouterRoute(authRouter, 'POST', '/login', {
      body: { email: TEST_EMAIL, password: 'wrongpass' }
    })

    expect(response.status).toBe(401)
    expect(response.body).toEqual({ error: 'Invalid credentials' })
  })

  test('returns 401 when /me is called with an invalid token', async () => {
    const response = await executeRouterRoute(authRouter, 'GET', '/me', {
      headers: {
        Authorization: 'Bearer invalid-token'
      }
    })

    expect(response.status).toBe(401)
    expect(response.body).toEqual({ error: 'Invalid token' })
  })
})
