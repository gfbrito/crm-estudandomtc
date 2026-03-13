import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, RefreshCw } from 'lucide-react';
import { api } from '@/config/api';
import DataTable from '@/components/DataTable';
import Button from '@/components/Button';
import Modal from '@/components/Modal';
import { Input, Select } from '@/components/FormFields';
import { useToast } from '@/components/Toast';
import { Product, ProductType, ProductStatus, ExternalProductId } from '@/types';
import { formatCurrency, formatDate } from '@/utils/formatters';

export default function ProductsPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        type: 'digital' as ProductType,
        defaultPrice: '',
        status: 'active' as ProductStatus,
        isSubscription: false,
        subscriptionPeriodDays: 365,
        renewalLink: ''
    });
    const [externalIds, setExternalIds] = useState<ExternalProductId[]>([]);
    const { success, error } = useToast();

    const fetchProducts = async () => {
        setLoading(true);
        try {
            const data = await api.get('/api/products');

            const productsData: Product[] = (data || []).map((doc: any) => ({
                id: doc.id,
                name: doc.name || 'Produto',
                type: doc.type || 'digital',
                defaultPrice: Number(doc.default_price) || 0,
                status: doc.status || 'active',
                isSubscription: doc.is_subscription || false,
                subscriptionPeriodDays: doc.subscription_period_days || 365,
                renewalLink: doc.renewal_link || '',
                externalIds: doc.external_ids || [],
                createdAt: doc.created_at ? new Date(doc.created_at) : new Date(),
            }));

            setProducts(productsData);
        } catch (err) {
            console.error('Error fetching products:', err);
            error('Erro ao carregar produtos', 'Não foi possível buscar os dados.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProducts();
    }, []);

    const columns = [
        {
            key: 'name', header: 'Produto', sortable: true, render: (p: Product) => (
                <div>
                    <p className="font-medium text-white">{p.name}</p>
                    <p className="text-sm text-gray-500">{p.type === 'digital' ? '📱 Digital' : '📦 Físico'}</p>
                    {p.isSubscription && <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded ml-2">Assinatura ({p.subscriptionPeriodDays}d)</span>}
                </div>
            )
        },
        { key: 'defaultPrice', header: 'Preço', sortable: true, render: (p: Product) => <span className="font-semibold">{formatCurrency(p.defaultPrice)}</span> },
        {
            key: 'status', header: 'Status', render: (p: Product) => (
                <span className={`px-3 py-1 rounded-full text-xs font-bold tracking-wide ${p.status === 'active' ? 'bg-green-500/10 text-green-400 border border-green-500/20 shadow-[0_0_10px_rgba(34,197,94,0.1)]' : 'bg-dark-600/50 text-gray-400 border border-white/5'}`}>
                    {p.status === 'active' ? 'ATVO' : 'INATIVO'}
                </span>
            )
        },
        {
            key: 'externalIds', header: 'Plataformas', render: (p: Product) => (
                <div className="flex gap-1.5 flex-wrap">
                    {p.externalIds?.map((ext, i) => (
                        <span key={i} className="px-2.5 py-1 rounded-md bg-primary-500/10 border border-primary-500/20 text-primary-400 text-xs font-semibold tracking-wide">
                            {ext.platform}
                        </span>
                    ))}
                    {(!p.externalIds || p.externalIds.length === 0) && <span className="text-gray-500 text-sm font-medium">-</span>}
                </div>
            )
        },
        { key: 'createdAt', header: 'Criado em', sortable: true, render: (p: Product) => <span className="text-gray-400 font-medium">{formatDate(p.createdAt)}</span> },
    ];

    const openCreateModal = () => {
        setSelectedProduct(null);
        setFormData({
            name: '',
            type: 'digital',
            defaultPrice: '',
            status: 'active',
            isSubscription: false,
            subscriptionPeriodDays: 365,
            renewalLink: ''
        });
        setExternalIds([]);
        setShowModal(true);
    };

    const openEditModal = (product: Product) => {
        setSelectedProduct(product);
        setFormData({
            name: product.name,
            type: product.type,
            defaultPrice: String(product.defaultPrice),
            status: product.status,
            isSubscription: product.isSubscription || false,
            subscriptionPeriodDays: product.subscriptionPeriodDays || 365,
            renewalLink: product.renewalLink || ''
        });
        setExternalIds([...(product.externalIds || [])]);
        setShowModal(true);
    };

    const handleSave = async () => {
        try {
            const productData = {
                name: formData.name,
                type: formData.type,
                default_price: parseFloat(formData.defaultPrice) || 0,
                status: formData.status,
                is_subscription: formData.isSubscription,
                subscription_period_days: formData.subscriptionPeriodDays,
                renewal_link: formData.renewalLink,
                external_ids: externalIds,
            };

            if (selectedProduct) {
                await api.put(`/api/products/${selectedProduct.id}`, productData);
                success('Produto atualizado', `${formData.name} foi atualizado com sucesso.`);
            } else {
                await api.post('/api/products', productData);
                success('Produto criado', `${formData.name} foi adicionado com sucesso.`);
            }
            setShowModal(false);
            fetchProducts();
        } catch (err) {
            console.error('Error saving product:', err);
            error('Erro ao salvar', 'Não foi possível salvar o produto.');
        }
    };

    const handleDelete = async (product: Product) => {
        if (window.confirm(`Tem certeza que deseja excluir "${product.name}"?`)) {
            try {
                await api.delete(`/api/products/${product.id}`);
                success('Produto excluído', `${product.name} foi removido.`);
                fetchProducts();
            } catch (err) {
                console.error('Error deleting product:', err);
                error('Erro ao excluir', 'Não foi possível excluir o produto.');
            }
        }
    };

    const addExternalId = () => {
        setExternalIds([...externalIds, { platform: '', productId: '', productName: '' }]);
    };

    const updateExternalId = (index: number, field: keyof ExternalProductId, value: string) => {
        const updated = [...externalIds];
        updated[index] = { ...updated[index], [field]: value };
        setExternalIds(updated);
    };

    const removeExternalId = (index: number) => {
        setExternalIds(externalIds.filter((_, i) => i !== index));
    };

    return (
        <div className="space-y-8 animate-fade-in relative z-10 pb-8 min-h-screen">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
                        Produtos
                        <span className="text-sm font-medium text-primary-300 bg-primary-500/10 border border-primary-500/20 px-3 py-1 rounded-full shadow-[0_0_15px_rgba(124,58,237,0.1)]">
                            {loading ? 'Carregando...' : `${products.length} cadastrados`}
                        </span>
                    </h1>
                    <p className="text-gray-400 mt-1 font-medium">
                        Gerencie todos os seus produtos digitais e físicos e integrações.
                    </p>
                </div>
                <div className="flex gap-3">
                    <Button variant="outline" onClick={fetchProducts} icon={<RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />}>
                        Atualizar
                    </Button>
                    <Button onClick={openCreateModal} icon={<Plus className="w-4 h-4" />} className="shadow-[0_0_20px_rgba(124,58,237,0.3)]">
                        Novo Produto
                    </Button>
                </div>
            </div>

            <div className="relative z-10">
                <DataTable
                    data={products}
                    columns={columns}
                    keyField="id"
                    loading={loading}
                    searchable
                    searchPlaceholder="Buscar produtos..."
                    emptyMessage="Nenhum produto cadastrado. Clique em 'Novo Produto' para adicionar."
                    actions={(product) => (
                        <div className="flex items-center gap-2 justify-end">
                            <button onClick={() => openEditModal(product)} className="p-2 rounded-xl bg-primary-500/10 hover:bg-primary-500/20 text-primary-400 border border-primary-500/20 transition-all group relative overflow-hidden" title="Editar">
                                <Edit className="w-4 h-4 relative z-10" />
                                <div className="absolute inset-0 bg-primary-500/20 blur-md rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            </button>
                            <button onClick={() => handleDelete(product)} className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 transition-all group relative overflow-hidden" title="Excluir">
                                <Trash2 className="w-4 h-4 relative z-10" />
                                <div className="absolute inset-0 bg-red-500/30 blur-md rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            </button>
                        </div>
                    )}
                />
            </div>

            <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={selectedProduct ? 'Editar Produto' : 'Novo Produto'} size="lg" footer={
                <>
                    <Button variant="outline" onClick={() => setShowModal(false)}>Cancelar</Button>
                    <Button onClick={handleSave}>{selectedProduct ? 'Salvar' : 'Criar'}</Button>
                </>
            }>
                <div className="space-y-4">
                    <Input label="Nome do Produto" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                    <div className="grid grid-cols-2 gap-4">
                        <Select label="Tipo" value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value as ProductType })} options={[{ value: 'digital', label: 'Digital' }, { value: 'physical', label: 'Físico' }]} />
                        <Input label="Preço (R$)" type="number" value={formData.defaultPrice} onChange={(e) => setFormData({ ...formData, defaultPrice: e.target.value })} />
                    </div>
                    <Select label="Status" value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value as ProductStatus })} options={[{ value: 'active', label: 'Ativo' }, { value: 'inactive', label: 'Inativo' }]} />

                    {/* Subscription Fields */}
                    <div className="glass-card p-5 rounded-2xl border border-white/5 space-y-5">
                        <label className="flex items-center gap-3 cursor-pointer group">
                            <div className="relative flex items-center justify-center">
                                <input
                                    type="checkbox"
                                    checked={formData.isSubscription}
                                    onChange={(e) => setFormData({ ...formData, isSubscription: e.target.checked })}
                                    className="peer w-5 h-5 rounded bg-dark-800/50 border border-white/10 text-primary-500 focus:ring-primary-500 focus:ring-offset-dark-900 transition-all appearance-none checked:bg-primary-500 checked:border-primary-500"
                                />
                                <div className="absolute text-white opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity">
                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"></path></svg>
                                </div>
                            </div>
                            <span className="text-sm font-semibold text-gray-300 group-hover:text-white transition-colors">Este produto é uma assinatura</span>
                        </label>

                        {formData.isSubscription && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 pt-2 border-t border-white/5">
                                <Input
                                    label="Período (dias)"
                                    type="number"
                                    value={formData.subscriptionPeriodDays}
                                    onChange={(e) => setFormData({ ...formData, subscriptionPeriodDays: Number(e.target.value) })}
                                />
                                <Input
                                    label="Link de Renovação"
                                    value={formData.renewalLink}
                                    onChange={(e) => setFormData({ ...formData, renewalLink: e.target.value })}
                                    placeholder="https://..."
                                />
                            </div>
                        )}
                    </div>

                    <div className="pt-6 mt-6 border-t border-white/5">
                        <div className="flex items-center justify-between mb-4">
                            <h4 className="text-sm font-bold text-white uppercase tracking-wide">Identificadores Externos</h4>
                            <Button size="sm" variant="outline" onClick={addExternalId} icon={<Plus className="w-3 h-3" />}>Adicionar</Button>
                        </div>
                        {externalIds.map((ext, index) => (
                            <div key={index} className="grid grid-cols-4 gap-2 mb-2">
                                <Input placeholder="Plataforma" value={ext.platform} onChange={(e) => updateExternalId(index, 'platform', e.target.value)} />
                                <Input placeholder="ID do Produto" value={ext.productId} onChange={(e) => updateExternalId(index, 'productId', e.target.value)} />
                                <Input placeholder="Nome na Plataforma" value={ext.productName} onChange={(e) => updateExternalId(index, 'productName', e.target.value)} />
                                <Button variant="ghost" size="sm" onClick={() => removeExternalId(index)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                            </div>
                        ))}
                    </div>
                </div>
            </Modal>
        </div>
    );
}
