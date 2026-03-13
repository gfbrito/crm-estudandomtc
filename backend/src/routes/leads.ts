import { Router, Request, Response } from 'express';
import { prisma } from '../config/prisma.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// GET /api/leads
router.get('/', authMiddleware, async (req: Request, res: Response) => {
    try {
        const { search, temperature, stage, page, pageSize } = req.query;
        const where: any = {};

        if (search) {
            where.OR = [
                { name: { contains: search as string, mode: 'insensitive' } },
                { primary_email: { contains: search as string, mode: 'insensitive' } },
                { whatsapp: { contains: search as string } },
            ];
        }
        if (temperature) where.temperature = temperature;
        if (stage) where.stage = stage;

        const skip = page ? (Number(page) - 1) * Number(pageSize || 50) : undefined;
        const take = pageSize ? Number(pageSize) : undefined;

        const [leads, total] = await Promise.all([
            prisma.leads.findMany({
                where,
                orderBy: { created_at: 'desc' },
                skip,
                take,
            }),
            prisma.leads.count({ where }),
        ]);

        res.json({ data: leads, total });
    } catch (error) {
        console.error('Error fetching leads:', error);
        res.status(500).json({ error: 'Erro ao buscar leads' });
    }
});

// GET /api/leads/:id
router.get('/:id', authMiddleware, async (req: Request, res: Response) => {
    try {
        const lead = await prisma.leads.findUnique({ where: { id: req.params.id } });
        if (!lead) { res.status(404).json({ error: 'Lead não encontrado' }); return; }
        res.json(lead);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar lead' });
    }
});

// POST /api/leads
router.post('/', authMiddleware, async (req: Request, res: Response) => {
    try {
        const lead = await prisma.leads.create({ data: req.body });
        res.status(201).json(lead);
    } catch (error) {
        console.error('Error creating lead:', error);
        res.status(500).json({ error: 'Erro ao criar lead' });
    }
});

// PUT /api/leads/:id
router.put('/:id', authMiddleware, async (req: Request, res: Response) => {
    try {
        const lead = await prisma.leads.update({
            where: { id: req.params.id },
            data: { ...req.body, updated_at: new Date() },
        });
        res.json(lead);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao atualizar lead' });
    }
});

// DELETE /api/leads/:id
router.delete('/:id', authMiddleware, async (req: Request, res: Response) => {
    try {
        await prisma.leads.delete({ where: { id: req.params.id } });
        res.json({ message: 'Lead removido' });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao remover lead' });
    }
});

export default router;
