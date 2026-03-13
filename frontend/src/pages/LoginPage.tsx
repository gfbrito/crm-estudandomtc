import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/Toast';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [resetMode, setResetMode] = useState(false);
    const [resetSent, setResetSent] = useState(false);

    const { login } = useAuth();
    const { error } = useToast();
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            await login(email, password);
            navigate('/');
        } catch (err: any) {
            console.error('Auth error:', err);
            error('Erro ao fazer login', err?.message || 'Email ou senha incorretos.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-dark-900 flex items-center justify-center p-4 relative overflow-hidden">
            {/* Background gradient effects */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary-600/10 rounded-full blur-[120px]"></div>
                <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-800/10 rounded-full blur-[100px]"></div>
                <div className="absolute inset-0 opacity-[0.03]"
                    style={{ backgroundImage: 'radial-gradient(circle at 50% 50%, #7C3AED 0%, transparent 50%)', backgroundSize: '100vw 100vh' }}></div>
            </div>

            <div className="w-full max-w-md relative z-10">
                {/* Logo */}
                <div className="text-center mb-10">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-400 to-primary-700 flex items-center justify-center mx-auto mb-5 shadow-lg shadow-primary-500/30 border border-white/10">
                        <span className="text-white font-extrabold text-2xl">C</span>
                    </div>
                    <h1 className="text-4xl font-extrabold bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent tracking-tight">
                        CRM Leads
                    </h1>
                    <p className="mt-2 text-gray-500 font-medium">
                        Gerencie seus leads e vendas de forma inteligente
                    </p>
                </div>

                {/* Card */}
                <div className="glass-card rounded-2xl p-8 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary-600 to-purple-400"></div>

                    <h2 className="text-2xl font-bold text-white mb-6 tracking-tight">
                        {resetMode ? 'Recuperar Senha' : 'Entrar'}
                    </h2>

                    {resetSent ? (
                        <div className="text-center py-8">
                            <div className="w-16 h-16 bg-green-500/10 border border-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4 shadow-[0_0_20px_rgba(34,197,94,0.15)]">
                                <Mail className="w-8 h-8 text-green-400" />
                            </div>
                            <h3 className="text-lg font-semibold text-white mb-2">
                                Email Enviado!
                            </h3>
                            <p className="text-gray-400 mb-6 font-medium">
                                Verifique sua caixa de entrada e siga as instruções para redefinir sua senha.
                            </p>
                            <button
                                onClick={() => {
                                    setResetMode(false);
                                    setResetSent(false);
                                }}
                                className="text-primary-400 hover:text-primary-300 font-semibold transition-colors"
                            >
                                Voltar para o login
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-5">
                            {/* Email */}
                            <div>
                                <label className="block text-sm font-semibold tracking-wide text-gray-300 mb-1.5">
                                    Email
                                </label>
                                <div className="relative group">
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="seu@email.com"
                                        required
                                        className="w-full pl-10 pr-4 py-3 rounded-xl border bg-dark-900/50 border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-4 focus:ring-primary-500/30 focus:border-primary-500/50 hover:border-white/20 transition-all duration-300 font-medium"
                                    />
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-primary-400 transition-colors" />
                                </div>
                            </div>

                            {/* Password */}
                            {!resetMode && (
                                <div>
                                    <label className="block text-sm font-semibold tracking-wide text-gray-300 mb-1.5">
                                        Senha
                                    </label>
                                    <div className="relative group">
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            placeholder="••••••••"
                                            required
                                            className="w-full pl-10 pr-12 py-3 rounded-xl border bg-dark-900/50 border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-4 focus:ring-primary-500/30 focus:border-primary-500/50 hover:border-white/20 transition-all duration-300 font-medium"
                                        />
                                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-primary-400 transition-colors" />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors p-1 rounded-lg hover:bg-white/5"
                                        >
                                            {showPassword ? (
                                                <EyeOff className="w-5 h-5" />
                                            ) : (
                                                <Eye className="w-5 h-5" />
                                            )}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Forgot Password */}
                            {!resetMode && (
                                <div className="text-right">
                                    <button
                                        type="button"
                                        onClick={() => setResetMode(true)}
                                        className="text-sm text-primary-400 hover:text-primary-300 font-semibold transition-colors"
                                    >
                                        Esqueceu a senha?
                                    </button>
                                </div>
                            )}

                            {/* Submit Button */}
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-3 px-4 rounded-xl gradient-btn text-white font-semibold focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-dark-900 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 flex items-center justify-center gap-2"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        {resetMode ? 'Enviando...' : 'Entrando...'}
                                    </>
                                ) : resetMode ? (
                                    'Enviar Email de Recuperação'
                                ) : (
                                    'Entrar'
                                )}
                            </button>

                            {/* Back to Login */}
                            {resetMode && (
                                <button
                                    type="button"
                                    onClick={() => setResetMode(false)}
                                    className="w-full text-center text-sm text-gray-500 hover:text-white transition-colors font-medium"
                                >
                                    ← Voltar para o login
                                </button>
                            )}
                        </form>
                    )}
                </div>

                {/* Footer */}
                <p className="text-center mt-6 text-sm text-gray-600 font-medium">
                    © {new Date().getFullYear()} CRM Leads & Vendas. Todos os direitos reservados.
                </p>
            </div>
        </div>
    );
}
