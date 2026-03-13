import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

interface OfflineContextType {
    isOnline: boolean;
    pendingCount: number;
    syncNow: () => Promise<{ synced: number; failed: number }>;
}

const OfflineContext = createContext<OfflineContextType | null>(null);

export function OfflineProvider({ children }: { children: ReactNode }) {
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    // @ts-ignore
    const [pendingCount, setPendingCount] = useState(0);

    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    // Placeholder sync function since we removed custom offline logic for now
    // Supabase handles some offline capabilities but this context was specific to the old implementation
    const syncNow = useCallback(async () => {
        return { synced: 0, failed: 0 };
    }, []);

    return (
        <OfflineContext.Provider value={{ isOnline, pendingCount, syncNow }}>
            {children}
        </OfflineContext.Provider>
    );
}

export function useOffline() {
    const context = useContext(OfflineContext);
    if (!context) {
        throw new Error('useOffline must be used within OfflineProvider');
    }
    return context;
}
