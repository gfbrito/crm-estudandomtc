import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { api } from '@/config/api';
import Sidebar from '@/components/Sidebar';
import { Cloud, CloudOff, RefreshCw, Menu } from 'lucide-react';
import { useOffline } from '@/contexts/OfflineContext';

function ConnectionStatus() {
    const { isOnline, pendingCount, syncNow } = useOffline();
    const [syncing, setSyncing] = useState(false);

    const handleSync = async () => {
        setSyncing(true);
        await syncNow();
        setSyncing(false);
    };

    return (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-2.5 rounded-2xl shadow-lg transition-all border backdrop-blur-md ${isOnline
            ? 'bg-green-500/10 text-green-400 border-green-500/20 shadow-green-500/10'
            : 'bg-orange-500/10 text-orange-400 border-orange-500/20 shadow-orange-500/10'
            }`}>
            {isOnline ? (
                <div className="relative flex items-center justify-center p-1">
                    <Cloud className="w-5 h-5 relative z-10" />
                    <div className="absolute inset-0 bg-green-400/20 blur-md rounded-full"></div>
                </div>
            ) : (
                <div className="relative flex items-center justify-center p-1">
                    <CloudOff className="w-5 h-5 relative z-10" />
                    <div className="absolute inset-0 bg-orange-400/20 blur-md rounded-full animate-pulse"></div>
                </div>
            )}

            <span className="text-sm font-semibold tracking-wide">
                {isOnline ? 'Conectado' : 'Offline'}
            </span>

            {pendingCount > 0 && (
                <div className="flex items-center gap-2 pl-3 ml-2 border-l border-white/10">
                    <div className="flex items-center gap-1.5 bg-white/5 px-2.5 py-1 rounded-lg border border-white/5">
                        <span className="text-xs font-medium text-gray-300">
                            {pendingCount}
                        </span>
                        <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse"></span>
                    </div>
                    <button
                        onClick={handleSync}
                        disabled={syncing}
                        className="p-1.5 hover:bg-white/10 text-gray-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                        title="Sincronizar agora"
                    >
                        <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin text-primary-400' : ''}`} />
                    </button>
                </div>
            )}
        </div>
    );
}

export default function MainLayout() {
    const [unreadCount, setUnreadCount] = useState(0);
    const [collapsed, setCollapsed] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const location = useLocation();

    useEffect(() => {
        const fetchUnread = async () => {
            try {
                const notifications = await api.get('/api/notifications');
                const unread = (notifications || []).filter((n: any) => !n.read);
                setUnreadCount(unread.length);
            } catch (error) {
                console.error('Error fetching unread notifications:', error);
            }
        };

        fetchUnread();
        const interval = setInterval(fetchUnread, 60000);
        return () => clearInterval(interval);
    }, []);

    // Close mobile drawer on navigation
    useEffect(() => {
        setMobileOpen(false);
    }, [location.pathname]);

    return (
        <div className="flex bg-dark-900 min-h-screen text-gray-200 font-sans selection:bg-primary-500/30">
            {/* Global gradient mesh background pattern */}
            <div className="fixed inset-0 z-0 opacity-[0.03] pointer-events-none"
                style={{ backgroundImage: 'radial-gradient(circle at 50% 50%, #7C3AED 0%, transparent 50%)', backgroundSize: '100vw 100vh' }}></div>

            {/* Mobile hamburger button */}
            <button
                onClick={() => setMobileOpen(true)}
                className="fixed top-4 left-4 z-50 lg:hidden p-2.5 rounded-xl bg-dark-800/90 border border-white/10 backdrop-blur-md text-gray-400 hover:text-white hover:bg-white/10 transition-all shadow-lg"
            >
                <Menu className="w-5 h-5" />
            </button>

            {/* Mobile backdrop overlay */}
            {mobileOpen && (
                <div
                    className="fixed inset-0 z-40 bg-dark-900/70 backdrop-blur-sm lg:hidden animate-fade-in"
                    onClick={() => setMobileOpen(false)}
                />
            )}

            {/* Sidebar: hidden on mobile unless mobileOpen */}
            <div className={`
                lg:block
                ${mobileOpen ? 'block' : 'hidden'}
            `}>
                <Sidebar
                    pendingNotifications={unreadCount}
                    collapsed={collapsed}
                    onToggle={() => setCollapsed(!collapsed)}
                />
            </div>

            {/* Connection status indicator */}
            <ConnectionStatus />

            {/* Main content wrapper with dynamic margin */}
            <div className={`flex-1 flex flex-col transition-all duration-300 relative z-10 ${collapsed ? 'lg:ml-20' : 'lg:ml-64'}`}>
                <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 md:p-6 lg:p-8 pt-16 lg:pt-4">
                    <div key={location.pathname} className="animate-fade-in">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
}
