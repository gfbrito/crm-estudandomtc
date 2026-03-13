import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { OfflineProvider } from '@/contexts/OfflineContext';
import { ToastProvider } from '@/components/Toast';
import SyncStatus from '@/components/SyncStatus';
import Loading from '@/components/Loading';
import MainLayout from '@/layouts/MainLayout';
import LoginPage from '@/pages/LoginPage';
import DashboardPage from '@/pages/DashboardPage';
import LeadsPage from '@/pages/LeadsPage';
import LeadDetailPage from '@/pages/LeadDetailPage';
import ProductsPage from '@/pages/ProductsPage';
import SalesPage from '@/pages/SalesPage';
import RecoveryPage from '@/pages/RecoveryPage';
import ImportPage from '@/pages/ImportPage';
import NotificationsPage from '@/pages/NotificationsPage';
import SettingsPage from '@/pages/SettingsPage';
import MassMessagingPage from '@/pages/MassMessagingPage';
import SubscriptionSettingsPage from '@/pages/SubscriptionSettingsPage';
import OptOutPage from '@/pages/OptOutPage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
    const { isAuthenticated, loading } = useAuth();

    if (loading) {
        return <Loading fullScreen text="Carregando..." />;
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    return <>{children}</>;
}

function AppRoutes() {
    const { isAuthenticated, loading } = useAuth();

    if (loading) {
        return <Loading fullScreen text="Carregando..." />;
    }

    return (
        <Routes>
            <Route path="/login" element={isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />} />
            <Route path="/unsubscribe" element={<OptOutPage />} />
            <Route path="/" element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
                <Route index element={<DashboardPage />} />
                <Route path="leads" element={<LeadsPage />} />
                <Route path="leads/:id" element={<LeadDetailPage />} />
                <Route path="products" element={<ProductsPage />} />
                <Route path="sales" element={<SalesPage />} />
                <Route path="recovery" element={<RecoveryPage />} />
                <Route path="mass-messaging" element={<MassMessagingPage />} />
                <Route path="import" element={<ImportPage />} />
                <Route path="notifications" element={<NotificationsPage />} />
                <Route path="settings" element={<SettingsPage />} />
                <Route path="subscription-settings" element={<SubscriptionSettingsPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
}

export default function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <OfflineProvider>
                    <ToastProvider>
                        <AppRoutes />
                        <SyncStatus />
                    </ToastProvider>
                </OfflineProvider>
            </AuthProvider>
        </BrowserRouter>
    );
}

