import React, { useState, useMemo } from 'react';
import { Bell, CheckCheck, Filter, ChevronRight, CheckCircle2, AlertTriangle, MessageSquare, Check, FileText, AlertCircle } from 'lucide-react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { PersistentNotification, NotificationCategory, NotificationSeverity, Leave, User } from '../types';

interface NotificationsContext {
  toggleSidebar?: () => void;
  currentUser?: User | null;
  notifications?: PersistentNotification[];
  unreadNotifCount?: number;
  onMarkNotificationRead?: (id: number) => void;
  onMarkAllNotificationsRead?: () => void;
  leaves?: Leave[];
  onUpdateLeave?: (leave: Leave) => void;
}

const CATEGORY_LABELS: Record<string, string> = {
  ALL: 'Todas',
  LEAVE_REQUEST: 'Pedidos de Ausência',
  LEAVE_APPROVED: 'Ausências Aprovadas',
  LEAVE_REJECTED: 'Ausências Rejeitadas',
  EXPENSE_SUBMITTED: 'Despesas Submetidas',
  EXPENSE_APPROVED: 'Despesas Aprovadas',
  EXPENSE_REJECTED: 'Despesas Rejeitadas',
  ANOMALY_CREATED: 'Anomalias',
  ANOMALY_ESCALATED: 'Anomalias Escaladas',
  MESSAGE_RECEIVED: 'Mensagens',
  DOCUMENT_UPLOADED: 'Documentos',
  SYSTEM: 'Sistema',
};

