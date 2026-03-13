import { Router, Request, Response } from 'express';
import { prisma } from '../config/prisma.js';
import { authMiddleware, masterOnly } from '../middleware/auth.js';
import { applyDecay, calculateTemperature, calculatePoints } from '../services/scoring.js';

const router = Router();

// POST /api/import/process
router.post('/process', authMiddleware, masterOnly, async (req: Request, res: Response) => {
    try {
        const { rows, platform, importType } = req.body;

        if (!rows || !Array.isArray(rows)) {
            res.status(400).json({ error: 'Dados inválidos' });
            return;
        }

        let leadsCreated = 0, leadsUpdated = 0, salesImported = 0, skipped = 0;
        const errors: string[] = [];
        
        // Cache tools to avoid excessive DB calls
        const productMap = new Map<string, string>(); // Name -> ID
        const subscriptionInfoMap = new Map<string, { period: number }>();
        const existingTxIds = new Set<string>();

        // 1. Fetch existing mappings
        const mappings = await prisma.product_mappings.findMany();
        const mappingMap = new Map<string, string>();
        mappings.forEach(m => {
            if (m.target_product_id) {
                mappingMap.set(m.imported_name, m.target_product_id);
            }
        });

        // 2. Fetch existing products and txIds chunk
        const defaultIgnoredWpRoles = ['subscriber', 'customer', 'administrator', 'editor', 'author', 'contributor', 'shop_manager', 'pending', 'user'];
        const uniqueProductNames = new Set<string>();
        const incomingTrxIds = rows.map(r => r.transactionId).filter(id => id && id.trim());

        if (incomingTrxIds.length > 0) {
            const chunkSize = 1000;
            for (let i = 0; i < incomingTrxIds.length; i += chunkSize) {
                const chunk = incomingTrxIds.slice(i, i + chunkSize);
                const found = await prisma.sales.findMany({
                    where: { transaction_id: { in: chunk } },
                    select: { transaction_id: true }
                });
                found.forEach(f => {
                    if (f.transaction_id) {
                        existingTxIds.add(f.transaction_id);
                    }
                });
            }
        }

        // Get unique products to process
        rows.forEach(row => {
            let name = row.productName;
            if (!name && importType === 'wordpress' && row.role) {
                const roles = row.role.split(',').map((r: string) => r.trim()).filter(Boolean);
                roles.forEach((r: string) => {
                    if (!defaultIgnoredWpRoles.includes(r.toLowerCase())) uniqueProductNames.add(r);
                });
            } else if (name && name.trim()) {
                uniqueProductNames.add(name.trim());
            }
        });

        const existingProducts = await prisma.products.findMany({
            select: { id: true, name: true, is_subscription: true, subscription_period_days: true }
        });
        existingProducts.forEach(p => {
            productMap.set(p.name, p.id);
            if (p.is_subscription) {
                subscriptionInfoMap.set(p.id, { period: p.subscription_period_days || 365 });
            }
        });

        // 3. Pre-create products
        for (const productName of uniqueProductNames) {
            if (productMap.has(productName)) continue;
            const mappedId = mappingMap.get(productName);
            if (mappedId) {
                // If the mapping exists, rely on it instead
                continue;
            }

            const sampleRow = rows.find(r => r.productName === productName);
            const amountStr = sampleRow?.amount ? sampleRow.amount.replace(/[^0-9.,]/g, '').replace(',', '.') : '0';
            const amount = parseFloat(amountStr) || 0;

            try {
                const newProd = await prisma.products.create({
                    data: {
                        name: productName,
                        type: 'digital',
                        default_price: amount,
                        status: 'draft'
                    }
                });
                productMap.set(productName, newProd.id);

                await prisma.notifications.create({
                    data: {
                        type: 'product_link',
                        title: 'Novo produto detectado na importação',
                        message: `O produto "${productName}" foi criado automaticamente com valor R$${amount.toFixed(2)}. Revise para confirmar ou vincular a um existente.`,
                        data: {
                            importedName: productName,
                            tempProductId: newProd.id
                        }
                    }
                });
            } catch (err) {
                console.error('Error auto-creating product:', err);
            }
        }

        // 4. Process Rows
        for (const row of rows) {
            try {
                const email = row.email?.toLowerCase()?.trim();
                if (!email) { skipped++; continue; }

                // Phone cleaning logic
                const rawPhone = row.phone || '';
                const rawDDD = row.ddd || '';
                let cleanPhone = rawPhone.replace(/\D/g, '');
                let cleanDDD = rawDDD.replace(/\D/g, '');
                
                if (cleanDDD) cleanPhone = cleanDDD + cleanPhone;
                if (cleanPhone.length >= 10 && cleanPhone.length <= 11) {
                    cleanPhone = '55' + cleanPhone;
                }

                // Upsert lead
                let lead = await prisma.leads.findUnique({ where: { primary_email: email } });
                let isNewLead = false;

                if (!lead) {
                    lead = await prisma.leads.create({
                        data: {
                            primary_email: email,
                            name: row.name || email.split('@')[0],
                            whatsapp: cleanPhone || null,
                            origin: platform || 'import',
                            tags: [],
                            secondary_emails: [],
                        },
                    });
                    leadsCreated++;
                    isNewLead = true;
                } else {
                    const updates: any = {};
                    if (row.name && (!lead.name || lead.name === email.split('@')[0])) updates.name = row.name;
                    if (cleanPhone && !lead.whatsapp) updates.whatsapp = cleanPhone;
                    if (Object.keys(updates).length > 0) {
                        lead = await prisma.leads.update({ where: { id: lead.id }, data: updates });
                    }
                    if (!isNewLead) leadsUpdated++;
                }

                // WordPress Support: Extract Roles to Product Names
                let wpRoles: string[] = [];
                let productName = row.productName;

                if (!productName && importType === 'wordpress') {
                    const roleRaw = row.role;
                    if (roleRaw) {
                        wpRoles = roleRaw.split(',').map((r: string) => r.trim()).filter((r: string) =>
                            r && !defaultIgnoredWpRoles.includes(r.toLowerCase())
                        );
                        if (wpRoles.length > 0) productName = wpRoles[0];
                    }
                }

                const amountStr = row.amount ? String(row.amount).replace(/[^0-9.,]/g, '').replace(',', '.') : '0';
                const amount = parseFloat(amountStr) || 0;

                let saleDate = new Date();
                if (row.purchaseDate && row.purchaseDate.trim()) {
                    const trimmed = row.purchaseDate.trim();
                    if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
                        const d = new Date(trimmed);
                        if (!isNaN(d.getTime())) saleDate = d;
                    } else {
                        const ptBrMatch = trimmed.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})/);
                        if (ptBrMatch) {
                            const day = parseInt(ptBrMatch[1], 10);
                            const month = parseInt(ptBrMatch[2], 10) - 1;
                            let year = parseInt(ptBrMatch[3], 10);
                            if (year < 100) year += 2000;
                            const d = new Date(year, month, day);
                            if (!isNaN(d.getTime())) saleDate = d;
                        } else {
                            const d = new Date(trimmed);
                            if (!isNaN(d.getTime())) saleDate = d;
                        }
                    }
                }

                if (productName || amount > 0) {
                    productName = productName || 'Produto Importado';
                    let productId = mappingMap.get(productName) || productMap.get(productName);

                    if (!productId) {
                        skipped++;
                        continue;
                    }

                    const points = calculatePoints(amount, false);
                    const rawTransactionId = row.transactionId;
                    const transactionId = rawTransactionId || `IMP-${Date.now()}-${row.globalIndex || Math.floor(Math.random() * 1000000)}`;

                    if (rawTransactionId && existingTxIds.has(rawTransactionId)) {
                        // Duplicate
                    } else {
                        if (rawTransactionId) existingTxIds.add(rawTransactionId);

                        await prisma.sales.create({
                            data: {
                                lead_id: lead.id,
                                product_id: productId,
                                product_name: productName,
                                transaction_id: transactionId,
                                platform: platform || 'import',
                                amount: amount,
                                status: row.status || 'approved',
                                points_awarded: points,
                                purchased_at: saleDate,
                            },
                        });
                        salesImported++;

                        if (row.status !== 'refunded') {
                            await prisma.leads.update({
                                where: { id: lead.id },
                                data: {
                                    points: { increment: points },
                                    total_spent: { increment: amount },
                                    purchase_count: { increment: 1 },
                                    last_purchase_at: saleDate,
                                    updated_at: new Date(),
                                }
                            });
                        }

                        // Subscription logic
                        if (productId && subscriptionInfoMap.has(productId)) {
                            const subInfo = subscriptionInfoMap.get(productId)!;
                            const subStartDate = !isNaN(saleDate.getTime()) ? saleDate : new Date();

                            const existingSub = await prisma.subscriptions.findFirst({
                                where: { lead_id: lead.id, product_id: productId }
                            });

                            if (existingSub) {
                                const currentEnd = existingSub.end_date;
                                const baseDate = currentEnd && currentEnd > subStartDate ? currentEnd : subStartDate;
                                const newEndDate = new Date(baseDate.getTime() + (subInfo.period * 24 * 60 * 60 * 1000));

                                await prisma.subscriptions.update({
                                    where: { id: existingSub.id },
                                    data: {
                                        end_date: newEndDate,
                                        status: 'active',
                                        updated_at: new Date()
                                    }
                                });
                            } else {
                                const newEndDate = new Date(subStartDate.getTime() + (subInfo.period * 24 * 60 * 60 * 1000));
                                const optOutToken = require('crypto').randomUUID();
                                await prisma.subscriptions.create({
                                    data: {
                                        lead_id: lead.id,
                                        product_id: productId,
                                        status: 'active',
                                        start_date: subStartDate,
                                        end_date: newEndDate,
                                        opt_out_token: optOutToken
                                    }
                                });
                            }
                        }
                    }

                    // Extra WordPress roles processing (secondary roles as standalone 0 value sales)
                    if (wpRoles.length > 1) {
                        for (let ri = 1; ri < wpRoles.length; ri++) {
                            const extraRole = wpRoles[ri];
                            const extraProductId = mappingMap.get(extraRole) || productMap.get(extraRole);
                            if (!extraProductId) continue;

                            await prisma.sales.create({
                                data: {
                                    lead_id: lead.id,
                                    product_id: extraProductId,
                                    product_name: extraRole,
                                    transaction_id: `IMP-${Date.now()}-${row.globalIndex}-r${ri}`,
                                    platform: platform || 'import',
                                    amount: 0,
                                    status: 'approved',
                                    points_awarded: 0,
                                    purchased_at: saleDate,
                                }
                            });
                        }
                    }
                }
            } catch (rowError: any) {
                console.error(rowError);
                errors.push(`Linha ${row.email}: ${rowError.message}`);
                skipped++;
            }
        }

        res.json({ leadsCreated, leadsUpdated, salesImported, skipped, errors });
    } catch (error) {
        console.error('Import error:', error);
        res.status(500).json({ error: 'Erro no processamento' });
    }
});

