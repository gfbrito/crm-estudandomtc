import { useState, useEffect } from 'react';
import { Eye, X, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/config/api';
import DataTable from '@/components/DataTable';
import Button from '@/components/Button';
import { Select } from '@/components/FormFields';
import { useToast } from '@/components/Toast';
import { Sale } from '@/types';
import { formatCurrency, formatDate, getSaleStatusLabel, getSaleStatusColor } from '@/utils/formatters';
import DateRangeFilter, { DateRange } from '@/components/DateRangeFilter';

export default function SalesPage() {
    const [sales, setSales] = useState<Sale[]>([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({ status: '', platform: '' });
    const [dateRange, setDateRange] = useState<DateRange>({ start: null, end: null });
    const navigate = useNavigate();
    const { success, error } = useToast();

    const fetchSales = async (currentRange = dateRange) => {
        setLoading(true);
        try {
            const queryParams = new URLSearchParams();
            if (currentRange.start) queryParams.append('startDate', currentRange.start.toISOString());
            if (currentRange.end) queryParams.append('endDate', currentRange.end.toISOString());

            const url = queryParams.toString() ? `/api/sales?${queryParams.toString()}` : '/api/sales';
            const data = await api.get(url);

            const salesData: Sale[] = (data || []).map((doc: any) => ({
                id: doc.id,
                leadId: doc.lead_id || '',
                leadName: doc.leads?.name || 'Cliente',
                leadEmail: doc.leads?.primary_email || '',
                productId: doc.product_id || '',
                productName: doc.product_name || 'Produto',
                transactionId: doc.transaction_id || doc.id.substring(0, 8),
                platform: doc.platform || 'Importado',
                amount: Number(doc.amount) || 0,
                status: doc.status || 'approved',
                paymentMethod: doc.payment_method || 'pix',
                pointsAwarded: doc.points_awarded || 0,
                purchasedAt: doc.purchased_at ? new Date(doc.purchased_at) : new Date(),
                createdAt: doc.created_at ? new Date(doc.created_at) : new Date(),
            }));

            setSales(salesData);
            console.log(`✅ Loaded ${salesData.length} sales from API`);
        } catch (err) {
            console.error('Error fetching sales:', err);
            error('Erro ao carregar vendas', 'Não foi possível buscar os dados.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSales();
    }, []);

    const columns = [
        { key: 'transactionId', header: 'ID', render: (s: Sale) => <span className="font-mono text-xs text-gray-400 bg-dark-800/50 px-2 py-1 rounded border border-white/5">{s.transactionId?.substring(0, 10)}</span> },
        { key: 'leadName', header: 'Cliente', sortable: true, render: (s: Sale) => <span className="font-medium text-gray-200">{s.leadName}</span> },
        { key: 'productName', header: 'Produto', sortable: true, render: (s: Sale) => <span className="max-w-48 truncate block text-gray-300 font-medium">{s.productName}</span> },
        { key: 'amount', header: 'Valor', sortable: true, render: (s: Sale) => <span className="font-bold text-white tracking-wide">{formatCurrency(s.amount)}</span> },
        { key: 'status', header: 'Status', render: (s: Sale) => <span className={`px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wide border ${getSaleStatusColor(s.status).replace('text-', 'border-').replace('bg-', 'bg-').replace('100', '500/10').replace('800', '400')} shadow-sm`}>{getSaleStatusLabel(s.status)}</span> },
        { key: 'platform', header: 'Plataforma', render: (s: Sale) => <span className="text-xs font-semibold px-2 py-1 rounded bg-white/5 border border-white/10 text-gray-300">{s.platform}</span> },
        { key: 'purchasedAt', header: 'Data', sortable: true, render: (s: Sale) => <span className="text-gray-400 font-medium text-sm">{formatDate(s.purchasedAt)}</span> },
    ];

    const filteredSales = sales.filter(s => (!filters.status || s.status === filters.status) && (!filters.platform || s.platform === filters.platform));

    // Calculate totals
    const totalAmount = filteredSales.reduce((sum, s) => sum + (s.amount || 0), 0);
    const approvedSales = filteredSales.filter(s => s.status === 'approved');

    return (
        <div className="space-y-8 animate-fade-in relative z-10 pb-8 min-h-screen">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
                        Vendas
                        <span className="text-sm font-medium text-primary-300 bg-primary-500/10 border border-primary-500/20 px-3 py-1 rounded-full shadow-[0_0_15px_rgba(124,58,237,0.1)]">
                            {loading ? 'Carregando...' : `${sales.length.toLocaleString()} vendas • Total: ${formatCurrency(totalAmount)}`}
                        </span>
                    </h1>
                    <p className="text-gray-400 mt-1 font-medium">
                        Acompanhe o faturamento, status de transações e métricas.
                    </p>
                </div>
                <div className="flex gap-3 items-center">
                    <DateRangeFilter
                        onChange={(range) => {
                            setDateRange(range);
                            fetchSales(range);
                        }}
                    />
                    <Button
                        variant="outline"
                        onClick={() => fetchSales(dateRange)}
                        icon={<RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />}
                    >
                        Atualizar
                    </Button>
                </div>
            </div>

            {/* Summary Cards */}
            {!loading && sales.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="glass-card p-5 rounded-2xl border border-white/5 relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none transition-opacity group-hover:opacity-100 opacity-50"></div>
                        <p className="text-sm font-semibold text-gray-400 tracking-wide uppercase mb-1">Total de Vendas</p>
                        <p className="text-3xl font-extrabold text-white drop-shadow-md">{sales.length.toLocaleString()}</p>
                    </div>
                    <div className="glass-card p-5 rounded-2xl border border-green-500/20 bg-green-500/5 relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-transparent pointer-events-none transition-opacity group-hover:opacity-100 opacity-50"></div>
                        <p className="text-sm font-semibold text-green-400 tracking-wide uppercase mb-1">Valor Total</p>
                        <p className="text-3xl font-extrabold text-green-400 drop-shadow-[0_0_10px_rgba(74,222,128,0.3)]">{formatCurrency(totalAmount)}</p>
                    </div>
                    <div className="glass-card p-5 rounded-2xl border border-blue-500/20 bg-blue-500/5 relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent pointer-events-none transition-opacity group-hover:opacity-100 opacity-50"></div>
                        <p className="text-sm font-semibold text-blue-400 tracking-wide uppercase mb-1">Aprovadas</p>
                        <p className="text-3xl font-extrabold text-blue-400 drop-shadow-[0_0_10px_rgba(96,165,250,0.3)]">{approvedSales.length.toLocaleString()}</p>
                    </div>
                    <div className="glass-card p-5 rounded-2xl border border-primary-500/20 bg-primary-500/5 relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-br from-primary-500/10 to-transparent pointer-events-none transition-opacity group-hover:opacity-100 opacity-50"></div>
                        <p className="text-sm font-semibold text-primary-400 tracking-wide uppercase mb-1">Ticket Médio</p>
                        <p className="text-3xl font-extrabold text-primary-400 drop-shadow-[0_0_10px_rgba(167,139,250,0.3)]">
                            {formatCurrency(sales.length ? totalAmount / sales.length : 0)}
                        </p>
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="glass-card rounded-2xl p-4 shadow-lg border border-white/5 relative z-50">
                <div className="flex flex-wrap gap-4 items-end">
                    <div className="w-full sm:w-auto">
                        <Select
                            label="Status"
                            value={filters.status}
                            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                            options={[
                                { value: 'approved', label: 'Aprovada' },
                                { value: 'pending', label: 'Pendente' },
                                { value: 'refunded', label: 'Reembolsada' },
                                { value: 'cancelled', label: 'Cancelada' },
                            ]}
                        />
                    </div>
                    <div className="w-full sm:w-auto">
                        <Select
                            label="Plataforma"
                            value={filters.platform}
                            onChange={(e) => setFilters({ ...filters, platform: e.target.value })}
                            options={[
                                { value: 'Kiwify', label: 'Kiwify' },
                                { value: 'Hotmart', label: 'Hotmart' },
                                { value: 'Eduzz', label: 'Eduzz' },
                                { value: 'Personalizado', label: 'Personalizado' },
                            ]}
                        />
                    </div>
                    {Object.values(filters).some(Boolean) && (
                        <button
                            onClick={() => setFilters({ status: '', platform: '' })}
                            className="h-[42px] px-4 flex items-center justify-center gap-1.5 text-sm font-semibold text-red-400 bg-red-500/10 hover:bg-red-500/20 rounded-xl border border-red-500/20 transition-colors"
                        >
                            <X className="w-4 h-4" />
                            Limpar
                        </button>
                    )}
                </div>
            </div>

            <div className="relative z-10">
                <DataTable
                    data={filteredSales}
                    columns={columns}
                    keyField="id"
                    loading={loading}
                    searchable
                    searchPlaceholder="Buscar por cliente, produto ou ID..."
                    exportable
                    onExport={() => success('Exportação', 'Vendas exportadas.')}
                    emptyMessage="Nenhuma venda encontrada"
                    actions={(sale) => (
                        <button
                            onClick={() => navigate(`/leads/${sale.leadId}`)}
                            className="p-2 rounded-xl bg-dark-800/50 hover:bg-white/10 text-gray-400 hover:text-white border border-white/5 transition-all group relative overflow-hidden"
                            title="Ver lead"
                        >
                            <Eye className="w-4 h-4 relative z-10" />
                            <div className="absolute inset-0 bg-white/20 blur-md rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        </button>
                    )}
                    pagination={{
                        page: 1,
                        pageSize: 25,
                        total: filteredSales.length,
                        onPageChange: () => { },
                    }}
                />
            </div>
        </div>
    );
}
