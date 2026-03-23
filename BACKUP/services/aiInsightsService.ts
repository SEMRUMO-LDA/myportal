/**
 * AI Insights Service
 * Generates AI-powered analytics insights and executive summaries using LLM
 */

import { generateAIContent } from './geminiService';
import { SmartAlert, DepartmentMetrics, EmployeeRisk } from './analyticsService';

interface KPIData {
  attendanceRate: number;
  absenteeismRate: number;
  avgHours: string;
  pendingApprovals: number;
  totalActive: number;
}

interface KPITrends {
  attendanceDelta: number;
  absenteeismDelta: number;
}

const HR_ANALYST_PROMPT = `Tu és um Analista Senior de Recursos Humanos numa empresa portuguesa.
Analisa os dados HR fornecidos e gera insights em Português de Portugal.
Sê objetivo, profissional e foca-te em:
1. Tendências preocupantes ou positivas
2. Riscos operacionais (burnout, compliance, quórum)
3. Recomendações concretas e acionáveis
4. Comparações departamentais relevantes

Formata a resposta com secções claras usando marcadores (•).
Máximo 300 palavras.`;

const WEEKLY_SUMMARY_PROMPT = `Tu és um Analista Senior de RH a preparar o resumo semanal para a direção de uma empresa portuguesa.
Gera um resumo executivo conciso com:
1. Estado geral da equipa (1-2 frases)
2. Indicadores-chave e tendências
3. Alertas e riscos identificados
4. Ações recomendadas para a próxima semana

Tom: profissional e direto. Português de Portugal.
Máximo 250 palavras.`;

export const aiInsightsService = {

  prepareDataSnapshot(
    kpis: KPIData,
    trends: KPITrends,
    alerts: SmartAlert[],
    deptComparison: DepartmentMetrics[],
    riskScores: EmployeeRisk[]
  ): string {
    const highRisk = riskScores.filter(r => r.riskLevel === 'high');
    const mediumRisk = riskScores.filter(r => r.riskLevel === 'medium');

    const lines = [
      `=== INDICADORES CHAVE (últimos 30 dias) ===`,
      `Taxa de Assiduidade: ${kpis.attendanceRate}% (variação: ${trends.attendanceDelta > 0 ? '+' : ''}${trends.attendanceDelta}pp vs mês anterior)`,
      `Taxa de Absentismo: ${kpis.absenteeismRate}%`,
      `Média Horas/Dia: ${kpis.avgHours}h`,
      `Aprovações Pendentes: ${kpis.pendingApprovals}`,
      `Colaboradores Ativos: ${kpis.totalActive}`,
      '',
      `=== ALERTAS ATIVOS ===`,
      ...alerts.map(a => `[${a.type.toUpperCase()}] ${a.title}: ${a.description} (${a.metric})`),
      alerts.length === 0 ? 'Nenhum alerta ativo.' : '',
      '',
      `=== COMPARAÇÃO DEPARTAMENTAL ===`,
      ...deptComparison.map(d => `${d.department}: ${d.headcount} pessoas, ${d.avgHours}h/dia, ${d.latenessRate}% atrasos, ${d.anomalies} anomalias`),
      '',
      `=== RISCOS POR COLABORADOR ===`,
      `Alto risco: ${highRisk.length} colaboradores`,
      ...highRisk.slice(0, 5).map(r => `  • ${r.userName} (${r.department}): Score ${r.riskScore} — ${r.factors.join(', ')}`),
      `Risco médio: ${mediumRisk.length} colaboradores`,
      ...mediumRisk.slice(0, 3).map(r => `  • ${r.userName} (${r.department}): Score ${r.riskScore} — ${r.factors.join(', ')}`),
    ];

    return lines.filter(l => l !== undefined).join('\n');
  },

  prepareCompactSnapshot(
    kpis: KPIData,
    summary: { activeUsers: number; onVacationToday: number; clockedInToday: number }
  ): string {
    return [
      `Taxa assiduidade: ${kpis.attendanceRate}%`,
      `Absentismo: ${kpis.absenteeismRate}%`,
      `Média horas/dia: ${kpis.avgHours}h`,
      `Aprovações pendentes: ${kpis.pendingApprovals}`,
      `Colaboradores ativos: ${summary.activeUsers}`,
      `A trabalhar hoje: ${summary.clockedInToday}`,
      `De férias hoje: ${summary.onVacationToday}`,
    ].join('\n');
  },

  async generateAnalyticsInsight(snapshot: string): Promise<string> {
    const prompt = `Analisa os seguintes dados HR e gera insights:\n\n${snapshot}`;
    return generateAIContent(HR_ANALYST_PROMPT, prompt);
  },

  async generateWeeklySummary(snapshot: string): Promise<string> {
    const prompt = `Gera o resumo semanal com base nestes dados:\n\n${snapshot}`;
    return generateAIContent(WEEKLY_SUMMARY_PROMPT, prompt);
  },
};
