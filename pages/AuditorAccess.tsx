import React, { useState, useMemo } from 'react';
import { User, TimeLog, TimeLogStatus } from '../types';
import { ShieldCheck, Search, FileText, Lock, Printer, LogOut, AlertCircle } from 'lucide-react';
import { supabase } from '../services/supabaseClient';

interface AuditorAccessProps {
  logs: TimeLog[];
  users: User[];
}

const AuditorAccess: React.FC<AuditorAccessProps> = ({ logs, users }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [accessKey, setAccessKey] = useState('');
  const [error, setError] = useState('');
  const [isValidating, setIsValidating] = useState(false);

  // Filters
  const [filterDateStart, setFilterDateStart] = useState<string>('');
  const [filterDateEnd, setFilterDateEnd] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsValidating(true);
    setError('');

    try {
      // Validate the access key with the backend
      const { data, error: authError } = await supabase
        .rpc('validate_auditor_access', {
          access_key: accessKey,
          access_ip: window.location.hostname,
          access_timestamp: new Date().toISOString()
        });

      if (authError || !data) {
        // Log the failed attempt
        await supabase.from('audit_access_logs').insert({
          attempted_key: accessKey.substring(0, 4) + '****', // Log only partial key
          success: false,
          ip_address: window.location.hostname,
          timestamp: new Date().toISOString()
        });

        setError('Chave de segurança inválida. O acesso foi registado e notificado.');
        setIsValidating(false);
        return;
      }

      // Log successful access
      await supabase.from('audit_access_logs').insert({
        attempted_key: 'VALID',
        success: true,
        ip_address: window.location.hostname,
        timestamp: new Date().toISOString(),
        auditor_id: data.auditor_id
      });

      setIsAuthenticated(true);
      setError('');
    } catch (err) {
      console.error('Authentication error:', err);
      setError('Erro de autenticação. Por favor, tente novamente.');
    } finally {
      setIsValidating(false);
    }
  };

  const filteredLogs = useMemo(() => {
    return logs.map(log => {
      const user = users.find(u => u.id === log.userId);
      return { ...log, user };
    }).filter(item => {
      if (!item.user) return false;
      
      const matchSearch = 
        item.user.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        item.user.id.toString().includes(searchTerm) ||
        item.user.nif.includes(searchTerm);

      const logDate = new Date(item.date);
      const start = filterDateStart ? new Date(filterDateStart) : null;
      const end = filterDateEnd ? new Date(filterDateEnd) : null;

      const matchStart = start ? logDate >= start : true;
      const matchEnd = end ? logDate <= end : true;

      return matchSearch && matchStart && matchEnd;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [logs, users, searchTerm, filterDateStart, filterDateEnd]);

  // --- UNAUTHENTICATED VIEW ---
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-white max-w-md w-full rounded-2xl shadow-2xl overflow-hidden">
          <div className="bg-slate-800 p-8 text-center">
            <div className="mx-auto bg-slate-700 w-16 h-16 rounded-full flex items-center justify-center mb-4">
              <ShieldCheck className="text-emerald-400" size={32} />
            </div>
            <h1 className="text-2xl font-bold text-white mb-1">Auditoria Externa</h1>
            <p className="text-slate-400 text-sm">Artigo 202.º do Código do Trabalho</p>
          </div>
          
          <div className="p-8">
            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Chave de Segurança (Secure Key)</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input 
                    type="password" 
                    value={accessKey}
                    onChange={(e) => setAccessKey(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                    placeholder="Introduza a chave de acesso..."
                  />
                </div>
                {error && (
                  <div className="flex items-center gap-2 mt-3 text-red-600 text-sm bg-red-50 p-2 rounded">
                    <AlertCircle size={16} />
                    {error}
                  </div>
                )}
              </div>
              
              <button
                type="submit"
                disabled={isValidating}
                className={`w-full font-bold py-3 rounded-lg transition-all shadow-lg flex items-center justify-center gap-2 ${
                  isValidating
                    ? 'bg-slate-600 text-slate-300 cursor-not-allowed'
                    : 'bg-slate-900 text-white hover:bg-slate-800'
                }`}
              >
                {isValidating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    A validar...
                  </>
                ) : (
                  'Aceder aos Registos'
                )}
              </button>
            </form>
            <div className="mt-6 text-center">
               <p className="text-xs text-gray-400">Este acesso é monitorizado e registado para efeitos de segurança.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- AUTHENTICATED AUDITOR VIEW ---
  return (
    <div className="min-h-screen bg-gray-50 font-sans print:bg-white">
      {/* Top Bar - No Navigation allowed */}
      <div className="bg-slate-900 text-white px-8 py-4 shadow-md print:hidden flex justify-between items-center">
        <div className="flex items-center gap-3">
           <ShieldCheck className="text-emerald-400" size={24} />
           <div>
             <h1 className="font-bold text-lg leading-tight">Portal de Auditoria</h1>
             <p className="text-xs text-slate-400">Registo de tempos de trabalho (Art. 202.º CT)</p>
           </div>
        </div>
        <div className="flex gap-4">
           <button 
             onClick={() => window.print()}
             className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm transition-colors"
           >
             <Printer size={16} /> Imprimir Relatório
           </button>
           <button 
             onClick={() => setIsAuthenticated(false)}
             className="flex items-center gap-2 px-4 py-2 bg-red-900/50 hover:bg-red-900 text-red-100 rounded-lg text-sm transition-colors"
           >
             <LogOut size={16} /> Sair
           </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-8 print:p-0 print:max-w-none">
        
        {/* Auditor Header Note */}
        <div className="mb-6 bg-yellow-50 border border-yellow-200 p-4 rounded-lg flex gap-3 text-yellow-800 print:hidden">
           <AlertCircle className="shrink-0" size={20} />
           <div className="text-sm">
             <strong>Modo de Leitura:</strong> Esta vista destina-se exclusivamente à consulta de tempos de trabalho por entidades fiscalizadoras ou auditores. 
             Os dados pessoais sensíveis (morada, contactos, salário) estão ocultos.
           </div>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-6 flex flex-wrap gap-4 items-end print:hidden">
           <div className="flex-1 min-w-[200px]">
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Procurar Colaborador</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input 
                  type="text" 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Nome, ID ou NIF..."
                  className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-slate-500 outline-none"
                />
              </div>
           </div>
           <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Data Início</label>
              <input 
                type="date" 
                value={filterDateStart}
                onChange={(e) => setFilterDateStart(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm outline-none focus:ring-2 focus:ring-slate-500"
              />
           </div>
           <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Data Fim</label>
              <input 
                type="date" 
                value={filterDateEnd}
                onChange={(e) => setFilterDateEnd(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm outline-none focus:ring-2 focus:ring-slate-500"
              />
           </div>
        </div>

        {/* Official Report Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden print:shadow-none print:border-0">
          <div className="p-6 border-b border-gray-200 print:block hidden">
             <h2 className="text-2xl font-bold text-black">Registo de Tempos de Trabalho</h2>
             <p className="text-sm text-gray-600">Documento gerado em {new Date().toLocaleString()}</p>
          </div>
          
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-100 text-gray-900 border-b border-gray-300 font-bold uppercase text-xs">
              <tr>
                <th className="px-6 py-3 print:px-2">Data</th>
                <th className="px-6 py-3 print:px-2">ID</th>
                <th className="px-6 py-3 print:px-2">Nome do Trabalhador</th>
                <th className="px-6 py-3 print:px-2">NIF</th>
                <th className="px-6 py-3 text-center print:px-2">Entrada</th>
                <th className="px-6 py-3 text-center print:px-2">Saída</th>
                <th className="px-6 py-3 text-center print:px-2">Total Horas</th>
                <th className="px-6 py-3 text-center print:px-2">Observações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredLogs.length > 0 ? (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-6 py-3 font-mono text-gray-700 print:px-2">{log.date}</td>
                    <td className="px-6 py-3 text-gray-600 print:px-2">#{log.userId}</td>
                    <td className="px-6 py-3 font-medium text-gray-900 print:px-2">{log.user?.name}</td>
                    <td className="px-6 py-3 text-gray-600 print:px-2">{log.user?.nif}</td>
                    <td className="px-6 py-3 text-center font-mono print:px-2">
                       {log.checkIn}
                    </td>
                    <td className="px-6 py-3 text-center font-mono print:px-2">
                       {log.checkOut || '--:--'}
                    </td>
                    <td className="px-6 py-3 text-center font-bold print:px-2">
                       {log.totalHours ? `${log.totalHours.toFixed(2)}` : '-'}
                    </td>
                    <td className="px-6 py-3 text-center print:px-2">
                      {log.status === TimeLogStatus.LATE && <span className="text-red-600 font-bold text-xs">ATRASO</span>}
                      {log.status === TimeLogStatus.OVERTIME && <span className="text-blue-600 font-bold text-xs">EXTRA</span>}
                      {log.status === TimeLogStatus.INCOMPLETE && <span className="text-orange-600 font-bold text-xs">INC.</span>}
                      {log.status === TimeLogStatus.ON_TIME && <span className="text-gray-400 text-xs">-</span>}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500 italic">
                    <FileText className="mx-auto mb-2 opacity-50" size={32} />
                    Nenhum registo encontrado para os critérios selecionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          <div className="p-4 bg-gray-50 border-t border-gray-200 text-xs text-gray-500 text-center print:text-black print:bg-white print:border-t-2 print:border-black print:mt-4">
             Nos termos do Art. 202.º do Código do Trabalho, o empregador deve manter o registo dos tempos de trabalho em local acessível e por forma que permita a sua consulta imediata.
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuditorAccess;