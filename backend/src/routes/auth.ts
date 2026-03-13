import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../config/prisma.js';
import { generateToken, authMiddleware, masterOnly } from '../middleware/auth.js';

const router = Router();

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            res.status(400).json({ error: 'Email e senha são obrigatórios' });
            return;
        }

        const user = await prisma.users.findUnique({ where: { email } });
        if (!user) {
            res.status(401).json({ error: 'Credenciais inválidas' });
            return;
        }

        const valid = await bcrypt.compare(password, user.password_hash);
        if (!valid) {
            res.status(401).json({ error: 'Credenciais inválidas' });
            return;
        }

        const token = generateToken({ userId: user.id, email: user.email, role: user.role });

        res.json({
            token,
            user: { id: user.id, email: user.email, name: user.name, role: user.role, createdAt: user.created_at }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Erro interno' });
    }
});

// GET /api/auth/me
router.get('/me', authMiddleware, async (req: Request, res: Response) => {
    try {
        const user = await prisma.users.findUnique({ where: { id: req.user!.userId } });
        if (!user) { res.status(404).json({ error: 'Usuário não encontrado' }); return; }

        res.json({ id: user.id, email: user.email, name: user.name, role: user.role, createdAt: user.created_at });
    } catch (error) {
        res.status(500).json({ error: 'Erro interno' });
    }
});

// POST /api/auth/register (master only)
router.post('/register', authMiddleware, masterOnly, async (req: Request, res: Response) => {
    try {
        const { email, password, name, role } = req.body;
        if (!email || !password || !name) {
            res.status(400).json({ error: 'Email, senha e nome são obrigatórios' });
            return;
        }

        const existing = await prisma.users.findUnique({ where: { email } });
        if (existing) { res.status(409).json({ error: 'Email já cadastrado' }); return; }

        const password_hash = await bcrypt.hash(password, 10);
        const user = await prisma.users.create({
            data: { email, password_hash, name, role: role || 'viewer' }
        });

        res.status(201).json({ id: user.id, email: user.email, name: user.name, role: user.role });
    } catch (error) {
        res.status(500).json({ error: 'Erro interno' });
    }
});

// GET /api/auth/users (master only — list all users)
router.get('/users', authMiddleware, masterOnly, async (_req: Request, res: Response) => {
    try {
        const users = await prisma.users.findMany({
            select: { id: true, email: true, name: true, role: true, created_at: true },
            orderBy: { created_at: 'desc' }
        });
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: 'Erro interno' });
    }
});

// DELETE /api/auth/users/:id (master only)
router.delete('/users/:id', authMiddleware, masterOnly, async (req: Request, res: Response) => {
    try {
        if (req.params.id === req.user!.userId) {
            res.status(400).json({ error: 'Não é possível deletar seu próprio usuário' });
            return;
        }
        await prisma.users.delete({ where: { id: req.params.id } });
        res.json({ message: 'Usuário removido' });
    } catch (error) {
        res.status(500).json({ error: 'Erro interno' });
    }
});

export default router;
