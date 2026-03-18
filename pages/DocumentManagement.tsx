import React, { useState, useEffect, useMemo } from 'react';
import SearchableSelect from '../components/SearchableSelect';
import Header from '../components/Header';
import DocumentUploadModal from '../components/DocumentUploadModal';
import DocumentTemplateGenerator from '../components/DocumentTemplateGenerator';
import { documentService, Document, DocumentCategory, DocumentCategoryLabels } from '../services/documentService';
import { User, Leave } from '../types';
import {
  FolderOpen, Upload, FileText, Search, Trash2, Download, PenTool,
  Filter, Menu, FileCheck, Clock, Plus
} from 'lucide-react';
import { useOutletContext } from 'react-router-dom';

interface DocumentManagementProps {
  users: User[];
  currentUser: User | null;
  leaves: Leave[];
}

const DocumentManagement: React.FC<DocumentManagementProps> = ({ users, currentUser, leaves }) => {
  const { toggleSidebar } = useOutletContext<{ toggleSidebar: () => void }>();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<DocumentCategory | 'ALL'>('ALL');
  const [filterUser, setFilterUser] = useState<number | 'ALL'>('ALL');

  const loadDocuments = async () => {
    setLoading(true);
    const docs = await documentService.fetchDocuments();
    setDocuments(docs);
    setLoading(false);
  };

  useEffect(() => { loadDocuments(); }, []);

  // Stats
  const stats = useMemo(() => {
    const total = documents.length;
    const pendingSignatures = documents.filter(d => d.signatureStatus === 'PENDING').length;
    const thisMonth = documents.filter(d => {
      const created = new Date(d.createdAt);
      const now = new Date();
      return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
    }).length;
    return { total, pendingSignatures, thisMonth };
  }, [documents]);

  // Filtered documents
  const filteredDocs = useMemo(() => {
    return documents.filter(d => {
      if (filterCategory !== 'ALL' && d.category !== filterCategory) return false;
      if (filterUser !== 'ALL' && d.userId !== filterUser) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return d.title.toLowerCase().includes(q) || d.fileName.toLowerCase().includes(q) || (d.userName || '').toLowerCase().includes(q);
      }
      return true;
    });
  }, [documents, filterCategory, filterUser, searchQuery]);

  const handleDelete = async (id: number) => {
    if (!confirm('Tem a certeza que deseja apagar este documento?')) return;
    const ok = await documentService.deleteDocument(id);
    if (ok) setDocuments(prev => prev.filter(d => d.id !== id));
  };

  const handleSign = async (id: number) => {
    if (!currentUser) return;
    const ok = await documentService.updateSignatureStatus(id, currentUser.name);
    if (ok) {
      setDocuments(prev => prev.map(d => d.id === id ? { ...d, signatureStatus: 'SIGNED' as const, signedDate: new Date().toISOString() } : d));
    }
  };

  const leavesForTemplates = leaves.map(l => ({
    userId: l.userId,
    startDate: l.startDate,
    endDate: l.endDate,
    leaveTypeName: l.leaveTypeName,
    status: l.status
  }));

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        title="Gestão Documental"
        subtitle="Documentos, contratos e declarações"
        icon={<FolderOpen size={20} />}
        onMenuClick={toggleSidebar}
      />

      <div className="p-4 md:p-6 space-y-6">
        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 text-indigo-500 mb-1">
              <FileText size={16} />
              <span className="text-xs font-bold text-gray-500">Total Documentos</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 text-amber-500 mb-1">
              <PenTool size={16} />
              <span className="text-xs font-bold text-gray-500">Assinaturas Pendentes</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.pendingSignatures}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 text-green-500 mb-1">
              <Clock size={16} />
              <span className="text-xs font-bold text-gray-500">Este Mês</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.thisMonth}</p>
          </div>
        </div>

        {/* Actions & Filters */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex flex-wrap gap-3 items-center justify-between">
            <div className="flex gap-2">
              <button
                onClick={() => setShowUpload(true)}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 transition-colors"
              >
                <Upload size={16} /> Carregar
              </button>
              <button
                onClick={() => setShowTemplates(true)}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 text-sm font-bold rounded-xl hover:bg-gray-50 transition-colors"
              >
                <FileCheck size={16} /> Gerar Template
              </button>
            </div>

            <div className="flex flex-wrap gap-2 items-center">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Pesquisar..."
                  className="pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm w-48 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value as any)}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
              >
                <option value="ALL">Todas Categorias</option>
                {Object.entries(DocumentCategoryLabels).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
              <SearchableSelect
                options={[
                  { id: 'ALL', label: 'Todos Colaboradores' },
                  ...users.map(u => ({
                    id: u.id,
                    label: u.name,
                    sublabel: u.role
                  }))
                ]}
                value={filterUser}
                onChange={(id) => setFilterUser(id === 'ALL' ? 'ALL' : Number(id))}
                placeholder="Pesquisar..."
                className="w-48"
              />
            </div>
          </div>
        </div>

        {/* Documents Table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-gray-400">A carregar documentos...</div>
          ) : filteredDocs.length === 0 ? (
            <div className="p-12 text-center text-gray-400">
              <FileText size={40} className="mx-auto mb-3 opacity-50" />
              <p>Nenhum documento encontrado</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left px-4 py-3 font-bold text-gray-600">Título</th>
                    <th className="text-left px-4 py-3 font-bold text-gray-600">Colaborador</th>
                    <th className="text-left px-4 py-3 font-bold text-gray-600">Categoria</th>
                    <th className="text-left px-4 py-3 font-bold text-gray-600">Data</th>
                    <th className="text-left px-4 py-3 font-bold text-gray-600">Assinatura</th>
                    <th className="text-right px-4 py-3 font-bold text-gray-600">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDocs.map(doc => (
                    <tr key={doc.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <FileText size={16} className="text-indigo-400 shrink-0" />
                          <div>
                            <p className="font-medium text-gray-900">{doc.title}</p>
                            <p className="text-xs text-gray-400">{doc.fileName} ({(doc.size / 1024).toFixed(0)} KB)</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{doc.userName || `User #${doc.userId}`}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
                          {DocumentCategoryLabels[doc.category] || doc.category}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {new Date(doc.createdAt).toLocaleDateString('pt-PT')}
                      </td>
                      <td className="px-4 py-3">
                        {doc.signatureStatus === 'SIGNED' ? (
                          <span className="px-2 py-1 bg-green-50 text-green-600 rounded-full text-xs font-bold">Assinado</span>
                        ) : doc.signatureStatus === 'PENDING' ? (
                          <button
                            onClick={() => handleSign(doc.id)}
                            className="px-2 py-1 bg-amber-50 text-amber-600 rounded-full text-xs font-bold hover:bg-amber-100 transition-colors"
                          >
                            Assinar
                          </button>
                        ) : (
                          <span className="text-xs text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <a
                            href={doc.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 hover:bg-indigo-50 text-indigo-500 rounded-lg transition-colors"
                            title="Ver/Download"
                          >
                            <Download size={16} />
                          </a>
                          <button
                            onClick={() => handleDelete(doc.id)}
                            className="p-1.5 hover:bg-red-50 text-red-400 rounded-lg transition-colors"
                            title="Apagar"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <DocumentUploadModal
        isOpen={showUpload}
        onClose={() => setShowUpload(false)}
        onUploaded={loadDocuments}
        users={users}
        currentUserName={currentUser?.name || 'Admin'}
      />
      <DocumentTemplateGenerator
        isOpen={showTemplates}
        onClose={() => setShowTemplates(false)}
        users={users}
        leaves={leavesForTemplates}
      />
    </div>
  );
};

export default DocumentManagement;
