import { useState, useEffect } from 'react';
import { Select } from './FormFields';
import { startOfDay, endOfDay, subDays, startOfMonth, endOfMonth } from 'date-fns';

export type DateRange = {
    start: Date | null;
    end: Date | null;
};

interface DateRangeFilterProps {
    onChange: (range: DateRange) => void;
    className?: string;
}

const PRESETS = [
    { label: 'Hoje', value: 'today' },
    { label: 'Ontem', value: 'yesterday' },
    { label: 'Últimos 7 dias', value: 'last7' },
    { label: 'Últimos 30 dias', value: 'last30' },
    { label: 'Este Mês', value: 'thisMonth' },
    { label: 'Mês Passado', value: 'lastMonth' },
    { label: 'Todo o Período', value: 'all' },
    { label: 'Personalizado', value: 'custom' },
];

export default function DateRangeFilter({ onChange, className = '' }: DateRangeFilterProps) {
    const [selectedPreset, setSelectedPreset] = useState('last30');
    const [customStart, setCustomStart] = useState('');
    const [customEnd, setCustomEnd] = useState('');

    useEffect(() => {
        const calculateRange = (): DateRange => {
            const now = new Date();
            let start: Date | null = null;
            let end: Date | null = endOfDay(now);

            switch (selectedPreset) {
                case 'today':
                    start = startOfDay(now);
                    break;
                case 'yesterday':
                    const yesterday = subDays(now, 1);
                    start = startOfDay(yesterday);
                    end = endOfDay(yesterday);
                    break;
                case 'last7':
                    start = startOfDay(subDays(now, 7));
                    break;
                case 'last30':
                    start = startOfDay(subDays(now, 30));
                    break;
                case 'thisMonth':
                    start = startOfMonth(now);
                    end = endOfMonth(now);
                    break;
                case 'lastMonth':
                    const lastMonth = subDays(startOfMonth(now), 1);
                    start = startOfMonth(lastMonth);
                    end = endOfMonth(lastMonth);
                    break;
                case 'all':
                    start = null;
                    end = null;
                    break;
                case 'custom':
                    if (customStart) start = startOfDay(new Date(customStart));
                    if (customEnd) end = endOfDay(new Date(customEnd));
                    break;
            }
            return { start, end };
        };

        const range = calculateRange();
        onChange(range);
    }, [selectedPreset, customStart, customEnd]);

    return (
        <div className={`flex flex-col sm:flex-row gap-3 ${className}`}>
            <div className="w-full sm:w-48">
                <Select
                    label="Período"
                    value={selectedPreset}
                    onChange={(e) => setSelectedPreset(e.target.value)}
                    options={PRESETS.map(p => ({ value: p.value, label: p.label }))}
                />
            </div>

            {selectedPreset === 'custom' && (
                <div className="flex gap-2 items-end">
                    <div>
                        <label className="block text-xs font-semibold tracking-wide text-gray-300 mb-1.5">Início</label>
                        <input
                            type="date"
                            value={customStart}
                            onChange={(e) => setCustomStart(e.target.value)}
                            className="block w-full rounded-xl border border-white/10 bg-dark-900/50 text-white text-sm px-4 py-2.5 focus:outline-none focus:ring-4 focus:ring-primary-500/30 focus:border-primary-500/50 hover:border-white/20 transition-all duration-300 font-medium"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold tracking-wide text-gray-300 mb-1.5">Fim</label>
                        <input
                            type="date"
                            value={customEnd}
                            onChange={(e) => setCustomEnd(e.target.value)}
                            className="block w-full rounded-xl border border-white/10 bg-dark-900/50 text-white text-sm px-4 py-2.5 focus:outline-none focus:ring-4 focus:ring-primary-500/30 focus:border-primary-500/50 hover:border-white/20 transition-all duration-300 font-medium"
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
