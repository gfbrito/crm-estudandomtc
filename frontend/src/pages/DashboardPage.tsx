import { useState, useEffect } from 'react';
import { Users, DollarSign, TrendingUp, Calendar } from 'lucide-react';
import SubscriptionDashboardWidget from '@/components/SubscriptionDashboardWidget';
import { api } from '@/config/api';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency, formatDate } from '@/utils/formatters';

export default function DashboardPage() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        totalLeads: 0,
        periodLeads: 0,
        totalSales: 0,
        periodSales: 0,
        periodRevenue: 0,
    });
    const [recentActivity, setRecentActivity] = useState<any[]>([]);

    // Filter State
    const [period, setPeriod] = useState('7d'); // 'today', 'yesterday', '7d', '30d', 'this_month', 'last_month'

    const fetchDashboardData = async () => {
        setLoading(true);
        try {
            console.log(`Fetching dashboard data for period: ${period}...`);
            // The backend handles the period/filtering internally based on the request (we could pass period as query param, 
            // but for now the backend dashboard/stats endpoint returns today/week/month stats directly)
            
            const statsData = await api.get('/api/dashboard/stats');
            
            // Map backend stats to the UI structure
            setStats({
                totalLeads: statsData.totalLeads || 0,
                // Dashboard UI expects 'period' stats, we'll map 'week' as default or based on selection if we extend backend
                periodLeads: 0, // Not calculated directly in current backend, placeholder
                totalSales: 0, // Count only
                periodSales: statsData.salesMonth?.count || 0,
                periodRevenue: statsData.salesMonth?.amount || 0,
            });

            // Recent Activity
            const activityData = await api.get('/api/dashboard/recent-activity');
            
            const formattedActivity = activityData?.map((item: any) => ({
                id: item.id,
                type: item.type,
                content: item.content,
                leadName: item.leads?.name || 'Sistema',
                date: item.created_at ? new Date(item.created_at) : new Date(),
            })) || [];

            setRecentActivity(formattedActivity);

        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDashboardData();
    }, [period]); // Refetch when period changes

    const getPeriodLabel = () => {
        switch (period) {
            case 'today': return 'Hoje';
            case 'yesterday': return 'Ontem';
            case '7d': return 'Últimos 7 dias';
            case '30d': return 'Últimos 30 dias';
            case 'this_month': return 'Este Mês';
            case 'last_month': return 'Mês Passado';
            default: return '';
        }
    };

    const cards = [
        {
            title: 'Receita',
            value: formatCurrency(stats.periodRevenue),
            subValue: `${stats.periodSales} vendas no período`,
            icon: DollarSign,
            color: 'text-green-400',
            bgGlow: 'bg-green-500/10 shadow-[inner_0_0_15px_rgba(34,197,94,0.15)] focus:shadow-[0_0_20px_rgba(34,197,94,0.3)]',
        },
        {
            title: 'Leads no Período',
            value: stats.periodLeads.toString(),
            subValue: 'Novos cadastros',
            icon: Users,
            color: 'text-primary-400',
            bgGlow: 'bg-primary-500/10 shadow-[inner_0_0_15px_rgba(124,58,237,0.15)] focus:shadow-[0_0_20px_rgba(124,58,237,0.3)]',
        },
        {
            title: 'Vendas no Período',
            value: stats.periodSales.toString(),
            subValue: 'Faturamento confirmado',
            icon: TrendingUp,
            color: 'text-blue-400',
            bgGlow: 'bg-blue-500/10 shadow-[inner_0_0_15px_rgba(59,130,246,0.15)] focus:shadow-[0_0_20px_rgba(59,130,246,0.3)]',
        },
        {
            title: 'Base Total',
            value: stats.totalLeads.toString(),
            subValue: 'Leads totais',
            icon: Calendar,
            color: 'text-orange-400',
            bgGlow: 'bg-orange-500/10 shadow-[inner_0_0_15px_rgba(249,115,22,0.15)] focus:shadow-[0_0_20px_rgba(249,115,22,0.3)]',
        },
    ];

    return (
        <div className="space-y-8 animate-fade-in relative z-10 pb-8 min-h-screen">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-white flex items-center gap-3 tracking-tight">
                        Dashboard <span className="text-sm font-medium text-primary-300 bg-primary-500/10 border border-primary-500/20 px-3 py-1 rounded-full shadow-[0_0_15px_rgba(124,58,237,0.1)]">{getPeriodLabel()}</span>
                    </h1>
                    <p className="text-gray-400 mt-1">Bem-vindo, {user?.name}</p>
                </div>

                {/* Period Filter */}
                <div className="flex items-center gap-2 glass-card p-1.5 rounded-xl border border-white/5 shadow-lg group relative z-50">
                    <div className="p-1.5 rounded-lg bg-dark-800/50">
                        <Calendar className="w-4 h-4 text-primary-400" />
                    </div>
                    <select
                        value={period}
                        onChange={(e) => setPeriod(e.target.value)}
                        className="bg-transparent border-none text-sm font-semibold text-gray-300 focus:ring-0 cursor-pointer py-1.5 pr-8 appearance-none focus:outline-none"
                    >
                        <option value="today" className="bg-dark-800">Hoje</option>
                        <option value="yesterday" className="bg-dark-800">Ontem</option>
                        <option value="7d" className="bg-dark-800">Últimos 7 dias</option>
                        <option value="30d" className="bg-dark-800">Últimos 30 dias</option>
                        <option value="this_month" className="bg-dark-800">Este Mês</option>
                        <option value="last_month" className="bg-dark-800">Mês Passado</option>
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative z-10">
                {cards.map((card, index) => (
                    <div key={index} className="glass-card rounded-2xl p-6 relative overflow-hidden group hover:-translate-y-1 transition-all duration-300">
                        <div className="flex items-center justify-between relative z-10">
                            <div>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{card.title}</p>
                                <p className="text-3xl font-extrabold text-white mt-2 tracking-tight drop-shadow-sm">
                                    {loading ? '...' : card.value}
                                </p>
                            </div>
                            <div className={`p-4 rounded-full relative flex items-center justify-center ${card.bgGlow}`}>
                                <card.icon className={`w-6 h-6 relative z-10 ${card.color}`} />
                                <div className={`absolute inset-0 blur-xl rounded-full opacity-40 ${card.bgGlow}`}></div>
                            </div>
                        </div>
                        <div className="mt-5 flex items-center text-sm font-medium relative z-10">
                            <span className="text-gray-400 bg-dark-900/50 px-2.5 py-1 rounded-lg border border-white/5">{card.subValue}</span>
                        </div>
                        <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-transparent via-white/5 to-transparent origin-left transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500"></div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 relative z-10">
                {/* Subscription Widget */}
                <SubscriptionDashboardWidget />

                {/* Recent Activity */}
                <div className="glass-card rounded-2xl p-6 flex flex-col h-full">
                    <h3 className="text-lg font-bold text-white mb-6 tracking-tight flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-primary-500/10 border border-primary-500/20">
                            <Calendar className="w-4 h-4 text-primary-400" />
                        </div>
                        Atividade Recente
                    </h3>
                    <div className="space-y-4 flex-1">
                        {loading ? (
                            <div className="flex items-center justify-center h-full">
                                <span className="text-gray-500 animate-pulse">Carregando...</span>
                            </div>
                        ) : recentActivity.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-center space-y-3 opacity-50">
                                <Calendar className="w-12 h-12 text-gray-600" />
                                <p className="text-gray-400 font-medium">Nenhuma atividade recente.</p>
                            </div>
                        ) : (
                            recentActivity.map((activity) => (
                                <div key={activity.id} className="flex items-start gap-4 p-4 rounded-xl hover:bg-white/5 border border-transparent hover:border-white/5 transition-all duration-300 group cursor-pointer">
                                    <div className={`p-2.5 rounded-xl border relative z-10 ${activity.type === 'sale' ? 'bg-green-500/10 border-green-500/20 text-green-400 shadow-[0_0_10px_rgba(34,197,94,0.1)]' : 'bg-blue-500/10 border-blue-500/20 text-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.1)]'}`}>
                                        {activity.type === 'sale' ? <DollarSign className="w-4 h-4" /> : <Users className="w-4 h-4" />}
                                    </div>
                                    <div className="flex-1 min-w-0 pt-0.5">
                                        <p className="text-sm font-bold text-gray-200 group-hover:text-primary-300 transition-colors truncate">
                                            {activity.leadName}
                                        </p>
                                        <p className="text-sm font-medium text-gray-500 mt-1 truncate">{activity.content}</p>
                                    </div>
                                    <div className="text-xs font-semibold text-gray-600 bg-dark-900/50 px-2 py-1 rounded-md border border-white/5 shrink-0">
                                        {formatDate(activity.date)}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Placeholder for Charts */}
                <div className="glass-card rounded-2xl p-6 lg:col-span-2">
                    <h3 className="text-lg font-bold text-white mb-6 tracking-tight flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-orange-500/10 border border-orange-500/20">
                            <TrendingUp className="w-4 h-4 text-orange-400" />
                        </div>
                        Desempenho no Período
                    </h3>
                    <div className="flex flex-col items-center justify-center h-64 bg-dark-900/30 rounded-xl border border-dashed border-white/10 group relative overflow-hidden">
                        <TrendingUp className="w-12 h-12 text-gray-700 mb-4 group-hover:text-gray-600 transition-colors" />
                        <p className="text-gray-500 font-medium">Gráfico de desempenho será implementado na próxima versão.</p>
                        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.02] to-transparent pointer-events-none"></div>
                    </div>
                </div>
            </div>
        </div>
    );
}
