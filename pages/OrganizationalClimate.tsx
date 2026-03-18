import React, { useState, useMemo } from 'react';
import { SurveyResponse, AnonymousFeedback, User, Department, AnonymousFeedbackStatus } from '../types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import { Heart, MessageSquare, TrendingUp, AlertCircle, CheckCircle2, Search, Filter, Users } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { useToast } from '../context/ToastContext';

interface OrganizationalClimateProps {
    users: User[];
    departments: Department[];
    surveyResponses: SurveyResponse[];
    anonymousFeedbacks: AnonymousFeedback[];
}

const OrganizationalClimate: React.FC<OrganizationalClimateProps> = ({ users, departments, surveyResponses, anonymousFeedbacks }) => {
    const { addToast } = useToast();
    const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'FEEDBACK'>('OVERVIEW');
    const [feedbackFilter, setFeedbackFilter] = useState<AnonymousFeedbackStatus | 'ALL'>('ALL');
    const [updatingFeedbackId, setUpdatingFeedbackId] = useState<number | null>(null);

    // --- ANALYTICS CALCULATIONS ---

    // 1. Current eNPS (mock logic if ENPS isn't fully populated, assuming Weekly Pulse can be used as proxy for demo, or we filter)
    const pulseResponses = surveyResponses.filter(r => r.surveyType === 'WEEKLY_PULSE');

    const currentWeekAverage = useMemo(() => {
        if (pulseResponses.length === 0) return 0;
        const sum = pulseResponses.reduce((acc, curr) => acc + curr.rating, 0);
        return (sum / pulseResponses.length).toFixed(1);
    }, [pulseResponses]);

    // 2. Trend Data (Grouping by reference_date)
    const trendData = useMemo(() => {
        const grouped = pulseResponses.reduce((acc, curr) => {
            const date = curr.referenceDate;
            if (!acc[date]) acc[date] = { date, sum: 0, count: 0 };
            acc[date].sum += curr.rating;
            acc[date].count += 1;
            return acc;
        }, {} as Record<string, { date: string, sum: number, count: number }>);

        return Object.values(grouped).map((g: any) => ({
            date: new Date(g.date).toLocaleDateString('pt-PT', { month: 'short', day: 'numeric' }),
            score: Number((g.sum / g.count).toFixed(1)),
            responses: g.count
        })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }, [pulseResponses]);

    // 3. Department Breakdown
    const departmentScores = useMemo(() => {
        const depStats: Record<string, { sum: number, count: number, name: string }> = {};

        pulseResponses.forEach(r => {
            const user = users.find(u => u.id === r.userId);
            if (user && user.departmentId) {
                const dep = departments.find(d => d.id === user.departmentId);
                const depName = dep ? dep.name : 'Unknown';
                if (!depStats[depName]) depStats[depName] = { sum: 0, count: 0, name: depName };
                depStats[depName].sum += r.rating;
                depStats[depName].count += 1;
            }
        });

        return Object.values(depStats).map(d => ({
            name: d.name,
            score: Number((d.sum / d.count).toFixed(1)),
            responses: d.count
        })).sort((a, b) => b.score - a.score);
    }, [pulseResponses, users, departments]);

    // --- ACTIONS ---

    const handleUpdateFeedbackStatus = async (id: number, newStatus: AnonymousFeedbackStatus) => {
        setUpdatingFeedbackId(id);
        try {
            const { error } = await supabase
                .from('anonymous_feedback')
                .update({ status: newStatus })
                .eq('id', id);

            if (error) throw error;

            addToast('success', 'Estado do feedback atualizado.');
            // TODO: Idealmente atualizar o state local em vez de refresh total, mas o AppRoutes fará o re-render eventual se ligarmos um listener.
            // Para já, este componente não muta o array props, logo só o backend fica atualizado.
            // Num caso real mutaríamos o array local ou faríamos trigger de refetch.
        } catch (err) {
            console.error(err);
            addToast('error', 'Erro ao atualizar feedback.');
        } finally {
            setUpdatingFeedbackId(null);
        }
    };

    const filteredFeedback = useMemo(() => {
        let filtered = [...anonymousFeedbacks].sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());
        if (feedbackFilter !== 'ALL') {
            filtered = filtered.filter(f => f.status === feedbackFilter);
        }
        return filtered;
    }, [anonymousFeedbacks, feedbackFilter]);

    const getStatusColor = (status: AnonymousFeedbackStatus) => {
        switch (status) {
            case 'NEW': return 'bg-blue-100 text-blue-800 border-blue-200';
            case 'IN_REVIEW': return 'bg-amber-100 text-amber-800 border-amber-200';
            case 'ACTION_TAKEN': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
            case 'CLOSED': return 'bg-gray-100 text-gray-800 border-gray-200';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getStatusLabel = (status: AnonymousFeedbackStatus) => {
        switch (status) {
            case 'NEW': return 'Novo';
            case 'IN_REVIEW': return 'Em Análise';
            case 'ACTION_TAKEN': return 'Ação Tomada';
            case 'CLOSED': return 'Fechado';
            default: return status;
        }
    };

    const getCategoryColor = (category: string) => {
        switch (category) {
            case 'SUGGESTION': return 'text-blue-600 bg-blue-50';
            case 'CONCERN': return 'text-red-600 bg-red-50';
            case 'OTHER': return 'text-purple-600 bg-purple-50';
            default: return 'text-gray-600 bg-gray-50';
        }
    };

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <div className="flex justify-between items-end mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Clima Organizacional</h1>
                    <p className="text-gray-500 mt-2">Métricas de satisfação e canal de feedback seguro.</p>
                </div>

                <div className="flex bg-white rounded-xl shadow-sm border border-gray-200 p-1">
                    <button
                        onClick={() => setActiveTab('OVERVIEW')}
                        className={`px-6 py-2 rounded-lg font-medium text-sm transition-all ${activeTab === 'OVERVIEW' ? 'bg-brand-50 text-brand-700 shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                            }`}
                    >
                        Visão Geral
                    </button>
                    <button
                        onClick={() => setActiveTab('FEEDBACK')}
                        className={`px-6 py-2 rounded-lg font-medium text-sm transition-all flex items-center gap-2 ${activeTab === 'FEEDBACK' ? 'bg-brand-50 text-brand-700 shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                            }`}
                    >
                        Feedback Anónimo
                        {anonymousFeedbacks.filter(f => f.status === 'NEW').length > 0 && (
                            <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
                                {anonymousFeedbacks.filter(f => f.status === 'NEW').length}
                            </span>
                        )}
                    </button>
                </div>
            </div>

            {activeTab === 'OVERVIEW' && (
                <div className="space-y-6 animate-fade-in">
                    {/* Top KPIs */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex items-center gap-6">
                            <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                                <Heart size={32} className="fill-blue-600" />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-1">Pulse Score (Semanal)</p>
                                <div className="flex items-end gap-2">
                                    <span className="text-4xl font-black text-gray-900">{currentWeekAverage}</span>
                                    <span className="text-gray-400 mb-1 font-medium">/ 5.0</span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex items-center gap-6">
                            <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                                <MessageSquare size={32} />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-1">Respostas</p>
                                <div className="flex items-end gap-2">
                                    <span className="text-4xl font-black text-gray-900">{pulseResponses.length}</span>
                                    <span className="text-gray-400 mb-1 font-medium">totais</span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex items-center gap-6">
                            <div className="w-16 h-16 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                                <TrendingUp size={32} />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-1">Feedback Recebido</p>
                                <div className="flex items-end gap-2">
                                    <span className="text-4xl font-black text-gray-900">{anonymousFeedbacks.length}</span>
                                    <span className="text-gray-400 mb-1 font-medium">mensagens</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Charts */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Trend Chart */}
                        <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                            <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                                <TrendingUp size={20} className="text-brand-500" />
                                Evolução do Sentimento (Pulse)
                            </h3>
                            <div className="h-80">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={trendData}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                        <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12 }} dy={10} />
                                        <YAxis domain={[1, 5]} axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12 }} dx={-10} />
                                        <Tooltip
                                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                                            formatter={(value: number) => [`${value} / 5`, 'Score']}
                                            labelStyle={{ fontWeight: 'bold', color: '#111827', marginBottom: '4px' }}
                                        />
                                        <Line
                                            type="monotone"
                                            dataKey="score"
                                            stroke="#3B82F6"
                                            strokeWidth={4}
                                            dot={{ r: 6, fill: '#3B82F6', strokeWidth: 2, stroke: '#FFFFFF' }}
                                            activeDot={{ r: 8, strokeWidth: 0 }}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Department Breakdown */}
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                            <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                                <Users size={20} className="text-brand-500" />
                                Por Departamento
                            </h3>
                            <div className="h-80">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={departmentScores} layout="vertical" margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E5E7EB" />
                                        <XAxis type="number" domain={[0, 5]} hide />
                                        <YAxis
                                            dataKey="name"
                                            type="category"
                                            axisLine={false}
                                            tickLine={false}
                                            width={100}
                                            tick={{ fill: '#4B5563', fontSize: 12, fontWeight: 500 }}
                                        />
                                        <Tooltip
                                            cursor={{ fill: '#F3F4F6' }}
                                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                                            formatter={(value: number, name: string, props: any) => [`${value} / 5 (${props.payload.responses} resp.)`, 'Score']}
                                        />
                                        <Bar dataKey="score" radius={[0, 4, 4, 0]} maxBarSize={32}>
                                            {departmentScores.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.score >= 4 ? '#10B981' : entry.score >= 3 ? '#F59E0B' : '#EF4444'} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    {/* Recent Survey Feedback Context */}
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                        <h3 className="text-lg font-bold text-gray-900 mb-6">Comentários Recentes (Pulse)</h3>
                        <div className="space-y-4">
                            {pulseResponses.filter(r => r.feedback).slice(0, 5).map(r => (
                                <div key={r.id} className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${r.rating >= 4 ? 'bg-green-100 text-green-700' :
                                            r.rating === 3 ? 'bg-yellow-100 text-yellow-700' :
                                                'bg-red-100 text-red-700'
                                            }`}>Score: {r.rating}</span>
                                        <span className="text-xs text-gray-400">{new Date(r.referenceDate).toLocaleDateString()}</span>
                                    </div>
                                    <p className="text-gray-700 text-sm">"{r.feedback}"</p>
                                </div>
                            ))}
                            {pulseResponses.filter(r => r.feedback).length === 0 && (
                                <p className="text-gray-500 text-sm italic py-4">Nenhum comentário adicionado aos surveys pulse recentes.</p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'FEEDBACK' && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 animate-fade-in flex flex-col min-h-[600px]">

                    {/* Header & Filters */}
                    <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">Caixa de Entrada Anónima</h2>
                            <p className="text-sm text-gray-500">Gere e responde ao feedback submetido portal canal anónimo.</p>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <Filter size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <select
                                    value={feedbackFilter}
                                    onChange={(e) => setFeedbackFilter(e.target.value as any)}
                                    className="pl-9 pr-8 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-brand-500/20 outline-none"
                                >
                                    <option value="ALL">Todos os Estados</option>
                                    <option value="NEW">Novos</option>
                                    <option value="IN_REVIEW">Em Análise</option>
                                    <option value="ACTION_TAKEN">Ação Tomada</option>
                                    <option value="CLOSED">Fechados</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* List */}
                    <div className="flex-1 p-6">
                        {filteredFeedback.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-gray-400 py-20">
                                <CheckCircle2 size={48} className="mb-4 text-gray-300" />
                                <p className="text-lg font-medium text-gray-900">Caixa Limpa!</p>
                                <p className="text-sm">Não há feedback com estes filtros.</p>
                            </div>
                        ) : (
                            <div className="grid gap-4">
                                {filteredFeedback.map(item => (
                                    <div key={item.id} className="border border-gray-100 rounded-xl p-5 hover:shadow-md transition-shadow bg-white flex flex-col md:flex-row gap-6">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-3">
                                                <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${getCategoryColor(item.category)}`}>
                                                    {item.category === 'SUGGESTION' && <MessageSquare size={12} />}
                                                    {item.category === 'CONCERN' && <AlertCircle size={12} />}
                                                    {item.category === 'OTHER' && <Search size={12} />}
                                                    {item.category === 'SUGGESTION' ? 'Sugestão' : item.category === 'CONCERN' ? 'Preocupação' : 'Outro'}
                                                </span>
                                                <span className="text-xs text-gray-400">
                                                    {new Date(item.createdAt!).toLocaleString('pt-PT')}
                                                </span>
                                            </div>
                                            <p className="text-gray-800 whitespace-pre-wrap">{item.content}</p>
                                        </div>

                                        <div className="md:w-64 shrink-0 border-t md:border-t-0 md:border-l border-gray-100 pt-4 md:pt-0 md:pl-6 flex flex-col justify-center">
                                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Estado</label>
                                            <select
                                                value={item.status}
                                                disabled={updatingFeedbackId === item.id}
                                                onChange={(e) => handleUpdateFeedbackStatus(item.id, e.target.value as AnonymousFeedbackStatus)}
                                                className={`w-full py-2 px-3 rounded-lg border text-sm font-bold transition-colors outline-none cursor-pointer appearance-none ${getStatusColor(item.status)}`}
                                            >
                                                <option value="NEW">🔴 Novo</option>
                                                <option value="IN_REVIEW">🟡 Em Análise</option>
                                                <option value="ACTION_TAKEN">🟢 Ação Tomada</option>
                                                <option value="CLOSED">⚪ Fechado</option>
                                            </select>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default OrganizationalClimate;
