import React, { useState } from 'react';
import { User, SurveyType } from '../types';
import { Heart, Send, CheckCircle2 } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { useToast } from '../context/ToastContext';

interface PulseSurveyWidgetProps {
    user: User;
    onSuccess: () => void;
}

const PulseSurveyWidget: React.FC<PulseSurveyWidgetProps> = ({ user, onSuccess }) => {
    const { addToast } = useToast();
    const [rating, setRating] = useState<number>(0);
    const [feedback, setFeedback] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    // Determinar número de estrelas e labels
    const getRatingLabel = (val: number) => {
        switch (val) {
            case 1: return 'Muito Mal 😞';
            case 2: return 'Mal 🙁';
            case 3: return 'Razoável 😐';
            case 4: return 'Bem 🙂';
            case 5: return 'Excelente 🤩';
            default: return '';
        }
    };

    const handleSubmit = async () => {
        if (rating === 0 || isSubmitting) return;
        setIsSubmitting(true);

        try {
            // Calcular a data de referência (ex: segunda-feira desta semana para agrupar)
            const now = new Date();
            const day = now.getDay();
            const diff = now.getDate() - day + (day === 0 ? -6 : 1); // segunda-feira
            const monday = new Date(now.setDate(diff));
            const referenceDate = monday.toISOString().split('T')[0];

            const { error } = await supabase.from('survey_responses').insert({
                user_id: user.id,
                survey_type: 'WEEKLY_PULSE' as SurveyType,
                rating: rating,
                feedback: feedback || null,
                reference_date: referenceDate,
            });

            if (error) {
                // Ignorar duplicados silenciosamente para o user caso ele submeta duas vezes
                if (error.code === '23505') {
                    setSubmitted(true);
                    onSuccess();
                } else {
                    console.error('Survey error:', error);
                    addToast('error', 'Erro ao submeter inquérito.');
                }
            } else {
                setSubmitted(true);
                setTimeout(() => onSuccess(), 3000); // Esconde passados 3 segundos
            }
        } catch (err) {
            console.error(err);
            addToast('error', 'Erro inesperado.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (submitted) {
        return (
            <div className="w-full bg-blue-900/40 backdrop-blur-md rounded-2xl p-6 border border-blue-500/20 shadow-xl flex flex-col items-center justify-center text-center animate-fade-in-up">
                <CheckCircle2 size={48} className="text-green-400 mb-3" />
                <h3 className="text-xl font-bold text-white mb-1">Obrigado pelo feedback!</h3>
                <p className="text-blue-200 text-sm">A tua opinião ajuda-nos a melhorar. Boa semana!</p>
            </div>
        );
    }

    return (
        <div className="w-full bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-[#3b82f6]/30 shadow-2xl relative overflow-hidden group transition-all animate-zoom-in">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Heart size={80} />
            </div>

            <div className="relative z-10 text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                    <Heart size={18} className="text-pink-400 fill-pink-400" />
                    <h3 className="text-sm font-bold tracking-widest text-pink-300 uppercase">Perguntamos-te</h3>
                </div>
                <h2 className="text-xl font-bold text-white mb-6">Como te sentes esta semana?</h2>

                <div className="flex justify-center gap-2 mb-3">
                    {[1, 2, 3, 4, 5].map((val) => (
                        <button
                            key={val}
                            onClick={() => setRating(val)}
                            className={`w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center text-2xl md:text-3xl transition-all ${rating === val
                                    ? 'bg-blue-500 text-white scale-110 shadow-lg shadow-blue-500/50'
                                    : 'bg-white/5 hover:bg-white/10 text-gray-400 border border-white/5'
                                }`}
                        >
                            {val === 1 && '😞'}
                            {val === 2 && '🙁'}
                            {val === 3 && '😐'}
                            {val === 4 && '🙂'}
                            {val === 5 && '🤩'}
                        </button>
                    ))}
                </div>
                <p className="text-sm font-bold text-blue-300 h-5 mb-6">{rating > 0 ? getRatingLabel(rating) : ''}</p>

                {rating > 0 && (
                    <div className="space-y-4 animate-fade-in-up">
                        <textarea
                            className="w-full bg-[#0B2147]/50 border-2 border-white/10 hover:border-blue-500/50 focus:border-blue-500 rounded-xl p-3 text-white placeholder-blue-300/50 focus:outline-none transition-all resize-none text-sm"
                            rows={2}
                            placeholder="(Opcional) Queres partilhar o porquê?"
                            value={feedback}
                            onChange={(e) => setFeedback(e.target.value)}
                        ></textarea>

                        <button
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                            className="w-full bg-blue-600 hover:bg-blue-500 text-white rounded-xl py-3 font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50 shadow-lg shadow-blue-600/20"
                        >
                            <Send size={18} />
                            {isSubmitting ? 'A submeter...' : 'Enviar Resposta'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PulseSurveyWidget;
