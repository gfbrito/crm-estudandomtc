import { useState, useMemo } from 'react';
import {
    ChevronUp,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    Search,
    Download,
} from 'lucide-react';
import { classNames } from '@/utils/formatters';

interface Column<T> {
    key: string;
    header: string;
    sortable?: boolean;
    width?: string;
    render?: (item: T) => React.ReactNode;
}

interface DataTableProps<T> {
    data: T[];
    columns: Column<T>[];
    keyField: keyof T;
    loading?: boolean;
    searchable?: boolean;
    searchPlaceholder?: string;
    exportable?: boolean;
    onExport?: () => void;
    actions?: (item: T) => React.ReactNode;
    emptyMessage?: string;
    pagination?: {
        page: number;
        pageSize: number;
        total: number;
        onPageChange: (page: number) => void;
    };
    onSort?: (key: string, direction: 'asc' | 'desc') => void;
    serverSortKey?: string;
    serverSortOrder?: 'asc' | 'desc';
}

export default function DataTable<T>({
    data,
    columns,
    keyField,
    loading = false,
    searchable = false,
    searchPlaceholder = 'Buscar...',
    exportable = false,
    onExport,
    actions,
    emptyMessage = 'Nenhum registro encontrado',
    pagination,
    onSort: onSortCallback,
    serverSortKey,
    serverSortOrder,
}: DataTableProps<T>) {
    const [searchQuery, setSearchQuery] = useState('');
    const [sortKey, setSortKey] = useState<string | null>(null);
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

    const handleSort = (key: string) => {
        if (onSortCallback) {
            // Server-side sort
            const currentKey = serverSortKey || sortKey;
            const currentOrder = serverSortOrder || sortOrder;
            const newOrder = currentKey === key && currentOrder === 'asc' ? 'desc' : 'asc';
            setSortKey(key);
            setSortOrder(newOrder);
            onSortCallback(key, newOrder);
        } else {
            // Client-side sort
            if (sortKey === key) {
                setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
            } else {
                setSortKey(key);
                setSortOrder('asc');
            }
        }
    };

    const filteredData = useMemo(() => {
        if (!searchQuery.trim()) return data;

        const query = searchQuery.toLowerCase();
        return data.filter((item) =>
            columns.some((col) => {
                const value = (item as Record<string, unknown>)[col.key];
                return String(value).toLowerCase().includes(query);
            })
        );
    }, [data, searchQuery, columns]);

    const sortedData = useMemo(() => {
        if (!sortKey) return filteredData;

        return [...filteredData].sort((a, b) => {
            const aValue = (a as Record<string, unknown>)[sortKey];
            const bValue = (b as Record<string, unknown>)[sortKey];

            if (aValue === bValue) return 0;
            if (aValue === null || aValue === undefined) return 1;
            if (bValue === null || bValue === undefined) return -1;

            const comparison = aValue < bValue ? -1 : 1;
            return sortOrder === 'asc' ? comparison : -comparison;
        });
    }, [filteredData, sortKey, sortOrder]);

    const totalPages = pagination
        ? Math.ceil(pagination.total / pagination.pageSize)
        : 1;

    return (
        <div className="glass-card overflow-hidden">
            {/* Header */}
            {(searchable || exportable) && (
                <div className="p-4 border-b border-light-divider flex flex-col sm:flex-row items-center justify-between gap-4 bg-dark-800/20">
                    {searchable && (
                        <div className="relative flex-1 w-full max-w-md group">
                            <input
                                type="text"
                                placeholder={searchPlaceholder}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-dark-900/50 border border-white/5 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500/50 transition-all font-medium"
                            />
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-primary-400 transition-colors" />
                        </div>
                    )}
                    {exportable && onExport && (
                        <button
                            onClick={onExport}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-dark-700/50 border border-white/5 text-gray-300 hover:bg-white/10 hover:text-white transition-all text-sm font-semibold hover:-translate-y-0.5"
                        >
                            <Download className="w-4 h-4" />
                            Exportar
                        </button>
                    )}
                </div>
            )}

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-dark-800/40 border-b border-light-divider">
                        <tr>
                            {columns.map((column) => (
                                <th
                                    key={column.key}
                                    className={classNames(
                                        'px-5 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider',
                                        column.sortable && 'cursor-pointer hover:bg-white/5 hover:text-white transition-colors',
                                        column.width
                                    )}
                                    onClick={() => column.sortable && handleSort(column.key)}
                                >
                                    <div className="flex items-center gap-2">
                                        {column.header}
                                        {column.sortable && (serverSortKey || sortKey) === column.key && (
                                            (serverSortOrder || sortOrder) === 'asc' ? (
                                                <ChevronUp className="w-3.5 h-3.5 text-primary-400" />
                                            ) : (
                                                <ChevronDown className="w-3.5 h-3.5 text-primary-400" />
                                            )
                                        )}
                                    </div>
                                </th>
                            ))}
                            {actions && (
                                <th className="px-5 py-4 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                    Ações
                                </th>
                            )}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {loading ? (
                            [...Array(5)].map((_, i) => (
                                <tr key={i} className="hover:bg-white/[0.02]">
                                    {columns.map((col) => (
                                        <td key={col.key} className="px-5 py-5">
                                            <div className="h-4 bg-dark-700/50 rounded animate-pulse" />
                                        </td>
                                    ))}
                                    {actions && (
                                        <td className="px-5 py-5">
                                            <div className="h-4 w-20 bg-dark-700/50 rounded animate-pulse ml-auto" />
                                        </td>
                                    )}
                                </tr>
                            ))
                        ) : sortedData.length === 0 ? (
                            <tr>
                                <td
                                    colSpan={columns.length + (actions ? 1 : 0)}
                                    className="px-5 py-24 text-center"
                                >
                                    <div className="flex flex-col items-center justify-center space-y-4">
                                        <div className="w-16 h-16 rounded-full bg-dark-800 flex items-center justify-center border border-white/5 shadow-2xl relative">
                                            <Search className="w-8 h-8 text-gray-400 relative z-10" />
                                            <div className="absolute inset-0 bg-primary-500/10 rounded-full blur-md"></div>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-gray-300 font-medium">{emptyMessage}</p>
                                            <p className="text-sm text-gray-500">Tente ajustar seus filtros de busca</p>
                                        </div>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            sortedData.map((item) => (
                                <tr
                                    key={String((item as Record<string, unknown>)[keyField as string])}
                                    className="hover:bg-white/[0.02] hover-accent transition-colors group"
                                >
                                    {columns.map((column) => (
                                        <td
                                            key={column.key}
                                            className="px-5 py-4 text-sm text-gray-200"
                                        >
                                            {column.render
                                                ? column.render(item)
                                                : String((item as Record<string, unknown>)[column.key] ?? '-')}
                                        </td>
                                    ))}
                                    {actions && (
                                        <td className="px-5 py-4 text-right">
                                            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex justify-end">
                                                {actions(item)}
                                            </div>
                                        </td>
                                    )}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {pagination && totalPages > 1 && (
                <div className="px-5 py-4 border-t border-light-divider flex flex-col sm:flex-row items-center justify-between gap-4 bg-dark-800/20">
                    <p className="text-sm text-gray-400 font-medium">
                        Mostrando <span className="text-gray-200">{(pagination.page - 1) * pagination.pageSize + 1}</span> a{' '}
                        <span className="text-gray-200">{Math.min(pagination.page * pagination.pageSize, pagination.total)}</span> de{' '}
                        <span className="text-gray-200">{pagination.total}</span> resultados
                    </p>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => pagination.onPageChange(pagination.page - 1)}
                            disabled={pagination.page === 1}
                            className="p-2 rounded-lg bg-dark-700/50 border border-white/5 text-gray-300 hover:bg-white/10 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <span className="text-sm font-semibold text-gray-300 px-2 group">
                            Página <span className="text-white group-hover:text-primary-400 transition-colors">{pagination.page}</span> de {totalPages}
                        </span>
                        <button
                            onClick={() => pagination.onPageChange(pagination.page + 1)}
                            disabled={pagination.page === totalPages}
                            className="p-2 rounded-lg bg-dark-700/50 border border-white/5 text-gray-300 hover:bg-white/10 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
