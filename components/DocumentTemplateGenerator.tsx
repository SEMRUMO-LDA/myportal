import React, { useState } from 'react';
import SearchableSelect from './SearchableSelect';
import { X, FileText, Download, User as UserIcon } from 'lucide-react';
import { User } from '../types';
import { documentService } from '../services/documentService';

interface DocumentTemplateGeneratorProps {
  isOpen: boolean;
  onClose: () => void;
  users: User[];
  leaves?: { userId: number; startDate: string; endDate: string; leaveTypeName?: string; status: string }[];
}

type TemplateType = 'employment' | 'vacation_map' | 'training_cert';

const TEMPLATES: { type: TemplateType; label: string; description: string }[] = [
  { type: 'employment', label: 'Declaração de Emprego', description: 'Declaração de vínculo laboral para entidades externas' },
  { type: 'vacation_map', label: 'Mapa de Férias', description: 'Mapa anual de férias aprovadas do colaborador' },
  { type: 'training_cert', label: 'Certificado de Formação', description: 'Certificado de participação em formação interna' },
];

const DocumentTemplateGenerator: React.FC<DocumentTemplateGeneratorProps> = ({
  isOpen, onClose, users, leaves = []
}) => {
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateType>('employment');
  const [selectedUserId, setSelectedUserId] = useState<number | ''>('');

  const selectedUser = users.find(u => u.id === selectedUserId);

  const handleGenerate = () => {
    if (!selectedUser) return;

    let html = '';

    if (selectedTemplate === 'employment') {
      html = documentService.generateEmploymentDeclaration(selectedUser);
    } else if (selectedTemplate === 'vacation_map') {
      const userLeaves = leaves.filter(l => l.userId === selectedUser.id);
      html = documentService.generateVacationMap(selectedUser, userLeaves);
    } else if (selectedTemplate === 'training_cert') {
      const today = new Date().toLocaleDateString('pt-PT');
      html = `
<!DOCTYPE html>
<html lang="pt">
<head><meta charset="UTF-8"><title>Certificado de Formação</title>
<style>
  body { font-family: 'Segoe UI', sans-serif; max-width: 700px; margin: 40px auto; padding: 40px; text-align: center; color: #333; }
  h1 { font-size: 22px; margin-bottom: 8px; color: #001529; }
  h2 { font-size: 16px; color: #666; margin-bottom: 40px; }
  .name { font-size: 28px; font-weight: bold; color: #001529; margin: 30px 0; }
  .details { font-size: 14px; line-height: 2; }
  .border { border: 3px double #001529; padding: 40px; margin: 20px; }
  .footer { margin-top: 40px; font-size: 11px; color: #999; }
</style>
</head>
<body>
  <div class="border">
    <h1>${selectedUser.company || 'SEMRUMO'}</h1>
    <h2>Certificado de Formação</h2>
    <p>Certifica-se que</p>
    <div class="name">${selectedUser.name}</div>
    <div class="details">
      <p>Cargo: ${selectedUser.role || '---'}</p>
      <p>Departamento: ${selectedUser.department || '---'}</p>
      <p>Participou com aproveitamento na formação interna.</p>
      <p>Data: ${today}</p>
    </div>
    <div class="footer">Emitido pelo sistema My Portal - ${selectedUser.company || 'SEMRUMO'}</div>
  </div>
</body>
</html>`;
    }

    // Download as HTML file
    const blob = new Blob([html], { type: 'text/html;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedTemplate}_${selectedUser.name.replace(/\s+/g, '_')}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Gerar Documento</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg"><X size={20} /></button>
        </div>

        <div className="p-5 space-y-4">
          {/* Template Selection */}
          <div className="space-y-2">
            {TEMPLATES.map(t => (
              <button
                key={t.type}
                onClick={() => setSelectedTemplate(t.type)}
                className={`w-full text-left p-3 rounded-xl border-2 transition-all ${selectedTemplate === t.type
                  ? 'border-indigo-500 bg-indigo-50'
                  : 'border-gray-100 hover:border-gray-200'
                  }`}
              >
                <div className="flex items-center gap-3">
                  <FileText size={18} className={selectedTemplate === t.type ? 'text-indigo-600' : 'text-gray-400'} />
                  <div>
                    <p className="text-sm font-bold text-gray-800">{t.label}</p>
                    <p className="text-xs text-gray-500">{t.description}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* User Selection */}
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">Colaborador</label>
            <SearchableSelect
              options={[
                { id: '', label: 'Selecionar colaborador...' },
                ...users.map(u => ({
                  id: u.id,
                  label: u.name,
                  sublabel: u.company
                }))
              ]}
              value={selectedUserId}
              onChange={(id) => setSelectedUserId(id ? Number(id) : '')}
              placeholder="Pesquisar colaborador..."
              className="w-full"
            />
          </div>

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={!selectedUser}
            className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white font-bold py-2.5 rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Download size={18} />
            Gerar e Descarregar
          </button>
        </div>
      </div>
    </div>
  );
};

export default DocumentTemplateGenerator;
