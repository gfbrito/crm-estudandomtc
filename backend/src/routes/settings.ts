import { Router, Request, Response } from 'express';
import { prisma } from '../config/prisma.js';
import { authMiddleware, masterOnly } from '../middleware/auth.js';

const router = Router();

// GET /api/settings/:key
router.get('/:key', authMiddleware, async (req: Request, res: Response) => {
    try {
        const setting = await prisma.settings.findUnique({ where: { key: req.params.key } });
        res.json(setting?.value ?? null);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar configuração' });
    }
});

// GET /api/settings (all)
router.get('/', authMiddleware, async (_req: Request, res: Response) => {
    try {
        const settings = await prisma.settings.findMany();
        const result: Record<string, any> = {};
        settings.forEach(s => { result[s.key] = s.value; });
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar configurações' });
    }
});

// PUT /api/settings/:key
router.put('/:key', authMiddleware, masterOnly, async (req: Request, res: Response) => {
    try {
        const setting = await prisma.settings.upsert({
            where: { key: req.params.key },
            update: { value: req.body.value, updated_at: new Date() },
            create: { key: req.params.key, value: req.body.value },
        });
        res.json(setting);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao salvar configuração' });
    }
});

// --- Webhook Mappings ---

// GET /api/settings/webhook-mappings/all
router.get('/webhook-mappings/all', authMiddleware, async (_req: Request, res: Response) => {
    try {
        const mappings = await prisma.webhook_mappings.findMany({ orderBy: { created_at: 'desc' } });
        res.json(mappings);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar mapeamentos' });
    }
});

// POST /api/settings/webhook-mappings
router.post('/webhook-mappings', authMiddleware, masterOnly, async (req: Request, res: Response) => {
    try {
        const mapping = await prisma.webhook_mappings.create({ data: req.body });
        res.status(201).json(mapping);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao criar mapeamento' });
    }
});

// PUT /api/settings/webhook-mappings/:id
router.put('/webhook-mappings/:id', authMiddleware, masterOnly, async (req: Request, res: Response) => {
    try {
        const mapping = await prisma.webhook_mappings.update({
            where: { id: req.params.id },
            data: req.body,
        });
        res.json(mapping);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao atualizar mapeamento' });
    }
});

// DELETE /api/settings/webhook-mappings/:id
router.delete('/webhook-mappings/:id', authMiddleware, masterOnly, async (req: Request, res: Response) => {
    try {
        await prisma.webhook_mappings.delete({ where: { id: req.params.id } });
        res.json({ message: 'Mapeamento removido' });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao remover mapeamento' });
    }
});

export default router;
