import { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { classNames } from '@/utils/formatters';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
    id: string;
    type: ToastType;
    title: string;
    message?: string;
}

interface ToastContextType {
    toasts: Toast[];
    addToast: (type: ToastType, title: string, message?: string) => void;
    removeToast: (id: string) => void;
    success: (title: string, message?: string) => void;
    error: (title: string, message?: string) => void;
    info: (title: string, message?: string) => void;
    warning: (title: string, message?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
}

interface ToastProviderProps {
    children: ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const removeToast = useCallback((id: string) => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, []);

    const addToast = useCallback((type: ToastType, title: string, message?: string) => {
        const id = Math.random().toString(36).substring(2);
        setToasts((prev) => [...prev, { id, type, title, message }]);

        // Auto remove after 5 seconds
        setTimeout(() => {
            removeToast(id);
        }, 5000);
    }, [removeToast]);

    const value: ToastContextType = {
        toasts,
        addToast,
        removeToast,
        success: (title, message) => addToast('success', title, message),
        error: (title, message) => addToast('error', title, message),
        info: (title, message) => addToast('info', title, message),
        warning: (title, message) => addToast('warning', title, message),
    };

    return (
        <ToastContext.Provider value={value}>
            {children}
            <ToastContainer toasts={toasts} onRemove={removeToast} />
        </ToastContext.Provider>
    );
}

interface ToastContainerProps {
    toasts: Toast[];
    onRemove: (id: string) => void;
}

const toastStyles: Record<ToastType, { bg: string; icon: typeof CheckCircle }> = {
    success: { bg: 'bg-green-500/10 border-green-500/20 shadow-[0_0_15px_rgba(34,197,94,0.15)]', icon: CheckCircle },
    error: { bg: 'bg-red-500/10 border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.15)]', icon: AlertCircle },
    info: { bg: 'bg-blue-500/10 border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.15)]', icon: Info },
    warning: { bg: 'bg-orange-500/10 border-orange-500/20 shadow-[0_0_15px_rgba(249,115,22,0.15)]', icon: AlertTriangle },
};

const iconColors: Record<ToastType, string> = {
    success: 'text-green-400',
    error: 'text-red-500',
    info: 'text-blue-400',
    warning: 'text-orange-400',
};

function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
    return (
        <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
            {toasts.map((toast) => {
                const { bg, icon: Icon } = toastStyles[toast.type];
                return (
                    <div
                        key={toast.id}
                        className={classNames(
                            'flex items-start gap-3 p-4 rounded-2xl border backdrop-blur-md animate-slide-in min-w-[300px] max-w-md',
                            bg
                        )}
                    >
                        <div className="relative flex items-center justify-center">
                            <Icon className={classNames('w-5 h-5 flex-shrink-0 mt-0.5 relative z-10', iconColors[toast.type])} />
                            <div className={classNames("absolute inset-0 blur-md rounded-full mt-0.5", iconColors[toast.type].replace('text-', 'bg-'))}></div>
                        </div>
                        <div className="flex-1 min-w-0 pt-0.5">
                            <p className="font-semibold tracking-wide text-white text-sm">{toast.title}</p>
                            {toast.message && (
                                <p className="mt-1 text-sm text-gray-400 font-medium">{toast.message}</p>
                            )}
                        </div>
                        <button
                            onClick={() => onRemove(toast.id)}
                            className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                        >
                            <X className="w-4 h-4 text-gray-500 hover:text-white" />
                        </button>
                    </div>
                );
            })}
        </div>
    );
}
