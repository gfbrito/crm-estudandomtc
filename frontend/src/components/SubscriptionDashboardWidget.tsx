import { useState, useEffect } from 'react';
import { api } from '@/config/api';
import { AlertCircle, CheckCircle, Clock, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface SubscriptionStats {
    active: number;
    expiringSoon: number; // next 7 days
    expired: number;
    total: number;
}

export default function SubscriptionDashboardWidget() {
    const navigate = useNavigate();
    const [stats, setStats] = useState<SubscriptionStats>({ active: 0, expiringSoon: 0, expired: 0, total: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        setLoading(true);
        try {
            const data = await api.get('/api/subscriptions/stats');
            setStats(data || { active: 0, expiringSoon: 0, expired: 0, total: 0 });
        } catch (e) {
            console.error('Error fetching subscription stats:', e);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="glass-card p-6 rounded-2xl flex flex-col h-[280px]">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-dark-700/50 animate-pulse"></div>
                        <div className="w-32 h-6 bg-dark-700/50 rounded animate-pulse"></div>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1">
                    <div className="bg-dark-800/50 rounded-xl animate-pulse"></div>
                    <div className="bg-dark-800/50 rounded-xl animate-pulse"></div>
                    <div className="bg-dark-800/50 rounded-xl animate-pulse"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="glass-card p-6 rounded-2xl flex flex-col h-full">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-white flex items-center gap-3 tracking-tight">
                    <div className="p-1.5 rounded-lg bg-primary-500/10 border border-primary-500/20">
                        <RefreshCw className="w-4 h-4 text-primary-400" />
                    </div>
                    Assinaturas
                </h3>
                <span className="text-xs font-semibold text-gray-400 bg-dark-900/50 px-2.5 py-1 rounded-lg border border-white/5">
                    {stats.total} total
                </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1">
                {/* Active */}
                <div
                    onClick={() => navigate('/products')} // Ideally navigate to a filtered list, but products is fine for now
                    className="p-5 bg-green-500/10 border border-green-500/20 rounded-xl cursor-pointer hover:bg-green-500/20 transition-all duration-300 group relative overflow-hidden flex flex-col justify-center"
                >
                    <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent pointer-events-none"></div>
                    <div className="relative z-10 flex items-center gap-2 mb-3">
                        <div className="p-1 rounded-md bg-green-500/20 text-green-400 group-hover:scale-110 transition-transform">
                            <CheckCircle className="w-4 h-4" />
                        </div>
                        <span className="text-sm font-bold text-green-400 tracking-wide uppercase">Ativas</span>
                    </div>
                    <p className="text-3xl font-extrabold text-white relative z-10 drop-shadow-sm">{stats.active}</p>
                </div>

                {/* Expiring Soon */}
                <div className="p-5 bg-yellow-500/10 border border-yellow-500/20 rounded-xl relative overflow-hidden flex flex-col justify-center">
                    <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/5 to-transparent pointer-events-none"></div>
                    <div className="relative z-10 flex items-center gap-2 mb-3">
                        <div className="p-1 rounded-md bg-yellow-500/20 text-yellow-400">
                            <Clock className="w-4 h-4" />
                        </div>
                        <span className="text-sm font-bold text-yellow-500 tracking-wide uppercase">Vencendo (7d)</span>
                    </div>
                    <div className="relative z-10 flex items-baseline gap-2">
                        <p className="text-3xl font-extrabold text-white drop-shadow-sm">{stats.expiringSoon}</p>
                        <p className="text-xs font-semibold text-yellow-500 bg-yellow-500/10 px-1.5 py-0.5 rounded border border-yellow-500/20">Atenção</p>
                    </div>
                </div>

                {/* Expired */}
                <div className="p-5 bg-red-500/10 border border-red-500/20 rounded-xl relative overflow-hidden flex flex-col justify-center">
                    <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-transparent pointer-events-none"></div>
                    <div className="relative z-10 flex items-center gap-2 mb-3">
                        <div className="p-1 rounded-md bg-red-500/20 text-red-500">
                            <AlertCircle className="w-4 h-4" />
                        </div>
                        <span className="text-sm font-bold text-red-500 tracking-wide uppercase">Expiradas</span>
                    </div>
                    <p className="text-3xl font-extrabold text-white relative z-10 drop-shadow-sm">{stats.expired}</p>
                </div>
            </div>

            <div className="mt-6 pt-5 border-t border-white/5 flex justify-end">
                <button
                    onClick={() => navigate('/subscription-settings')}
                    className="text-sm text-primary-400 hover:text-primary-300 font-semibold transition-colors flex items-center gap-1 group"
                >
                    Gerenciar Regras
                    <span className="group-hover:translate-x-0.5 transition-transform">→</span>
                </button>
            </div>
        </div>
    );
}
