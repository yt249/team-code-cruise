import { TokenState } from '@prisma/client'
import { prisma } from '../workbench/prisma.js'
import { getMemoryDb, MemoryDiscountToken } from '../workbench/memoryDb.js'
import { isMemoryMode } from '../workbench/runtimeConfig.js'

export type DiscountTokenRecord = {
  id: string
  riderId: string
  percent: number
  state: TokenState
  quoteId: string | null
  expiresAt: Date
  redeemedRideId: string | null
  createdAt: Date
  sessionId: string
}

type MintInput = {
  id: string
  riderId: string
  percent: number
  quoteId: string | null
  expiresAt: Date
  sessionId: string
}

type UpdateInput = Partial<{
  state: TokenState
  quoteId: string | null
  expiresAt: Date
  redeemedRideId: string | null
}>

interface DiscountTokenRepo {
  mint(input: MintInput): Promise<DiscountTokenRecord>
  findById(id: string): Promise<DiscountTokenRecord | null>
  findActiveById(id: string): Promise<DiscountTokenRecord | null>
  update(id: string, patch: UpdateInput): Promise<DiscountTokenRecord>
}

const PrismaDiscountTokenRepository: DiscountTokenRepo = {
  async mint(input) {
    const token = await prisma.discountToken.create({
      data: {
        id: input.id,
        riderId: input.riderId,
        percent: input.percent,
        quoteId: input.quoteId,
        expiresAt: input.expiresAt,
        sessionId: input.sessionId
      }
    })
    return mapPrismaToken(token)
  },

  async findById(id) {
    const token = await prisma.discountToken.findUnique({ where: { id } })
    return token ? mapPrismaToken(token) : null
  },

  async findActiveById(id) {
    const token = await prisma.discountToken.findUnique({ where: { id } })
    if (!token) return null
    if (token.state !== TokenState.ACTIVE) return null
    if (token.expiresAt.getTime() < Date.now()) {
      await prisma.discountToken.update({
        where: { id },
        data: { state: TokenState.EXPIRED }
      })
      return null
    }
    return mapPrismaToken(token)
  },

  async update(id, patch) {
    const token = await prisma.discountToken.update({
      where: { id },
      data: {
        state: patch.state,
        quoteId: patch.quoteId,
        expiresAt: patch.expiresAt,
        redeemedRideId: patch.redeemedRideId
      }
    })
    return mapPrismaToken(token)
  }
}

const MemoryDiscountTokenRepository: DiscountTokenRepo = {
  async mint(input) {
    const db = getMemoryDb()
    const token: MemoryDiscountToken = {
      id: input.id,
      riderId: input.riderId,
      percent: input.percent,
      state: 'ACTIVE',
      quoteId: input.quoteId,
      expiresAt: input.expiresAt,
      redeemedRideId: null,
      createdAt: new Date(),
      sessionId: input.sessionId
    }
    db.discountTokens.set(token.id, token)
    return mapMemoryToken(token)
  },

  async findById(id) {
    const db = getMemoryDb()
    const token = db.discountTokens.get(id)
    return token ? mapMemoryToken(token) : null
  },

  async findActiveById(id) {
    const db = getMemoryDb()
    const token = db.discountTokens.get(id)
    if (!token) return null
    if (token.state !== 'ACTIVE') return null
    if (token.expiresAt.getTime() < Date.now()) {
      db.discountTokens.set(id, { ...token, state: 'EXPIRED' })
      return null
    }
    return mapMemoryToken(token)
  },

  async update(id, patch) {
    const db = getMemoryDb()
    const token = db.discountTokens.get(id)
    if (!token) throw new Error('Discount token not found')
    const updated: MemoryDiscountToken = {
      ...token,
      state: (patch.state ?? token.state) as MemoryDiscountToken['state'],
      quoteId: patch.quoteId ?? token.quoteId,
      expiresAt: patch.expiresAt ?? token.expiresAt,
      redeemedRideId: patch.redeemedRideId ?? token.redeemedRideId
    }
    db.discountTokens.set(id, updated)
    return mapMemoryToken(updated)
  }
}

function mapPrismaToken(token: any): DiscountTokenRecord {
  return {
    id: token.id,
    riderId: token.riderId,
    percent: token.percent,
    state: token.state,
    quoteId: token.quoteId,
    expiresAt: token.expiresAt,
    redeemedRideId: token.redeemedRideId,
    createdAt: token.createdAt,
    sessionId: token.sessionId
  }
}

function mapMemoryToken(token: MemoryDiscountToken): DiscountTokenRecord {
  return {
    id: token.id,
    riderId: token.riderId,
    percent: token.percent,
    state: token.state as TokenState,
    quoteId: token.quoteId,
    expiresAt: token.expiresAt,
    redeemedRideId: token.redeemedRideId,
    createdAt: token.createdAt,
    sessionId: token.sessionId
  }
}

export const DiscountTokenRepository: DiscountTokenRepo = isMemoryMode()
  ? MemoryDiscountTokenRepository
  : PrismaDiscountTokenRepository
