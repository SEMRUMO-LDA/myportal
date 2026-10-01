
import React, { useMemo, useState } from 'react';
import Header from '../components/Header';
import { User, UserStatus, Absence, AbsenceStatus, TimeLog, TimeLogStatus, AppEvent, AbsenceType, Anomaly, UserStatusLabels, AbsenceStatusLabels, TimeLogStatusLabels, AbsenceTypeLabels } from '../types';
import AnomaliesWidget from '../components/AnomaliesWidget';
import {
    Users,
    Plane,
    FileText,
    AlertCircle,
    Clock,
    Calendar,
    Briefcase,
    MapPin,
    MoreVertical,
    Info,
    PartyPopper,
    UserX,
    UserCheck,
    FileWarning,
    User as UserIcon,
    Menu
} from 'lucide-react';
import { useNavigate, useOutletContext } from 'react-router-dom';

interface DashboardProps {
    users: User[];
    absences: Absence[];
    logs: TimeLog[];
    events: AppEvent[];
    anomalies?: Anomaly[];
    onUpdateAnomaly?: (anomaly: Anomaly) => void;
    currentUser?: User | null;
}

const Dashboard: React.FC<DashboardProps> = ({ users, absences, logs, events, anomalies = [], onUpdateAnomaly = () => { }, currentUser = null }) => {
    const navigate = useNavigate();
    const { toggleSidebar } = useOutletContext<{ toggleSidebar: () => void }>();
    const todayStr = new Date().toISOString().split('T')[0];
    const [expandMissing, setExpandMissing] = useState(false);
    const [expandVacation, setExpandVacation] = useState(false);

    // --- ANALYTICS CALCULATIONS ---
    const stats = useMemo(() => {
        const activeUsers = users.filter(u => u.status === UserStatus.ACTIVE);

        // 1. Pending Vacations
        const pendingVacations = absences.filter(a =>
            a.status === AbsenceStatus.PENDING &&
            a.type === AbsenceType.VACATION
        ).length;

        // 2. Pending Justifications (Everything else pending)
        const pendingJustifications = absences.filter(a =>
            a.status === AbsenceStatus.PENDING &&
            a.type !== AbsenceType.VACATION
        ).length;

        // 3. Pending Corrections (Placeholder logic: Late + Incomplete logs)
        // Ideally we would look for 'Incomplete' status logs specifically
        const pendingCorrections = logs.filter(l =>
            l.status === TimeLogStatus.INCOMPLETE ||
            l.status === TimeLogStatus.LATE
        ).length;

        // 4. Working Now (CheckIn, No CheckOut - ignoring todayStr to include overnight shifts)
        const workingNow = logs.filter(l => l.checkIn && !l.checkOut).map(l => {
            const user = users.find(u => Number(u.id) === Number(l.userId));
            return {
                ...l,
                userName: user?.name,
                userPhoto: user?.photoUrl,
                userRole: user?.role
            };
        });

        // 5. Absent Today (Approved Leaves)
        const absentToday = absences.filter(a => {
            return a.status === AbsenceStatus.APPROVED &&
                a.startDate <= todayStr &&
                a.endDate >= todayStr;
        });

        const absentPeople = absentToday.map(a => {
            const user = users.find(u => Number(u.id) === Number(a.userId));
            return { ...a, userPhoto: user?.photoUrl };
        });

        const onVacation = absentPeople.filter(a => a.type === AbsenceType.VACATION);
        const onLeave = absentPeople.filter(a => a.type !== AbsenceType.VACATION);

        // 6. Missing (No Log + No Leave)
        const missingPeople = activeUsers.filter(u => {
            const hasLog = logs.some(l => Number(l.userId) === Number(u.id) && l.date === todayStr);
            const hasLeave = absentToday.some(a => Number(a.userId) === Number(u.id));
            return !hasLog && !hasLeave;
        }).map(u => ({
            userId: u.id,
            userName: u.name,
            userPhoto: u.photoUrl,
            type: 'Falta Injustificada'
        }));

        return {
            totalUsers: activeUsers.length,
            pendingVacations,
            pendingJustifications,
            pendingCorrections,
            workingNow,
            onVacation,
            onLeave,
            missingPeople,
            logsToday: logs.filter(l => l.date === todayStr).reverse() // Newest first
        };
    }, [users, absences, logs, todayStr]);


    // --- EVENTS & BIRTHDAYS ---
    const { upcomingHolidays, upcomingBirthdays } = useMemo(() => {
        const today = new Date();
        const currentYear = today.getFullYear();

        // Holidays
        const holidays = events
            .filter(e => e.type === 'HOLIDAY')
            .map(e => ({ ...e, dateObj: new Date(e.date) }))
            .filter(e => e.dateObj >= today)
            .sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime())
            .slice(0, 3);

        // Birthdays
        const bdays = users
            .filter(u => u.status === UserStatus.ACTIVE && u.birthDate)
            .map(u => {
                const birth = new Date(u.birthDate);
                let nextBirthday = new Date(currentYear, birth.getMonth(), birth.getDate());
                if (nextBirthday < today) {
                    nextBirthday.setFullYear(currentYear + 1);
                }
                return {
                    user: u,
                    date: nextBirthday,
                    diffDays: Math.ceil((nextBirthday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
                };
            })
            .filter(b => b.diffDays <= 60)
            .sort((a, b) => a.date.getTime() - b.date.getTime())
            .slice(0, 3);

        return { upcomingHolidays: holidays, upcomingBirthdays: bdays };
    }, [users, events]);


    // --- UI COMPONENTS ---

    const StatCard = ({ title, value, icon: Icon, bgClass, textClass, onClick, hasBadge }: any) => (
        <div onClick={onClick} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between cursor-pointer hover:shadow-md transition-all relative">
            {hasBadge && (
                <span className="flex absolute h-3 w-3 top-4 right-4 z-10">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500 shadow-sm shadow-red-500/50"></span>
                </span>
            )}
            <div>
                <p className={`text-xs font-bold uppercase tracking-wider mb-1 ${textClass}`}>{title}</p>
                <h3 className="text-3xl font-bold text-gray-800">{value}</h3>
            </div>
            <div className={`p-3 rounded-xl ${bgClass} ${textClass}`}>
                <Icon size={24} />
            </div>
        </div>
    );

    const SectionHeader = ({ title, action }: { title: string, action?: any }) => (
        <div className="flex justify-between items-center mb-4 px-1">
            <h3 className="text-base font-bold text-brand-600">{title}</h3>
            {action && (
                <button className="text-gray-400 hover:text-brand-600 transition-colors">
                    <MoreVertical size={16} />
                </button>
            )}
        </div>
    );

    const EmptyState = ({ message }: { message: string }) => (
        <div className="flex flex-col items-center justify-center py-8 text-gray-400 text-sm">
            <span>{message}</span>
        </div>
    );

    return (
        <div className="p-4 md:p-8 w-full max-w-[1600px] mx-auto space-y-8 pb-20 md:pb-8">

            {/* HEADER */}
            <Header
                title="Dashboard"
                subtitle="Visão geral da operação"
                onMenuClick={toggleSidebar}
            />

            {/* KEY METRICS ROW */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-6">
                <StatCard
                    title="Colaboradores"
                    value={stats.totalUsers}
                    icon={Users}
                    bgClass="bg-blue-50"
                    textClass="text-blue-500"
                    onClick={() => navigate('/admin/users')}
                />
                <StatCard
                    title="Férias Pendentes"
                    value={stats.pendingVacations}
                    icon={Plane}
                    bgClass="bg-emerald-50"
                    textClass="text-emerald-500"
                    onClick={() => navigate('/admin/absences')}
                    hasBadge={stats.pendingVacations > 0}
                />
                <StatCard
                    title="Justificações Pendentes"
                    value={stats.pendingJustifications}
                    icon={FileText}
                    bgClass="bg-amber-50"
                    textClass="text-amber-500"
                    onClick={() => navigate('/admin/absences', { state: { activeTab: 'JUSTIFICATIONS' } })}
                    hasBadge={stats.pendingJustifications > 0}
                />
                <StatCard
                    title="Correções Pendentes"
                    value={stats.pendingCorrections}
                    icon={FileWarning}
                    bgClass="bg-indigo-50"
                    textClass="text-indigo-500"
                    onClick={() => navigate('/admin/attendance')}
                    hasBadge={stats.pendingCorrections > 0}
                />
            </div>

            {/* MAIN GRID */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 md:gap-8">

                {/* COL 1: Operations (Working Now & Attendance Log) */}
                <div className="xl:col-span-1 space-y-6 md:space-y-8">

                    {/* WORKING NOW */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 min-h-[300px]">
                        <SectionHeader title="Colaboradores em Trabalho" action />

                        <div className="space-y-4">
                            {stats.workingNow.length === 0 ? (
                                <div className="text-gray-400 text-sm h-32 flex items-center justify-center">
                                    Nenhum colaborador a trabalhar no momento.
                                </div>
                            ) : (
                                stats.workingNow.slice(0, 5).map(log => (
                                    <div key={log.id} className="flex items-center gap-3">
                                        <div className="relative">
                                            {log.userPhoto ? (
                                                <img src={log.userPhoto} className="w-10 h-10 rounded-full object-cover border border-gray-100" />
                                            ) : (
                                                <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 border border-blue-100">
                                                    <UserIcon size={20} />
                                                </div>
                                            )}
                                            <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></span>
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-sm font-bold text-gray-800">{log.userName}</p>
                                            <p className="text-xs text-gray-500 flex items-center gap-1">
                                                <Clock size={10} /> {log.checkIn}
                                                {log.checkInLocation && <span className="mx-1">• {log.checkInLocation.split(',')[0]}</span>}
                                            </p>
                                        </div>
                                    </div>
                                ))
                            )}
                            {stats.workingNow.length > 5 && (
                                <button onClick={() => navigate('/admin/attendance')} className="text-xs font-bold text-brand-600 hover:text-brand-800 mt-2">
                                    Ver todos ({stats.workingNow.length})
                                </button>
                            )}
                        </div>
                    </div>

                    {/* ATTENDANCE LOG */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                        <div className="flex justify-between items-center mb-4">
                            <SectionHeader title="Presenças" />
                            <div className="flex gap-2">
                                <Info size={16} className="text-gray-300" />
                                <MoreVertical size={16} className="text-gray-300" />
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="border-b border-gray-100">
                                    <tr>
                                        <th className="py-2 text-xs font-bold text-gray-400 uppercase">Colaborador</th>
                                        <th className="py-2 text-xs font-bold text-gray-400 uppercase">Hora</th>
                                        <th className="py-2 text-xs font-bold text-gray-400 uppercase">Estado</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {stats.logsToday.length === 0 ? (
                                        <tr>
                                            <td colSpan={3} className="py-8 text-center text-gray-400 text-sm">Sem registos hoje.</td>
                                        </tr>
                                    ) : (
                                        stats.logsToday.slice(0, 5).map(log => {
                                            const user = users.find(u => u.id === log.userId);
                                            return (
                                                <tr key={log.id}>
                                                    <td className="py-3 pr-2">
                                                        <div className="flex items-center gap-2">
                                                            {user?.photoUrl ? (
                                                                <img src={user.photoUrl} className="w-6 h-6 rounded-full object-cover" />
                                                            ) : (
                                                                <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
                                                                    <UserIcon size={12} />
                                                                </div>
                                                            )}
                                                            <div className="text-sm font-medium text-gray-800">{user?.name}</div>
                                                        </div>
                                                    </td>
                                                    <td className="py-3 text-sm text-gray-500 font-mono">
                                                        {log.checkIn}
                                                    </td>
                                                    <td className="py-3">
                                                        <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold ${log.status === TimeLogStatus.LATE ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'
                                                            }`}>
                                                            {TimeLogStatusLabels[log.status] || log.status}
                                                        </span>
                                                    </td>
                                                </tr>
                                            )
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                </div>

                {/* COL 2: Absences & Birthdays */}
                <div className="xl:col-span-1 space-y-6 md:space-y-8">

                    {/* ABSENCES */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                        <SectionHeader title="Colaboradores Ausentes" action />

                        <div className="space-y-6">
                            {/* Falta (Missing - No Log, No Leave) */}
                            <div>
                                <h4 className="text-xs font-bold text-red-500 mb-3 uppercase tracking-wider flex items-center gap-2">
                                    <AlertCircle size={12} /> Em Falta
                                </h4>
                                <div className="space-y-3">
                                    {stats.missingPeople.length === 0 ? (
                                        <p className="text-sm text-gray-400 italic">Nenhum colaborador em falta.</p>
                                    ) : (
                                        <>
                                            {(expandMissing ? stats.missingPeople : stats.missingPeople.slice(0, 5)).map((u: any, i: number) => (
                                                <div key={i} className="flex items-center gap-3">
                                                    <div className="relative">
                                                        {u.userPhoto ? (
                                                            <img src={u.userPhoto} className="w-8 h-8 rounded-full object-cover border border-red-100" />
                                                        ) : (
                                                            <div className="w-8 h-8 rounded-full bg-red-50 text-red-500 flex items-center justify-center text-xs font-bold border border-red-100">
                                                                {u.userName?.charAt(0)}
                                                            </div>
                                                        )}
                                                        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-red-500 border-2 border-white rounded-full"></span>
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-gray-700">{u.userName}</p>
                                                        <p className="text-[10px] text-red-400 font-medium">Sem registo de entrada</p>
                                                    </div>
                                                </div>
                                            ))}
                                            {stats.missingPeople.length > 5 && (
                                                <button
                                                    onClick={() => setExpandMissing(!expandMissing)}
                                                    className="w-full text-center text-xs font-bold text-red-500 hover:text-red-600 mt-2 py-1 bg-red-50 rounded hover:bg-red-100 transition-colors"
                                                >
                                                    {expandMissing ? 'Ver menos' : `Ver mais (${stats.missingPeople.length - 5})`}
                                                </button>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>

                            <div className="h-px bg-gray-50"></div>

                            {/* Férias (Vacation) */}
                            <div>
                                <h4 className="text-xs font-bold text-brand-500 mb-3 uppercase tracking-wider flex items-center gap-2">
                                    <Plane size={12} /> Férias
                                </h4>
                                <div className="space-y-3">
                                    {stats.onVacation.length === 0 ? (
                                        <p className="text-sm text-gray-400 italic">Nenhum colaborador de férias.</p>
                                    ) : (
                                        <>
                                            {(expandVacation ? stats.onVacation : stats.onVacation.slice(0, 5)).map((a, i) => (
                                                <div key={i} className="flex items-center gap-3">
                                                    <div className="relative">
                                                        {a.userPhoto ? (
                                                            <img src={a.userPhoto} className="w-8 h-8 rounded-full object-cover border border-blue-100" />
                                                        ) : (
                                                            <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center text-xs font-bold border border-blue-100">
                                                                {a.userName.charAt(0)}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-gray-700">{a.userName}</p>
                                                        <p className="text-[10px] text-gray-400">Até {new Date(a.endDate + 'T00:00:00').toLocaleDateString('pt-PT')}</p>
                                                    </div>
                                                </div>
                                            ))}
                                            {stats.onVacation.length > 5 && (
                                                <button
                                                    onClick={() => setExpandVacation(!expandVacation)}
                                                    className="w-full text-center text-xs font-bold text-brand-600 hover:text-brand-700 mt-2 py-1 bg-brand-50 rounded hover:bg-brand-100 transition-colors"
                                                >
                                                    {expandVacation ? 'Ver menos' : `Ver mais (${stats.onVacation.length - 5})`}
                                                </button>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Outras (Other Leaves like Medical) */}
                            {stats.onLeave.length > 0 && (
                                <>
                                    <div className="h-px bg-gray-50"></div>
                                    <div>
                                        <h4 className="text-xs font-bold text-amber-500 mb-3 uppercase tracking-wider flex items-center gap-2">
                                            <FileText size={12} /> Outras Ausências
                                        </h4>
                                        <div className="space-y-3">
                                            {stats.onLeave.map((a, i) => (
                                                <div key={i} className="flex items-center gap-3">
                                                    <div className="relative">
                                                        {a.userPhoto ? (
                                                            <img src={a.userPhoto} className="w-8 h-8 rounded-full object-cover border border-amber-100" />
                                                        ) : (
                                                            <div className="w-8 h-8 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center text-xs font-bold border border-amber-100">
                                                                {a.userName.charAt(0)}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-gray-700">{a.userName}</p>
                                                        <p className="text-[10px] text-gray-400">{a.type}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    {/* BIRTHDAYS */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                        <SectionHeader title="Próximos Aniversários" action />

                        <div className="space-y-4">
                            {upcomingBirthdays.length === 0 ? (
                                <EmptyState message="Sem aniversários próximos." />
                            ) : (
                                upcomingBirthdays.map((item, idx) => (
                                    <div key={idx} className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-pink-50 text-pink-500 flex items-center justify-center">
                                            <PartyPopper size={18} />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-gray-800">{item.user.name}</p>
                                            <p className="text-xs text-gray-500">
                                                {item.date.toLocaleDateString('pt-PT', { day: 'numeric', month: 'long' })}
                                            </p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                </div>

                {/* COL 3: Holidays & Contracts */}
                <div className="xl:col-span-1 space-y-6 md:space-y-8">

                    {/* ANOMALIES WIDGET */}
                    <AnomaliesWidget
                        anomalies={anomalies || []}
                        users={users}
                        currentUser={currentUser}
                        onUpdateAnomaly={onUpdateAnomaly}
                    />

                    {/* HOLIDAYS */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 h-fit">
                        <SectionHeader title="Próximos Feriados" action />

                        <div className="space-y-4">
                            {upcomingHolidays.length === 0 ? (
                                <EmptyState message="Não existem feriados criados." />
                            ) : (
                                upcomingHolidays.map((evt, idx) => (
                                    <div key={idx} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg transition-colors">
                                        <div className="w-10 h-10 rounded-lg bg-green-50 text-green-600 flex flex-col items-center justify-center border border-green-100 shrink-0">
                                            <span className="text-[10px] uppercase font-bold">{evt.dateObj.toLocaleString('pt-PT', { month: 'short' }).slice(0, 3)}</span>
                                            <span className="text-sm font-bold leading-none">{evt.dateObj.getDate()}</span>
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-gray-800">{evt.title}</p>
                                            <p className="text-[10px] text-gray-500">Feriado Nacional</p>
                                        </div>
                                    </div>
                                ))
                            )}
                            {upcomingHolidays.length === 0 && (
                                <button className="text-xs text-brand-600 hover:underline">
                                    Criar calendário de feriados.
                                </button>
                            )}
                        </div>
                    </div>

                    {/* PENDING REQUESTS */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                        <SectionHeader title="Pedidos Pendentes" action />
                        <div className="space-y-3">
                            {stats.pendingVacations + stats.pendingJustifications === 0 ? (
                                <EmptyState message="Sem pedidos pendentes." />
                            ) : (
                                absences
                                    .filter(a => a.status === AbsenceStatus.PENDING)
                                    .slice(0, 5)
                                    .map(a => {
                                        const user = users.find(u => u.id === a.userId);
                                        const isVacation = a.type === AbsenceType.VACATION;
                                        const step = (a as any).approvalStep || 'MANAGER';
                                        return (
                                            <div key={a.id} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${isVacation ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                                                    {isVacation ? <Plane size={14} /> : <FileText size={14} />}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <p className="text-sm font-bold text-gray-800 truncate">{user?.name || a.userName}</p>
                                                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${step === 'HR' ? 'bg-purple-100 text-purple-700' : 'bg-orange-100 text-orange-700'}`}>
                                                            {step === 'HR' ? 'RH' : 'Gestor'}
                                                        </span>
                                                    </div>
                                                    <p className="text-[10px] text-gray-500">
                                                        {isVacation ? AbsenceTypeLabels[AbsenceType.VACATION] : (AbsenceTypeLabels[a.type] || a.type)} • {new Date(a.startDate).toLocaleDateString('pt-PT')}
                                                    </p>
                                                </div>
                                                <button
                                                    onClick={() => navigate('/admin/absences')}
                                                    className="text-xs font-bold text-brand-600 hover:text-brand-800"
                                                >
                                                    Ver
                                                </button>
                                            </div>
                                        );
                                    })
                            )}
                            {stats.pendingVacations + stats.pendingJustifications > 5 && (
                                <button
                                    onClick={() => navigate('/admin/absences')}
                                    className="text-xs font-bold text-brand-600 hover:text-brand-800 mt-2"
                                >
                                    Ver todos ({stats.pendingVacations + stats.pendingJustifications})
                                </button>
                            )}
                        </div>
                    </div>

                </div>

            </div>
        </div>
    );
};

export default Dashboard;
