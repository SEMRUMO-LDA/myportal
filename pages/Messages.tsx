import React, { useState, useEffect, useRef, useMemo } from 'react';
import Header from '../components/Header';
import { InternalMessage, User, TimeLog, Leave } from '../types';
import {
  MessageSquare,
  Send,
  Search,
  User as UserIcon,
  Users,
  Check,
  CheckCheck,
  Phone,
  Plus,
  Sparkles,
  Inbox,
  AlertCircle,
  Building2,
  Mail,
  ChevronLeft,
  Filter,
  MessageCircle,
  Shield,
  Circle,
  Coffee,
  TreePalm,
  Clock
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { wassengerService } from '../services/wassengerService';
import { supabase } from '../services/supabaseClient';
import { getRoleDisplayName } from '../utils/authUtils';

interface MessagesProps {
  currentUser?: User;
  users: User[];
  messages: InternalMessage[];
  timeLogs?: TimeLog[];
  leaves?: Leave[];
  onSendMessage: (messages: InternalMessage[]) => void;
  onMarkRead: (id: string) => void;
}

// Subtle Web Audio sound for new incoming live chat messages
const playChatNotificationSound = () => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.08); // A5
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.18);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.18);
  } catch {
    // AudioContext blocked by browser autoplay policy
  }
};

