import { Router } from 'express';
import { prisma } from '../config/prisma.js';
import {
    checkEvolutionConnection,
    getEvolutionQRCode,
    sendWhatsAppMessage,
    replaceMessageVariables
} from '../services/evolution.js';

const router = Router();

// Helper: wait until current time is within the allowed send window
// sendWindow = { startHour: 8, endHour: 20 } means only send between 8:00 and 19:59
async function waitForSendWindow(sendWindow?: { startHour: number; endHour: number }): Promise<void> {
    if (!sendWindow) return;
    const { startHour, endHour } = sendWindow;
    if (startHour === undefined || endHour === undefined) return;

    const now = new Date();
    const currentHour = now.getHours();

    // Check if current hour is within the window
    if (startHour < endHour) {
        // Normal range, e.g. 8-20
        if (currentHour >= startHour && currentHour < endHour) return;
    } else {
        // Overnight range, e.g. 22-6
        if (currentHour >= startHour || currentHour < endHour) return;
    }

    // Calculate ms until the window opens
    const nextStart = new Date(now);
    nextStart.setMinutes(0, 0, 0);
    nextStart.setHours(startHour);
    if (nextStart <= now) {
        nextStart.setDate(nextStart.getDate() + 1);
    }
    const waitMs = nextStart.getTime() - now.getTime();
    const waitMin = Math.round(waitMs / 60000);
    console.log(`⏸ Fora do horário de envio (${startHour}h-${endHour}h). Pausando por ${waitMin} minutos até ${nextStart.toLocaleTimeString('pt-BR')}...`);
    await new Promise(resolve => setTimeout(resolve, waitMs));
    console.log('▶ Horário de envio atingido. Retomando envio...');
}

// Get Evolution API config
router.get('/config', async (req, res) => {
    try {
        const setting = await prisma.settings.findUnique({
            where: { key: 'evolution' }
        });

        if (!setting || !setting.value) {
            // If DB fails, we still return empty config so frontend can use local storage
            return res.json({ configured: false, fromDb: false });
        }

        const config = setting.value as any;
        res.json({
            configured: !!(config?.apiUrl && config?.apiKey && config?.instanceName),
            apiUrl: config?.apiUrl || '',
            instanceName: config?.instanceName || '',
            fromDb: true
            // Don't return apiKey for security
        });
    } catch (error) {
        console.error('Error getting evolution config:', error);
        // Don't error out, just return empty so frontend falls back to local
        res.json({ configured: false, fromDb: false, error: 'Database unavailable' });
    }
});

// Save Evolution API config
router.post('/config', async (req, res) => {
    try {
        const { apiUrl, apiKey, instanceName } = req.body;

        if (!apiUrl || !apiKey || !instanceName) {
            return res.status(400).json({ error: 'Todos os campos são obrigatórios' });
        }

        const newValue = {
            apiUrl: apiUrl.replace(/\/$/, ''),
            apiKey,
            instanceName,
            updatedAt: new Date().toISOString()
        };

        await prisma.settings.upsert({
            where: { key: 'evolution' },
            update: { value: newValue },
            create: { key: 'evolution', value: newValue }
        });

        res.json({ success: true, message: 'Configuração salva com sucesso' });
    } catch (error) {
        console.error('Error saving evolution config:', error);
        res.status(500).json({ error: 'Erro ao salvar configuração' });
    }
});

// Check connection status
router.get('/status', async (req, res) => {
    try {
        // Extract config from headers if available
        const configOverrides = {
            apiUrl: req.headers['x-evolution-api-url'] as string,
            apiKey: req.headers['x-evolution-api-key'] as string,
            instanceName: req.headers['x-evolution-instance-name'] as string,
        };

        const result = await checkEvolutionConnection(configOverrides);
        res.json(result);
    } catch (error) {
        console.error('Error checking status:', error);
        res.status(500).json({ connected: false, error: 'Erro ao verificar status' });
    }
});

// Get QR Code for connection
router.get('/qrcode', async (req, res) => {
    try {
        // Extract config from headers if available
        const configOverrides = {
            apiUrl: req.headers['x-evolution-api-url'] as string,
            apiKey: req.headers['x-evolution-api-key'] as string,
            instanceName: req.headers['x-evolution-instance-name'] as string,
        };

        const result = await getEvolutionQRCode(configOverrides);
        res.json(result);
    } catch (error) {
        console.error('Error getting QR code:', error);
        res.status(500).json({ error: 'Erro ao obter QR Code' });
    }
});

// Test message send
router.post('/test', async (req, res) => {
    try {
        const { phone, message } = req.body;

        if (!phone || !message) {
            return res.status(400).json({ error: 'Telefone e mensagem são obrigatórios' });
        }

        // Extract config from headers if available
        const configOverrides = {
            apiUrl: req.headers['x-evolution-api-url'] as string,
            apiKey: req.headers['x-evolution-api-key'] as string,
            instanceName: req.headers['x-evolution-instance-name'] as string,
        };

        const result = await sendWhatsAppMessage(phone, message, configOverrides);
        res.json(result);
    } catch (error) {
        console.error('Error sending test message:', error);
        res.status(500).json({ success: false, error: 'Erro ao enviar mensagem' });
    }
});

