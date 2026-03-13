import { Temperature } from '@/types';
import { getTemperatureLabel, classNames } from '@/utils/formatters';

interface TemperatureBadgeProps {
    temperature: Temperature;
    size?: 'sm' | 'md' | 'lg';
    showLabel?: boolean;
}

const sizeStyles = {
    sm: 'px-2 py-1 text-[10px]',
    md: 'px-2.5 py-1 text-xs',
    lg: 'px-3 py-1.5 text-sm',
};

const temperatureStyles: Record<Temperature, string> = {
    hot: 'bg-red-500/10 text-red-500 border border-red-500/20 shadow-[0_0_10px_rgba(239,68,68,0.2)]',
    warm: 'bg-orange-500/10 text-orange-400 border border-orange-500/20 shadow-[0_0_10px_rgba(249,115,22,0.2)]',
    cold: 'bg-blue-500/10 text-blue-400 border border-blue-500/20 shadow-[0_0_10px_rgba(59,130,246,0.2)]',
    inactive: 'bg-gray-500/10 text-gray-400 border border-gray-500/20',
};

export default function TemperatureBadge({
    temperature,
    size = 'md',
    showLabel = true,
}: TemperatureBadgeProps) {
    const label = getTemperatureLabel(temperature);
    const emoji = label.split(' ')[0];
    const text = label.split(' ').slice(1).join(' ');

    return (
        <span
            className={classNames(
                'inline-flex items-center gap-1.5 font-semibold rounded-full whitespace-nowrap backdrop-blur-sm',
                sizeStyles[size],
                temperatureStyles[temperature]
            )}
        >
            <span className="text-[1.1em]">{emoji}</span>
            {showLabel && <span>{text}</span>}
        </span>
    );
}
