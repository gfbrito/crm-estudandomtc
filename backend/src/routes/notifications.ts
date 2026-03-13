import { Router, Request, Response } from 'express';
import { prisma } from '../config/prisma.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// GET /api/notifications
router.get('/', authMiddleware, async (_req: Request, res: Response) => {
    try {
        const notifications = await prisma.notifications.findMany({
            orderBy: { created_at: 'desc' },
        });
        res.json(notifications);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar notificações' });
    }
});

// PUT /api/notifications/:id/read
router.put('/:id/read', authMiddleware, async (req: Request, res: Response) => {
    try {
        await prisma.notifications.update({
            where: { id: req.params.id },
            data: { read: true },
        });
        res.json({ message: 'Notificação lida' });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao marcar notificação' });
    }
});

// PUT /api/notifications/read-all
router.put('/read-all', authMiddleware, async (_req: Request, res: Response) => {
    try {
        await prisma.notifications.updateMany({ data: { read: true } });
        res.json({ message: 'Todas as notificações lidas' });
    } catch (error) {
        res.status(500).json({ error: 'Erro interno' });
    }
});

// PUT /api/notifications/:id/resolve
router.put('/:id/resolve', authMiddleware, async (req: Request, res: Response) => {
    try {
        await prisma.notifications.update({
            where: { id: req.params.id },
            data: { status: 'resolved', resolved_at: new Date(), read: true },
        });
        res.json({ message: 'Notificação resolvida' });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao resolver notificação' });
    }
});

// DELETE /api/notifications/:id
router.delete('/:id', authMiddleware, async (req: Request, res: Response) => {
    try {
        await prisma.notifications.delete({ where: { id: req.params.id } });
        res.json({ message: 'Notificação removida' });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao remover notificação' });
    }
});

// POST /api/notifications (create)
router.post('/', authMiddleware, async (req: Request, res: Response) => {
    try {
        const notification = await prisma.notifications.create({ data: req.body });
        res.status(201).json(notification);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao criar notificação' });
    }
});

// GET /api/notifications/unread-count
router.get('/unread-count', authMiddleware, async (_req: Request, res: Response) => {
    try {
        const count = await prisma.notifications.count({ where: { read: false } });
        res.json({ count });
    } catch (error) {
        res.status(500).json({ error: 'Erro interno' });
    }
});

export default router;
