import { Router, Request, Response } from 'express';
import { prisma } from '../config/prisma.js';
import { authMiddleware, masterOnly } from '../middleware/auth.js';

const router = Router();

// GET /api/mass-messages
router.get('/', authMiddleware, async (_req: Request, res: Response) => {
    try {
        const messages = await prisma.mass_messages.findMany({ orderBy: { created_at: 'desc' } });
        res.json(messages);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar mensagens' });
    }
});

// POST /api/mass-messages
router.post('/', authMiddleware, masterOnly, async (req: Request, res: Response) => {
    try {
        const message = await prisma.mass_messages.create({
            data: { ...req.body, created_by: req.user!.userId },
        });
        res.status(201).json(message);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao criar mensagem' });
    }
});

// PUT /api/mass-messages/:id/cancel
router.put('/:id/cancel', authMiddleware, masterOnly, async (req: Request, res: Response) => {
    try {
        await prisma.mass_messages.update({
            where: { id: req.params.id },
            data: { status: 'cancelled' },
        });
        res.json({ message: 'Mensagem cancelada' });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao cancelar mensagem' });
    }
});

// DELETE /api/mass-messages/:id
router.delete('/:id', authMiddleware, masterOnly, async (req: Request, res: Response) => {
    try {
        await prisma.mass_messages.delete({ where: { id: req.params.id } });
        res.json({ message: 'Mensagem removida' });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao remover mensagem' });
    }
});

export default router;
