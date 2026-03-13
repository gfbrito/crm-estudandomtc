import { useState, useEffect } from 'react';
import { RefreshCw, Mail, MessageCircle, Check } from 'lucide-react';
import { api } from '@/config/api';
import DataTable from '@/components/DataTable';
import Button from '@/components/Button';
import { useToast } from '@/components/Toast';
import { formatCurrency, formatDate } from '@/utils/formatters';

interface Recovery {
    id: string;
    leadId: string;
    leadName: string;
    leadEmail: string;
    leadPhone: string;
    productName: string;
    transactionId: string;
    amount: number;
    status: 'pending' | 'refunded' | 'cancelled' | 'chargedback';
    reason: string;
    createdAt: Date;
}

export default function RecoveryPage() {
    const [recoveries, setRecoveries] = useState<Recovery[]>([]);
    const [loading, setLoading] = useState(true);
    const { error } = useToast();

    const fetchRecoveries = async () => {
        setLoading(true);
        try {
            const allSales = await api.get('/api/sales');
            const targetStatuses = ['pending', 'refunded', 'cancelled', 'chargedback'];
            const filteredSales = (allSales || []).filter((s: any) => targetStatuses.includes(s.status));

            const finalRecoveriesData: Recovery[] = filteredSales.map((sale: any) => ({
                id: sale.id,
                leadId: sale.lead_id || '',
                leadName: sale.leads?.name || 'Cliente',
                leadEmail: sale.leads?.primary_email || '',
                leadPhone: sale.leads?.whatsapp || '',
                productName: sale.products?.name || sale.product_name || 'Produto',
                transactionId: sale.transaction_id || sale.id.substring(0, 8),
                amount: Number(sale.amount) || 0,
                status: sale.status || 'pending',
                reason: sale.metadata?.reason || 'Não especificado',
                createdAt: sale.created_at ? new Date(sale.created_at) : new Date(),
            }));

            setRecoveries(finalRecoveriesData);
            console.log(`✅ Found ${finalRecoveriesData.length} recovery opportunities`);
        } catch (err) {
            console.error('Error fetching recoveries:', err);
            error('Erro ao carregar', 'Não foi possível buscar os dados.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRecoveries();
    }, []);

    const getStatusBadge = (status: string) => {
        const styles = {
            pending: 'bg-yellow-900/30 text-yellow-400',
            refunded: 'bg-red-900/30 text-red-400',
            cancelled: 'bg-gray-700 text-gray-300',
            chargedback: 'bg-purple-900/30 text-purple-400',
        };
        const labels = {
            pending: 'Pendente',
            refunded: 'Reembolsado',
            cancelled: 'Cancelado',
            chargedback: 'Chargeback',
        };
        return (
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status as keyof typeof styles] || styles.pending}`}>
                {labels[status as keyof typeof labels] || status}
            </span>
        );
    };

    const columns = [
        { key: 'leadName', header: 'Cliente', sortable: true },
        { key: 'productName', header: 'Produto', render: (r: Recovery) => <span className="max-w-48 truncate block">{r.productName}</span> },
        { key: 'amount', header: 'Valor', sortable: true, render: (r: Recovery) => <span className="font-semibold">{formatCurrency(r.amount)}</span> },
        { key: 'status', header: 'Status', render: (r: Recovery) => getStatusBadge(r.status) },
        { key: 'createdAt', header: 'Data', sortable: true, render: (r: Recovery) => formatDate(r.createdAt) },
    ];

    const totalAmount = recoveries.reduce((sum, r) => sum + r.amount, 0);

    const handleContactWhatsApp = (recovery: Recovery) => {
        if (recovery.leadPhone) {
            const phone = recovery.leadPhone.replace(/\D/g, '');
            const message = encodeURIComponent(`Olá ${recovery.leadName}! Vi que houve um problema com sua compra "${recovery.productName}". Como posso ajudar?`);
            window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
        } else {
            error('Sem WhatsApp', 'Este cliente não tem WhatsApp cadastrado.');
        }
    };

    return (
        <div className="space-y-6 animate-fade-in relative z-10 min-h-screen pb-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-extrabold text-white tracking-tight">Recuperação de Vendas</h1>
                    <p className="text-gray-400 mt-1 font-medium">
                        {loading ? 'Carregando...' : `${recoveries.length} oportunidades • ${formatCurrency(totalAmount)} potencial`}
                    </p>
                </div>
                <Button onClick={fetchRecoveries} variant="outline" icon={<RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />}>
                    Atualizar
                </Button>
            </div>

            {!loading && recoveries.length === 0 ? (
                <div className="bg-dark-800/50 backdrop-blur-md rounded-2xl p-12 text-center border border-white/5 shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-green-500/20 to-transparent"></div>
                    <div className="w-20 h-20 rounded-full bg-dark-900/80 flex items-center justify-center mx-auto mb-6 border border-white/5 shadow-lg">
                        <Check className="w-10 h-10 text-green-500" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">Nenhuma recuperação pendente!</h3>
                    <p className="text-gray-400">Todas as vendas estão aprovadas. Continue assim! 🎉</p>
                </div>
            ) : (
                <>
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="bg-dark-900/50 rounded-2xl p-6 border border-white/5 hover:border-white/10 transition-colors shadow-lg relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-br from-yellow-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            <p className="text-sm font-medium text-gray-400">Pendentes</p>
                            <p className="text-3xl font-bold text-yellow-500 mt-2">{recoveries.filter(r => r.status === 'pending').length}</p>
                        </div>
                        <div className="bg-dark-900/50 rounded-2xl p-6 border border-white/5 hover:border-white/10 transition-colors shadow-lg relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-br from-red-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            <p className="text-sm font-medium text-gray-400">Reembolsos</p>
                            <p className="text-3xl font-bold text-red-500 mt-2">{recoveries.filter(r => r.status === 'refunded').length}</p>
                        </div>
                        <div className="bg-dark-900/50 rounded-2xl p-6 border border-white/5 hover:border-white/10 transition-colors shadow-lg relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-br from-gray-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            <p className="text-sm font-medium text-gray-400">Cancelados</p>
                            <p className="text-3xl font-bold text-gray-300 mt-2">{recoveries.filter(r => r.status === 'cancelled').length}</p>
                        </div>
                        <div className="bg-dark-900/50 rounded-2xl p-6 border border-white/5 hover:border-white/10 transition-colors shadow-lg relative overflow-hidden group border-b-2 border-b-green-500/30">
                            <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-br from-green-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            <p className="text-sm font-medium text-gray-400">Valor Total</p>
                            <p className="text-3xl font-bold text-green-400 mt-2">{formatCurrency(totalAmount)}</p>
                        </div>
                    </div>

                    <DataTable
                        data={recoveries}
                        columns={columns}
                        keyField="id"
                        loading={loading}
                        searchable
                        searchPlaceholder="Buscar por cliente ou produto..."
                        emptyMessage="Nenhuma recuperação encontrada"
                        actions={(recovery) => (
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => handleContactWhatsApp(recovery)}
                                    className="p-2 rounded-lg hover:bg-green-900/30 text-green-400"
                                    title="Contato WhatsApp"
                                >
                                    <MessageCircle className="w-4 h-4" />
                                </button>
                                {recovery.leadEmail && (
                                    <a
                                        href={`mailto:${recovery.leadEmail}`}
                                        className="p-2 rounded-lg hover:bg-blue-900/30 text-blue-400"
                                        title="Enviar email"
                                    >
                                        <Mail className="w-4 h-4" />
                                    </a>
                                )}
                            </div>
                        )}
                    />
                </>
            )}
        </div>
    );
}
