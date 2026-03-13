import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft, Phone, Mail, MapPin, DollarSign,
    ShoppingCart, MessageCircle, Plus, RefreshCw, Cake, Edit, Save, Calendar, Clock, AlertTriangle
} from 'lucide-react';
import { api } from '@/config/api';
import Button from '@/components/Button';
import TemperatureBadge from '@/components/TemperatureBadge';
import StageBadge from '@/components/StageBadge';
import Modal from '@/components/Modal';
import { Textarea, Select, Input } from '@/components/FormFields';
import { useToast } from '@/components/Toast';
import { useAuth } from '@/contexts/AuthContext';
import { Lead, TimelineEntry, Sale, TimelineType, Subscription } from '@/types';
import { formatDate, formatDateTime, formatCurrency, formatPhone, getTimelineTypeLabel, getTimelineTypeIcon, formatRelativeTime } from '@/utils/formatters';
import Loading from '@/components/Loading';

export default function LeadDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { success, error } = useToast();
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [lead, setLead] = useState<Lead | null>(null);
    const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
    const [sales, setSales] = useState<Sale[]>([]);
    const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
    const [showAddNoteModal, setShowAddNoteModal] = useState(false);
    const [newNote, setNewNote] = useState('');
    const [noteType, setNoteType] = useState<TimelineType>('note');
    const [filterType, setFilterType] = useState<string>('');

    // Edit State
    const [showEditModal, setShowEditModal] = useState(false);
    const [editForm, setEditForm] = useState({
        name: '',
        primaryEmail: '',
        whatsapp: '',
        city: '',
        state: '',
        birthDate: ''
    });

    useEffect(() => {
        if (lead) {
            setEditForm({
                name: lead.name,
                primaryEmail: lead.primaryEmail,
                whatsapp: lead.whatsapp,
                city: lead.city || '',
                state: lead.state || '',
                birthDate: lead.birthDate ? lead.birthDate.toISOString().split('T')[0] : ''
            });
        }
    }, [lead]);

    const fetchLeadData = async () => {
        if (!id) return;
        setLoading(true);

        try {
            // Fetch lead
            const leadData = await api.get(`/api/leads/${id}`);

            if (!leadData) {
                error('Erro', 'Lead não encontrado.');
                navigate('/leads');
                return;
            }

            const leadObj: Lead = {
                id: leadData.id,
                name: leadData.name || 'Sem nome',
                primaryEmail: leadData.primary_email || '',
                secondaryEmails: leadData.secondary_emails || [],
                whatsapp: leadData.whatsapp || '',
                cpf: leadData.cpf || '',
                city: leadData.city || '',
                state: leadData.state || '',
                address: leadData.address || '',
                birthDate: leadData.birth_date ? new Date(leadData.birth_date) : null,
                tags: leadData.tags || [],
                origin: leadData.origin || '',
                utmSource: leadData.utm_source || '',
                utmMedium: leadData.utm_medium || '',
                utmCampaign: leadData.utm_campaign || '',
                points: leadData.points || 0,
                temperature: leadData.temperature || 'inactive',
                stage: leadData.stage || 'lead',
                totalSpent: Number(leadData.total_spent) || 0,
                purchaseCount: leadData.purchase_count || 0,
                lastPurchaseAt: leadData.last_purchase_at ? new Date(leadData.last_purchase_at) : null,
                createdAt: leadData.created_at ? new Date(leadData.created_at) : new Date(),
                updatedAt: leadData.updated_at ? new Date(leadData.updated_at) : new Date(),
            };
            setLead(leadObj);

            // Fetch sales for this lead
            const salesData = await api.get(`/api/sales/by-lead/${id}`);

            const formattedSales: Sale[] = (salesData || []).map((doc: any) => ({
                id: doc.id,
                leadId: doc.lead_id || '',
                productId: doc.product_id || '',
                productName: doc.product_name || 'Produto',
                transactionId: doc.transaction_id || '',
                platform: doc.platform || '',
                amount: Number(doc.amount) || 0,
                status: doc.status || 'approved',
                paymentMethod: doc.payment_method || '',
                pointsAwarded: doc.points_awarded || 0,
                purchasedAt: doc.purchased_at ? new Date(doc.purchased_at) : new Date(),
                createdAt: doc.created_at ? new Date(doc.created_at) : new Date(),
            }));
            setSales(formattedSales);

            // Fetch timeline entries
            const timelineData = await api.get(`/api/timeline/${id}`);

            const formattedTimeline: TimelineEntry[] = (timelineData || []).map((doc: any) => ({
                id: doc.id,
                leadId: doc.lead_id || '',
                type: doc.type || 'note',
                content: doc.content || '',
                metadata: doc.metadata || {},
                createdBy: doc.created_by || 'system',
                createdByName: doc.created_by_name || 'Sistema',
                createdAt: doc.created_at ? new Date(doc.created_at) : new Date(),
            }));

            // Add sales as timeline entries if not already in timeline (client-side merge for display)
            const salesTimeline: TimelineEntry[] = formattedSales.map(sale => ({
                id: `sale-${sale.id}`,
                leadId: id as string,
                type: 'sale' as TimelineType,
                content: `Venda: ${sale.productName} - ${formatCurrency(sale.amount)}`,
                metadata: { productName: sale.productName, amount: sale.amount },
                createdBy: 'system',
                createdAt: sale.purchasedAt,
            }));

            // Merge and sort
            const allTimeline = [...formattedTimeline, ...salesTimeline].sort((a, b) => {
                const dateA = a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt);
                const dateB = b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt);
                return (dateB.getTime() || 0) - (dateA.getTime() || 0);
            });
            setTimeline(allTimeline);

            // Fetch Subscriptions (requires updating backend route first, assuming /api/subscriptions/by-lead/:id exists or we filter client-side)
            // For now, I'll filter client side as we don't have the specific by-lead route, or I can add it to backend.
            // Let's assume we'll just fetch all and filter for now OR add the endpoint. 
            // It's better to add the endpoint. I'll use a new route /api/subscriptions?leadId=id
            const subsData = await api.get('/api/subscriptions'); // We will filter this client-side for simplicity right now since the route returns all.
            const leadSubs = (subsData || []).filter((s: any) => s.lead_id === id);

            const formattedSubs: Subscription[] = leadSubs.map((doc: any) => ({
                id: doc.id,
                leadId: doc.lead_id,
                productId: doc.product_id,
                productName: doc.products?.name,
                renewalLink: doc.products?.renewal_link,
                status: doc.status,
                startDate: new Date(doc.start_date),
                endDate: new Date(doc.end_date),
                optedOut: doc.opted_out,
                createdAt: new Date(doc.created_at),
                updatedAt: new Date(doc.updated_at)
            }));
            setSubscriptions(formattedSubs);

        } catch (err) {
            console.error('Error fetching lead data:', err);
            error('Erro', 'Não foi possível carregar os dados do lead.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLeadData();
    }, [id]);

    const handleAddNote = async () => {
        if (!newNote.trim() || !id) return;

        try {
            await api.post('/api/timeline', {
                lead_id: id,
                type: noteType,
                content: newNote,
                metadata: {
                    createdBy: user?.id,
                    createdByName: user?.name || 'Admin'
                },
                created_by_name: user?.name || 'Admin'
            });

            setNewNote('');
            setShowAddNoteModal(false);
            success('Nota adicionada', 'A anotação foi registrada na timeline.');
            fetchLeadData();
        } catch (err) {
            console.error('Error adding note:', err);
            error('Erro', 'Não foi possível adicionar a nota.');
        }
    };

    const handleUpdateLead = async () => {
        if (!id) return;
        setLoading(true);
        try {
            await api.put(`/api/leads/${id}`, {
                name: editForm.name,
                primary_email: editForm.primaryEmail,
                whatsapp: editForm.whatsapp,
                city: editForm.city,
                state: editForm.state,
                birth_date: editForm.birthDate || null,
            });

            success('Sucesso', 'Lead atualizado com sucesso.');
            setShowEditModal(false);
            fetchLeadData();
        } catch (err) {
            console.error('Error updating lead:', err);
            error('Erro', 'Falha ao atualizar lead.');
        } finally {
            setLoading(false);
        }
    };

    const handleWhatsApp = () => {
        if (lead?.whatsapp) {
            const phone = lead.whatsapp.replace(/\D/g, '');
            window.open(`https://wa.me/${phone}`, '_blank');
        }
    };

    const filteredTimeline = filterType
        ? timeline.filter(entry => entry.type === filterType)
        : timeline;

    if (loading) return <Loading text="Carregando lead..." />;
    if (!lead) return <div className="text-center py-12 text-gray-500">Lead não encontrado</div>;

    return (
        <div className="space-y-8 animate-fade-in relative z-10 pb-8 min-h-screen">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/leads')}
                        className="p-2 rounded-xl bg-dark-800/50 hover:bg-white/10 text-gray-400 hover:text-white border border-white/5 transition-all"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-3xl font-extrabold text-white tracking-tight">{lead.name}</h1>
                        <p className="text-primary-400 font-medium">{lead.primaryEmail}</p>
                    </div>
                </div>
                <div className="flex gap-3 flex-wrap">
                    <Button variant="outline" onClick={fetchLeadData} icon={<RefreshCw className="w-4 h-4" />}>
                        Atualizar
                    </Button>
                    <Button variant="outline" onClick={() => setShowEditModal(true)} icon={<Edit className="w-4 h-4" />}>
                        Editar
                    </Button>
                    {lead.whatsapp && (
                        <Button onClick={handleWhatsApp} icon={<MessageCircle className="w-4 h-4" />} className="shadow-[0_0_15px_rgba(124,58,237,0.3)]">
                            WhatsApp
                        </Button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column - Info */}
                <div className="space-y-6">
                    {/* Status Cards */}
                    <div className="glass-card rounded-2xl p-6 shadow-lg border border-white/5 space-y-5 relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none opacity-50 group-hover:opacity-100 transition-opacity"></div>
                        <div className="flex items-center justify-between relative z-10">
                            <span className="text-sm font-bold text-gray-400 uppercase tracking-wide">Temperatura</span>
                            <TemperatureBadge temperature={lead.temperature} />
                        </div>
                        <div className="flex items-center justify-between relative z-10">
                            <span className="text-sm font-bold text-gray-400 uppercase tracking-wide">Estágio</span>
                            <StageBadge stage={lead.stage} />
                        </div>
                        <div className="flex items-center justify-between relative z-10 pt-2 border-t border-white/10">
                            <span className="text-sm font-bold text-gray-400 uppercase tracking-wide">Pontos</span>
                            <span className="text-3xl font-extrabold text-primary-400 drop-shadow-[0_0_10px_rgba(167,139,250,0.3)]">{lead.points}</span>
                        </div>
                    </div>

                    {/* Contact Info */}
                    <div className="glass-card rounded-2xl p-6 shadow-lg border border-white/5 space-y-5 relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none opacity-50 group-hover:opacity-100 transition-opacity"></div>
                        <h3 className="font-bold text-white uppercase tracking-wide relative z-10 border-b border-white/10 pb-3">Contato</h3>
                        <div className="space-y-4 relative z-10">
                            {lead.whatsapp && (
                                <a href={`https://wa.me/${lead.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer"
                                    className="flex items-center gap-3 text-gray-300 hover:text-green-400 transition-colors group/item">
                                    <div className="w-8 h-8 rounded-full bg-dark-800/80 border border-white/5 flex items-center justify-center group-hover/item:border-green-500/30 group-hover/item:shadow-[0_0_10px_rgba(34,197,94,0.2)] transition-all">
                                        <Phone className="w-4 h-4" />
                                    </div>
                                    <span className="font-medium tracking-wide">{formatPhone(lead.whatsapp)}</span>
                                </a>
                            )}
                            <a href={`mailto:${lead.primaryEmail}`}
                                className="flex items-center gap-3 text-gray-300 hover:text-primary-400 transition-colors group/item">
                                <div className="w-8 h-8 rounded-full bg-dark-800/80 border border-white/5 flex items-center justify-center group-hover/item:border-primary-500/30 group-hover/item:shadow-[0_0_10px_rgba(167,139,250,0.2)] transition-all">
                                    <Mail className="w-4 h-4" />
                                </div>
                                <span className="font-medium">{lead.primaryEmail}</span>
                            </a>
                            {lead.city && (
                                <div className="flex items-center gap-3 text-gray-300">
                                    <div className="w-8 h-8 rounded-full bg-dark-800/80 border border-white/5 flex items-center justify-center text-blue-400">
                                        <MapPin className="w-4 h-4" />
                                    </div>
                                    <span className="font-medium">{lead.city}{lead.state ? `, ${lead.state}` : ''}</span>
                                </div>
                            )}
                            {lead.birthDate ? (
                                <div className="flex items-center gap-3 text-gray-300">
                                    <div className="w-8 h-8 rounded-full bg-dark-800/80 border border-white/5 flex items-center justify-center text-pink-400">
                                        <Cake className="w-4 h-4" />
                                    </div>
                                    <span className="font-medium">{formatDate(lead.birthDate)}</span>
                                </div>
                            ) : (
                                <div className="flex items-center gap-3 text-gray-500">
                                    <div className="w-8 h-8 rounded-full bg-dark-800/50 border border-white/5 flex items-center justify-center">
                                        <Cake className="w-4 h-4" />
                                    </div>
                                    <span className="italic text-sm">Aniversário não informado</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Subscriptions Section */}
                    {subscriptions.length > 0 && (
                        <div className="glass-card rounded-2xl p-6 shadow-lg border border-white/5 space-y-5 relative overflow-hidden group">
                            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none opacity-50 group-hover:opacity-100 transition-opacity"></div>
                            <h3 className="font-bold text-white uppercase tracking-wide relative z-10 flex items-center gap-2 border-b border-white/10 pb-3">
                                <Calendar className="w-5 h-5 text-purple-400" /> Assinaturas Ativas
                            </h3>
                            <div className="space-y-3 relative z-10">
                                {subscriptions.map(sub => {
                                    const daysRemaining = Math.ceil((sub.endDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                                    const isExpired = daysRemaining < 0;
                                    const isUrgent = daysRemaining <= 7 && !isExpired;

                                    return (
                                        <div key={sub.id} className="p-4 bg-dark-800/50 rounded-xl border border-white/5 hover:border-white/10 transition-colors">
                                            <div className="flex justify-between items-start mb-3">
                                                <p className="font-bold text-gray-200">{sub.productName}</p>
                                                <span className={`px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wide border shadow-sm ${sub.status === 'active' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                                                    sub.status === 'expiring_soon' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' :
                                                        'bg-red-500/10 text-red-400 border-red-500/20'
                                                    }`}>
                                                    {sub.status === 'active' ? 'Ativo' : sub.status === 'expiring_soon' ? 'Vencendo' : 'Expirado'}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2 text-sm text-gray-400 mb-2 font-medium">
                                                <div className={`p-1 rounded-full ${isExpired ? 'bg-red-500/20 text-red-500' : isUrgent ? 'bg-orange-500/20 text-orange-500' : 'bg-white/5'}`}>
                                                    <Clock className="w-3.5 h-3.5" />
                                                </div>
                                                <span className={isExpired ? 'text-red-400 font-bold' : isUrgent ? 'text-orange-400 font-bold' : ''}>
                                                    {isExpired ? `Expirou em ${formatDate(sub.endDate)}` : `Vence em ${daysRemaining} dias (${formatDate(sub.endDate)})`}
                                                </span>
                                            </div>
                                            {sub.optedOut && (
                                                <div className="flex items-center gap-1.5 text-xs font-medium text-orange-400/80 bg-orange-500/10 p-2 rounded-lg mt-2 border border-orange-500/20">
                                                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                                                    <span>Optou por não receber lembretes automáticos</span>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Stats */}
                    <div className="glass-card rounded-2xl p-6 shadow-lg border border-white/5 space-y-5 relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none opacity-50 group-hover:opacity-100 transition-opacity"></div>
                        <h3 className="font-bold text-white uppercase tracking-wide relative z-10 border-b border-white/10 pb-3">Estatísticas</h3>
                        <div className="grid grid-cols-2 gap-4 relative z-10">
                            <div className="p-4 rounded-xl border border-white/5 bg-gradient-to-b from-dark-800/80 to-dark-900/50 flex flex-col items-center justify-center">
                                <div className="w-10 h-10 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center mb-2 shadow-[0_0_15px_rgba(34,197,94,0.15)]">
                                    <DollarSign className="w-5 h-5 text-green-400" />
                                </div>
                                <p className="text-xl font-extrabold text-white tracking-wide">{formatCurrency(lead.totalSpent)}</p>
                                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mt-1">Total Gasto</p>
                            </div>
                            <div className="p-4 rounded-xl border border-white/5 bg-gradient-to-b from-dark-800/80 to-dark-900/50 flex flex-col items-center justify-center">
                                <div className="w-10 h-10 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-2 shadow-[0_0_15px_rgba(59,130,246,0.15)]">
                                    <ShoppingCart className="w-5 h-5 text-blue-400" />
                                </div>
                                <p className="text-xl font-extrabold text-white tracking-wide">{lead.purchaseCount}</p>
                                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mt-1">Compras</p>
                            </div>
                        </div>
                        <div className="pt-4 border-t border-white/10 relative z-10 space-y-3">
                            <div className="flex items-center justify-between text-sm">
                                <span className="font-medium text-gray-500 uppercase tracking-wide text-xs">Última compra</span>
                                <span className="font-semibold text-gray-300 bg-dark-800/50 px-2.5 py-1 rounded border border-white/5">{formatDate(lead.lastPurchaseAt)}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="font-medium text-gray-500 uppercase tracking-wide text-xs">Cadastro</span>
                                <span className="font-semibold text-gray-300 bg-dark-800/50 px-2.5 py-1 rounded border border-white/5">{formatDate(lead.createdAt)}</span>
                            </div>
                            {lead.origin && (
                                <div className="flex items-center justify-between text-sm">
                                    <span className="font-medium text-gray-500 uppercase tracking-wide text-xs">Origem</span>
                                    <span className="font-semibold text-gray-300 bg-dark-800/50 px-2.5 py-1 rounded border border-white/5">{lead.origin}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Tags */}
                    {lead.tags && lead.tags.length > 0 && (
                        <div className="glass-card rounded-2xl p-6 shadow-lg border border-white/5 space-y-4">
                            <h3 className="font-bold text-white uppercase tracking-wide border-b border-white/10 pb-3">Tags</h3>
                            <div className="flex flex-wrap gap-2">
                                {lead.tags.map(tag => (
                                    <span key={tag} className="px-3 py-1.5 rounded-lg bg-primary-500/10 text-primary-400 font-bold tracking-wide text-xs border border-primary-500/20 shadow-[0_0_10px_rgba(124,58,237,0.1)]">
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Column - Timeline */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Timeline Header */}
                    <div className="glass-card rounded-2xl p-8 shadow-lg border border-white/5 relative z-10 overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary-600 to-purple-400"></div>
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                            <h3 className="text-xl font-extrabold text-white tracking-tight">Timeline do Cliente</h3>
                            <div className="flex items-center gap-3 flex-wrap">
                                <div className="w-48">
                                    <Select
                                        value={filterType}
                                        onChange={(e) => setFilterType(e.target.value)}
                                        options={[
                                            { value: '', label: 'Filtro: Todos' },
                                            { value: 'note', label: '📝 Anotações' },
                                            { value: 'contact', label: '📞 Contatos' },
                                            { value: 'sale', label: '💰 Vendas' },
                                            { value: 'system', label: '⚙️ Sistema' },
                                        ]}
                                    />
                                </div>
                                <Button icon={<Plus className="w-5 h-5" />} onClick={() => setShowAddNoteModal(true)} className="shadow-[0_0_15px_rgba(124,58,237,0.3)] min-w-[140px]">
                                    Nova Nota
                                </Button>
                            </div>
                        </div>

                        {/* Timeline List */}
                        {filteredTimeline.length === 0 ? (
                            <div className="text-center py-16 text-gray-500 bg-dark-800/30 rounded-2xl border border-white/5 border-dashed">
                                <p className="font-medium text-lg">Nenhum registro encontrado.</p>
                            </div>
                        ) : (
                            <div className="space-y-6 relative before:absolute before:inset-0 before:ml-[23px] before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-white/10 before:to-transparent">
                                {filteredTimeline.map((entry) => (
                                    <div key={entry.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                                        {/* Icon */}
                                        <div className={`flex items-center justify-center w-12 h-12 rounded-full border-4 border-dark-900 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-sm ${entry.type === 'sale' ? 'bg-green-500/20 text-green-400 border-green-500/30' : entry.type === 'contact' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' : 'bg-dark-800 text-gray-300 border-white/10 group-hover:bg-primary-500/20 group-hover:text-primary-400 group-hover:border-primary-500/30'} transition-colors relative z-10`}>
                                            {getTimelineTypeIcon(entry.type)}
                                        </div>
                                        {/* Content */}
                                        <div className="w-[calc(100%-4rem)] md:w-[calc(50%-3rem)] glass-card p-5 rounded-2xl border border-white/5 shadow-md group-hover:border-white/10 transition-colors">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className={`text-xs font-bold uppercase tracking-widest ${entry.type === 'sale' ? 'text-green-400' : 'text-primary-400'}`}>
                                                    {getTimelineTypeLabel(entry.type)}
                                                </span>
                                                <div className="text-xs font-medium text-gray-500 bg-dark-800/50 px-2 py-1 rounded border border-white/5" title={formatDateTime(entry.createdAt)}>
                                                    {formatRelativeTime(entry.createdAt)}
                                                </div>
                                            </div>
                                            <p className="text-gray-200 font-medium leading-relaxed">{entry.content}</p>
                                            {entry.createdByName && (
                                                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mt-3 pt-3 border-t border-white/5"><span className="text-gray-600">Por:</span> {entry.createdByName}</p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Purchases */}
                    <div className="glass-card rounded-2xl p-8 shadow-lg border border-white/5 relative z-10 overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-primary-500/10 rounded-full blur-3xl pointer-events-none -mt-10 -mr-10"></div>
                        <h3 className="text-xl font-extrabold text-white tracking-tight mb-6">
                            Histórico de Compras <span className="text-sm rounded-full bg-primary-500/20 text-primary-400 px-3 py-1 font-bold ml-2 border border-primary-500/20">{sales.length}</span>
                        </h3>
                        {sales.length === 0 ? (
                            <div className="text-center py-12 text-gray-500 bg-dark-800/30 rounded-2xl border border-white/5 border-dashed">
                                <span className="font-medium text-lg">Nenhuma compra registrada.</span>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {sales.map(sale => (
                                    <div key={sale.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-5 rounded-2xl bg-dark-800/50 border border-white/5 hover:border-white/10 transition-colors group">
                                        <div className="mb-3 sm:mb-0">
                                            <p className="font-bold text-lg text-white group-hover:text-primary-300 transition-colors">{sale.productName}</p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest bg-dark-900/50 px-2 py-1 rounded border border-white/5">{formatDate(sale.purchasedAt)}</span>
                                                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest bg-dark-900/50 px-2 py-1 rounded border border-white/5">{sale.platform}</span>
                                            </div>
                                        </div>
                                        <div className="text-left sm:text-right flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-center">
                                            <p className="text-xl font-extrabold text-green-400 drop-shadow-[0_0_8px_rgba(74,222,128,0.2)]">{formatCurrency(sale.amount)}</p>
                                            {sale.pointsAwarded > 0 && (
                                                <p className="text-xs font-bold text-primary-400 uppercase tracking-widest mt-1 bg-primary-500/10 px-2 py-0.5 rounded border border-primary-500/20 shadow-sm">+{sale.pointsAwarded} pts</p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Add Note Modal */}
            <Modal
                isOpen={showAddNoteModal}
                onClose={() => setShowAddNoteModal(false)}
                title="Adicionar Anotação"
                footer={
                    <>
                        <Button variant="outline" onClick={() => setShowAddNoteModal(false)}>Cancelar</Button>
                        <Button onClick={handleAddNote}>Adicionar</Button>
                    </>
                }
            >
                <div className="space-y-4">
                    <Select
                        label="Tipo"
                        value={noteType}
                        onChange={(e) => setNoteType(e.target.value as TimelineType)}
                        options={[
                            { value: 'note', label: 'Anotação Manual' },
                            { value: 'contact', label: 'Contato Realizado' },
                            { value: 'followup', label: 'Follow-up' },
                            { value: 'observation', label: 'Observação' },
                        ]}
                    />
                    <Textarea
                        label="Conteúdo"
                        value={newNote}
                        onChange={(e) => setNewNote(e.target.value)}
                        rows={4}
                        placeholder="Digite sua anotação..."
                    />
                </div>
            </Modal>

            {/* Edit Lead Modal */}
            <Modal
                isOpen={showEditModal}
                onClose={() => setShowEditModal(false)}
                title="Editar Lead"
                footer={
                    <>
                        <Button variant="outline" onClick={() => setShowEditModal(false)}>Cancelar</Button>
                        <Button onClick={handleUpdateLead} icon={<Save className="w-4 h-4" />}>Salvar Alterações</Button>
                    </>
                }
            >
                <div className="space-y-4">
                    <Input
                        label="Nome Completo"
                        value={editForm.name}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    />
                    <Input
                        label="Email Principal"
                        type="email"
                        value={editForm.primaryEmail}
                        onChange={(e) => setEditForm({ ...editForm, primaryEmail: e.target.value })}
                    />
                    <div className="grid grid-cols-2 gap-4">
                        <Input
                            label="WhatsApp"
                            value={editForm.whatsapp}
                            onChange={(e) => setEditForm({ ...editForm, whatsapp: e.target.value })}
                        />
                        <Input
                            label="Data de Nascimento"
                            type="date"
                            value={editForm.birthDate}
                            onChange={(e) => setEditForm({ ...editForm, birthDate: e.target.value })}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <Input
                            label="Cidade"
                            value={editForm.city}
                            onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                        />
                        <Input
                            label="Estado"
                            value={editForm.state}
                            onChange={(e) => setEditForm({ ...editForm, state: e.target.value })}
                            maxLength={2}
                            placeholder="UF"
                        />
                    </div>
                </div>
            </Modal>
        </div >
    );
}
