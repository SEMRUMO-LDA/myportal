import React, { useState } from 'react';
import { User, SurveyType } from '../types';
import { Sparkles, X, CheckCircle2, Rocket, Smile, Zap, AlertTriangle, Send } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { useToast } from '../context/ToastContext';

interface ShiftPulseModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  onSuccess?: () => void;
}

const MOODS = [
  {
    rating: 5,
    emoji: '🚀',
    label: 'Excelente',
    desc: 'Super produtivo e positivo',
    color: 'from-emerald-500/20 to-teal-500/10 border-emerald-500/30 text-emerald-300 hover:border-emerald-400'
  },
  {
    rating: 4,
    emoji: '😊',
    label: 'Tranquilo',
    desc: 'Dia bom, dentro do previsto',
    color: 'from-blue-500/20 to-indigo-500/10 border-blue-500/30 text-blue-300 hover:border-blue-400'
  },
  {
    rating: 3,
    emoji: '⚡',
    label: 'Intenso',
    desc: 'Corrido e cansativo',
    color: 'from-amber-500/20 to-yellow-500/10 border-amber-500/30 text-amber-300 hover:border-amber-400'
  },
  {
    rating: 2,
    emoji: '🛑',
    label: 'Difícil',
    desc: 'Com obstáculos ou sobrecarga',
    color: 'from-rose-500/20 to-red-500/10 border-rose-500/30 text-rose-300 hover:border-rose-400'
  }
];

const QUICK_TAGS = [
  'Equipa 5 estrelas',
  'Dia muito produtivo',
  'Ritmo calmo',
  'Pico de afluência',
  'Falta de material/apoio',
  'Cansaço acumulado'
];

export const ShiftPulseModal: React.FC<ShiftPulseModalProps> = ({
  isOpen,
  onClose,
  user,
  onSuccess
}) => {
  const { addToast } = useToast();
  const [selectedRating, setSelectedRating] = useState<number | null>(null);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [comment, setComment] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (overrideRating?: number) => {
    const ratingToUse = overrideRating ?? selectedRating;
    if (!ratingToUse || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const feedbackParts: string[] = [];
      if (selectedTag) feedbackParts.push(selectedTag);
      if (comment.trim()) feedbackParts.push(comment.trim());

      const feedback = feedbackParts.length > 0 ? feedbackParts.join(' | ') : null;

      const { error } = await supabase.from('survey_responses').insert({
        user_id: user.id,
        survey_type: 'WEEKLY_PULSE' as SurveyType,
        reference_date: today,
        rating: ratingToUse,
        feedback: feedback
      });

      if (error && error.code !== '23505') {
        console.warn('[ShiftPulse] Error submitting pulse:', error);
      }

      setIsCompleted(true);
      addToast('success', '✨ Obrigado pela partilha! Tem um excelente descanso.');
      if (onSuccess) onSuccess();

      setTimeout(() => {
        setIsCompleted(false);
        setSelectedRating(null);
        setSelectedTag(null);
        setComment('');
        onClose();
      }, 1500);
    } catch (e) {
      console.error('[ShiftPulse] Exception:', e);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectMood = (rating: number) => {
    setSelectedRating(rating);
    // Auto-submit after selection if user doesn't feel like typing tags
    setTimeout(() => {
      handleSubmit(rating);
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-[#0a1628]/95 border border-blue-500/20 rounded-3xl p-6 sm:p-8 shadow-2xl overflow-hidden">
        {/* Ambient Top Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-24 bg-gradient-to-b from-blue-500/15 to-transparent blur-2xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white p-2 rounded-xl hover:bg-white/5 transition-colors"
          title="Fechar"
        >
          <X size={20} />
        </button>

        {isCompleted ? (
          <div className="py-8 flex flex-col items-center justify-center text-center animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 mb-4 shadow-lg shadow-emerald-500/10">
              <CheckCircle2 size={36} />
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">Turno Concluído!</h3>
            <p className="text-sm text-slate-300">
              Obrigado pelo teu feedback, <span className="font-semibold text-white">{user.name.split(' ')[0]}</span>. Bom descanso! ✨
            </p>
          </div>
        ) : (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="p-1.5 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30">
                <Sparkles size={16} />
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-blue-400">
                Shift-Pulse • Saída de Turno
              </span>
            </div>

            <h3 className="text-2xl font-bold text-white mb-2">
              Como correu o teu turno hoje?
            </h3>
            <p className="text-xs text-slate-400 mb-6">
              A tua energia conta. 1 toque rápido para acompanharmos o ritmo da equipa.
            </p>

            {/* 4 Mood Cards */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              {MOODS.map(m => {
                const isSelected = selectedRating === m.rating;
                return (
                  <button
                    key={m.rating}
                    onClick={() => handleSelectMood(m.rating)}
                    disabled={isSubmitting}
                    className={`relative p-4 rounded-2xl border bg-gradient-to-br transition-all duration-200 text-left flex flex-col justify-between active:scale-[0.97] ${m.color} ${
                      isSelected ? 'ring-2 ring-white/60 scale-[1.02] shadow-lg' : 'hover:scale-[1.01]'
                    }`}
                  >
                    <div className="text-3xl mb-2">{m.emoji}</div>
                    <div>
                      <div className="text-sm font-bold text-white">{m.label}</div>
                      <div className="text-[11px] text-slate-400 leading-snug">{m.desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Quick Micro Tags (Optional) */}
            <div className="mb-5">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Motivo principal (opcional)
              </div>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_TAGS.map(tag => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setSelectedTag(prev => prev === tag ? null : tag)}
                    className={`text-xs px-2.5 py-1 rounded-full border transition-all ${
                      selectedTag === tag
                        ? 'bg-blue-600 border-blue-400 text-white font-semibold'
                        : 'bg-[#10233b]/60 border-[#1e3a5f] text-slate-300 hover:border-slate-400'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Footer Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-white/5">
              <button
                type="button"
                onClick={onClose}
                className="text-xs text-slate-400 hover:text-white transition-colors"
              >
                Saltar por agora
              </button>

              <button
                type="button"
                onClick={() => handleSubmit()}
                disabled={!selectedRating || isSubmitting}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-30 disabled:hover:bg-blue-600 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-lg shadow-blue-600/30"
              >
                <Send size={13} />
                Gravar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
