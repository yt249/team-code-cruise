/** @jest-environment node */

const { TokenState } = require('@prisma/client')
const { EventBus } = require('../src/shared/eventBus.ts')
const { DiscountService, __discountInternals } = require('../src/ad/discount.service.ts')
const { DiscountTokenRepository } = require('../src/repo/discountToken.repository.ts')

process.env.RB_DATA_MODE = 'memory'
process.env.JWT_SECRET = 'test-secret'

const baseToken = {
  id: 'token-1',
  riderId: 'rider-1',
  percent: 12,
  quoteId: null,
  expiresAt: new Date(Date.now() + 60_000),
  sessionId: 'session-1',
  state: TokenState.ACTIVE,
  redeemedRideId: null,
  createdAt: new Date()
}

describe('DiscountService', () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  test('mintToken_generatesActiveToken', async () => {
    const mintSpy = jest.spyOn(DiscountTokenRepository, 'mint').mockResolvedValue(baseToken)
    const publishSpy = jest.spyOn(EventBus, 'publish').mockImplementation(() => {})
    const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)

    await DiscountService.mintToken('session-1', 'rider-1', 12)

    expect(mintSpy).toHaveBeenCalledWith(expect.objectContaining({ riderId: 'rider-1', sessionId: 'session-1' }))
    expect(publishSpy).toHaveBeenCalledWith('ads.token.minted', {
      tokenId: baseToken.id,
      riderId: baseToken.riderId,
      percent: baseToken.percent
    })
    const expiresArg = mintSpy.mock.calls[0][0].expiresAt
    expect(expiresArg.getTime()).toBe(1_700_000_000_000 + 15 * 60 * 1000)
    nowSpy.mockRestore()
  })

  test('mintToken_rejectsOutOfRangePercent', async () => {
    await expect(DiscountService.mintToken('session', 'rider', 9)).rejects.toMatchObject({
      message: 'Requested discount percent is out of allowed range',
      status: 400
    })
    await expect(DiscountService.mintToken('session', 'rider', 16)).rejects.toMatchObject({
      message: 'Requested discount percent is out of allowed range',
      status: 400
    })
  })

  test('validateToken_bindQuoteOnFirstUse', async () => {
    const findSpy = jest
      .spyOn(DiscountTokenRepository, 'findActiveById')
      .mockResolvedValue({ ...baseToken, quoteId: null })
    const updateSpy = jest.spyOn(DiscountTokenRepository, 'update').mockResolvedValue({ ...baseToken, quoteId: 'quote-1' })

    const token = await DiscountService.validateToken(baseToken.id, baseToken.riderId, { quoteId: 'quote-1' })

    expect(findSpy).toHaveBeenCalledWith(baseToken.id)
    expect(updateSpy).toHaveBeenCalledWith(baseToken.id, { quoteId: 'quote-1' })
    expect(token.quoteId).toBe('quote-1')
  })

  test('validateToken_rejectsWrongRider', async () => {
    jest.spyOn(DiscountTokenRepository, 'findActiveById').mockResolvedValue(baseToken)
    await expect(DiscountService.validateToken(baseToken.id, 'intruder')).rejects.toMatchObject({
      message: 'Discount token does not belong to rider',
      status: 403
    })
  })

  test('validateToken_rejectsExpired', async () => {
    const expired = { ...baseToken, expiresAt: new Date(Date.now() - 1_000) }
    jest.spyOn(DiscountTokenRepository, 'findActiveById').mockResolvedValue(expired)
    const updateSpy = jest.spyOn(DiscountTokenRepository, 'update').mockResolvedValue(expired)

    await expect(DiscountService.validateToken(expired.id, expired.riderId)).rejects.toMatchObject({
      message: 'Discount token expired',
      status: 410
    })
    expect(updateSpy).toHaveBeenCalledWith(expired.id, { state: TokenState.EXPIRED })
  })

  test('validateToken_rejectsDifferentQuoteBinding', async () => {
    const bound = { ...baseToken, quoteId: 'quote-existing' }
    jest.spyOn(DiscountTokenRepository, 'findActiveById').mockResolvedValue(bound)

    await expect(
      DiscountService.validateToken(bound.id, bound.riderId, { quoteId: 'quote-new' })
    ).rejects.toMatchObject({
      message: 'Discount token already bound to a different quote',
      status: 409
    })
  })

  test('redeemToken_marksRedeemed', async () => {
    jest.spyOn(DiscountTokenRepository, 'findById').mockResolvedValue(baseToken)
    const updateSpy = jest
      .spyOn(DiscountTokenRepository, 'update')
      .mockResolvedValue({ ...baseToken, state: TokenState.REDEEMED, redeemedRideId: 'ride-1' })
    const publishSpy = jest.spyOn(EventBus, 'publish').mockImplementation(() => {})

    const updated = await DiscountService.redeemToken(baseToken.id, 'ride-1', { riderId: baseToken.riderId })

    expect(updateSpy).toHaveBeenCalledWith(baseToken.id, { state: TokenState.REDEEMED, redeemedRideId: 'ride-1' })
    expect(updated.state).toBe(TokenState.REDEEMED)
    expect(publishSpy).toHaveBeenCalledWith('ads.token.redeemed', { tokenId: baseToken.id, rideId: 'ride-1' })
  })

  test('redeemToken_rejectsExpired', async () => {
    const expired = { ...baseToken, expiresAt: new Date(Date.now() - 1000) }
    jest.spyOn(DiscountTokenRepository, 'findById').mockResolvedValue(expired)
    const updateSpy = jest.spyOn(DiscountTokenRepository, 'update').mockResolvedValue(expired)

    await expect(DiscountService.redeemToken(expired.id, 'ride-1')).rejects.toMatchObject({
      message: 'Discount token expired',
      status: 410
    })
    expect(updateSpy).toHaveBeenCalledWith(expired.id, { state: TokenState.EXPIRED })
  })

  test('redeemToken_rejectsWrongRiderContext', async () => {
    jest.spyOn(DiscountTokenRepository, 'findById').mockResolvedValue(baseToken)
    await expect(
      DiscountService.redeemToken(baseToken.id, 'ride-1', { riderId: 'intruder' })
    ).rejects.toMatchObject({
      message: 'Discount token does not belong to rider',
      status: 403
    })
  })

  test('redeemToken_rejectsQuoteMismatch', async () => {
    const bound = { ...baseToken, quoteId: 'quote-a' }
    jest.spyOn(DiscountTokenRepository, 'findById').mockResolvedValue(bound)
    await expect(
      DiscountService.redeemToken(bound.id, 'ride-1', { quoteId: 'quote-b' })
    ).rejects.toMatchObject({
      message: 'Discount token bound to another quote',
      status: 409
    })
  })

  test('fetch_returnsTokenRecord', async () => {
    jest.spyOn(DiscountTokenRepository, 'findById').mockResolvedValue(baseToken)
    const token = await DiscountService.fetch(baseToken.id)
    expect(token).toEqual(baseToken)
  })
})

describe('DiscountService helpers', () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  test('httpError_setsStatus', () => {
    const err = __discountInternals.httpError('Bad', 422)
    expect(err.message).toBe('Bad')
    expect(err.status).toBe(422)
  })

  test('generateUlid_returns26Uppercase', () => {
    jest.spyOn(Date, 'now').mockReturnValue(1_679_000_000_000)
    const randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0.25)

    const id = __discountInternals.generateUlid()

    expect(id).toHaveLength(26)
    expect(id).toMatch(/^[0-9A-Z]+$/)
    expect(id.startsWith('01GVP35NG0')).toBe(true)
    expect(randomSpy).toHaveBeenCalled()
  })

  test('encodeTime_encodesBase32', () => {
    const encoded = __discountInternals.encodeTime(1_679_000_000_000, 10)
    expect(encoded).toBe('01GVP35NG0')
  })

  test('encodeRandom_usesMathRandom', () => {
    const randomSpy = jest
      .spyOn(Math, 'random')
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0.5)
      .mockReturnValueOnce(0.999)
    const encoded = __discountInternals.encodeRandom(3)
    expect(encoded).toBe('0GZ')
    expect(randomSpy).toHaveBeenCalledTimes(3)
  })
})