const NotificationsPage: React.FC = () => {
  const context = useOutletContext<NotificationsContext>() || {};
  const {
    notifications = [],
    unreadNotifCount = 0,
    onMarkNotificationRead,
    onMarkAllNotificationsRead,
    leaves = [],
    onUpdateLeave,
    currentUser,
  } = context;
  const navigate = useNavigate();

  const [filterType, setFilterType] = useState<string>('ALL');
  const [filterRead, setFilterRead] = useState<'ALL' | 'UNREAD' | 'READ'>('ALL');

  const filtered = useMemo(() => {
    let list = notifications;
    if (filterType !== 'ALL') list = list.filter(n => n.type === filterType);
    if (filterRead === 'UNREAD') list = list.filter(n => !n.read);
    if (filterRead === 'READ') list = list.filter(n => n.read);
    return list;
  }, [notifications, filterType, filterRead]);

  const getTimeAgo = (dateStr: string) => {
    const diff = new Date().getTime() - new Date(dateStr).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    if (days > 0) return `Há ${days} dia${days > 1 ? 's' : ''}`;
    if (hours > 0) return `Há ${hours} hora${hours > 1 ? 's' : ''}`;
    if (minutes <= 0) return 'Agora';
    return `Há ${minutes} min`;
  };

  const getIcon = (severity: NotificationSeverity) => {
    switch (severity) {
      case 'success': return <div className="p-2.5 bg-green-100 text-green-600 rounded-full"><CheckCircle2 size={18} /></div>;
      case 'warning': return <div className="p-2.5 bg-amber-100 text-amber-600 rounded-full"><AlertTriangle size={18} /></div>;
      case 'info': return <div className="p-2.5 bg-blue-100 text-blue-600 rounded-full"><MessageSquare size={18} /></div>;
      case 'error': return <div className="p-2.5 bg-red-100 text-red-600 rounded-full"><AlertCircle size={18} /></div>;
    }
  };

  const handleClick = (notif: PersistentNotification) => {
    if (!notif.read) onMarkNotificationRead?.(notif.id);
    if (notif.actionUrl) navigate(notif.actionUrl);
  };

  const handleInlineApprove = (e: React.MouseEvent, notif: PersistentNotification) => {
    e.stopPropagation();
    if (!notif.referenceId || !onUpdateLeave) return;
    const leave = leaves.find(l => String(l.id) === notif.referenceId);
    if (!leave || leave.status !== 'PENDING') return;
    onUpdateLeave({
      ...leave,
      status: 'APPROVED',
      approvalStep: 'DONE',
      managerApprovalStatus: 'APPROVED',
      hrApprovalStatus: 'APPROVED',
      approvedBy: currentUser?.id,
    });
    onMarkNotificationRead?.(notif.id);
  };

  const handleInlineReject = (e: React.MouseEvent, notif: PersistentNotification) => {
    e.stopPropagation();
    if (!notif.referenceId || !onUpdateLeave) return;
    const leave = leaves.find(l => String(l.id) === notif.referenceId);
    if (!leave || leave.status !== 'PENDING') return;
    onUpdateLeave({
      ...leave,
      status: 'REJECTED',
      approvalStep: 'DONE',
      managerApprovalStatus: 'REJECTED',
    });
    onMarkNotificationRead?.(notif.id);
  };

  // Determine available types from actual notifications
  const availableTypes = useMemo(() => {
    const types = new Set(notifications.map(n => n.type));
    return ['ALL', ...Array.from(types)];
  }, [notifications]);

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      <Header
        title="Notificações"
        subtitle={`${unreadNotifCount} não lida${unreadNotifCount !== 1 ? 's' : ''}`}
        onMenuClick={context.toggleSidebar}
      />

      {/* Filters Bar */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4 mb-6 flex flex-wrap gap-3 items-center shadow-sm">
        <Filter size={16} className="text-gray-400" />

        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-100"
        >
          {availableTypes.map(type => (
            <option key={type} value={type}>{CATEGORY_LABELS[type] || type}</option>
          ))}
        </select>

        <select
          value={filterRead}
          onChange={(e) => setFilterRead(e.target.value as any)}
          className="text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-100"
        >
          <option value="ALL">Todas</option>
          <option value="UNREAD">Não Lidas</option>
          <option value="READ">Lidas</option>
        </select>

        <div className="flex-1" />

        {unreadNotifCount > 0 && (
          <button
            onClick={() => onMarkAllNotificationsRead?.()}
            className="text-xs font-bold text-brand-600 hover:text-brand-800 flex items-center gap-1.5 px-3 py-2 bg-brand-50 rounded-lg hover:bg-brand-100 transition-colors"
          >
            <CheckCheck size={14} /> Marcar tudo como lido
          </button>
        )}
      </div>

      {/* Notification List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-12 text-center">
            <Bell size={40} className="mx-auto mb-3 text-gray-200" />
            <p className="text-gray-400 text-sm font-medium">Sem notificações{filterType !== 'ALL' || filterRead !== 'ALL' ? ' para os filtros selecionados' : ''}</p>
          </div>
        ) : (
          filtered.map(notif => (
            <div
              key={notif.id}
              onClick={() => handleClick(notif)}
              className={`bg-white dark:bg-gray-800 rounded-xl border p-4 flex gap-4 items-start cursor-pointer transition-all hover:shadow-md ${
                notif.read
                  ? 'border-gray-100 dark:border-gray-700'
                  : 'border-blue-200 dark:border-blue-900/50 bg-blue-50/30 dark:bg-blue-900/10'
              }`}
            >
              <div className="shrink-0 mt-0.5">
                {getIcon(notif.severity)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start gap-2">
                  <h4 className={`text-sm font-bold ${notif.read ? 'text-gray-600 dark:text-gray-300' : 'text-gray-900 dark:text-white'}`}>
                    {notif.title}
                  </h4>
                  <span className={`text-[10px] shrink-0 ${notif.read ? 'text-gray-400' : 'text-brand-600 font-bold'}`}>
                    {getTimeAgo(notif.createdAt)}
                  </span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                  {notif.description}
                </p>

                {/* Inline actions */}
                {notif.actionType === 'APPROVE_LEAVE' && notif.referenceId && (() => {
                  const leave = leaves.find(l => String(l.id) === notif.referenceId);
                  return leave && leave.status === 'PENDING' ? (
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={(e) => handleInlineApprove(e, notif)}
                        className="text-xs px-3 py-1.5 bg-green-100 text-green-700 rounded-lg font-bold hover:bg-green-200 transition-colors flex items-center gap-1"
                      >
                        <Check size={12} /> Aprovar
                      </button>
                      <button
                        onClick={(e) => handleInlineReject(e, notif)}
                        className="text-xs px-3 py-1.5 bg-red-100 text-red-700 rounded-lg font-bold hover:bg-red-200 transition-colors"
                      >
                        Rejeitar
                      </button>
                    </div>
                  ) : null;
                })()}

                {/* Category badge */}
                <div className="mt-2">
                  <span className="text-[10px] font-bold text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">
                    {CATEGORY_LABELS[notif.type] || notif.type}
                  </span>
                </div>
              </div>

              {/* Unread indicator */}
              {!notif.read && (
                <div className="w-2.5 h-2.5 rounded-full bg-brand-500 shrink-0 mt-2"></div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;
