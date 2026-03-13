import { Router, Request, Response } from 'express';
import { prisma } from '../config/prisma.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// GET /api/products
router.get('/', authMiddleware, async (_req: Request, res: Response) => {
    try {
        const products = await prisma.products.findMany({ orderBy: { created_at: 'desc' } });
        res.json(products);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar produtos' });
    }
});

// POST /api/products
router.post('/', authMiddleware, async (req: Request, res: Response) => {
    try {
        const product = await prisma.products.create({ data: req.body });
        res.status(201).json(product);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao criar produto' });
    }
});

// PUT /api/products/:id
router.put('/:id', authMiddleware, async (req: Request, res: Response) => {
    try {
        const product = await prisma.products.update({
            where: { id: req.params.id },
            data: { ...req.body, updated_at: new Date() },
        });
        res.json(product);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao atualizar produto' });
    }
});

// DELETE /api/products/:id
router.delete('/:id', authMiddleware, async (req: Request, res: Response) => {
    try {
        await prisma.products.delete({ where: { id: req.params.id } });
        res.json({ message: 'Produto removido' });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao remover produto' });
    }
});

// POST /api/products/resolve-link
router.post('/resolve-link', authMiddleware, async (req: Request, res: Response) => {
    const { notificationId, importedName, action, tempProductId, targetProductId, targetProductName } = req.body;

    try {
        // Start a transaction for consistent updates
        await prisma.$transaction(async (tx) => {
            if (action === 'new') {
                // 1. Create mapping
                await tx.product_mappings.create({
                    data: {
                        imported_name: importedName,
                        target_product_id: tempProductId
                    }
                });

                // 2. Activate product
                await tx.products.update({
                    where: { id: tempProductId },
                    data: { status: 'active' }
                });

            } else if (action === 'link') {
                // 1. Create mapping
                await tx.product_mappings.create({
                    data: {
                        imported_name: importedName,
                        target_product_id: targetProductId
                    }
                });

                // 2. Move sales to target product
                await tx.sales.updateMany({
                    where: { product_id: tempProductId },
                    data: {
                        product_id: targetProductId,
                        product_name: targetProductName
                    }
                });

                // 3. Delete temporary product (which now has no sales due to constraint? wait, sales first, then product)
                await tx.products.delete({
                    where: { id: tempProductId }
                });
            }

            // Mark notification as resolved
            if (notificationId) {
                await tx.notifications.update({
                    where: { id: notificationId },
                    data: {
                        read: true,
                        status: 'resolved',
                        resolved_at: new Date()
                    }
                });
            }
        });

        res.json({ message: 'Ação resolvida com sucesso' });
    } catch (error) {
        console.error('Error resolving product link:', error);
        res.status(500).json({ error: 'Erro ao processar resolução de produto' });
    }
});

export default router;
