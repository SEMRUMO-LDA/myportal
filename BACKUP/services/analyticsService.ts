/**
 * Analytics Service
 * Calculates KPIs, trends, and generates insights for HR analytics dashboard
 */

import { User, TimeLog, Leave, UserStatus, LeaveType, Anomaly } from '../types';

export const analyticsService = {
    calculateKPIs: (users: User[], timeLogs: TimeLog[], leaves: Leave[]) => {
        const activeUsers = users.filter(u => u.status === UserStatus.ACTIVE);
        const totalActive = activeUsers.length || 1;

        // Logs from last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const recentLogs = timeLogs.filter(l => new Date(l.date) >= thirtyDaysAgo);

        // Attendance rate: users who clocked in / active users (avg over days with logs)
        const logDays = new Set(recentLogs.map(l => l.date));
        const daysWithLogs = logDays.size || 1;
        const uniqueUserDays = new Set(recentLogs.map(l => `${l.userId}-${l.date}`)).size;
        const attendanceRate = Math.min(100, Math.round((uniqueUserDays / (totalActive * daysWithLogs)) * 100));

        // Absenteeism: approved leaves in last 30 days / total work days
        const recentLeaves = leaves.filter(l =>
            l.status === 'APPROVED' && new Date(l.startDate) >= thirtyDaysAgo
        );
        let totalLeaveDays = 0;
        recentLeaves.forEach(l => {
            const start = new Date(l.startDate);
            const end = new Date(l.endDate);
            // Simple diff calculation
            const diff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
            totalLeaveDays += diff;
        });
        const absenteeismRate = Math.round((totalLeaveDays / (totalActive * daysWithLogs)) * 100);

        // Average hours per day
        const logsWithHours = recentLogs.filter(l => l.totalHours && l.totalHours > 0);
        const avgHours = logsWithHours.length > 0
            ? (logsWithHours.reduce((sum, l) => sum + (l.totalHours || 0), 0) / logsWithHours.length).toFixed(1)
            : '0';

        // Pending approvals
        const pendingApprovals = leaves.filter(l => l.status === 'PENDING').length;

        return { attendanceRate, absenteeismRate, avgHours, pendingApprovals, totalActive };
    },

    calculateAttendanceTrend: (users: User[], timeLogs: TimeLog[], leaves: Leave[], periodMonths: number) => {
        const months: { month: string; taxa: number; ausencias: number }[] = [];
        const activeCount = users.filter(u => u.status === UserStatus.ACTIVE).length || 1;

        for (let i = periodMonths - 1; i >= 0; i--) {
            const d = new Date();
            d.setMonth(d.getMonth() - i);
            const year = d.getFullYear();
            const month = d.getMonth();
            const label = d.toLocaleDateString('pt-PT', { month: 'short', year: '2-digit' });

            // Count unique user-days with check-in
            const monthLogs = timeLogs.filter(l => {
                const ld = new Date(l.date);
                return ld.getFullYear() === year && ld.getMonth() === month && l.checkIn;
            });
            const workDays = new Set(monthLogs.map(l => l.date)).size || 1;
            const uniqueUserDays = new Set(monthLogs.map(l => `${l.userId}-${l.date}`)).size;
            const rate = Math.min(100, Math.round((uniqueUserDays / (activeCount * workDays)) * 100));

            // Leaves in this month
            const monthLeaves = leaves.filter(l => {
                if (l.status !== 'APPROVED') return false;
                const ls = new Date(l.startDate);
                return ls.getFullYear() === year && ls.getMonth() === month;
            }).length;

            months.push({ month: label, taxa: rate, ausencias: monthLeaves });
        }
        return months;
    },

    calculateHoursByDepartment: (users: User[], timeLogs: TimeLog[]) => {
        const deptMap: Record<string, { total: number; count: number }> = {};
        const userDeptMap: Record<number, string> = {};
        users.forEach(u => { userDeptMap[u.id] = u.department || 'Sem Dept.'; });

        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        timeLogs.forEach(l => {
            if (!l.totalHours || new Date(l.date) < thirtyDaysAgo) return;
            const dept = userDeptMap[l.userId] || 'Outros';
            if (!deptMap[dept]) deptMap[dept] = { total: 0, count: 0 };
            deptMap[dept].total += l.totalHours;
            deptMap[dept].count += 1;
        });

        return Object.entries(deptMap)
            .map(([name, { total, count }]) => ({
                departamento: name.length > 15 ? name.substring(0, 15) + '...' : name,
                mediaHoras: count > 0 ? Number((total / count).toFixed(1)) : 0,
                totalHoras: Math.round(total)
            }))
            .sort((a, b) => b.totalHoras - a.totalHoras)
            .slice(0, 8);
    },

    calculateLeaveDistribution: (leaves: Leave[], leaveTypes: LeaveType[]) => {
        const typeMap: Record<number, { name: string; color: string; count: number }> = {};
        leaveTypes.forEach(lt => { typeMap[lt.id] = { name: lt.name, color: lt.color, count: 0 }; });

        leaves.filter(l => l.status === 'APPROVED').forEach(l => {
            if (typeMap[l.leaveTypeId]) {
                typeMap[l.leaveTypeId].count += 1;
            }
        });

        return Object.values(typeMap)
            .filter(t => t.count > 0)
            .sort((a, b) => b.count - a.count);
    },

    calculateTopAnomalies: (anomalies: Anomaly[]) => {
        const typeCount: Record<string, number> = {};
        const labels: Record<string, string> = {
            'LATE_ENTRY': 'Entrada Tardia',
            'EARLY_EXIT': 'Saída Antecipada',
            'MISSING_CLOCK_IN': 'Falta Entrada',
            'MISSING_CLOCK_OUT': 'Falta Saída',
            'HOURS_DEFICIT': 'Défice de Horas',
            'HOURS_SURPLUS': 'Excedente de Horas'
        };

        anomalies.forEach(a => {
            const label = labels[a.type] || a.type;
            typeCount[label] = (typeCount[label] || 0) + 1;
        });

        return Object.entries(typeCount)
            .map(([tipo, total]) => ({ tipo, total }))
            .sort((a, b) => b.total - a.total);
    },

    calculateSummary: (users: User[], leaves: Leave[], timeLogs: TimeLog[]) => {
        const todayStr = new Date().toISOString().split('T')[0];
        const activeUsers = users.filter(u => u.status === UserStatus.ACTIVE).length;
        const onVacationToday = leaves.filter(l =>
            l.status === 'APPROVED' && l.startDate <= todayStr && l.endDate >= todayStr
        ).length;
        const clockedInToday = new Set(
            timeLogs.filter(l => l.date === todayStr && l.checkIn).map(l => l.userId)
        ).size;

        return { activeUsers, onVacationToday, clockedInToday };
    },

    generateSmartAlerts: (users: User[], timeLogs: TimeLog[], leaves: Leave[], anomalies: Anomaly[]): SmartAlert[] => {
        const alerts: SmartAlert[] = [];
        const activeUsers = users.filter(u => u.status === UserStatus.ACTIVE);
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        // 1. Department lateness comparison
        const deptLateness: Record<string, { late: number; total: number }> = {};
        activeUsers.forEach(u => {
            const dept = u.department || 'Sem Dept.';
            if (!deptLateness[dept]) deptLateness[dept] = { late: 0, total: 0 };
        });
        timeLogs.filter(l => new Date(l.date) >= thirtyDaysAgo).forEach(l => {
            const user = activeUsers.find(u => u.id === l.userId);
            if (!user) return;
            const dept = user.department || 'Sem Dept.';
            if (!deptLateness[dept]) deptLateness[dept] = { late: 0, total: 0 };
            deptLateness[dept].total++;
            if (l.status === 'LATE') deptLateness[dept].late++;
        });
        const deptEntries = Object.entries(deptLateness).filter(([, v]) => v.total > 5);
        if (deptEntries.length > 1) {
            const rates = deptEntries.map(([name, v]) => ({ name, rate: v.late / v.total }));
            const avgRate = rates.reduce((s, r) => s + r.rate, 0) / rates.length;
            const worst = rates.sort((a, b) => b.rate - a.rate)[0];
            if (worst && worst.rate > avgRate * 1.4 && worst.rate > 0.05) {
                alerts.push({
                    type: 'warning',
                    title: `${worst.name} tem mais atrasos`,
                    description: `Taxa de atrasos ${(worst.rate * 100).toFixed(0)}% vs média ${(avgRate * 100).toFixed(0)}% nos últimos 30 dias.`,
                    metric: `+${((worst.rate - avgRate) * 100).toFixed(0)}%`
                });
            }
        }

        // 2. Users with critical hour bank deficit
        const userDeficits: { name: string; deficit: number }[] = [];
        activeUsers.forEach(user => {
            const uLogs = timeLogs.filter(l => l.userId === user.id && l.totalHours);
            let balance = 0;
            const expectedMin = user.workStartTime && user.workEndTime
                ? (() => { const s = user.workStartTime!.split(':').map(Number); const e = user.workEndTime!.split(':').map(Number); let d = (e[0] * 60 + e[1]) - (s[0] * 60 + s[1]); if (d > 300) d -= 60; return d; })()
                : 480;
            uLogs.forEach(l => {
                const worked = Math.round(l.totalHours! * 60);
                const diff = worked - expectedMin;
                balance += diff > 0 ? (diff >= 31 ? Math.floor(diff / 30) * 30 : 0) : diff;
            });
            if (balance < -600) userDeficits.push({ name: user.name, deficit: balance });
        });
        if (userDeficits.length > 0) {
            alerts.push({
                type: 'critical',
                title: `${userDeficits.length} colaborador${userDeficits.length > 1 ? 'es' : ''} com banco de horas crítico`,
                description: userDeficits.slice(0, 3).map(u => `${u.name} (${(u.deficit / 60).toFixed(1)}h)`).join(', '),
                metric: `< -10h`
            });
        }

        // 3. Pending approvals aging
        const pendingLeaves = leaves.filter(l => l.status === 'PENDING');
        const oldPending = pendingLeaves.filter(l => {
            const created = new Date(l.createdAt || l.startDate);
            return (Date.now() - created.getTime()) > 3 * 24 * 60 * 60 * 1000;
        });
        if (oldPending.length > 0) {
            alerts.push({
                type: 'info',
                title: `${oldPending.length} pedido${oldPending.length > 1 ? 's' : ''} pendente${oldPending.length > 1 ? 's' : ''} há mais de 3 dias`,
                description: 'Pedidos de ausência aguardam aprovação há demasiado tempo.',
                metric: `${oldPending.length}`
            });
        }

        // 4. Anomaly spike
        const recentAnomalies = anomalies.filter(a => new Date(a.createdAt) >= thirtyDaysAgo);
        const prevMonth = new Date(thirtyDaysAgo);
        prevMonth.setDate(prevMonth.getDate() - 30);
        const prevAnomalies = anomalies.filter(a => {
            const d = new Date(a.createdAt);
            return d >= prevMonth && d < thirtyDaysAgo;
        });
        if (prevAnomalies.length > 5 && recentAnomalies.length > prevAnomalies.length * 1.3) {
            alerts.push({
                type: 'warning',
                title: 'Aumento de anomalias',
                description: `${recentAnomalies.length} anomalias nos últimos 30 dias vs ${prevAnomalies.length} no mês anterior.`,
                metric: `+${Math.round(((recentAnomalies.length - prevAnomalies.length) / prevAnomalies.length) * 100)}%`
            });
        }

        // 5. High attendance rate (positive)
        const kpis = analyticsService.calculateKPIs(users, timeLogs, leaves);
        if (kpis.attendanceRate >= 95) {
            alerts.push({
                type: 'success',
                title: 'Excelente assiduidade',
                description: `Taxa de assiduidade de ${kpis.attendanceRate}% nos últimos 30 dias.`,
                metric: `${kpis.attendanceRate}%`
            });
        }

        return alerts.slice(0, 5);
    },

    calculateDepartmentComparison: (users: User[], timeLogs: TimeLog[], anomalies: Anomaly[]): DepartmentMetrics[] => {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const recentLogs = timeLogs.filter(l => new Date(l.date) >= thirtyDaysAgo);
        const recentAnomalies = anomalies.filter(a => new Date(a.createdAt) >= thirtyDaysAgo);

        const deptMap: Record<string, { users: Set<number>; totalHours: number; logCount: number; lateCount: number; anomalyCount: number }> = {};
        const activeUsers = users.filter(u => u.status === UserStatus.ACTIVE);

        activeUsers.forEach(u => {
            const dept = u.department || 'Sem Dept.';
            if (!deptMap[dept]) deptMap[dept] = { users: new Set(), totalHours: 0, logCount: 0, lateCount: 0, anomalyCount: 0 };
            deptMap[dept].users.add(u.id);
        });

        recentLogs.forEach(l => {
            const user = activeUsers.find(u => u.id === l.userId);
            if (!user) return;
            const dept = user.department || 'Sem Dept.';
            if (!deptMap[dept]) return;
            deptMap[dept].logCount++;
            if (l.totalHours) deptMap[dept].totalHours += l.totalHours;
            if (l.status === 'LATE') deptMap[dept].lateCount++;
        });

        recentAnomalies.forEach(a => {
            const user = activeUsers.find(u => u.id === a.userId);
            if (!user) return;
            const dept = user.department || 'Sem Dept.';
            if (deptMap[dept]) deptMap[dept].anomalyCount++;
        });

        return Object.entries(deptMap)
            .filter(([, v]) => v.users.size > 0)
            .map(([name, v]) => ({
                department: name.length > 18 ? name.substring(0, 18) + '…' : name,
                headcount: v.users.size,
                avgHours: v.logCount > 0 ? Number((v.totalHours / v.logCount).toFixed(1)) : 0,
                latenessRate: v.logCount > 0 ? Number(((v.lateCount / v.logCount) * 100).toFixed(1)) : 0,
                anomalies: v.anomalyCount
            }))
            .sort((a, b) => b.headcount - a.headcount);
    },

    calculateDayOfWeekPattern: (timeLogs: TimeLog[]): DayOfWeekData[] => {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const labels = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
        const days: { total: number; late: number; avgHours: number; hoursSum: number; count: number }[] =
            Array.from({ length: 7 }, () => ({ total: 0, late: 0, avgHours: 0, hoursSum: 0, count: 0 }));

        timeLogs.filter(l => new Date(l.date) >= thirtyDaysAgo).forEach(l => {
            const dayIndex = new Date(l.date).getDay();
            days[dayIndex].total++;
            if (l.status === 'LATE') days[dayIndex].late++;
            if (l.totalHours) {
                days[dayIndex].hoursSum += l.totalHours;
                days[dayIndex].count++;
            }
        });

        return days.map((d, i) => ({
            day: labels[i],
            registos: d.total,
            atrasos: d.late,
            taxaAtraso: d.total > 0 ? Number(((d.late / d.total) * 100).toFixed(1)) : 0,
            mediaHoras: d.count > 0 ? Number((d.hoursSum / d.count).toFixed(1)) : 0
        }));
    },

    calculateKPITrends: (users: User[], timeLogs: TimeLog[], leaves: Leave[]) => {
        const now = new Date();
        const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastMonthEnd = new Date(thisMonth.getTime() - 1);
        const twoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1);

        const activeCount = users.filter(u => u.status === UserStatus.ACTIVE).length || 1;

        const calcRate = (start: Date, end: Date) => {
            const logs = timeLogs.filter(l => { const d = new Date(l.date); return d >= start && d <= end && l.checkIn; });
            const days = new Set(logs.map(l => l.date)).size || 1;
            const unique = new Set(logs.map(l => `${l.userId}-${l.date}`)).size;
            return Math.min(100, Math.round((unique / (activeCount * days)) * 100));
        };

        const thisRate = calcRate(thisMonth, now);
        const lastRate = calcRate(lastMonth, lastMonthEnd);
        const prevRate = calcRate(twoMonthsAgo, new Date(lastMonth.getTime() - 1));

        const calcAbsenteeism = (start: Date, end: Date) => {
            const ml = leaves.filter(l => l.status === 'APPROVED' && new Date(l.startDate) >= start && new Date(l.startDate) <= end);
            let days = 0;
            ml.forEach(l => { days += Math.ceil((new Date(l.endDate).getTime() - new Date(l.startDate).getTime()) / 86400000) + 1; });
            const workDays = new Set(timeLogs.filter(l => { const d = new Date(l.date); return d >= start && d <= end; }).map(l => l.date)).size || 1;
            return Math.round((days / (activeCount * workDays)) * 100);
        };

        const thisAbsent = calcAbsenteeism(thisMonth, now);
        const lastAbsent = calcAbsenteeism(lastMonth, lastMonthEnd);

        return {
            attendanceDelta: thisRate - lastRate,
            absenteeismDelta: thisAbsent - lastAbsent,
            attendancePrevDelta: lastRate - prevRate
        };
    },

    calculateEmployeeRiskScores: (users: User[], timeLogs: TimeLog[], leaves: Leave[], anomalies: Anomaly[]): EmployeeRisk[] => {
        const activeUsers = users.filter(u => u.status === UserStatus.ACTIVE);
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        const todayStr = new Date().toISOString().split('T')[0];

        return activeUsers.map(user => {
            const factors: string[] = [];
            let score = 0;

            // 1. Overtime: avg hours > 9h in last 30 days
            const userLogs = timeLogs.filter(l => l.userId === user.id && new Date(l.date) >= thirtyDaysAgo && l.totalHours);
            const avgHours = userLogs.length > 0
                ? userLogs.reduce((s, l) => s + (l.totalHours || 0), 0) / userLogs.length
                : 0;
            if (avgHours > 10) { score += 30; factors.push('Excesso de horas (>10h/dia)'); }
            else if (avgHours > 9) { score += 15; factors.push('Horas acima do normal (>9h/dia)'); }

            // 2. Anomaly count in last 30 days
            const userAnomalies = anomalies.filter(a => a.userId === user.id && new Date(a.createdAt) >= thirtyDaysAgo);
            if (userAnomalies.length > 5) { score += 25; factors.push('Muitas anomalias (>5)'); }
            else if (userAnomalies.length > 3) { score += 15; factors.push('Anomalias recorrentes (>3)'); }

            // 3. Days since last leave (approved, in last 6 months)
            const userLeaves = leaves.filter(l => l.userId === user.id && l.status === 'APPROVED' && new Date(l.endDate) >= sixMonthsAgo)
                .sort((a, b) => b.endDate.localeCompare(a.endDate));
            const lastLeaveEnd = userLeaves.length > 0 ? userLeaves[0].endDate : null;
            const daysSinceLastLeave = lastLeaveEnd
                ? Math.floor((new Date(todayStr).getTime() - new Date(lastLeaveEnd).getTime()) / (1000 * 60 * 60 * 24))
                : 180;
            if (daysSinceLastLeave > 120) { score += 25; factors.push('Sem férias há >4 meses'); }
            else if (daysSinceLastLeave > 60) { score += 10; factors.push('Sem férias há >2 meses'); }

            // 4. Consecutive working days (no weekend/holiday break)
            const sortedDates = [...new Set(timeLogs.filter(l => l.userId === user.id && l.checkIn).map(l => l.date))]
                .sort((a, b) => b.localeCompare(a));
            let consecutive = 0;
            for (let i = 0; i < sortedDates.length - 1; i++) {
                const curr = new Date(sortedDates[i] + 'T00:00:00');
                const prev = new Date(sortedDates[i + 1] + 'T00:00:00');
                const diff = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);
                if (diff <= 1) consecutive++;
                else break;
            }
            if (consecutive > 15) { score += 20; factors.push('Sem folga há >15 dias'); }
            else if (consecutive > 10) { score += 10; factors.push('Sem folga há >10 dias'); }

            const riskScore = Math.min(100, score);
            const riskLevel: 'low' | 'medium' | 'high' = riskScore >= 61 ? 'high' : riskScore >= 31 ? 'medium' : 'low';

            return {
                userId: user.id,
                userName: user.name,
                department: user.department || 'Sem Dept.',
                riskScore,
                riskLevel,
                factors,
                overtimeAvg: Number(avgHours.toFixed(1)),
                anomalyCount: userAnomalies.length,
                daysSinceLastLeave,
            };
        }).sort((a, b) => b.riskScore - a.riskScore);
    },

    calculateHourBankCompliance: (users: User[], timeLogs: TimeLog[]): HourBankRisk[] => {
        const activeUsers = users.filter(u => u.status === UserStatus.ACTIVE);
        const results: HourBankRisk[] = [];

        activeUsers.forEach(user => {
            const uLogs = timeLogs.filter(l => l.userId === user.id && l.totalHours);
            if (uLogs.length === 0) return;

            const expectedMin = user.workStartTime && user.workEndTime
                ? (() => {
                    const s = user.workStartTime!.split(':').map(Number);
                    const e = user.workEndTime!.split(':').map(Number);
                    let d = (e[0] * 60 + e[1]) - (s[0] * 60 + s[1]);
                    if (d > 300) d -= 60; // lunch break
                    return d;
                })()
                : 480;

            let balance = 0;
            uLogs.forEach(l => {
                const worked = Math.round(l.totalHours! * 60);
                balance += worked - expectedMin;
            });

            const balanceH = balance / 60;
            const level: 'ok' | 'warning' | 'critical' =
                balanceH < -10 || balanceH > 40 ? 'critical' :
                balanceH < -5 || balanceH > 20 ? 'warning' : 'ok';

            results.push({
                userId: user.id,
                userName: user.name,
                department: user.department || 'Sem Dept.',
                balance,
                balanceHours: `${balanceH >= 0 ? '+' : ''}${balanceH.toFixed(1)}h`,
                level,
            });
        });

        return results.sort((a, b) => a.balance - b.balance);
    },
};

// Types for analytics
export interface SmartAlert {
    type: 'info' | 'warning' | 'critical' | 'success';
    title: string;
    description: string;
    metric: string;
}

export interface DepartmentMetrics {
    department: string;
    headcount: number;
    avgHours: number;
    latenessRate: number;
    anomalies: number;
}

export interface DayOfWeekData {
    day: string;
    registos: number;
    atrasos: number;
    taxaAtraso: number;
    mediaHoras: number;
}

export interface EmployeeRisk {
    userId: number;
    userName: string;
    department: string;
    riskScore: number;
    riskLevel: 'low' | 'medium' | 'high';
    factors: string[];
    overtimeAvg: number;
    anomalyCount: number;
    daysSinceLastLeave: number;
}

export interface HourBankRisk {
    userId: number;
    userName: string;
    department: string;
    balance: number;
    balanceHours: string;
    level: 'ok' | 'warning' | 'critical';
}
