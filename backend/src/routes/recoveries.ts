import { Router, Request, Response } from 'express';
import { prisma } from '../config/prisma.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// GET /api/recoveries
router.get('/', authMiddleware, async (_req: Request, res: Response) => {
    try {
        const recoveries = await prisma.recoveries.findMany({
            include: { leads: { select: { name: true, whatsapp: true, primary_email: true } } },
            orderBy: { created_at: 'desc' },
        });
        res.json(recoveries);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar recuperações' });
    }
});

// PUT /api/recoveries/:id
router.put('/:id', authMiddleware, async (req: Request, res: Response) => {
    try {
        const recovery = await prisma.recoveries.update({
            where: { id: req.params.id },
            data: { ...req.body, updated_at: new Date() },
        });
        res.json(recovery);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao atualizar recuperação' });
    }
});

export default router;
