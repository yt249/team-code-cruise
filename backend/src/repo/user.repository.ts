import { User } from '@prisma/client'
import { prisma } from '../workbench/prisma.js'
import { getMemoryDb } from '../workbench/memoryDb.js'
import { isMemoryMode } from '../workbench/runtimeConfig.js'

type UserShape = Pick<User, 'id' | 'name' | 'email' | 'password' | 'rating' | 'createdAt'>

type UserRepo = {
  findById(id: string): Promise<UserShape | null>
  findByEmail(email: string): Promise<UserShape | null>
}

const PrismaUserRepository: UserRepo = {
  async findById(id: string) {
    return prisma.user.findUnique({ where: { id } })
  },
  async findByEmail(email: string) {
    return prisma.user.findUnique({ where: { email } })
  }
}

const MemoryUserRepository: UserRepo = {
  async findById(id: string) {
    const db = getMemoryDb()
    return db.users.get(id) ?? null
  },
  async findByEmail(email: string) {
    const db = getMemoryDb()
    for (const user of db.users.values()) {
      if (user.email === email) return user
    }
    return null
  }
}

export const UserRepository: UserRepo = isMemoryMode() ? MemoryUserRepository : PrismaUserRepository
