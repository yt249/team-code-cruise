import { prisma } from '../workbench/prisma.js';
import { getMemoryDb } from '../workbench/memoryDb.js';
import { isMemoryMode } from '../workbench/runtimeConfig.js';
const PrismaUserRepository = {
    async findById(id) {
        return prisma.user.findUnique({ where: { id } });
    },
    async findByEmail(email) {
        return prisma.user.findUnique({ where: { email } });
    }
};
const MemoryUserRepository = {
    async findById(id) {
        const db = getMemoryDb();
        return db.users.get(id) ?? null;
    },
    async findByEmail(email) {
        const db = getMemoryDb();
        for (const user of db.users.values()) {
            if (user.email === email)
                return user;
        }
        return null;
    }
};
export const UserRepository = isMemoryMode() ? MemoryUserRepository : PrismaUserRepository;
