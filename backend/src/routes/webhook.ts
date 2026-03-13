import { Router, Response } from 'express';
import { prisma } from '../config/prisma.js';
import { calculatePoints, calculateTemperature, calculateStage } from '../services/scoring.js';

const router = Router();

// Helper function to process a single webhook payload
const processWebhookPayload = async (payload: any, origin: string, mapping: any) => {
    const { field_mappings: fieldMappings, status_mappings: statusMappings } = mapping;

    const getNestedValue = (obj: any, path: string) => path.split('.').reduce((o, k) => o?.[k], obj);

    const email = getNestedValue(payload, fieldMappings.email);
    const name = getNestedValue(payload, fieldMappings.name);
    const phone = getNestedValue(payload, fieldMappings.phone);
    const product = getNestedValue(payload, fieldMappings.product);
    const amount = parseFloat(getNestedValue(payload, fieldMappings.amount)) || 0;
    const status = getNestedValue(payload, fieldMappings.status);
    const transactionId = getNestedValue(payload, fieldMappings.transactionId);

    let mappedStatus: 'approved' | 'pending' | 'refunded' | 'cancelled' | 'chargeback' = 'pending';
    if (statusMappings.approved?.includes(status)) mappedStatus = 'approved';
    else if (statusMappings.refunded?.includes(status)) mappedStatus = 'refunded';
    else if (statusMappings.cancelled?.includes(status)) mappedStatus = 'cancelled';
    else if (statusMappings.chargeback?.includes(status)) mappedStatus = 'chargeback';

    if (mappedStatus === 'cancelled' || mappedStatus === 'chargeback') {
        return { message: 'Venda cancelada/estornada ignorada', status: 'ignored' };
    }

    // Find or create lead
    let lead = await prisma.leads.findUnique({ where: { primary_email: email } });

    if (!lead) {
        lead = await prisma.leads.create({
            data: {
                name,
                primary_email: email,
                secondary_emails: [],
                whatsapp: phone || '',
                points: 0,
                temperature: 'inactive',
                stage: 'lead',
                total_spent: 0,
                purchase_count: 0,
                tags: [],
            },
        });
    }

    // Check for duplicate transaction
    const duplicate = await prisma.sales.findFirst({ where: { transaction_id: transactionId } });
    if (duplicate) {
        return { message: 'Transação já processada', status: 'duplicate' };
    }

    if (mappedStatus === 'approved') {
        const isRecurring = lead.purchase_count > 0;
        const points = calculatePoints(amount, isRecurring);

        // Look up or create product
        let productId: string | null = null;
        if (product) {
            let existingProduct = await prisma.products.findFirst({ where: { name: product } });
            if (existingProduct) {
                productId = existingProduct.id;
            } else {
                const newProduct = await prisma.products.create({
                    data: { name: product, type: 'digital', default_price: amount, status: 'draft' },
                });
                productId = newProduct.id;
                console.log(`[Webhook] Created new product: "${product}" (${productId})`);
            }
        }

        // Create sale
        await prisma.sales.create({
            data: {
                lead_id: lead.id,
                product_id: productId,
                transaction_id: transactionId,
                platform: origin,
                amount,
                status: mappedStatus,
                points_awarded: points,
                product_name: product,
            },
        });

        // Calculate new stats
        const newTotalSpent = Number(lead.total_spent) + amount;
        const newPurchaseCount = lead.purchase_count + 1;
        const newPoints = lead.points + points;
        const newTemperature = calculateTemperature(newPoints, 0);
        const newStage = calculateStage(newPurchaseCount, newTotalSpent);

        await prisma.leads.update({
            where: { id: lead.id },
            data: {
                points: newPoints,
                temperature: newTemperature,
                stage: newStage,
                total_spent: newTotalSpent,
                purchase_count: newPurchaseCount,
                last_purchase_at: new Date(),
                updated_at: new Date(),
            },
        });

        // Timeline
        await prisma.timeline.create({
            data: {
                lead_id: lead.id,
                type: 'sale',
                content: `Venda realizada: ${product} - R$ ${amount.toFixed(2)}`,
                metadata: { productName: product, amount },
                created_by_name: 'system',
            },
        });
    } else if (mappedStatus === 'pending') {
        await prisma.recoveries.create({
            data: {
                lead_id: lead.id,
                transaction_id: transactionId,
                platform: origin,
                amount,
                follow_up_status: 'pending',
            },
        });
    }

    return { message: 'Webhook processado com sucesso', status: 'processed' };
};

// POST /api/webhook/conversion
router.post('/conversion', async (req, res: Response) => {
    try {
        const payload = req.body;
        const origin = req.headers['x-webhook-source'] as string || 'unknown';

        const mapping = await prisma.webhook_mappings.findUnique({ where: { origin_name: origin } });

        if (!mapping) {
            await prisma.pending_webhooks.create({
                data: { origin, payload, status: 'awaiting_config' },
            });

            // Check if notification already exists
            const allNewOriginNotifs = await prisma.notifications.findMany({ where: { type: 'new_origin' } });
            const existingNotification = allNewOriginNotifs.find((n: any) => (n.data as any)?.origin === origin);

            if (!existingNotification) {
                await prisma.notifications.create({
                    data: {
                        type: 'new_origin',
                        title: 'Nova origem de webhook',
                        message: `Webhook recebido de origem "${origin}" não configurada.`,
                        status: 'pending',
                        data: { origin },
                    },
                });
            }

            return res.status(202).json({ message: 'Webhook recebido, aguardando configuração' });
        }

        const result = await processWebhookPayload(payload, origin, mapping);
        res.json(result);
    } catch (error) {
        console.error('Webhook error:', error);
        res.status(500).json({ error: 'Erro ao processar webhook' });
    }
});

// POST /api/webhook/reprocess/:origin
router.post('/reprocess/:origin', async (req, res: Response) => {
    const { origin } = req.params;

    try {
        const mapping = await prisma.webhook_mappings.findUnique({ where: { origin_name: origin } });
        if (!mapping) {
            return res.status(404).json({ error: 'Mapeamento não encontrado para esta origem.' });
        }

        const pendingItems = await prisma.pending_webhooks.findMany({
            where: { origin, status: 'awaiting_config' },
        });

        if (pendingItems.length === 0) {
            return res.json({ message: 'Nenhum webhook pendente para processar.', count: 0 });
        }

        let processedCount = 0;
        for (const item of pendingItems) {
            try {
                await processWebhookPayload(item.payload, origin, mapping);
                await prisma.pending_webhooks.delete({ where: { id: item.id } });
                processedCount++;
            } catch (err) {
                console.error(`Erro ao processar item pendente ${item.id}:`, err);
            }
        }

        // Resolve notifications
        const notifs = await prisma.notifications.findMany({ where: { type: 'new_origin' } });
        for (const n of notifs) {
            if ((n.data as any)?.origin === origin) {
                await prisma.notifications.update({
                    where: { id: n.id },
                    data: { read: true, status: 'resolved' },
                });
            }
        }

        res.json({ success: true, message: `${processedCount} webhooks reprocessados.`, count: processedCount });
    } catch (error) {
        console.error('Reprocess error:', error);
        res.status(500).json({ error: 'Erro ao reprocessar webhooks' });
    }
});

export default router;
