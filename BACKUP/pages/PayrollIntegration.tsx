
import React, { useState } from 'react';
import SearchableSelect from '../components/SearchableSelect';
import { User } from '../types';
import { Download, Calendar, MapPin, User as UserIcon, Building2, Star, Save, Lock, MessageCircle, CheckCircle2, LinkIcon, ShieldCheck, Bot, Sparkles, Server, RefreshCw } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import Header from '../components/Header';
import { getSettings, saveSetting } from '../services/settingsService';
import { wassengerService } from '../services/wassengerService';

interface IntegrationsProps {
    users: User[];
}

const Integrations: React.FC<IntegrationsProps> = ({ users }) => {
    const { addToast } = useToast();

    // ============================================
    // STATE: PAYROLL
    // ============================================
    const [startDate, setStartDate] = useState<string>('2026-01-01');
    const [endDate, setEndDate] = useState<string>('2026-01-31');
    const [location, setLocation] = useState<string>('');
    const [selectedUserId, setSelectedUserId] = useState<number | ''>('');
    const [software, setSoftware] = useState<string>('Primavera');
    const [isDownloading, setIsDownloading] = useState(false);

    // ============================================
    // STATE: WASSENGER
    // ============================================
    const [wassengerApiKey, setWassengerApiKey] = useState('');
    const [wassengerConnected, setWassengerConnected] = useState(false);
    const [isSavingWassenger, setIsSavingWassenger] = useState(false);

    // ============================================
    // STATE: LEO AI (LLM)
    // ============================================
    const [llmProvider, setLlmProvider] = useState<'gemini' | 'openrouter'>('gemini');
    const [geminiApiKey, setGeminiApiKey] = useState(import.meta.env.VITE_GEMINI_API_KEY || '');
    const [openRouterKey, setOpenRouterKey] = useState('');
    const [llmConnected, setLlmConnected] = useState(!!import.meta.env.VITE_GEMINI_API_KEY);
    const [isSavingLlm, setIsSavingLlm] = useState(false);
    const [isLoadingSettings, setIsLoadingSettings] = useState(true);

    // ============================================
    // LOAD SETTINGS (ON MOUNT)
    // ============================================
    React.useEffect(() => {
        const loadSettings = async () => {
            setIsLoadingSettings(true);
            const settings = await getSettings(['wassenger_key', 'gemini_key', 'openrouter_key', 'llm_provider']);

            if (settings['wassenger_key']) {
                setWassengerApiKey(settings['wassenger_key']);
                setWassengerConnected(true);
            }

            if (settings['llm_provider']) {
                setLlmProvider(settings['llm_provider'] as 'gemini' | 'openrouter');
            }

            if (settings['gemini_key']) {
                setGeminiApiKey(settings['gemini_key']);
                if (settings['llm_provider'] === 'gemini') setLlmConnected(true);
            }

            if (settings['openrouter_key']) {
                setOpenRouterKey(settings['openrouter_key']);
                if (settings['llm_provider'] === 'openrouter') setLlmConnected(true);
            }

            setIsLoadingSettings(false);
        };
        loadSettings();
    }, []);


    // ============================================
    // HANDLERS: PAYROLL
    // ============================================
    const handleDownload = (e: React.FormEvent) => {
        e.preventDefault();
        setIsDownloading(true);

        setTimeout(() => {
            setIsDownloading(false);
            addToast('success', 'Ficheiro de integração gerado com sucesso!');

            const element = document.createElement("a");
            const file = new Blob([`EXPORT_DATE: ${new Date().toISOString()}\nSOFTWARE: ${software}\nPERIOD: ${startDate} to ${endDate}\nLOCATION: ${location || 'ALL'}\nUSER: ${selectedUserId || 'ALL'}\n\nDATA_RECORD_1|${startDate}|...`], { type: 'text/plain' });
            element.href = URL.createObjectURL(file);
            element.download = `integracao_${software.toLowerCase()}_${startDate}_${endDate}.txt`;
            document.body.appendChild(element);
            element.click();
        }, 1500);
    };

    // ============================================
    // HANDLERS: WASSENGER
    // ============================================
    const handleWassengerSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!wassengerApiKey) return;
        setIsSavingWassenger(true);

        const success = await saveSetting('wassenger_key', wassengerApiKey);

        if (success) {
            setWassengerConnected(true);
            addToast('success', 'Integração Wassenger guardada e ativa.');
        } else {
            addToast('error', 'Erro ao guardar configuração na base de dados.');
        }
        setIsSavingWassenger(false);
    };

    const handleWassengerDisconnect = async () => {
        if (confirm('Tem a certeza que deseja remover a integração Wassenger?')) {
            await saveSetting('wassenger_key', ''); // Clear in DB
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

    // ============================================
    // HANDLERS: LEO AI
    // ============================================
    const handleLlmSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (llmProvider === 'gemini' && !geminiApiKey) return;
        if (llmProvider === 'openrouter' && !openRouterKey) return;

        setIsSavingLlm(true);

        // Save Provider choice
        await saveSetting('llm_provider', llmProvider);

        // Save Keys
        let success = false;
        if (llmProvider === 'gemini') {
            success = await saveSetting('gemini_key', geminiApiKey);
        } else {
            success = await saveSetting('openrouter_key', openRouterKey);
        }

        if (success) {
            setLlmConnected(true);
            addToast('success', `LEO AI configurado com sucesso usando ${llmProvider === 'gemini' ? 'Google Gemini' : 'OpenRouter (Livre)'}.`);
        } else {
            addToast('error', 'Erro ao guardar configurações AI na base de dados.');
        }
        setIsSavingLlm(false);
    };

    const handleLlmDisconnect = async () => {
        if (confirm('Tem a certeza que deseja desconectar a integração AI?')) {
            // Optional: Clear keys in DB or just provider
            await saveSetting('llm_provider', '');

            setGeminiApiKey('');
            setOpenRouterKey('');
            setLlmConnected(false);
            addToast('info', 'Integração AI desconectada.');
        }
    };


    return (
        <div className="p-8 w-full max-w-6xl mx-auto pb-20 animate-fade-in">
            <Header title="Hub de Integrações" subtitle="Gerir conexões externas, AI e exportações" />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

                {/* LEFT COLUMN: AI & COMMUNICATION */}
                <div className="space-y-8">

                    {/* LEO AI CARD */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="p-6 border-b border-gray-100 bg-gray-50 flex items-center gap-3">
                            <div className="p-2 bg-gradient-to-br from-purple-100 to-indigo-100 text-indigo-600 rounded-lg">
                                <Bot size={24} />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                    Assistente LEO <span className="bg-indigo-100 text-indigo-700 text-[10px] px-2 py-0.5 rounded-full">AI BETA</span>
                                </h3>
                                <p className="text-xs text-gray-500">Cérebro do assistente virtual</p>
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
                                Configure o "cérebro" do LEO. Pode usar a infraestrutura da Google (Gemini) ou o OpenRouter para aceder a modelos gratuitos (ex: Microsoft Phi, Llama).
                            </p>

                            <form onSubmit={handleLlmSave} className="space-y-5">
                                {/* Provider Selector */}
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Modelo AI</label>
                                    <div className="flex bg-gray-100 p-1 rounded-lg">
                                        <button
                                            type="button"
                                            onClick={() => setLlmProvider('gemini')}
                                            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-bold transition-all ${llmProvider === 'gemini' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                        >
                                            <Sparkles size={16} /> Google Gemini
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setLlmProvider('openrouter')}
                                            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-bold transition-all ${llmProvider === 'openrouter' ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                        >
                                            <Server size={16} /> OpenRouter (Free)
                                        </button>
                                    </div>
                                </div>

                                {/* Dynamic Input */}
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2 flex items-center gap-2">
                                        {llmProvider === 'gemini' ? <><Lock size={14} /> Gemini API Key</> : <><Lock size={14} /> OpenRouter API Key</>}
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="password"
                                            value={llmProvider === 'gemini' ? geminiApiKey : openRouterKey}
                                            onChange={(e) => llmProvider === 'gemini' ? setGeminiApiKey(e.target.value) : setOpenRouterKey(e.target.value)}
                                            disabled={llmConnected || isLoadingSettings}
                                            placeholder={llmProvider === 'gemini' ? "••••••••••••••••" : "sk-or-v1-..."}
                                            className={`w-full pl-4 pr-12 py-3 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all ${llmConnected ? 'bg-gray-50 text-gray-500 border-gray-200' : 'bg-white border-gray-300'}`}
                                        />
                                        {llmConnected && (
                                            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500">
                                                <CheckCircle2 size={20} />
                                            </div>
                                        )}
                                    </div>
                                    <p className="mt-2 text-xs text-gray-400">
                                        {llmProvider === 'gemini'
                                            ? "Obtenha a chave gratuita no Google AI Studio."
                                            : "Chave API gratuita em openrouter.ai. O modelo usado será 'google/gemini-2.0-flash-001'."}
                                    </p>
                                </div>

                                <div className="flex items-center justify-between pt-2">
                                    {llmConnected && (
                                        <button type="button" onClick={handleLlmDisconnect} className="text-red-500 text-xs font-bold hover:underline">
                                            Desconectar
                                        </button>
                                    )}
                                    {!llmConnected && (
                                        <button type="submit" disabled={isSavingLlm} className="ml-auto bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold py-2 px-6 rounded-lg transition-colors flex items-center gap-2">
                                            {isSavingLlm ? '...' : <><Save size={16} /> Guardar</>}
                                        </button>
                                    )}
                                </div>
                            </form>
                        </div>
                    </div>


                    {/* WASSENGER CARD */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="p-6 border-b border-gray-100 bg-gray-50 flex items-center gap-3">
                            <div className="p-2 bg-green-100 text-green-700 rounded-lg">
                                <MessageCircle size={24} />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-gray-800">Wassenger API</h3>
                                <p className="text-xs text-gray-500">Gateway WhatsApp</p>
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
                            <form onSubmit={handleWassengerSave} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2 flex items-center gap-2">
                                        <Lock size={14} /> Chave API
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="password"
                                            value={wassengerApiKey}
                                            onChange={(e) => setWassengerApiKey(e.target.value)}
                                            disabled={wassengerConnected || isLoadingSettings}
                                            placeholder={wassengerConnected ? "••••••••••••••••" : "Chave da API Wassenger"}
                                            className={`w-full pl-4 pr-12 py-3 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all ${wassengerConnected ? 'bg-gray-50 text-gray-500 border-gray-200' : 'bg-white border-gray-300'}`}
                                        />
                                        {wassengerConnected && (
                                            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500">
                                                <CheckCircle2 size={20} />
                                            </div>
                                        )}
                                    </div>
                                </div>
                                {!wassengerConnected && (
                                    <div className="flex justify-end">
                                        <button type="submit" disabled={isSavingWassenger} className="bg-green-600 hover:bg-green-700 text-white text-sm font-bold py-2 px-6 rounded-lg transition-colors flex items-center gap-2">
                                            {isSavingWassenger ? '...' : <><Save size={16} /> Conectar</>}
                                        </button>
                                    </div>
                                )}
                                {wassengerConnected && (
                                    <div className="flex items-center gap-4 mt-4 pt-4 border-t border-gray-100">
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
                                            className="text-red-500 text-xs font-bold hover:underline"
                                        >
                                            Remover Conexão
                                        </button>
                                    </div>
                                )}
                            </form>
                        </div>
                    </div>

                </div>

                {/* RIGHT COLUMN: PAYROLL EXPORT */}
                <div className="space-y-8">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden h-full">
                        <div className="p-6 border-b border-gray-100 bg-gray-50 flex items-center gap-4">
                            <div className="bg-brand-600 p-2.5 rounded-lg text-white shadow-sm ring-4 ring-brand-50/50">
                                <Download size={24} />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-gray-800">Exportação Salarial</h2>
                                <p className="text-xs text-gray-500">Gerar ficheiro para contabilidade</p>
                            </div>
                        </div>

                        <form onSubmit={handleDownload} className="p-8 space-y-6">
                            {/* PERIOD */}
                            <div>
                                <label className="block text-sm font-bold text-gray-600 mb-2">
                                    Período Processamento <span className="text-red-500">*</span>
                                </label>
                                <div className="flex gap-4">
                                    <div className="relative flex-1">
                                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                        <input
                                            type="date"
                                            required
                                            value={startDate}
                                            onChange={(e) => setStartDate(e.target.value)}
                                            className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all text-center text-sm"
                                        />
                                    </div>
                                    <div className="relative flex-1">
                                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                        <input
                                            type="date"
                                            required
                                            value={endDate}
                                            onChange={(e) => setEndDate(e.target.value)}
                                            className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all text-center text-sm"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* LOCATION */}
                            <div>
                                <label className="block text-sm font-bold text-gray-600 mb-2">
                                    Local (Filtrar)
                                </label>
                                <div className="relative">
                                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                    <select
                                        value={location}
                                        onChange={(e) => setLocation(e.target.value)}
                                        className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all text-sm"
                                    >
                                        <option value="">Todos os Locais</option>
                                        <option value="sede">Sede - Lisboa</option>
                                        <option value="filial">Filial - Porto</option>
                                    </select>
                                </div>
                            </div>

                            {/* USER */}
                            <div>
                                <label className="block text-sm font-bold text-gray-600 mb-2">
                                    Colaborador (Opcional)
                                </label>
                                <div className="relative">
                                    <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                    <SearchableSelect
                                        options={[
                                            { id: '', label: 'Todos os Colaboradores' },
                                            ...users.map(u => ({
                                                id: u.id,
                                                label: u.name,
                                                sublabel: u.role
                                            }))
                                        ]}
                                        value={selectedUserId || ''}
                                        onChange={(id) => setSelectedUserId(id ? Number(id) : '')}
                                        placeholder="Pesquisar colaborador..."
                                        className="w-full"
                                    />
                                </div>
                            </div>

                            {/* SOFTWARE */}
                            <div>
                                <label className="block text-sm font-bold text-gray-600 mb-2">
                                    Formato de Destino <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                    <select
                                        required
                                        value={software}
                                        onChange={(e) => setSoftware(e.target.value)}
                                        className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all text-sm font-bold text-gray-700"
                                    >
                                        <option value="Primavera">Primavera V10</option>
                                        <option value="PHC">PHC CS</option>
                                        <option value="Sage">Sage 50c</option>
                                        <option value="TocOnline">TocOnline (CSV)</option>
                                    </select>
                                </div>
                            </div>


                            <div className="pt-6 mt-auto">
                                <button
                                    type="submit"
                                    disabled={isDownloading}
                                    className="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold py-4 px-8 rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5 flex items-center justify-center gap-3"
                                >
                                    {isDownloading ? (
                                        <>A processar...</>
                                    ) : (
                                        <>
                                            <Download size={20} /> Exportar Ficheiro
                                        </>
                                    )}
                                </button>
                                <p className="text-center text-xs text-gray-400 mt-4">
                                    O ficheiro será descarregado automaticamente após o processamento.
                                </p>
                            </div>

                        </form>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default Integrations;
