import { useState, useEffect } from 'react';
import { Users, Calculator, Thermometer, Webhook, Save, Plus, Trash2, RefreshCw, MessageCircle, Wifi, WifiOff, Send, QrCode, AlertCircle, Clock } from 'lucide-react';
import { api } from '@/config/api';
import Button from '@/components/Button';
import Modal from '@/components/Modal';
import { Input, Select } from '@/components/FormFields';
import { useToast } from '@/components/Toast';
import { useAuth } from '@/contexts/AuthContext';
import { User } from '@/types';

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3001/api').replace(/\/$/, '');

const tabs = [
    { id: 'users', label: 'Usuários', icon: Users },
    { id: 'whatsapp', label: 'WhatsApp', icon: MessageCircle },
    { id: 'points', label: 'Pontuação', icon: Calculator },
    { id: 'temperature', label: 'Temperatura', icon: Thermometer },
    { id: 'webhooks', label: 'Webhooks', icon: Webhook },
];

export default function SettingsPage() {
    const [activeTab, setActiveTab] = useState('users');
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [showUserModal, setShowUserModal] = useState(false);
    const [userForm, setUserForm] = useState({ email: '', name: '', role: 'viewer' as 'master' | 'viewer' });
    const { success, error } = useToast();
    const { isMaster } = useAuth();

    // Settings state
    const [pointSettings, setPointSettings] = useState({
        tier1: '10', tier2: '25', tier3: '50', tier4: '100', tier5: '200',
        recurrenceBonus: '50', monthlyDecay: '10', decayInterval: '30'
    });
    const [tempSettings, setTempSettings] = useState({
        hotDays: '30', hotPoints: '200', warmDays: '90', warmPoints: '50'
    });

    // Evolution API state
    const [evolutionConfig, setEvolutionConfig] = useState({
        apiUrl: '',
        apiKey: '',
        instanceName: '',
    });
    const [evolutionStatus, setEvolutionStatus] = useState<{
        connected: boolean;
        state?: string;
        error?: string;
        checking: boolean;
    }>({ connected: false, checking: false });
    const [qrCode, setQrCode] = useState<string | null>(null);
    const [loadingQr, setLoadingQr] = useState(false);
    const [testPhone, setTestPhone] = useState('');
    const [testMessage, setTestMessage] = useState('Olá! Esta é uma mensagem de teste do CRM.');
    const [sendingTest, setSendingTest] = useState(false);
    const [savingConfig, setSavingConfig] = useState(false);

    // Message Delay Settings
    const [delaySettings, setDelaySettings] = useState({
        minDelay: '3',
        maxDelay: '7',
        enabled: true,
    });
    const [savingDelay, setSavingDelay] = useState(false);

    // Send Window Settings
    const [sendWindowSettings, setSendWindowSettings] = useState({
        enabled: false,
        startHour: '8',
        endHour: '20',
    });
    const [savingSendWindow, setSavingSendWindow] = useState(false);

    // Webhook State
    const [webhookMappings, setWebhookMappings] = useState<any[]>([]);
    const [showWebhookModal, setShowWebhookModal] = useState(false);
    const [webhookForm, setWebhookForm] = useState({
        id: '',
        origin_name: '',
        field_mappings: {
            email: 'email',
            name: 'name',
            phone: 'phone',
            product: 'product',
            amount: 'amount',
            status: 'status',
            transactionId: 'transaction_id'
        },
        status_mappings: {
            approved: '',
            refunded: '',
            cancelled: '',
            chargeback: ''
        }
    });
    const [savingWebhook, setSavingWebhook] = useState(false);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const data = await api.get('/api/auth/users');

            const usersData: User[] = (data || []).map((doc: any) => ({
                id: doc.id,
                email: doc.email || '',
                name: doc.name || 'Usuário',
                role: doc.role || 'viewer',
                createdAt: doc.created_at ? new Date(doc.created_at) : new Date(),
            }));
            setUsers(usersData);
        } catch (err) {
            console.error('Error fetching users:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchSettings = async () => {
        try {
            const data = await api.get('/api/settings');
            
            if (data) {
                if (data.points) setPointSettings(prev => ({ ...prev, ...data.points }));
                if (data.temperature) setTempSettings(prev => ({ ...prev, ...data.temperature }));
                if (data.evolution) {
                    setEvolutionConfig({
                        apiUrl: data.evolution.apiUrl || '',
                        apiKey: data.evolution.apiKey || '',
                        instanceName: data.evolution.instanceName || '',
                    });
                }
                if (data.messageDelay) {
                    setDelaySettings({
                        minDelay: data.messageDelay.minDelay?.toString() || '3',
                        maxDelay: data.messageDelay.maxDelay?.toString() || '7',
                        enabled: data.messageDelay.enabled !== false,
                    });
                }
                if (data.sendWindow) {
                    setSendWindowSettings({
                        enabled: data.sendWindow.enabled || false,
                        startHour: data.sendWindow.startHour?.toString() || '8',
                        endHour: data.sendWindow.endHour?.toString() || '20',
                    });
                }
            }
        } catch (err: any) {
            console.error('Error fetching settings from API:', err);
        }
    };

    const fetchWebhooks = async () => {
        try {
            const data = await api.get('/api/settings/webhook-mappings/all');
            setWebhookMappings(data || []);
        } catch (err) {
            console.error('Error fetching webhooks:', err);
        }
    };

    const checkEvolutionStatus = async () => {
        setEvolutionStatus(prev => ({ ...prev, checking: true }));
        try {
            const headers: Record<string, string> = {};
            if (evolutionConfig.apiUrl) headers['x-evolution-api-url'] = evolutionConfig.apiUrl;
            if (evolutionConfig.apiKey) headers['x-evolution-api-key'] = evolutionConfig.apiKey;
            if (evolutionConfig.instanceName) headers['x-evolution-instance-name'] = evolutionConfig.instanceName;

            const response = await fetch(`${API_URL}/evolution/status`, { headers });
            const data = await response.json();
            setEvolutionStatus({
                connected: data.connected,
                state: data.state,
                error: data.error,
                checking: false,
            });
        } catch (err) {
            setEvolutionStatus({ connected: false, error: 'Erro ao verificar status', checking: false });
        }
    };

    const fetchQRCode = async () => {
        setLoadingQr(true);
        setQrCode(null);
        try {
            const headers: Record<string, string> = {};
            if (evolutionConfig.apiUrl) headers['x-evolution-api-url'] = evolutionConfig.apiUrl;
            if (evolutionConfig.apiKey) headers['x-evolution-api-key'] = evolutionConfig.apiKey;
            if (evolutionConfig.instanceName) headers['x-evolution-instance-name'] = evolutionConfig.instanceName;

            const response = await fetch(`${API_URL}/evolution/qrcode`, { headers });
            const data = await response.json();
            if (data.qrcode) {
                setQrCode(data.qrcode);
            } else {
                error('Erro', data.error || 'Não foi possível obter QR Code');
            }
        } catch (err) {
            error('Erro', 'Não foi possível obter QR Code');
        } finally {
            setLoadingQr(false);
        }
    };

    const saveEvolutionConfig = async () => {
        if (!evolutionConfig.apiUrl || !evolutionConfig.apiKey || !evolutionConfig.instanceName) {
            error('Erro', 'Preencha todos os campos');
            return;
        }
        setSavingConfig(true);



        try {
            // Try to save via backend API (which helps if DB is later fixed)
            const response = await fetch(`${API_URL}/evolution/config`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(evolutionConfig),
            });
            const data = await response.json();

            if (data.success) {
                success('Salvo', 'Configuração da Evolution API salva com sucesso');
                checkEvolutionStatus();
            } else {
                error('Erro', data.error || 'Erro ao salvar configuração no banco de dados.');
            }
        } catch (err: any) {
            console.error('Error saving config:', err);
            error('Erro', 'Servidor indisponível ou erro ao salvar.');
        } finally {
            setSavingConfig(false);
        }
    };

    const sendTestMessage = async () => {
        if (!testPhone) {
            error('Erro', 'Digite um número de telefone');
            return;
        }
        setSendingTest(true);
        try {
            const headers: Record<string, string> = { 'Content-Type': 'application/json' };
            if (evolutionConfig.apiUrl) headers['x-evolution-api-url'] = evolutionConfig.apiUrl;
            if (evolutionConfig.apiKey) headers['x-evolution-api-key'] = evolutionConfig.apiKey;
            if (evolutionConfig.instanceName) headers['x-evolution-instance-name'] = evolutionConfig.instanceName;

            const response = await fetch(`${API_URL}/evolution/test`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ phone: testPhone, message: testMessage }),
            });
            const data = await response.json();
            if (data.success) {
                success('Enviado', 'Mensagem de teste enviada com sucesso!');
            } else {
                error('Erro', data.error || 'Não foi possível enviar a mensagem');
            }
        } catch (err) {
            error('Erro', 'Não foi possível enviar a mensagem');
        } finally {
            setSendingTest(false);
        }
    };

    useEffect(() => {
        fetchUsers();
        fetchSettings();
        fetchWebhooks();
    }, []);

    useEffect(() => {
        if (activeTab === 'whatsapp' && evolutionConfig.apiUrl && evolutionConfig.apiKey) {
            checkEvolutionStatus();
        }
    }, [activeTab, evolutionConfig.apiUrl, evolutionConfig.apiKey]);

    const handleAddUser = async () => {
        if (!userForm.email || !userForm.name) {
            error('Erro', 'Preencha todos os campos.');
            return;
        }
        const password = prompt('Digite a senha para o novo usuário:');
        if (!password) {
            error('Erro', 'Senha é obrigatória.');
            return;
        }
        
        try {
            await api.post('/api/auth/register', {
                email: userForm.email,
                name: userForm.name,
                password,
                role: userForm.role
            });

            success('Sucesso', 'Usuário adicionado com sucesso.');
            setUserForm({ email: '', name: '', role: 'viewer' });
            setShowUserModal(false);
            fetchUsers();
        } catch (err: any) {
            console.error('Error adding user:', err);
            error('Erro', err.response?.data?.error || 'Não foi possível adicionar o usuário.');
        }
    };

    const handleDeleteUser = async (user: User) => {
        if (!window.confirm(`Tem certeza que deseja remover ${user.name}?`)) return;
        try {
            await api.delete(`/api/auth/users/${user.id}`);
            success('Removido', 'Usuário removido com sucesso.');
            fetchUsers();
        } catch (err: any) {
            console.error('Error deleting user:', err);
            error('Erro', err.response?.data?.error || 'Não foi possível remover o usuário.');
        }
    };

    const saveSettings = async (key: string, value: any) => {
        try {
            await api.put(`/api/settings/${key}`, { value });
            success('Salvo', 'Configurações atualizadas.');
        } catch (err) {
            console.error(`Error saving ${key} settings:`, err);
            error('Erro', 'Não foi possível salvar as configurações.');
        }
    };

    const savePointSettings = () => saveSettings('points', pointSettings);
    const saveTempSettings = () => saveSettings('temperature', tempSettings);

    const saveDelaySettings = async () => {
        const minDelay = parseInt(delaySettings.minDelay) || 3;
        const maxDelay = parseInt(delaySettings.maxDelay) || 7;

        if (minDelay < 1) {
            error('Erro', 'O delay mínimo deve ser pelo menos 1 segundo.');
            return;
        }
        if (maxDelay < minDelay) {
            error('Erro', 'O delay máximo deve ser maior ou igual ao mínimo.');
            return;
        }

        setSavingDelay(true);
        try {
            await saveSettings('messageDelay', {
                minDelay,
                maxDelay,
                enabled: delaySettings.enabled
            });
            success('Salvo', `Delay configurado: ${minDelay}-${maxDelay} segundos entre mensagens.`);
        } catch (err) {
            // handled in saveSettings
        } finally {
            setSavingDelay(false);
        }
    };

    const saveSendWindowSettings = async () => {
        const startHour = parseInt(sendWindowSettings.startHour) || 8;
        const endHour = parseInt(sendWindowSettings.endHour) || 20;

        if (startHour < 0 || startHour > 23 || endHour < 0 || endHour > 23) {
            error('Erro', 'As horas devem estar entre 0 e 23.');
            return;
        }
        if (startHour === endHour) {
            error('Erro', 'Hora inicial e final não podem ser iguais.');
            return;
        }

        setSavingSendWindow(true);
        try {
            await saveSettings('sendWindow', {
                enabled: sendWindowSettings.enabled,
                startHour,
                endHour,
            });
            success('Salvo', `Janela de envio: ${startHour}h às ${endHour}h.`);
        } catch (err) {
            // handled in saveSettings
        } finally {
            setSavingSendWindow(false);
        }
    };

    const handleSaveWebhook = async () => {
        if (!webhookForm.origin_name) {
            error('Erro', 'Nome da origem é obrigatório');
            return;
        }

        setSavingWebhook(true);
        try {
            // Parse status mappings from comma-separated string to array
            const formattedStatus = {
                approved: webhookForm.status_mappings.approved.split(',').map(s => s.trim()).filter(Boolean),
                refunded: webhookForm.status_mappings.refunded.split(',').map(s => s.trim()).filter(Boolean),
                cancelled: webhookForm.status_mappings.cancelled.split(',').map(s => s.trim()).filter(Boolean),
                chargeback: webhookForm.status_mappings.chargeback.split(',').map(s => s.trim()).filter(Boolean),
            };

            const payload = {
                origin_name: webhookForm.origin_name,
                field_mappings: webhookForm.field_mappings,
                status_mappings: formattedStatus,
            };

            if (webhookForm.id) {
                await api.put(`/api/settings/webhook-mappings/${webhookForm.id}`, payload);
            } else {
                await api.post('/api/settings/webhook-mappings', payload);
            }

            // Trigger reprocessing of pending webhooks
            try {
                const reprocessResponse = await fetch(`${API_URL}/webhook/reprocess/${payload.origin_name}`, {
                    method: 'POST'
                });
                const reprocessData = await reprocessResponse.json();
                if (reprocessData.count > 0) {
                    success('Processado', `${reprocessData.count} webhooks pendentes foram processados.`);
                }
            } catch (reprocessErr) {
                console.error('Error reprocessing:', reprocessErr);
            }

            success('Sucesso', 'Mapeamento salvo com sucesso');
            setShowWebhookModal(false);
            fetchWebhooks();
        } catch (err: any) {
            console.error(err);
            error('Erro', 'Erro ao salvar mapeamento');
        } finally {
            setSavingWebhook(false);
        }
    };

    const handleDeleteWebhook = async (id: string) => {
        if (!confirm('Excluir este mapeamento?')) return;
        try {
            await api.delete(`/api/settings/webhook-mappings/${id}`);
            success('Removido', 'Mapeamento removido');
            fetchWebhooks();
        } catch (err) {
            error('Erro', 'Erro ao remover');
        }
    };

    const openWebhookModal = (mapping?: any) => {
        if (mapping) {
            setWebhookForm({
                id: mapping.id,
                origin_name: mapping.origin_name,
                field_mappings: mapping.field_mappings,
                status_mappings: {
                    approved: mapping.status_mappings.approved?.join(', ') || '',
                    refunded: mapping.status_mappings.refunded?.join(', ') || '',
                    cancelled: mapping.status_mappings.cancelled?.join(', ') || '',
                    chargeback: mapping.status_mappings.chargeback?.join(', ') || '',
                }
            });
        } else {
            setWebhookForm({
                id: '',
                origin_name: '',
                field_mappings: {
                    email: 'email',
                    name: 'name',
                    phone: 'phone',
                    product: 'product_name',
                    amount: 'amount',
                    status: 'status',
                    transactionId: 'transaction_id'
                },
                status_mappings: {
                    approved: 'approved, paid, completed',
                    refunded: 'refunded',
                    cancelled: 'cancelled, expired',
                    chargeback: 'chargeback'
                }
            });
        }
        setShowWebhookModal(true);
    };

    if (!isMaster) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-center">
                    <h2 className="text-xl font-semibold">Acesso restrito</h2>
                    <p className="text-gray-500">Apenas usuários Master podem acessar configurações.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in relative z-10 pb-8 min-h-screen">
            <div>
                <h1 className="text-3xl font-extrabold text-white tracking-tight">Configurações</h1>
                <p className="text-gray-400 mt-1 font-medium">Gerencie usuários, WhatsApp e regras do sistema</p>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b border-white/10 overflow-x-auto pb-px">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-4 py-3 font-medium transition-all duration-300 border-b-2 whitespace-nowrap ${activeTab === tab.id ? 'border-primary-500 text-primary-400 bg-primary-500/10' : 'border-transparent text-gray-500 hover:text-gray-300 hover:bg-white/5'}`}
                    >
                        <tab.icon className="w-4 h-4" />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div className="bg-dark-800/50 backdrop-blur-md rounded-2xl p-6 border border-white/5 shadow-2xl relative overflow-hidden">
                {/* Decorative gradients */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary-500/20 to-transparent"></div>

                {activeTab === 'users' && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold">Usuários do Sistema</h3>
                            <div className="flex gap-2">
                                <Button variant="outline" size="sm" onClick={fetchUsers} icon={<RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />}>
                                    Atualizar
                                </Button>
                                <Button size="sm" onClick={() => setShowUserModal(true)} icon={<Plus className="w-4 h-4" />}>
                                    Adicionar Usuário
                                </Button>
                            </div>
                        </div>
                        {loading ? (
                            <div className="text-center py-8 text-gray-500">Carregando...</div>
                        ) : users.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">Nenhum usuário cadastrado.</div>
                        ) : (
                            <div className="flex flex-col gap-3 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                                {users.map(user => (
                                    <div key={user.id} className="flex items-center justify-between p-4 rounded-xl bg-dark-900/50 border border-white/5 hover:border-white/10 transition-colors group">
                                        <div>
                                            <p className="font-medium text-gray-200 group-hover:text-primary-400 transition-colors">{user.name}</p>
                                            <p className="text-sm text-gray-500">{user.email}</p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className={`px-3 py-1 rounded-full text-xs font-medium border ${user.role === 'master' ? 'bg-primary-500/10 text-primary-400 border-primary-500/20' : 'bg-dark-800 text-gray-400 border-white/10'}`}>
                                                {user.role === 'master' ? 'Master' : 'Viewer'}
                                            </span>
                                            <button onClick={() => handleDeleteUser(user)} className="p-2 hover:bg-red-500/10 rounded-lg text-gray-500 hover:text-red-400 transition-colors">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                        <div className="text-sm text-gray-400 mt-4 bg-dark-900/50 p-4 rounded-xl border border-white/5 flex gap-3 items-start">
                            <span className="text-primary-400">💡</span>
                            <p><strong>Nota:</strong> Para criar novos usuários, convide-os através do painel do Supabase. O botão "Adicionar Usuário" acima é apenas ilustrativo nesta migração.</p>
                        </div>
                    </div>
                )}

                {activeTab === 'whatsapp' && (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between pb-4 border-b border-white/5">
                            <div>
                                <h3 className="font-semibold text-lg text-white">Integração WhatsApp (Evolution API)</h3>
                                <p className="text-sm text-gray-400">Configure sua instância da Evolution API para envio de mensagens</p>
                            </div>
                            <div className="flex items-center gap-2">
                                {evolutionStatus.checking ? (
                                    <span className="flex items-center gap-2 text-gray-500">
                                        <RefreshCw className="w-4 h-4 animate-spin" />
                                        Verificando...
                                    </span>
                                ) : evolutionStatus.connected ? (
                                    <span className="flex items-center gap-2 text-green-600">
                                        <Wifi className="w-4 h-4" />
                                        Conectado
                                    </span>
                                ) : (
                                    <span className="flex items-center gap-2 text-red-500">
                                        <WifiOff className="w-4 h-4" />
                                        Desconectado
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* API Configuration */}
                        <div className="p-5 rounded-2xl bg-dark-900/50 border border-white/5 space-y-5 relative overflow-hidden">
                            <h4 className="font-medium text-white flex items-center gap-2">
                                <Webhook className="w-5 h-5 text-primary-400" />
                                Configuração da API
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <Input
                                    label="URL da API"
                                    placeholder="https://sua-evolution.com"
                                    value={evolutionConfig.apiUrl}
                                    onChange={(e) => setEvolutionConfig(prev => ({ ...prev, apiUrl: e.target.value }))}
                                />
                                <Input
                                    label="API Key"
                                    type="password"
                                    placeholder="Sua API Key"
                                    value={evolutionConfig.apiKey}
                                    onChange={(e) => setEvolutionConfig(prev => ({ ...prev, apiKey: e.target.value }))}
                                />
                                <Input
                                    label="Nome da Instância"
                                    placeholder="crm-instancia"
                                    value={evolutionConfig.instanceName}
                                    onChange={(e) => setEvolutionConfig(prev => ({ ...prev, instanceName: e.target.value }))}
                                />
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    onClick={saveEvolutionConfig}
                                    loading={savingConfig}
                                    icon={<Save className="w-4 h-4" />}
                                >
                                    Salvar Configuração
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={checkEvolutionStatus}
                                    disabled={evolutionStatus.checking}
                                    icon={<RefreshCw className={`w-4 h-4 ${evolutionStatus.checking ? 'animate-spin' : ''}`} />}
                                >
                                    Verificar Conexão
                                </Button>
                            </div>
                        </div>

                        {/* QR Code Section */}
                        {!evolutionStatus.connected && evolutionConfig.apiUrl && (
                            <div className="p-5 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 space-y-5 relative overflow-hidden">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h4 className="font-medium text-yellow-400 flex items-center gap-2">
                                            <QrCode className="w-5 h-5" /> Conectar WhatsApp
                                        </h4>
                                        <p className="text-sm text-yellow-500/70 mt-1">Escaneie o QR Code com seu WhatsApp para conectar</p>
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={fetchQRCode}
                                        loading={loadingQr}
                                        icon={<QrCode className="w-4 h-4" />}
                                    >
                                        {qrCode ? 'Atualizar QR Code' : 'Gerar QR Code'}
                                    </Button>
                                </div>
                                {qrCode && (
                                    <div className="flex justify-center">
                                        <img
                                            src={qrCode.startsWith('data:') ? qrCode : `data:image/png;base64,${qrCode}`}
                                            alt="QR Code WhatsApp"
                                            className="max-w-[250px] rounded-lg shadow-lg"
                                        />
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Test Message */}
                        {evolutionStatus.connected && (
                            <div className="p-5 rounded-2xl bg-green-500/10 border border-green-500/20 space-y-5">
                                <h4 className="font-medium text-green-400 flex items-center gap-2">
                                    <Send className="w-5 h-5" /> Enviar Mensagem de Teste
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <Input
                                        label="Número de Telefone"
                                        placeholder="55119999999999"
                                        value={testPhone}
                                        onChange={(e) => setTestPhone(e.target.value)}
                                    />
                                    <Input
                                        label="Mensagem"
                                        placeholder="Olá! Esta é uma mensagem de teste."
                                        value={testMessage}
                                        onChange={(e) => setTestMessage(e.target.value)}
                                    />
                                </div>
                                <Button
                                    onClick={sendTestMessage}
                                    loading={sendingTest}
                                    icon={<Send className="w-4 h-4" />}
                                >
                                    Enviar Teste
                                </Button>
                            </div>
                        )}

                        {/* Message Delay Settings */}
                        <div className="p-5 rounded-2xl bg-blue-500/10 border border-blue-500/20 space-y-5">
                            <div>
                                <h4 className="font-medium text-blue-400 flex items-center gap-2">
                                    <Clock className="w-5 h-5" /> Delay entre Mensagens
                                </h4>
                                <p className="text-sm text-blue-400/70 mt-1">
                                    Configure o intervalo entre cada envio de mensagem em massa para evitar bloqueios do WhatsApp.
                                </p>
                            </div>

                            <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex gap-3 items-start">
                                <AlertCircle className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
                                <p className="text-sm text-yellow-400">
                                    <strong>Recomendação:</strong> Use delay mínimo de 3-5 segundos para evitar bloqueios.
                                    Para listas maiores (100+ contatos), use 10+ segundos.
                                </p>
                            </div>

                            <label className="flex items-center gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={delaySettings.enabled}
                                    onChange={(e) => setDelaySettings(prev => ({ ...prev, enabled: e.target.checked }))}
                                    className="w-5 h-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                                />
                                <span className="text-gray-300">Ativar delay aleatório entre mensagens</span>
                            </label>

                            {delaySettings.enabled && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <Input
                                        label="Delay Mínimo (segundos)"
                                        type="number"
                                        min="1"
                                        max="60"
                                        placeholder="3"
                                        value={delaySettings.minDelay}
                                        onChange={(e) => setDelaySettings(prev => ({ ...prev, minDelay: e.target.value }))}
                                    />
                                    <Input
                                        label="Delay Máximo (segundos)"
                                        type="number"
                                        min="1"
                                        max="120"
                                        placeholder="7"
                                        value={delaySettings.maxDelay}
                                        onChange={(e) => setDelaySettings(prev => ({ ...prev, maxDelay: e.target.value }))}
                                    />
                                </div>
                            )}

                            <div className="flex items-center justify-between pt-2">
                                <p className="text-sm text-gray-500">
                                    {delaySettings.enabled
                                        ? `Delay atual: ${delaySettings.minDelay}-${delaySettings.maxDelay} segundos`
                                        : 'Delay desativado (0.5s padrão)'}
                                </p>
                                <Button
                                    onClick={saveDelaySettings}
                                    loading={savingDelay}
                                    size="sm"
                                    icon={<Save className="w-4 h-4" />}
                                >
                                    Salvar Delay
                                </Button>
                            </div>
                        </div>

                        {/* Send Window Settings */}
                        <div className="p-5 rounded-2xl bg-primary-500/10 border border-primary-500/20 space-y-5">
                            <div>
                                <h4 className="font-medium text-primary-400 flex items-center gap-2">
                                    <Clock className="w-5 h-5" /> Horário de Envio
                                </h4>
                                <p className="text-sm text-primary-400/70 mt-1">
                                    Limite o envio em massa apenas dentro de um horário específico. Fora do horário, o envio pausa e retoma automaticamente.
                                </p>
                            </div>

                            <label className="flex items-center gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={sendWindowSettings.enabled}
                                    onChange={(e) => setSendWindowSettings(prev => ({ ...prev, enabled: e.target.checked }))}
                                    className="w-5 h-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                                />
                                <span className="text-gray-300">Ativar janela de horário de envio</span>
                            </label>

                            {sendWindowSettings.enabled && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <Input
                                        label="Início do envio (hora)"
                                        type="number"
                                        min="0"
                                        max="23"
                                        placeholder="8"
                                        value={sendWindowSettings.startHour}
                                        onChange={(e) => setSendWindowSettings(prev => ({ ...prev, startHour: e.target.value }))}
                                    />
                                    <Input
                                        label="Fim do envio (hora)"
                                        type="number"
                                        min="0"
                                        max="23"
                                        placeholder="20"
                                        value={sendWindowSettings.endHour}
                                        onChange={(e) => setSendWindowSettings(prev => ({ ...prev, endHour: e.target.value }))}
                                    />
                                </div>
                            )}

                            <div className="flex items-center justify-between pt-2">
                                <p className="text-sm text-gray-500">
                                    {sendWindowSettings.enabled
                                        ? `Envio permitido das ${sendWindowSettings.startHour}h às ${sendWindowSettings.endHour}h`
                                        : 'Janela desativada — envio a qualquer hora'}
                                </p>
                                <Button
                                    onClick={saveSendWindowSettings}
                                    loading={savingSendWindow}
                                    size="sm"
                                    icon={<Save className="w-4 h-4" />}
                                >
                                    Salvar Horário
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'points' && (
                    <div className="space-y-6">
                        <div className="p-5 rounded-2xl bg-dark-900/50 border border-white/5 space-y-5">
                            <h3 className="font-medium text-white flex items-center gap-2">
                                <Calculator className="w-5 h-5 text-primary-400" />
                                Configuração de Pontuação
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <Input label="Até R$97" value={pointSettings.tier1} onChange={(e) => setPointSettings({ ...pointSettings, tier1: e.target.value })} />
                                <Input label="R$98 - R$297" value={pointSettings.tier2} onChange={(e) => setPointSettings({ ...pointSettings, tier2: e.target.value })} />
                                <Input label="R$298 - R$497" value={pointSettings.tier3} onChange={(e) => setPointSettings({ ...pointSettings, tier3: e.target.value })} />
                                <Input label="R$498 - R$997" value={pointSettings.tier4} onChange={(e) => setPointSettings({ ...pointSettings, tier4: e.target.value })} />
                                <Input label="Acima de R$997" value={pointSettings.tier5} onChange={(e) => setPointSettings({ ...pointSettings, tier5: e.target.value })} />
                                <Input label="Bônus Recorrência (%)" value={pointSettings.recurrenceBonus} onChange={(e) => setPointSettings({ ...pointSettings, recurrenceBonus: e.target.value })} />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Input label="Decaimento Mensal (%)" value={pointSettings.monthlyDecay} onChange={(e) => setPointSettings({ ...pointSettings, monthlyDecay: e.target.value })} />
                                <Input label="Intervalo de Decaimento (dias)" value={pointSettings.decayInterval} onChange={(e) => setPointSettings({ ...pointSettings, decayInterval: e.target.value })} />
                            </div>
                            <Button onClick={savePointSettings} icon={<Save className="w-4 h-4" />}>Salvar Pontuações</Button>
                        </div>
                    </div>
                )}

                {activeTab === 'temperature' && (
                    <div className="space-y-6">
                        <div className="p-5 rounded-2xl bg-dark-900/50 border border-white/5 space-y-5">
                            <h3 className="font-medium text-white flex items-center gap-2">
                                <Thermometer className="w-5 h-5 text-primary-400" />
                                Regras de Temperatura
                            </h3>
                            <div className="space-y-4">
                                <div className="p-5 rounded-xl bg-orange-500/10 border border-orange-500/20">
                                    <p className="font-medium text-orange-400 mb-4 flex items-center gap-2">🔥 Quente</p>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <Input label="Máx. dias desde compra" value={tempSettings.hotDays} onChange={(e) => setTempSettings({ ...tempSettings, hotDays: e.target.value })} />
                                        <Input label="Mín. pontos" value={tempSettings.hotPoints} onChange={(e) => setTempSettings({ ...tempSettings, hotPoints: e.target.value })} />
                                    </div>
                                </div>
                                <div className="p-5 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
                                    <p className="font-medium text-yellow-400 mb-4 flex items-center gap-2">🟡 Morno</p>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <Input label="Máx. dias desde compra" value={tempSettings.warmDays} onChange={(e) => setTempSettings({ ...tempSettings, warmDays: e.target.value })} />
                                        <Input label="Mín. pontos" value={tempSettings.warmPoints} onChange={(e) => setTempSettings({ ...tempSettings, warmPoints: e.target.value })} />
                                    </div>
                                </div>
                            </div>
                        </div>
                        <Button onClick={saveTempSettings} icon={<Save className="w-4 h-4" />}>Salvar</Button>
                    </div>
                )}

                {activeTab === 'webhooks' && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="font-medium text-white text-lg">Mapeamentos de Webhook</h3>
                                <p className="text-sm text-gray-400 mt-1">Endpoint: <code className="bg-dark-900 border border-white/10 px-2 py-0.5 rounded text-primary-400 font-mono">POST {API_URL}/webhook/conversion</code></p>
                            </div>
                            <Button size="sm" onClick={() => openWebhookModal()} icon={<Plus className="w-4 h-4" />}>Novo Mapeamento</Button>
                        </div>

                        {webhookMappings.length === 0 ? (
                            <div className="p-12 rounded-2xl bg-dark-900/50 text-center text-gray-500 border border-dashed border-white/10">
                                <div className="w-16 h-16 rounded-full bg-dark-800 flex items-center justify-center mx-auto mb-4 border border-white/5">
                                    <Webhook className="w-8 h-8 text-gray-400" />
                                </div>
                                <p className="text-gray-300 font-medium">Nenhum mapeamento configurado ainda.</p>
                                <p className="text-sm mt-1 text-gray-500">Configure mapeamentos para processar vendas de Hotmart, Kiwify, etc.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {webhookMappings.map(map => (
                                    <div key={map.id} className="p-5 rounded-2xl bg-dark-900/50 border border-white/5 hover:border-white/10 transition-colors group">
                                        <div className="flex justify-between items-start mb-4">
                                            <h4 className="font-bold text-lg text-white group-hover:text-primary-400 transition-colors">{map.origin_name}</h4>
                                            <div className="flex gap-2">
                                                <button onClick={() => openWebhookModal(map)} className="p-2 hover:bg-white/5 rounded-lg text-gray-400 hover:text-primary-400 transition-colors">
                                                    <RefreshCw className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => handleDeleteWebhook(map.id)} className="p-2 hover:bg-red-500/10 rounded-lg text-gray-400 hover:text-red-400 transition-colors">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                        <div className="text-xs text-gray-400 space-y-2 font-mono bg-dark-800 p-3 rounded-xl border border-white/5">
                                            <p><span className="text-gray-500">Email:</span> <span className="text-gray-300">{map.field_mappings.email}</span></p>
                                            <p><span className="text-gray-500">Status:</span> <span className="text-gray-300">{map.field_mappings.status}</span></p>
                                            <p><span className="text-gray-500">Aprovado:</span> <span className="text-green-400">{map.status_mappings.approved?.join(', ')}</span></p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Add User Modal */}
            <Modal isOpen={showUserModal} onClose={() => setShowUserModal(false)} title="Adicionar Usuário" footer={
                <>
                    <Button variant="outline" onClick={() => setShowUserModal(false)}>Cancelar</Button>
                    <Button onClick={handleAddUser}>Adicionar</Button>
                </>
            }>
                <div className="space-y-4">
                    <Input label="Nome" value={userForm.name} onChange={(e) => setUserForm({ ...userForm, name: e.target.value })} placeholder="Nome do usuário" />
                    <Input label="Email" type="email" value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} placeholder="email@exemplo.com" />
                    <Select label="Permissão" value={userForm.role} onChange={(e) => setUserForm({ ...userForm, role: e.target.value as 'master' | 'viewer' })} options={[
                        { value: 'viewer', label: 'Viewer - Apenas visualização' },
                        { value: 'master', label: 'Master - Acesso total' },
                    ]} />
                    <div className="text-sm text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 p-4 rounded-xl flex gap-3 items-start">
                        <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                        <p>Esta ação não cria o login do usuário. Ele precisará se cadastrar via Supabase.</p>
                    </div>
                </div>
            </Modal>

            {/* Webhook Modal */}
            <Modal isOpen={showWebhookModal} onClose={() => setShowWebhookModal(false)} title={webhookForm.id ? "Editar Mapeamento" : "Novo Mapeamento"}
                footer={
                    <>
                        <Button variant="outline" onClick={() => setShowWebhookModal(false)}>Cancelar</Button>
                        <Button onClick={handleSaveWebhook} loading={savingWebhook}>Salvar Mapeamento</Button>
                    </>
                }
            >
                <div className="space-y-4 max-h-[70vh] overflow-y-auto px-1">
                    <Input
                        label="Nome da Plataforma (Header: x-webhook-source)"
                        placeholder="Ex: Hotmart"
                        value={webhookForm.origin_name}
                        onChange={e => setWebhookForm(prev => ({ ...prev, origin_name: e.target.value }))}
                    />

                    <div className="border-t border-white/10 pt-6 mt-2">
                        <h4 className="font-medium mb-4 text-sm text-gray-400 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-primary-500"></span>
                            Mapeamento de Campos (JSON Path)
                        </h4>
                        <div className="grid grid-cols-2 gap-4">
                            <Input label="Email" value={webhookForm.field_mappings.email} onChange={e => setWebhookForm(prev => ({ ...prev, field_mappings: { ...prev.field_mappings, email: e.target.value } }))} />
                            <Input label="Nome" value={webhookForm.field_mappings.name} onChange={e => setWebhookForm(prev => ({ ...prev, field_mappings: { ...prev.field_mappings, name: e.target.value } }))} />
                            <Input label="Telefone" value={webhookForm.field_mappings.phone} onChange={e => setWebhookForm(prev => ({ ...prev, field_mappings: { ...prev.field_mappings, phone: e.target.value } }))} />
                            <Input label="Produto" value={webhookForm.field_mappings.product} onChange={e => setWebhookForm(prev => ({ ...prev, field_mappings: { ...prev.field_mappings, product: e.target.value } }))} />
                            <Input label="Valor" value={webhookForm.field_mappings.amount} onChange={e => setWebhookForm(prev => ({ ...prev, field_mappings: { ...prev.field_mappings, amount: e.target.value } }))} />
                            <Input label="Status (Campo)" value={webhookForm.field_mappings.status} onChange={e => setWebhookForm(prev => ({ ...prev, field_mappings: { ...prev.field_mappings, status: e.target.value } }))} />
                            <Input label="ID Transação" value={webhookForm.field_mappings.transactionId} onChange={e => setWebhookForm(prev => ({ ...prev, field_mappings: { ...prev.field_mappings, transactionId: e.target.value } }))} />
                        </div>
                    </div>

                    <div className="border-t border-white/10 pt-6 mt-2">
                        <h4 className="font-medium mb-3 text-sm text-gray-400 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-primary-500"></span>
                            Mapeamento de Valores de Status
                        </h4>
                        <p className="text-xs text-gray-500 mb-4 bg-dark-900/50 p-3 rounded-lg border border-white/5">Separe os valores por vírgula. Ex: <code className="text-primary-400">approved, completed, paid</code></p>
                        <div className="space-y-4">
                            <Input label="Aprovado (Venda OK)" value={webhookForm.status_mappings.approved} onChange={e => setWebhookForm(prev => ({ ...prev, status_mappings: { ...prev.status_mappings, approved: e.target.value } }))} />
                            <Input label="Estornado (Refund)" value={webhookForm.status_mappings.refunded} onChange={e => setWebhookForm(prev => ({ ...prev, status_mappings: { ...prev.status_mappings, refunded: e.target.value } }))} />
                            <Input label="Cancelado" value={webhookForm.status_mappings.cancelled} onChange={e => setWebhookForm(prev => ({ ...prev, status_mappings: { ...prev.status_mappings, cancelled: e.target.value } }))} />
                            <Input label="Chargeback" value={webhookForm.status_mappings.chargeback} onChange={e => setWebhookForm(prev => ({ ...prev, status_mappings: { ...prev.status_mappings, chargeback: e.target.value } }))} />
                        </div>
                    </div>
                </div>
            </Modal>
        </div>
    );
}

