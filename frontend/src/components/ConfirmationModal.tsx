import { X, AlertTriangle } from 'lucide-react';
import { useEffect, useRef } from 'react';

interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'danger' | 'warning' | 'info';
    loading?: boolean;
}

export default function ConfirmationModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = 'Confirmar',
    cancelText = 'Cancelar',
    variant = 'danger',
    loading = false,
}: ConfirmationModalProps) {
    const modalRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };

        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
            document.body.style.overflow = 'hidden';
        }

        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = 'unset';
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const colors = {
        danger: {
            icon: 'bg-red-500/10 text-red-500 border border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.2)]',
            button: 'bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white hover:shadow-[0_0_15px_rgba(239,68,68,0.5)]',
        },
        warning: {
            icon: 'bg-orange-500/10 text-orange-500 border border-orange-500/20 shadow-[0_0_15px_rgba(249,115,22,0.2)]',
            button: 'bg-orange-500/10 border border-orange-500/20 text-orange-400 hover:bg-orange-500 hover:text-white hover:shadow-[0_0_15px_rgba(249,115,22,0.5)]',
        },
        info: {
            icon: 'bg-primary-500/10 text-primary-400 border border-primary-500/20 shadow-[0_0_15px_rgba(124,58,237,0.2)]',
            button: 'gradient-btn text-white shadow-lg shadow-primary-500/20',
        },
    };

    const variantStyles = colors[variant];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark-900/80 backdrop-blur-md animate-in fade-in duration-300">
            <div
                ref={modalRef}
                className="glass-card w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-300"
                role="dialog"
                aria-modal="true"
            >
                <div className="p-6">
                    <div className="flex items-start gap-4">
                        <div className={`p-3.5 rounded-2xl shrink-0 ${variantStyles.icon}`}>
                            <AlertTriangle className="w-7 h-7" />
                        </div>
                        <div className="flex-1 mt-1">
                            <h3 className="text-xl font-bold text-white mb-2 tracking-tight">
                                {title}
                            </h3>
                            <p className="text-gray-400 leading-relaxed text-sm">
                                {message}
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-gray-500 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors absolute top-4 right-4"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="mt-8 flex justify-end gap-3 pt-6 border-t border-white/5">
                        <button
                            onClick={onClose}
                            disabled={loading}
                            className="px-5 py-2.5 text-sm font-medium text-gray-300 bg-dark-700/50 hover:bg-white/10 border border-white/5 rounded-xl transition-all disabled:opacity-50"
                        >
                            {cancelText}
                        </button>
                        <button
                            onClick={onConfirm}
                            disabled={loading}
                            className={`px-5 py-2.5 text-sm font-semibold rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 hover:-translate-y-0.5 active:translate-y-0 ${variantStyles.button}`}
                        >
                            {loading && (
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            )}
                            {confirmText}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
