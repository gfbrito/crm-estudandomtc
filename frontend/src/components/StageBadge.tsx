import { LeadStage } from '@/types';
import { getStageLabel, getStageColor, classNames } from '@/utils/formatters';

interface StageBadgeProps {
    stage: LeadStage;
    size?: 'sm' | 'md' | 'lg';
}

const sizeStyles = {
    sm: 'px-2 py-1 text-[10px]',
    md: 'px-2.5 py-1 text-xs',
    lg: 'px-3 py-1.5 text-sm',
};

export default function StageBadge({ stage, size = 'md' }: StageBadgeProps) {
    return (
        <span
            className={classNames(
                'inline-flex items-center gap-1.5 font-semibold rounded-full whitespace-nowrap border',
                sizeStyles[size],
                getStageColor(stage)
            )}
        >
            <span className="w-1.5 h-1.5 rounded-full bg-current glow-dot shadow-[0_0_8px_currentColor]"></span>
            {getStageLabel(stage)}
        </span>
    );
}