const Messages: React.FC<MessagesProps> = ({
  currentUser,
  users = [],
  messages = [],
  timeLogs = [],
  leaves = [],
  onSendMessage,
  onMarkRead
}) => {
  const { addToast } = useToast();

  // Mode: 'CHAT' (Live Chat) vs 'ANNOUNCEMENTS' (Comunicados Oficiais)
  const [activeMode, setActiveMode] = useState<'CHAT' | 'ANNOUNCEMENTS'>('CHAT');

  // Active chat state
  const [selectedContactId, setSelectedContactId] = useState<number | null>(null);
  const [chatInput, setChatInput] = useState('');
  const [searchContactTerm, setSearchContactTerm] = useState('');
  const [contactFilter, setContactFilter] = useState<'ALL' | 'WORKING' | 'BREAK' | 'ON_LEAVE' | 'UNREAD' | 'DEPARTMENT' | 'MANAGEMENT'>('ALL');
  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);

  // Local live messages merged from props + realtime broadcasts
  const [liveMessages, setLiveMessages] = useState<InternalMessage[]>(messages);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const channelRef = useRef<any>(null);
  const selectedContactIdRef = useRef<number | null>(selectedContactId);
  const onMarkReadRef = useRef(onMarkRead);
  onMarkReadRef.current = onMarkRead;

  useEffect(() => {
    selectedContactIdRef.current = selectedContactId;
  }, [selectedContactId]);

  // Sync with prop updates
  useEffect(() => {
    setLiveMessages(prev => {
      const map = new Map<string, InternalMessage>();
      prev.forEach(m => map.set(m.id, m));
      messages.forEach(m => map.set(m.id, m));
      return Array.from(map.values()).sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );
    });
  }, [messages]);

  // Fallback currentUser if not passed
  const effectiveUser = useMemo(() => {
    return currentUser || users[0] || null;
  }, [currentUser, users]);

  // Persistent Realtime Supabase Broadcast channel setup
  useEffect(() => {
    if (!effectiveUser) return;

    const channel = supabase.channel('myportal-live-chat', {
      config: { broadcast: { self: false } }
    });
    channelRef.current = channel;

    channel
      .on('broadcast', { event: 'chat_message' }, async (payload: any) => {
        const msg = payload?.payload as InternalMessage;
        if (!msg) return;

        // Check if message is for the current user
        if (Number(msg.receiverId) === Number(effectiveUser.id)) {
          playChatNotificationSound();

          setLiveMessages(prev => {
            if (prev.some(m => m.id === msg.id || (m.date === msg.date && m.content === msg.content && Number(m.senderId) === Number(msg.senderId)))) {
              return prev;
            }
            return [msg, ...prev];
          });

          // If current conversation is open with sender, mark as read immediately
          if (selectedContactIdRef.current && Number(selectedContactIdRef.current) === Number(msg.senderId)) {
            onMarkReadRef.current(msg.id);
            try {
              await supabase.from('internal_messages').update({ read: true }).eq('id', msg.id);
            } catch (e) {
              console.warn('Error marking read in DB:', e);
            }
            channelRef.current?.send({
              type: 'broadcast',
              event: 'message_read',
              payload: { messageId: msg.id }
            });
            setLiveMessages(prev => prev.map(m => m.id === msg.id ? { ...m, read: true } : m));
          } else {
            addToast('info', `💬 ${msg.senderName}: "${msg.content.slice(0, 35)}${msg.content.length > 35 ? '...' : ''}"`);
          }
        }
      })
      .on('broadcast', { event: 'message_read' }, (payload: any) => {
        const { messageId } = payload?.payload || {};
        if (messageId) {
          setLiveMessages(prev => prev.map(m => m.id === messageId ? { ...m, read: true } : m));
        }
      })
      .subscribe((status: string) => {
        console.log('[LiveChat] Supabase Realtime channel status:', status);
      });

    // 2-second polling fallback so dropped packets or background tabs never miss messages
    const pollInterval = setInterval(async () => {
      try {
        const { data, error } = await supabase
          .from('internal_messages')
          .select('*')
          .or(`receiver_id.eq.${effectiveUser.id},sender_id.eq.${effectiveUser.id}`)
          .order('date', { ascending: false })
          .limit(100);

        if (!error && data) {
          const mapped: InternalMessage[] = data.map((d: any) => ({
            id: d.id.toString(),
            senderId: d.sender_id || 'SYSTEM',
            senderName: d.sender_name || 'Desconhecido',
            receiverId: d.receiver_id,
            subject: d.subject || '💬 Chat',
            content: d.content || '',
            date: d.date,
            read: d.read,
            priority: d.priority || 'NORMAL'
          }));

          setLiveMessages(prev => {
            const map = new Map<string, InternalMessage>();
            for (const m of [...prev, ...mapped]) {
              map.set(m.id, m);
            }
            return Array.from(map.values()).sort(
              (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
            );
          });
        }
      } catch {
        // Silent poll error
      }
    }, 2000);

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      clearInterval(pollInterval);
    };
  }, [effectiveUser?.id, addToast]);

  // Team presence calculation for today
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  const getContactTeamStatus = (contactId: number) => {
    const userLog = (timeLogs || []).find(l => Number(l.userId) === contactId && l.date === todayStr);
    if (userLog && userLog.checkIn && !userLog.checkOut) {
      if (userLog.breakStart && !userLog.breakEnd) {
        return {
          status: 'BREAK' as const,
          label: 'Em Pausa',
          detail: `Pausa às ${userLog.breakStart.slice(0, 5)}`,
          badgeColor: 'bg-amber-100 text-amber-800 border-amber-300',
          dotColor: 'bg-amber-500',
          isOnline: true
        };
      }
      return {
        status: 'WORKING' as const,
        label: 'Ao Serviço',
        detail: `Desde as ${userLog.checkIn.slice(0, 5)}`,
        badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
        dotColor: 'bg-emerald-500',
        isOnline: true
      };
    }
    if (userLog && userLog.checkOut) {
      return {
        status: 'OFFLINE' as const,
        label: 'Terminou Serviço',
        detail: `Saída às ${userLog.checkOut.slice(0, 5)}`,
        badgeColor: 'bg-gray-100 text-gray-600 border-gray-200',
        dotColor: 'bg-gray-400',
        isOnline: false
      };
    }
    const onLeave = (leaves || []).find(
      l => Number(l.userId) === contactId &&
      (l.status === 'APPROVED' || l.status?.toLowerCase() === 'approved') &&
      todayStr >= l.startDate && todayStr <= l.endDate
    );
    if (onLeave) {
      return {
        status: 'ON_LEAVE' as const,
        label: 'De Férias / Ausente',
        detail: `Até ${new Date(onLeave.endDate + 'T00:00:00').toLocaleDateString('pt-PT')}`,
        badgeColor: 'bg-blue-100 text-blue-800 border-blue-300',
        dotColor: 'bg-blue-500',
        isOnline: false
      };
    }
    return {
      status: 'OFFLINE' as const,
      label: 'Fora de Serviço',
      detail: 'Offline',
      badgeColor: 'bg-gray-100 text-gray-500 border-gray-200',
      dotColor: 'bg-gray-300',
      isOnline: false
    };
  };

  // Selected contact entity
  const selectedContact = useMemo(() => {
    if (!selectedContactId) return null;
    return users.find(u => u.id === selectedContactId) || null;
  }, [selectedContactId, users]);

  // Selected contact live presence status
  const selectedContactStatus = useMemo(() => {
    if (!selectedContactId) return null;
    return getContactTeamStatus(selectedContactId);
  }, [selectedContactId, timeLogs, leaves, todayStr]);

  // Chronological messages for currently active conversation
  const activeConversationMessages = useMemo(() => {
    if (!selectedContactId || !effectiveUser) return [];
    return liveMessages
      .filter(m =>
        (Number(m.senderId) === selectedContactId && Number(m.receiverId) === Number(effectiveUser.id)) ||
        (Number(m.senderId) === Number(effectiveUser.id) && Number(m.receiverId) === selectedContactId)
      )
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [liveMessages, selectedContactId, effectiveUser?.id]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (activeMode === 'CHAT' && selectedContactId) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeConversationMessages.length, selectedContactId, activeMode]);

  // Select contact & auto-mark their unread messages as read
  const handleSelectContact = async (contactId: number) => {
    setSelectedContactId(contactId);

    if (effectiveUser) {
      const unreadFromContact = liveMessages.filter(
        m => Number(m.senderId) === contactId && Number(m.receiverId) === Number(effectiveUser.id) && !m.read
      );

      if (unreadFromContact.length > 0) {
        const unreadIds = unreadFromContact.map(m => m.id);

        try {
          await supabase.from('internal_messages').update({ read: true }).in('id', unreadIds);
        } catch (e) {
          console.warn('Error marking read in DB:', e);
        }

        setLiveMessages(prev => prev.map(m => unreadIds.includes(m.id) ? { ...m, read: true } : m));

        unreadIds.forEach(id => onMarkReadRef.current(id));

        unreadIds.forEach(id => {
          channelRef.current?.send({
            type: 'broadcast',
            event: 'message_read',
            payload: { messageId: id }
          });
        });
      }
    }

    // Auto-focus input
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  };

  // Send Live Chat message
  const handleSendChatMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!chatInput.trim() || !selectedContactId || !effectiveUser) return;

    const contact = selectedContact;
    if (!contact) return;

    const messageText = chatInput.trim();
    setChatInput('');

    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const nowIso = new Date().toISOString();

    const newChatMessage: InternalMessage = {
      id: tempId,
      senderId: effectiveUser.id,
      senderName: effectiveUser.name,
      receiverId: contact.id,
      subject: '💬 Chat',
      content: messageText,
      date: nowIso,
      read: false,
      priority: 'NORMAL'
    };

    // 1. Optimistic UI update
    setLiveMessages(prev => [newChatMessage, ...prev]);

    // 2. Realtime broadcast (delivers in < 30ms over the active channel)
    channelRef.current?.send({
      type: 'broadcast',
      event: 'chat_message',
      payload: newChatMessage
    });

    // 3. Persist to Supabase Database
    try {
      const { data, error } = await supabase.from('internal_messages').insert({
        sender_id: effectiveUser.id,
        sender_name: effectiveUser.name,
        receiver_id: contact.id,
        subject: '💬 Chat',
        content: messageText,
        date: nowIso,
        read: false,
        priority: 'NORMAL'
      }).select().single();

      if (!error && data) {
        setLiveMessages(prev => prev.map(m => m.id === tempId ? { ...m, id: data.id.toString() } : m));
      }
    } catch (err) {
      console.error('[LiveChat] Error persisting message:', err);
    }
  };

  // Format relative timestamp for chat list
  const formatListTimestamp = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();

    if (isToday) {
      return d.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
    }

    const yesterday = new Date();
    yesterday.setDate(now.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) {
      return 'Ontem';
    }

    return d.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' });
  };

  // Contacts list calculation (all colleagues except current user)
  const contactsList = useMemo(() => {
    if (!effectiveUser) return [];

    return users
      .filter(u => u.id !== effectiveUser.id)
      .map(contact => {
        // Find messages with this contact
        const contactMsgs = liveMessages.filter(m =>
          (Number(m.senderId) === contact.id && Number(m.receiverId) === Number(effectiveUser.id)) ||
          (Number(m.senderId) === Number(effectiveUser.id) && Number(m.receiverId) === contact.id)
        );

        const latestMsg = contactMsgs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0] || null;

        const unreadCount = liveMessages.filter(
          m => Number(m.senderId) === contact.id && Number(m.receiverId) === Number(effectiveUser.id) && !m.read
        ).length;

        const isManagement = contact.role === 'ADMIN' || contact.role === 'Administrador' || contact.department?.toLowerCase().includes('rh');
        const isSameDept = contact.department && contact.department === effectiveUser.department;

        return {
          ...contact,
          latestMsg,
          unreadCount,
          isManagement,
          isSameDept,
          teamStatus: getContactTeamStatus(contact.id)
        };
      })
      .filter(contact => {
        // Search term
        if (searchContactTerm) {
          const s = searchContactTerm.toLowerCase();
          const matchName = contact.name.toLowerCase().includes(s);
          const matchDept = (contact.department || '').toLowerCase().includes(s);
          const matchRole = (contact.role || '').toLowerCase().includes(s);
          if (!matchName && !matchDept && !matchRole) return false;
        }

        // Category filter
        if (contactFilter === 'UNREAD') return contact.unreadCount > 0;
        if (contactFilter === 'MANAGEMENT') return contact.isManagement;
        if (contactFilter === 'DEPARTMENT') return contact.isSameDept;
        if (contactFilter === 'WORKING') return contact.teamStatus.status === 'WORKING' || contact.teamStatus.status === 'BREAK';
        if (contactFilter === 'BREAK') return contact.teamStatus.status === 'BREAK';
        if (contactFilter === 'ON_LEAVE') return contact.teamStatus.status === 'ON_LEAVE';
        return true;
      })
      .sort((a, b) => {
        // Prioritize contacts with unread messages
        if (a.unreadCount > 0 && b.unreadCount === 0) return -1;
        if (b.unreadCount > 0 && a.unreadCount === 0) return 1;

        // Prioritize contacts with recent messages
        if (a.latestMsg && !b.latestMsg) return -1;
        if (!a.latestMsg && b.latestMsg) return 1;
        if (a.latestMsg && b.latestMsg) {
          return new Date(b.latestMsg.date).getTime() - new Date(a.latestMsg.date).getTime();
        }

        return a.name.localeCompare(b.name);
      });
  }, [users, effectiveUser, liveMessages, searchContactTerm, contactFilter]);

  // Total unread chat count
  const totalUnreadChatCount = useMemo(() => {
    if (!effectiveUser) return 0;
    return liveMessages.filter(m => Number(m.receiverId) === Number(effectiveUser.id) && !m.read).length;
  }, [liveMessages, effectiveUser?.id]);

  // --- ANNOUNCEMENTS / OFFICIAL MEMOS STATE ---
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<InternalMessage | null>(null);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [searchAnnouncementTerm, setSearchAnnouncementTerm] = useState('');
  const [sendType, setSendType] = useState<'INDIVIDUAL' | 'GROUP'>('INDIVIDUAL');
  const [toUser, setToUser] = useState<string>('');
  const [targetCompany, setTargetCompany] = useState<string>('ALL');
  const [subject, setSubject] = useState('');
  const [messageContent, setMessageContent] = useState('');
  const [priority, setPriority] = useState<'NORMAL' | 'HIGH'>('NORMAL');
  const [sendWhatsApp, setSendWhatsApp] = useState(false);

  // Filtered announcements
  const filteredAnnouncements = useMemo(() => {
    return liveMessages
      .filter(m => m.subject !== '💬 Chat') // Announcements have subjects other than live chat
      .filter(msg => {
        const matchesSearch =
          msg.subject.toLowerCase().includes(searchAnnouncementTerm.toLowerCase()) ||
          msg.senderName.toLowerCase().includes(searchAnnouncementTerm.toLowerCase()) ||
          msg.content.toLowerCase().includes(searchAnnouncementTerm.toLowerCase());

        let matchesUser = true;
        if (effectiveUser) {
          matchesUser = Number(msg.receiverId) === Number(effectiveUser.id) || Number(msg.senderId) === Number(effectiveUser.id);
        }
        return matchesSearch && matchesUser;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [liveMessages, searchAnnouncementTerm, effectiveUser]);

  // Send official announcement
  const handleSendAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();

    const newMessages: InternalMessage[] = [];
    const date = new Date().toISOString();
    const senderId = effectiveUser ? effectiveUser.id : 'SYSTEM';
    const senderName = effectiveUser ? effectiveUser.name : 'Admin RH';

    let targetUsers: User[] = [];
    if (sendType === 'INDIVIDUAL') {
      const target = users.find(u => u.id === Number(toUser));
      if (target) targetUsers = [target];
    } else {
      if (targetCompany === 'ALL') {
        targetUsers = users.filter(u => u.id !== effectiveUser?.id);
      } else {
        targetUsers = users.filter(u => u.company === targetCompany && u.id !== effectiveUser?.id);
      }
    }

    if (targetUsers.length === 0) {
      addToast('warning', 'Não foram encontrados destinatários para o critério selecionado.');
      return;
    }

    targetUsers.forEach((target, index) => {
      newMessages.push({
        id: `msg-${Date.now()}-${index}`,
        senderId,
        senderName,
        receiverId: target.id,
        subject,
        content: messageContent,
        date,
        read: false,
        priority
      });
    });

    onSendMessage(newMessages);
    setIsComposeOpen(false);

    // Reset Form
    setToUser('');
    setSubject('');
    setMessageContent('');
    setPriority('NORMAL');
    setSendWhatsApp(false);
    setSendType('INDIVIDUAL');
    setTargetCompany('ALL');

    addToast('success', `Comunicado enviado para ${targetUsers.length} colaborador(es).`);

    // WhatsApp integration
    if (sendWhatsApp) {
      try {
        await wassengerService.loadConfig();
        if (wassengerService.isConfigured()) {
          for (const target of targetUsers) {
            const num = target.mobilePhone || target.phone;
            if (num) {
              await wassengerService.sendMessage(num, `📢 *${subject}*\n\n${messageContent}`);
            }
          }
          addToast('success', 'Disparo de WhatsApp enviado com sucesso.');
        }
      } catch (err) {
        console.error('WhatsApp failed:', err);
      }
    }
  };

  return (
    <div className="p-3 md:p-6 w-full h-[calc(100vh-4.5rem)] md:h-[calc(100vh-2rem)] flex flex-col">
      <Header
        title="Live Chat & Comunicação"
        subtitle={effectiveUser ? `Conectado como ${effectiveUser.name}` : 'Comunicação interna em tempo real'}
        hideControls={!!effectiveUser}
      />

      {/* Top Mode Segmented Bar */}
      <div className="bg-white p-1.5 rounded-2xl shadow-xs border border-gray-200 mb-4 flex items-center justify-between">
        <div className="flex bg-gray-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveMode('CHAT')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
              activeMode === 'CHAT'
                ? 'bg-white text-gray-900 shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <MessageSquare size={16} className={activeMode === 'CHAT' ? 'text-brand-600' : 'text-gray-400'} />
            <span>Live Chat</span>
            {totalUnreadChatCount > 0 && (
              <span className="px-2 py-0.5 text-xs bg-brand-600 text-white font-bold rounded-full animate-pulse">
                {totalUnreadChatCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveMode('ANNOUNCEMENTS')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
              activeMode === 'ANNOUNCEMENTS'
                ? 'bg-white text-gray-900 shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Mail size={16} className={activeMode === 'ANNOUNCEMENTS' ? 'text-brand-600' : 'text-gray-400'} />
            <span>Comunicados Oficiais</span>
            {filteredAnnouncements.some(a => !a.read && Number(a.receiverId) === Number(effectiveUser?.id)) && (
              <span className="w-2 h-2 rounded-full bg-red-500" />
            )}
          </button>
        </div>

        {activeMode === 'ANNOUNCEMENTS' && (
          <button
            onClick={() => setIsComposeOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all"
          >
            <Plus size={15} />
            <span>Novo Comunicado</span>
          </button>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODE 1: LIVE CHAT VIEW                                                   */}
      {/* ========================================================================= */}
      {activeMode === 'CHAT' && (
        <div className="flex-1 min-h-0 bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col md:flex-row">
          {/* LEFT COLUMN: Contacts & Conversations */}
          <div
            className={`w-full md:w-80 lg:w-96 flex flex-col border-r border-gray-200 bg-gray-50/50 ${
              selectedContactId ? 'hidden md:flex' : 'flex'
            }`}
          >
            {/* Header & Search */}
            <div className="p-3.5 border-b border-gray-200 bg-white space-y-2.5">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
                  <MessageSquare className="text-brand-600" size={18} />
                  <span>Conversas</span>
                </h3>
                <span className="text-xs font-semibold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                  Live
                </span>
              </div>

              {/* Search bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
                <input
                  type="text"
                  placeholder="Pesquisar colega ou cargo..."
                  value={searchContactTerm}
                  onChange={(e) => setSearchContactTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-gray-100/80 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-brand-500 font-medium"
                />
              </div>

              {/* Quick filter chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
                {[
                  { id: 'ALL', label: 'Todos', icon: null },
                  { id: 'WORKING', label: '🟢 Ao Serviço', icon: null },
                  { id: 'ON_LEAVE', label: '🏖️ Ausentes', icon: null },
                  { id: 'UNREAD', label: 'Não Lidas', icon: null },
                  { id: 'DEPARTMENT', label: 'Meu Depto', icon: null }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setContactFilter(tab.id as any)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all ${
                      contactFilter === tab.id
                        ? 'bg-gray-900 text-white shadow-xs'
                        : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Contacts list */}
            <div className="flex-1 overflow-y-auto divide-y divide-gray-100 bg-white">
              {contactsList.length === 0 ? (
                <div className="p-8 text-center text-gray-400 text-xs">
                  Nenhum colega encontrado com este filtro.
                </div>
              ) : (
                contactsList.map(contact => {
                  const isSelected = selectedContactId === contact.id;
                  const hasUnread = contact.unreadCount > 0;

                  return (
                    <div
                      key={contact.id}
                      onClick={() => handleSelectContact(contact.id)}
                      className={`p-3.5 flex items-center gap-3 cursor-pointer transition-colors relative ${
                        isSelected
                          ? 'bg-brand-50/80 border-l-4 border-l-brand-600'
                          : hasUnread
                          ? 'bg-amber-50/40 hover:bg-gray-50'
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      {/* Avatar with active indicator */}
                      <div className="relative flex-shrink-0">
                        <img
                          src={contact.photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(contact.name)}&background=0D8ABC&color=fff`}
                          alt={contact.name}
                          className="w-11 h-11 rounded-full object-cover border border-gray-200"
                        />
                        <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${contact.teamStatus.dotColor}`} title={contact.teamStatus.label} />
                      </div>

                      {/* Contact Info & snippet */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <h4 className={`text-sm truncate ${hasUnread ? 'font-extrabold text-gray-900' : 'font-bold text-gray-800'}`}>
                            {contact.name}
                          </h4>
                          {contact.latestMsg && (
                            <span className="text-[11px] text-gray-400 flex-shrink-0">
                              {formatListTimestamp(contact.latestMsg.date)}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs text-gray-500 truncate">
                            {contact.latestMsg ? (
                              <span>
                                {Number(contact.latestMsg.senderId) === Number(effectiveUser?.id) && (
                                  <span className="text-brand-600 font-semibold mr-1">Tu:</span>
                                )}
                                {contact.latestMsg.content}
                              </span>
                            ) : (
                              <span className="text-gray-400 italic">
                                {contact.department || getRoleDisplayName(contact.role)}
                              </span>
                            )}
                          </p>

                          {hasUnread && (
                            <span className="flex-shrink-0 w-5 h-5 bg-brand-600 text-white text-[10px] font-extrabold rounded-full flex items-center justify-center shadow-xs">
                              {contact.unreadCount}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: Active Chat Conversation */}
          <div className={`flex-1 flex flex-col bg-[#F8FAFC] ${!selectedContactId ? 'hidden md:flex' : 'flex'}`}>
            {selectedContact ? (
              <div className="flex flex-col h-full">
                {/* Chat Top Bar */}
                <div className="px-4 py-3 bg-white border-b border-gray-200 flex items-center justify-between gap-3 shadow-xs">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setSelectedContactId(null)}
                      className="md:hidden p-1.5 -ml-1 text-gray-500 hover:text-gray-800 rounded-lg hover:bg-gray-100"
                    >
                      <ChevronLeft size={20} />
                    </button>

                    <div className="relative">
                      <img
                        src={selectedContact.photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedContact.name)}&background=0D8ABC&color=fff`}
                        alt={selectedContact.name}
                        className="w-10 h-10 rounded-full object-cover border border-gray-200"
                      />
                      <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white ${selectedContactStatus?.dotColor || 'bg-gray-300'}`} />
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-gray-900 text-sm md:text-base leading-tight">
                          {selectedContact.name}
                        </h3>
                        {selectedContact.isManagement && (
                          <span className="px-2 py-0.5 bg-brand-100 text-brand-800 text-[10px] font-bold rounded-md">
                            RH / Gestão
                          </span>
                        )}
                      </div>
                      <p className={`text-xs font-medium flex items-center gap-1.5 ${selectedContactStatus?.isOnline ? 'text-emerald-600' : 'text-gray-500'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${selectedContactStatus?.dotColor || 'bg-gray-300'}`} />
                        <span>{selectedContactStatus?.label || 'Offline'} · {selectedContact.department || getRoleDisplayName(selectedContact.role)}</span>
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    {(selectedContact.mobilePhone || selectedContact.phone) && (
                      <a
                        href={`https://wa.me/${(selectedContact.mobilePhone || selectedContact.phone)?.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors border border-emerald-200"
                        title="Abrir no WhatsApp"
                      >
                        <MessageCircle size={18} />
                      </a>
                    )}
                  </div>
                </div>

                {/* Messages Feed */}
                <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
                  {activeConversationMessages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-8 text-gray-400">
                      <div className="w-14 h-14 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center mb-3 shadow-xs">
                        <Sparkles size={24} />
                      </div>
                      <p className="font-bold text-gray-700 text-sm mb-1">Inicie a conversa com {selectedContact.name}</p>
                      <p className="text-xs text-gray-400 max-w-xs">
                        As mensagens são entregues instantaneamente em tempo real.
                      </p>
                    </div>
                  ) : (
                    activeConversationMessages.map((msg, idx) => {
                      const isMe = Number(msg.senderId) === Number(effectiveUser?.id);
                      const showDateDivider = idx === 0 || new Date(msg.date).toDateString() !== new Date(activeConversationMessages[idx - 1].date).toDateString();

                      return (
                        <React.Fragment key={msg.id || idx}>
                          {showDateDivider && (
                            <div className="flex justify-center my-3">
                              <span className="px-3 py-1 bg-gray-200/80 text-gray-600 text-[11px] font-bold rounded-full shadow-xs">
                                {new Date(msg.date).toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long' })}
                              </span>
                            </div>
                          )}

                          <div className={`flex items-end gap-2 ${isMe ? 'justify-end' : 'justify-start'}`}>
                            {!isMe && (
                              <img
                                src={selectedContact.photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedContact.name)}&background=0D8ABC&color=fff`}
                                alt={selectedContact.name}
                                className="w-7 h-7 rounded-full object-cover mb-1 border border-gray-200 flex-shrink-0"
                              />
                            )}

                            <div
                              className={`max-w-[82%] sm:max-w-[70%] rounded-2xl px-4 py-2.5 shadow-xs text-sm relative group ${
                                isMe
                                  ? 'bg-gradient-to-br from-brand-600 to-blue-600 text-white rounded-br-xs'
                                  : 'bg-white border border-gray-200 text-gray-800 rounded-bl-xs'
                              }`}
                            >
                              <p className="whitespace-pre-wrap leading-relaxed break-words">
                                {msg.content}
                              </p>

                              <div className={`flex items-center justify-end gap-1 mt-1 text-[10px] ${isMe ? 'text-blue-100' : 'text-gray-400'}`}>
                                <span>
                                  {new Date(msg.date).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                                {isMe && (
                                  msg.read ? (
                                    <CheckCheck size={14} className="text-white" />
                                  ) : (
                                    <Check size={14} className="text-blue-200" />
                                  )
                                )}
                              </div>
                            </div>
                          </div>
                        </React.Fragment>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Chat Input Bar */}
                <form
                  onSubmit={handleSendChatMessage}
                  className="p-3 md:p-4 bg-white border-t border-gray-200 flex items-center gap-2"
                >
                  <input
                    ref={inputRef}
                    type="text"
                    placeholder={`Escreva uma mensagem para ${selectedContact.name.split(' ')[0]}...`}
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendChatMessage();
                      }
                    }}
                    className="flex-1 px-4 py-3 bg-gray-100 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 font-medium"
                  />

                  <button
                    type="submit"
                    disabled={!chatInput.trim()}
                    className="p-3 bg-brand-600 hover:bg-brand-700 disabled:opacity-40 text-white rounded-xl shadow-sm transition-all hover:scale-105 active:scale-95 flex-shrink-0"
                    title="Enviar (Enter)"
                  >
                    <Send size={18} />
                  </button>
                </form>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-gray-400">
                <div className="w-20 h-20 rounded-3xl bg-brand-50 text-brand-600 flex items-center justify-center mb-4 shadow-sm">
                  <MessageSquare size={36} />
                </div>
                <h3 className="text-lg font-bold text-gray-800 mb-1">Live Chat Interno</h3>
                <p className="text-sm text-gray-500 max-w-sm mb-6">
                  Selecione um colega ou a equipa de RH à esquerda para trocar mensagens instantâneas em tempo real.
                </p>

                {contactsList.length > 0 && (
                  <div className="flex flex-wrap gap-2 justify-center max-w-md">
                    <span className="text-xs text-gray-400 w-full mb-1">Conversas rápidas sugeridas:</span>
                    {contactsList.slice(0, 3).map(contact => (
                      <button
                        key={contact.id}
                        onClick={() => handleSelectContact(contact.id)}
                        className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 hover:border-brand-500 rounded-xl text-xs font-bold text-gray-700 hover:text-brand-600 shadow-xs transition-all"
                      >
                        <img
                          src={contact.photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(contact.name)}&background=0D8ABC&color=fff`}
                          alt={contact.name}
                          className="w-5 h-5 rounded-full object-cover"
                        />
                        <span>{contact.name.split(' ')[0]}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODE 2: COMUNICADOS OFICIAIS (FORMAL ANNOUNCEMENTS VIEW)                   */}
      {/* ========================================================================= */}
      {activeMode === 'ANNOUNCEMENTS' && (
        <div className="flex-1 min-h-0 bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col md:flex-row">
          {/* Announcements Sidebar */}
          <div
            className={`w-full md:w-1/3 flex flex-col border-r border-gray-200 ${
              selectedAnnouncement ? 'hidden md:flex' : 'flex'
            }`}
          >
            <div className="p-3.5 border-b border-gray-100 flex flex-col gap-3 bg-white">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
                <input
                  type="text"
                  placeholder="Pesquisar comunicados..."
                  value={searchAnnouncementTerm}
                  onChange={(e) => setSearchAnnouncementTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
              {filteredAnnouncements.length === 0 ? (
                <div className="p-8 text-center text-gray-400 text-xs">
                  Nenhum comunicado oficial encontrado.
                </div>
              ) : (
                filteredAnnouncements.map(announcement => (
                  <div
                    key={announcement.id}
                    onClick={() => {
                      setSelectedAnnouncement(announcement);
                      if (!announcement.read && effectiveUser && Number(announcement.receiverId) === Number(effectiveUser.id)) {
                        onMarkRead(announcement.id);
                      }
                    }}
                    className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                      selectedAnnouncement?.id === announcement.id
                        ? 'bg-brand-50 border-l-4 border-l-brand-600'
                        : ''
                    }`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className={`text-xs font-bold ${announcement.read ? 'text-gray-600' : 'text-gray-900'}`}>
                        {announcement.senderName}
                      </span>
                      <span className="text-[11px] text-gray-400">
                        {formatListTimestamp(announcement.date)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 mb-1">
                      {announcement.priority === 'HIGH' && (
                        <span className="px-1.5 py-0.5 bg-red-100 text-red-700 text-[10px] font-bold rounded">
                          Urgente
                        </span>
                      )}
                      <h4 className={`text-xs truncate ${announcement.read ? 'font-medium text-gray-700' : 'font-bold text-gray-900'}`}>
                        {announcement.subject}
                      </h4>
                    </div>
                    <p className="text-xs text-gray-500 truncate">{announcement.content}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Announcement Reader */}
          <div className={`flex-1 flex flex-col bg-gray-50/50 ${!selectedAnnouncement ? 'hidden md:flex' : 'flex'}`}>
            {selectedAnnouncement ? (
              <div className="flex flex-col h-full bg-white">
                <div className="p-6 border-b border-gray-200">
                  <div className="flex items-center gap-2 mb-3 md:hidden">
                    <button
                      onClick={() => setSelectedAnnouncement(null)}
                      className="text-gray-600 font-bold text-xs flex items-center gap-1"
                    >
                      &larr; Voltar à lista
                    </button>
                  </div>

                  <div className="flex items-start justify-between gap-4 mb-3">
                    <h2 className="text-xl font-bold text-gray-900">{selectedAnnouncement.subject}</h2>
                    {selectedAnnouncement.priority === 'HIGH' && (
                      <span className="px-2.5 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-lg flex items-center gap-1">
                        <AlertCircle size={13} /> Urgente
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-brand-100 text-brand-700 rounded-full flex items-center justify-center font-bold">
                      {selectedAnnouncement.senderName.charAt(0)}
                    </div>
                    <div>
                      <p className="font-bold text-sm text-gray-900">{selectedAnnouncement.senderName}</p>
                      <p className="text-xs text-gray-400">
                        {new Date(selectedAnnouncement.date).toLocaleString('pt-PT')}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-6 md:p-8 flex-1 overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed text-gray-700">
                  {selectedAnnouncement.content}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                <Inbox size={44} className="mb-3 opacity-30" />
                <p className="text-sm font-medium">Selecione um comunicado para ler os detalhes.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Official Announcement Compose Modal */}
      {isComposeOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-fadeIn">
            <div className="px-6 py-4 bg-brand-600 text-white flex justify-between items-center">
              <h3 className="font-bold flex items-center gap-2">
                <Send size={18} /> Novo Comunicado Oficial
              </h3>
              <button
                onClick={() => setIsComposeOpen(false)}
                className="hover:bg-white/20 p-1.5 rounded-lg transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSendAnnouncement} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Destinatários</label>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <button
                    type="button"
                    onClick={() => setSendType('INDIVIDUAL')}
                    className={`p-2 rounded-xl text-xs font-bold border ${
                      sendType === 'INDIVIDUAL'
                        ? 'bg-brand-50 border-brand-600 text-brand-700'
                        : 'bg-white border-gray-200 text-gray-600'
                    }`}
                  >
                    Individual
                  </button>
                  <button
                    type="button"
                    onClick={() => setSendType('GROUP')}
                    className={`p-2 rounded-xl text-xs font-bold border ${
                      sendType === 'GROUP'
                        ? 'bg-brand-50 border-brand-600 text-brand-700'
                        : 'bg-white border-gray-200 text-gray-600'
                    }`}
                  >
                    Geral / Empresa
                  </button>
                </div>

                {sendType === 'INDIVIDUAL' ? (
                  <select
                    value={toUser}
                    onChange={(e) => setToUser(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="">Selecione o colaborador...</option>
                    {users
                      .filter(u => u.id !== effectiveUser?.id)
                      .map(u => (
                        <option key={u.id} value={u.id}>
                          {u.name} ({u.department || 'Geral'})
                        </option>
                      ))}
                  </select>
                ) : (
                  <select
                    value={targetCompany}
                    onChange={(e) => setTargetCompany(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="ALL">Todos os colaboradores da empresa</option>
                    {Array.from(new Set(users.map(u => u.company).filter(Boolean))).map(cmp => (
                      <option key={cmp} value={cmp}>
                        Empresa: {cmp}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Assunto</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Atualização do Horário / Aviso Interno"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Mensagem</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Escreva o comunicado aqui..."
                  value={messageContent}
                  onChange={(e) => setMessageContent(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-brand-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-gray-700">
                  <input
                    type="checkbox"
                    checked={priority === 'HIGH'}
                    onChange={(e) => setPriority(e.target.checked ? 'HIGH' : 'NORMAL')}
                    className="rounded text-brand-600"
                  />
                  <span>Prioridade Urgente</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-emerald-700">
                  <input
                    type="checkbox"
                    checked={sendWhatsApp}
                    onChange={(e) => setSendWhatsApp(e.target.checked)}
                    className="rounded text-emerald-600"
                  />
                  <span>Enviar por WhatsApp</span>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsComposeOpen(false)}
                  className="px-4 py-2 border border-gray-200 text-gray-600 rounded-xl text-xs font-bold hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5"
                >
                  <Send size={14} />
                  <span>Enviar</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Messages;