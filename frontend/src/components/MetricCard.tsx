import { LucideIcon } from 'lucide-react';
import { classNames } from '@/utils/formatters';

interface MetricCardProps {
    title: string;
    value: string | number;
    subtitle?: string;
    icon: LucideIcon;
    trend?: {
        value: number;
        isPositive: boolean;
    };
    variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger';
    onClick?: () => void;
}

const variantStyles = {
    default: {
        bg: 'bg-dark-800/80 border-white/5 shadow-inner hover:shadow-[0_8px_30px_rgba(0,0,0,0.5)]',
        icon: 'bg-white/5 text-gray-400 border border-white/5 shadow-inner',
        text: 'text-white',
        title: 'text-gray-400',
    },
    primary: {
        bg: 'bg-gradient-to-br from-primary-600/90 to-primary-900/90 border-primary-500/20 shadow-[0_0_20px_rgba(124,58,237,0.15)] hover:shadow-[0_0_30px_rgba(124,58,237,0.3)]',
        icon: 'bg-white/10 text-white border border-white/10 shadow-[inner_0_0_10px_rgba(255,255,255,0.1)]',
        text: 'text-white',
        title: 'text-primary-100',
    },
    success: {
        bg: 'bg-gradient-to-br from-green-600/90 to-emerald-900/90 border-green-500/20 shadow-[0_0_20px_rgba(16,185,129,0.15)] hover:shadow-[0_0_30px_rgba(16,185,129,0.3)]',
        icon: 'bg-white/10 text-white border border-white/10 shadow-[inner_0_0_10px_rgba(255,255,255,0.1)]',
        text: 'text-white',
        title: 'text-green-100',
    },
    warning: {
        bg: 'bg-gradient-to-br from-orange-500/90 to-red-900/90 border-orange-500/20 shadow-[0_0_20px_rgba(249,115,22,0.15)] hover:shadow-[0_0_30px_rgba(249,115,22,0.3)]',
        icon: 'bg-white/10 text-white border border-white/10 shadow-[inner_0_0_10px_rgba(255,255,255,0.1)]',
        text: 'text-white',
        title: 'text-orange-100',
    },
    danger: {
        bg: 'bg-gradient-to-br from-red-600/90 to-rose-900/90 border-red-500/20 shadow-[0_0_20px_rgba(239,68,68,0.15)] hover:shadow-[0_0_30px_rgba(239,68,68,0.3)]',
        icon: 'bg-white/10 text-white border border-white/10 shadow-[inner_0_0_10px_rgba(255,255,255,0.1)]',
        text: 'text-white',
        title: 'text-red-100',
    },
};

export default function MetricCard({
    title,
    value,
    subtitle,
    icon: Icon,
    trend,
    variant = 'default',
    onClick,
}: MetricCardProps) {
    const styles = variantStyles[variant];

    return (
        <div
            className={classNames(
                'rounded-2xl p-6 border backdrop-blur-xl transition-all duration-300 relative overflow-hidden group',
                styles.bg,
                onClick && 'cursor-pointer hover:-translate-y-1'
            )}
            onClick={onClick}
        >
            <div className="flex items-start justify-between">
                <div className="flex-1">
                    <p
                        className={classNames(
                            'text-sm font-semibold tracking-wide uppercase',
                            styles.title
                        )}
                    >
                        {title}
                    </p>
                    <p
                        className={classNames('mt-2 text-3xl font-extrabold tracking-tight drop-shadow-sm', styles.text)}
                        title={String(value)}
                    >
                        {value}
                    </p>
                    {subtitle && (
                        <p
                            className={classNames(
                                'mt-2 text-sm font-medium',
                                styles.title
                            )}
                        >
                            {subtitle}
                        </p>
                    )}
                    {trend && (
                        <div className="mt-3 flex items-center gap-1.5 bg-dark-900/30 w-fit px-2.5 py-1 rounded-lg border border-white/5">
                            <span
                                className={classNames(
                                    'text-xs font-bold flex items-center',
                                    trend.isPositive ? 'text-green-400' : 'text-red-400'
                                )}
                            >
                                {trend.isPositive ? '+' : ''}
                                {trend.value}%
                            </span>
                            <span
                                className={classNames(
                                    'text-xs font-medium opacity-80',
                                    styles.title
                                )}
                            >
                                vs mês anterior
                            </span>
                        </div>
                    )}
                </div>
                <div className={classNames('p-3.5 rounded-2xl relative', styles.icon)}>
                    <Icon className="w-6 h-6 relative z-10" />
                    <div className="absolute inset-0 bg-current opacity-20 blur-xl rounded-full"></div>
                </div>
            </div>
        </div>
    );
}
