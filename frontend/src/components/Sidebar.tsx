import { NavLink, useLocation } from 'react-router-dom';
import {
    LayoutDashboard,
    Users,
    Package,
    ShoppingCart,
    RefreshCw,
    Upload,
    Bell,
    Settings,
    LogOut,
    ChevronLeft,
    ChevronRight,
    MessageSquare,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { classNames } from '@/utils/formatters';

interface SidebarProps {
    pendingNotifications?: number;
    collapsed: boolean;
    onToggle: () => void;
}
interface NavItem {
    to: string;
    icon: React.ElementType;
    label: string;
    masterOnly?: boolean;
}

const navItems: NavItem[] = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/leads', icon: Users, label: 'Leads' },
    { to: '/products', icon: Package, label: 'Produtos' },
    { to: '/sales', icon: ShoppingCart, label: 'Vendas' },
    { to: '/recovery', icon: RefreshCw, label: 'Recuperação' },
    { to: '/mass-messaging', icon: MessageSquare, label: 'Mensagens em Massa', masterOnly: true },
    { to: '/import', icon: Upload, label: 'Importar CSV', masterOnly: true },
    { to: '/subscription-settings', icon: RefreshCw, label: 'Assinaturas' },
    { to: '/notifications', icon: Bell, label: 'Notificações' },
    { to: '/settings', icon: Settings, label: 'Configurações', masterOnly: true },
];

export default function Sidebar({ pendingNotifications = 0, collapsed, onToggle }: SidebarProps) {
    const { user, logout, isMaster } = useAuth();
    const location = useLocation();
    // Removed local state


    const handleLogout = async () => {
        try {
            await logout();
        } catch (error) {
            console.error('Logout error:', error);
        }
    };

    const filteredNavItems = navItems.filter(
        (item) => !item.masterOnly || isMaster
    );

    return (
        <aside
            className={`fixed left-0 top-0 h-screen bg-[#0b141a]/95 backdrop-blur-xl border-r border-white/5 text-gray-300 flex flex-col transition-all duration-300 z-50 ${collapsed ? 'w-20' : 'w-64'
                }`}
        >
            {/* Logo */}
            <div className="h-20 px-6 flex items-center justify-between border-b border-white/5">
                {!collapsed && (
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center shadow-lg shadow-primary-500/20">
                            <span className="text-white font-bold text-lg">C</span>
                        </div>
                        <h1 className="text-xl font-bold bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent tracking-tight">
                            CRM Leads
                        </h1>
                    </div>
                )}
                {collapsed && (
                    <div className="w-8 h-8 mx-auto rounded-xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center shadow-lg shadow-primary-500/20">
                        <span className="text-white font-bold text-lg">C</span>
                    </div>
                )}
                <button
                    onClick={onToggle}
                    className={`p-1.5 rounded-lg hover:bg-white/5 text-gray-500 hover:text-white transition-all ${collapsed ? 'absolute -right-3 top-6 bg-dark-800 border border-white/10 shadow-lg' : ''}`}
                >
                    {collapsed ? (
                        <ChevronRight className="w-4 h-4" />
                    ) : (
                        <ChevronLeft className="w-5 h-5" />
                    )}
                </button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto py-6 custom-scrollbar">
                <ul className="space-y-1.5 px-3">
                    {filteredNavItems.map((item) => {
                        const isActive = location.pathname === item.to;
                        const Icon = item.icon;
                        const showBadge = item.to === '/notifications' && pendingNotifications > 0;

                        return (
                            <li key={item.to}>
                                <NavLink
                                    to={item.to}
                                    className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-300 relative group overflow-hidden ${isActive
                                        ? 'bg-primary-500/10 text-white border border-primary-500/20 shadow-[0_0_15px_rgba(124,58,237,0.1)]'
                                        : 'text-gray-400 hover:bg-white/5 hover:text-gray-200 border border-transparent'
                                        }`}
                                >
                                    {isActive && (
                                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary-500 rounded-r-full shadow-[0_0_10px_rgba(124,58,237,0.8)]"></div>
                                    )}
                                    <Icon className={classNames(
                                        "w-5 h-5 flex-shrink-0 transition-all duration-300",
                                        isActive ? "text-primary-400" : "group-hover:text-primary-400/70"
                                    )} />
                                    {!collapsed && (
                                        <span className="font-medium tracking-wide text-sm">{item.label}</span>
                                    )}
                                    {showBadge && (
                                        <span className={classNames(
                                            "absolute top-1/2 -translate-y-1/2 flex items-center justify-center bg-red-500/10 border border-red-500/30 text-red-400 text-[10px] font-bold h-5 px-1.5 rounded-full shadow-[0_0_10px_rgba(239,68,68,0.2)]",
                                            collapsed ? "right-2" : "right-3"
                                        )}>
                                            {pendingNotifications > 99 ? '99+' : pendingNotifications}
                                        </span>
                                    )}
                                    {collapsed && (
                                        <div className="absolute left-full ml-4 px-3 py-2 bg-dark-800 border border-white/10 rounded-lg text-xs font-semibold text-white shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50">
                                            {item.label}
                                        </div>
                                    )}
                                </NavLink>
                            </li>
                        );
                    })}
                </ul>
            </nav>

            {/* User Section */}
            <div className="p-4 border-t border-white/5 bg-white/[0.02]">
                <div className={`flex items-center gap-3 ${collapsed ? 'justify-center' : ''}`}>
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-purple-700 flex items-center justify-center flex-shrink-0 shadow-lg shadow-primary-500/20 border border-white/10 relative">
                        <span className="text-white font-bold text-sm">
                            {user?.name?.charAt(0).toUpperCase() || 'U'}
                        </span>
                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-dark-900 rounded-full"></div>
                    </div>
                    {!collapsed && (
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-white truncate">{user?.name}</p>
                            <p className="text-xs text-gray-500 font-medium capitalize truncate">{user?.role}</p>
                        </div>
                    )}
                </div>
                <button
                    onClick={handleLogout}
                    className={`mt-4 w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-gray-500 hover:bg-red-500/10 hover:text-red-400 border border-transparent hover:border-red-500/20 transition-all ${collapsed ? 'justify-center' : ''
                        }`}
                    title="Sair do sistema"
                >
                    <LogOut className="w-4 h-4" />
                    {!collapsed && <span className="text-sm font-medium">Sair da Conta</span>}
                </button>
            </div>
        </aside>
    );
}
