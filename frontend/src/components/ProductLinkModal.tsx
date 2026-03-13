import { useState, useEffect } from 'react';
import { api } from '@/config/api';
import Modal from '@/components/Modal';
import Button from '@/components/Button';
import { Select } from '@/components/FormFields';
import { useToast } from '@/components/Toast';
import { Notification, Product } from '@/types';

interface ProductLinkModalProps {
    isOpen: boolean;
    onClose: () => void;
    notification: Notification;
    onResolved: () => void;
}

export default function ProductLinkModal({ isOpen, onClose, notification, onResolved }: ProductLinkModalProps) {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedProductId, setSelectedProductId] = useState('');
    const [action, setAction] = useState<'new' | 'link' | null>(null);
    const { success, error } = useToast();

    // The name of the product that was imported
    const importedProductName = notification.data?.importedName as string;
    // The ID of the temporary product that was created
    const tempProductId = notification.data?.tempProductId as string;

    useEffect(() => {
        if (isOpen) {
            fetchProducts();
        }
    }, [isOpen]);

    const fetchProducts = async () => {
        try {
            const data = await api.get('/api/products');

            const prods: Product[] = (data || []).map((doc: any) => ({
                id: doc.id,
                name: doc.name || 'Sem nome',
                type: doc.type || 'digital',
                defaultPrice: Number(doc.default_price) || 0,
                status: doc.status || 'active',
                externalIds: doc.external_ids || [],
                createdAt: doc.created_at ? new Date(doc.created_at) : new Date(),
                updatedAt: doc.updated_at ? new Date(doc.updated_at) : new Date(),
            }));

            // Filter out the temporary product itself to avoid linking to itself
            setProducts(prods.filter(p => p.id !== tempProductId));
        } catch (err) {
            console.error('Error fetching products:', err);
        }
    };

    const handleConfirm = async () => {
        if (!action) return;
        setLoading(true);

        try {
            if (action === 'new') {
                // User confirmed it's a new product.
                await api.post('/api/products/resolve-link', {
                    notificationId: notification.id,
                    importedName: importedProductName,
                    action: 'new',
                    tempProductId: tempProductId
                });

                success('Produto Confirmado', `"${importedProductName}" foi confirmado como um novo produto.`);
            } else if (action === 'link' && selectedProductId) {
                // User wants to link to an existing product.
                const targetProduct = products.find(p => p.id === selectedProductId);
                if (!targetProduct) throw new Error('Produto alvo não encontrado');

                await api.post('/api/products/resolve-link', {
                    notificationId: notification.id,
                    importedName: importedProductName,
                    action: 'link',
                    tempProductId: tempProductId,
                    targetProductId: selectedProductId,
                    targetProductName: targetProduct.name
                });

                success('Produto Vinculado', `Vendas migradas para "${targetProduct.name}". Produto temporário removido.`);
            }

            onResolved();
            onClose();

        } catch (err) {
            console.error('Error resolving product link:', err);
            error('Erro ao resolver', 'Ocorreu um erro ao processar sua decisão.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Verificação de Produto"
            footer={
                <>
                    <Button variant="outline" onClick={onClose} disabled={loading}>
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleConfirm}
                        disabled={loading || !action || (action === 'link' && !selectedProductId)}
                    >
                        {loading ? 'Processando...' : 'Confirmar Decisão'}
                    </Button>
                </>
            }
        >
            <div className="space-y-6">
                <div className="bg-yellow-500/10 p-4 rounded-xl border border-yellow-500/20 shadow-[0_0_15px_rgba(234,179,8,0.1)]">
                    <h4 className="font-semibold text-yellow-400 mb-1">
                        Novo nome detectado na importação
                    </h4>
                    <p className="text-lg font-bold text-white">
                        "{importedProductName}"
                    </p>
                </div>

                <div className="space-y-4">
                    <p className="text-gray-300 font-medium">
                        O sistema criou um produto temporário para este nome. O que você deseja fazer?
                    </p>

                    <div className="grid grid-cols-1 gap-3">
                        <label className={`
                            flex items-center p-4 border rounded-xl cursor-pointer transition-all
                            ${action === 'new'
                                ? 'border-primary-500/50 bg-primary-500/10 ring-1 ring-primary-500/50 shadow-[0_0_15px_rgba(124,58,237,0.1)]'
                                : 'border-white/10 hover:bg-white/5 hover:border-white/20'}
                        `}>
                            <input
                                type="radio"
                                name="action"
                                value="new"
                                checked={action === 'new'}
                                onChange={() => setAction('new')}
                                className="w-4 h-4 text-primary-500 bg-dark-900/50 border-white/20 focus:ring-primary-500/30"
                            />
                            <div className="ml-3">
                                <span className="block font-medium text-white">
                                    É um novo produto
                                </span>
                                <span className="block text-sm text-gray-500">
                                    Confirma que este é realmente um produto novo. Mapeamento será salvo para futuras importações.
                                </span>
                            </div>
                        </label>

                        <label className={`
                            flex items-center p-4 border rounded-xl cursor-pointer transition-all
                            ${action === 'link'
                                ? 'border-primary-500/50 bg-primary-500/10 ring-1 ring-primary-500/50 shadow-[0_0_15px_rgba(124,58,237,0.1)]'
                                : 'border-white/10 hover:bg-white/5 hover:border-white/20'}
                        `}>
                            <input
                                type="radio"
                                name="action"
                                value="link"
                                checked={action === 'link'}
                                onChange={() => setAction('link')}
                                className="w-4 h-4 text-primary-500 bg-dark-900/50 border-white/20 focus:ring-primary-500/30"
                            />
                            <div className="ml-3 w-full">
                                <span className="block font-medium text-white">
                                    Vincular a um produto existente
                                </span>
                                <span className="block text-sm text-gray-500 mb-2">
                                    Este nome é apenas um apelido ou variação de um produto que já existe.
                                </span>

                                {action === 'link' && (
                                    <div className="mt-2" onClick={e => e.stopPropagation()}>
                                        <Select
                                            label="Selecione o produto oficial"
                                            value={selectedProductId}
                                            onChange={(e) => setSelectedProductId(e.target.value)}
                                            options={products.map(p => ({ value: p.id, label: p.name }))}
                                            required
                                        />
                                    </div>
                                )}
                            </div>
                        </label>
                    </div>
                </div>
            </div>
        </Modal>
    );
}
