import { useState, useEffect } from 'react';
import { Plus, Trash2, Save, ArrowLeft, Info, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/config/api';
import Button from '@/components/Button';
import { Input } from '@/components/FormFields';
import { useToast } from '@/components/Toast';


interface SubscriptionSetting {
    id: string;
    days_before: number;
    message_template: string;
    is_active: boolean;
    sort_order: number;
}

export default function SubscriptionSettingsPage() {
    const navigate = useNavigate();
    const { success, error } = useToast();
    const [settings, setSettings] = useState<SubscriptionSetting[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        setLoading(true);
        try {
            const data = await api.get('/api/subscriptions/settings');
            setSettings(data || []);
        } catch (err) {
            console.error('Error fetching settings:', err);
            error('Erro', 'Não foi possível carregar as configurações.');
        } finally {
            setLoading(false);
        }
    };

    const handleAddRule = () => {
        const newRule: SubscriptionSetting = {
            id: `temp-${Date.now()}`,
            days_before: 1,
            message_template: 'Olá {{lead_name}}, sua assinatura vence em breve.',
            is_active: true,
            sort_order: settings.length
        };
        // Insert at beginning for visibility or sort? Sorted by days usually makes sense.
        // Let's just add it.
        setSettings([newRule, ...settings]);
    };

    const handleUpdate = (id: string, field: keyof SubscriptionSetting, value: any) => {
        setSettings(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
    };

    const handleDelete = async (id: string) => {
        if (!id.startsWith('temp')) {
            if (!confirm('Excluir esta regra?')) return;
            try {
                await api.delete(`/api/subscriptions/settings/${id}`);
            } catch (e) {
                console.error(e);
                error('Erro', 'Não foi possível excluir a regra.');
                return;
            }
        }
        setSettings(prev => prev.filter(s => s.id !== id));
        success('Sucesso', 'Regra removida.');
    };

    const saveAll = async () => {
        setSaving(true);
        try {
            // Filter out invalid
            const valid = settings.filter(s => s.days_before > 0 && s.message_template.trim().length > 0);

            // Upsert all
            const payload = valid.map(s => {
                const item: any = {
                    days_before: s.days_before,
                    message_template: s.message_template,
                    is_active: s.is_active,
                    sort_order: s.sort_order
                };
                if (!s.id.startsWith('temp')) {
                    item.id = s.id;
                }
                return item;
            });

            await api.put('/api/subscriptions/settings', payload);

            success('Salvo', 'Configurações atualizadas.');
            fetchSettings();
        } catch (err) {
            console.error(err);
            error('Erro', 'Falha ao salvar.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-8 animate-fade-in relative z-10 pb-8 min-h-screen">
            <div className="flex items-center gap-4">
                <Button variant="ghost" onClick={() => navigate('/settings')} className="text-gray-400 hover:text-white hover:bg-white/10">
                    <ArrowLeft className="w-5 h-5" />
                </Button>
                <div>
                    <h1 className="text-3xl font-extrabold text-white tracking-tight">Régua de Assinaturas</h1>
                    <p className="text-gray-400 mt-1 font-medium">Configure as mensagens automáticas de renovação.</p>
                </div>
            </div>

            <div className="glass-card p-5 rounded-2xl border border-blue-500/20 bg-blue-500/5 flex gap-4 text-sm text-blue-400 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent pointer-events-none"></div>
                <Info className="w-5 h-5 shrink-0 relative z-10" />
                <div className="relative z-10 flex-1">
                    <p className="font-bold mb-2 uppercase tracking-wide">Variáveis Disponíveis:</p>
                    <div className="flex flex-wrap gap-2">
                        <span className="flex items-center gap-1.5"><code className="bg-blue-500/20 px-2 py-0.5 rounded font-mono text-blue-300">{'{{lead_name}}'}</code> Nome</span>
                        <span className="flex items-center gap-1.5"><code className="bg-blue-500/20 px-2 py-0.5 rounded font-mono text-blue-300">{'{{product_name}}'}</code> Produto</span>
                        <span className="flex items-center gap-1.5"><code className="bg-blue-500/20 px-2 py-0.5 rounded font-mono text-blue-300">{'{{renewal_link}}'}</code> Link</span>
                        <span className="flex items-center gap-1.5"><code className="bg-blue-500/20 px-2 py-0.5 rounded font-mono text-blue-300">{'{{end_date}}'}</code> Vencimento</span>
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                {settings.map((setting) => (
                    <div key={setting.id} className="glass-card p-6 rounded-2xl shadow-lg border border-white/5 space-y-4 relative group transition-all hover:border-white/10">
                        <div className="flex items-start gap-6 flex-wrap md:flex-nowrap">
                            <div className="w-full md:w-32 shrink-0">
                                <Input
                                    label="Dias Antes"
                                    type="number"
                                    value={setting.days_before}
                                    onChange={(e) => handleUpdate(setting.id, 'days_before', parseInt(e.target.value))}
                                />
                            </div>
                            <div className="flex-1 w-full relative">
                                <label className="block text-sm font-bold text-gray-300 mb-2 uppercase tracking-wide">
                                    Mensagem
                                </label>
                                <textarea
                                    className="w-full h-28 px-4 py-3 border border-white/10 focus:border-primary-500/50 focus:ring-1 focus:ring-primary-500/50 rounded-xl bg-dark-900/50 resize-none font-mono text-sm text-gray-200 transition-colors shadow-inner"
                                    value={setting.message_template}
                                    onChange={(e) => handleUpdate(setting.id, 'message_template', e.target.value)}
                                    placeholder="Digite sua mensagem..."
                                />
                            </div>
                            <div className="pt-0 md:pt-8 flex gap-3 w-full md:w-auto justify-end md:justify-start">
                                <button
                                    onClick={() => handleUpdate(setting.id, 'is_active', !setting.is_active)}
                                    className={`px-4 py-2 rounded-xl text-sm font-bold tracking-wide transition-all ${setting.is_active ? 'bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20 hover:shadow-[0_0_15px_rgba(34,197,94,0.15)]' : 'bg-dark-600/50 text-gray-400 border border-white/5 hover:bg-dark-600/80 hover:text-white'}`}
                                    title={setting.is_active ? 'Ativo' : 'Inativo'}
                                >
                                    {setting.is_active ? 'ATIVO' : 'PAUSADO'}
                                </button>
                                <button
                                    onClick={() => handleDelete(setting.id)}
                                    className="p-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 transition-all hover:shadow-[0_0_15px_rgba(239,68,68,0.15)]"
                                    title="Excluir"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}

                {settings.length === 0 && !loading && (
                    <div className="text-center py-16 text-gray-500 bg-dark-800/30 rounded-2xl border border-white/5 border-dashed">
                        <p className="font-medium text-lg">Nenhuma regra configurada.</p>
                        <p className="text-sm mt-1">Clique em "Adicionar Regra" para criar a primeira.</p>
                    </div>
                )}
            </div>

            <div className="flex justify-between items-center bg-dark-800/50 p-4 rounded-2xl border border-white/5 shadow-sm">
                <Button variant="outline" onClick={handleAddRule} icon={<Plus className="w-4 h-4" />}>
                    Adicionar Regra
                </Button>
                <Button onClick={saveAll} disabled={saving} icon={saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} className="shadow-[0_0_20px_rgba(124,58,237,0.3)]">
                    Salvar Alterações
                </Button>
            </div>
        </div>
    );
}
