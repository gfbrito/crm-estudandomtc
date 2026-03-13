import { prisma } from '../config/prisma.js';
import { sendWhatsAppMessage, replaceMessageVariables, checkEvolutionConnection } from './evolution.js';

export async function checkAndSendRenewalNotifications() {
    console.log('Running subscription renewal check...');

    try {
        const { connected } = await checkEvolutionConnection();
        if (!connected) {
            console.log('Evolution API not connected. Skipping renewal checks.');
            return;
        }

        const settings = await prisma.subscription_settings.findMany({
            where: { is_active: true },
        });

        if (!settings || settings.length === 0) return;

        for (const rule of settings) {
            await processRenewalRule(rule);
        }
    } catch (error) {
        console.error('Error in checkAndSendRenewalNotifications:', error);
    }
}

async function processRenewalRule(rule: { id: string; days_before: number; message_template: string }) {
    const today = new Date();
    const targetDate = new Date();
    targetDate.setDate(today.getDate() + rule.days_before);

    const targetDateStr = targetDate.toISOString().split('T')[0];
    const startOfDay = new Date(`${targetDateStr}T00:00:00.000Z`);
    const endOfDay = new Date(`${targetDateStr}T23:59:59.999Z`);

    try {
        const subscriptions = await prisma.subscriptions.findMany({
            where: {
                status: 'active',
                opted_out: false,
                end_date: { gte: startOfDay, lte: endOfDay },
            },
            include: {
                products: { select: { name: true, renewal_link: true } },
                leads: { select: { name: true, primary_email: true, whatsapp: true } },
            },
        });

        if (subscriptions.length === 0) return;

        console.log(`Found ${subscriptions.length} subscriptions matching rule "${rule.days_before} days before"`);

        for (const sub of subscriptions) {
            await sendNotificationForSubscription(sub, rule);
        }
    } catch (error) {
        console.error(`Error processing rule ${rule.id}:`, error);
    }
}

async function sendNotificationForSubscription(
    sub: any,
    rule: { id: string; days_before: number; message_template: string }
) {
    if (!sub.leads?.whatsapp) return;

    const notificationType = `subscription_renewal_${rule.days_before}d`;

    // Check if already sent
    const existing = await prisma.notifications.findFirst({
        where: {
            type: notificationType,
            data: { path: ['subscription_id'], equals: sub.id },
        },
    });

    if (existing) return;

    let message = rule.message_template;

    message = replaceMessageVariables(message, {
        name: sub.leads.name,
        primaryEmail: sub.leads.primary_email,
        whatsapp: sub.leads.whatsapp,
    });

    message = message
        .replace(/{product_name}|{{product_name}}/gi, sub.products.name)
        .replace(/{renewal_link}|{{renewal_link}}/gi, sub.products.renewal_link || '')
        .replace(/{end_date}|{{end_date}}/gi, new Date(sub.end_date).toLocaleDateString('pt-BR'))
        .replace(/{opt_out_link}|{{opt_out_link}}/gi,
            `${process.env.FRONTEND_URL || 'http://localhost:5173'}/unsubscribe?token=${sub.opt_out_token}`);

    const result = await sendWhatsAppMessage(sub.leads.whatsapp, message);

    if (result.success) {
        await prisma.notifications.create({
            data: {
                type: notificationType,
                title: `Lembrete de Renovação (${rule.days_before} dias)`,
                message: message,
                status: 'sent',
                data: {
                    subscription_id: sub.id,
                    product_id: sub.product_id,
                    rule_id: rule.id,
                    days_before: rule.days_before,
                },
            },
        });
        console.log(`Sent renewal notification to ${sub.leads.name} for ${sub.products.name}`);
    } else {
        console.error(`Failed to send notification to ${sub.leads.name}:`, result.error);
    }
}
