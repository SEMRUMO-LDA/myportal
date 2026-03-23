import React, { useMemo, useState } from 'react';
import Header from '../components/Header';
import {
  User, TimeLog, Leave, LeaveType, Anomaly, Department
} from '../types';
import {
  BarChart3, TrendingUp, TrendingDown, Clock, Users, CalendarCheck, AlertTriangle,
  Download, PieChart as PieIcon, Activity as ActivityIcon, Zap, CheckCircle2, Info, AlertCircle, ArrowUpRight, ArrowDownRight,
  Brain, ShieldAlert, RefreshCw, Loader2, Sparkles, Landmark
} from 'lucide-react';
import { useOutletContext } from 'react-router-dom';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts';
import { analyticsService, SmartAlert, EmployeeRisk, HourBankRisk } from '../services/analyticsService';
import { aiInsightsService } from '../services/aiInsightsService';

interface AnalyticsDashboardProps {
  users: User[];
  timeLogs: TimeLog[];
  leaves: Leave[];
  leaveTypes: LeaveType[];
  anomalies: Anomaly[];
  departments: Department[];
}

const COLORS = ['#4f46e5', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6'];

function exportCSV(data: Record<string, any>[], filename: string) {
  if (data.length === 0) return;
  const headers = Object.keys(data[0]);
  const csv = [
    headers.join(','),
    ...data.map(row => headers.map(h => `"${row[h] ?? ''}"`).join(','))
  ].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  users, timeLogs, leaves, leaveTypes, anomalies
}) => {
  const { toggleSidebar } = useOutletContext<{ toggleSidebar: () => void }>();
  const [periodMonths, setPeriodMonths] = useState(6);
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [showAllRisks, setShowAllRisks] = useState(false);
  const [aiTab, setAiTab] = useState<'insight' | 'weekly'>('insight');

  // ─── KPI CALCULATIONS ───
  const kpis = useMemo(() =>
    analyticsService.calculateKPIs(users, timeLogs, leaves),
    [users, timeLogs, leaves]
  );

  const kpiTrends = useMemo(() =>
    analyticsService.calculateKPITrends(users, timeLogs, leaves),
    [users, timeLogs, leaves]
  );

  // ─── SMART ALERTS ───
  const smartAlerts = useMemo(() =>
    analyticsService.generateSmartAlerts(users, timeLogs, leaves, anomalies),
    [users, timeLogs, leaves, anomalies]
  );

  // ─── MONTHLY ATTENDANCE TREND ───
  const attendanceTrend = useMemo(() =>
    analyticsService.calculateAttendanceTrend(users, timeLogs, leaves, periodMonths),
    [users, timeLogs, leaves, periodMonths]
  );

  // ─── HOURS BY DEPARTMENT ───
  const hoursByDept = useMemo(() =>
    analyticsService.calculateHoursByDepartment(users, timeLogs),
    [users, timeLogs]
  );

  // ─── LEAVE TYPE DISTRIBUTION ───
  const leaveDistribution = useMemo(() =>
    analyticsService.calculateLeaveDistribution(leaves, leaveTypes),
    [leaves, leaveTypes]
  );

  // ─── TOP ANOMALIES ───
  const topAnomalies = useMemo(() =>
    analyticsService.calculateTopAnomalies(anomalies),
    [anomalies]
  );

  // ─── DEPARTMENT COMPARISON ───
  const deptComparison = useMemo(() =>
    analyticsService.calculateDepartmentComparison(users, timeLogs, anomalies),
    [users, timeLogs, anomalies]
  );

  // ─── DAY OF WEEK ───
  const dayOfWeek = useMemo(() =>
    analyticsService.calculateDayOfWeekPattern(timeLogs),
    [timeLogs]
  );

  // ─── SUMMARY ───
  const summary = useMemo(() =>
    analyticsService.calculateSummary(users, leaves, timeLogs),
    [users, leaves, timeLogs]
  );

  // ─── RISK SCORES ───
  const riskScores = useMemo(() =>
    analyticsService.calculateEmployeeRiskScores(users, timeLogs, leaves, anomalies),
    [users, timeLogs, leaves, anomalies]
  );

  const hourBankRisks = useMemo(() =>
    analyticsService.calculateHourBankCompliance(users, timeLogs),
    [users, timeLogs]
  );

  const risksToShow = useMemo(() => {
    if (showAllRisks) return riskScores.filter(r => r.riskScore > 0);
    return riskScores.filter(r => r.riskLevel !== 'low');
  }, [riskScores, showAllRisks]);

  const hourBankAlerts = useMemo(() =>
    hourBankRisks.filter(r => r.level !== 'ok'),
    [hourBankRisks]
  );

  // ─── AI HANDLER ───
  const handleGenerateInsight = async () => {
    setAiLoading(true);
    try {
      const snapshot = aiInsightsService.prepareDataSnapshot(kpis, kpiTrends, smartAlerts, deptComparison, riskScores);
      const result = aiTab === 'weekly'
        ? await aiInsightsService.generateWeeklySummary(snapshot)
        : await aiInsightsService.generateAnalyticsInsight(snapshot);
      setAiInsight(result);
    } catch {
      setAiInsight('Erro ao gerar análise. Verifique a configuração da API.');
    }
    setAiLoading(false);
  };

  const alertIcons: Record<string, React.ReactNode> = {
    critical: <AlertCircle size={18} />,
    warning: <AlertTriangle size={18} />,
    info: <Info size={18} />,
    success: <CheckCircle2 size={18} />
  };
  const alertColors: Record<string, string> = {
    critical: 'bg-red-50 border-red-200 text-red-800',
    warning: 'bg-amber-50 border-amber-200 text-amber-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800',
    success: 'bg-green-50 border-green-200 text-green-800'
  };
  const alertMetricColors: Record<string, string> = {
    critical: 'bg-red-100 text-red-700',
    warning: 'bg-amber-100 text-amber-700',
    info: 'bg-blue-100 text-blue-700',
    success: 'bg-green-100 text-green-700'
  };

  // ─── RENDER ───
  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8 w-full max-w-[1600px] mx-auto space-y-6 pb-24 md:pb-8">
      <Header
        title="Analytics"
        subtitle="Indicadores de desempenho e tendências"
        icon={<BarChart3 size={20} />}
        onMenuClick={toggleSidebar}
      />

      <div className="space-y-6">
        {/* KPI ROW */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            label="Taxa Assiduidade"
            value={`${kpis.attendanceRate}%`}
            icon={<CalendarCheck size={20} />}
            color="indigo"
            trend={kpis.attendanceRate >= 85 ? 'up' : 'down'}
            delta={kpiTrends.attendanceDelta}
          />
          <KPICard
            label="Taxa Absentismo"
            value={`${kpis.absenteeismRate}%`}
            icon={<AlertTriangle size={20} />}
            color="amber"
            trend={kpis.absenteeismRate <= 5 ? 'up' : 'down'}
            delta={-kpiTrends.absenteeismDelta}
          />
          <KPICard
            label="Média Horas/Dia"
            value={`${kpis.avgHours}h`}
            icon={<Clock size={20} />}
            color="cyan"
          />
          <KPICard
            label="Aprovações Pendentes"
            value={String(kpis.pendingApprovals)}
            icon={<ActivityIcon size={20} />}
            color="rose"
          />
        </div>

        {/* AI INSIGHTS PANEL */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-5 text-white shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-xl">
                <Brain size={20} />
              </div>
              <div>
                <h3 className="font-bold text-sm">Análise AI</h3>
                <p className="text-white/70 text-[10px]">Insights gerados por inteligência artificial</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex bg-white/10 rounded-lg p-0.5">
                <button
                  onClick={() => { setAiTab('insight'); setAiInsight(null); }}
                  className={`text-[10px] font-bold px-3 py-1.5 rounded-md transition-colors ${aiTab === 'insight' ? 'bg-white/20 text-white' : 'text-white/60 hover:text-white/80'}`}
                >
                  Análise
                </button>
                <button
                  onClick={() => { setAiTab('weekly'); setAiInsight(null); }}
                  className={`text-[10px] font-bold px-3 py-1.5 rounded-md transition-colors ${aiTab === 'weekly' ? 'bg-white/20 text-white' : 'text-white/60 hover:text-white/80'}`}
                >
                  Resumo Semanal
                </button>
              </div>
              {aiInsight && (
                <button
                  onClick={handleGenerateInsight}
                  disabled={aiLoading}
                  className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                  title="Atualizar"
                >
                  <RefreshCw size={14} className={aiLoading ? 'animate-spin' : ''} />
                </button>
              )}
            </div>
          </div>

          {!aiInsight && !aiLoading && (
            <div className="text-center py-6">
              <Sparkles size={28} className="mx-auto mb-3 text-white/50" />
              <p className="text-white/70 text-xs mb-4">
                {aiTab === 'weekly'
                  ? 'Gere um resumo semanal executivo dos dados HR'
                  : 'Analise os dados HR com inteligência artificial para obter insights e recomendações'}
              </p>
              <button
                onClick={handleGenerateInsight}
                className="px-5 py-2.5 bg-white/20 hover:bg-white/30 rounded-xl text-sm font-bold transition-colors flex items-center gap-2 mx-auto"
              >
                <Brain size={16} />
                {aiTab === 'weekly' ? 'Gerar Resumo Semanal' : 'Gerar Análise AI'}
              </button>
            </div>
          )}

          {aiLoading && (
            <div className="text-center py-8">
              <Loader2 size={24} className="animate-spin mx-auto mb-3 text-white/70" />
              <p className="text-white/70 text-xs">A analisar dados HR...</p>
            </div>
          )}

          {aiInsight && !aiLoading && (
            <div className="bg-white/10 rounded-xl p-4 mt-2">
              <p className="text-sm text-white/90 whitespace-pre-wrap leading-relaxed">{aiInsight}</p>
            </div>
          )}
        </div>

        {/* SMART ALERTS */}
        {smartAlerts.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Zap size={16} className="text-amber-500" />
              <h3 className="text-sm font-bold text-gray-700">Alertas Inteligentes</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {smartAlerts.map((alert, i) => (
                <div key={i} className={`rounded-xl border p-4 ${alertColors[alert.type]} flex items-start gap-3`}>
                  <div className="mt-0.5 shrink-0">{alertIcons[alert.type]}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold">{alert.title}</p>
                    <p className="text-xs mt-1 opacity-80 leading-relaxed">{alert.description}</p>
                  </div>
                  <span className={`shrink-0 text-xs font-bold px-2 py-1 rounded-lg ${alertMetricColors[alert.type]}`}>
                    {alert.metric}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* RISK INDICATORS */}
        {risksToShow.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldAlert size={16} className="text-red-500" />
                <h3 className="text-sm font-bold text-gray-700">Indicadores de Risco</h3>
                <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                  {riskScores.filter(r => r.riskLevel === 'high').length} alto{riskScores.filter(r => r.riskLevel === 'high').length !== 1 ? 's' : ''}
                </span>
              </div>
              <button
                onClick={() => setShowAllRisks(!showAllRisks)}
                className="text-[10px] font-bold text-gray-500 hover:text-indigo-600 transition-colors"
              >
                {showAllRisks ? 'Ver apenas riscos' : 'Ver todos'}
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {risksToShow.slice(0, 9).map(risk => {
                const barColor = risk.riskLevel === 'high' ? 'bg-red-500' : risk.riskLevel === 'medium' ? 'bg-amber-500' : 'bg-green-500';
                const bgColor = risk.riskLevel === 'high' ? 'border-red-200 bg-red-50/30' : risk.riskLevel === 'medium' ? 'border-amber-200 bg-amber-50/30' : 'border-gray-200';
                return (
                  <div key={risk.userId} className={`bg-white rounded-xl border p-4 ${bgColor}`}>
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="text-sm font-bold text-gray-800">{risk.userName}</p>
                        <p className="text-[10px] text-gray-500">{risk.department}</p>
                      </div>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${risk.riskLevel === 'high' ? 'bg-red-100 text-red-700' :
                        risk.riskLevel === 'medium' ? 'bg-amber-100 text-amber-700' :
                          'bg-green-100 text-green-700'
                        }`}>
                        {risk.riskScore}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5 mb-2">
                      <div className={`h-1.5 rounded-full ${barColor} transition-all`} style={{ width: `${risk.riskScore}%` }} />
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {risk.factors.map((f, i) => (
                        <span key={i} className="text-[9px] font-medium text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded">
                          {f}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* HOUR BANK COMPLIANCE */}
        {hourBankAlerts.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Landmark size={16} className="text-purple-500" />
              <h3 className="text-sm font-bold text-gray-700">Banco de Horas — Compliance</h3>
              <span className="text-[10px] font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">
                {hourBankAlerts.length} alerta{hourBankAlerts.length !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="text-left py-2.5 px-4 text-xs font-bold text-gray-500 uppercase">Colaborador</th>
                      <th className="text-left py-2.5 px-4 text-xs font-bold text-gray-500 uppercase">Departamento</th>
                      <th className="text-right py-2.5 px-4 text-xs font-bold text-gray-500 uppercase">Saldo</th>
                      <th className="text-center py-2.5 px-4 text-xs font-bold text-gray-500 uppercase">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {hourBankAlerts.map(r => (
                      <tr key={r.userId} className="hover:bg-gray-50">
                        <td className="py-2.5 px-4 font-medium text-gray-800">{r.userName}</td>
                        <td className="py-2.5 px-4 text-gray-500">{r.department}</td>
                        <td className={`py-2.5 px-4 text-right font-mono font-bold ${r.balance < 0 ? 'text-red-600' : 'text-amber-600'}`}>
                          {r.balanceHours}
                        </td>
                        <td className="py-2.5 px-4 text-center">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${r.level === 'critical' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                            }`}>
                            {r.level === 'critical' ? 'Crítico' : 'Atenção'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* SUMMARY BAR */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap gap-6 items-center">
          <div className="flex items-center gap-2">
            <Users size={16} className="text-indigo-500" />
            <span className="text-sm text-gray-600">Colaboradores ativos: <strong className="text-gray-900">{summary.activeUsers}</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <CalendarCheck size={16} className="text-green-500" />
            <span className="text-sm text-gray-600">A trabalhar hoje: <strong className="text-gray-900">{summary.clockedInToday}</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <CalendarCheck size={16} className="text-amber-500" />
            <span className="text-sm text-gray-600">De férias hoje: <strong className="text-gray-900">{summary.onVacationToday}</strong></span>
          </div>
          <div className="ml-auto">
            <select
              value={periodMonths}
              onChange={e => setPeriodMonths(Number(e.target.value))}
              className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-gray-50"
            >
              <option value={3}>3 meses</option>
              <option value={6}>6 meses</option>
              <option value={12}>12 meses</option>
            </select>
          </div>
        </div>

        {/* CHARTS ROW 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Attendance Trend */}
          <ChartCard
            title="Tendência de Assiduidade"
            icon={<TrendingUp size={16} />}
            onExport={() => exportCSV(attendanceTrend, 'tendencia_assiduidade')}
          >
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={attendanceTrend}>
                <defs>
                  <linearGradient id="gradTaxa" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} domain={[0, 100]} />
                <Tooltip
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '13px' }}
                  formatter={(value: number, name: string) => [
                    name === 'taxa' ? `${value}%` : value,
                    name === 'taxa' ? 'Taxa Assiduidade' : 'Ausências'
                  ]}
                />
                <Legend formatter={(value) => value === 'taxa' ? 'Taxa (%)' : 'Ausências'} />
                <Area type="monotone" dataKey="taxa" stroke="#4f46e5" fill="url(#gradTaxa)" strokeWidth={2} />
                <Area type="monotone" dataKey="ausencias" stroke="#f59e0b" fill="transparent" strokeWidth={2} strokeDasharray="5 5" />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Day of Week Pattern */}
          <ChartCard
            title="Padrão por Dia da Semana"
            icon={<BarChart3 size={16} />}
            onExport={() => exportCSV(dayOfWeek, 'padrao_semanal')}
          >
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={dayOfWeek.filter(d => d.registos > 0)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '13px' }}
                  formatter={(value: number, name: string) => [
                    name === 'taxaAtraso' ? `${value}%` : name === 'mediaHoras' ? `${value}h` : value,
                    name === 'taxaAtraso' ? 'Taxa Atraso' : name === 'mediaHoras' ? 'Média Horas' : name === 'registos' ? 'Registos' : 'Atrasos'
                  ]}
                />
                <Legend formatter={v => v === 'taxaAtraso' ? 'Taxa Atraso (%)' : v === 'mediaHoras' ? 'Média Horas' : v} />
                <Bar dataKey="taxaAtraso" fill="#ef4444" radius={[4, 4, 0, 0]} name="taxaAtraso" />
                <Bar dataKey="mediaHoras" fill="#06b6d4" radius={[4, 4, 0, 0]} name="mediaHoras" />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* CHARTS ROW 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Hours by Department */}
          <ChartCard
            title="Horas por Departamento"
            icon={<BarChart3 size={16} />}
            onExport={() => exportCSV(hoursByDept, 'horas_departamento')}
          >
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={hoursByDept} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis dataKey="departamento" type="category" width={110} tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '13px' }}
                  formatter={(value: number, name: string) => [
                    name === 'mediaHoras' ? `${value}h` : `${value}h`,
                    name === 'mediaHoras' ? 'Média/dia' : 'Total'
                  ]}
                />
                <Bar dataKey="mediaHoras" fill="#06b6d4" radius={[0, 4, 4, 0]} name="mediaHoras" />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Leave Type Distribution */}
          <ChartCard
            title="Distribuição de Ausências"
            icon={<PieIcon size={16} />}
            onExport={() => exportCSV(leaveDistribution.map(d => ({ tipo: d.name, total: d.count })), 'distribuicao_ausencias')}
          >
            {leaveDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={leaveDistribution}
                    dataKey="count"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    innerRadius={50}
                    paddingAngle={2}
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    labelLine={false}
                  >
                    {leaveDistribution.map((entry, index) => (
                      <Cell key={index} fill={entry.color || COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '13px' }}
                    formatter={(value: number) => [`${value} ausências`]}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[280px] flex items-center justify-center text-gray-400 text-sm">
                Sem dados de ausências aprovadas
              </div>
            )}
          </ChartCard>
        </div>

        {/* CHARTS ROW 3 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Anomalies */}
          <ChartCard
            title="Top Anomalias"
            icon={<AlertTriangle size={16} />}
            onExport={() => exportCSV(topAnomalies, 'top_anomalias')}
          >
            {topAnomalies.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={topAnomalies}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="tipo" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '13px' }}
                    formatter={(value: number) => [`${value} ocorrências`]}
                  />
                  <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                    {topAnomalies.map((_, index) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[280px] flex items-center justify-center text-gray-400 text-sm">
                Sem anomalias registadas
              </div>
            )}
          </ChartCard>

          {/* Department Comparison Table */}
          <ChartCard
            title="Comparação Departamental"
            icon={<Users size={16} />}
            onExport={() => exportCSV(deptComparison, 'comparacao_departamentos')}
          >
            {deptComparison.length > 0 ? (
              <div className="overflow-x-auto max-h-[280px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-gray-50">
                    <tr className="text-xs font-bold text-gray-500 uppercase">
                      <th className="text-left py-2 px-3">Departamento</th>
                      <th className="text-center py-2 px-2">Pessoas</th>
                      <th className="text-center py-2 px-2">Méd. Horas</th>
                      <th className="text-center py-2 px-2">Atrasos</th>
                      <th className="text-center py-2 px-2">Anomalias</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {deptComparison.map((d, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="py-2.5 px-3 font-medium text-gray-800">{d.department}</td>
                        <td className="py-2.5 px-2 text-center text-gray-600">{d.headcount}</td>
                        <td className="py-2.5 px-2 text-center font-mono text-gray-700">{d.avgHours}h</td>
                        <td className="py-2.5 px-2 text-center">
                          <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${d.latenessRate > 10 ? 'bg-red-100 text-red-700' : d.latenessRate > 5 ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                            {d.latenessRate}%
                          </span>
                        </td>
                        <td className="py-2.5 px-2 text-center text-gray-600">{d.anomalies}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="h-[280px] flex items-center justify-center text-gray-400 text-sm">
                Sem dados departamentais
              </div>
            )}
          </ChartCard>
        </div>
      </div>
    </div>
  );
};

// ─── SUB-COMPONENTS ───

interface KPICardProps {
  label: string;
  value: string;
  icon: React.ReactNode;
  color: 'indigo' | 'amber' | 'cyan' | 'rose';
  trend?: 'up' | 'down';
  delta?: number;
}

const colorMap = {
  indigo: { bg: 'bg-indigo-50', text: 'text-indigo-600', ring: 'ring-indigo-200' },
  amber: { bg: 'bg-amber-50', text: 'text-amber-600', ring: 'ring-amber-200' },
  cyan: { bg: 'bg-cyan-50', text: 'text-cyan-600', ring: 'ring-cyan-200' },
  rose: { bg: 'bg-rose-50', text: 'text-rose-600', ring: 'ring-rose-200' },
};

const KPICard: React.FC<KPICardProps> = ({ label, value, icon, color, trend, delta }) => {
  const c = colorMap[color];
  return (
    <div className={`bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow ring-1 ${c.ring}`}>
      <div className="flex items-center justify-between mb-3">
        <div className={`p-2 rounded-lg ${c.bg} ${c.text}`}>{icon}</div>
        <div className="flex items-center gap-1.5">
          {delta !== undefined && delta !== 0 && (
            <span className={`text-[10px] font-bold flex items-center gap-0.5 ${delta > 0 ? 'text-green-600' : 'text-red-600'}`}>
              {delta > 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
              {Math.abs(delta)}pp
            </span>
          )}
          {trend && (
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${trend === 'up' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
              {trend === 'up' ? 'Bom' : 'Atenção'}
            </span>
          )}
        </div>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500 mt-1">{label}</p>
    </div>
  );
};

interface ChartCardProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  onExport: () => void;
}

const ChartCard: React.FC<ChartCardProps> = ({ title, icon, children, onExport }) => (
  <div className="bg-white rounded-xl border border-gray-200 p-5">
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        <span className="text-indigo-500">{icon}</span>
        <h3 className="text-sm font-bold text-gray-800">{title}</h3>
      </div>
      <button
        onClick={onExport}
        className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-indigo-600 transition-colors px-2 py-1 rounded-lg hover:bg-gray-50"
        title="Exportar CSV"
      >
        <Download size={14} />
        CSV
      </button>
    </div>
    {children}
  </div>
);

export default AnalyticsDashboard;
