
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { useToast } from '../context/ToastContext';
import { User, UserStatus, UserStatusLabels, Company } from '../types';
import { Search, Filter, Plus, ChevronRight, X, Download, FileSpreadsheet } from 'lucide-react';
import { getRoleDisplayName } from '../utils/authUtils';

interface UserListProps {
  users: User[];
}

const ITEMS_PER_PAGE = 5;

const UserList: React.FC<UserListProps> = ({ users }) => {
  const navigate = useNavigate();
  const { addToast } = useToast();

  // Search States
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Advanced Filter States
  const [filterCompany, setFilterCompany] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterNif, setFilterNif] = useState('');
  const [filterCc, setFilterCc] = useState('');
  const [filterBirthStart, setFilterBirthStart] = useState('');
  const [filterBirthEnd, setFilterBirthEnd] = useState('');
  const [filterAdmissionStart, setFilterAdmissionStart] = useState('');
  const [filterAdmissionEnd, setFilterAdmissionEnd] = useState('');
  const [filterAddress, setFilterAddress] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);

  const getStatusColor = (status: UserStatus) => {
    switch (status) {
      case UserStatus.ACTIVE:
        return 'bg-brand-50 text-brand-700 border-brand-100';
      case UserStatus.INACTIVE:
        return 'bg-red-50 text-red-700 border-red-100';
      case UserStatus.ON_LEAVE:
        return 'bg-orange-50 text-orange-700 border-orange-100';
      default:
        return 'bg-gray-50 text-gray-700';
    }
  };

  const getCompanyBadge = (company: Company | string) => {
    switch (company) {
      case Company.AORUBRO:
        return 'bg-red-100 text-red-800';
      case Company.SEMRUMO:
        return 'bg-brand-100 text-brand-800';
      case Company.HAKURA:
        return 'bg-emerald-100 text-emerald-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      // General Search
      const matchesSearch =
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.id.toString().includes(searchTerm);

      // Advanced Filters
      const matchesCompany = filterCompany ? user.company === filterCompany : true;
      const matchesStatus = filterStatus ? user.status === filterStatus : true;
      const matchesNif = filterNif ? user.nif.includes(filterNif) : true;
      const matchesCc = filterCc ? user.cc.toLowerCase().includes(filterCc.toLowerCase()) : true;
      const matchesAddress = filterAddress ? user.address.toLowerCase().includes(filterAddress.toLowerCase()) : true;

      const matchesBirthDateStart = filterBirthStart ? user.birthDate >= filterBirthStart : true;
      const matchesBirthDateEnd = filterBirthEnd ? user.birthDate <= filterBirthEnd : true;

      const matchesAdmDateStart = filterAdmissionStart ? user.admissionDate >= filterAdmissionStart : true;
      const matchesAdmDateEnd = filterAdmissionEnd ? user.admissionDate <= filterAdmissionEnd : true;

      return matchesSearch && matchesCompany && matchesStatus && matchesNif && matchesCc && matchesAddress && matchesBirthDateStart && matchesBirthDateEnd && matchesAdmDateStart && matchesAdmDateEnd;
    });
  }, [users, searchTerm, filterCompany, filterStatus, filterNif, filterCc, filterAddress, filterBirthStart, filterBirthEnd, filterAdmissionStart, filterAdmissionEnd]);

  // Pagination Logic
  const totalPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE);
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setFilterCompany('');
    setFilterStatus('');
    setFilterNif('');
    setFilterCc('');
    setFilterBirthStart('');
    setFilterBirthEnd('');
    setFilterAdmissionStart('');
    setFilterAdmissionEnd('');
    setFilterAddress('');
    setCurrentPage(1);
  };

  // Export CSV Function
  const handleExportCSV = () => {
    if (filteredUsers.length === 0) {
      addToast('warning', "Não existem dados para exportar.");
      return;
    }

    const headers = ["ID", "Nome", "Email", "Empresa", "Departamento", "Função", "Estado", "NIF", "CC", "Admissão", "Morada", "Telemóvel"];

    const csvContent = "data:text/csv;charset=utf-8,"
      + headers.join(",") + "\n"
      + filteredUsers.map(u => {
        return [
          u.id,
          `"${u.name}"`,
          u.email,
          u.company,
          u.department,
          getRoleDisplayName(u.role),
          u.status,
          `'${u.nif}`,
          `'${u.cc}`,
          u.admissionDate,
          `"${u.address}"`,
          u.phone
        ].join(",");
      }).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `colaboradores_semrumo_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-8 w-full max-w-7xl mx-auto">
      <Header title="Colaboradores" subtitle="Gestão de perfis e dados contratuais" />

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Main Toolbar */}
        <div className="p-5 border-b border-gray-100 flex flex-col lg:flex-row justify-between gap-4">
          <div className="relative flex-1 max-w-lg">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Pesquisa rápida (Nome, ID, Função)..."
              className="pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm w-full focus:outline-none focus:ring-2 focus:ring-brand-500 transition-shadow"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleExportCSV}
              title="Exportar lista atual para CSV"
              className="flex items-center gap-2 px-4 py-2.5 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm font-medium hover:bg-green-100 transition-colors"
            >
              <FileSpreadsheet size={18} />
              <span className="hidden md:inline">CSV</span>
            </button>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2.5 border rounded-lg text-sm font-medium transition-colors ${showFilters ? 'bg-brand-50 border-brand-200 text-brand-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
            >
              <Filter size={18} />
              <span>Filtros</span>
            </button>
            <button
              onClick={() => navigate('/admin/users/new')}
              className="flex items-center gap-2 px-4 py-2.5 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors shadow-sm"
            >
              <Plus size={18} />
              <span className="hidden md:inline">Novo</span>
            </button>
          </div>
        </div>

        {/* Advanced Filters Panel */}
        {showFilters && (
          <div className="p-5 bg-gray-50 border-b border-gray-200 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-500">Empresa (Company)</label>
              <select
                value={filterCompany}
                onChange={e => { setFilterCompany(e.target.value); setCurrentPage(1); }}
                className="w-full p-2 border border-gray-300 rounded text-sm"
              >
                <option value="">Todas</option>
                {Object.values(Company).map(b => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-500">Estado</label>
              <select
                value={filterStatus}
                onChange={e => { setFilterStatus(e.target.value); setCurrentPage(1); }}
                className="w-full p-2 border border-gray-300 rounded text-sm"
              >
                <option value="">Todos</option>
                {Object.values(UserStatus).map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-500">NIF</label>
              <input
                type="text"
                value={filterNif}
                onChange={e => { setFilterNif(e.target.value); setCurrentPage(1); }}
                placeholder="Filtrar por NIF"
                className="w-full p-2 border border-gray-300 rounded text-sm"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-500">Cartão Cidadão (CC)</label>
              <input
                type="text"
                value={filterCc}
                onChange={e => { setFilterCc(e.target.value); setCurrentPage(1); }}
                placeholder="Filtrar por CC"
                className="w-full p-2 border border-gray-300 rounded text-sm"
              />
            </div>

            <div className="space-y-1 lg:col-span-2">
              <label className="text-xs font-semibold text-gray-500">Data de Admissão (Intervalo)</label>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={filterAdmissionStart}
                  onChange={e => { setFilterAdmissionStart(e.target.value); setCurrentPage(1); }}
                  className="w-full p-2 border border-gray-300 rounded text-sm"
                />
                <span className="self-center text-gray-400">-</span>
                <input
                  type="date"
                  value={filterAdmissionEnd}
                  onChange={e => { setFilterAdmissionEnd(e.target.value); setCurrentPage(1); }}
                  className="w-full p-2 border border-gray-300 rounded text-sm"
                />
              </div>
            </div>

            <div className="space-y-1 lg:col-span-2">
              <label className="text-xs font-semibold text-gray-500">Morada (Contém)</label>
              <input
                type="text"
                value={filterAddress}
                onChange={e => { setFilterAddress(e.target.value); setCurrentPage(1); }}
                placeholder="Ex: Lisboa, Porto..."
                className="w-full p-2 border border-gray-300 rounded text-sm"
              />
            </div>

            <div className="lg:col-span-4 flex items-end justify-end border-t border-gray-200 pt-3 mt-1">
              <button
                onClick={clearFilters}
                className="flex items-center gap-1 text-sm text-gray-500 hover:text-red-600 font-medium px-4 py-2"
              >
                <X size={16} /> Limpar Filtros
              </button>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">ID</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Colaborador</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Empresa/Função</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Admissão</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">Estado</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginatedUsers.map((user) => (
                <tr
                  key={user.id}
                  onClick={() => navigate(`/admin/users/${user.id}`)}
                  className="hover:bg-brand-50/30 cursor-pointer transition-colors group"
                >
                  <td className="px-6 py-4">
                    <span className="text-xs font-bold text-gray-700">#{user.id}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="relative h-10 w-10">
                        {user.photoUrl && user.photoUrl !== 'https://picsum.photos/200/200' ? (
                          <img
                            src={user.photoUrl}
                            alt={user.name}
                            className="h-10 w-10 rounded-full object-cover border border-gray-200"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = ''; // Clear source to trigger fallback if we had one, or just hide
                              (e.target as HTMLImageElement).style.display = 'none';
                              (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                            }}
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center border border-gray-200 text-gray-400">
                            <Search size={20} className="hidden" /> {/* Dummy import usage */}
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                          </div>
                        )}
                        {/* Fallback for error state handled via onError above reusing the div structure if needed, or simple swapping.
                              Actually, cleaner approach: */}
                      </div>

                      <div>
                        <div className="font-medium text-gray-900">{user.name}</div>
                        <div className="text-xs text-gray-500 uppercase">{user.department}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1 items-start">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase ${getCompanyBadge(user.company)}`}>
                        {user.company}
                      </span>
                      <span className="text-xs text-gray-500">{getRoleDisplayName(user.role)}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-600 font-mono">{user.admissionDate}</span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(user.status)}`}>
                      {UserStatusLabels[user.status] || user.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <ChevronRight size={20} className="text-gray-300 group-hover:text-brand-500 transition-colors" />
                  </td>
                </tr>
              ))}

              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    Nenhum colaborador encontrado com os filtros selecionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 border-t border-gray-100 bg-gray-50 text-xs text-gray-500 flex justify-between items-center">
          <span>A mostrar {paginatedUsers.length} de {filteredUsers.length} resultados (Total: {users.length})</span>
          <div className="flex gap-2">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-3 py-1 border border-gray-300 rounded hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed bg-white"
            >
              Anterior
            </button>
            <span className="flex items-center px-2 font-medium">
              Página {currentPage} de {Math.max(1, totalPages)}
            </span>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages || totalPages === 0}
              className="px-3 py-1 border border-gray-300 rounded hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed bg-white"
            >
              Seguinte
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserList;
