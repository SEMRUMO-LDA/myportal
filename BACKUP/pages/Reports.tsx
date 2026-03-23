import React, { useState, useMemo } from 'react';
import SearchableSelect from '../components/SearchableSelect';
import Header from '../components/Header';
import { User, TimeLog, Absence, Company, TimeLogStatus, AbsenceStatus, TimeLogStatusLabels, AbsenceStatusLabels, HourBankAdjustment } from '../types';
import {
    FileBarChart,
    CalendarDays,
    Clock,
    Users,
    Briefcase,
    Download,
    Printer,
    Filter,
    FileSpreadsheet,
    Building2,
    CalendarRange,
    User as UserIcon,
    Building,
    Calendar,
    AlertCircle
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { formatHoursHumanized } from '../utils/scheduleUtils';
// Lazy load PDF libraries - removido import direto para reduzir bundle size
// import jsPDF from 'jspdf';
// import autoTable from 'jspdf-autotable';

interface ReportsProps {
    users: User[];
    logs: TimeLog[];
    absences: Absence[];
    hourBankAdjustments?: HourBankAdjustment[];
}

type ReportType = 'ATTENDANCE' | 'TIME_BANK' | 'ABSENCES';

// Helper to recalculate total hours if missing (fallback calculation)
const calculateTotalHours = (log: TimeLog): number | undefined => {
    if (!log.checkIn || !log.checkOut) return undefined;

    try {
        const [h1, m1] = log.checkIn.split(':').map(Number);
        const [h2, m2] = log.checkOut.split(':').map(Number);

        let checkInMinutes = h1 * 60 + m1;
        let checkOutMinutes = h2 * 60 + m2;

        if (checkOutMinutes < checkInMinutes) {
            checkOutMinutes += 24 * 60;
        }

        let totalMinutes = checkOutMinutes - checkInMinutes;

        if (log.breakStart && log.breakEnd) {
            const [bh1, bm1] = log.breakStart.split(':').map(Number);
            const [bh2, bm2] = log.breakEnd.split(':').map(Number);
            let breakStartMinutes = bh1 * 60 + bm1;
            let breakEndMinutes = bh2 * 60 + bm2;

            if (breakEndMinutes < breakStartMinutes) {
                breakEndMinutes += 24 * 60;
            }

            const breakMinutes = breakEndMinutes - breakStartMinutes;
            if (breakMinutes > 0 && breakMinutes < totalMinutes) {
                totalMinutes -= breakMinutes;
            }
        }

        return totalMinutes / 60;
    } catch (e) {
        console.error('Error calculating total hours:', e);
        return undefined;
    }
};

const Reports: React.FC<ReportsProps> = ({ users, logs, absences, hourBankAdjustments = [] }) => {
    const [reportType, setReportType] = useState<ReportType>('ATTENDANCE');

    // Filters
    const [selectedCompany, setSelectedCompany] = useState<string>('');
    const [selectedUser, setSelectedUser] = useState<string>('');
    const [dateStart, setDateStart] = useState<string>(
        new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
    );
    const [dateEnd, setDateEnd] = useState<string>(
        new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0]
    );
    const { addToast } = useToast();

    // Helper to filter users
    const getFilteredUsers = () => {
        return users.filter(u => {
            const matchCompany = selectedCompany ? u.company === selectedCompany : true;
            const matchUser = selectedUser ? u.id.toString() === selectedUser : true;
            return matchCompany && matchUser;
        });
    };

    // --- REPORT GENERATION LOGIC ---

    const attendanceData = useMemo(() => {
        const filteredUsers = getFilteredUsers();
        return logs.filter(log => {
            const logDate = new Date(log.date);
            const start = new Date(dateStart);
            const end = new Date(dateEnd);
            const user = filteredUsers.find(u => u.id === log.userId);
            return user && logDate >= start && logDate <= end;
        }).map(log => ({
            ...log,
            user: users.find(u => u.id === log.userId)
        })).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [logs, users, selectedCompany, dateStart, dateEnd]);

    const absenceData = useMemo(() => {
        const filteredUsers = getFilteredUsers();
        return absences.filter(abs => {
            const absStart = new Date(abs.startDate);
            const absEnd = new Date(abs.endDate);
            const filterStart = new Date(dateStart);
            const filterEnd = new Date(dateEnd);
            const user = filteredUsers.find(u => u.id === abs.userId);

            // Check overlap
            const overlap = absStart <= filterEnd && absEnd >= filterStart;
            return user && overlap;
        }).sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
    }, [absences, users, selectedCompany, dateStart, dateEnd]);

    const timeToMinutes = (time: string | undefined) => {
        if (!time) return 0;
        const [h, m] = time.split(':').map(Number);
        return h * 60 + m;
    };

    const timeBankData = useMemo(() => {
        const filteredUsers = getFilteredUsers();
        return filteredUsers.map(user => {
            const userLogs = logs.filter(l => l.userId === user.id && l.totalHours);
            let totalBalanceMinutes = 0;

            let expectedMinutesPerDay = 8 * 60;
            if (user.workStartTime && user.workEndTime) {
                const startMins = timeToMinutes(user.workStartTime);
                const endMins = timeToMinutes(user.workEndTime);
                let rawDiff = endMins - startMins;
                if (rawDiff > 5 * 60) rawDiff -= 60;
                expectedMinutesPerDay = rawDiff;
            }

            userLogs.forEach(log => {
                const workedMinutes = Math.round(log.totalHours! * 60);
                const diff = workedMinutes - expectedMinutesPerDay;

                if (diff > 0) {
                    totalBalanceMinutes += diff;
                } else {
                    totalBalanceMinutes += diff;
                }
            });

            // Include manual adjustments
            const userAdj = hourBankAdjustments.filter(a => a.userId === user.id);
            const adjMinutes = userAdj.reduce((sum, a) => sum + a.adjustmentMinutes, 0);

            return {
                user,
                balanceHours: (totalBalanceMinutes + adjMinutes) / 60,
                adjustmentHours: adjMinutes / 60
            };
        });
    }, [users, logs, selectedCompany, hourBankAdjustments]);

    // --- ACTIONS ---
    const handlePrint = () => {
        // In a real app, this would generate a clean PDF
        window.print();
        addToast('info', 'Utilize a opção "Imprimir" e "Guardar como PDF" do browser.');
    };

    const handleExport = async (format: 'PDF' | 'EXCEL') => {
        if (format === 'PDF') {
            // Lazy load PDF libraries apenas quando necessário
            addToast('info', 'A carregar biblioteca PDF...');

            try {
                // Dynamic import - só carrega quando user clica em exportar PDF (3h savings!)
                const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
                    import('jspdf'),
                    import('jspdf-autotable')
                ]);

                if (reportType === 'ATTENDANCE') {
                    if (attendanceData.length === 0) {
                        addToast('warning', "Não existem dados para exportar com os filtros atuais.");
                        return;
                    }
                    const doc = new jsPDF();

                doc.setFontSize(18);
                doc.text("Relatório Diário/Mensal de Ponto", 14, 22);

                doc.setFontSize(11);
                doc.setTextColor(100);
                doc.text(`Empresa: ${selectedCompany || 'Todas as Empresas'}`, 14, 30);
                doc.text(`Período: ${dateStart} a ${dateEnd}`, 14, 36);
                doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-PT')} às ${new Date().toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}`, 14, 42);

                const tableColumn = ["Data", "Colaborador", "Entrada", "Pausa Almoço", "Saída", "Total", "Estado"];
                const tableRows: any[] = [];

                attendanceData.forEach(log => {
                    const userName = log.user?.name || 'Desconhecido';
                    const date = log.date;
                    const checkIn = log.checkIn || '--:--';
                    const breakTime = (log.breakStart && log.breakEnd) ? `${log.breakStart} - ${log.breakEnd}` : (log.breakStart || log.breakEnd || '-');
                    const checkOut = log.checkOut || '--:--';
                    const hours = log.totalHours ?? calculateTotalHours(log);
                    const totalHours = formatHoursHumanized(hours);
                    const status = log.status === TimeLogStatus.LATE ? 'Atraso' : 'Dentro da Hora';

                    tableRows.push([date, userName, checkIn, breakTime, checkOut, totalHours, status]);
                });

                autoTable(doc, {
                    head: [tableColumn],
                    body: tableRows,
                    startY: 50,
                    styles: { fontSize: 9, cellPadding: 3 },
                    headStyles: { fillColor: [41, 128, 185], textColor: 255 },
                    alternateRowStyles: { fillColor: [245, 245, 245] },
                });

                doc.save(`relatorio_ponto_${dateStart}_${dateEnd}.pdf`);
                addToast('success', 'PDF gerado com sucesso.');

            } else if (reportType === 'TIME_BANK') {
                if (timeBankData.length === 0) {
                    addToast('warning', "Não existem dados para exportar com os filtros atuais.");
                    return;
                }
                const doc = new jsPDF();

                doc.setFontSize(18);
                doc.text("Relatório de Banco de Horas", 14, 22);

                doc.setFontSize(11);
                doc.setTextColor(100);
                doc.text(`Empresa: ${selectedCompany || 'Todas as Empresas'}`, 14, 30);
                doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-PT')} às ${new Date().toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}`, 14, 36);

                const tableColumn = ["ID", "Colaborador", "Empresa", "Ajustes", "Saldo Acumulado", "Estado"];
                const tableRows: any[] = [];

                timeBankData.forEach(item => {
                    const row = [
                        `#${item.user.id}`,
                        item.user.name,
                        item.user.company,
                        item.adjustmentHours !== 0 ? formatHoursHumanized(item.adjustmentHours) : '-',
                        formatHoursHumanized(item.balanceHours),
                        item.balanceHours < 0 ? 'Dívida' : 'Crédito'
                    ];
                    tableRows.push(row);
                });

                autoTable(doc, {
                    head: [tableColumn],
                    body: tableRows,
                    startY: 45,
                    styles: { fontSize: 9, cellPadding: 3 },
                    headStyles: { fillColor: [142, 68, 173], textColor: 255 },
                    alternateRowStyles: { fillColor: [245, 245, 245] },
                });

                doc.save(`relatorio_banco_horas.pdf`);
                addToast('success', 'PDF gerado com sucesso.');

            } else if (reportType === 'ABSENCES') {
                if (absenceData.length === 0) {
                    addToast('warning', "Não existem dados para exportar com os filtros atuais.");
                    return;
                }
                const doc = new jsPDF();

                doc.setFontSize(18);
                doc.text("Relatório de Férias e Ausências", 14, 22);

                doc.setFontSize(11);
                doc.setTextColor(100);
                doc.text(`Empresa: ${selectedCompany || 'Todas as Empresas'}`, 14, 30);
                doc.text(`Período: ${dateStart} a ${dateEnd}`, 14, 36);
                doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-PT')} às ${new Date().toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}`, 14, 42);

                const tableColumn = ["Colaborador", "Tipo", "Início", "Fim", "Estado", "Obs."];
                const tableRows: any[] = [];

                absenceData.forEach(abs => {
                    const statusLabel = abs.status === AbsenceStatus.APPROVED ? 'Aprovado' : abs.status === AbsenceStatus.PENDING ? 'Pendente' : 'Rejeitado';
                    const row = [
                        abs.userName,
                        abs.type,
                        abs.startDate,
                        abs.endDate,
                        statusLabel,
                        abs.notes || '-'
                    ];
                    tableRows.push(row);
                });

                autoTable(doc, {
                    head: [tableColumn],
                    body: tableRows,
                    startY: 50,
                    styles: { fontSize: 9, cellPadding: 3 },
                    headStyles: { fillColor: [211, 84, 0], textColor: 255 },
                    alternateRowStyles: { fillColor: [245, 245, 245] },
                });

                doc.save(`relatorio_ausencias_${dateStart}_${dateEnd}.pdf`);
                addToast('success', 'PDF gerado com sucesso.');
            }

            } catch (error) {
                console.error('Erro ao carregar biblioteca PDF:', error);
                addToast('error', 'Erro ao gerar PDF. Tente novamente.');
            }

            return;
        }

        if (reportType === 'ATTENDANCE') {
            if (attendanceData.length === 0) {
                addToast('warning', "Não existem dados para exportar com os filtros atuais.");
                return;
            }

            // CSV Headers
            const headers = [
                "ID Colaborador",
                "Nome",
                "Data",
                "Hora Entrada",
                "Local Entrada",
                "IP Entrada",
                "Almoço", // Added Lunch column
                "Hora Saida",
                "Local Saida",
                "IP Saida",
                "Total Horas",
                "Estado"
            ];

            // Map data to rows
            const rows = attendanceData.map(log => [
                log.userId,
                `"${log.user?.name}"`, // Quote name to handle commas
                log.date,
                log.checkIn || '--:--',
                `"${log.checkInLocation || ''}"`,
                log.checkInIp || '',
                (log.breakStart && log.breakEnd) ? `${log.breakStart} - ${log.breakEnd}` : (log.breakStart || log.breakEnd || '-'), // Added Lunch data
                log.checkOut || '--:--',
                `"${log.checkOutLocation || ''}"`,
                log.checkOutIp || '',
                (() => {
                    const hours = log.totalHours ?? calculateTotalHours(log);
                    return formatHoursHumanized(hours);
                })(), // Use humanized format
                log.status
            ]);

            // Create CSV content with BOM for UTF-8 support in Excel
            const csvContent = "data:text/csv;charset=utf-8,"
                + "\uFEFF" // Byte Order Mark
                + headers.join(";") + "\n" // Use semicolon for EU Excel compatibility
                + rows.map(e => e.join(";")).join("\n");

            const encodedUri = encodeURI(csvContent);
            const link = document.createElement("a");
            link.setAttribute("href", encodedUri);
            link.setAttribute("download", `relatorio_ponto_${dateStart}_${dateEnd}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } else {
            addToast('warning', `Exportação CSV ainda não implementada para o tipo de relatório: ${reportType}`);
        }
    };

    return (
        <div className="p-8 w-full max-w-7xl mx-auto pb-20">
            <div className="print:hidden">
                <Header title="Relatórios e Análises" subtitle="Exportação de mapas oficiais e dados de gestão" />
            </div>

            {/* REPORT TYPE SELECTOR */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 print:hidden">
                <button
                    onClick={() => setReportType('ATTENDANCE')}
                    className={`p-4 rounded-xl border flex flex-col items-center gap-3 transition-all ${reportType === 'ATTENDANCE' ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-md ring-1 ring-blue-200' : 'bg-white border-gray-200 text-gray-600 hover:border-blue-300'}`}
                >
                    <div className={`p-3 rounded-full ${reportType === 'ATTENDANCE' ? 'bg-white' : 'bg-gray-100'}`}>
                        <Clock size={24} />
                    </div>
                    <div className="text-center">
                        <span className="block font-bold">Assiduidade</span>
                        <span className="text-xs opacity-70">Entradas, Saídas e Atrasos</span>
                    </div>
                </button>

                <button
                    onClick={() => setReportType('TIME_BANK')}
                    className={`p-4 rounded-xl border flex flex-col items-center gap-3 transition-all ${reportType === 'TIME_BANK' ? 'bg-purple-50 border-purple-500 text-purple-700 shadow-md ring-1 ring-purple-200' : 'bg-white border-gray-200 text-gray-600 hover:border-purple-300'}`}
                >
                    <div className={`p-3 rounded-full ${reportType === 'TIME_BANK' ? 'bg-white' : 'bg-gray-100'}`}>
                        <Briefcase size={24} />
                    </div>
                    <div className="text-center">
                        <span className="block font-bold">Banco de Horas</span>
                        <span className="text-xs opacity-70">Saldos acumulados</span>
                    </div>
                </button>

                <button
                    onClick={() => setReportType('ABSENCES')}
                    className={`p-4 rounded-xl border flex flex-col items-center gap-3 transition-all ${reportType === 'ABSENCES' ? 'bg-orange-50 border-orange-500 text-orange-700 shadow-md ring-1 ring-orange-200' : 'bg-white border-gray-200 text-gray-600 hover:border-orange-300'}`}
                >
                    <div className={`p-3 rounded-full ${reportType === 'ABSENCES' ? 'bg-white' : 'bg-gray-100'}`}>
                        <CalendarDays size={24} />
                    </div>
                    <div className="text-center">
                        <span className="block font-bold">Férias e Ausências</span>
                        <span className="text-xs opacity-70">Mapa de faltas e férias</span>
                    </div>
                </button>
            </div>

            {/* FILTER BAR */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-6 flex flex-wrap gap-4 items-end print:hidden">
                <div className="flex-1 min-w-[200px]">
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1 flex items-center gap-1">
                        <Building2 size={12} /> Empresa
                    </label>
                    <select
                        value={selectedCompany}
                        onChange={(e) => setSelectedCompany(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500"
                    >
                        <option value="">Todas as Empresas</option>
                        {Object.values(Company).map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>
                <div className="flex-1 min-w-[200px]">
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1 flex items-center gap-1">
                        <Users size={12} /> Colaborador
                    </label>
                    <SearchableSelect
                        options={[
                            { id: '', label: 'Todos os Colaboradores' },
                            ...users
                                .filter(u => selectedCompany ? u.company === selectedCompany : true)
                                .map(u => ({
                                    id: u.id,
                                    label: u.name,
                                    sublabel: u.department
                                }))
                        ]}
                        value={selectedUser}
                        onChange={(id) => setSelectedUser(id)}
                        placeholder="Pesquisar colaborador..."
                        className="w-full"
                    />
                </div>
                {reportType !== 'TIME_BANK' && (
                    <>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1 flex items-center gap-1">
                                <CalendarRange size={12} /> Data Início
                            </label>
                            <input
                                type="date"
                                value={dateStart}
                                onChange={(e) => setDateStart(e.target.value)}
                                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1 flex items-center gap-1">
                                <CalendarRange size={12} /> Data Fim
                            </label>
                            <input
                                type="date"
                                value={dateEnd}
                                onChange={(e) => setDateEnd(e.target.value)}
                                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                            />
                        </div>
                    </>
                )}
                <div className="flex gap-2 ml-auto">
                    <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 rounded-lg text-sm font-bold shadow-sm">
                        <Printer size={16} /> Imprimir
                    </button>
                    <button onClick={() => handleExport('PDF')} className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-bold shadow-sm">
                        <Download size={16} /> Exportar PDF
                    </button>
                    <button onClick={() => handleExport('EXCEL')} className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-bold shadow-sm">
                        <FileSpreadsheet size={16} /> Exportar Excel/CSV
                    </button>
                </div>
            </div>

            {/* REPORT PREVIEW AREA */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden min-h-[500px] print:shadow-none print:border-0">

                {/* Print Header */}
                <div className="hidden print:block p-8 border-b border-gray-200">
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-2xl font-bold text-black uppercase">Relatório de {reportType === 'ATTENDANCE' ? 'Assiduidade' : reportType === 'TIME_BANK' ? 'Banco de Horas' : 'Férias e Ausências'}</h1>
                            <p className="text-sm text-gray-600 mt-1">
                                {selectedCompany || 'Grupo SEMRUMO'} • Gerado em {new Date().toLocaleDateString()}
                            </p>
                        </div>
                        {reportType !== 'TIME_BANK' && (
                            <div className="text-right">
                                <div className="text-xs font-bold text-gray-400 uppercase">Período</div>
                                <div className="font-mono font-bold">{dateStart} a {dateEnd}</div>
                            </div>
                        )}
                    </div>
                </div>

                {/* --- ATTENDANCE TABLE --- */}
                {reportType === 'ATTENDANCE' && (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm min-w-[800px]">
                            <thead className="bg-gray-50 border-b border-gray-200 font-bold text-gray-600 uppercase text-xs">
                                <tr>
                                    <th className="px-6 py-3 print:px-2">Data</th>
                                    <th className="px-6 py-3 print:px-2">Colaborador</th>
                                    <th className="px-6 py-3 print:px-2">Entrada</th>
                                    <th className="px-6 py-3 print:px-2">Almoço</th>
                                    <th className="px-6 py-3 print:px-2">Saída</th>
                                    <th className="px-6 py-3 text-center print:px-2">Total</th>
                                    <th className="px-6 py-3 text-center print:px-2">Estado</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {attendanceData.map(log => (
                                    <tr key={log.id} className="hover:bg-gray-50 print:hover:bg-transparent">
                                        <td className="px-6 py-3 font-mono text-gray-600 print:px-2">{log.date}</td>
                                        <td className="px-6 py-3 print:px-2">
                                            <div className="font-bold text-gray-900">{log.user?.name}</div>
                                            <div className="text-[10px] text-gray-500 uppercase">{log.user?.role}</div>
                                        </td>
                                        <td className="px-6 py-3 font-mono print:px-2">{log.checkIn}</td>
                                        <td className="px-6 py-3 font-mono print:px-2">
                                            {(log.breakStart && log.breakEnd)
                                                ? `${log.breakStart} - ${log.breakEnd}`
                                                : (log.breakStart || log.breakEnd || '-')
                                            }
                                        </td>
                                        <td className="px-6 py-3 font-mono print:px-2">{log.checkOut || '--:--'}</td>
                                        <td className="px-6 py-3 text-center font-bold print:px-2">
                                            {(() => {
                                                const hours = log.totalHours ?? calculateTotalHours(log);
                                                return formatHoursHumanized(hours);
                                            })()}
                                        </td>
                                        <td className="px-6 py-3 text-center print:px-2">
                                            {log.status === TimeLogStatus.LATE
                                                ? <span className="text-red-600 font-bold text-xs uppercase bg-red-50 px-2 py-0.5 rounded print:bg-transparent print:p-0">{TimeLogStatusLabels[TimeLogStatus.LATE]}</span>
                                                : <span className="text-green-600 font-bold text-xs uppercase">{TimeLogStatusLabels[TimeLogStatus.ON_TIME]}</span>
                                            }
                                        </td>
                                    </tr>
                                ))}
                                {attendanceData.length === 0 && (
                                    <tr><td colSpan={7} className="p-8 text-center text-gray-400 italic">Sem dados para apresentar.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* --- TIME BANK TABLE --- */}
                {reportType === 'TIME_BANK' && (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm min-w-[800px]">
                            <thead className="bg-gray-50 border-b border-gray-200 font-bold text-gray-600 uppercase text-xs">
                                <tr>
                                    <th className="px-6 py-3 print:px-2">ID</th>
                                    <th className="px-6 py-3 print:px-2">Colaborador</th>
                                    <th className="px-6 py-3 print:px-2">Empresa</th>
                                    <th className="px-6 py-3 text-right print:px-2">Ajustes</th>
                                    <th className="px-6 py-3 text-right print:px-2">Saldo Acumulado</th>
                                    <th className="px-6 py-3 text-center print:px-2">Estado</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {timeBankData.map((item) => (
                                    <tr key={item.user.id} className="hover:bg-gray-50 print:hover:bg-transparent">
                                        <td className="px-6 py-3 font-mono text-gray-500 print:px-2">#{item.user.id}</td>
                                        <td className="px-6 py-3 print:px-2">
                                            <div className="font-bold text-gray-900">{item.user.name}</div>
                                            <div className="text-xs text-gray-500">{item.user.department}</div>
                                        </td>
                                        <td className="px-6 py-3 print:px-2">
                                            <span className="text-xs font-bold bg-gray-100 px-2 py-1 rounded text-gray-600 print:bg-transparent print:p-0 border print:border-0">{item.user.company}</span>
                                        </td>
                                        <td className={`px-6 py-3 text-right font-mono print:px-2 ${item.adjustmentHours !== 0 ? (item.adjustmentHours >= 0 ? 'text-blue-600' : 'text-orange-600') : 'text-gray-400'}`}>
                                            {item.adjustmentHours !== 0 ? formatHoursHumanized(item.adjustmentHours) : '—'}
                                        </td>
                                        <td className={`px-6 py-3 text-right font-mono font-bold text-lg print:px-2 ${item.balanceHours >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                            {formatHoursHumanized(item.balanceHours)}
                                        </td>
                                        <td className="px-6 py-3 text-center print:px-2">
                                            {item.balanceHours < 0
                                                ? <span className="text-red-700 bg-red-50 text-xs font-bold px-2 py-1 rounded print:bg-transparent">Dívida</span>
                                                : <span className="text-green-700 bg-green-50 text-xs font-bold px-2 py-1 rounded print:bg-transparent">Crédito</span>
                                            }
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* --- ABSENCES TABLE --- */}
                {reportType === 'ABSENCES' && (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm min-w-[800px]">
                            <thead className="bg-gray-50 border-b border-gray-200 font-bold text-gray-600 uppercase text-xs">
                                <tr>
                                    <th className="px-6 py-3 print:px-2">Colaborador</th>
                                    <th className="px-6 py-3 print:px-2">Tipo</th>
                                    <th className="px-6 py-3 print:px-2">Início</th>
                                    <th className="px-6 py-3 print:px-2">Fim</th>
                                    <th className="px-6 py-3 print:px-2">Estado</th>
                                    <th className="px-6 py-3 print:px-2">Obs.</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {absenceData.map(abs => (
                                    <tr key={abs.id} className="hover:bg-gray-50 print:hover:bg-transparent">
                                        <td className="px-6 py-3 print:px-2">
                                            <div className="font-bold text-gray-900">{abs.userName}</div>
                                        </td>
                                        <td className="px-6 py-3 print:px-2">
                                            <span className="font-medium text-gray-700">{abs.type}</span>
                                        </td>
                                        <td className="px-6 py-3 font-mono text-gray-600 print:px-2">{abs.startDate}</td>
                                        <td className="px-6 py-3 font-mono text-gray-600 print:px-2">{abs.endDate}</td>
                                        <td className="px-6 py-3 print:px-2">
                                            {abs.status === AbsenceStatus.APPROVED && <span className="text-green-700 text-xs font-bold bg-green-50 px-2 py-1 rounded print:bg-transparent print:p-0">{AbsenceStatusLabels[AbsenceStatus.APPROVED]}</span>}
                                            {abs.status === AbsenceStatus.PENDING && <span className="text-yellow-700 text-xs font-bold bg-yellow-50 px-2 py-1 rounded print:bg-transparent print:p-0">{AbsenceStatusLabels[AbsenceStatus.PENDING]}</span>}
                                            {abs.status === AbsenceStatus.REJECTED && <span className="text-red-700 text-xs font-bold bg-red-50 px-2 py-1 rounded print:bg-transparent print:p-0">{AbsenceStatusLabels[AbsenceStatus.REJECTED]}</span>}
                                        </td>
                                        <td className="px-6 py-3 text-xs text-gray-500 italic max-w-xs truncate print:px-2">{abs.notes || '-'}</td>
                                    </tr>
                                ))}
                                {absenceData.length === 0 && (
                                    <tr><td colSpan={6} className="p-8 text-center text-gray-400 italic">Sem ausências neste período.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Reports;
