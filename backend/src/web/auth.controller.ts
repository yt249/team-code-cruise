import { Router } from 'express'
import { z } from 'zod'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { AuthService } from '../shared/auth.service.js'
import { UserRepository } from '../repo/user.repository.js'
import { isMemoryMode } from '../workbench/runtimeConfig.js'
import { resetMemoryDb } from '../workbench/memoryDb.js'
import { EligibilityService } from '../ad/eligibility.service.js'
import { QuoteStore } from '../workbench/quoteStore.js'

export const authRouter = Router()

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
})

authRouter.post('/login', async (req, res) => {
  const { email, password } = loginSchema.parse(req.body)
  const user = await UserRepository.findByEmail(email)
  if (!user) return res.status(401).json({ error: 'Invalid credentials' })

  const ok = await bcrypt.compare(password, user.password)
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' })

  const secret = process.env.JWT_SECRET || 'secret'
  const token = jwt.sign({ sub: user.id, role: 'rider' }, secret, { expiresIn: '7d' })
  res.json({ token })
})

authRouter.get('/me', AuthService.required, async (req, res) => {
  const user = await UserRepository.findById(req.user!.sub)
  if (!user) return res.status(404).json({ error: 'User not found' })

  res.json({
    id: user.id,
    name: user.name,
    email: user.email,
    rating: user.rating,
    createdAt: user.createdAt
  })
})

// Test-only helper to reset in-memory state for local integration tests
authRouter.post('/reset-test-data', AuthService.required, async (_req, res) => {
  if (!isMemoryMode()) {
    return res.status(501).json({ error: 'Reset only supported in memory mode' })
  }

  resetMemoryDb({ seed: true })
  EligibilityService.clear()
  await QuoteStore.clear()

  return res.json({ ok: true })
})
