import React, { useState, useEffect } from 'react';
import { Megaphone } from 'lucide-react';
import { supabase } from '../../services/supabaseClient';
import ExpandableCard from './ExpandableCard';

interface Announcement {
  id: number;
  title: string;
  message: string;
  date: string;
  senderName?: string;
}

const AnnouncementsWidget: React.FC = () => {
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      const { data, error } = await supabase
        .from('internal_messages')
        .select('id, subject, message, date, sender:users!internal_messages_sender_id_fkey(name)')
        .eq('is_broadcast', true)
        .order('date', { ascending: false })
        .limit(1);

      if (error) throw error;

      if (data && data.length > 0) {
        const msg = data[0];
        setAnnouncement({
          id: msg.id,
          title: msg.subject || 'Comunicado Geral',
          message: msg.message,
          date: msg.date,
          senderName: msg.sender?.name
        });
      }
    } catch (error) {
      console.error('Error fetching announcements:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-3xl p-5 h-20 animate-pulse">
        <div className="h-full flex items-center justify-center">
          <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  const collapsedContent = announcement
    ? announcement.title.length > 40
      ? announcement.title.substring(0, 40) + '...'
      : announcement.title
    : "Sem anúncios";

  const expandedContent = announcement ? (
    <div className="space-y-3">
      <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 border border-white/30">
        <h4 className="text-white font-black text-base mb-2">{announcement.title}</h4>
        <p className="text-white/90 text-sm leading-relaxed whitespace-pre-wrap">
          {announcement.message}
        </p>
      </div>
      <div className="flex items-center justify-between text-xs text-white/60">
        {announcement.senderName && (
          <span>De: <span className="font-semibold text-white/80">{announcement.senderName}</span></span>
        )}
        <span>{new Date(announcement.date).toLocaleDateString('pt-PT')}</span>
      </div>
    </div>
  ) : (
    <div className="text-center py-4">
      <p className="text-white/70 text-sm font-medium">Sem anúncios recentes</p>
      <p className="text-white/50 text-xs mt-1">Verifique novamente mais tarde 📢</p>
    </div>
  );

  return (
    <ExpandableCard
      title="Anúncios"
      icon={Megaphone}
      count={announcement ? "1" : "0"}
      iconColor="bg-amber-400/30"
      bgGradient="bg-gradient-to-br from-amber-500 via-amber-600 to-amber-700"
      collapsedContent={collapsedContent}
      expandedContent={expandedContent}
    />
  );
};

export default AnnouncementsWidget;
