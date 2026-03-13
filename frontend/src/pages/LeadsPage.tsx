import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Eye, Edit, Trash2, Filter, X, RefreshCw, Download } from 'lucide-react';
import { api } from '@/config/api';

import DataTable from '@/components/DataTable';
import TemperatureBadge from '@/components/TemperatureBadge';
import StageBadge from '@/components/StageBadge';
import Button from '@/components/Button';
import Modal from '@/components/Modal';
import { Input, Select } from '@/components/FormFields';
import { useToast } from '@/components/Toast';
import { Lead } from '@/types';
import { formatPhone, formatCurrency } from '@/utils/formatters';

export default function LeadsPage() {
    const [leads, setLeads] = useState<Lead[]>([]);
    const [loading, setLoading] = useState(true);
    const [showFilters, setShowFilters] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
    const [filters, setFilters] = useState({
        temperature: '',
        stage: '',
        minPoints: '',
        maxPoints: '',
    });

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [totalCount, setTotalCount] = useState(0);

    // Sort State (server-side)
    const [sortColumn, setSortColumn] = useState('created_at');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

    // Map frontend keys to DB column names
    const sortKeyMap: Record<string, string> = {
        name: 'name',
        temperature: 'temperature',
        stage: 'stage',
        points: 'points',
        totalSpent: 'total_spent',
        purchaseCount: 'purchase_count',
    };

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        primaryEmail: '',
        whatsapp: '',
        cpf: '',
        city: '',
        state: '',
        tags: '',
        origin: '',
    });

    const navigate = useNavigate();
    const { success, error } = useToast();

    const fetchLeads = async () => {
        setLoading(true);
        try {
            const queryParams = new URLSearchParams();
            if (filters.temperature) queryParams.append('temperature', filters.temperature);
            if (filters.stage) queryParams.append('stage', filters.stage);
            if (filters.minPoints) queryParams.append('minPoints', filters.minPoints);
            if (filters.maxPoints) queryParams.append('maxPoints', filters.maxPoints);
            queryParams.append('page', currentPage.toString());
            queryParams.append('pageSize', pageSize.toString());
            // Sort not fully implemented in new backend yet, skipping sort params for now
            // queryParams.append('sort', sortColumn);
            // queryParams.append('dir', sortDirection);

            const response = await api.get(`/api/leads?${queryParams.toString()}`);
            
            // Update Total Count
            if (response.total !== undefined) setTotalCount(response.total);

            const leadsData: Lead[] = (response.data || []).map((doc: any) => ({
                id: doc.id,
                name: doc.name || 'Sem nome',
                primaryEmail: doc.primary_email || '',
                secondaryEmails: doc.secondary_emails || [],
                whatsapp: doc.whatsapp || '',
                cpf: doc.cpf || '',
                city: doc.city || '',
                state: doc.state || '',
                tags: doc.tags || [],
                origin: doc.origin || '',
                points: doc.points || 0,
                temperature: doc.temperature || 'inactive',
                stage: doc.stage || 'lead',
                totalSpent: Number(doc.total_spent) || 0,
                purchaseCount: doc.purchase_count || 0,
                lastPurchaseAt: doc.last_purchase_at ? new Date(doc.last_purchase_at) : null,
                createdAt: doc.created_at ? new Date(doc.created_at) : new Date(),
                updatedAt: doc.updated_at ? new Date(doc.updated_at) : new Date(),
            }));

            setLeads(leadsData);
        } catch (err) {
            console.error('Error fetching leads:', err);
            error('Erro ao carregar leads', 'Não foi possível buscar os dados.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLeads();
    }, [filters, currentPage, pageSize, sortColumn, sortDirection]);

    const handleServerSort = (key: string, direction: 'asc' | 'desc') => {
        const dbColumn = sortKeyMap[key] || key;
        setSortColumn(dbColumn);
        setSortDirection(direction);
        setCurrentPage(1);
    };

    const columns = [
        {
            key: 'name',
            header: 'Nome',
            sortable: true,
            render: (lead: Lead) => (
                <div>
                    <p className="font-medium text-white">{lead.name}</p>
                    <p className="text-sm text-gray-500">{lead.primaryEmail}</p>
                </div>
            ),
        },
        {
            key: 'whatsapp',
            header: 'WhatsApp',
            render: (lead: Lead) => lead.whatsapp ? (
                <a
                    href={`https://wa.me/${lead.whatsapp.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary-600 hover:text-primary-700"
                >
                    {formatPhone(lead.whatsapp)}
                </a>
            ) : <span className="text-gray-400">-</span>,
        },
        {
            key: 'temperature',
            header: 'Temperatura',
            sortable: true,
            render: (lead: Lead) => <TemperatureBadge temperature={lead.temperature} size="sm" />,
        },
        {
            key: 'stage',
            header: 'Estágio',
            sortable: true,
            render: (lead: Lead) => <StageBadge stage={lead.stage} size="sm" />,
        },
        {
            key: 'points',
            header: 'Pontos',
            sortable: true,
            render: (lead: Lead) => (
                <span className="font-semibold text-white">{lead.points}</span>
            ),
        },
        {
            key: 'totalSpent',
            header: 'Total Gasto',
            sortable: true,
            render: (lead: Lead) => formatCurrency(lead.totalSpent),
        },
        {
            key: 'purchaseCount',
            header: 'Compras',
            sortable: true,
            render: (lead: Lead) => (
                <span className="text-gray-400">{lead.purchaseCount}</span>
            ),
        },
    ];

    const handleViewLead = (lead: Lead) => {
        navigate(`/leads/${lead.id}`);
    };

    const handleEditLead = (lead: Lead) => {
        setSelectedLead(lead);
        setFormData({
            name: lead.name,
            primaryEmail: lead.primaryEmail,
            whatsapp: lead.whatsapp || '',
            cpf: lead.cpf || '',
            city: lead.city || '',
            state: lead.state || '',
            tags: lead.tags?.join(', ') || '',
            origin: lead.origin || '',
        });
        setShowCreateModal(true);
    };

    const handleNewLead = () => {
        setSelectedLead(null);
        setFormData({
            name: '',
            primaryEmail: '',
            whatsapp: '',
            cpf: '',
            city: '',
            state: '',
            tags: '',
            origin: '',
        });
        setShowCreateModal(true);
    }

    const handleSaveLead = async () => {
        try {
            const leadData = {
                name: formData.name,
                primary_email: formData.primaryEmail,
                whatsapp: formData.whatsapp,
                cpf: formData.cpf,
                city: formData.city,
                state: formData.state,
                tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean),
                origin: formData.origin,
            };

            if (selectedLead) {
                await api.put(`/api/leads/${selectedLead.id}`, leadData);
                success('Lead atualizado', 'Dados salvos com sucesso.');
            } else {
                await api.post('/api/leads', leadData);
                success('Lead criado', 'Novo lead adicionado com sucesso.');
            }
            setShowCreateModal(false);
            fetchLeads();
        } catch (err) {
            console.error('Error saving lead:', err);
            error('Erro ao salvar', 'Não foi possível salvar o lead.');
        }
    }

    const handleDeleteLead = async (lead: Lead) => {
        if (window.confirm(`Tem certeza que deseja excluir o lead "${lead.name}"?`)) {
            try {
                await api.delete(`/api/leads/${lead.id}`);

                // Optimistic update
                fetchLeads();
                success('Lead excluído', `${lead.name} foi removido com sucesso.`);
            } catch (err) {
                console.error('Error deleting lead:', err);
                error('Erro ao excluir', 'Não foi possível excluir o lead.');
            }
        }
    };

    // Filter clear logic
    const clearFilters = () => {
        setFilters({ temperature: '', stage: '', minPoints: '', maxPoints: '' });
        setCurrentPage(1);
    };

    // Export leads as CSV
    const exportLeads = async (type: 'full' | 'simple') => {
        try {
            success('Exportação iniciada', 'Buscando leads...');
            const queryParams = new URLSearchParams();
            if (filters.temperature) queryParams.append('temperature', filters.temperature);
            if (filters.stage) queryParams.append('stage', filters.stage);
            if (filters.minPoints) queryParams.append('minPoints', filters.minPoints);
            if (filters.maxPoints) queryParams.append('maxPoints', filters.maxPoints);
            // Request a large page size for export or we'd ideally have an /export endpoint
            queryParams.append('pageSize', '100000');
            
            const response = await api.get(`/api/leads?${queryParams.toString()}`);
            const allLeads = response.data || [];
            
            if (allLeads.length === 0) {
                error('Vazio', 'Não existem leads para exportar.');
                return;
            }

            const esc = (v: string) => `"${(v || '').toString().replace(/"/g, '""')}"`;
            let headers: string[];
            let rows: string[];
            if (type === 'simple') {
                headers = ['Nome', 'Email', 'WhatsApp', 'CPF'];
                rows = allLeads.map((l: any) => [
                    esc(l.name), esc(l.primary_email), esc(l.whatsapp), esc(l.cpf)
                ].join(','));
            } else {
                headers = ['Nome', 'Email', 'WhatsApp', 'CPF', 'Cidade', 'Estado', 'Tags', 'Origem', 'Pontos', 'Temperatura', 'Estágio', 'Total Gasto', 'Compras'];
                rows = allLeads.map((l: any) => [
                    esc(l.name), esc(l.primary_email), esc(l.whatsapp), esc(l.cpf),
                    esc(l.city), esc(l.state), esc((l.tags || []).join(', ')),
                    esc(l.origin), l.points || 0, esc(l.temperature), esc(l.stage),
                    l.total_spent || 0, l.purchase_count || 0
                ].join(','));
            }
            const csv = '\uFEFF' + [headers.join(','), ...rows].join('\n');
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `leads_${type === 'simple' ? 'contatos' : 'completo'}_${new Date().toISOString().slice(0, 10)}.csv`;
            a.click();
            URL.revokeObjectURL(url);
            success('Exportado!', `${allLeads.length} leads exportados.`);
        } catch (err) {
            console.error('Export error:', err);
            error('Erro', 'Não foi possível exportar os leads.');
        }
    };

    return (
        <div className="space-y-8 animate-fade-in relative z-10 pb-8 min-h-screen">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
                        Leads
                        <span className="text-sm font-medium text-primary-300 bg-primary-500/10 border border-primary-500/20 px-3 py-1 rounded-full shadow-[0_0_15px_rgba(124,58,237,0.1)]">
                            {loading ? 'Carregando...' : `${totalCount.toLocaleString()} total`}
                        </span>
                    </h1>
                    <p className="text-gray-400 mt-1 font-medium">
                        Gerencie todos os contatos e clientes da sua base.
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        onClick={() => exportLeads('simple')}
                        icon={<Download className="w-4 h-4" />}
                    >
                        Exportar Contatos
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() => exportLeads('full')}
                        icon={<Download className="w-4 h-4" />}
                    >
                        Exportar Completo
                    </Button>
                    <Button
                        variant="outline"
                        onClick={fetchLeads}
                        icon={<RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />}
                    >
                        Atualizar
                    </Button>
                    <Button
                        onClick={handleNewLead}
                        icon={<Plus className="w-4 h-4" />}
                    >
                        Novo Lead
                    </Button>
                </div>
            </div>

            {/* Filters */}
            <div className="glass-card rounded-2xl p-4 shadow-lg border border-white/5 relative z-50">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors bg-dark-800/50 hover:bg-white/10 px-4 py-2 rounded-xl border border-white/5"
                    >
                        <Filter className="w-4 h-4" />
                        <span className="font-semibold tracking-wide">Filtros</span>
                        {Object.values(filters).some(Boolean) && (
                            <span className="bg-primary-500 text-white text-xs px-2 py-0.5 rounded-md shadow-[0_0_10px_rgba(124,58,237,0.5)] font-bold">
                                {Object.values(filters).filter(Boolean).length}
                            </span>
                        )}
                    </button>

                    <div className="flex items-center gap-4">
                        {/* Page Size Selector */}
                        <div className="flex items-center gap-2 bg-dark-900/50 px-3 py-1.5 rounded-xl border border-white/5">
                            <span className="text-sm font-medium text-gray-400">Por página:</span>
                            <select
                                value={pageSize}
                                onChange={(e) => {
                                    setPageSize(Number(e.target.value));
                                    setCurrentPage(1); // Reset to page 1
                                }}
                                className="bg-transparent border-none text-sm font-bold text-white focus:ring-0 cursor-pointer py-1 pr-6 appearance-none focus:outline-none"
                            >
                                <option value="10" className="bg-dark-800">10</option>
                                <option value="20" className="bg-dark-800">20</option>
                                <option value="50" className="bg-dark-800">50</option>
                                <option value="100" className="bg-dark-800">100</option>
                                <option value="10000" className="bg-dark-800">Todos</option>
                            </select>
                        </div>

                        {Object.values(filters).some(Boolean) && (
                            <button
                                onClick={clearFilters}
                                className="text-sm text-red-400 hover:text-red-300 flex items-center gap-1.5 font-semibold bg-red-500/10 hover:bg-red-500/20 px-3 py-1.5 rounded-xl border border-red-500/20 transition-colors"
                            >
                                <X className="w-4 h-4" />
                                Limpar
                            </button>
                        )}
                    </div>
                </div>

                {showFilters && (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4 pt-4 border-t border-white/5 animate-slide-in">
                        <Select
                            label="Temperatura"
                            value={filters.temperature}
                            onChange={(e) => { setFilters({ ...filters, temperature: e.target.value }); setCurrentPage(1); }}
                            options={[
                                { value: 'hot', label: '🔥 Quente' },
                                { value: 'warm', label: '🟡 Morno' },
                                { value: 'cold', label: '🔵 Frio' },
                                { value: 'inactive', label: '❄️ Inativo' },
                            ]}
                        />
                        <Select
                            label="Estágio"
                            value={filters.stage}
                            onChange={(e) => { setFilters({ ...filters, stage: e.target.value }); setCurrentPage(1); }}
                            options={[
                                { value: 'lead', label: 'Lead Frio' },
                                { value: 'buyer', label: 'Comprador' },
                                { value: 'recurring', label: 'Recorrente' },
                                { value: 'vip', label: 'VIP' },
                            ]}
                        />
                        <Input
                            label="Pontos Mínimos"
                            type="number"
                            value={filters.minPoints}
                            onChange={(e) => { setFilters({ ...filters, minPoints: e.target.value }); setCurrentPage(1); }}
                            placeholder="0"
                        />
                        <Input
                            label="Pontos Máximos"
                            type="number"
                            value={filters.maxPoints}
                            onChange={(e) => { setFilters({ ...filters, maxPoints: e.target.value }); setCurrentPage(1); }}
                            placeholder="1000"
                        />
                    </div>
                )}
            </div>

            <div className="relative z-10">
                <DataTable
                    data={leads}
                    columns={columns}
                    keyField="id"
                    loading={loading}
                    searchable
                    searchPlaceholder="Buscar por nome, email ou WhatsApp..."
                    emptyMessage="Nenhum lead encontrado"
                    actions={(lead) => (
                        <div className="flex items-center gap-2 justify-end">
                            <button
                                onClick={() => handleViewLead(lead)}
                                className="p-2 rounded-xl bg-dark-800/50 hover:bg-white/10 text-gray-400 hover:text-white border border-white/5 transition-all group relative overflow-hidden"
                                title="Ver detalhes"
                            >
                                <Eye className="w-4 h-4 relative z-10" />
                                <div className="absolute inset-0 bg-white/20 blur-md rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            </button>
                            <button
                                onClick={() => handleEditLead(lead)}
                                className="p-2 rounded-xl bg-primary-500/10 hover:bg-primary-500/20 text-primary-400 border border-primary-500/20 transition-all group relative overflow-hidden"
                                title="Editar"
                            >
                                <Edit className="w-4 h-4 relative z-10" />
                                <div className="absolute inset-0 bg-primary-500/20 blur-md rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            </button>
                            <button
                                onClick={() => handleDeleteLead(lead)}
                                className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 transition-all group relative overflow-hidden"
                                title="Excluir"
                            >
                                <Trash2 className="w-4 h-4 relative z-10" />
                                <div className="absolute inset-0 bg-red-500/30 blur-md rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            </button>
                        </div>
                    )}
                    pagination={{
                        page: currentPage,
                        pageSize: pageSize >= 10000 ? totalCount : pageSize,
                        total: totalCount,
                        onPageChange: (newPage) => setCurrentPage(newPage),
                    }}
                    onSort={handleServerSort}
                    serverSortKey={Object.entries(sortKeyMap).find(([_, v]) => v === sortColumn)?.[0] || ''}
                    serverSortOrder={sortDirection}
                />
            </div>

            {/* Create/Edit Modal */}
            <Modal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                title={selectedLead ? 'Editar Lead' : 'Novo Lead'}
                size="lg"
                footer={
                    <>
                        <Button variant="outline" onClick={() => setShowCreateModal(false)}>
                            Cancelar
                        </Button>
                        <Button onClick={handleSaveLead}>
                            {selectedLead ? 'Salvar' : 'Criar Lead'}
                        </Button>
                    </>
                }
            >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                        label="Nome completo"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                    <Input
                        label="Email principal"
                        type="email"
                        required
                        value={formData.primaryEmail}
                        onChange={(e) => setFormData({ ...formData, primaryEmail: e.target.value })}
                    />
                    <Input
                        label="WhatsApp"
                        value={formData.whatsapp}
                        onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                    />
                    <Input
                        label="CPF"
                        value={formData.cpf}
                        onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                    />
                    <Input
                        label="Cidade"
                        value={formData.city}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    />
                    <Input
                        label="Estado"
                        value={formData.state}
                        onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    />
                    <div className="md:col-span-2">
                        <Input
                            label="Tags (separadas por vírgula)"
                            value={formData.tags}
                            onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                        />
                    </div>
                    <div className="md:col-span-2">
                        <Input
                            label="Origem"
                            value={formData.origin}
                            onChange={(e) => setFormData({ ...formData, origin: e.target.value })}
                        />
                    </div>
                </div>
            </Modal>
        </div>
    );
}
