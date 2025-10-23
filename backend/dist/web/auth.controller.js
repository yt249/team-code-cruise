import { Router } from 'express';
import { z } from 'zod';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { AuthService } from '../shared/auth.service.js';
import { UserRepository } from '../repo/user.repository.js';
export const authRouter = Router();
const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6)
});
authRouter.post('/login', async (req, res) => {
    const { email, password } = loginSchema.parse(req.body);
    const user = await UserRepository.findByEmail(email);
    if (!user)
        return res.status(401).json({ error: 'Invalid credentials' });
    const ok = await bcrypt.compare(password, user.password);
    if (!ok)
        return res.status(401).json({ error: 'Invalid credentials' });
    const secret = process.env.JWT_SECRET || 'secret';
    const token = jwt.sign({ sub: user.id, role: 'rider' }, secret, { expiresIn: '7d' });
    res.json({ token });
});
authRouter.get('/me', AuthService.required, async (req, res) => {
    const user = await UserRepository.findById(req.user.sub);
    if (!user)
        return res.status(404).json({ error: 'User not found' });
    res.json({
        id: user.id,
        name: user.name,
        email: user.email,
        rating: user.rating,
        createdAt: user.createdAt
    });
});
