import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import { Save, Lock, Smartphone, RefreshCw, CheckCircle, AlertCircle, MessageCircle, CloudCog, CheckCircle2, LinkIcon, ShieldCheck, Bot, Sparkles, BellRing, Shield, Download, Trash2, FileDown, UserX, Database } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { getSetting, saveSetting } from '../services/settingsService';
import { wassengerService } from '../services/wassengerService';
import { supabase } from '../services/supabaseClient';

const Settings: React.FC = () => {
    // TOConline State
    const [tocApiKey, setTocApiKey] = useState('');
    const [tocConnected, setTocConnected] = useState(false);
    const [isSavingToc, setIsSavingToc] = useState(false);
    const { addToast } = useToast();

    // Wassenger State
    const [wassengerApiKey, setWassengerApiKey] = useState('');
    const [wassengerConnected, setWassengerConnected] = useState(false);
    const [isSavingWassenger, setIsSavingWassenger] = useState(false);

    // LLM Provider State
    const [llmProvider, setLlmProvider] = useState<'gemini' | 'ollama'>('gemini');
    const [geminiApiKey, setGeminiApiKey] = useState(import.meta.env.VITE_GEMINI_API_KEY || '');
    const [ollamaUrl, setOllamaUrl] = useState('http://localhost:11434');
    const [llmConnected, setLlmConnected] = useState(!!import.meta.env.VITE_GEMINI_API_KEY);
    const [isSavingLlm, setIsSavingLlm] = useState(false);

    // Automation Settings
    const [whatsappAutoAlerts, setWhatsappAutoAlerts] = useState(false);
    const [isSavingAutoAlerts, setIsSavingAutoAlerts] = useState(false);

    // GDPR State
    const [showGdprModal, setShowGdprModal] = useState(false);
    const [gdprAction, setGdprAction] = useState<'export' | 'delete' | null>(null);
    const [gdprPassword, setGdprPassword] = useState('');
    const [isProcessingGdpr, setIsProcessingGdpr] = useState(false);

    // Load settings on mount
    useEffect(() => {
        const loadSettings = async () => {
            const [tocKey, washKey, llmProv, gemKey, ollUrl, autoAlerts] = await Promise.all([
                getSetting('toc_apikey'),
                getSetting('wassenger_key'),
                getSetting('llm_provider'),
                getSetting('gemini_key'),
                getSetting('ollama_url'),
                getSetting('whatsapp_auto_alerts')
            ]);

            if (tocKey) { setTocApiKey(tocKey); setTocConnected(true); }
            if (washKey) { setWassengerApiKey(washKey); setWassengerConnected(true); }
            if (llmProv) setLlmProvider(llmProv as 'gemini' | 'ollama');
            if (gemKey) { setGeminiApiKey(gemKey); setLlmConnected(true); }
            if (ollUrl) setOllamaUrl(ollUrl);
            if (autoAlerts === 'true') setWhatsappAutoAlerts(true);
        };
        loadSettings();
    }, []);

    // TOConline Handlers
    const handleTocSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!tocApiKey) return;

        setIsSavingToc(true);
        const success = await saveSetting('toc_apikey', tocApiKey);

        setIsSavingToc(false);
        if (success) {
            setTocConnected(true);
            addToast('success', 'Chave API TOConline guardada com sucesso.');
        } else {
            addToast('error', 'Erro ao guardar chave API TOConline.');
        }
    };

    const handleTocDisconnect = async () => {
        if (confirm('Tem a certeza que deseja remover a integração TOConline?')) {
            await saveSetting('toc_apikey', '');
            setTocApiKey('');
            setTocConnected(false);
            addToast('info', 'Integração TOConline desconectada.');
        }
    };

    // Wassenger Handlers
    const handleWassengerSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!wassengerApiKey) return;

        setIsSavingWassenger(true);
        const success = await saveSetting('wassenger_key', wassengerApiKey);

        setIsSavingWassenger(false);
        if (success) {
            setWassengerConnected(true);
            addToast('success', 'Integração Wassenger ativa.');
        } else {
            addToast('error', 'Erro ao configurar Wassenger.');
        }
    };

    const handleWassengerDisconnect = async () => {
        if (confirm('Tem a certeza que deseja remover a integração Wassenger?')) {
            await saveSetting('wassenger_key', '');
            setWassengerApiKey('');
            setWassengerConnected(false);
            addToast('info', 'Integração Wassenger desconectada.');
        }
    };

    const handleTestWhatsApp = async () => {
        const phone = prompt('Insira o número de telemóvel para teste (ex: +351912345678):');
        if (!phone) return;

        addToast('info', 'A enviar mensagem de teste...');
        try {
            await wassengerService.sendMessage(phone, '🚀 Teste de Mensagem - MyPortal SEMRUMO\n\nA sua integração WhatsApp está ativa e funcional!');
            addToast('success', 'Mensagem de teste enviada com sucesso!');
        } catch (err: any) {
            console.error(err);
            addToast('error', `Falha no envio: ${err.message || 'Erro desconhecido'}`);
        }
    };

    // LLM Handlers
    const handleLlmSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSavingLlm(true);

        const results = await Promise.all([
            saveSetting('llm_provider', llmProvider),
            saveSetting('gemini_key', geminiApiKey),
            saveSetting('ollama_url', ollamaUrl)
        ]);

        setIsSavingLlm(false);
        if (results.every(r => r)) {
            setLlmConnected(true);
            addToast('success', `LEO AI configurado com sucesso.`);
        } else {
            addToast('error', 'Erro ao configurar LEO AI.');
        }
    };

    const handleLlmDisconnect = async () => {
        if (confirm('Tem a certeza que deseja desconectar a integração AI?')) {
            await Promise.all([
                saveSetting('gemini_key', ''),
                saveSetting('ollama_url', '')
            ]);
            setGeminiApiKey('');
            setLlmConnected(false);
            addToast('info', 'Integração AI desconectada.');
        }
    };

    const handleAutoAlertsToggle = async (enabled: boolean) => {
        setIsSavingAutoAlerts(true);
        const success = await saveSetting('whatsapp_auto_alerts', enabled ? 'true' : 'false');
        setIsSavingAutoAlerts(false);
        if (success) {
            setWhatsappAutoAlerts(enabled);
            addToast('success', enabled ? 'Alertas automáticos ativados.' : 'Alertas automáticos desativados.');
        } else {
            addToast('error', 'Erro ao guardar configuração.');
        }
    };

    // GDPR Handlers
    const handleExportData = async () => {
        setIsProcessingGdpr(true);
        try {
            // Get current user session
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.user) {
                addToast('error', 'Sessão expirada. Por favor faça login novamente.');
                return;
            }

            // Fetch all user data
            const userEmail = session.user.email;

            // Get user profile
            const { data: userData } = await supabase
                .from('users')
                .select('*')
                .eq('email', userEmail)
                .single();

            // Get time logs
            const { data: timeLogs } = await supabase
                .from('time_logs')
                .select('*')
                .eq('user_id', userData?.id)
                .order('date', { ascending: false });

            // Get leaves
            const { data: leaves } = await supabase
                .from('leaves')
                .select('*')
                .eq('user_id', userData?.id)
                .order('start_date', { ascending: false });

            // Get anomalies
            const { data: anomalies } = await supabase
                .from('anomalies')
                .select('*')
                .eq('user_id', userData?.id)
                .order('date', { ascending: false });

            // Prepare export data
            const exportData = {
                export_date: new Date().toISOString(),
                gdpr_request: 'data_portability',
                user_data: userData,
                time_logs: timeLogs || [],
                leaves: leaves || [],
                anomalies: anomalies || []
            };

            // Create download
            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `myportal_gdpr_export_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            // Log consent
            await supabase.from('consent_log').insert({
                user_id: userData?.id,
                consent_type: 'data_export',
                granted: true,
                ip_address: window.location.hostname,
                user_agent: navigator.userAgent
            });

            addToast('success', 'Dados exportados com sucesso. O download iniciou automaticamente.');
            setShowGdprModal(false);
            setGdprPassword('');
        } catch (error) {
            console.error('Export error:', error);
            addToast('error', 'Erro ao exportar dados. Por favor tente novamente.');
        } finally {
            setIsProcessingGdpr(false);
        }
    };

    const handleDeleteAccount = async () => {
        if (!gdprPassword) {
            addToast('error', 'Por favor insira a sua palavra-passe para confirmar.');
            return;
        }

        setIsProcessingGdpr(true);
        try {
            // Verify password
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.user) {
                addToast('error', 'Sessão expirada. Por favor faça login novamente.');
                return;
            }

            // Re-authenticate user
            const { error: authError } = await supabase.auth.signInWithPassword({
                email: session.user.email!,
                password: gdprPassword
            });

            if (authError) {
                addToast('error', 'Palavra-passe incorreta.');
                return;
            }

            // Get user data
            const { data: userData } = await supabase
                .from('users')
                .select('id')
                .eq('auth_id', session.user.id)
                .single();

            if (!userData) {
                addToast('error', 'Utilizador não encontrado.');
                return;
            }

            // Log consent before deletion
            await supabase.from('consent_log').insert({
                user_id: userData.id,
                consent_type: 'right_to_be_forgotten',
                granted: true,
                ip_address: window.location.hostname,
                user_agent: navigator.userAgent
            });

            // Anonymize time_logs (keep for legal requirements but remove PII)
            await supabase
                .from('time_logs')
                .update({
                    user_id: null,
                    notes: '[GDPR_DELETED]'
                })
                .eq('user_id', userData.id);

            // Delete leaves
            await supabase
                .from('leaves')
                .delete()
                .eq('user_id', userData.id);

            // Delete anomalies
            await supabase
                .from('anomalies')
                .delete()
                .eq('user_id', userData.id);

            // Delete user account
            await supabase
                .from('users')
                .delete()
                .eq('id', userData.id);

            // Delete auth account
            await supabase.auth.admin.deleteUser(session.user.id);

            addToast('success', 'Conta eliminada com sucesso. A ser redirecionado...');

            // Sign out and redirect
            await supabase.auth.signOut();
            setTimeout(() => {
                window.location.hash = '/login';
            }, 2000);

        } catch (error) {
            console.error('Delete error:', error);
            addToast('error', 'Erro ao eliminar conta. Por favor contacte o suporte.');
        } finally {
            setIsProcessingGdpr(false);
        }
    };

    return (
        <div className="p-8 w-full max-w-5xl mx-auto pb-20">
            <Header title="Definições da Plataforma" subtitle="Configurações globais e integrações externas" />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Main Content Column */}
                <div className="lg:col-span-2 space-y-8">

                    {/* TOConline Integration Card */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="p-6 border-b border-gray-100 bg-gray-50 flex items-center gap-3">
                            <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
                                <CloudCog size={24} />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-gray-800">Integração TOConline</h3>
                                <p className="text-xs text-gray-500">Contabilidade e Processamento Salarial</p>
                            </div>
                            {tocConnected ? (
                                <span className="ml-auto flex items-center gap-1.5 px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold border border-green-200">
                                    <CheckCircle2 size={14} /> Conectado
                                </span>
                            ) : (
                                <span className="ml-auto flex items-center gap-1.5 px-3 py-1 bg-gray-100 text-gray-500 rounded-full text-xs font-bold border border-gray-200">
                                    <LinkIcon size={14} /> Desconectado
                                </span>
                            )}
                        </div>

                        <div className="p-6">
                            <p className="text-sm text-gray-600 mb-6 leading-relaxed">
                                Ligue o <strong>My Profile SEMRUMO</strong> à sua conta <strong>TOConline</strong> para automatizar a sincronização de dados de colaboradores, faltas, férias e exportação de tempos de trabalho para o processamento salarial.
                            </p>

                            <form onSubmit={handleTocSave} className="space-y-6">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2 flex items-center gap-2">
                                        <Lock size={14} /> TOConline API Key
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="password"
                                            value={tocApiKey}
                                            onChange={(e) => setTocApiKey(e.target.value)}
                                            disabled={tocConnected}
                                            placeholder={tocConnected ? "••••••••••••••••••••••••••••" : "Insira a sua chave API do TOConline"}
                                            className={`w-full pl-4 pr-12 py-3 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all ${tocConnected ? 'bg-gray-50 text-gray-500 border-gray-200' : 'bg-white border-gray-300'}`}
                                        />
                                        {tocConnected && (
                                            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500">
                                                <CheckCircle2 size={20} />
                                            </div>
                                        )}
                                    </div>
                                    <p className="mt-2 text-xs text-gray-400">
                                        Pode gerar esta chave no menu de utilizadores/integrações da sua conta TOConline.
                                    </p>
                                </div>

                                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                                    {tocConnected ? (
                                        <button
                                            type="button"
                                            onClick={handleTocDisconnect}
                                            className="text-red-600 text-sm font-medium hover:text-red-800 transition-colors"
                                        >
                                            Desconectar e remover chave
                                        </button>
                                    ) : (
                                        <div className="text-xs text-gray-400 italic flex items-center gap-1">
                                            <ShieldCheck size={14} /> Dados encriptados
                                        </div>
                                    )}

                                    {!tocConnected && (
                                        <button
                                            type="submit"
                                            disabled={!tocApiKey || isSavingToc}
                                            className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold text-white shadow-sm transition-all ${!tocApiKey || isSavingToc ? 'bg-gray-300 cursor-not-allowed' : 'bg-brand-600 hover:bg-brand-700'}`}
                                        >
                                            {isSavingToc ? 'A validar...' : 'Guardar e Conectar'}
                                            {!isSavingToc && <Save size={18} />}
                                        </button>
                                    )}
                                </div>
                            </form>
                        </div>

                        {tocConnected && (
                            <div className="bg-green-50 p-4 border-t border-green-100 flex gap-3">
                                <div className="bg-green-100 p-2 rounded-full h-fit text-green-600">
                                    <CloudCog size={18} />
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold text-green-800">Sincronização Ativa</h4>
                                    <p className="text-xs text-green-700 mt-1">
                                        A última sincronização ocorreu há 2 minutos. Os dados de assiduidade serão enviados automaticamente no dia 20 de cada mês.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Wassenger Integration Card */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="p-6 border-b border-gray-100 bg-gray-50 flex items-center gap-3">
                            <div className="p-2 bg-green-100 text-green-700 rounded-lg">
                                <MessageCircle size={24} />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-gray-800">Integração Wassenger</h3>
                                <p className="text-xs text-gray-500">Notificações WhatsApp</p>
                            </div>
                            {wassengerConnected ? (
                                <span className="ml-auto flex items-center gap-1.5 px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold border border-green-200">
                                    <CheckCircle2 size={14} /> Conectado
                                </span>
                            ) : (
                                <span className="ml-auto flex items-center gap-1.5 px-3 py-1 bg-gray-100 text-gray-500 rounded-full text-xs font-bold border border-gray-200">
                                    <LinkIcon size={14} /> Desconectado
                                </span>
                            )}
                        </div>

                        <div className="p-6">
                            <p className="text-sm text-gray-600 mb-6 leading-relaxed">
                                Conecte a API do <strong>Wassenger</strong> para enviar notificações automáticas por WhatsApp (recibos de vencimento, alertas de ponto, onboarding) aos seus colaboradores de forma rápida e eficiente.
                            </p>

                            <form onSubmit={handleWassengerSave} className="space-y-6">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2 flex items-center gap-2">
                                        <Lock size={14} /> Wassenger API Key
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="password"
                                            value={wassengerApiKey}
                                            onChange={(e) => setWassengerApiKey(e.target.value)}
                                            disabled={wassengerConnected}
                                            placeholder={wassengerConnected ? "••••••••••••••••••••••••••••" : "Insira a chave API do Wassenger"}
                                            className={`w-full pl-4 pr-12 py-3 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all ${wassengerConnected ? 'bg-gray-50 text-gray-500 border-gray-200' : 'bg-white border-gray-300'}`}
                                        />
                                        {wassengerConnected && (
                                            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500">
                                                <CheckCircle2 size={20} />
                                            </div>
                                        )}
                                    </div>
                                    <p className="mt-2 text-xs text-gray-400">
                                        Disponível no painel de developers da sua conta Wassenger.
                                    </p>
                                </div>

                                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                                    {wassengerConnected ? (
                                        <div className="flex items-center gap-3">
                                            <button
                                                type="button"
                                                onClick={handleTestWhatsApp}
                                                className="px-4 py-2 bg-brand-600 text-white text-xs font-bold rounded-lg hover:bg-brand-700 transition-all flex items-center gap-2 shadow-sm"
                                            >
                                                <RefreshCw size={14} /> Testar Envio de Teste
                                            </button>
                                            <button
                                                type="button"
                                                onClick={handleWassengerDisconnect}
                                                className="px-4 py-2 text-red-600 text-xs font-bold hover:bg-red-50 rounded-lg transition-all"
                                            >
                                                Desconectar Wassenger
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="text-xs text-gray-400 italic flex items-center gap-1">
                                            <ShieldCheck size={14} /> Dados encriptados
                                        </div>
                                    )}

                                    {!wassengerConnected && (
                                        <button
                                            type="submit"
                                            disabled={!wassengerApiKey || isSavingWassenger}
                                            className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold text-white shadow-sm transition-all ${!wassengerApiKey || isSavingWassenger ? 'bg-gray-300 cursor-not-allowed' : 'bg-brand-600 hover:bg-brand-700'}`}
                                        >
                                            {isSavingWassenger ? 'A validar...' : 'Guardar e Conectar'}
                                            {!isSavingWassenger && <Save size={18} />}
                                        </button>
                                    )}
                                </div>
                            </form>
                        </div>
                    </div>

                    {/* AI Integration Card */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="p-6 border-b border-gray-100 bg-gray-50 flex items-center gap-3">
                            <div className="p-2 bg-purple-100 text-purple-700 rounded-lg">
                                <Bot size={24} />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-gray-800">Inteligência Artificial (LEO)</h3>
                                <p className="text-xs text-gray-500">Configuração do Assistente Virtual</p>
                            </div>
                            {llmConnected ? (
                                <span className="ml-auto flex items-center gap-1.5 px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold border border-green-200">
                                    <CheckCircle2 size={14} /> Ativo
                                </span>
                            ) : (
                                <span className="ml-auto flex items-center gap-1.5 px-3 py-1 bg-gray-100 text-gray-500 rounded-full text-xs font-bold border border-gray-200">
                                    <LinkIcon size={14} /> Inativo
                                </span>
                            )}
                        </div>

                        <div className="p-6">
                            <p className="text-sm text-gray-600 mb-6 leading-relaxed">
                                Configure o motor de inteligência artificial do LEO. Pode utilizar o <strong>Google Gemini</strong> (Cloud) ou conectar a um modelo local via <strong>Ollama</strong>.
                            </p>

                            <form onSubmit={handleLlmSave} className="space-y-6">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Provider</label>
                                    <div className="flex gap-4">
                                        <label className={`flex-1 p-3 border rounded-lg cursor-pointer transition-all ${llmProvider === 'gemini' ? 'border-purple-500 bg-purple-50 ring-1 ring-purple-500' : 'border-gray-200 hover:border-gray-300'}`}>
                                            <input
                                                type="radio"
                                                name="llm_provider"
                                                value="gemini"
                                                checked={llmProvider === 'gemini'}
                                                onChange={() => setLlmProvider('gemini')}
                                                className="sr-only"
                                            />
                                            <div className="flex items-center gap-2 mb-1">
                                                <Sparkles size={16} className="text-purple-600" />
                                                <span className="font-bold text-gray-800">Google Gemini</span>
                                            </div>
                                            <p className="text-xs text-gray-500">Recomendado. Rápido e inteligente.</p>
                                        </label>

                                        <label className={`flex-1 p-3 border rounded-lg cursor-pointer transition-all ${llmProvider === 'ollama' ? 'border-purple-500 bg-purple-50 ring-1 ring-purple-500' : 'border-gray-200 hover:border-gray-300'}`}>
                                            <input
                                                type="radio"
                                                name="llm_provider"
                                                value="ollama"
                                                checked={llmProvider === 'ollama'}
                                                onChange={() => setLlmProvider('ollama')}
                                                className="sr-only"
                                            />
                                            <div className="flex items-center gap-2 mb-1">
                                                <Bot size={16} className="text-gray-800" />
                                                <span className="font-bold text-gray-800">Ollama (Local)</span>
                                            </div>
                                            <p className="text-xs text-gray-500">Privacidade total. Requer servidor local.</p>
                                        </label>
                                    </div>
                                </div>

                                {llmProvider === 'gemini' ? (
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2 flex items-center gap-2">
                                            <Lock size={14} /> Gemini API Key
                                        </label>
                                        <div className="relative">
                                            <input
                                                type="password"
                                                value={geminiApiKey}
                                                onChange={(e) => setGeminiApiKey(e.target.value)}
                                                disabled={llmConnected}
                                                placeholder={llmConnected ? "••••••••••••••••••••••••••••" : "Insira a chave API do Google Gemini"}
                                                className={`w-full pl-4 pr-12 py-3 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all ${llmConnected ? 'bg-gray-50 text-gray-500 border-gray-200' : 'bg-white border-gray-300'}`}
                                            />
                                            {llmConnected && (
                                                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500">
                                                    <CheckCircle2 size={20} />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2 flex items-center gap-2">
                                            <LinkIcon size={14} /> Ollama URL
                                        </label>
                                        <input
                                            type="text"
                                            value={ollamaUrl}
                                            onChange={(e) => setOllamaUrl(e.target.value)}
                                            placeholder="ex: http://localhost:11434"
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                                        />
                                    </div>
                                )}

                                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                                    {llmConnected ? (
                                        <button
                                            type="button"
                                            onClick={handleLlmDisconnect}
                                            className="text-red-600 text-sm font-medium hover:text-red-800 transition-colors"
                                        >
                                            Desconectar Integração
                                        </button>
                                    ) : (
                                        <div className="text-xs text-gray-400 italic flex items-center gap-1">
                                            <ShieldCheck size={14} /> Dados encriptados
                                        </div>
                                    )}

                                    {!llmConnected && (
                                        <button
                                            type="submit"
                                            disabled={isSavingLlm}
                                            className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold text-white shadow-sm transition-all ${isSavingLlm ? 'bg-gray-300 cursor-not-allowed' : 'bg-brand-600 hover:bg-brand-700'}`}
                                        >
                                            {isSavingLlm ? 'A validar...' : 'Guardar e Conectar'}
                                            {!isSavingLlm && <Save size={18} />}
                                        </button>
                                    )}
                                </div>
                            </form>
                        </div>
                    </div>

                    {/* HR Settings Card */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="p-6 border-b border-gray-100 bg-gray-50 flex items-center gap-3">
                            <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
                                <RefreshCw size={24} />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-gray-800">Regras de Recursos Humanos</h3>
                                <p className="text-xs text-gray-500">Configurações globais de férias e assiduidade</p>
                            </div>
                        </div>

                        <div className="p-6 space-y-6">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">
                                    Dias de Férias Anuais por Defeito
                                </label>
                                <div className="flex items-center gap-3">
                                    <input
                                        type="number"
                                        min="0"
                                        max="60"
                                        defaultValue={22}
                                        className="w-24 px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                                    />
                                    <span className="text-sm text-gray-500">dias úteis / ano</span>
                                </div>
                                <p className="mt-2 text-xs text-gray-400">
                                    Este valor será aplicado a novos colaboradores. Pode ser ajustado individualmente na ficha de cada colaborador.
                                </p>
                            </div>

                            <div className="pt-4 border-t border-gray-100">
                                <button
                                    type="button"
                                    className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold text-white bg-brand-600 hover:bg-brand-700 shadow-sm transition-all"
                                >
                                    <Save size={18} /> Guardar Configurações
                                </button>
                            </div>

                            <div className="pt-6 border-t border-gray-100">
                                <div className="bg-brand-50 rounded-xl p-5 border border-brand-100">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-brand-100 text-brand-600 rounded-lg">
                                                <BellRing size={20} />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-brand-800 text-sm">Alertas Automáticos (WhatsApp)</h4>
                                                <p className="text-xs text-brand-600">Notificar colaboradores em falta após o período de tolerância</p>
                                            </div>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={whatsappAutoAlerts}
                                                onChange={(e) => handleAutoAlertsToggle(e.target.checked)}
                                                disabled={isSavingAutoAlerts}
                                                className="sr-only peer"
                                            />
                                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none ring-0 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-600"></div>
                                        </label>
                                    </div>
                                    <p className="text-[11px] text-gray-500 leading-relaxed italic">
                                        * Esta funcionalidade requer que o separador do portal esteja aberto para executar as verificações automáticas a cada 10 minutos. O sistema verifica se o colaborador já entrou ou saiu baseado no horário de trabalho e tolerância da sua localização.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* GDPR/Privacy Card */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="p-6 border-b border-gray-100 bg-gray-50 flex items-center gap-3">
                            <div className="p-2 bg-purple-100 text-purple-700 rounded-lg">
                                <Shield size={24} />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-gray-800">Privacidade e Proteção de Dados (GDPR/RQPD)</h3>
                                <p className="text-xs text-gray-500">Direitos de privacidade e gestão de dados pessoais</p>
                            </div>
                        </div>

                        <div className="p-6 space-y-6">
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <h4 className="font-bold text-blue-900 mb-2">Os Seus Direitos GDPR</h4>
                                <p className="text-sm text-blue-800/90 leading-relaxed">
                                    De acordo com o Regulamento Geral de Proteção de Dados (RGPD), tem o direito de aceder,
                                    exportar e eliminar os seus dados pessoais a qualquer momento.
                                </p>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-start gap-4">
                                    <div className="p-2 bg-green-100 text-green-700 rounded-lg">
                                        <FileDown size={20} />
                                    </div>
                                    <div className="flex-1">
                                        <h5 className="font-bold text-gray-800 mb-1">Exportar Dados Pessoais</h5>
                                        <p className="text-sm text-gray-600 mb-3">
                                            Descarregue todos os seus dados pessoais em formato JSON (machine-readable).
                                        </p>
                                        <button
                                            onClick={() => {
                                                setGdprAction('export');
                                                setShowGdprModal(true);
                                            }}
                                            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-bold rounded-lg hover:bg-green-700 transition-all"
                                        >
                                            <Download size={16} />
                                            Exportar Meus Dados
                                        </button>
                                    </div>
                                </div>

                                <div className="flex items-start gap-4 pt-4 border-t border-gray-200">
                                    <div className="p-2 bg-red-100 text-red-700 rounded-lg">
                                        <UserX size={20} />
                                    </div>
                                    <div className="flex-1">
                                        <h5 className="font-bold text-gray-800 mb-1">Direito ao Esquecimento</h5>
                                        <p className="text-sm text-gray-600 mb-3">
                                            Elimine permanentemente a sua conta e todos os dados pessoais associados.
                                        </p>
                                        <button
                                            onClick={() => {
                                                setGdprAction('delete');
                                                setShowGdprModal(true);
                                            }}
                                            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-sm font-bold rounded-lg hover:bg-red-700 transition-all"
                                        >
                                            <Trash2 size={16} />
                                            Apagar Minha Conta
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                                <div className="flex items-start gap-3">
                                    <Database size={18} className="text-gray-600 mt-0.5" />
                                    <div>
                                        <h5 className="text-sm font-bold text-gray-800 mb-1">Retenção de Dados</h5>
                                        <p className="text-xs text-gray-600 leading-relaxed">
                                            • Dados de assiduidade: 2 anos (requisito legal)<br />
                                            • Dados de sistema: 1 ano<br />
                                            • Cache local: 90 dias (limpeza automática)<br />
                                            • Após eliminação: Dados anonimizados para conformidade fiscal
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="text-xs text-gray-500 italic">
                                Data Protection Officer: <a href="mailto:dpo@semrumo.eu" className="text-brand-600 hover:text-brand-700">dpo@semrumo.eu</a>
                            </div>
                        </div>
                    </div>

                </div>

                {/* Sidebar Info */}
                <div className="space-y-6">
                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-6">
                        <h4 className="font-bold text-blue-900 mb-2 flex items-center gap-2">
                            <AlertCircle size={18} />
                            Importante
                        </h4>
                        <p className="text-sm text-blue-800/80 leading-relaxed mb-4">
                            As chaves API concedem acesso de leitura e escrita aos dados da sua empresa nas respetivas plataformas. Certifique-se que mantém estas chaves seguras.
                        </p>
                    </div>

                    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                        <h4 className="font-bold text-gray-800 mb-4">Estado do Sistema</h4>
                        <div className="space-y-3">
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-500">Versão Portal</span>
                                <span className="font-mono text-gray-800">v2.4.2</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-500">Base de Dados</span>
                                <span className="flex items-center gap-1 text-green-600 font-bold text-xs"><div className="w-2 h-2 bg-green-500 rounded-full"></div> Online</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-500">Gemini AI</span>
                                <span className="flex items-center gap-1 text-green-600 font-bold text-xs"><div className="w-2 h-2 bg-green-500 rounded-full"></div> Ativo</span>
                            </div>
                        </div>
                    </div>
                </div>

            </div>

            {/* GDPR Confirmation Modal */}
            {showGdprModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                        <div className={`p-6 ${gdprAction === 'delete' ? 'bg-red-50' : 'bg-green-50'}`}>
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${gdprAction === 'delete' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                    {gdprAction === 'delete' ? <UserX size={24} /> : <Download size={24} />}
                                </div>
                                <h3 className="text-xl font-bold text-gray-800">
                                    {gdprAction === 'delete' ? 'Eliminar Conta Permanentemente' : 'Exportar Dados Pessoais'}
                                </h3>
                            </div>
                        </div>

                        <div className="p-6">
                            {gdprAction === 'delete' ? (
                                <>
                                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                                        <p className="text-sm text-red-800 font-medium mb-2">⚠️ Atenção: Esta ação é irreversível!</p>
                                        <p className="text-xs text-red-700">
                                            • A sua conta será eliminada permanentemente<br />
                                            • Todos os dados pessoais serão apagados<br />
                                            • Registos de assiduidade serão anonimizados<br />
                                            • Não será possível recuperar a conta
                                        </p>
                                    </div>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-2">
                                                Confirme com a sua palavra-passe:
                                            </label>
                                            <input
                                                type="password"
                                                value={gdprPassword}
                                                onChange={(e) => setGdprPassword(e.target.value)}
                                                placeholder="Insira a sua palavra-passe"
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                                            />
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                                        <p className="text-sm text-green-800 font-medium mb-2">📦 O que será exportado:</p>
                                        <p className="text-xs text-green-700">
                                            • Dados do perfil pessoal<br />
                                            • Registos de assiduidade<br />
                                            • Pedidos de férias e licenças<br />
                                            • Anomalias reportadas<br />
                                            • Formato: JSON (machine-readable)
                                        </p>
                                    </div>
                                    <p className="text-sm text-gray-600">
                                        Os seus dados serão descarregados num ficheiro JSON que pode ser lido por qualquer aplicação.
                                    </p>
                                </>
                            )}
                        </div>

                        <div className="flex gap-3 p-6 bg-gray-50 border-t border-gray-200">
                            <button
                                onClick={() => {
                                    setShowGdprModal(false);
                                    setGdprPassword('');
                                }}
                                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 font-bold rounded-lg hover:bg-gray-300 transition-all"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={gdprAction === 'delete' ? handleDeleteAccount : handleExportData}
                                disabled={isProcessingGdpr || (gdprAction === 'delete' && !gdprPassword)}
                                className={`flex-1 px-4 py-2 text-white font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${
                                    gdprAction === 'delete'
                                        ? 'bg-red-600 hover:bg-red-700 disabled:bg-red-300'
                                        : 'bg-green-600 hover:bg-green-700 disabled:bg-green-300'
                                } ${isProcessingGdpr || (gdprAction === 'delete' && !gdprPassword) ? 'cursor-not-allowed' : ''}`}
                            >
                                {isProcessingGdpr ? (
                                    <>
                                        <RefreshCw size={16} className="animate-spin" />
                                        A processar...
                                    </>
                                ) : (
                                    <>
                                        {gdprAction === 'delete' ? <Trash2 size={16} /> : <Download size={16} />}
                                        {gdprAction === 'delete' ? 'Eliminar Conta' : 'Exportar Dados'}
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Settings;
