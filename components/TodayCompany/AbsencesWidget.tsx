import React, { useState, useEffect } from 'react';
import { Plane, Stethoscope } from 'lucide-react';
import { supabase } from '../../services/supabaseClient';

interface Absence {
  id: number;
  userName: string;
  type: string;
  startDate: string;
  endDate: string;
}

const AbsencesWidget: React.FC = () => {
  const [absences, setAbsences] = useState<Absence[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAbsences();
  }, []);

  const fetchAbsences = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];

      // Get leaves for today
      const { data, error } = await supabase
        .from('leaves')
        .select(`
          id,
          start_date,
          end_date,
          users!inner(name),
          leave_types(name)
        `)
        .eq('status', 'APPROVED')
        .lte('start_date', today)
        .gte('end_date', today)
        .order('start_date', { ascending: false })
        .limit(5);

      if (error) throw error;

      if (data) {
        const absencesData = data.map(leave => ({
          id: leave.id,
          userName: (leave.users as any).name,
          type: (leave.leave_types as any)?.name || 'Ausência',
          startDate: leave.start_date,
          endDate: leave.end_date
        }));

        setAbsences(absencesData);
      }
    } catch (error) {
      console.error('Error fetching absences:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-3xl p-5 min-h-[180px] animate-pulse">
        <div className="h-full flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  const getIcon = (type: string) => {
    if (type.toLowerCase().includes('férias') || type.toLowerCase().includes('ferias')) {
      return <Plane size={24} className="text-white" strokeWidth={2.5} />;
    }
    return <Stethoscope size={24} className="text-white" strokeWidth={2.5} />;
  };

  return (
    <div className="group relative bg-gradient-to-br from-orange-500 via-orange-600 to-orange-700 rounded-3xl p-5 min-h-[180px] shadow-lg hover:shadow-2xl hover:shadow-orange-500/50 transition-all duration-300 hover:scale-105 border border-white/10 overflow-hidden">
      {/* Animated background */}
      <div className="absolute -top-8 -right-8 w-24 h-24 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between mb-4">
        <div className="bg-orange-400/30 backdrop-blur-sm p-3 rounded-2xl shadow-xl border border-white/20">
          <Plane size={24} className="text-white" strokeWidth={2.5} />
        </div>
        <span className="bg-orange-900/80 backdrop-blur-md text-white text-xs font-black px-3 py-1.5 rounded-full shadow-lg border border-white/20">
          {absences.length}
        </span>
      </div>

      {/* Content */}
      <div className="relative z-10">
        <h3 className="text-white text-lg font-black mb-2">Ausentes Hoje</h3>

        {absences.length === 0 ? (
          <p className="text-white/70 text-sm">Todos presentes! 🎉</p>
        ) : (
          <div className="space-y-1.5">
            {absences.slice(0, 3).map(absence => (
              <div key={absence.id} className="bg-white/10 backdrop-blur-sm rounded-lg px-2 py-1.5 border border-white/20">
                <p className="text-white text-sm font-semibold truncate">{absence.userName}</p>
                <p className="text-white/70 text-xs truncate">{absence.type}</p>
              </div>
            ))}
            {absences.length > 3 && (
              <p className="text-white/60 text-xs text-center pt-1">
                +{absences.length - 3} mais
              </p>
            )}
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

export default AbsencesWidget;
