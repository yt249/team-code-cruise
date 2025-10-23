import { AdStatus } from '@prisma/client'
import { prisma } from '../workbench/prisma.js'
import { getMemoryDb, MemoryAdSession } from '../workbench/memoryDb.js'
import { isMemoryMode } from '../workbench/runtimeConfig.js'

export type AdSessionRecord = {
  id: string
  riderId: string
  percent: number
  provider: string
  status: AdStatus
  startedAt: Date | null
  completedAt: Date | null
  playbackEvents: Record<string, string>
  expiresAt: Date
  createdAt: Date
  tokenId: string | null
}

type CreateInput = {
  id: string
  riderId: string
  percent: number
  provider: string
  status: AdStatus
  playbackEvents: Record<string, string>
  expiresAt: Date
  startedAt?: Date | null
  completedAt?: Date | null
}

type UpdateInput = Partial<{
  status: AdStatus
  startedAt: Date | null
  completedAt: Date | null
  playbackEvents: Record<string, string>
  tokenId: string | null
}>

interface AdSessionRepo {
  save(input: CreateInput): Promise<AdSessionRecord>
  findById(id: string): Promise<AdSessionRecord | null>
  update(id: string, patch: UpdateInput): Promise<AdSessionRecord>
}

const PrismaAdSessionRepository: AdSessionRepo = {
  async save(input) {
    const session = await prisma.adSession.create({
      data: {
        id: input.id,
        riderId: input.riderId,
        percent: input.percent,
        provider: input.provider,
        status: input.status,
        startedAt: input.startedAt ?? null,
        completedAt: input.completedAt ?? null,
        playbackEvents: input.playbackEvents,
        expiresAt: input.expiresAt
      }
    })
    return mapPrismaSession(session)
  },

  async findById(id) {
    const session = await prisma.adSession.findUnique({
      where: { id },
      include: { token: true }
    })
    return session ? mapPrismaSession(session) : null
  },

  async update(id, patch) {
    const session = await prisma.adSession.update({
      where: { id },
      data: {
        status: patch.status,
        startedAt: patch.startedAt,
        completedAt: patch.completedAt,
        playbackEvents: patch.playbackEvents,
        token: patch.tokenId
          ? {
              connect: { id: patch.tokenId }
            }
          : patch.tokenId === null
            ? { disconnect: true }
            : undefined
      },
      include: { token: true }
    })
    return mapPrismaSession(session)
  }
}

const MemoryAdSessionRepository: AdSessionRepo = {
  async save(input) {
    const db = getMemoryDb()
    const session: MemoryAdSession = {
      id: input.id,
      riderId: input.riderId,
      percent: input.percent,
      provider: input.provider,
      status: input.status,
      startedAt: input.startedAt ?? null,
      completedAt: input.completedAt ?? null,
      playbackEvents: { ...input.playbackEvents },
      expiresAt: input.expiresAt,
      createdAt: new Date(),
      tokenId: null
    }
    db.adSessions.set(session.id, session)
    return mapMemorySession(session)
  },

  async findById(id) {
    const db = getMemoryDb()
    const session = db.adSessions.get(id)
    return session ? mapMemorySession(session) : null
  },

  async update(id, patch) {
    const db = getMemoryDb()
    const session = db.adSessions.get(id)
    if (!session) throw new Error('Ad session not found')
    const updated: MemoryAdSession = {
      ...session,
      status: patch.status ?? session.status,
      startedAt: patch.startedAt !== undefined ? patch.startedAt : session.startedAt,
      completedAt: patch.completedAt !== undefined ? patch.completedAt : session.completedAt,
      playbackEvents: patch.playbackEvents ? { ...patch.playbackEvents } : session.playbackEvents,
      tokenId: patch.tokenId !== undefined ? patch.tokenId : session.tokenId
    }
    db.adSessions.set(id, updated)
    return mapMemorySession(updated)
  }
}

function mapPrismaSession(session: any): AdSessionRecord {
  return {
    id: session.id,
    riderId: session.riderId,
    percent: session.percent,
    provider: session.provider,
    status: session.status,
    startedAt: session.startedAt,
    completedAt: session.completedAt,
    playbackEvents: session.playbackEvents ?? {},
    expiresAt: session.expiresAt,
    createdAt: session.createdAt,
    tokenId: session.token?.id ?? null
  }
}

function mapMemorySession(session: MemoryAdSession): AdSessionRecord {
  return {
    id: session.id,
    riderId: session.riderId,
    percent: session.percent,
    provider: session.provider,
    status: session.status as AdStatus,
    startedAt: session.startedAt,
    completedAt: session.completedAt,
    playbackEvents: { ...session.playbackEvents },
    expiresAt: session.expiresAt,
    createdAt: session.createdAt,
    tokenId: session.tokenId
  }
}

export const AdSessionRepository: AdSessionRepo = isMemoryMode()
  ? MemoryAdSessionRepository
  : PrismaAdSessionRepository
