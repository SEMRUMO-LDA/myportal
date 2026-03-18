import React, { useState, useEffect } from 'react';
import { Users, Wifi } from 'lucide-react';
import { supabase } from '../../services/supabaseClient';
import ExpandableCard from './ExpandableCard';

interface OnlineUser {
  id: number;
  name: string;
  photoUrl?: string;
  department?: string;
}

const TeamOnlineWidget: React.FC = () => {
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [onlineCount, setOnlineCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOnlineUsers();

    // Refresh every 30 seconds
    const interval = setInterval(fetchOnlineUsers, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchOnlineUsers = async () => {
    try {
      const todayStr = new Date().toISOString().split('T')[0];

      // Fetch ALL users who are currently clocked in to get accurate count
      const { data: allData, error: allError } = await supabase
        .from('time_logs')
        .select(`
          user_id,
          users!inner (
            id,
            name,
            photo_url,
            department
          )
        `)
        .eq('date', todayStr)
        .is('check_out', null)
        .order('check_in', { ascending: false });

      if (allError) throw allError;

      if (allData) {
        const allUsers: OnlineUser[] = allData.map((log: any) => ({
          id: log.users.id,
          name: log.users.name,
          photoUrl: log.users.photo_url || undefined,
          department: log.users.department || undefined
        }));

        // Remove duplicates to get unique users
        const uniqueUsers = allUsers.filter((user, index, self) =>
          index === self.findIndex((u) => u.id === user.id)
        );

        // Set the accurate count of unique online users
        setOnlineCount(uniqueUsers.length);

        // For display, only show the first 10 unique users
        setOnlineUsers(uniqueUsers.slice(0, 10));
      }
    } catch (error) {
      console.error('Error fetching online users:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-3xl p-5 h-20 animate-pulse">
        <div className="h-full flex items-center justify-center">
          <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  const collapsedContent = onlineCount === 0
    ? "Ninguém ao serviço"
    : `${onlineCount} ${onlineCount === 1 ? 'colaborador' : 'colaboradores'} ao serviço`;

  const expandedContent = (
    <>
      {onlineCount === 0 ? (
        <div className="text-center py-4">
          <p className="text-white/70 text-sm font-medium mb-1">Ninguém ao serviço</p>
          <p className="text-white/50 text-xs">Será o primeiro hoje? 🌟</p>
        </div>
      ) : (
        <>
          {/* Online Users List */}
          <div className="space-y-2 mb-3">
            {onlineUsers.map(user => (
              <div key={user.id} className="bg-white/20 backdrop-blur-sm rounded-xl p-2.5 border border-white/30 flex items-center gap-2 hover:bg-white/30 transition-colors">
                <div className="relative">
                  {user.photoUrl ? (
                    <img
                      src={user.photoUrl}
                      alt={user.name}
                      className="w-9 h-9 rounded-full border-2 border-white/50 object-cover"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-white/30 flex items-center justify-center">
                      <Users size={18} className="text-white" />
                    </div>
                  )}
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full border-2 border-indigo-700 animate-pulse"></div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-bold truncate">{user.name}</p>
                  {user.department && (
                    <p className="text-white/70 text-xs truncate">{user.department}</p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Live Indicator */}
          <div className="pt-3 border-t border-white/20 flex items-center justify-center gap-2">
            <div className="relative">
              <Wifi size={14} className="text-green-300" />
              <div className="absolute inset-0 animate-ping">
                <Wifi size={14} className="text-green-300 opacity-75" />
              </div>
            </div>
            <p className="text-white/80 text-xs font-bold uppercase tracking-wider">
              Atualização ao vivo
            </p>
          </div>
        </>
      )}
    </>
  );

  return (
    <ExpandableCard
      title="Equipa Online"
      icon={Users}
      count={onlineCount}
      iconColor="bg-indigo-400/30"
      bgGradient="bg-gradient-to-br from-indigo-500 via-indigo-600 to-indigo-700"
      collapsedContent={collapsedContent}
      expandedContent={expandedContent}
      showBadge={onlineCount > 0}
      badgeColor="border-indigo-700"
    />
  );
};

export default TeamOnlineWidget;
