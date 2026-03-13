import { Router, Request, Response } from 'express';
import { prisma } from '../config/prisma.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// GET /api/dashboard/stats
router.get('/stats', authMiddleware, async (_req: Request, res: Response) => {
    try {
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const weekStart = new Date(todayStart.getTime() - todayStart.getDay() * 86400000);
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

        const [salesToday, salesWeek, salesMonth, totalLeads, pendingNotifications, recentSales] = await Promise.all([
            prisma.sales.findMany({ where: { purchased_at: { gte: todayStart }, status: 'approved' } }),
            prisma.sales.findMany({ where: { purchased_at: { gte: weekStart }, status: 'approved' } }),
            prisma.sales.findMany({ where: { purchased_at: { gte: monthStart }, status: 'approved' } }),
            prisma.leads.count(),
            prisma.notifications.count({ where: { read: false } }),
            prisma.sales.findMany({
                take: 10,
                orderBy: { purchased_at: 'desc' },
                include: { leads: { select: { name: true } }, products: { select: { name: true } } },
            }),
        ]);

        const sum = (arr: any[]) => arr.reduce((acc, s) => acc + Number(s.amount || 0), 0);

        res.json({
            salesToday: { count: salesToday.length, amount: sum(salesToday) },
            salesWeek: { count: salesWeek.length, amount: sum(salesWeek) },
            salesMonth: { count: salesMonth.length, amount: sum(salesMonth) },
            totalLeads,
            pendingNotifications,
            recentSales,
        });
    } catch (error) {
        console.error('Dashboard stats error:', error);
        res.status(500).json({ error: 'Erro ao buscar métricas' });
    }
});

// GET /api/dashboard/leads-overview
router.get('/leads-overview', authMiddleware, async (_req: Request, res: Response) => {
    try {
        const leads = await prisma.leads.findMany({ select: { temperature: true, stage: true } });

        const byTemperature = { hot: 0, warm: 0, cold: 0, inactive: 0 };
        const byStage = { lead: 0, buyer: 0, recurring: 0, vip: 0 };

        leads.forEach(l => {
            if (l.temperature in byTemperature) byTemperature[l.temperature as keyof typeof byTemperature]++;
            if (l.stage in byStage) byStage[l.stage as keyof typeof byStage]++;
        });

        res.json({ byTemperature, byStage, total: leads.length });
    } catch (error) {
        res.status(500).json({ error: 'Erro interno' });
    }
});

// GET /api/dashboard/recent-activity
router.get('/recent-activity', authMiddleware, async (_req: Request, res: Response) => {
    try {
        const entries = await prisma.timeline.findMany({
            take: 20,
            orderBy: { created_at: 'desc' },
            include: { leads: { select: { name: true } } },
        });
        res.json(entries);
    } catch (error) {
        res.status(500).json({ error: 'Erro interno' });
    }
});

export default router;
