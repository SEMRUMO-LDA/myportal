import React, { useState } from 'react';
import { User, AnonymousFeedbackCategory } from '../types';
import { Send, Shield, AlertCircle, MessageSquare, Info, CheckCircle2 } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { useToast } from '../context/ToastContext';

interface EmployeeFeedbackProps {
    user: User;
}

const EmployeeFeedback: React.FC<EmployeeFeedbackProps> = ({ user }) => {
    const { addToast } = useToast();
    const [category, setCategory] = useState<AnonymousFeedbackCategory>('SUGGESTION');
    const [content, setContent] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!content.trim()) {
            addToast('error', 'Por favor, escreve a tua mensagem.');
            return;
        }

        setIsSubmitting(true);
        try {
            // Nota: O user_id NÃO é gravado para manter o anonimato
            const { error } = await supabase.from('anonymous_feedback').insert({
                category,
                content: content.trim(),
                status: 'NEW'
            });

            if (error) throw error;

            setSubmitted(true);
            addToast('success', 'Mensagem enviada com sucesso!');

            // Limpar form após 3 segundos
            setTimeout(() => {
                setSubmitted(false);
                setContent('');
                setCategory('SUGGESTION');
            }, 3000);

        } catch (err) {
            console.error('Feedback error:', err);
            addToast('error', 'Ocorreu um erro ao enviar a mensagem.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6 pb-24">
            <div className="flex items-center gap-3 mb-8">
                <div className="bg-purple-100 p-3 rounded-xl">
                    <Shield className="w-8 h-8 text-purple-600" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Canal de Feedback Anónimo</h1>
                    <p className="text-gray-500">A tua voz é importante para construirmos uma empresa melhor.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                {/* Information Panel */}
                <div className="md:col-span-1 space-y-4">
                    <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 text-blue-800">
                        <div className="flex gap-3 mb-2">
                            <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                            <h3 className="font-bold">100% Anónimo</h3>
                        </div>
                        <p className="text-sm text-blue-700/80 pl-8">
                            Nenhum dado pessoal (nome, cargo, ou ID) é registado com esta mensagem. Podes expressar-te livremente.
                        </p>
                    </div>

                    <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
                        <h3 className="font-bold text-gray-900 mb-3 text-sm uppercase tracking-wider">Como funciona?</h3>
                        <ul className="space-y-3 text-sm text-gray-600">
                            <li className="flex gap-2">
                                <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold font-mono">1</div>
                                <span>Escreves a tua sugestão ou preocupação.</span>
                            </li>
                            <li className="flex gap-2">
                                <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold font-mono">2</div>
                                <span>A equipa de RH recebe e analisa.</span>
                            </li>
                            <li className="flex gap-2">
                                <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold font-mono">3</div>
                                <span>Medidas são tomadas para melhorar o clima da equipa.</span>
                            </li>
                        </ul>
                    </div>
                </div>

                {/* Feedback Form */}
                <div className="md:col-span-2">
                    {submitted ? (
                        <div className="bg-white border text-center border-green-100 rounded-2xl p-10 h-full flex flex-col items-center justify-center">
                            <CheckCircle2 size={64} className="text-green-500 mb-4" />
                            <h2 className="text-2xl font-bold text-gray-900 mb-2">Mensagem Enviada!</h2>
                            <p className="text-gray-500">Obrigado por ajudares a melhorar a nossa organização.</p>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-gray-100">

                            <div className="mb-6">
                                <label className="block text-sm font-bold text-gray-700 mb-3">Qual é o tema principal?</label>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setCategory('SUGGESTION')}
                                        className={`p-4 rounded-xl border-2 text-left transition-all ${category === 'SUGGESTION'
                                            ? 'border-blue-500 bg-blue-50'
                                            : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'
                                            }`}
                                    >
                                        <MessageSquare size={20} className={category === 'SUGGESTION' ? 'text-blue-600 mb-2' : 'text-gray-400 mb-2'} />
                                        <span className={`block font-bold text-sm ${category === 'SUGGESTION' ? 'text-blue-900' : 'text-gray-600'}`}>Sugestão de Melhoria</span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setCategory('CONCERN')}
                                        className={`p-4 rounded-xl border-2 text-left transition-all ${category === 'CONCERN'
                                            ? 'border-red-500 bg-red-50'
                                            : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'
                                            }`}
                                    >
                                        <AlertCircle size={20} className={category === 'CONCERN' ? 'text-red-600 mb-2' : 'text-gray-400 mb-2'} />
                                        <span className={`block font-bold text-sm ${category === 'CONCERN' ? 'text-red-900' : 'text-gray-600'}`}>Preocupação / Alerta</span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setCategory('OTHER')}
                                        className={`p-4 rounded-xl border-2 text-left transition-all ${category === 'OTHER'
                                            ? 'border-purple-500 bg-purple-50'
                                            : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'
                                            }`}
                                    >
                                        <Info size={20} className={category === 'OTHER' ? 'text-purple-600 mb-2' : 'text-gray-400 mb-2'} />
                                        <span className={`block font-bold text-sm ${category === 'OTHER' ? 'text-purple-900' : 'text-gray-600'}`}>Outro Assunto</span>
                                    </button>
                                </div>
                            </div>

                            <div className="mb-6">
                                <label className="block text-sm font-bold text-gray-700 mb-2">A tua mensagem</label>
                                <textarea
                                    value={content}
                                    onChange={(e) => setContent(e.target.value)}
                                    placeholder="Partilha de forma construtiva a tua perspetiva..."
                                    className="w-full h-40 p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none resize-none transition-all"
                                    required
                                />
                                <p className="text-xs text-gray-400 mt-2 text-right">{content.length} caracteres</p>
                            </div>

                            <div className="flex justify-end pt-4 border-t border-gray-100">
                                <button
                                    type="submit"
                                    disabled={isSubmitting || !content.trim()}
                                    className="bg-gray-900 hover:bg-gray-800 disabled:bg-gray-300 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 transition-all active:scale-95"
                                >
                                    <Send size={18} />
                                    {isSubmitting ? 'A enviar...' : 'Enviar Feedback Anónimo'}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

export default EmployeeFeedback;
