import React, { useState, useRef, useEffect } from 'react';
import { Bot, X, Send, Sparkles, Loader2, ChevronDown, User as UserIcon, Zap, Calendar, Clock, FileText, Users, ShieldAlert, BarChart3 } from 'lucide-react';
import { generateAIContent } from '../services/geminiService';
import { User } from '../types';

interface LeoAssistantProps {
    currentUser: User | null;
    context?: 'backoffice' | 'kiosk';
    onAction?: (action: LeoAction) => void;
    analyticsContext?: string;
}

export interface LeoAction {
    type: 'navigate' | 'create_absence' | 'clock_in' | 'clock_out' | 'view_profile' | 'request_vacation' | 'view_attendance' | 'send_message';
    payload?: any;
}

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    actions?: LeoAction[];
}

const QUICK_ACTIONS = {
    backoffice: [
        { label: 'Ver pedidos pendentes', icon: FileText, prompt: 'Mostra-me os pedidos de ausência pendentes' },
        { label: 'Quem está de férias?', icon: Calendar, prompt: 'Quem está de férias esta semana?' },
        { label: 'Análise de riscos', icon: ShieldAlert, prompt: 'Quais são os colaboradores com maior risco de burnout e porquê?' },
        { label: 'Resumo semanal', icon: BarChart3, prompt: 'Gera um resumo semanal da situação HR da empresa com recomendações' },
    ],
    kiosk: [
        { label: 'Pedir férias', icon: Calendar, prompt: 'Quero pedir férias' },
        { label: 'Ver meu saldo', icon: Zap, prompt: 'Qual é o meu saldo de férias?' },
        { label: 'Marcar ponto', icon: Clock, prompt: 'Como marco o ponto de entrada?' },
        { label: 'Falar com RH', icon: Users, prompt: 'Preciso de falar com os recursos humanos' },
    ],
};

const SYSTEM_PROMPT = `Tu és o LEO, o assistente virtual do sistema My Profile SEMRUMO. 
Responde sempre em Português de Portugal.
És prestável, simpático e focado em ajudar com tarefas de recursos humanos.
Mantém as respostas curtas e objetivas.

Capacidades do sistema que podes ajudar:
- Gestão de férias e ausências (pedir, ver saldo, aprovar)
- Controlo de assiduidade (picar ponto, ver registos)
- Perfil do colaborador (atualizar dados, ver documentos)
- Mensagens internas
- Despesas e reembolsos
- Relatórios de RH

Quando o utilizador pedir para executar uma ação, responde com a confirmação e indica que a ação será executada.
Usa emojis moderadamente para tornar a conversa mais amigável.`;

