import { Router, Request, Response } from 'express';
import { prisma } from '../config/prisma.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// GET /api/sales
router.get('/', authMiddleware, async (_req: Request, res: Response) => {
    try {
        const sales = await prisma.sales.findMany({
            include: { leads: { select: { name: true, primary_email: true } }, products: { select: { name: true } } },
            orderBy: { created_at: 'desc' },
        });
        res.json(sales);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar vendas' });
    }
});

// POST /api/sales
router.post('/', authMiddleware, async (req: Request, res: Response) => {
    try {
        const sale = await prisma.sales.create({ data: req.body });
        res.status(201).json(sale);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao criar venda' });
    }
});

// GET /api/sales/by-lead/:leadId
router.get('/by-lead/:leadId', authMiddleware, async (req: Request, res: Response) => {
    try {
        const sales = await prisma.sales.findMany({
            where: { lead_id: req.params.leadId },
            include: { products: { select: { name: true } } },
            orderBy: { purchased_at: 'desc' },
        });
        res.json(sales);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar vendas do lead' });
    }
});

// GET /api/sales/buyers
router.get('/buyers', authMiddleware, async (req: Request, res: Response) => {
    try {
        const productIdsStr = req.query.productIds as string;
        if (!productIdsStr) {
            res.json([]);
            return;
        }

        const productIds = productIdsStr.split(',');
        const sales = await prisma.sales.findMany({
            where: {
                product_id: { in: productIds },
                status: 'approved',
            },
            select: { lead_id: true }
        });
        
        const leadIds = Array.from(new Set(sales.map(s => s.lead_id)));
        res.json(leadIds);
    } catch (error) {
        console.error('Error fetching buyers:', error);
        res.status(500).json({ error: 'Erro ao buscar compradores' });
    }
});

export default router;
