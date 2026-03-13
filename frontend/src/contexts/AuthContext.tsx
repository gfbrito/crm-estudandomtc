import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api } from '@/config/api';
import { User, UserRole } from '@/types';

interface AuthContextType {
    user: User | null;
    loading: boolean;
    login: (email: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
    isAuthenticated: boolean;
    isMaster: boolean;
    isViewer: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}

interface AuthProviderProps {
    children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let mounted = true;

        const initAuth = async () => {
            const token = localStorage.getItem('auth_token');
            if (!token) {
                if (mounted) setLoading(false);
                return;
            }

            try {
                const data = await api.get('/api/auth/me');
                if (mounted) {
                    setUser({
                        id: data.id,
                        email: data.email,
                        name: data.name,
                        role: data.role as UserRole,
                        createdAt: new Date(data.createdAt),
                    });
                }
            } catch (error) {
                console.error('Auth init error:', error);
                api.clearToken();
                if (mounted) setUser(null);
            } finally {
                if (mounted) setLoading(false);
            }
        };

        initAuth();

        return () => { mounted = false; };
    }, []);

    const login = async (email: string, password: string) => {
        const data = await api.post('/api/auth/login', { email, password });
        api.setToken(data.token);
        setUser({
            id: data.user.id,
            email: data.user.email,
            name: data.user.name,
            role: data.user.role as UserRole,
            createdAt: new Date(data.user.createdAt),
        });
    };

    const logout = async () => {
        api.clearToken();
        setUser(null);
    };

    const value: AuthContextType = {
        user,
        loading,
        login,
        logout,
        isAuthenticated: !!user,
        isMaster: user?.role === 'master',
        isViewer: user?.role === 'viewer',
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}