const LeoAssistant: React.FC<LeoAssistantProps> = ({ currentUser, context = 'backoffice', onAction, analyticsContext }) => {
    // Hide floating assistant on chat/messages pages to prevent blocking the chat UI
    const isMessagesRoute = typeof window !== 'undefined' &&
        (window.location.hash.includes('messages') || window.location.pathname.includes('messages'));

    if (isMessagesRoute) {
        return null;
    }

    const [isOpen, setIsOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        if (isOpen && !isMinimized) {
            inputRef.current?.focus();
        }
    }, [isOpen, isMinimized]);

    // Initialize with welcome message
    useEffect(() => {
        if (isOpen && messages.length === 0) {
            const welcomeMessage: Message = {
                id: 'welcome',
                role: 'assistant',
                content: `Olá${currentUser ? `, ${currentUser.name.split(' ')[0]}` : ''}! 👋\n\nSou o LEO, o teu assistente virtual. Posso ajudar-te com:\n\n• Gestão de férias e ausências\n• Controlo de assiduidade\n• Informações do teu perfil\n• E muito mais!\n\nComo posso ajudar-te hoje?`,
                timestamp: new Date(),
            };
            setMessages([welcomeMessage]);
        }
    }, [isOpen, currentUser]);

    const getAIResponse = async (userMessage: string): Promise<string> => {
        try {
            const contextInfo = currentUser
                ? `\nContexto do utilizador: Nome: ${currentUser.name}, Cargo: ${currentUser.role}, Departamento: ${currentUser.department}, Empresa: ${currentUser.company}`
                : '';

            const analyticsInfo = analyticsContext
                ? `\n\nDados HR da empresa (usa para responder perguntas sobre analytics, assiduidade, riscos e indicadores):\n${analyticsContext}`
                : '';

            const fullSystemPrompt = `${SYSTEM_PROMPT}${contextInfo}${analyticsInfo}`;

            // Use unified service
            const response = await generateAIContent(fullSystemPrompt, userMessage);
            return response;
        } catch (error) {
            console.error('LEO AI Error:', error);
            return 'Desculpa, ocorreu um erro ao processar o teu pedido. Tenta novamente.';
        }
    };

    const detectActions = (message: string): LeoAction[] => {
        const actions: LeoAction[] = [];
        const lowerMessage = message.toLowerCase();

        if (lowerMessage.includes('férias') && (lowerMessage.includes('pedir') || lowerMessage.includes('marcar'))) {
            actions.push({ type: 'request_vacation' });
        }
        if (lowerMessage.includes('ponto') && lowerMessage.includes('entrada')) {
            actions.push({ type: 'clock_in' });
        }
        if (lowerMessage.includes('ponto') && lowerMessage.includes('saída')) {
            actions.push({ type: 'clock_out' });
        }
        if (lowerMessage.includes('perfil') || lowerMessage.includes('meus dados')) {
            actions.push({ type: 'view_profile' });
        }
        if (lowerMessage.includes('assiduidade') || lowerMessage.includes('presenças')) {
            actions.push({ type: 'view_attendance' });
        }

        return actions;
    };

    const handleSend = async (overrideMessage?: string) => {
        const messageText = overrideMessage || inputValue.trim();
        if (!messageText || isLoading) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: messageText,
            timestamp: new Date(),
        };

        setMessages(prev => [...prev, userMessage]);
        setInputValue('');
        setIsLoading(true);

        try {
            const aiResponse = await getAIResponse(userMessage.content);
            const detectedActions = detectActions(userMessage.content);

            const assistantMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: aiResponse,
                timestamp: new Date(),
                actions: detectedActions.length > 0 ? detectedActions : undefined,
            };

            setMessages(prev => [...prev, assistantMessage]);
        } catch (error) {
            console.error('LEO handleSend Error:', error);
            const errorMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: 'Desculpa, ocorreu um erro inesperado. Tenta novamente. 🔄',
                timestamp: new Date(),
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleQuickAction = (prompt: string) => {
        handleSend(prompt);
    };

    const handleActionClick = (action: LeoAction) => {
        onAction?.(action);
    };

    const quickActions = QUICK_ACTIONS[context];

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-6 right-6 z-50 p-0 bg-transparent rounded-full shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 group"
                title="Falar com LEO"
            >
                <div className="relative">
                    <img
                        src="https://semrumo.eu/app/myportal/leo-avatar.png"
                        alt="LEO"
                        className="w-16 h-16 rounded-full border-4 border-white shadow-lg object-cover"
                    />
                    <span className="absolute bottom-0 right-1 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white animate-pulse" />
                </div>
            </button>
        );
    }

    return (
        <div
            className={`fixed bottom-6 right-6 z-50 bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden transition-all duration-300 ${isMinimized ? 'w-80 h-16' : 'w-96 h-[600px]'
                }`}
        >
            {/* Header */}
            <div
                className="bg-gradient-to-r from-indigo-600 to-purple-600 p-4 flex items-center justify-between cursor-pointer"
                onClick={() => setIsMinimized(!isMinimized)}
            >
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <img
                            src="https://semrumo.eu/app/myportal/leo-avatar.png"
                            alt="LEO"
                            className="w-10 h-10 rounded-full border-2 border-white/20 object-cover bg-white"
                        />
                        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-400 rounded-full border-2 border-indigo-600" />
                    </div>
                    <div>
                        <h3 className="text-white font-bold text-sm">LEO</h3>
                        <p className="text-white/80 text-xs flex items-center gap-1">
                            <Sparkles size={10} /> Assistente AI
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={(e) => { e.stopPropagation(); setIsMinimized(!isMinimized); }}
                        className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                    >
                        <ChevronDown size={18} className={`text-white transition-transform ${isMinimized ? 'rotate-180' : ''}`} />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); setIsOpen(false); }}
                        className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                    >
                        <X size={18} className="text-white" />
                    </button>
                </div>
            </div>

            {!isMinimized && (
                <>
                    {/* Messages Area */}
                    <div className="h-[calc(100%-180px)] overflow-y-auto p-4 space-y-4 bg-gray-50">
                        {messages.map((message) => (
                            <div
                                key={message.id}
                                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} items-end gap-2`}
                            >
                                {message.role === 'assistant' && (
                                    <img
                                        src="https://semrumo.eu/app/myportal/leo-avatar.png"
                                        alt="LEO"
                                        className="w-8 h-8 rounded-full border border-gray-200 object-cover bg-white mb-1 shadow-sm"
                                    />
                                )}
                                <div
                                    className={`max-w-[85%] rounded-2xl px-4 py-3 ${message.role === 'user'
                                        ? 'bg-indigo-600 text-white rounded-br-md'
                                        : 'bg-white text-gray-800 shadow-sm border border-gray-100 rounded-bl-md'
                                        }`}
                                >
                                    {message.role === 'assistant' && (
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider">LEO AI</span>
                                        </div>
                                    )}
                                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>

                                    {/* Action Buttons */}
                                    {message.actions && message.actions.length > 0 && (
                                        <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
                                            {message.actions.map((action, idx) => (
                                                <button
                                                    key={idx}
                                                    onClick={() => handleActionClick(action)}
                                                    className="w-full text-left px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-medium transition-colors flex items-center gap-2"
                                                >
                                                    <Zap size={14} />
                                                    Executar: {action.type.replace(/_/g, ' ')}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}

                        {isLoading && (
                            <div className="flex justify-start">
                                <div className="bg-white rounded-2xl px-4 py-3 shadow-sm border border-gray-100 rounded-bl-md">
                                    <div className="flex items-center gap-2">
                                        <Loader2 size={16} className="animate-spin text-purple-500" />
                                        <span className="text-sm text-gray-500">A pensar...</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div ref={messagesEndRef} />
                    </div>

                    {/* Quick Actions */}
                    <div className="px-4 py-2 bg-white border-t border-gray-100">
                        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
                            {quickActions.map((action, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => handleQuickAction(action.prompt)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-indigo-100 text-gray-700 hover:text-indigo-700 rounded-full text-xs font-medium whitespace-nowrap transition-colors"
                                >
                                    <action.icon size={12} />
                                    {action.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Input Area */}
                    <div className="p-4 bg-white border-t border-gray-100">
                        <form
                            onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                            className="flex items-center gap-2"
                        >
                            <input
                                ref={inputRef}
                                type="text"
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                placeholder="Escreve a tua mensagem..."
                                className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-900 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                                disabled={isLoading}
                            />
                            <button
                                type="submit"
                                disabled={!inputValue.trim() || isLoading}
                                className="p-2.5 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                <Send size={18} />
                            </button>
                        </form>
                    </div>
                </>
            )}
        </div>
    );
};

export default LeoAssistant;
