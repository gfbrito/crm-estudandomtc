import { Temperature, LeadStage, TimelineType, SaleStatus, NotificationType } from '@/types';

export function formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
    }).format(value);
}

export function formatDate(date: Date | string | null | undefined): string {
    if (!date) return '-';
    const d = typeof date === 'string' ? new Date(date) : date;
    return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    }).format(d);
}

export function formatDateTime(date: Date | string | null | undefined): string {
    if (!date) return '-';
    const d = typeof date === 'string' ? new Date(date) : date;
    return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(d);
}

export function formatRelativeTime(date: Date | string | null | undefined): string {
    if (!date) return '-';
    const d = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Agora mesmo';
    if (diffMins < 60) return `${diffMins} min atrás`;
    if (diffHours < 24) return `${diffHours}h atrás`;
    if (diffDays < 7) return `${diffDays} dias atrás`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} sem atrás`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} meses atrás`;
    return `${Math.floor(diffDays / 365)} anos atrás`;
}

export function formatPhone(phone: string): string {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 11) {
        return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
    }
    if (cleaned.length === 10) {
        return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`;
    }
    return phone;
}

export function formatCPF(cpf: string): string {
    const cleaned = cpf.replace(/\D/g, '');
    if (cleaned.length === 11) {
        return `${cleaned.slice(0, 3)}.${cleaned.slice(3, 6)}.${cleaned.slice(6, 9)}-${cleaned.slice(9)}`;
    }
    return cpf;
}

export function getTemperatureLabel(temp: Temperature): string {
    const labels: Record<Temperature, string> = {
        hot: '🔥 Quente',
        warm: '🟡 Morno',
        cold: '🔵 Frio',
        inactive: '❄️ Inativo',
    };
    return labels[temp];
}

export function getTemperatureColor(temp: Temperature): string {
    const colors: Record<Temperature, string> = {
        hot: 'temp-hot',
        warm: 'temp-warm',
        cold: 'temp-cold',
        inactive: 'temp-inactive',
    };
    return colors[temp];
}

export function getStageLabel(stage: LeadStage): string {
    const labels: Record<LeadStage, string> = {
        lead: 'Lead Frio',
        buyer: 'Comprador',
        recurring: 'Comprador Recorrente',
        vip: 'VIP',
    };
    return labels[stage];
}

export function getStageColor(stage: LeadStage): string {
    const colors: Record<LeadStage, string> = {
        lead: 'bg-gray-100 text-gray-700',
        buyer: 'bg-blue-100 text-blue-700',
        recurring: 'bg-green-100 text-green-700',
        vip: 'bg-purple-100 text-purple-700',
    };
    return colors[stage];
}

export function getTimelineTypeLabel(type: TimelineType): string {
    const labels: Record<TimelineType, string> = {
        note: 'Anotação Manual',
        contact: 'Contato Realizado',
        followup: 'Follow-up',
        observation: 'Observação',
        sale: 'Venda',
        system: 'Sistema',
    };
    return labels[type];
}

export function getTimelineTypeIcon(type: TimelineType): string {
    const icons: Record<TimelineType, string> = {
        note: '📝',
        contact: '📞',
        followup: '🔄',
        observation: '👁️',
        sale: '💰',
        system: '⚙️',
    };
    return icons[type];
}

export function getSaleStatusLabel(status: SaleStatus): string {
    const labels: Record<SaleStatus, string> = {
        approved: 'Aprovada',
        pending: 'Aguardando Pagamento',
        refunded: 'Reembolsada',
        cancelled: 'Cancelada',
    };
    return labels[status];
}

export function getSaleStatusColor(status: SaleStatus): string {
    const colors: Record<SaleStatus, string> = {
        approved: 'bg-green-100 text-green-700',
        pending: 'bg-yellow-100 text-yellow-700',
        refunded: 'bg-red-100 text-red-700',
        cancelled: 'bg-gray-100 text-gray-700',
    };
    return colors[status];
}

export function getNotificationTypeLabel(type: NotificationType): string {
    const labels: Record<NotificationType, string> = {
        product_not_found: 'Produto não encontrado',
        lead_merge: 'Possível duplicidade',
        new_origin: 'Nova origem de webhook',
        processing_error: 'Erro de processamento',
        product_link: 'Vinculação de produto',
    };
    return labels[type];
}

export function getDaysSince(date: Date | string | null | undefined): number {
    if (!date) return Infinity;
    const d = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

export function truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + '...';
}

export function classNames(...classes: (string | boolean | undefined)[]): string {
    return classes.filter(Boolean).join(' ');
}

export function debounce<T extends (...args: unknown[]) => unknown>(
    func: T,
    wait: number
): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout;
    return (...args: Parameters<T>) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
}

export function generateId(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
}
