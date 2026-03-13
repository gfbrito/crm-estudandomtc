import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cron from 'node-cron';

import { prisma } from './config/prisma.js';
import { applyDecay, calculateTemperature } from './services/scoring.js';
import { sendWhatsAppMessage, replaceMessageVariables, checkEvolutionConnection } from './services/evolution.js';
import { checkAndSendRenewalNotifications } from './services/subscription.js';

// Routes
import authRouter from './routes/auth.js';
import leadsRouter from './routes/leads.js';
import productsRouter from './routes/products.js';
import salesRouter from './routes/sales.js';
import notificationsRouter from './routes/notifications.js';
import settingsRouter from './routes/settings.js';
import subscriptionsRouter from './routes/subscriptions.js';
import recoveriesRouter from './routes/recoveries.js';
import timelineRouter from './routes/timeline.js';
import massMessagesRouter from './routes/mass-messages.js';
import dashboardRouter from './routes/dashboard.js';
import importRouter from './routes/import.js';
import webhookRouter from './routes/webhook.js';
import evolutionRouter from './routes/evolution.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Health check
app.get('/health', (_, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/leads', leadsRouter);
app.use('/api/products', productsRouter);
app.use('/api/sales', salesRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/subscriptions', subscriptionsRouter);
app.use('/api/recoveries', recoveriesRouter);
app.use('/api/timeline', timelineRouter);
app.use('/api/mass-messages', massMessagesRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/import', importRouter);
app.use('/api/webhook', webhookRouter);
app.use('/api/evolution', evolutionRouter);

// ==========================================
// CRON JOBS (migrated from Supabase to Prisma)
// ==========================================

// Point decay cron job (runs weekly on Sundays at 2am)
cron.schedule('0 2 * * 0', async () => {
    console.log('Running point decay job...');
    try {
        const leads = await prisma.leads.findMany({ where: { points: { gt: 0 } } });
        const now = new Date();

        for (const lead of leads) {
            const lastPurchaseStr = lead.last_purchase_at || lead.created_at;
            if (!lastPurchaseStr) continue;

            const lastPurchase = new Date(lastPurchaseStr);
            const monthsSince = Math.floor((now.getTime() - lastPurchase.getTime()) / (30 * 24 * 60 * 60 * 1000));

            if (monthsSince > 0) {
                const newPoints = applyDecay(lead.points, 1);
                const daysSince = Math.floor((now.getTime() - lastPurchase.getTime()) / (24 * 60 * 60 * 1000));
                const newTemp = calculateTemperature(newPoints, daysSince);

                await prisma.leads.update({
                    where: { id: lead.id },
                    data: { points: newPoints, temperature: newTemp, updated_at: now },
                });
            }
        }
        console.log(`Point decay applied to ${leads.length} leads`);
    } catch (error) {
        console.error('Point decay job error:', error);
    }
});

// Subscription Renewal Check (daily at 9:00 AM)
cron.schedule('0 9 * * *', async () => {
    try {
        await checkAndSendRenewalNotifications();
    } catch (error) {
        console.error('Subscription renewal job error:', error);
    }
});

// Mass messaging queue processor (runs every minute)
cron.schedule('* * * * *', async () => {
    try {
        const now = new Date();

        const connectionStatus = await checkEvolutionConnection();
        if (!connectionStatus.connected) return;

        const messages = await prisma.mass_messages.findMany({
            where: { status: 'scheduled', scheduled_at: { lte: now } },
        });

        if (messages.length === 0) return;
        console.log(`Processing ${messages.length} scheduled message(s)...`);

        // Get send window settings
        let sendWindow: { startHour: number; endHour: number } | undefined;
        try {
            const windowSetting = await prisma.settings.findUnique({ where: { key: 'sendWindow' } });
            const val = windowSetting?.value as any;
            if (val?.enabled) {
                sendWindow = { startHour: val.startHour ?? 8, endHour: val.endHour ?? 20 };
            }
        } catch { /* no config */ }

        const waitForSendWindow = async () => {
            if (!sendWindow) return;
            const { startHour, endHour } = sendWindow;
            const currentHour = new Date().getHours();
            let inWindow = startHour < endHour
                ? currentHour >= startHour && currentHour < endHour
                : currentHour >= startHour || currentHour < endHour;
            if (inWindow) return;

            const nextStart = new Date();
            nextStart.setMinutes(0, 0, 0);
            nextStart.setHours(startHour);
            if (nextStart <= new Date()) nextStart.setDate(nextStart.getDate() + 1);
            const waitMs = nextStart.getTime() - Date.now();
            console.log(`⏸ Fora do horário de envio. Pausando por ${Math.round(waitMs / 60000)} min...`);
            await new Promise(resolve => setTimeout(resolve, waitMs));
        };

        for (const message of messages) {
            await prisma.mass_messages.update({
                where: { id: message.id },
                data: { status: 'sending', started_at: now },
            });

            const leads = await prisma.leads.findMany();
            const filters = (message.filters as any) || {};

            // Product filter
            let productBuyerIds: Set<string> | null = null;
            if (filters.productIds?.length) {
                const salesData = await prisma.sales.findMany({
                    where: { product_id: { in: filters.productIds }, status: 'approved' },
                    select: { lead_id: true },
                });
                productBuyerIds = new Set(salesData.map(s => s.lead_id).filter(Boolean) as string[]);
            }

            const leadsToProcess = leads.filter(lead => {
                if (!lead.whatsapp) return false;
                if (filters.productIds?.length && (!productBuyerIds || !productBuyerIds.has(lead.id))) return false;
                if (filters.temperatures?.length && !filters.temperatures.includes(lead.temperature)) return false;
                if (filters.stages?.length && !filters.stages.includes(lead.stage)) return false;
                if (filters.tags?.length && !filters.tags.some((tag: string) => lead.tags?.includes(tag))) return false;
                if (filters.scoreRange && (lead.points < filters.scoreRange.min || lead.points > filters.scoreRange.max)) return false;
                return true;
            });

            console.log(`📨 Campanha "${message.title}": ${leadsToProcess.length} destinatários`);

            let sentCount = 0, failedCount = 0;

            // Delay settings
            let minDelay = 500, maxDelay = 500;
            try {
                const delaySetting = await prisma.settings.findUnique({ where: { key: 'messageDelay' } });
                const val = delaySetting?.value as any;
                if (val?.enabled) {
                    minDelay = (val.minDelay || 3) * 1000;
                    maxDelay = (val.maxDelay || 7) * 1000;
                }
            } catch { }

            for (const lead of leadsToProcess) {
                await waitForSendWindow();

                const personalizedMessage = replaceMessageVariables(
                    message.content || '',
                    { name: lead.name || undefined, primaryEmail: lead.primary_email || undefined, whatsapp: lead.whatsapp || undefined }
                );

                const result = await sendWhatsAppMessage(lead.whatsapp!, personalizedMessage);
                if (result.success) sentCount++;
                else failedCount++;

                if ((sentCount + failedCount) % 10 === 0) {
                    await prisma.mass_messages.update({
                        where: { id: message.id },
                        data: { sent_count: sentCount, failed_count: failedCount },
                    });
                }

                const delay = Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay;
                await new Promise(resolve => setTimeout(resolve, delay));
            }

            await prisma.mass_messages.update({
                where: { id: message.id },
                data: { status: 'completed', sent_count: sentCount, failed_count: failedCount, completed_at: new Date() },
            });

            console.log(`Message "${message.title}" completed: ${sentCount} sent, ${failedCount} failed`);
        }
    } catch (error) {
        console.error('Mass messaging queue error:', error);
    }
});

// Error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Erro interno do servidor' });
});

app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});
