import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '@/config/api';
import Button from '@/components/Button';
import { AlertTriangle, CheckCircle } from 'lucide-react';

export default function OptOutPage() {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');
    const [status, setStatus] = useState<'loading' | 'confirm' | 'success' | 'error'>('loading');
    const [subscription, setSubscription] = useState<any>(null);

    useEffect(() => {
        if (token) {
            checkToken();
        } else {
            setStatus('error');
        }
    }, [token]);

    const checkToken = async () => {
        try {
            const data = await api.get(`/api/subscriptions/by-token/${token}`);

            if (!data) {
                setStatus('error');
            } else {
                // The backend endpoint `/api/subscriptions/by-token/:token` returns sub along with products
                setSubscription(data);
                setStatus('confirm');
            }
        } catch (e) {
            setStatus('error');
        }
    };

    const handleOptOut = async () => {
        try {
            await api.post('/api/subscriptions/opt-out', {
                token: token,
                reason: 'Opt-out via link de cancelamento'
            });

            setStatus('success');
        } catch (e) {
            console.error(e);
            alert('Erro ao realizar opt-out. Tente novamente.');
        }
    };

    if (status === 'loading') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-dark-900">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-400"></div>
            </div>
        );
    }

    if (status === 'error') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-dark-900 p-4 relative overflow-hidden">
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
                    style={{ backgroundImage: 'radial-gradient(circle at 50% 50%, #7C3AED 0%, transparent 50%)', backgroundSize: '100vw 100vh' }}></div>
                <div className="glass-card p-8 rounded-2xl max-w-md w-full text-center relative z-10">
                    <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4 shadow-[0_0_20px_rgba(239,68,68,0.15)]">
                        <AlertTriangle className="w-8 h-8 text-red-500" />
                    </div>
                    <h1 className="text-xl font-bold text-white mb-2 tracking-tight">Link Inválido</h1>
                    <p className="text-gray-400 font-medium">Este link de cancelamento é inválido ou expirou.</p>
                </div>
            </div>
        );
    }

    if (status === 'success') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-dark-900 p-4 relative overflow-hidden">
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
                    style={{ backgroundImage: 'radial-gradient(circle at 50% 50%, #7C3AED 0%, transparent 50%)', backgroundSize: '100vw 100vh' }}></div>
                <div className="glass-card p-8 rounded-2xl max-w-md w-full text-center relative z-10">
                    <div className="w-16 h-16 bg-green-500/10 border border-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4 shadow-[0_0_20px_rgba(34,197,94,0.15)]">
                        <CheckCircle className="w-8 h-8 text-green-400" />
                    </div>
                    <h1 className="text-xl font-bold text-white mb-2 tracking-tight">Cancelamento Confirmado</h1>
                    <p className="text-gray-400 font-medium">Você não receberá mais lembretes sobre a renovação de <strong className="text-white">{subscription?.product?.name}</strong>.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-dark-900 p-4 relative overflow-hidden">
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
                style={{ backgroundImage: 'radial-gradient(circle at 50% 50%, #7C3AED 0%, transparent 50%)', backgroundSize: '100vw 100vh' }}></div>
            <div className="glass-card p-8 rounded-2xl max-w-md w-full text-center relative z-10">
                <div className="w-16 h-16 bg-yellow-500/10 border border-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_20px_rgba(234,179,8,0.15)]">
                    <AlertTriangle className="w-8 h-8 text-yellow-400" />
                </div>

                <h1 className="text-xl font-bold text-white mb-2 tracking-tight">Cancelar Lembretes?</h1>
                <p className="text-gray-400 mb-6 font-medium">
                    Olá {subscription?.lead?.name}, você deseja parar de receber mensagens automáticas sobre a renovação de <strong className="text-white">{subscription?.product?.name}</strong>?
                </p>

                <div className="space-y-3">
                    <Button onClick={handleOptOut} className="w-full bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white hover:shadow-[0_0_15px_rgba(239,68,68,0.5)] transition-all">
                        Sim, cancelar lembretes
                    </Button>
                    <p className="text-xs text-gray-500 font-medium">
                        Isso não cancela sua assinatura, apenas as notificações de renovação.
                    </p>
                </div>
            </div>
        </div>
    );
}
