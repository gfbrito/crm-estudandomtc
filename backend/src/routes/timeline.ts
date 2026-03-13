import { Router, Request, Response } from 'express';
import { prisma } from '../config/prisma.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// GET /api/timeline/:leadId
router.get('/:leadId', authMiddleware, async (req: Request, res: Response) => {
    try {
        const entries = await prisma.timeline.findMany({
            where: { lead_id: req.params.leadId },
            orderBy: { created_at: 'desc' },
        });
        res.json(entries);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar timeline' });
    }
});

// POST /api/timeline
router.post('/', authMiddleware, async (req: Request, res: Response) => {
    try {
        const entry = await prisma.timeline.create({
            data: {
                ...req.body,
                created_by: req.user!.userId,
                created_by_name: req.body.created_by_name,
            },
        });
        res.status(201).json(entry);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao criar entrada na timeline' });
    }
});

export default router;