// Process scheduled mass messages
router.post('/process-queue', async (req, res) => {
    try {
        const now = new Date().toISOString();

        // Find scheduled messages that should be sent
        const messages = await prisma.mass_messages.findMany({
            where: {
                status: 'scheduled',
                scheduled_at: {
                    lte: new Date(now)
                }
            }
        });

        if (!messages || messages.length === 0) {
            return res.json({ processed: 0, message: 'Nenhuma mensagem para processar' });
        }

        let processedCount = 0;

        for (const message of messages) {
            // Update status to sending
            await prisma.mass_messages.update({
                where: { id: message.id },
                data: {
                    status: 'sending',
                    started_at: new Date(now)
                }
            });

            // Get filtered leads based on message filters
            // Loading all leads to filter in memory due to complex JSONB filters
            const leads = await prisma.leads.findMany();

            const filters = (message.filters as any) || {};

            // Product filter: fetch buyer lead IDs from sales table
            let productBuyerIds: Set<string> | null = null;
            if (filters.productIds?.length) {
                try {
                    const salesData = await prisma.sales.findMany({
                        where: {
                            product_id: { in: filters.productIds },
                            status: 'approved'
                        },
                        select: { lead_id: true }
                    });

                    productBuyerIds = new Set(salesData.filter((s: any) => s.lead_id).map((s: any) => s.lead_id as string));
                    console.log(`📦 Filtro de produto: ${productBuyerIds.size} compradores encontrados para ${filters.productIds.length} produto(s)`);
                } catch (err) {
                    console.error('Error fetching product buyers:', err);
                    productBuyerIds = new Set();
                }
            }

            const leadsToProcess = leads.filter((lead: any) => {
                if (!lead.whatsapp) return false;

                // Product filter — must have purchased selected product(s)
                if (filters.productIds?.length) {
                    if (!productBuyerIds || !productBuyerIds.has(lead.id)) return false;
                }

                // Temperature filter
                if (filters.temperatures?.length && lead.temperature && !filters.temperatures.includes(lead.temperature)) {
                    return false;
                }

                // Stage filter
                if (filters.stages?.length && lead.stage && !filters.stages.includes(lead.stage)) {
                    return false;
                }

                // Tags filter (Postgres array)
                if (filters.tags?.length) {
                    const hasTag = filters.tags.some((tag: string) => (lead.tags as string[])?.includes(tag));
                    if (!hasTag) return false;
                }

                // Score range
                if (filters.scoreRange) {
                    if ((lead.points || 0) < filters.scoreRange.min || (lead.points || 0) > filters.scoreRange.max) {
                        return false;
                    }
                }

                // Last purchase days filter
                if (filters.lastPurchaseDays && lead.last_purchase_at) {
                    const daysSincePurchase = Math.floor((Date.now() - new Date(lead.last_purchase_at).getTime()) / (1000 * 60 * 60 * 24));
                    if (daysSincePurchase < filters.lastPurchaseDays.min || daysSincePurchase > filters.lastPurchaseDays.max) {
                        return false;
                    }
                }

                // Total spent filter
                if (filters.totalSpentRange) {
                    if ((lead.total_spent || 0) < filters.totalSpentRange.min || (lead.total_spent || 0) > filters.totalSpentRange.max) {
                        return false;
                    }
                }

                // Purchase count filter
                if (filters.purchaseCountRange) {
                    if ((lead.purchase_count || 0) < filters.purchaseCountRange.min || (lead.purchase_count || 0) > filters.purchaseCountRange.max) {
                        return false;
                    }
                }

                // Platform filter
                if (filters.platforms?.length && lead.origin) {
                    if (!filters.platforms.includes(lead.origin)) return false;
                }

                // Birthday month
                if (filters.birthdayMonth && lead.birth_date) {
                    const birthDate = new Date(lead.birth_date);
                    const birthMonth = birthDate.getMonth() + 1;
                    if (birthMonth !== filters.birthdayMonth) {
                        return false;
                    }
                }

                return true;
            });

            console.log(`📨 Campanha "${message.title}": ${leadsToProcess.length} destinatários após filtros (de ${leads.length} leads no total)`);

            let sentCount = 0;
            let failedCount = 0;

            // Get delay settings from Supabase settings table
            let minDelay = 500; // Default 0.5s
            let maxDelay = 500;
            try {
                const delaySetting = await prisma.settings.findUnique({
                    where: { key: 'messageDelay' },
                    select: { value: true }
                });

                if (delaySetting?.value && (delaySetting.value as any).enabled) {
                    minDelay = ((delaySetting.value as any).minDelay || 3) * 1000;
                    maxDelay = ((delaySetting.value as any).maxDelay || 7) * 1000;
                }
            } catch (e) {
                console.log('Using default delay settings');
            }

            // Get send window settings from the message or settings table
            let sendWindow: { startHour: number; endHour: number } | undefined;
            try {
                const windowSetting = await prisma.settings.findUnique({
                    where: { key: 'sendWindow' },
                    select: { value: true }
                });
                if (windowSetting?.value && (windowSetting.value as any).enabled) {
                    sendWindow = {
                        startHour: (windowSetting.value as any).startHour ?? 8,
                        endHour: (windowSetting.value as any).endHour ?? 20,
                    };
                }
            } catch (e) {
                console.log('No send window settings found, sending at any time');
            }

            for (const lead of leadsToProcess) {
                // Wait for send window before each message
                await waitForSendWindow(sendWindow);

                // Replace variables in message
                const personalizedMessage = replaceMessageVariables(
                    message.content || '',
                    {
                        name: lead.name || undefined,
                        primaryEmail: lead.primary_email || undefined,
                        whatsapp: lead.whatsapp || undefined
                    }
                );

                // Send message
                const result = await sendWhatsAppMessage(lead.whatsapp!, personalizedMessage);

                if (result.success) {
                    sentCount++;
                } else {
                    failedCount++;
                    console.error(`Failed to send to ${lead.whatsapp}:`, result.error);
                }

                // Delay to avoid rate limiting
                const delay = Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay;
                await new Promise(resolve => setTimeout(resolve, delay));
            }

            // Update message status to completed
            await prisma.mass_messages.update({
                where: { id: message.id },
                data: {
                    status: 'completed',
                    sent_count: sentCount,
                    failed_count: failedCount,
                    completed_at: new Date()
                }
            });

            processedCount++;
        }

        res.json({
            processed: processedCount,
            message: `${processedCount} mensagem(ns) processada(s)`
        });
    } catch (error) {
        console.error('Error processing queue:', error);
        res.status(500).json({ error: 'Erro ao processar fila' });
    }
});

