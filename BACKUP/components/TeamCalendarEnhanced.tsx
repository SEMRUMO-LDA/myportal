import React, { useState, useMemo } from 'react';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Users,
  AlertTriangle,
  Info,
  Filter,
  Eye,
  EyeOff,
  Briefcase,
  Stethoscope,
  Home,
  Baby,
  Heart,
  GraduationCap,
  UserX,
  CheckCircle2,
  Clock,
  XCircle
} from 'lucide-react';
import { User, Leave, Department, LeaveType } from '../types';

interface TeamCalendarProps {
  users: User[];
  leaves: Leave[];
  departments: Department[];
  leaveTypes: LeaveType[];
  currentUser?: User | null;
}

interface CalendarDay {
  date: Date;
  dayNumber: number;
  isToday: boolean;
  isWeekend: boolean;
  isCurrentMonth: boolean;
  absences: Array<{
    user: User;
    leave: Leave;
    type?: LeaveType;
  }>;
}

const TeamCalendarEnhanced: React.FC<TeamCalendarProps> = ({
  users,
  leaves,
  departments,
  leaveTypes,
  currentUser
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [showWeekends, setShowWeekends] = useState(true);
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');
  const [hoveredDay, setHoveredDay] = useState<Date | null>(null);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  // Get leave type icon
  const getLeaveIcon = (typeName: string) => {
    const name = typeName?.toUpperCase();
    if (name?.includes('FERIAS') || name?.includes('VACATION')) return <Briefcase className="w-3 h-3" />;
    if (name?.includes('BAIXA') || name?.includes('SICK')) return <Stethoscope className="w-3 h-3" />;
    if (name?.includes('PESSOAL') || name?.includes('PERSONAL')) return <Home className="w-3 h-3" />;
    if (name?.includes('MATERNIDADE')) return <Baby className="w-3 h-3" />;
    if (name?.includes('PATERNIDADE')) return <Heart className="w-3 h-3" />;
    if (name?.includes('FORMACAO') || name?.includes('TRAINING')) return <GraduationCap className="w-3 h-3" />;
    return <Calendar className="w-3 h-3" />;
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return <CheckCircle2 className="w-3 h-3 text-green-500" />;
      case 'PENDING':
        return <Clock className="w-3 h-3 text-yellow-500" />;
      case 'REJECTED':
        return <XCircle className="w-3 h-3 text-red-500" />;
      default:
        return null;
    }
  };

  // Calculate calendar days
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());

    const days: CalendarDay[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < 42; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      date.setHours(0, 0, 0, 0);

      const dayAbsences: CalendarDay['absences'] = [];

      // Find absences for this day
      leaves.forEach(leave => {
        const leaveStart = new Date(leave.startDate);
        const leaveEnd = new Date(leave.endDate);
        leaveStart.setHours(0, 0, 0, 0);
        leaveEnd.setHours(0, 0, 0, 0);

        if (date >= leaveStart && date <= leaveEnd) {
          const user = users.find(u => u.id === leave.userId);
          if (user) {
            // Apply department filter
            if (!selectedDepartment || user.department === selectedDepartment) {
              dayAbsences.push({
                user,
                leave,
                type: leaveTypes.find(t => t.id === leave.typeId)
              });
            }
          }
        }
      });

      days.push({
        date: new Date(date),
        dayNumber: date.getDate(),
        isToday: date.getTime() === today.getTime(),
        isWeekend: date.getDay() === 0 || date.getDay() === 6,
        isCurrentMonth: date.getMonth() === month,
        absences: dayAbsences
      });
    }

    return days;
  }, [currentDate, leaves, users, leaveTypes, selectedDepartment]);

  // Calculate statistics
  const stats = useMemo(() => {
    const activeUsers = users.filter(u =>
      u.status === 'ACTIVE' &&
      (!selectedDepartment || u.department === selectedDepartment)
    );
    const totalEmployees = activeUsers.length;

    // Today's stats
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayData = calendarDays.find(d => d.date.getTime() === today.getTime());
    const todayAbsent = todayData?.absences.filter(a => a.leave.status === 'APPROVED').length || 0;
    const todayPresent = totalEmployees - todayAbsent;

    // Coverage analysis
    const criticalDays = calendarDays.filter(day => {
      if (!day.isCurrentMonth || day.isWeekend) return false;
      const approved = day.absences.filter(a => a.leave.status === 'APPROVED');
      const coverage = totalEmployees > 0 ? ((totalEmployees - approved.length) / totalEmployees) * 100 : 100;
      return coverage < 70; // Less than 70% coverage is critical
    });

    // Department breakdown
    const deptStats = departments.map(dept => {
      const deptUsers = activeUsers.filter(u => u.department === dept.name);
      const deptAbsences = calendarDays.reduce((sum, day) => {
        if (!day.isCurrentMonth) return sum;
        return sum + day.absences.filter(a =>
          a.user.department === dept.name &&
          a.leave.status === 'APPROVED'
        ).length;
      }, 0);

      return {
        name: dept.name,
        total: deptUsers.length,
        absences: deptAbsences,
        rate: deptUsers.length > 0 ? (deptAbsences / (deptUsers.length * 30)) * 100 : 0
      };
    });

    return {
      totalEmployees,
      todayPresent,
      todayAbsent,
      criticalDays: criticalDays.length,
      departmentStats: deptStats
    };
  }, [calendarDays, users, departments, selectedDepartment]);

  // Navigation functions
  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (direction === 'prev') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Get coverage color
  const getCoverageColor = (day: CalendarDay) => {
    if (day.isWeekend) return 'bg-gray-50';

    const totalEmployees = stats.totalEmployees;
    const approved = day.absences.filter(a => a.leave.status === 'APPROVED').length;
    const coverage = totalEmployees > 0 ? ((totalEmployees - approved) / totalEmployees) * 100 : 100;

    if (coverage >= 90) return 'bg-white hover:bg-gray-50';
    if (coverage >= 70) return 'bg-yellow-50 hover:bg-yellow-100';
    if (coverage >= 50) return 'bg-orange-50 hover:bg-orange-100';
    return 'bg-red-50 hover:bg-red-100';
  };

  const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Calendário de Equipa</h2>

          {/* Stats Pills */}
          <div className="flex gap-3">
            <div className="px-3 py-1 bg-green-50 rounded-full flex items-center gap-2">
              <Users className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium text-green-700">
                {stats.todayPresent} presentes hoje
              </span>
            </div>
            {stats.todayAbsent > 0 && (
              <div className="px-3 py-1 bg-orange-50 rounded-full flex items-center gap-2">
                <UserX className="w-4 h-4 text-orange-600" />
                <span className="text-sm font-medium text-orange-700">
                  {stats.todayAbsent} ausentes
                </span>
              </div>
            )}
            {stats.criticalDays > 0 && (
              <div className="px-3 py-1 bg-red-50 rounded-full flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                <span className="text-sm font-medium text-red-700">
                  {stats.criticalDays} dias críticos
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Month Navigation */}
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => navigateMonth('prev')}
                className="p-1.5 hover:bg-white rounded transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={goToToday}
                className="px-3 py-1 text-sm font-medium hover:bg-white rounded transition-colors"
              >
                Hoje
              </button>
              <button
                onClick={() => navigateMonth('next')}
                className="p-1.5 hover:bg-white rounded transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <h3 className="text-lg font-semibold text-gray-900">
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h3>
          </div>

          <div className="flex items-center gap-3">
            {/* Department Filter */}
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-200 focus:border-brand-400 outline-none"
            >
              <option value="">Todos os Departamentos</option>
              {departments.map(dept => (
                <option key={dept.id} value={dept.name}>
                  {dept.name}
                </option>
              ))}
            </select>

            {/* Weekend Toggle */}
            <button
              onClick={() => setShowWeekends(!showWeekends)}
              className={`px-3 py-1.5 border rounded-lg text-sm font-medium transition-colors ${
                showWeekends
                  ? 'bg-gray-100 border-gray-200 text-gray-700'
                  : 'bg-white border-gray-200 text-gray-500'
              }`}
            >
              {showWeekends ? <Eye className="w-4 h-4 inline mr-1" /> : <EyeOff className="w-4 h-4 inline mr-1" />}
              Fins de Semana
            </button>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="p-4">
        {/* Week Headers */}
        <div className={`grid ${showWeekends ? 'grid-cols-7' : 'grid-cols-5'} gap-2 mb-2`}>
          {weekDays.map((day, index) => {
            if (!showWeekends && (index === 0 || index === 6)) return null;
            return (
              <div
                key={day}
                className="text-center text-xs font-semibold text-gray-500 uppercase py-2"
              >
                {day}
              </div>
            );
          })}
        </div>

        {/* Calendar Days */}
        <div className={`grid ${showWeekends ? 'grid-cols-7' : 'grid-cols-5'} gap-2`}>
          {calendarDays.map((day, index) => {
            if (!showWeekends && day.isWeekend) return null;
            if (!day.isCurrentMonth) {
              return (
                <div
                  key={index}
                  className="h-24 bg-gray-50 rounded-lg opacity-40"
                />
              );
            }

            const approvedAbsences = day.absences.filter(a => a.leave.status === 'APPROVED');
            const pendingAbsences = day.absences.filter(a => a.leave.status === 'PENDING');
            const coverage = stats.totalEmployees > 0
              ? ((stats.totalEmployees - approvedAbsences.length) / stats.totalEmployees) * 100
              : 100;

            return (
              <div
                key={index}
                className={`relative h-24 rounded-lg border transition-all cursor-pointer ${
                  day.isToday
                    ? 'border-brand-500 border-2 shadow-md'
                    : 'border-gray-200'
                } ${getCoverageColor(day)}`}
                onMouseEnter={() => setHoveredDay(day.date)}
                onMouseLeave={() => setHoveredDay(null)}
                onClick={() => setSelectedDay(day.date)}
              >
                {/* Day Number */}
                <div className="absolute top-2 left-2">
                  <span className={`text-sm font-semibold ${
                    day.isToday ? 'text-brand-600' : 'text-gray-700'
                  }`}>
                    {day.dayNumber}
                  </span>
                </div>

                {/* Coverage Indicator */}
                {!day.isWeekend && coverage < 70 && (
                  <div className="absolute top-2 right-2">
                    <AlertTriangle className="w-4 h-4 text-red-500" />
                  </div>
                )}

                {/* Absence Count */}
                {approvedAbsences.length > 0 && (
                  <div className="absolute bottom-2 left-2 flex gap-1">
                    <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs font-medium rounded-full">
                      {approvedAbsences.length}
                    </span>
                    {pendingAbsences.length > 0 && (
                      <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs font-medium rounded-full">
                        +{pendingAbsences.length}
                      </span>
                    )}
                  </div>
                )}

                {/* Mini avatars (show first 3) */}
                {approvedAbsences.length > 0 && (
                  <div className="absolute bottom-2 right-2 flex -space-x-2">
                    {approvedAbsences.slice(0, 3).map((absence, i) => (
                      <img
                        key={i}
                        src={absence.user.photoUrl || `https://ui-avatars.com/api/?name=${absence.user.name}&size=20`}
                        alt=""
                        className="w-5 h-5 rounded-full border border-white"
                        title={absence.user.name}
                      />
                    ))}
                    {approvedAbsences.length > 3 && (
                      <div className="w-5 h-5 rounded-full bg-gray-300 border border-white flex items-center justify-center">
                        <span className="text-[9px] text-white font-bold">+{approvedAbsences.length - 3}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Hover Tooltip */}
                {hoveredDay?.getTime() === day.date.getTime() && day.absences.length > 0 && (
                  <div className="absolute z-10 top-full mt-2 left-0 w-64 bg-white rounded-lg shadow-xl border border-gray-200 p-3">
                    <div className="text-xs font-semibold text-gray-700 mb-2">
                      {day.date.toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </div>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {day.absences.map((absence, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs">
                          <img
                            src={absence.user.photoUrl || `https://ui-avatars.com/api/?name=${absence.user.name}&size=20`}
                            alt=""
                            className="w-5 h-5 rounded-full"
                          />
                          <span className="flex-1 truncate">{absence.user.name}</span>
                          {getLeaveIcon(absence.type?.name || '')}
                          {getStatusIcon(absence.leave.status)}
                        </div>
                      ))}
                    </div>
                    <div className="mt-2 pt-2 border-t border-gray-100 text-xs text-gray-500">
                      Cobertura: {coverage.toFixed(0)}% ({stats.totalEmployees - approvedAbsences.length}/{stats.totalEmployees})
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-between">
          <div className="flex gap-4">
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <div className="w-3 h-3 bg-white border border-gray-200 rounded"></div>
              <span>Normal (90%+)</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <div className="w-3 h-3 bg-yellow-50 border border-yellow-200 rounded"></div>
              <span>Atenção (70-90%)</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <div className="w-3 h-3 bg-orange-50 border border-orange-200 rounded"></div>
              <span>Alerta (50-70%)</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <div className="w-3 h-3 bg-red-50 border border-red-200 rounded"></div>
              <span>Crítico (&lt;50%)</span>
            </div>
          </div>

          {/* Department Summary */}
          {stats.departmentStats.length > 0 && (
            <div className="flex gap-3">
              {stats.departmentStats.slice(0, 3).map(dept => (
                <div key={dept.name} className="text-xs">
                  <span className="font-medium text-gray-700">{dept.name}:</span>
                  <span className="ml-1 text-gray-500">{dept.rate.toFixed(1)}% ausência</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TeamCalendarEnhanced;