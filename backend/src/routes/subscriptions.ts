import { Router, Request, Response } from 'express';
import { prisma } from '../config/prisma.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// GET /api/subscriptions
router.get('/', authMiddleware, async (_req: Request, res: Response) => {
    try {
        const subs = await prisma.subscriptions.findMany({
            include: {
                leads: { select: { name: true, primary_email: true, whatsapp: true } },
                products: { select: { name: true, renewal_link: true } },
            },
            orderBy: { end_date: 'asc' },
        });
        res.json(subs);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar assinaturas' });
    }
});

// PUT /api/subscriptions/:id
router.put('/:id', authMiddleware, async (req: Request, res: Response) => {
    try {
        const sub = await prisma.subscriptions.update({
            where: { id: req.params.id },
            data: { ...req.body, updated_at: new Date() },
        });
        res.json(sub);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao atualizar assinatura' });
    }
});

// POST /api/subscriptions/opt-out (public — no auth, uses token)
router.post('/opt-out', async (req: Request, res: Response) => {
    try {
        const { token, reason } = req.body;
        if (!token) { res.status(400).json({ error: 'Token obrigatório' }); return; }

        const sub = await prisma.subscriptions.findUnique({ where: { opt_out_token: token } });
        if (!sub) { res.status(404).json({ error: 'Assinatura não encontrada' }); return; }

        await prisma.subscriptions.update({
            where: { id: sub.id },
            data: { opted_out: true, opted_out_at: new Date(), opt_out_reason: reason || null, updated_at: new Date() },
        });
        res.json({ message: 'Opt-out realizado com sucesso' });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao processar opt-out' });
    }
});

// GET /api/subscriptions/by-token/:token (public)
router.get('/by-token/:token', async (req: Request, res: Response) => {
    try {
        const sub = await prisma.subscriptions.findUnique({
            where: { opt_out_token: req.params.token },
            include: { products: { select: { name: true } } },
        });
        if (!sub) { res.status(404).json({ error: 'Não encontrado' }); return; }
        res.json(sub);
    } catch (error) {
        res.status(500).json({ error: 'Erro interno' });
    }
});

// GET /api/subscriptions/settings
router.get('/settings', authMiddleware, async (_req: Request, res: Response) => {
    try {
        const settings = await prisma.subscription_settings.findMany({ orderBy: { sort_order: 'asc' } });
        res.json(settings);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar configurações' });
    }
});

// PUT /api/subscriptions/settings (bulk upsert)
router.put('/settings', authMiddleware, async (req: Request, res: Response) => {
    try {
        const items: any[] = req.body;
        for (const item of items) {
            await prisma.subscription_settings.upsert({
                where: { id: item.id },
                update: { days_before: item.days_before, message_template: item.message_template, is_active: item.is_active, sort_order: item.sort_order },
                create: item,
            });
        }
        res.json({ message: 'Configurações salvas' });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao salvar configurações' });
    }
});

// DELETE /api/subscriptions/settings/:id
router.delete('/settings/:id', authMiddleware, async (req: Request, res: Response) => {
    try {
        await prisma.subscription_settings.delete({ where: { id: req.params.id } });
        res.json({ message: 'Step removido' });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao remover step' });
    }
});

// GET /api/subscriptions/stats
router.get('/stats', authMiddleware, async (_req: Request, res: Response) => {
    try {
        const now = new Date();
        const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

        const [total, active, expiringSoon, expired] = await Promise.all([
            prisma.subscriptions.count(),
            prisma.subscriptions.count({ where: { status: 'active', end_date: { gt: now } } }),
            prisma.subscriptions.count({ where: { status: 'active', end_date: { gt: now, lte: in30Days } } }),
            prisma.subscriptions.count({ where: { end_date: { lte: now } } }),
        ]);
        res.json({ total, active, expiringSoon, expired });
    } catch (error) {
        res.status(500).json({ error: 'Erro interno' });
    }
});

export default router;