// DELETE /api/import/clear
router.delete('/clear', authMiddleware, masterOnly, async (req: Request, res: Response) => {
    try {
        // Since we are clearing the entire CRM effectively, order of deletion matters for FK constraints:
        // timelines, subscriptions, recoveries, mass_messages
        // sales, product_mappings, webhook_mappings, notifications
        // products, leads

        await prisma.$transaction([
            prisma.timeline.deleteMany({}),
            prisma.subscriptions.deleteMany({}),
            prisma.recoveries.deleteMany({}),
            prisma.mass_messages.deleteMany({}),
            prisma.sales.deleteMany({}),
            prisma.product_mappings.deleteMany({}),
            prisma.webhook_mappings.deleteMany({}),
            prisma.pending_webhooks.deleteMany({}),
            prisma.notifications.deleteMany({}),
            prisma.products.deleteMany({}),
            prisma.leads.deleteMany({}),
            // Note: Does not touch users / config / settings.
        ]);

        res.json({ message: 'Banco de dados limpo com sucesso' });
    } catch (e: any) {
        console.error('Falha ao limpar banco de dados:', e);
        res.status(500).json({ error: e.message || 'Falha ao processar deleção' });
    }
});

// --- Product Mappings ---

// GET /api/import/product-mappings
router.get('/product-mappings', authMiddleware, async (_req: Request, res: Response) => {
    try {
        const mappings = await prisma.product_mappings.findMany({
            include: { products: { select: { name: true } } },
            orderBy: { created_at: 'desc' },
        });
        res.json(mappings);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar mapeamentos' });
    }
});

// POST /api/import/product-mappings
router.post('/product-mappings', authMiddleware, async (req: Request, res: Response) => {
    try {
        const mapping = await prisma.product_mappings.create({ data: req.body });
        res.status(201).json(mapping);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao criar mapeamento' });
    }
});

// PUT /api/import/product-mappings/:id
router.put('/product-mappings/:id', authMiddleware, async (req: Request, res: Response) => {
    try {
        const mapping = await prisma.product_mappings.update({
            where: { id: req.params.id },
            data: req.body,
        });
        res.json(mapping);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao atualizar mapeamento' });
    }
});

// --- Pending Webhooks ---

// GET /api/import/pending-webhooks
router.get('/pending-webhooks', authMiddleware, async (_req: Request, res: Response) => {
    try {
        const webhooks = await prisma.pending_webhooks.findMany({
            where: { status: 'awaiting_config' },
            orderBy: { received_at: 'desc' },
        });
        res.json(webhooks);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar webhooks pendentes' });
    }
});

export default router;
