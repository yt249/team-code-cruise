import { PaymentIntent, PaymentStatus } from '@prisma/client'
import { prisma } from '../workbench/prisma.js'
import { getMemoryDb } from '../workbench/memoryDb.js'
import { isMemoryMode } from '../workbench/runtimeConfig.js'

export type PaymentIntentRecord = {
  id: string
  rideId: string
  amount: number
  status: PaymentStatus
  method: string | null
  createdAt: Date
  updatedAt: Date
}

type PaymentIntentRepo = {
  findByRideId(rideId: string): Promise<PaymentIntentRecord | null>
  findById(id: string): Promise<PaymentIntentRecord | null>
  create(data: { id: string; rideId: string; amount: number; status: PaymentStatus }): Promise<PaymentIntentRecord>
  update(id: string, patch: Partial<{ status: PaymentStatus; method: string | null }>): Promise<PaymentIntentRecord>
}

const PrismaPaymentIntentRepository: PaymentIntentRepo = {
  async findByRideId(rideId) {
    const intent = await prisma.paymentIntent.findUnique({ where: { rideId } })
    return intent ? normalize(intent) : null
  },
  async findById(id) {
    const intent = await prisma.paymentIntent.findUnique({ where: { id } })
    return intent ? normalize(intent) : null
  },
  async create(data) {
    const intent = await prisma.paymentIntent.create({ data })
    return normalize(intent)
  },
  async update(id, patch) {
    const intent = await prisma.paymentIntent.update({ where: { id }, data: patch })
    return normalize(intent)
  }
}

const MemoryPaymentIntentRepository: PaymentIntentRepo = {
  async findByRideId(rideId) {
    const db = getMemoryDb()
    const match = Array.from(db.paymentIntents.values()).find((intent) => intent.rideId === rideId)
    return match ? { ...match, method: match.method ?? null } : null
  },
  async findById(id) {
    const db = getMemoryDb()
    const intent = db.paymentIntents.get(id)
    return intent ? { ...intent, method: intent.method ?? null } : null
  },
  async create(data) {
    const db = getMemoryDb()
    const intent = {
      id: data.id,
      rideId: data.rideId,
      amount: data.amount,
      status: data.status,
      method: null as string | null,
      createdAt: new Date(),
      updatedAt: new Date()
    }
    db.paymentIntents.set(intent.id, intent)
    return intent
  },
  async update(id, patch) {
    const db = getMemoryDb()
    const intent = db.paymentIntents.get(id)
    if (!intent) throw new Error('PaymentIntent not found')
    const updated = {
      ...intent,
      ...patch,
      updatedAt: new Date()
    }
    db.paymentIntents.set(id, updated)
    return { ...updated, method: updated.method ?? null }
  }
}

function normalize(intent: PaymentIntent): PaymentIntentRecord {
  return {
    id: intent.id,
    rideId: intent.rideId,
    amount: intent.amount,
    status: intent.status,
    method: intent.method ?? null,
    createdAt: intent.createdAt,
    updatedAt: intent.updatedAt
  }
}

export const PaymentIntentRepository: PaymentIntentRepo = isMemoryMode()
  ? MemoryPaymentIntentRepository
  : PrismaPaymentIntentRepository
