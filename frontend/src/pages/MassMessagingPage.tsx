import { useState, useEffect, useMemo } from 'react';
import {
    Send,
    Calendar,
    Clock,
    Users,
    Filter,
    Eye,
    Bold,
    Italic,
    Strikethrough,
    Code,
    X,
    ChevronDown,
    ChevronUp,
    RefreshCw,
    Trash2,
    Rocket,
    Zap,
    MessageSquare,
    Plus,
} from 'lucide-react';
import { api } from '@/config/api';
import { useAuth } from '@/contexts/AuthContext';
import Button from '@/components/Button';
import Modal from '@/components/Modal';
import DataTable from '@/components/DataTable';
import { Input } from '@/components/FormFields';
import { useToast } from '@/components/Toast';
import { Lead, Product, MassMessage, MassMessageStatus, SegmentationFilters, Temperature, LeadStage } from '@/types';
import { formatDate } from '@/utils/formatters';
import ConfirmationModal from '@/components/ConfirmationModal';


// WhatsApp formatting helper
const formatWhatsAppText = (text: string): string => {
    return text
        .replace(/\*([^*]+)\*/g, '<strong>$1</strong>')
        .replace(/_([^_]+)_/g, '<em>$1</em>')
        .replace(/~([^~]+)~/g, '<del>$1</del>')
        .replace(/`([^`]+)`/g, '<code class="bg-dark-600 px-1 rounded text-primary-300">$1</code>')
        .replace(/\n/g, '<br />');
};

// Temperature and Stage label maps
const temperatureLabels: Record<Temperature, string> = {
    hot: '🔥 Quente',
    warm: '☀️ Morno',
    cold: '❄️ Frio',
    inactive: '💤 Inativo',
};

const stageLabels: Record<LeadStage, string> = {
    lead: '👤 Lead',
    buyer: '🛒 Comprador',
    recurring: '🔄 Recorrente',
    vip: '⭐ VIP',
};

const statusConfig: Record<MassMessageStatus, { label: string; color: string; glowDot: string }> = {
    draft: { label: 'Rascunho', color: 'bg-gray-500/10 text-gray-400', glowDot: 'glow-dot-gray' },
    scheduled: { label: 'Agendada', color: 'bg-blue-500/10 text-blue-400', glowDot: 'glow-dot-blue' },
    sending: { label: 'Enviando', color: 'bg-yellow-500/10 text-yellow-400', glowDot: 'glow-dot-yellow' },
    completed: { label: 'Concluída', color: 'bg-green-500/10 text-green-400', glowDot: 'glow-dot-green' },
    cancelled: { label: 'Cancelada', color: 'bg-red-500/10 text-red-400', glowDot: 'glow-dot-red' },
};

// Progress Ring Component
function ProgressRing({ progress, size = 40, strokeWidth = 3 }: { progress: number; size?: number; strokeWidth?: number }) {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (progress / 100) * circumference;

    return (
        <svg width={size} height={size} className="transform -rotate-90">
            <circle cx={size / 2} cy={size / 2} r={radius} stroke="currentColor" strokeWidth={strokeWidth}
                fill="none" className="text-dark-700/50" />
            <circle cx={size / 2} cy={size / 2} r={radius} stroke="url(#progressGradient)" strokeWidth={strokeWidth}
                fill="none" strokeDasharray={circumference} strokeDashoffset={offset}
                strokeLinecap="round" className="transition-all duration-1000 ease-out" />
            <defs>
                <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#7c3aed" />
                    <stop offset="100%" stopColor="#a78bfa" />
                </linearGradient>
            </defs>
        </svg>
    );
}

export default function MassMessagingPage() {
    const { isMaster } = useAuth();
    const { success, error } = useToast();

    // State
    const [activeTab, setActiveTab] = useState<'new' | 'manual' | 'scheduled' | 'history'>('new');
    const [loading, setLoading] = useState(false);
    const [leads, setLeads] = useState<Lead[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [messages, setMessages] = useState<MassMessage[]>([]);
    const [allTags, setAllTags] = useState<string[]>([]);
    const [allPlatforms, setAllPlatforms] = useState<string[]>([]);

    // Form State
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [scheduledDate, setScheduledDate] = useState('');
    const [scheduledTime, setScheduledTime] = useState('');
    const [sendNow, setSendNow] = useState(false);

    // Manual Input State
    const [manualNumbers, setManualNumbers] = useState('');
    const [sendingManual, setSendingManual] = useState(false);
    const [manualResults, setManualResults] = useState<{ sent: number, failed: number, total: number } | null>(null);

    // Segmentation State
    const [filters, setFilters] = useState<SegmentationFilters>({});
    const [showFilters, setShowFilters] = useState(true);

    // Modals
    const [showPreviewModal, setShowPreviewModal] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState<{ isOpen: boolean; messageId: string | null }>({ isOpen: false, messageId: null });

    // Product buyer lead IDs (for product filter)
    const [productBuyerIds, setProductBuyerIds] = useState<Set<string> | null>(null);
    const [loadingProductFilter, setLoadingProductFilter] = useState(false);

    // Fetch data
    useEffect(() => {
        fetchLeads();
        fetchProducts();
        fetchMessages();
    }, []);

    // Fetch buyer lead IDs when product filter changes
    useEffect(() => {
        if (!filters.productIds?.length) {
            setProductBuyerIds(null);
            return;
        }
        const fetchBuyers = async () => {
            setLoadingProductFilter(true);
            try {
                const productIds = filters.productIds?.join(',') || '';
                const ids = await api.get(`/api/sales/buyers?productIds=${productIds}`);
                setProductBuyerIds(new Set(ids || []));
            } catch (err) {
                console.error('Error fetching product buyers:', err);
                setProductBuyerIds(new Set());
            } finally {
                setLoadingProductFilter(false);
            }
        };
        fetchBuyers();
    }, [filters.productIds]);

    const fetchLeads = async () => {
        try {
            setLoading(true);

            let allLeads: any[] = [];
            let page = 1;

            // Loop to fetch all leads using the paginated endpoint
            while (true) {
                const response = await api.get(`/api/leads?page=${page}&pageSize=500`);
                if (!response || !response.data || response.data.length === 0) break;

                allLeads = allLeads.concat(response.data);

                if (response.data.length < 500) break;
                page++;
            }

            const leadsData: Lead[] = allLeads.map((doc: any) => ({
                id: doc.id,
                name: doc.name,
                primaryEmail: doc.primary_email,
                secondaryEmails: [], // Optimized out
                whatsapp: doc.whatsapp,
                cpf: '', // Optimized out
                city: '', // Optimized out
                state: '', // Optimized out
                tags: doc.tags,
                origin: doc.origin,
                points: doc.points,
                temperature: doc.temperature,
                stage: doc.stage,
                totalSpent: doc.total_spent,
                purchaseCount: doc.purchase_count,
                lastPurchaseAt: doc.last_purchase_at ? new Date(doc.last_purchase_at) : null,
                birthDate: doc.birth_date ? new Date(doc.birth_date) : null,
                createdAt: doc.created_at ? new Date(doc.created_at) : new Date(),
                updatedAt: doc.updated_at ? new Date(doc.updated_at) : new Date(), // Fallback
            }));
            setLeads(leadsData);

            // Extract unique tags and platforms
            const tags = new Set<string>();
            const platforms = new Set<string>();
            leadsData.forEach(lead => {
                lead.tags?.forEach((tag: string) => tags.add(tag));
                if (lead.origin) platforms.add(lead.origin);
            });
            setAllTags(Array.from(tags).sort());
            setAllPlatforms(Array.from(platforms).sort());
        } catch (err) {
            console.error('Error fetching leads:', err);
            error('Erro', 'Erro ao carregar leads. Tente recarregar a página.');
        } finally {
            setLoading(false);
        }
    };

    const fetchProducts = async () => {
        try {
            const data = await api.get('/api/products');

            const productsData: Product[] = (data || []).map((doc: any) => ({
                id: doc.id,
                name: doc.name,
                type: doc.type,
                defaultPrice: doc.default_price,
                status: doc.status,
                externalIds: doc.external_ids,
                createdAt: doc.created_at ? new Date(doc.created_at) : new Date(),
            }));
            setProducts(productsData);
        } catch (err) {
            console.error('Error fetching products:', err);
        }
    };

    const fetchMessages = async () => {
        try {
            const data = await api.get('/api/mass-messages');

            const messagesData: MassMessage[] = (data || []).map((doc: any) => ({
                id: doc.id,
                title: doc.title,
                content: doc.content,
                status: doc.status,
                recipientCount: doc.recipient_count,
                sentCount: doc.sent_count,
                failedCount: doc.failed_count,
                filters: doc.filters,
                scheduledAt: doc.scheduled_at ? new Date(doc.scheduled_at) : new Date(),
                createdAt: doc.created_at ? new Date(doc.created_at) : new Date(),
                startedAt: doc.started_at ? new Date(doc.started_at) : undefined,
                completedAt: doc.completed_at ? new Date(doc.completed_at) : undefined,
                createdBy: doc.created_by
            }));
            setMessages(messagesData);
        } catch (err) {
            console.error('Error fetching messages:', err);
        }
    };

    // Filter leads based on segmentation
    const filteredLeads = useMemo(() => {
        return leads.filter(lead => {
            // Must have WhatsApp
            if (!lead.whatsapp) return false;

            // Product filter — must have purchased selected product(s)
            if (filters.productIds?.length) {
                if (!productBuyerIds || !productBuyerIds.has(lead.id)) return false;
            }

            // Temperature filter
            if (filters.temperatures?.length && !filters.temperatures.includes(lead.temperature)) {
                return false;
            }

            // Stage filter
            if (filters.stages?.length && !filters.stages.includes(lead.stage)) {
                return false;
            }

            // Score range filter
            if (filters.scoreRange) {
                if (lead.points < filters.scoreRange.min || lead.points > filters.scoreRange.max) {
                    return false;
                }
            }

            // Tags filter
            if (filters.tags?.length) {
                const hasTag = filters.tags.some(tag => lead.tags?.includes(tag));
                if (!hasTag) return false;
            }

            // Last purchase days filter
            if (filters.lastPurchaseDays && lead.lastPurchaseAt) {
                const daysSincePurchase = Math.floor((Date.now() - new Date(lead.lastPurchaseAt).getTime()) / (1000 * 60 * 60 * 24));
                if (daysSincePurchase < filters.lastPurchaseDays.min || daysSincePurchase > filters.lastPurchaseDays.max) {
                    return false;
                }
            }

            // Total spent filter
            if (filters.totalSpentRange) {
                if (lead.totalSpent < filters.totalSpentRange.min || lead.totalSpent > filters.totalSpentRange.max) {
                    return false;
                }
            }

            // Purchase count filter
            if (filters.purchaseCountRange) {
                if (lead.purchaseCount < filters.purchaseCountRange.min || lead.purchaseCount > filters.purchaseCountRange.max) {
                    return false;
                }
            }

            // Platform filter
            if (filters.platforms?.length && lead.origin) {
                if (!filters.platforms.includes(lead.origin)) {
                    return false;
                }
            }

            // Birthday month filter
            if (filters.birthdayMonth && lead.birthDate) {
                const birthMonth = new Date(lead.birthDate).getMonth() + 1; // getMonth() is 0-indexed
                if (birthMonth !== filters.birthdayMonth) {
                    return false;
                }
            }

            return true;
        });
    }, [leads, filters, productBuyerIds]);

    // Insert formatting
    const insertFormat = (format: 'bold' | 'italic' | 'strike' | 'code') => {
        const textarea = document.getElementById('message-content') as HTMLTextAreaElement;
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selectedText = content.substring(start, end);

        const formats: Record<string, { prefix: string; suffix: string }> = {
            bold: { prefix: '*', suffix: '*' },
            italic: { prefix: '_', suffix: '_' },
            strike: { prefix: '~', suffix: '~' },
            code: { prefix: '`', suffix: '`' },
        };

        const { prefix, suffix } = formats[format];
        const newText = content.substring(0, start) + prefix + selectedText + suffix + content.substring(end);
        setContent(newText);

        // Re-focus and set cursor position
        setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(start + prefix.length, end + prefix.length);
        }, 0);
    };

    // Insert variable
    const insertVariable = (variable: string) => {
        const textarea = document.getElementById('message-content') as HTMLTextAreaElement;
        if (!textarea) return;

        const start = textarea.selectionStart;
        const newText = content.substring(0, start) + variable + content.substring(start);
        setContent(newText);

        setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(start + variable.length, start + variable.length);
        }, 0);
    };

    // Preview message with replaced variables
    const previewMessage = useMemo(() => {
        return content
            .replace(/{nome}/g, 'João Silva')
            .replace(/{email}/g, 'joao@example.com')
            .replace(/{whatsapp}/g, '11999999999');
    }, [content]);

    // Save/Schedule message
    const handleSaveMessage = async (status: MassMessageStatus) => {
        if (!title.trim()) {
            error('Erro', 'Por favor, insira um título para a mensagem.');
            return;
        }
        if (!content.trim()) {
            error('Erro', 'Por favor, insira o conteúdo da mensagem.');
            return;
        }
        if (!sendNow && status === 'scheduled' && (!scheduledDate || !scheduledTime)) {
            error('Erro', 'Por favor, selecione a data e hora do agendamento.');
            return;
        }
        if (filteredLeads.length === 0) {
            error('Erro', 'Nenhum destinatário encontrado com os filtros selecionados.');
            return;
        }

        setLoading(true);
        try {
            const scheduledAt = sendNow ? new Date() : new Date(`${scheduledDate}T${scheduledTime}`);

            await api.post('/api/mass-messages', {
                title: title.trim(),
                content: content.trim(),
                scheduled_at: scheduledAt.toISOString(),
                status,
                filters: filters as any,
                recipient_count: filteredLeads.length,
                sent_count: 0,
                failed_count: 0
            });

            success('Sucesso', status === 'scheduled' ? 'Mensagem agendada com sucesso!' : 'Rascunho salvo!');

            // Reset form
            setTitle('');
            setContent('');
            setScheduledDate('');
            setScheduledTime('');
            setSendNow(false);
            setFilters({});

            // Refresh messages list
            fetchMessages();

            // Switch to scheduled tab if scheduled
            if (status === 'scheduled') {
                setActiveTab('scheduled');
            }
        } catch (err) {
            console.error('Error saving message:', err);
            error('Erro', 'Não foi possível salvar a mensagem.');
        } finally {
            setLoading(false);
        }
    };

    // Cancel message
    const handleCancelMessage = async (messageId: string) => {
        try {
            await api.put(`/api/mass-messages/${messageId}/cancel`, {});

            success('Sucesso', 'Mensagem cancelada.');
            fetchMessages();
        } catch (err) {
            console.error('Error cancelling message:', err);
            error('Erro', 'Não foi possível cancelar a mensagem.');
        }
    };

    // Delete message
    const handleDeleteMessage = async () => {
        if (!confirmDelete.messageId) return;
        try {
            await api.delete(`/api/mass-messages/${confirmDelete.messageId}`);

            success('Sucesso', 'Mensagem excluída.');
            fetchMessages();
        } catch (err) {
            console.error('Error deleting message:', err);
            error('Erro', 'Não foi possível excluir a mensagem.');
        } finally {
            setConfirmDelete({ isOpen: false, messageId: null });
        }
    };

    // Handle Manual Send
    const handleSendManual = async () => {
        if (!content.trim()) {
            error('Erro', 'Por favor, insira o conteúdo da mensagem.');
            return;
        }

        const numbers = manualNumbers.split(/[\n,;]+/).map(n => n.trim()).filter(n => n.length >= 10);

        if (numbers.length === 0) {
            error('Erro', 'Insira pelo menos um número de telefone válido.');
            return;
        }

        setSendingManual(true);
        setManualResults(null);

        try {
            // Fetch config from Supabase settings table via backend endpoint helper or direct DB
            // We'll use the backend endpoint to send, which automatically fetches config from DB
            // But for manual send, we might want to ensure we have config.

            // The backend /evolution/mass endpoint should handle fetching config from DB itself!
            // We don't need to pass headers if the backend does its job.
            // AND we removed localStorage so we CAN'T pass headers effectively unless we fetch from DB first.

            const response = await fetch(`${(import.meta.env.VITE_API_URL || 'http://localhost:3001/api').replace(/\/$/, '')}/evolution/mass`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }, // No custom headers, rely on Backend DB
                body: JSON.stringify({
                    recipients: numbers,
                    message: content,
                    delaySettings: { min: 3, max: 7 }
                })
            });

            const data = await response.json();

            if (data.success) {
                success('Sucesso', `${data.sent} mensagens enviadas, ${data.failed} falhas.`);
                setManualResults({ sent: data.sent, failed: data.failed, total: data.total });
            } else {
                error('Erro', data.error || 'Erro ao enviar mensagens.');
            }
        } catch (err) {
            console.error('Error sending manual messages:', err);
            error('Erro', 'Erro de conexão ao enviar mensagens.');
        } finally {
            setSendingManual(false);
        }
    };

    // Toggle filter array value
    const toggleArrayFilter = <K extends keyof SegmentationFilters>(
        key: K,
        value: SegmentationFilters[K] extends (infer T)[] | undefined ? T : never
    ) => {
        setFilters(prev => {
            const currentArray = (prev[key] as any[]) || [];
            const newArray = currentArray.includes(value)
                ? currentArray.filter(v => v !== value)
                : [...currentArray, value];
            return { ...prev, [key]: newArray.length > 0 ? newArray : undefined };
        });
    };

    // Scheduled and history messages
    const scheduledMessages = messages.filter(m => m.status === 'scheduled' || m.status === 'sending');
    const historyMessages = messages.filter(m => m.status === 'completed' || m.status === 'cancelled');

    // Message columns for DataTable
    const messageColumns = [
        {
            key: 'title', header: 'TÍTULO', sortable: true, render: (m: MassMessage) => (
                <span className="font-medium text-white">{m.title}</span>
            )
        },
        {
            key: 'scheduledAt', header: 'AGENDADO PARA', sortable: true, render: (m: MassMessage) => (
                <span className="text-gray-400 text-sm">{formatDate(m.scheduledAt)} {m.scheduledAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
            )
        },
        {
            key: 'recipientCount', header: 'DESTINATÁRIOS', render: (m: MassMessage) => (
                <div className="flex items-center gap-2">
                    <Users className="w-3.5 h-3.5 text-primary-400" />
                    <span className="font-semibold text-white">{m.recipientCount}</span>
                </div>
            )
        },
        {
            key: 'status', header: 'STATUS', render: (m: MassMessage) => (
                <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide ${statusConfig[m.status].color}`}>
                    <span className={`glow-dot ${statusConfig[m.status].glowDot}`} />
                    {statusConfig[m.status].label}
                </span>
            )
        },
        {
            key: 'progress', header: 'PROGRESSO', render: (m: MassMessage) => {
                const pct = m.recipientCount > 0 ? Math.round((m.sentCount / m.recipientCount) * 100) : 0;
                return (
                    <div className="flex items-center gap-3">
                        <ProgressRing progress={pct} size={36} strokeWidth={3} />
                        <div>
                            <span className="text-sm font-semibold text-white">{pct}%</span>
                            <span className="text-xs text-gray-500 ml-1">({m.sentCount}/{m.recipientCount})</span>
                        </div>
                    </div>
                );
            }
        },
    ];

    if (!isMaster) {
        return (
            <div className="flex items-center justify-center h-64">
                <p className="text-gray-500">Acesso restrito a administradores.</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 bg-gradient-mesh min-h-[calc(100vh-48px)] -m-6 p-8">
            <ConfirmationModal
                isOpen={confirmDelete.isOpen}
                onClose={() => setConfirmDelete({ isOpen: false, messageId: null })}
                onConfirm={handleDeleteMessage}
                title="Excluir Mensagem"
                message="Tem certeza que deseja excluir esta mensagem? Esta ação não pode ser desfeita."
                variant="danger"
                confirmText="Excluir"
            />

            {/* Premium Header */}
            <div className="flex items-center justify-between">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <h1 className="text-3xl font-bold text-white tracking-tight">
                            Mensagens em Massa
                        </h1>
                        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20">
                            <span className="glow-dot glow-dot-green animate-pulse-glow" />
                            <span className="text-xs font-medium text-green-400">Conectado</span>
                        </div>
                    </div>
                    <p className="text-gray-400">
                        Envie mensagens para múltiplos leads com segmentação avançada
                    </p>
                </div>
                <Button variant="outline" onClick={() => { fetchLeads(); fetchMessages(); }} icon={<RefreshCw className="w-4 h-4" />}
                    className="!border-dark-600 hover:!border-primary-600/50 !text-gray-400 hover:!text-white transition-all">
                    Atualizar
                </Button>
            </div>

            {/* Premium Pill Tabs */}
            <div className="inline-flex items-center gap-2 p-1.5 rounded-2xl bg-dark-800/80 backdrop-blur-sm border border-white/5">
                {[
                    { id: 'new', label: 'Nova Campanha', icon: Zap },
                    { id: 'manual', label: 'Entrada Manual', icon: MessageSquare },
                    { id: 'scheduled', label: 'Agendadas', icon: Calendar, count: scheduledMessages.length },
                    { id: 'history', label: 'Histórico', icon: Clock },
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as typeof activeTab)}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 ${activeTab === tab.id
                            ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/30'
                            : 'text-gray-400 hover:text-white hover:bg-white/5'
                            }`}
                    >
                        <tab.icon className="w-4 h-4" />
                        <span className="hidden sm:inline">{tab.label}</span>
                        {tab.count !== undefined && tab.count > 0 && (
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${activeTab === tab.id
                                ? 'bg-white/20 text-white'
                                : 'bg-primary-500/20 text-primary-400'
                                }`}>
                                {tab.count}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* New Message Tab */}
            {activeTab === 'new' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-slide-up">
                    {/* Left Column - Composer */}
                    <div className="space-y-5">
                        {/* Title */}
                        <div className="glass-card rounded-2xl p-6">
                            <Input
                                label="Título da Mensagem"
                                placeholder="Ex: Promoção de Fim de Ano"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                            />
                        </div>

                        {/* Segmentation Accordion */}
                        <div className="glass-card rounded-2xl overflow-hidden transition-all duration-300">
                            <button
                                onClick={() => setShowFilters(!showFilters)}
                                className="w-full flex items-center justify-between p-6 hover:bg-white/5 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`p-2.5 rounded-xl ${showFilters ? 'bg-primary-600/20 text-primary-400' : 'bg-white/5 text-gray-500'} transition-colors`}>
                                        <Filter className="w-5 h-5" />
                                    </div>
                                    <div className="text-left">
                                        <h3 className="font-semibold text-white">Segmentação</h3>
                                        {!showFilters && (
                                            <p className="text-sm text-gray-400">
                                                {filteredLeads.length === leads.length
                                                    ? `Todos os ${leads.length} leads selecionados`
                                                    : `${filteredLeads.length} destinatários selecionados`}
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    {showFilters && (
                                        <span className={`px-3 py-1 rounded-lg text-xs font-bold ${filteredLeads.length > 0
                                            ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                                            : 'bg-white/5 text-gray-500 border border-white/5'
                                            }`}>
                                            {loadingProductFilter ? '...' : filteredLeads.length} leads
                                        </span>
                                    )}
                                    {showFilters ? <ChevronUp className="w-5 h-5 text-gray-500" /> : <ChevronDown className="w-5 h-5 text-gray-500" />}
                                </div>
                            </button>

                            {showFilters && (
                                <div className="p-6 pt-0 border-t border-white/5">
                                    <div className="mt-6 space-y-6">
                                        {/* Filters Grid */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            {/* Temperature Filter */}
                                            <div>
                                                <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">
                                                    Temperatura
                                                </label>
                                                <div className="flex flex-wrap gap-2">
                                                    {(['hot', 'warm', 'cold', 'inactive'] as Temperature[]).map(temp => (
                                                        <button
                                                            key={temp}
                                                            onClick={() => toggleArrayFilter('temperatures', temp)}
                                                            className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-all duration-200 ${filters.temperatures?.includes(temp)
                                                                ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/20'
                                                                : 'bg-white/5 text-gray-400 hover:bg-white/10 border border-white/5'
                                                                }`}
                                                        >
                                                            {temperatureLabels[temp]}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Stage Filter */}
                                            <div>
                                                <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">
                                                    Estágio
                                                </label>
                                                <div className="flex flex-wrap gap-2">
                                                    {(['lead', 'buyer', 'recurring', 'vip'] as LeadStage[]).map(stage => (
                                                        <button
                                                            key={stage}
                                                            onClick={() => toggleArrayFilter('stages', stage)}
                                                            className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-all duration-200 ${filters.stages?.includes(stage)
                                                                ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/20'
                                                                : 'bg-white/5 text-gray-400 hover:bg-white/10 border border-white/5'
                                                                }`}
                                                        >
                                                            {stageLabels[stage]}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Products Filter */}
                                        {products.length > 0 && (
                                            <div>
                                                <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">
                                                    Produtos
                                                </label>
                                                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-1">
                                                    {products.map(product => (
                                                        <button
                                                            key={product.id}
                                                            onClick={() => toggleArrayFilter('productIds', product.id)}
                                                            className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-all duration-200 ${filters.productIds?.includes(product.id)
                                                                ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/20'
                                                                : 'bg-white/5 text-gray-400 hover:bg-white/10 border border-white/5'
                                                                }`}
                                                        >
                                                            {product.name}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Tags Filter */}
                                        {allTags.length > 0 && (
                                            <div>
                                                <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">
                                                    Tags
                                                </label>
                                                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-1">
                                                    {allTags.map(tag => (
                                                        <button
                                                            key={tag}
                                                            onClick={() => toggleArrayFilter('tags', tag)}
                                                            className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-all duration-200 ${filters.tags?.includes(tag)
                                                                ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/20'
                                                                : 'bg-white/5 text-gray-400 hover:bg-white/10 border border-white/5'
                                                                }`}
                                                        >
                                                            {tag}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            {/* Platform Filter */}
                                            {allPlatforms.length > 0 && (
                                                <div>
                                                    <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">
                                                        Plataforma de Origem
                                                    </label>
                                                    <div className="flex flex-wrap gap-2">
                                                        {allPlatforms.map(platform => (
                                                            <button
                                                                key={platform}
                                                                onClick={() => toggleArrayFilter('platforms', platform)}
                                                                className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-all duration-200 ${filters.platforms?.includes(platform)
                                                                    ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/20'
                                                                    : 'bg-white/5 text-gray-400 hover:bg-white/10 border border-white/5'
                                                                    }`}
                                                            >
                                                                {platform}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Score Range */}
                                            <div>
                                                <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">
                                                    Pontuação (Score)
                                                </label>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <Input
                                                        type="number"
                                                        placeholder="Mínimo"
                                                        value={filters.scoreRange?.min ?? ''}
                                                        onChange={(e) => setFilters(prev => ({
                                                            ...prev,
                                                            scoreRange: { min: Number(e.target.value) || 0, max: prev.scoreRange?.max ?? 99999 }
                                                        }))}
                                                    />
                                                    <Input
                                                        type="number"
                                                        placeholder="Máximo"
                                                        value={filters.scoreRange?.max ?? ''}
                                                        onChange={(e) => setFilters(prev => ({
                                                            ...prev,
                                                            scoreRange: { min: prev.scoreRange?.min ?? 0, max: Number(e.target.value) || 99999 }
                                                        }))}
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Recipients List Preview */}
                                        <div className="mt-6 pt-6 border-t border-white/5">
                                            <div className="flex items-center justify-between mb-3">
                                                <h4 className="text-xs font-semibold text-gray-400 flex items-center gap-2 uppercase tracking-wider">
                                                    <Users className="w-4 h-4 text-primary-400" />
                                                    Lista de Destinatários
                                                </h4>
                                            </div>

                                            {loadingProductFilter ? (
                                                <div className="text-center py-4 text-gray-500 text-sm">
                                                    <RefreshCw className="w-4 h-4 animate-spin inline mr-2" />
                                                    Buscando compradores do produto...
                                                </div>
                                            ) : filteredLeads.length === 0 ? (
                                                <div className="text-center py-4 text-gray-500 text-sm">
                                                    Nenhum destinatário encontrado.
                                                </div>
                                            ) : (
                                                <div className="space-y-1 max-h-40 overflow-y-auto bg-dark-900/50 rounded-xl p-2 border border-white/5">
                                                    {filteredLeads.slice(0, 50).map((lead) => (
                                                        <div
                                                            key={lead.id}
                                                            className="flex items-center justify-between py-1.5 px-3 rounded-lg hover:bg-white/5 text-xs transition-colors hover-accent"
                                                        >
                                                            <span className="text-gray-300 truncate flex-1">
                                                                {lead.name || 'Sem nome'}
                                                            </span>
                                                            <span className="text-gray-500 font-mono whitespace-nowrap ml-2">
                                                                {lead.whatsapp}
                                                            </span>
                                                        </div>
                                                    ))}
                                                    {filteredLeads.length > 50 && (
                                                        <div className="text-center text-xs text-gray-500 pt-2">
                                                            e mais {filteredLeads.length - 50} destinatários...
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Message Composer */}
                        <div className="glass-card rounded-2xl p-6">
                            <label className="block text-xs font-semibold text-gray-400 mb-3 uppercase tracking-wider">
                                Conteúdo da Mensagem
                            </label>

                            {/* Formatting Toolbar */}
                            <div className="flex flex-wrap items-center gap-1 mb-3 p-2 bg-dark-900/50 rounded-xl border border-white/5">
                                <button onClick={() => insertFormat('bold')} className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-all" title="Negrito">
                                    <Bold className="w-4 h-4" />
                                </button>
                                <button onClick={() => insertFormat('italic')} className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-all" title="Itálico">
                                    <Italic className="w-4 h-4" />
                                </button>
                                <button onClick={() => insertFormat('strike')} className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-all" title="Tachado">
                                    <Strikethrough className="w-4 h-4" />
                                </button>
                                <button onClick={() => insertFormat('code')} className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-all" title="Código">
                                    <Code className="w-4 h-4" />
                                </button>

                                <div className="w-px h-6 bg-white/10 mx-2" />

                                <button onClick={() => insertVariable('{nome}')} className="px-2.5 py-1 text-xs bg-primary-600/15 text-primary-400 rounded-lg hover:bg-primary-600/25 transition-colors border border-primary-600/20">
                                    {'{nome}'}
                                </button>
                                <button onClick={() => insertVariable('{email}')} className="px-2.5 py-1 text-xs bg-primary-600/15 text-primary-400 rounded-lg hover:bg-primary-600/25 transition-colors border border-primary-600/20">
                                    {'{email}'}
                                </button>
                                <button onClick={() => insertVariable('{whatsapp}')} className="px-2.5 py-1 text-xs bg-primary-600/15 text-primary-400 rounded-lg hover:bg-primary-600/25 transition-colors border border-primary-600/20">
                                    {'{whatsapp}'}
                                </button>
                            </div>

                            {/* Textarea */}
                            <textarea
                                id="message-content"
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                placeholder="Digite sua mensagem aqui... Use *negrito*, _itálico_, ~tachado~ e `código`"
                                className="w-full h-40 px-4 py-3 border border-white/5 rounded-xl bg-dark-900/50 text-white placeholder-gray-500 resize-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500/50 transition-all"
                            />

                            {/* Character Count */}
                            <div className="flex justify-between items-center mt-2 text-sm text-gray-500">
                                <span>{content.length} caracteres</span>
                                <button
                                    onClick={() => setShowPreviewModal(true)}
                                    className="flex items-center gap-1 text-primary-400 hover:text-primary-300 transition-colors"
                                >
                                    <Eye className="w-4 h-4" />
                                    Visualizar
                                </button>
                            </div>
                        </div>

                        {/* Scheduling */}
                        <div className="glass-card rounded-2xl p-6">
                            <h3 className="font-semibold text-white mb-4">Agendamento</h3>

                            <label className="flex items-center gap-3 mb-4 cursor-pointer group">
                                <input
                                    type="checkbox"
                                    checked={sendNow}
                                    onChange={(e) => setSendNow(e.target.checked)}
                                    className="w-5 h-5 rounded-lg border-white/10 bg-dark-900/50 text-primary-600 focus:ring-primary-500/50 focus:ring-offset-0"
                                />
                                <span className="text-gray-300 group-hover:text-white transition-colors">Enviar imediatamente</span>
                            </label>

                            {!sendNow && (
                                <div className="grid grid-cols-2 gap-4">
                                    <Input label="Data" type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} min={new Date().toISOString().split('T')[0]} />
                                    <Input label="Hora" type="time" value={scheduledTime} onChange={(e) => setScheduledTime(e.target.value)} />
                                </div>
                            )}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-3">
                            <Button
                                variant="outline"
                                onClick={() => handleSaveMessage('draft')}
                                disabled={loading}
                                className="flex-1 !border-white/10 !text-gray-400 hover:!text-white hover:!border-white/20"
                            >
                                Salvar Rascunho
                            </Button>
                            <button
                                onClick={() => handleSaveMessage('scheduled')}
                                disabled={loading}
                                className="flex-1 gradient-btn text-white font-semibold py-2.5 px-6 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Send className="w-4 h-4" />
                                {sendNow ? 'Enviar Agora' : 'Agendar Envio'}
                            </button>
                        </div>
                    </div>

                    {/* Right Column - Preview & Segmentation */}
                    <div className="space-y-5">
                        {/* WhatsApp Preview */}
                        <div className="glass-card rounded-2xl p-6">
                            <h3 className="font-semibold text-white mb-4">Prévia do WhatsApp</h3>
                            <div className="bg-[#0b141a] rounded-xl p-4 min-h-[200px] border border-white/5">
                                <div className="max-w-[80%] ml-auto">
                                    <div className="bg-[#005c4b] rounded-xl p-3 shadow-lg">
                                        <p
                                            className="text-white text-sm whitespace-pre-wrap"
                                            dangerouslySetInnerHTML={{ __html: formatWhatsAppText(previewMessage) || '<span class="text-gray-500">Digite uma mensagem...</span>' }}
                                        />
                                        <div className="text-right mt-1">
                                            <span className="text-[10px] text-gray-400">
                                                {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            )}

            {/* Manual Input Tab */}
            {activeTab === 'manual' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-slide-up">
                    {/* Left Column */}
                    <div className="space-y-5">
                        <div className="glass-card rounded-2xl p-6">
                            <h3 className="font-semibold text-white mb-4">Lista de Destinatários</h3>
                            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 mb-4">
                                <p className="text-sm text-yellow-300">
                                    <strong>Modo Manual:</strong> Este modo funciona mesmo sem o banco de dados.
                                    As mensagens são enviadas imediatamente. Variáveis como nome não estão disponíveis.
                                </p>
                            </div>

                            <div className="mb-4">
                                <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">
                                    Números (um por linha)
                                </label>
                                <textarea
                                    className="w-full h-40 p-3 bg-dark-900/50 border border-white/5 rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500/50 transition-all resize-none"
                                    placeholder={"5511999999999\n5511888888888"}
                                    value={manualNumbers}
                                    onChange={(e) => setManualNumbers(e.target.value)}
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    {manualNumbers.split('\n').filter(n => n.trim().length >= 10).length} números identificados
                                </p>
                            </div>

                            <div className="mb-4">
                                <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">
                                    Mensagem
                                </label>
                                <textarea
                                    className="w-full h-32 p-3 bg-dark-900/50 border border-white/5 rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500/50 transition-all resize-none"
                                    placeholder="Digite sua mensagem aqui..."
                                    value={content}
                                    onChange={(e) => setContent(e.target.value)}
                                />
                            </div>

                            <button
                                onClick={handleSendManual}
                                disabled={sendingManual || !manualNumbers.trim() || !content.trim()}
                                className="w-full gradient-btn text-white font-semibold py-3 px-6 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {sendingManual ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                Enviar Manualmente
                            </button>
                        </div>

                        {/* Recent Results */}
                        {manualResults && (
                            <div className="glass-card rounded-2xl p-6 animate-slide-up">
                                <h3 className="font-semibold text-white mb-4">Resultado do Envio</h3>
                                <div className="grid grid-cols-3 gap-4 text-center">
                                    <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                                        <div className="text-2xl font-bold text-white">{manualResults.total}</div>
                                        <div className="text-xs text-gray-500 mt-1">Total</div>
                                    </div>
                                    <div className="p-4 bg-green-500/10 rounded-xl border border-green-500/20">
                                        <div className="text-2xl font-bold text-green-400">{manualResults.sent}</div>
                                        <div className="text-xs text-green-400 mt-1">Enviados</div>
                                    </div>
                                    <div className="p-4 bg-red-500/10 rounded-xl border border-red-500/20">
                                        <div className="text-2xl font-bold text-red-400">{manualResults.failed}</div>
                                        <div className="text-xs text-red-400 mt-1">Falhas</div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right Column - Preview */}
                    <div className="space-y-5">
                        <div className="glass-card rounded-2xl p-6">
                            <h3 className="font-semibold text-white mb-4">Prévia</h3>
                            <div className="bg-[#0b141a] rounded-xl p-4 min-h-[200px] border border-white/5">
                                <div className="max-w-[80%] ml-auto">
                                    <div className="bg-[#005c4b] rounded-xl p-3 shadow-lg">
                                        <p
                                            className="text-white text-sm whitespace-pre-wrap"
                                            dangerouslySetInnerHTML={{ __html: formatWhatsAppText(content) || '<span class="text-gray-500">Digite uma mensagem...</span>' }}
                                        />
                                        <div className="text-right mt-1">
                                            <span className="text-[10px] text-gray-400">
                                                {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Scheduled and History Tabs */}
            {activeTab !== 'new' && activeTab !== 'manual' && (
                <>
                    {(activeTab === 'scheduled' ? scheduledMessages : historyMessages).length === 0 ? (
                        /* Premium Empty State */
                        <div className="glass-card rounded-2xl p-12 text-center animate-slide-up">
                            <div className="flex flex-col items-center gap-6">
                                <div className="relative">
                                    <div className="w-24 h-24 rounded-full bg-primary-600/10 flex items-center justify-center animate-float">
                                        <Rocket className="w-12 h-12 text-primary-400" />
                                    </div>
                                    <div className="absolute -right-1 -top-1 w-6 h-6 rounded-full bg-primary-600/20 flex items-center justify-center">
                                        <Zap className="w-3 h-3 text-primary-400" />
                                    </div>
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-white mb-2">
                                        {activeTab === 'scheduled' ? 'Nenhuma campanha agendada' : 'Nenhuma campanha no histórico'}
                                    </h3>
                                    <p className="text-gray-500 max-w-md mx-auto">
                                        Sua próxima campanha começa aqui. Crie uma nova campanha e alcance seus leads de forma inteligente.
                                    </p>
                                </div>
                                <button
                                    onClick={() => setActiveTab('new')}
                                    className="gradient-btn text-white font-semibold py-3 px-8 rounded-xl flex items-center gap-2"
                                >
                                    <Plus className="w-4 h-4" />
                                    Nova Campanha
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="glass-card rounded-2xl overflow-hidden border border-white/5 animate-slide-up">
                            <DataTable
                                data={activeTab === 'scheduled' ? scheduledMessages : historyMessages}
                                columns={messageColumns}
                                keyField="id"
                                emptyMessage={activeTab === 'scheduled' ? "Nenhuma mensagem agendada" : "Nenhuma mensagem no histórico"}
                                actions={(message) => (
                                    <div className="flex items-center gap-1">
                                        {message.status === 'draft' || message.status === 'scheduled' ? (
                                            <>
                                                <button
                                                    onClick={() => handleCancelMessage(message.id)}
                                                    className="p-2 hover:bg-red-500/10 text-red-400 rounded-lg transition-all"
                                                    title="Cancelar"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => setConfirmDelete({ isOpen: true, messageId: message.id })}
                                                    className="p-2 hover:bg-white/5 text-gray-500 hover:text-gray-300 rounded-lg transition-all"
                                                    title="Excluir"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </>
                                        ) : (
                                            <button
                                                onClick={() => setConfirmDelete({ isOpen: true, messageId: message.id })}
                                                className="p-2 hover:bg-white/5 text-gray-500 hover:text-gray-300 rounded-lg transition-all"
                                                title="Excluir do histórico"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                )}
                                pagination={{
                                    page: 1,
                                    pageSize: 10,
                                    total: (activeTab === 'scheduled' ? scheduledMessages : historyMessages).length,
                                    onPageChange: () => { }
                                }}
                            />
                        </div>
                    )}
                </>
            )}

            {/* Floating Action Button */}
            {activeTab !== 'new' && (
                <button
                    onClick={() => setActiveTab('new')}
                    className="fixed bottom-8 right-8 gradient-btn text-white w-14 h-14 rounded-2xl flex items-center justify-center shadow-2xl z-40 hover:scale-110 transition-transform"
                    title="Nova Campanha"
                >
                    <Plus className="w-6 h-6" />
                </button>
            )}

            {/* Preview Modal */}
            <Modal
                isOpen={showPreviewModal}
                onClose={() => setShowPreviewModal(false)}
                title="Visualizar Mensagem"
            >
                <div className="bg-[#0b141a] rounded-xl p-6 min-h-[300px] flex items-center justify-center border border-white/5">
                    <div className="w-full max-w-sm">
                        <div className="bg-[#005c4b] rounded-xl p-3 shadow-lg border border-white/5">
                            <p
                                className="text-white text-sm whitespace-pre-wrap leading-relaxed"
                                dangerouslySetInnerHTML={{ __html: formatWhatsAppText(previewMessage) }}
                            />
                            <div className="text-right mt-1 flex items-center justify-end gap-1">
                                <span className="text-[10px] text-gray-400">
                                    {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