// Endpoint for Manual/Stateless Mass Messaging (Bypasses DB)
router.post('/mass', async (req, res) => {
    try {
        const { recipients, message, delaySettings, sendWindow: sendWindowInput } = req.body;

        if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
            return res.status(400).json({ error: 'Lista de destinatários inválida' });
        }
        if (!message) {
            return res.status(400).json({ error: 'Mensagem é obrigatória' });
        }

        // Extract config from headers
        const configOverrides = {
            apiUrl: req.headers['x-evolution-api-url'] as string,
            apiKey: req.headers['x-evolution-api-key'] as string,
            instanceName: req.headers['x-evolution-instance-name'] as string,
        };

        const minDelay = (delaySettings?.min || 3) * 1000;
        const maxDelay = (delaySettings?.max || 7) * 1000;

        let sentCount = 0;
        let failedCount = 0;
        const failedNumbers: string[] = [];

        // Process in background if list is large? 
        // For now, we'll process synchronously but with a limit or just let it run.
        // Ideally this should be a background job, but without DB we can't persist state.
        // We will run it and stream updates or just wait (client timeout might be an issue for large lists).
        // Let's assume reasonable list sizes for now (e.g. < 50 numbers).

        // Build send window config from request or DB
        let sendWindow: { startHour: number; endHour: number } | undefined;
        if (sendWindowInput?.enabled) {
            sendWindow = {
                startHour: sendWindowInput.startHour ?? 8,
                endHour: sendWindowInput.endHour ?? 20,
            };
        } else {
            // Fallback: check DB settings
            try {
                const windowSetting = await prisma.settings.findUnique({
                    where: { key: 'sendWindow' },
                    select: { value: true }
                });
                if (windowSetting?.value && (windowSetting.value as any).enabled) {
                    sendWindow = {
                        startHour: (windowSetting.value as any).startHour ?? 8,
                        endHour: (windowSetting.value as any).endHour ?? 20,
                    };
                }
            } catch (e) { /* no window config */ }
        }

        for (const phone of recipients) {
            // Wait for send window before each message
            await waitForSendWindow(sendWindow);

            // Simple validation
            if (!phone || phone.length < 10) {
                failedCount++;
                continue;
            }

            const result = await sendWhatsAppMessage(phone, message, configOverrides);

            if (result.success) {
                sentCount++;
            } else {
                failedCount++;
                failedNumbers.push(phone);
                console.error(`Failed to send to ${phone}:`, result.error);
            }

            // Random delay
            const delay = Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay;
            await new Promise(resolve => setTimeout(resolve, delay));
        }

        res.json({
            success: true,
            total: recipients.length,
            sent: sentCount,
            failed: failedCount,
            failedNumbers
        });

    } catch (error) {
        console.error('Error in stateless mass messaging:', error);
        res.status(500).json({ error: 'Erro ao processar envio em massa' });
    }
});

export default router;
