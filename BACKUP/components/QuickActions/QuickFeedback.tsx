import React, { useState } from 'react';
import { MessageSquare, Star, Send, X, CheckCircle } from 'lucide-react';
import { User } from '../../types';
import { supabase } from '../../services/supabaseClient';
import { useToast } from '../../context/ToastContext';
import QuickActionCard from './QuickActionCard';

interface QuickFeedbackProps {
  user: User;
}

interface FeedbackRatings {
  workEnvironment: number;
  teamCollaboration: number;
  management: number;
}

const QuickFeedback: React.FC<QuickFeedbackProps> = ({ user }) => {
  const [showModal, setShowModal] = useState(false);
  const [ratings, setRatings] = useState<FeedbackRatings>({
    workEnvironment: 0,
    teamCollaboration: 0,
    management: 0
  });
  const [comments, setComments] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { addToast } = useToast();

  const handleRatingClick = (category: keyof FeedbackRatings, value: number) => {
    setRatings(prev => ({ ...prev, [category]: value }));
  };

  const handleSubmit = async () => {
    // Validation
    if (ratings.workEnvironment === 0 || ratings.teamCollaboration === 0 || ratings.management === 0) {
      addToast('error', 'Por favor avalie todas as categorias.');
      return;
    }

    setIsSubmitting(true);

    try {
      // Calculate average rating
      const avgRating = (ratings.workEnvironment + ratings.teamCollaboration + ratings.management) / 3;

      // Submit feedback
      const { error } = await supabase
        .from('feedback')
        .insert({
          user_id: isAnonymous ? null : user.id,
          category: 'GENERAL',
          rating: Math.round(avgRating),
          work_environment_rating: ratings.workEnvironment,
          team_collaboration_rating: ratings.teamCollaboration,
          management_rating: ratings.management,
          comments: comments || null,
          is_anonymous: isAnonymous,
          submitted_at: new Date().toISOString()
        });

      if (error) throw error;

      addToast('success', '✅ Obrigado pelo seu feedback!');

      // Reset form
      setRatings({
        workEnvironment: 0,
        teamCollaboration: 0,
        management: 0
      });
      setComments('');
      setIsAnonymous(false);
      setShowModal(false);
    } catch (error) {
      console.error('Error submitting feedback:', error);
      addToast('error', 'Erro ao enviar feedback.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStarRating = (category: keyof FeedbackRatings, label: string) => {
    const currentRating = ratings[category];

    return (
      <div className="mb-6">
        <label className="block text-sm font-semibold text-gray-700 mb-3">
          {label}
        </label>
        <div className="flex gap-2 justify-center">
          {[1, 2, 3, 4, 5].map(value => (
            <button
              key={value}
              type="button"
              onClick={() => handleRatingClick(category, value)}
              className="transition-all transform hover:scale-110 focus:outline-none"
            >
              <Star
                size={40}
                className={`${
                  value <= currentRating
                    ? 'fill-yellow-400 text-yellow-400'
                    : 'text-gray-300 hover:text-yellow-200'
                } transition-colors`}
              />
            </button>
          ))}
        </div>
        {currentRating > 0 && (
          <p className="text-center text-xs text-gray-600 mt-2">
            {currentRating === 1 && 'Muito Insatisfeito'}
            {currentRating === 2 && 'Insatisfeito'}
            {currentRating === 3 && 'Neutro'}
            {currentRating === 4 && 'Satisfeito'}
            {currentRating === 5 && 'Muito Satisfeito'}
          </p>
        )}
      </div>
    );
  };

  return (
    <>
      <QuickActionCard
        icon={MessageSquare}
        title="Feedback Rápido"
        description="1 minuto"
        color="blue"
        badge="⭐"
        onClick={() => setShowModal(true)}
      />

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl animate-slide-up max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-white p-6 border-b border-gray-100 flex justify-between items-center rounded-t-3xl">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Feedback Rápido</h2>
                <p className="text-sm text-gray-500">Leva apenas 1 minuto</p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              <p className="text-center text-sm text-gray-600 mb-6">
                A sua opinião é importante para melhorarmos continuamente.
              </p>

              {/* Rating Categories */}
              {renderStarRating('workEnvironment', '1. Ambiente de Trabalho')}
              {renderStarRating('teamCollaboration', '2. Colaboração da Equipa')}
              {renderStarRating('management', '3. Gestão e Liderança')}

              {/* Comments (optional) */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Comentários adicionais (opcional)
                </label>
                <textarea
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  placeholder="Partilhe os seus pensamentos ou sugestões..."
                  rows={4}
                  maxLength={500}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all resize-none"
                />
                <p className="text-xs text-gray-500 mt-1 text-right">
                  {comments.length}/500
                </p>
              </div>

              {/* Anonymous toggle */}
              <div className="mb-6 bg-gray-50 rounded-xl p-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isAnonymous}
                    onChange={(e) => setIsAnonymous(e.target.checked)}
                    className="w-5 h-5 text-blue-600 border-2 border-gray-300 rounded focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  />
                  <div>
                    <p className="text-sm font-semibold text-gray-700">
                      Enviar anonimamente
                    </p>
                    <p className="text-xs text-gray-500">
                      O seu nome não será associado a este feedback
                    </p>
                  </div>
                </label>
              </div>

              {/* Info box */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
                <p className="text-xs text-gray-700">
                  <span className="font-semibold">🔒 Confidencial:</span> Todos os feedbacks são tratados com confidencialidade e usados apenas para melhorar o ambiente de trabalho.
                </p>
              </div>

              {/* Actions */}
              <div className="space-y-3">
                <button
                  onClick={handleSubmit}
                  disabled={
                    isSubmitting ||
                    ratings.workEnvironment === 0 ||
                    ratings.teamCollaboration === 0 ||
                    ratings.management === 0
                  }
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl transition-all transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></div>
                      A enviar...
                    </>
                  ) : (
                    <>
                      <Send size={20} />
                      Enviar Feedback
                    </>
                  )}
                </button>

                <button
                  onClick={() => setShowModal(false)}
                  className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 rounded-xl transition-all"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default QuickFeedback;
