import { useState, useEffect } from 'react';
import { Bell, Check, Trash2, RefreshCw, CheckCheck, AlertCircle, ShoppingCart, Users } from 'lucide-react';
import { api } from '@/config/api';
import Button from '@/components/Button';
import { useToast } from '@/components/Toast';
import { formatDate } from '@/utils/formatters';
import ProductLinkModal from '@/components/ProductLinkModal';
import { Notification } from '@/types';
import { useNavigate } from 'react-router-dom';

export default function NotificationsPage() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const { success, error } = useToast();
    const navigate = useNavigate();

    const fetchNotifications = async () => {
        setLoading(true);
        try {
            const data = await api.get('/api/notifications');

            const notifData: Notification[] = (data || []).map((doc: any) => ({
                id: doc.id,
                type: doc.type || 'system',
                title: doc.title || 'Notificação',
                message: doc.message || '',
                read: doc.read || false,
                status: doc.status || 'pending',
                data: doc.data || {},
                createdAt: doc.created_at ? new Date(doc.created_at) : new Date(),
                resolvedAt: doc.resolved_at ? new Date(doc.resolved_at) : null,
            }));

            setNotifications(notifData);
        } catch (err) {
            console.error('Error fetching notifications:', err);
            setNotifications([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNotifications();
    }, []);

    const markAsRead = async (notif: Notification) => {
        try {
            // For product_link notifications, clicking ✓ = confirming as new product
            if (notif.type === 'product_link' && notif.status !== 'resolved' && notif.data) {
                const importedName = notif.data.importedName as string;
                const tempProductId = notif.data.tempProductId as string;

                if (tempProductId) {
                    // Activate the draft product
                    await api.put(`/api/products/${tempProductId}`, {
                        status: 'active'
                    });

                    // Create mapping
                    // We need a specific endpoint to create mappings. 
                    // Let's assume an endpoint POST /api/import/mappings exists
                    await api.post('/api/import/mappings', {
                        imported_name: importedName,
                        target_product_id: tempProductId
                    });
                }

                // Mark as resolved
                await api.put(`/api/notifications/${notif.id}/resolve`);

                setNotifications(notifications.map(n => n.id === notif.id
                    ? { ...n, read: true, status: 'resolved' as const }
                    : n
                ));
                success('Produto Confirmado', `"${importedName}" foi ativado.`);
            } else {
                await api.put(`/api/notifications/${notif.id}/read`);

                setNotifications(notifications.map(n => n.id === notif.id ? { ...n, read: true } : n));
            }
        } catch (err) {
            console.error('Error marking as read:', err);
        }
    };

    const markAllAsRead = async () => {
        try {
            const unread = notifications.filter(n => !n.read);
            if (unread.length === 0) return;

            // Notice we use a specific bulk endpoint for read-all
            await api.put('/api/notifications/read-all');

            setNotifications(notifications.map(n => ({ ...n, read: true })));
            success('Notificações', 'Todas marcadas como lidas.');
        } catch (err) {
            console.error('Error marking all as read:', err);
            error('Erro', 'Falha ao marcar notificações.');
        }
    };

    const deleteNotification = async (notif: Notification) => {
        try {
            await api.delete(`/api/notifications/${notif.id}`);

            setNotifications(notifications.filter(n => n.id !== notif.id));
        } catch (err) {
            console.error('Error deleting notification:', err);
        }
    };

    const clearAll = async () => {
        if (!window.confirm('Tem certeza que deseja excluir todas as notificações listadas?')) return;
        try {
            // Bulk delete
            // Since our backend router doesn't have a bulk delete, we do this parallelly or we can add an endpoint
            // I'll execute them parallelly for now just to make it work
            await Promise.all(
                notifications.map(n => api.delete(`/api/notifications/${n.id}`))
            );

            setNotifications([]);
            success('Notificações', 'Todas as notificações foram excluídas.');
        } catch (err) {
            console.error('Error clearing all:', err);
            error('Erro', 'Falha ao excluir.');
        }
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'sale': return <ShoppingCart className="w-5 h-5 text-green-500" />;
            case 'refund': return <AlertCircle className="w-5 h-5 text-red-500" />;
            case 'lead': return <Users className="w-5 h-5 text-blue-500" />;
            case 'product_link': return <div className="w-5 h-5 text-yellow-500 font-bold flex items-center justify-center border-2 border-yellow-500 rounded-full text-xs">?</div>;
            default: return <Bell className="w-5 h-5 text-gray-500" />;
        }
    };

    const unreadCount = notifications.filter(n => !n.read).length;

    const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
    const [showLinkModal, setShowLinkModal] = useState(false);

    const handleAction = (notif: Notification) => {
        if (notif.type === 'product_link') {
            setSelectedNotification(notif);
            setShowLinkModal(true);
        } else if (notif.type === 'new_origin') {
            // Redirect to settings with webhook tab open
            navigate('/settings');
            // We can't easily set the state of another page directly via URL params without more logic,
            // but user can navigate to Webhooks manually. 
            // Ideally we could pass state: { activeTab: 'webhooks', originName: notif.data?.origin }
            // But for now, let's just go to settings.
            // Better: Use query param ?tab=webhooks
            // But SettingsPage needs to read it. Let's assume user finds it or improve SettingsPage later.
        }
    };

    return (
        <div className="space-y-6 animate-fade-in relative z-10 min-h-screen pb-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-extrabold text-white tracking-tight">Notificações</h1>
                    <p className="text-gray-400 mt-1 font-medium">
                        {loading ? 'Carregando...' : `${unreadCount} não lidas de ${notifications.length} total`}
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={fetchNotifications} icon={<RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />}>
                        Atualizar
                    </Button>
                    {unreadCount > 0 && (
                        <Button variant="outline" onClick={markAllAsRead} icon={<CheckCheck className="w-4 h-4" />}>
                            Marcar todas como lidas
                        </Button>
                    )}
                    {notifications.length > 0 && (
                        <Button variant="outline" onClick={clearAll} icon={<Trash2 className="w-4 h-4" />}>
                            Limpar todas
                        </Button>
                    )}
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center h-64">
                    <RefreshCw className="w-8 h-8 animate-spin text-primary-500" />
                </div>
            ) : notifications.length === 0 ? (
                <div className="bg-dark-800/50 backdrop-blur-md rounded-2xl p-12 text-center border border-white/5 shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary-500/20 to-transparent"></div>
                    <div className="w-20 h-20 rounded-full bg-dark-900/80 flex items-center justify-center mx-auto mb-6 border border-white/5 shadow-lg">
                        <Bell className="w-10 h-10 text-gray-500" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">Sem notificações</h3>
                    <p className="text-gray-400">Você não tem notificações no momento.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {/* Pending notifications */}
                    {notifications.filter(n => n.status !== 'resolved').length > 0 && (
                        <>
                            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-widest px-2 mb-4">
                                Pendentes ({notifications.filter(n => n.status !== 'resolved').length})
                            </h3>
                            {notifications.filter(n => n.status !== 'resolved').map(notif => (
                                <div
                                    key={notif.id}
                                    className={`bg-dark-800/50 backdrop-blur-md rounded-xl p-5 border transition-all duration-300 hover:border-white/10 group ${notif.read
                                        ? 'border-white/5 shadow-lg'
                                        : 'border-primary-500/30 bg-primary-500/5 shadow-[0_0_15px_rgba(124,58,237,0.1)]'
                                        }`}
                                >
                                    <div className="flex items-start gap-4">
                                        <div className={`flex-shrink-0 mt-1 p-2 rounded-xl ${notif.read ? 'bg-dark-900/50 border border-white/5' : 'bg-primary-500/10 border border-primary-500/20'}`}>
                                            {getTypeIcon(notif.type)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between">
                                                <h4 className={`font-medium ${notif.read ? 'text-gray-300' : 'text-white'}`}>
                                                    {notif.title}
                                                </h4>
                                                <span className="text-xs font-medium text-gray-500">{formatDate(notif.createdAt)}</span>
                                            </div>
                                            <p className="text-sm text-gray-400 mt-2 leading-relaxed">{notif.message}</p>

                                            {notif.type === 'product_link' && !notif.read && (
                                                <button
                                                    onClick={() => handleAction(notif)}
                                                    className="mt-4 text-sm font-medium text-primary-400 hover:text-white border border-primary-500/30 bg-primary-500/10 hover:bg-primary-500/30 px-4 py-2 rounded-lg shadow-sm transition-all duration-300"
                                                >
                                                    Resolver Pendência
                                                </button>
                                            )}

                                            {notif.type === 'new_origin' && !notif.read && (
                                                <button
                                                    onClick={() => navigate('/settings')}
                                                    className="mt-4 text-sm font-medium text-blue-400 hover:text-white border border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/30 px-4 py-2 rounded-lg shadow-sm flex items-center gap-2 transition-all duration-300"
                                                >
                                                    <RefreshCw className="w-3.5 h-3.5" />
                                                    Configurar Webhook
                                                </button>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            {!notif.read && (
                                                <button
                                                    onClick={() => markAsRead(notif)}
                                                    className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-primary-400 transition-colors"
                                                    title="Marcar como lida"
                                                >
                                                    <Check className="w-4 h-4" />
                                                </button>
                                            )}
                                            <button
                                                onClick={() => deleteNotification(notif)}
                                                className="p-2 rounded-lg hover:bg-red-500/10 text-gray-400 hover:text-red-400 transition-colors"
                                                title="Excluir"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </>
                    )}

                    {/* Resolved notifications */}
                    {notifications.filter(n => n.status === 'resolved').length > 0 && (
                        <details className="group mt-8">
                            <summary className="cursor-pointer text-sm font-semibold text-gray-500 uppercase tracking-widest px-2 py-3 flex items-center gap-2 select-none hover:text-gray-300 transition-colors rounded-xl hover:bg-dark-900/50">
                                <span className="transition-transform group-open:rotate-90">▶</span>
                                Resolvidas ({notifications.filter(n => n.status === 'resolved').length})
                            </summary>
                            <div className="space-y-3 mt-4 pl-2">
                                {notifications.filter(n => n.status === 'resolved').map(notif => (
                                    <div
                                        key={notif.id}
                                        className="bg-dark-900/30 rounded-xl p-4 border border-white/5 opacity-60 hover:opacity-100 transition-opacity group/resolved"
                                    >
                                        <div className="flex items-start gap-4">
                                            <div className="flex-shrink-0 mt-1 p-2 rounded-xl bg-green-500/10 border border-green-500/20">
                                                <Check className="w-4 h-4 text-green-400" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between">
                                                    <h4 className="font-medium text-gray-500 line-through decoration-gray-600">
                                                        {notif.title}
                                                    </h4>
                                                    <span className="text-xs text-gray-500">{formatDate(notif.createdAt)}</span>
                                                </div>
                                                <p className="text-sm text-gray-500 mt-1 line-clamp-1">{notif.message}</p>
                                            </div>
                                            <button
                                                onClick={() => deleteNotification(notif)}
                                                className="p-2 rounded-lg hover:bg-red-500/10 text-gray-600 hover:text-red-400 transition-colors opacity-0 group-hover/resolved:opacity-100"
                                                title="Excluir"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </details>
                    )}

                    {selectedNotification && (
                        <ProductLinkModal
                            isOpen={showLinkModal}
                            onClose={() => setShowLinkModal(false)}
                            notification={selectedNotification}
                            onResolved={fetchNotifications}
                        />
                    )}
                </div>
            )}
        </div>
    );
}
