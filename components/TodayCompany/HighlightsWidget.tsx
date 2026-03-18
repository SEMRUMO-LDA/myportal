import React, { useState, useEffect } from 'react';
import { Trophy, Star, Award } from 'lucide-react';
import { supabase } from '../../services/supabaseClient';

interface Highlight {
  id: number;
  userName: string;
  achievement: string;
  type: 'performance' | 'milestone' | 'recognition';
  date: string;
}

const HighlightsWidget: React.FC = () => {
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHighlights();
  }, []);

  const fetchHighlights = async () => {
    try {
      // For now, we'll create mock highlights based on recent data
      // In production, you'd have a dedicated highlights/achievements table

      const today = new Date();
      const thirtyDaysAgo = new Date(today);
      thirtyDaysAgo.setDate(today.getDate() - 30);

      // Get users with perfect attendance this month
      const { data: attendanceData, error: attendanceError } = await supabase
        .from('time_logs')
        .select('user_id, users(name)')
        .gte('date', thirtyDaysAgo.toISOString().split('T')[0])
        .is('anomaly_id', null)
        .order('date', { ascending: false });

      if (!attendanceError && attendanceData) {
        // Count perfect attendance
        const userAttendance: { [key: number]: { name: string; count: number } } = {};

        attendanceData.forEach((log: any) => {
          if (!userAttendance[log.user_id]) {
            userAttendance[log.user_id] = {
              name: log.users.name,
              count: 0
            };
          }
          userAttendance[log.user_id].count++;
        });

        // Get top performers
        const topPerformers = Object.entries(userAttendance)
          .sort((a, b) => b[1].count - a[1].count)
          .slice(0, 2)
          .map(([userId, data], index) => ({
            id: parseInt(userId),
            userName: data.name,
            achievement: index === 0 ? '⭐ Melhor Assiduidade do Mês' : '✨ Excelente Assiduidade',
            type: 'performance' as const,
            date: new Date().toISOString()
          }));

        setHighlights(topPerformers);
      }
    } catch (error) {
      console.error('Error fetching highlights:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-3xl p-5 min-h-[180px] animate-pulse">
        <div className="h-full flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  const getIconForType = (type: string) => {
    switch (type) {
      case 'performance':
        return <Trophy size={24} className="text-white" strokeWidth={2.5} />;
      case 'milestone':
        return <Award size={24} className="text-white" strokeWidth={2.5} />;
      default:
        return <Star size={24} className="text-white" strokeWidth={2.5} />;
    }
  };

  return (
    <div className="group relative bg-gradient-to-br from-yellow-500 via-yellow-600 to-yellow-700 rounded-3xl p-5 min-h-[180px] shadow-lg hover:shadow-2xl hover:shadow-yellow-500/50 transition-all duration-300 hover:scale-105 border border-white/10 overflow-hidden">
      {/* Animated background */}
      <div className="absolute -top-8 -right-8 w-24 h-24 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between mb-4">
        <div className="bg-yellow-400/30 backdrop-blur-sm p-3 rounded-2xl shadow-xl border border-white/20">
          <Trophy size={24} className="text-white" strokeWidth={2.5} />
        </div>
        <span className="bg-yellow-900/80 backdrop-blur-md text-white text-xs font-black px-3 py-1.5 rounded-full shadow-lg border border-white/20">
          {highlights.length}
        </span>
      </div>

      {/* Content */}
      <div className="relative z-10">
        <h3 className="text-white text-lg font-black mb-2">Destaques</h3>

        {highlights.length === 0 ? (
          <p className="text-white/70 text-sm">Sem destaques recentes</p>
        ) : (
          <div className="space-y-2">
            {highlights.map(highlight => (
              <div key={highlight.id} className="bg-white/20 backdrop-blur-sm rounded-xl p-2.5 border border-white/30">
                <p className="text-white text-sm font-bold truncate">{highlight.userName}</p>
                <p className="text-white/90 text-xs mt-0.5 leading-snug">{highlight.achievement}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom accent */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
        <div className="h-full bg-white/40 w-0 group-hover:w-full transition-all duration-500"></div>
      </div>
    </div>
  );
};

export default HighlightsWidget;
