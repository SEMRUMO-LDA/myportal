
import React, { useState } from 'react';
import Header from '../components/Header';
import { useOutletContext } from 'react-router-dom';
import { Holiday } from '../types';
import { Calendar, ChevronLeft, ChevronRight, List as ListIcon, Calendar as CalendarIcon, Upload, Trash2, Plus } from 'lucide-react';

interface HolidaysManagementProps {
    holidays: Holiday[];
    onAddHoliday: (date: string, name: string, type: 'National' | 'Local' | 'Optional') => void;
    onDeleteHoliday: (id: number) => void;
}

const HolidaysManagement: React.FC<HolidaysManagementProps> = ({ holidays, onAddHoliday, onDeleteHoliday }) => {
    const { toggleSidebar } = useOutletContext<{ toggleSidebar: () => void }>();
    const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
    const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
    const [importing, setImporting] = useState(false);

    // Simple hardcoded Portuguese holidays for import simulation
    const defaultHolidays = [
        { date: `${currentYear}-01-01`, name: 'Ano Novo' },
        { date: `${currentYear}-04-25`, name: 'Dia da Liberdade' },
        { date: `${currentYear}-05-01`, name: 'Dia do Trabalhador' },
        { date: `${currentYear}-06-10`, name: 'Dia de Portugal' },
        { date: `${currentYear}-08-15`, name: 'Assunção de Nossa Senhora' },
        { date: `${currentYear}-10-05`, name: 'Implantação da República' },
        { date: `${currentYear}-11-01`, name: 'Dia de Todos os Santos' },
        { date: `${currentYear}-12-01`, name: 'Restauração da Independência' },
        { date: `${currentYear}-12-08`, name: 'Imaculada Conceição' },
        { date: `${currentYear}-12-25`, name: 'Natal' }
    ];

    const handleImport = () => {
        setImporting(true);
        // Simulate API call
        setTimeout(() => {
            defaultHolidays.forEach(h => {
                // Avoid duplicates in a real scenario
                if (!holidays.some(eh => eh.date === h.date)) {
                    onAddHoliday(h.date, h.name, 'National');
                }
            });
            setImporting(false);
        }, 1000);
    };

    const getHolidaysForMonth = (monthIndex: number) => {
        return holidays.filter(h => {
            const d = new Date(h.date);
            return d.getFullYear() === currentYear && d.getMonth() === monthIndex;
        });
    };

    const renderMonth = (monthIndex: number) => {
        const date = new Date(currentYear, monthIndex, 1);
        const monthName = date.toLocaleString('pt-PT', { month: 'long' });
        const daysInMonth = new Date(currentYear, monthIndex + 1, 0).getDate();
        const firstDayOfWeek = new Date(currentYear, monthIndex, 1).getDay() || 7; // 1 (Mon) - 7 (Sun)

        // Adjust logic for Mon start
        const startOffset = firstDayOfWeek - 1;

        const days = [];
        for (let i = 0; i < startOffset; i++) {
            days.push(<div key={`empty-${i}`} className="h-8 md:h-10 bg-gray-50/50"></div>);
        }
        for (let d = 1; d <= daysInMonth; d++) {
            const dateStr = `${currentYear}-${String(monthIndex + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const holiday = holidays.find(h => h.date === dateStr);

            days.push(
                <div key={d} className={`h-8 md:h-10 flex items-center justify-center text-sm relative group ${holiday ? 'bg-orange-50 font-bold text-orange-600 rounded-lg cursor-pointer' : 'text-gray-700'}`}
                    title={holiday?.name}
                >
                    {d}
                    {holiday && (
                        <div className="absolute hidden group-hover:block bottom-full left-1/2 transform -translate-x-1/2 mb-1 bg-gray-800 text-white text-xs px-2 py-1 rounded z-10 whitespace-nowrap shadow-lg">
                            {holiday.name}
                        </div>
                    )}
                </div>
            );
        }

        return (
            <div key={monthIndex} className="bg-white rounded-lg border border-gray-100 shadow-sm overflow-hidden">
                <div className="bg-white p-3 border-b border-gray-100 font-bold text-gray-800 text-center capitalize">
                    {monthName}
                </div>
                <div className="p-2">
                    <div className="grid grid-cols-7 mb-2 text-center text-[10px] font-bold text-gray-400 uppercase">
                        <div>Seg</div><div>Ter</div><div>Qua</div><div>Qui</div><div>Sex</div><div>Sáb</div><div>Dom</div>
                    </div>
                    <div className="grid grid-cols-7 text-center gap-0.5">
                        {days}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="p-4 md:p-8 w-full max-w-7xl mx-auto space-y-8 pb-20 md:pb-8">
            <Header
                title="Feriados"
                subtitle="Gestão do calendário de feriados (Nacionais e Municipais)."
                onMenuClick={toggleSidebar}
            />

            {/* Controls */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex flex-col md:flex-row justify-between items-center gap-4">

                <div className="flex items-center gap-2">
                    <button
                        onClick={handleImport}
                        disabled={importing}
                        className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors disabled:opacity-70"
                    >
                        {importing ? <span className="animate-spin">⌛</span> : <Upload size={16} />}
                        Importar Feriados (PT)
                    </button>
                    <button className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors">
                        <Plus size={16} /> Novo
                    </button>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-1">
                        <button
                            onClick={() => setCurrentYear(prev => prev - 1)}
                            className="p-1 hover:bg-white hover:shadow-sm rounded transition-all"
                        >
                            <ChevronLeft size={16} />
                        </button>
                        <span className="font-bold text-lg min-w-[60px] text-center">{currentYear}</span>
                        <button
                            onClick={() => setCurrentYear(prev => prev + 1)}
                            className="p-1 hover:bg-white hover:shadow-sm rounded transition-all"
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>
                </div>

                <div className="flex bg-gray-100 p-1 rounded-lg">
                    <button
                        onClick={() => setViewMode('list')}
                        className={`px-3 py-1.5 rounded text-sm font-medium flex items-center gap-2 transition-colors ${viewMode === 'list' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}
                    >
                        <ListIcon size={14} /> Lista
                    </button>
                    <button
                        onClick={() => setViewMode('calendar')}
                        className={`px-3 py-1.5 rounded text-sm font-medium flex items-center gap-2 transition-colors ${viewMode === 'calendar' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}
                    >
                        <CalendarIcon size={14} /> Hoje
                    </button>
                </div>
            </div>

            {/* Calendar View */}
            {viewMode === 'calendar' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                    {Array.from({ length: 12 }).map((_, i) => renderMonth(i))}
                </div>
            )}

            {/* List View */}
            {viewMode === 'list' && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-100">
                                <th className="p-4 text-xs font-bold text-gray-500 uppercase">Data</th>
                                <th className="p-4 text-xs font-bold text-gray-500 uppercase">Nome</th>
                                <th className="p-4 text-xs font-bold text-gray-500 uppercase">Tipo</th>
                                <th className="p-4 text-xs font-bold text-gray-500 uppercase text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {holidays.filter(h => h.year === currentYear).length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="p-8 text-center text-gray-400 text-sm">Sem feriados registados para {currentYear}.</td>
                                </tr>
                            ) : (
                                holidays.filter(h => h.year === currentYear).sort((a, b) => a.date.localeCompare(b.date)).map(h => (
                                    <tr key={h.id} className="hover:bg-gray-50">
                                        <td className="p-4 text-sm font-mono text-gray-600">{h.date}</td>
                                        <td className="p-4 text-sm font-bold text-gray-800">{h.name}</td>
                                        <td className="p-4 text-sm">
                                            <span className={`px-2 py-1 rounded text-xs font-bold ${h.type === 'National' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>
                                                {h.type === 'National' ? 'Nacional' : h.type}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right">
                                            <button
                                                onClick={() => onDeleteHoliday(h.id)}
                                                className="text-gray-400 hover:text-red-600 transition-colors bg-white hover:bg-red-50 p-2 rounded-lg border border-transparent hover:border-red-100"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default HolidaysManagement;
