import React, { useState, useRef, useCallback } from 'react';
import SearchableSelect from './SearchableSelect';
import { X, Upload, FileText, Loader2 } from 'lucide-react';
import { User } from '../types';
import { documentService, DocumentCategory, DocumentCategoryLabels } from '../services/documentService';

interface DocumentUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploaded: () => void;
  users: User[];
  currentUserName: string;
  fixedUserId?: number;
}

const CATEGORIES: { value: DocumentCategory; label: string }[] = Object.entries(DocumentCategoryLabels).map(
  ([value, label]) => ({ value: value as DocumentCategory, label })
);

const DocumentUploadModal: React.FC<DocumentUploadModalProps> = ({
  isOpen, onClose, onUploaded, users, currentUserName, fixedUserId
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<DocumentCategory>('OTHER');
  const [userId, setUserId] = useState<number | ''>(fixedUserId || '');
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) setFile(dropped);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !userId || !title.trim()) return;

    setUploading(true);
    const result = await documentService.uploadDocument(file, Number(userId), title.trim(), category, currentUserName);
    setUploading(false);

    if (result) {
      onUploaded();
      onClose();
      setFile(null);
      setTitle('');
      setCategory('OTHER');
      if (!fixedUserId) setUserId('');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Carregar Documento</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Drop Zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${dragOver ? 'border-indigo-500 bg-indigo-50' : file ? 'border-green-300 bg-green-50' : 'border-gray-200 hover:border-gray-300'}`}
          >
            <input ref={fileRef} type="file" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
            {file ? (
              <div className="flex items-center justify-center gap-2 text-green-700">
                <FileText size={20} />
                <span className="text-sm font-medium">{file.name} ({(file.size / 1024).toFixed(0)} KB)</span>
              </div>
            ) : (
              <div className="text-gray-400">
                <Upload size={32} className="mx-auto mb-2" />
                <p className="text-sm">Arrasta um ficheiro ou clica para selecionar</p>
              </div>
            )}
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">Título</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Contrato de Trabalho 2024"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">Categoria</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as DocumentCategory)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>

          {/* User (only shown for admin uploads) */}
          {!fixedUserId && (
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1">Colaborador</label>
              <SearchableSelect
                options={[
                  { id: '', label: 'Selecionar...' },
                  ...users.map(u => ({
                    id: u.id,
                    label: u.name,
                    sublabel: u.company
                  }))
                ]}
                value={userId}
                onChange={(id) => setUserId(id ? Number(id) : '')}
                placeholder="Pesquisar colaborador..."
                className="w-full"
              />
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={!file || !title.trim() || !userId || uploading}
            className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white font-bold py-2.5 rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {uploading ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
            {uploading ? 'A carregar...' : 'Carregar Documento'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default DocumentUploadModal;
