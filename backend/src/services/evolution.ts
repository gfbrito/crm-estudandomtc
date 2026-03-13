import { prisma } from '../config/prisma.js';

interface EvolutionConfig {
    apiUrl: string;
    apiKey: string;
    instanceName: string;
}

interface SendMessageResult {
    success: boolean;
    messageId?: string;
    error?: string;
}

// Get Evolution API config from environment variables first, then Supabase
export async function getEvolutionConfig(overrides?: Partial<EvolutionConfig>): Promise<EvolutionConfig | null> {
    // If overrides are provided (e.g. from headers), use them
    if (overrides?.apiUrl && overrides?.apiKey && overrides?.instanceName) {
        return overrides as EvolutionConfig;
    }

    // First try environment variables
    const envConfig = {
        apiUrl: process.env.EVOLUTION_API_URL,
        apiKey: process.env.EVOLUTION_API_KEY,
        instanceName: process.env.EVOLUTION_INSTANCE_NAME,
    };

    if (envConfig.apiUrl && envConfig.apiKey && envConfig.instanceName) {
        return envConfig as EvolutionConfig;
    }

    // Fallback to Settings table
    try {
        const setting = await prisma.settings.findUnique({
            where: { key: 'evolution' }
        });

        if (!setting || !setting.value) return null;

        const config = setting.value as any;
        if (!config?.apiUrl || !config?.apiKey || !config?.instanceName) {
            return null;
        }

        return {
            apiUrl: config.apiUrl,
            apiKey: config.apiKey,
            instanceName: config.instanceName,
        };
    } catch (error) {
        console.error('Error getting evolution config from Supabase:', error);
        return null;
    }
}

// Format phone number to WhatsApp format (country code + number)
function formatPhoneForWhatsApp(phone: string): string {
    // Remove all non-digits
    let cleaned = phone.replace(/\D/g, '');

    // If it doesn't start with country code, assume Brazil (55)
    if (!cleaned.startsWith('55') && cleaned.length <= 11) {
        cleaned = '55' + cleaned;
    }

    return cleaned;
}

// Replace message variables with lead data
export function replaceMessageVariables(
    message: string,
    lead: { name?: string; primaryEmail?: string; whatsapp?: string }
): string {
    return message
        .replace(/{nome}/gi, lead.name || 'Cliente')
        .replace(/{email}/gi, lead.primaryEmail || '')
        .replace(/{whatsapp}/gi, lead.whatsapp || '');
}

// Send a text message via Evolution API
export async function sendWhatsAppMessage(
    phone: string,
    message: string,
    configOverrides?: Partial<EvolutionConfig>
): Promise<SendMessageResult> {
    const config = await getEvolutionConfig(configOverrides);

    if (!config) {
        return { success: false, error: 'Evolution API não configurada' };
    }

    const formattedPhone = formatPhoneForWhatsApp(phone);

    try {
        const response = await fetch(
            `${config.apiUrl}/message/sendText/${config.instanceName}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': config.apiKey,
                },
                body: JSON.stringify({
                    number: formattedPhone,
                    text: message,
                }),
            }
        );

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({})) as any;
            console.error('Evolution API error:', response.status, errorData);
            return {
                success: false,
                error: `API retornou status ${response.status}: ${errorData.message || 'Erro desconhecido'}`
            };
        }

        const data = await response.json() as any;
        return {
            success: true,
            messageId: data.key?.id || data.messageId || 'sent'
        };
    } catch (error: any) {
        console.error('Error sending WhatsApp message:', error);
        return { success: false, error: error.message || 'Erro de conexão' };
    }
}

// Check connection status of the Evolution instance
export async function checkEvolutionConnection(configOverrides?: Partial<EvolutionConfig>): Promise<{
    connected: boolean;
    state?: string;
    error?: string;
}> {
    const config = await getEvolutionConfig(configOverrides);

    if (!config) {
        return { connected: false, error: 'Evolution API não configurada' };
    }

    try {
        const response = await fetch(
            `${config.apiUrl}/instance/connectionState/${config.instanceName}`,
            {
                method: 'GET',
                headers: {
                    'apikey': config.apiKey,
                },
            }
        );

        if (!response.ok) {
            return { connected: false, error: `API retornou status ${response.status}` };
        }

        const data = await response.json() as any;
        const state = data.instance?.state || data.state;

        return {
            connected: state === 'open' || state === 'connected',
            state: state,
        };
    } catch (error: any) {
        console.error('Error checking Evolution connection:', error);
        return { connected: false, error: error.message || 'Erro de conexão' };
    }
}

// Get QR Code for connection
export async function getEvolutionQRCode(configOverrides?: Partial<EvolutionConfig>): Promise<{
    qrcode?: string;
    error?: string;
}> {
    const config = await getEvolutionConfig(configOverrides);

    if (!config) {
        return { error: 'Evolution API não configurada' };
    }

    try {
        const response = await fetch(
            `${config.apiUrl}/instance/connect/${config.instanceName}`,
            {
                method: 'GET',
                headers: {
                    'apikey': config.apiKey,
                },
            }
        );

        if (!response.ok) {
            return { error: `API retornou status ${response.status}` };
        }

        const data = await response.json() as any;
        return { qrcode: data.base64 || data.qrcode };
    } catch (error: any) {
        console.error('Error getting QR code:', error);
        return { error: error.message || 'Erro de conexão' };
    }
}
