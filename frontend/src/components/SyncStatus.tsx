import { useState } from 'react';
import { Cloud, CloudOff, RefreshCw, Check, AlertCircle } from 'lucide-react';
import { useOffline } from '@/contexts/OfflineContext';

export default function SyncStatus() {
    const { isOnline, pendingCount, syncNow } = useOffline();
    const [syncing, setSyncing] = useState(false);
    const [lastSyncResult, setLastSyncResult] = useState<{ synced: number; failed: number } | null>(null);

    const handleSync = async () => {
        setSyncing(true);
        try {
            const result = await syncNow();
            setLastSyncResult(result);
            setTimeout(() => setLastSyncResult(null), 3000);
        } finally {
            setSyncing(false);
        }
    };

    // Don't show if everything is fine
    if (isOnline && pendingCount === 0 && !lastSyncResult) {
        return null;
    }

    return (
        <div className={`fixed bottom-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl shadow-lg transition-all border backdrop-blur-md ${isOnline
            ? 'bg-green-500/10 text-green-400 border-green-500/20 shadow-green-500/10'
            : 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20 shadow-yellow-500/10'
            }`}>
            {/* Status Icon */}
            {isOnline ? (
                <div className="relative flex items-center justify-center p-1">
                    <Cloud className="w-5 h-5 relative z-10 text-green-400" />
                    <div className="absolute inset-0 bg-green-400/20 blur-md rounded-full"></div>
                </div>
            ) : (
                <div className="relative flex items-center justify-center p-1">
                    <CloudOff className="w-5 h-5 relative z-10 text-yellow-500" />
                    <div className="absolute inset-0 bg-yellow-400/20 blur-md rounded-full animate-pulse"></div>
                </div>
            )}

            {/* Status Text */}
            <div className="flex flex-col">
                <span className={`text-sm font-semibold tracking-wide ${isOnline
                    ? 'text-green-400'
                    : 'text-yellow-500'
                    }`}>
                    {isOnline ? 'Conectado' : 'Modo Offline'}
                </span>
                {pendingCount > 0 && (
                    <span className="text-xs text-gray-400 font-medium mt-0.5">
                        {pendingCount} operação(ões) pendente(s)
                    </span>
                )}
                {lastSyncResult && (
                    <span className="text-xs text-primary-400 font-medium mt-0.5">
                        {lastSyncResult.synced} sincronizado(s)
                        {lastSyncResult.failed > 0 && `, ${lastSyncResult.failed} falhou`}
                    </span>
                )}
            </div>

            {/* Sync Button */}
            {pendingCount > 0 && (
                <button
                    onClick={handleSync}
                    disabled={syncing}
                    className={`p-2 rounded-xl transition-all ml-2 border ${syncing
                        ? 'bg-dark-800 border-white/5 text-gray-600 cursor-not-allowed'
                        : 'bg-dark-700/50 hover:bg-white/10 border-white/10 text-gray-300 hover:text-white'
                        }`}
                    title="Sincronizar agora"
                >
                    <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                </button>
            )}

            {/* Success indicator */}
            {lastSyncResult && lastSyncResult.synced > 0 && lastSyncResult.failed === 0 && (
                <Check className="w-5 h-5 text-primary-400 ml-2" />
            )}

            {/* Error indicator */}
            {lastSyncResult && lastSyncResult.failed > 0 && (
                <AlertCircle className="w-5 h-5 text-red-500 ml-2" />
            )}
        </div>
    );
}
