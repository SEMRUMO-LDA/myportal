import React, { useState, useEffect } from 'react';
import { Calendar, Users, Megaphone, UserPlus } from 'lucide-react';
import { supabase } from '../../services/supabaseClient';
import BirthdaysWidget from './BirthdaysWidget';
import AnnouncementsWidget from './AnnouncementsWidget';
import NewColleaguesWidget from './NewColleaguesWidget';
import TeamOnlineWidget from './TeamOnlineWidget';

interface TodayCompanyDashboardProps {
  className?: string;
}

const TodayCompanyDashboard: React.FC<TodayCompanyDashboardProps> = ({ className = '' }) => {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate initial load
    const timer = setTimeout(() => setIsLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return (
      <div className={`w-full ${className}`}>
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-white/5 rounded-xl w-64 mx-auto"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-48 bg-white/5 rounded-2xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full ${className}`}>
      {/* Widgets Grid */}
      <div className="grid grid-cols-1 gap-4 md:gap-5">
        <TeamOnlineWidget />
        <BirthdaysWidget />
        <AnnouncementsWidget />
        <NewColleaguesWidget />
      </div>
    </div>
  );
};

export default TodayCompanyDashboard;
