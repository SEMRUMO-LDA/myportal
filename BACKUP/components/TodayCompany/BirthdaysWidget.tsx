import React, { useState, useEffect } from 'react';
import { Cake } from 'lucide-react';
import { supabase } from '../../services/supabaseClient';
import ExpandableCard from './ExpandableCard';

interface Birthday {
  id: number;
  name: string;
  photoUrl?: string;
  dateOfBirth: string;
  age?: number;
  isToday: boolean;
  daysUntil?: number;
}

const BirthdaysWidget: React.FC = () => {
  const [birthdays, setBirthdays] = useState<Birthday[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBirthdays();
  }, []);

  const fetchBirthdays = async () => {
    try {
      const today = new Date();
      const todayMonth = today.getMonth() + 1;
      const todayDay = today.getDate();

      const { data, error } = await supabase
        .from('users')
        .select('id, name, photo_url, birth_date')
        .not('birth_date', 'is', null)
        .eq('status', 'ACTIVE')
        .order('birth_date');

      if (error) throw error;

      if (data) {
        const birthdaysThisWeek = data
          .filter(user => {
            if (!user.birth_date) return false;
            const dob = new Date(user.birth_date + 'T00:00:00');
            const birthMonth = dob.getMonth() + 1;
            const birthDay = dob.getDate();

            const birthDate = new Date(today.getFullYear(), birthMonth - 1, birthDay);
            const diffTime = birthDate.getTime() - today.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            return diffDays >= 0 && diffDays <= 7;
          })
          .map(user => {
            const dob = new Date(user.birth_date! + 'T00:00:00');
            const birthMonth = dob.getMonth() + 1;
            const birthDay = dob.getDate();
            const age = today.getFullYear() - dob.getFullYear();

            const birthDate = new Date(today.getFullYear(), birthMonth - 1, birthDay);
            const diffTime = birthDate.getTime() - today.getTime();
            const daysUntil = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            return {
              id: user.id,
              name: user.name,
              photoUrl: user.photo_url || undefined,
              dateOfBirth: user.birth_date!,
              age,
              isToday: birthMonth === todayMonth && birthDay === todayDay,
              daysUntil
            };
          });

        setBirthdays(birthdaysThisWeek);
      }
    } catch (error) {
      console.error('Error fetching birthdays:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-pink-500 to-pink-600 rounded-3xl p-5 h-20 animate-pulse">
        <div className="h-full flex items-center justify-center">
          <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  const todayBirthdays = birthdays.filter(b => b.isToday);
  const upcomingBirthdays = birthdays.filter(b => !b.isToday);

  const collapsedContent = birthdays.length === 0
    ? "Sem aniversários esta semana"
    : todayBirthdays.length > 0
      ? `🎉 ${todayBirthdays.length} hoje!`
      : `${birthdays.length} esta semana`;

  const expandedContent = (
    <>
      {birthdays.length === 0 ? (
        <div className="text-center py-4">
          <p className="text-white/70 text-sm font-medium">Sem aniversários esta semana</p>
          <p className="text-white/50 text-xs mt-1">Próxima celebração em breve 🎂</p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Today's Birthdays */}
          {todayBirthdays.length > 0 && (
            <div className="bg-white/30 backdrop-blur-sm rounded-xl p-3 border border-white/40">
              <p className="text-white text-xs font-black mb-2 uppercase tracking-wide">🎉 Hoje:</p>
              <div className="space-y-2">
                {todayBirthdays.map(b => (
                  <div key={b.id} className="flex items-center gap-2">
                    {b.photoUrl && (
                      <img
                        src={b.photoUrl}
                        alt={b.name}
                        className="w-8 h-8 rounded-full border-2 border-white/50 object-cover"
                      />
                    )}
                    <div className="flex-1">
                      <p className="text-white text-sm font-bold truncate">{b.name}</p>
                      <p className="text-white/80 text-xs">{b.age} anos</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Upcoming Birthdays */}
          {upcomingBirthdays.length > 0 && (
            <div>
              <p className="text-white/70 text-xs font-bold mb-2 uppercase tracking-wide">Próximos 7 dias:</p>
              <div className="space-y-2">
                {upcomingBirthdays.map(b => (
                  <div key={b.id} className="bg-white/20 backdrop-blur-sm rounded-xl p-2.5 border border-white/30 flex items-center justify-between hover:bg-white/30 transition-colors">
                    <div className="flex items-center gap-2 flex-1">
                      {b.photoUrl && (
                        <img
                          src={b.photoUrl}
                          alt={b.name}
                          className="w-8 h-8 rounded-full border-2 border-white/50 object-cover"
                        />
                      )}
                      <p className="text-white text-sm font-semibold truncate">{b.name}</p>
                    </div>
                    <span className="text-white/70 text-xs font-medium whitespace-nowrap ml-2">
                      {b.daysUntil === 1 ? 'Amanhã' : `${b.daysUntil} dias`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );

  return (
    <ExpandableCard
      title="Aniversários"
      icon={Cake}
      count={birthdays.length}
      iconColor="bg-pink-400/30"
      bgGradient="bg-gradient-to-br from-pink-500 via-pink-600 to-pink-700"
      collapsedContent={collapsedContent}
      expandedContent={expandedContent}
      showBadge={todayBirthdays.length > 0}
      badgeColor="border-pink-700"
    />
  );
};

export default BirthdaysWidget;
