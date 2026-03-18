
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import Header from '../components/Header';
import EmployeeTimeline from '../components/EmployeeTimeline';
import { calculateVacationBalance } from '../components/VacationBalanceCard';
import { User, Company, Absence, AbsenceStatus, AbsenceType, Department, AbsenceStatusLabels, AbsenceTypeLabels, Anomaly, LeaveType, TimeLog, Leave } from '../types';
import {
  Camera,
  Mail,
  Phone,
  MapPin,
  User as UserIcon,
  Briefcase,
  Building2,
  Calendar,
  Save,
  AlertCircle,
  CalendarDays,
  Download,
  ExternalLink,
  CheckCircle2,
  CheckCircle,
  Clock,
  X,
  XCircle,
  FileText,
  PenTool,
  Eye,
  FileBadge,
  CheckSquare,
  Trophy,
  Zap,
  Plus,
  List,
  KeyRound,
  ShieldCheck as ShieldIcon,
  AlertTriangle,
  Send
} from 'lucide-react';
import { supabase } from '../services/supabaseClient';

interface MyProfileProps {
  user: User;
  absences: Absence[];
  departments?: Department[];
  users?: User[];
  leaveTypes?: LeaveType[];
  onUpdate: (user: User) => void;
  onAddAbsence: (absence: Absence) => Promise<void>;
  anomalies?: Anomaly[];
  onUpdateAnomaly?: (anomaly: Anomaly) => void;
  timeLogs?: TimeLog[];
  leaves?: Leave[];
}

const MyProfile: React.FC<MyProfileProps> = ({ user, absences, departments = [], users = [], leaveTypes = [], onUpdate, onAddAbsence, anomalies = [], onUpdateAnomaly, timeLogs = [], leaves = [], scheduleTemplates = [] }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') as any || 'details';

  // Submission Lock
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Anomaly justification state
  const [justificationTexts, setJustificationTexts] = useState<Record<number, string>>({});
  const [submittingAnomalyId, setSubmittingAnomalyId] = useState<number | null>(null);

  // Filter anomalies awaiting justification from this user
  const pendingJustifications = useMemo(() => {
    return anomalies.filter(a => a.userId === user.id && a.status === 'AWAITING_JUSTIFICATION');
  }, [anomalies, user.id]);

  const handleSubmitJustification = async (anomaly: Anomaly) => {
    const text = justificationTexts[anomaly.id]?.trim();
    if (!text) return;
    setSubmittingAnomalyId(anomaly.id);
    if (onUpdateAnomaly) {
      onUpdateAnomaly({
        ...anomaly,
        status: 'JUSTIFIED_PENDING_REVIEW',
        employeeJustification: text
      });
    }
    setSubmittingAnomalyId(null);
    setJustificationTexts(prev => ({ ...prev, [anomaly.id]: '' }));
  };

  const [activeTab, setActiveTab] = useState<'details' | 'documents' | 'onboarding' | 'timeline' | 'anomalias'>(
    ['details', 'documents', 'onboarding', 'timeline', 'anomalias'].includes(initialTab) ? initialTab : 'details'
  );

  // Update tab if query param changes
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && ['details', 'documents', 'onboarding', 'timeline', 'anomalias'].includes(tab)) {
      setActiveTab(tab as any);
    }
  }, [searchParams]);

  const handleTabChange = (tab: 'details' | 'documents' | 'onboarding' | 'timeline' | 'anomalias') => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<User>(user);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // PIN Change State
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [pinData, setPinData] = useState({ old: '', new: '', confirm: '' });
  const [pinError, setPinError] = useState('');

  // Absence Request Modal State
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [newAbsenceData, setNewAbsenceData] = useState<{ leaveTypeId: number | null; type: string; startDate: string; endDate: string; notes: string }>({
    leaveTypeId: null,
    type: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    notes: ''
  });

  // Sync default leave type when leaveTypes loads asynchronously
  useEffect(() => {
    if (leaveTypes.length > 0 && !newAbsenceData.leaveTypeId) {
      setNewAbsenceData(prev => ({
        ...prev,
        leaveTypeId: leaveTypes[0].id,
        type: leaveTypes[0].name
      }));
    }
  }, [leaveTypes]);

  // Helper for PIN Hashing
  const hashPin = async (pin: string): Promise<string> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(pin);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const handlePinChangeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinError('');

    if (pinData.new !== pinData.confirm) {
      setPinError('O novo PIN e a confirmação não coincidem.');
      return;
    }

    if (pinData.new.length !== 4) {
      setPinError('O PIN deve ter 4 dígitos.');
      return;
    }

    try {
      // 1. Verify Old PIN
      // We need to check against hash OR plain text (legacy)
      const inputOldHash = await hashPin(pinData.old);
      const currentPin = user.pin;

      const isOldCorrect =
        !currentPin ||
        currentPin === '1111' || // Default
        currentPin === pinData.old || // Legacy plain
        currentPin === inputOldHash; // Hashed

      if (!isOldCorrect) {
        setPinError('O PIN atual está incorreto.');
        return;
      }

      // 2. Hash New PIN
      const newPinHash = await hashPin(pinData.new);

      // 3. Update DB
      const { error } = await supabase.from('users').update({
        pin: newPinHash,
        requires_new_pin: false
      }).eq('id', user.id);

      if (error) throw error;

      // 4. Update Local
      alert('PIN alterado com sucesso!');
      onUpdate({ ...user, pin: newPinHash, requiresNewPin: false });
      setIsPinModalOpen(false);
      setPinData({ old: '', new: '', confirm: '' });

    } catch (err) {
      console.error("Error changing PIN:", err);
      setPinError('Erro ao atualizar PIN. Tente novamente.');
    }
  };

  // Filter absences for this user
  const myAbsences = useMemo(() => {
    return absences.filter(a => a.userId === user.id);
  }, [absences, user.id]);

  // Calculate vacation balance
  const vacationBalance = useMemo(() => {
    return calculateVacationBalance(user, leaves, user.id, leaveTypes, scheduleTemplates);
  }, [user, leaves, leaveTypes, scheduleTemplates]);

  // Helper to get company color for background header
  const getCompanyHeaderColor = (company: Company | string) => {
    switch (company) {
      case Company.AORUBRO: return 'bg-gradient-to-r from-red-600 to-red-800';
      case Company.HAKURA: return 'bg-gradient-to-r from-emerald-600 to-emerald-800';
      case Company.SEMRUMO:
      default: return 'bg-gradient-to-r from-blue-600 to-blue-800';
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setFormData(prev => ({ ...prev, photoUrl: event.target!.result as string }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdate(formData);
    setIsEditing(false);
  };

  const handleSignDocument = (docId: string) => {
    if (!confirm("Deseja assinar digitalmente este documento? Esta ação é irreversível.")) return;

    setFormData(prev => {
      const updatedDocs = prev.documents?.map(doc =>
        doc.id === docId
          ? { ...doc, isSigned: true, signedDate: new Date().toISOString().split('T')[0] }
          : doc
      );
      const updatedUser = { ...prev, documents: updatedDocs };

      // Propagate update to parent
      onUpdate(updatedUser);
      return updatedUser;
    });
    alert("Documento assinado com sucesso!");
  };

  const handleToggleTask = (taskId: string) => {
    setFormData(prev => {
      const updatedTasks = prev.onboardingTasks?.map(t =>
        t.id === taskId ? { ...t, completed: !t.completed } : t
      ) || [];
      const updatedUser = { ...prev, onboardingTasks: updatedTasks };

      // Propagate to parent immediately (simulating real-time save)
      onUpdate(updatedUser);
      return updatedUser;
    });
  };

  const handleSubmitAbsence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      const newAbsence: Absence = {
        id: Date.now(), // Simple ID gen
        userId: user.id,
        userName: user.name,
        company: user.company,
        status: AbsenceStatus.PENDING,
        type: (newAbsenceData.type || leaveTypes.find(lt => lt.id === newAbsenceData.leaveTypeId)?.name || 'Férias') as AbsenceType,
        startDate: newAbsenceData.startDate!,
        endDate: newAbsenceData.endDate!,
        notes: newAbsenceData.notes
      };

      await onAddAbsence(newAbsence);
      setIsRequestModalOpen(false);
      // Reset form
      setNewAbsenceData({
        leaveTypeId: leaveTypes.length > 0 ? leaveTypes[0].id : null,
        type: leaveTypes.length > 0 ? leaveTypes[0].name : '',
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
        notes: ''
      });
    } catch (error) {
      console.error("Error submitting absence:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Quick Fill Handlers ---
  const applyQuickAbsence = (days: number, leaveTypeName: string) => {
    const start = new Date();
    const end = new Date();
    if (days > 1) {
      end.setDate(end.getDate() + (days - 1));
    }

    const matchedLT = leaveTypes.find(lt => lt.name.toLowerCase().includes(leaveTypeName.toLowerCase()));
    setNewAbsenceData({
      leaveTypeId: matchedLT?.id || leaveTypes[0]?.id || null,
      type: matchedLT?.name || leaveTypes[0]?.name || '',
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0],
      notes: ''
    });
  };

  // --- Calendar Integration Helpers ---

  const generateGoogleCalendarLink = (absence: Absence) => {
    const startDate = absence.startDate.replace(/-/g, '');
    const endObj = new Date(absence.endDate);
    endObj.setDate(endObj.getDate() + 1);
    const endDate = endObj.toISOString().split('T')[0].replace(/-/g, '');

    const title = encodeURIComponent(`${absence.type} - ${user.company}`);
    const details = encodeURIComponent(`Ausência aprovada: ${absence.type}\nNotas: ${absence.notes || 'Sem notas.'}`);

    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startDate}/${endDate}&details=${details}&sprop=&sprop=name:`;
  };

  return (
    <div className="p-4 md:p-8 w-full max-w-6xl mx-auto relative animate-fade-in pb-20">
      <Header
        title="Minha Conta"
        subtitle="Gerir os seus dados pessoais, documentos e ausências"
        hideControls={true}
      />

      {/* Banner / Header Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden mb-6">
        <div className={`h-32 ${getCompanyHeaderColor(formData.company)} relative`}>
          <div className="absolute top-4 right-6 text-white/20">
            <Building2 size={120} />
          </div>
        </div>

        <div className="px-8 pb-8 flex flex-col md:flex-row items-end md:items-end -mt-12 gap-6 relative">
          <div className="relative group">
            <img
              src={formData.photoUrl}
              alt={formData.name}
              className="w-32 h-32 rounded-full border-4 border-white shadow-md object-cover bg-white"
            />
            {isEditing && (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-1 right-1 p-2 bg-white rounded-full text-gray-600 shadow-lg border border-gray-100 hover:text-brand-600 transition-colors"
              >
                <Camera size={18} />
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                />
              </button>
            )}
          </div>

          <div className="flex-1 mb-2">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{formData.name}</h2>
                <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-gray-600">
                  <span className="flex items-center gap-1.5 font-medium text-brand-700">
                    <Briefcase size={14} /> {formData.role}
                  </span>
                  <span className="hidden md:inline text-gray-300">•</span>
                  <span className="flex items-center gap-1.5">
                    <Building2 size={14} /> {formData.company} ({formData.department})
                  </span>
                </div>
              </div>

              <button
                onClick={() => isEditing ? handleSubmit({ preventDefault: () => { } } as any) : setIsEditing(true)}
                className={`px-6 py-2.5 rounded-lg text-sm font-bold shadow-sm transition-all flex items-center gap-2 ${isEditing
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
              >
                {isEditing ? <><Save size={18} /> Guardar Alterações</> : 'Editar Perfil'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs - Sticky */}
      <div className="sticky top-0 z-20 bg-gray-50/95 backdrop-blur-sm pt-2 pb-0 -mx-4 px-4 md:-mx-8 md:px-8 border-b border-gray-200 mb-6 overflow-x-auto no-scrollbar">
        <div className="flex gap-6 min-w-max">
          <button
            onClick={() => handleTabChange('details')}
            className={`pb-3 text-sm font-medium transition-colors relative flex items-center gap-2 ${activeTab === 'details' ? 'text-brand-600 font-bold' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <UserIcon size={18} /> Dados Pessoais
            {activeTab === 'details' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-brand-600 rounded-t-full"></div>}
          </button>

          <button
            onClick={() => handleTabChange('onboarding')}
            className={`pb-3 text-sm font-medium transition-colors relative flex items-center gap-2 ${activeTab === 'onboarding' ? 'text-brand-600 font-bold' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <CheckSquare size={18} /> Onboarding
            {activeTab === 'onboarding' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-brand-600 rounded-t-full"></div>}
          </button>
          <button
            onClick={() => handleTabChange('documents')}
            className={`pb-3 text-sm font-medium transition-colors relative flex items-center gap-2 ${activeTab === 'documents' ? 'text-brand-600 font-bold' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <FileBadge size={18} /> Documentos
            {activeTab === 'documents' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-brand-600 rounded-t-full"></div>}
          </button>
          <button
            onClick={() => handleTabChange('anomalias')}
            className={`pb-3 text-sm font-medium transition-colors relative flex items-center gap-2 ${activeTab === 'anomalias' ? 'text-brand-600 font-bold' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <AlertCircle size={18} /> Anomalias
            {activeTab === 'anomalias' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-brand-600 rounded-t-full"></div>}
          </button>
          <button
            onClick={() => handleTabChange('timeline')}
            className={`pb-3 text-sm font-medium transition-colors relative flex items-center gap-2 ${activeTab === 'timeline' ? 'text-brand-600 font-bold' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <Clock size={18} /> Linha do Tempo
            {activeTab === 'timeline' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-brand-600 rounded-t-full"></div>}
          </button>
        </div>
      </div>

      {/* ANOMALY JUSTIFICATION ALERT */}
      {pendingJustifications.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 mb-6 animate-fade-in">
          <h3 className="text-lg font-bold text-amber-800 mb-4 flex items-center gap-2">
            <AlertTriangle className="text-amber-500" size={20} />
            Justificações Pendentes
            <span className="bg-amber-200 text-amber-800 text-xs px-2 py-0.5 rounded-full">{pendingJustifications.length}</span>
          </h3>
          <p className="text-sm text-amber-700 mb-4">Foi-lhe solicitada justificação para os seguintes atrasos críticos. Por favor, escreva uma breve explicação.</p>
          <div className="space-y-4">
            {pendingJustifications.map(anomaly => (
              <div key={anomaly.id} className="bg-white p-4 rounded-lg border border-amber-100 shadow-sm">
                <div className="flex items-center gap-3 mb-3">
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-orange-100 text-orange-700">
                    {anomaly.type === 'LATE_ENTRY' ? 'Atraso' :
                      anomaly.type === 'EARLY_EXIT' ? 'Saída Antecipada' :
                        anomaly.type === 'HOURS_DEFICIT' ? 'Défice de Horas' :
                          anomaly.type === 'HOURS_SURPLUS' ? 'Excedente de Horas' : anomaly.type}
                  </span>
                  <span className="text-sm font-bold text-gray-700">{anomaly.minutes} min</span>
                  <span className="text-xs text-gray-400">•</span>
                  <span className="text-xs text-gray-500">{new Date(anomaly.createdAt).toLocaleDateString('pt-PT')}</span>
                </div>
                <textarea
                  className="w-full border border-gray-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-amber-300 focus:border-amber-400 placeholder-gray-400 resize-none"
                  rows={3}
                  placeholder="Escreva a justificação para este atraso..."
                  value={justificationTexts[anomaly.id] || ''}
                  onChange={e => setJustificationTexts(prev => ({ ...prev, [anomaly.id]: e.target.value }))}
                />
                <div className="flex justify-end mt-2">
                  <button
                    onClick={() => handleSubmitJustification(anomaly)}
                    disabled={!justificationTexts[anomaly.id]?.trim() || submittingAnomalyId === anomaly.id}
                    className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white text-sm font-bold rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                  >
                    <Send size={14} /> Submeter Justificação
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CONTENT TAB: DETAILS */}
      {activeTab === 'details' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Left Column: Editable Contact Info */}
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2 pb-4 border-b border-gray-100">
                <UserIcon className="text-brand-500" size={20} />
                Dados Pessoais & Contactos
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-500 uppercase">Email</label>
                  <div className="flex items-center gap-3 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-700">
                    <Mail size={16} className="text-gray-400" />
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      disabled={!isEditing}
                      className="bg-transparent w-full focus:outline-none disabled:text-gray-500"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-500 uppercase">Telefone</label>
                  <div className={`flex items-center gap-3 px-3 py-2.5 border rounded-lg transition-colors ${isEditing ? 'bg-white border-gray-300 ring-2 ring-transparent focus-within:ring-brand-100 focus-within:border-brand-500' : 'bg-gray-50 border-gray-200'}`}>
                    <Phone size={16} className="text-gray-400" />
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      disabled={!isEditing}
                      className="bg-transparent w-full focus:outline-none text-gray-800 font-medium"
                      placeholder="Sem contacto"
                    />
                  </div>
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-xs font-semibold text-gray-500 uppercase">Morada Residência</label>
                  <div className={`flex items-center gap-3 px-3 py-2.5 border rounded-lg transition-colors ${isEditing ? 'bg-white border-gray-300 ring-2 ring-transparent focus-within:ring-brand-100 focus-within:border-brand-500' : 'bg-gray-50 border-gray-200'}`}>
                    <MapPin size={16} className="text-gray-400" />
                    <input
                      type="text"
                      name="address"
                      value={formData.address}
                      onChange={handleChange}
                      disabled={!isEditing}
                      className="bg-transparent w-full focus:outline-none text-gray-800"
                    />
                  </div>
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-xs font-semibold text-gray-500 uppercase flex items-center gap-2">
                    Contacto de Emergência <span className="text-red-400 text-[10px] font-normal">(Obrigatório)</span>
                  </label>
                  <div className={`flex items-center gap-3 px-3 py-2.5 border rounded-lg transition-colors ${isEditing ? 'bg-white border-red-100 ring-2 ring-transparent focus-within:ring-red-100 focus-within:border-red-400' : 'bg-gray-50 border-gray-200'}`}>
                    <AlertCircle size={16} className="text-red-400" />
                    <input
                      type="text"
                      name="emergencyContact"
                      value={formData.emergencyContact || ''}
                      onChange={handleChange}
                      disabled={!isEditing}
                      className="bg-transparent w-full focus:outline-none text-gray-800"
                      placeholder="Nome e telefone de familiar"
                    />
                  </div>
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-xs font-semibold text-gray-500 uppercase">Bio / Apresentação</label>
                  <textarea
                    name="bio"
                    value={formData.bio || ''}
                    onChange={handleChange}
                    disabled={!isEditing}
                    rows={3}
                    className={`w-full px-3 py-2.5 border rounded-lg resize-none focus:outline-none ${isEditing ? 'bg-white border-gray-300 focus:border-brand-500' : 'bg-gray-50 border-gray-200 text-gray-600'}`}
                    placeholder="Escreva uma breve apresentação..."
                  />
                </div>
              </div>
            </div>
            {/* WhatsApp Alerts Section */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2 pb-4 border-b border-gray-100">
                <ShieldIcon className="text-green-500" size={20} />
                Notificações de Assiduidade
              </h3>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-100">
                  <div>
                    <h4 className="font-bold text-gray-900 flex items-center gap-2">
                      WhatsApp Alerts
                      <span className="text-[10px] bg-green-200 text-green-800 px-2 py-0.5 rounded-full uppercase">Beta</span>
                    </h4>
                    <p className="text-xs text-green-700 mt-1">
                      Receba um alerta automático no WhatsApp se não picar o ponto até 10 min após a hora de entrada.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      name="whatsappEnabled"
                      checked={formData.whatsappEnabled || false}
                      onChange={(e) => {
                        const updated = { ...formData, whatsappEnabled: e.target.checked };
                        setFormData(updated);
                        onUpdate(updated);
                      }}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Read-Only Contract Info & Security */}
          <div className="space-y-6">
            <div className="bg-blue-50 p-6 rounded-xl border border-blue-100">
              <h4 className="text-blue-900 font-bold mb-4 flex items-center gap-2">
                <Briefcase size={18} />
                Dados Profissionais
              </h4>
              <p className="text-xs text-blue-600/70 mb-4">
                Estes dados são geridos pelos Recursos Humanos. Para alterações, contacte o suporte.
              </p>

              <ul className="space-y-4">
                {/* ID and NIF removed as per request */}

                <li className="flex justify-between items-center border-b border-blue-100/50 pb-2">
                  <span className="text-sm text-blue-800">Data Admissão</span>
                  <span className="font-medium text-blue-900 flex items-center gap-1">
                    <Calendar size={12} /> {formData.admissionDate}
                  </span>
                </li>
                <li className="flex justify-between items-center border-b border-blue-100/50 pb-2">
                  <span className="text-sm text-blue-800">Empresa</span>
                  <span className="font-bold text-blue-900">{formData.company}</span>
                </li>
                {formData.iban && (
                  <li className="flex flex-col border-b border-blue-100/50 pb-2">
                    <span className="text-sm text-blue-800 mb-1">IBAN (Pagamento)</span>
                    <span className="font-mono text-xs font-bold text-blue-900 tracking-wider">{formData.iban}</span>
                  </li>
                )}
                <li className="flex justify-between items-center border-b border-blue-100/50 pb-2">
                  <span className="text-sm text-blue-800 font-bold italic">Saldo Férias</span>
                  <span className="font-bold text-blue-900 flex items-center gap-1 text-lg">
                    <Zap size={16} className="text-amber-500" /> {vacationBalance.remaining} dias
                  </span>
                </li>
              </ul>
            </div>

            {/* Reports To Card */}
            {(() => {
              // Find user's department and its manager
              const userDept = departments.find(d => d.name === formData.department);
              const manager = userDept?.managerId ? users.find(u => u.id === userDept.managerId) : null;
              const managerInitials = manager?.name?.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() || 'RD';

              return (
                <div className="bg-gradient-to-br from-purple-50 to-indigo-50 p-6 rounded-xl border border-purple-100">
                  <h4 className="text-purple-900 font-bold mb-4 flex items-center gap-2">
                    <UserIcon size={18} />
                    Reporta a
                  </h4>
                  <div className="flex items-center gap-4 mb-4">
                    {manager?.photoUrl ? (
                      <img src={manager.photoUrl} alt={manager.name} className="w-14 h-14 rounded-full object-cover border-2 border-purple-200" />
                    ) : (
                      <div className="w-14 h-14 rounded-full bg-purple-200 flex items-center justify-center text-purple-700 font-bold text-xl">
                        {managerInitials}
                      </div>
                    )}
                    <div>
                      <p className="font-bold text-gray-900">{manager?.name || 'Responsável não definido'}</p>
                      <p className="text-sm text-purple-600">{formData.department || 'Departamento não definido'}</p>
                    </div>
                  </div>
                  {manager && (
                    <div className="flex gap-2">
                      <a
                        href={`mailto:${manager.email}`}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-white border border-purple-200 rounded-lg text-sm font-medium text-purple-700 hover:bg-purple-50 transition-colors"
                      >
                        <Mail size={14} /> Email
                      </a>
                      {manager.phone && (
                        <a
                          href={`tel:${manager.phone}`}
                          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-white border border-purple-200 rounded-lg text-sm font-medium text-purple-700 hover:bg-purple-50 transition-colors"
                        >
                          <Phone size={14} /> Ligar
                        </a>
                      )}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Security Section */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <h4 className="text-gray-800 font-bold mb-4 flex items-center gap-2">
                <ShieldIcon size={18} className="text-brand-600" />
                Segurança
              </h4>
              <button
                onClick={() => setIsPinModalOpen(true)}
                className="w-full py-2.5 px-4 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg text-gray-700 font-medium flex items-center justify-between group transition-all"
              >
                <span className="flex items-center gap-2">
                  <KeyRound size={16} className="text-gray-400 group-hover:text-gray-600" /> Alterar Código PIN
                </span>
                <ExternalLink size={14} className="text-gray-400" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONTENT TAB: ONBOARDING */}
      {activeTab === 'onboarding' && (
        <div className="animate-fade-in max-w-4xl mx-auto">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                  <CheckSquare className="text-brand-500" size={20} />
                  O meu Onboarding
                </h3>
                <p className="text-sm text-gray-500 mt-1">Complete estas tarefas para finalizar o seu processo de entrada na {formData.company}.</p>
              </div>

              <div className="text-right">
                <div className="text-3xl font-bold text-brand-600">
                  {Math.round((formData.onboardingTasks?.filter(t => t.completed).length || 0) / (formData.onboardingTasks?.length || 1) * 100)}%
                </div>
                <div className="text-xs text-gray-400 font-medium uppercase">Concluído</div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden mb-8">
              <div
                className="h-full bg-brand-500 transition-all duration-500 ease-out rounded-full"
                style={{ width: `${(formData.onboardingTasks?.filter(t => t.completed).length || 0) / (formData.onboardingTasks?.length || 1) * 100}%` }}
              ></div>
            </div>

            <div className="space-y-3">
              {formData.onboardingTasks?.map((task) => (
                <div
                  key={task.id}
                  onClick={() => handleToggleTask(task.id)}
                  className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all hover:shadow-sm ${task.completed ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200 hover:border-brand-300'}`}
                >
                  <div className={`h-8 w-8 rounded-lg flex items-center justify-center border-2 transition-all ${task.completed ? 'bg-green-500 border-green-500 scale-110' : 'bg-white border-gray-300'}`}>
                    {task.completed && <CheckSquare size={16} className="text-white" />}
                  </div>
                  <div className="flex-1">
                    <span className={`font-bold text-sm block ${task.completed ? 'text-green-800 line-through decoration-green-800/30' : 'text-gray-800'}`}>
                      {task.label}
                    </span>
                    <span className="text-xs text-gray-500">
                      {task.completed ? 'Concluído' : 'Toque para marcar como feito'}
                    </span>
                  </div>
                  {task.completed && <Trophy size={20} className="text-yellow-500 animate-bounce" />}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* CONTENT TAB: DOCUMENTS */}
      {activeTab === 'documents' && (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <FileBadge className="text-brand-500" size={20} />
                Documentos & Recibos
              </h3>
              <span className="text-xs bg-gray-100 text-gray-600 px-3 py-1 rounded-full font-medium">
                {formData.documents?.length || 0} Documentos
              </span>
            </div>

            {!formData.documents || formData.documents.length === 0 ? (
              <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                <FileText className="mx-auto mb-2 text-gray-300" size={32} />
                <p>Não existem documentos associados ao seu perfil.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {formData.documents.map(doc => (
                  <div key={doc.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-lg ${doc.type === 'Payslip' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}`}>
                        <FileText size={24} />
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-800">{doc.title}</h4>
                        <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                          <span>{doc.type}</span>
                          <span>•</span>
                          <span>Carregado a {doc.uploadDate}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      {/* Status Badge */}
                      {doc.requiresSignature && (
                        doc.isSigned ? (
                          <span className="flex items-center gap-1 text-xs font-bold text-green-600 bg-green-50 px-3 py-1 rounded-full border border-green-200">
                            <PenTool size={12} /> Assinado ({doc.signedDate})
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-xs font-bold text-orange-600 bg-orange-50 px-3 py-1 rounded-full border border-orange-200 animate-pulse">
                            <PenTool size={12} /> Assinatura Pendente
                          </span>
                        )
                      )}

                      {/* Actions */}
                      <div className="flex gap-2">
                        <button className="p-2 text-gray-500 hover:text-brand-600 hover:bg-gray-100 rounded-lg transition-colors" title="Visualizar">
                          <Eye size={18} />
                        </button>
                        {doc.requiresSignature && !doc.isSigned && (
                          <button
                            onClick={() => handleSignDocument(doc.id)}
                            className="flex items-center gap-2 px-3 py-1.5 bg-brand-600 text-white rounded-lg text-xs font-bold hover:bg-brand-700 shadow-sm"
                          >
                            <PenTool size={14} /> Assinar
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ABSENCES CONTENT */}
      {activeTab === 'absences' && (
        <div className="space-y-6 animate-fade-in pb-20">
          <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
            <div>
              <h3 className="text-lg font-bold text-gray-800">Os Meus Pedidos</h3>
              <p className="text-sm text-gray-500">Acompanha o estado das tuas férias e ausências.</p>
            </div>
            <button
              onClick={() => setIsRequestModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-xl text-sm font-bold hover:bg-brand-700 shadow-sm transition-colors"
            >
              <Plus size={18} /> Novo Pedido
            </button>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="font-bold text-gray-800 flex items-center gap-2">
                <List size={18} className="text-brand-600" />
                Histórico
              </h3>
            </div>

            {absences.filter(a => a.userId === user.id).length === 0 ? (
              <div className="p-8 text-center text-gray-500 bg-gray-50/30">
                <Calendar className="mx-auto mb-3 text-gray-300" size={32} />
                <p>Nenhum pedido de ausência registado.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {absences.filter(a => a.userId === user.id)
                  .sort((a, b) => new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime())
                  .map(absence => {
                    const statusConfig = {
                      'PENDING': { color: 'bg-yellow-50 text-yellow-700 border-yellow-200', icon: Clock, label: 'Pendente' },
                      'APPROVED': { color: 'bg-green-50 text-green-700 border-green-200', icon: CheckCircle, label: 'Aprovado' },
                      'REJECTED': { color: 'bg-blue-50 text-blue-700 border-blue-200', icon: CheckCircle, label: 'Validadas' },
                    }[absence.status] || { color: 'bg-gray-50 text-gray-700 border-gray-200', icon: AlertCircle, label: absence.status };

                    const StatusIcon = statusConfig.icon;
                    const LeaveType = leaveTypes.find(lt => lt.id === absence.leaveTypeId);

                    // Calculates days
                    const days = Math.ceil((new Date(absence.endDate + 'T00:00:00').getTime() - new Date(absence.startDate + 'T00:00:00').getTime()) / (1000 * 60 * 60 * 24)) + 1;

                    return (
                      <div key={absence.id} className="p-4 hover:bg-gray-50 transition-colors flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            {LeaveType && (
                              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: LeaveType.color }}></span>
                            )}
                            <h4 className="font-bold text-gray-800">{LeaveType?.name || 'Ausência'}</h4>
                          </div>
                          <p className="text-sm text-gray-500 font-medium font-mono">
                            {new Date(absence.startDate + 'T00:00:00').toLocaleDateString('pt-PT')}
                            {absence.startDate !== absence.endDate && ` a ${new Date(absence.endDate + 'T00:00:00').toLocaleDateString('pt-PT')}`}
                            {' '} • {days} dia{days > 1 ? 's' : ''}
                          </p>
                          {absence.notes && <p className="text-xs text-gray-400 mt-1 italic max-w-lg">"{absence.notes}"</p>}
                        </div>

                        <div className="flex flex-col items-end gap-2">
                          <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border ${statusConfig.color}`}>
                            <StatusIcon size={14} /> {statusConfig.label}
                          </span>
                          <span className="text-[10px] text-gray-400 font-medium">Pedido em {new Date(absence.createdAt || '').toLocaleDateString('pt-PT')}</span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Request Absence Modal */}
      {isRequestModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-fade-in">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="text-lg font-bold text-gray-800">Novo Pedido de Ausência</h3>
              <button onClick={() => setIsRequestModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmitAbsence} className="p-6 space-y-4">

              {/* Quick Fill Chips */}
              <div className="flex gap-2 pb-2 overflow-x-auto">
                <button type="button" onClick={() => applyQuickAbsence(1, 'Férias')} className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-700 text-xs font-bold rounded-full border border-blue-100 hover:bg-blue-100 whitespace-nowrap">
                  <Zap size={12} /> 1 Dia Férias
                </button>
                <button type="button" onClick={() => applyQuickAbsence(5, 'Férias')} className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-700 text-xs font-bold rounded-full border border-blue-100 hover:bg-blue-100 whitespace-nowrap">
                  <Zap size={12} /> 1 Semana Férias
                </button>
                <button type="button" onClick={() => applyQuickAbsence(1, 'Baixa')} className="flex items-center gap-1 px-3 py-1.5 bg-red-50 text-red-700 text-xs font-bold rounded-full border border-red-100 hover:bg-red-100 whitespace-nowrap">
                  <Zap size={12} /> Baixa (Hoje)
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Tipo de Ausência</label>
                <select
                  required
                  value={newAbsenceData.leaveTypeId ?? ''}
                  onChange={(e) => {
                    const selectedId = Number(e.target.value);
                    const selectedLT = leaveTypes.find(lt => lt.id === selectedId);
                    setNewAbsenceData({ ...newAbsenceData, leaveTypeId: selectedId, type: selectedLT?.name || '' });
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:outline-none"
                >
                  {leaveTypes.map(lt => <option key={lt.id} value={lt.id}>{lt.name}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Início</label>
                  <input
                    type="date"
                    required
                    value={newAbsenceData.startDate}
                    onChange={(e) => setNewAbsenceData({ ...newAbsenceData, startDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Fim</label>
                  <input
                    type="date"
                    required
                    value={newAbsenceData.endDate}
                    onChange={(e) => setNewAbsenceData({ ...newAbsenceData, endDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Observações</label>
                <textarea
                  rows={2}
                  value={newAbsenceData.notes}
                  onChange={(e) => setNewAbsenceData({ ...newAbsenceData, notes: e.target.value })}
                  placeholder="Justifique a sua ausência (opcional)..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsRequestModalOpen(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 font-bold disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      A enviar...
                    </>
                  ) : 'Enviar Pedido'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONTENT TAB: ANOMALIAS */}
      {activeTab === 'anomalias' && (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <AlertCircle className="text-orange-500" size={20} />
                Anomalias de Assiduidade
              </h3>
              <span className="text-xs bg-gray-100 text-gray-600 px-3 py-1 rounded-full font-medium">
                {anomalies.filter(a => a.userId === user.id).length} Registos
              </span>
            </div>

            {anomalies.filter(a => a.userId === user.id).length === 0 ? (
              <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                <CheckCircle2 className="mx-auto mb-2 text-green-400" size={32} />
                <p className="font-bold text-gray-700">Sem anomalias registadas</p>
                <p className="text-sm mt-1">A sua assiduidade está impecável!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {anomalies
                  .filter(a => a.userId === user.id)
                  .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                  .map(anomaly => {
                    const statusConfig = {
                      'OPEN': { color: 'bg-orange-50 text-orange-700 border-orange-200', label: 'Aberto' },
                      'AWAITING_JUSTIFICATION': { color: 'bg-amber-50 text-amber-700 border-amber-200', label: 'Aguarda Justificação' },
                      'JUSTIFIED_PENDING_REVIEW': { color: 'bg-blue-50 text-blue-700 border-blue-200', label: 'Justificado (Em Revisão)' },
                      'ACCEPTED': { color: 'bg-green-50 text-green-700 border-green-200', label: 'Aceite' },
                      'REJECTED': { color: 'bg-red-50 text-red-700 border-red-200', label: 'Rejeitado' },
                      'CLOSED': { color: 'bg-gray-50 text-gray-700 border-gray-200', label: 'Fechado' }
                    }[anomaly.status] || { color: 'bg-gray-50 text-gray-700 border-gray-200', label: anomaly.status };

                    const typeConfig = {
                      'LATE_ENTRY': { label: 'Atraso na Entrada', icon: Clock, color: 'text-orange-600' },
                      'EARLY_EXIT': { label: 'Saída Antecipada', icon: AlertTriangle, color: 'text-red-600' },
                      'HOURS_DEFICIT': { label: 'Défice de Horas', icon: AlertCircle, color: 'text-amber-600' },
                      'HOURS_SURPLUS': { label: 'Excedente de Horas', icon: CheckCircle, color: 'text-green-600' }
                    }[anomaly.type] || { label: anomaly.type, icon: AlertCircle, color: 'text-gray-600' };

                    const TypeIcon = typeConfig.icon;

                    return (
                      <div key={anomaly.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex items-center gap-3">
                            <TypeIcon size={20} className={typeConfig.color} />
                            <div>
                              <h4 className="font-bold text-gray-800">{typeConfig.label}</h4>
                              <p className="text-xs text-gray-500">
                                {new Date(anomaly.createdAt).toLocaleDateString('pt-PT', {
                                  weekday: 'long',
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric'
                                })}
                              </p>
                            </div>
                          </div>
                          <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border ${statusConfig.color}`}>
                            {statusConfig.label}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-3 text-sm">
                          <div className="bg-gray-50 p-3 rounded-lg">
                            <span className="text-xs text-gray-500 font-medium">Minutos</span>
                            <p className="font-bold text-gray-900 text-lg">{anomaly.minutes}</p>
                          </div>
                          {anomaly.timeLogId && (
                            <div className="bg-gray-50 p-3 rounded-lg">
                              <span className="text-xs text-gray-500 font-medium">ID Registo</span>
                              <p className="font-bold text-gray-900 text-lg">#{anomaly.timeLogId}</p>
                            </div>
                          )}
                        </div>

                        {anomaly.reason && (
                          <div className="mb-3 p-3 bg-blue-50 border border-blue-100 rounded-lg">
                            <span className="text-xs font-bold text-blue-700 uppercase">Motivo</span>
                            <p className="text-sm text-blue-900 mt-1">{anomaly.reason}</p>
                          </div>
                        )}

                        {anomaly.employeeJustification && (
                          <div className="mb-3 p-3 bg-amber-50 border border-amber-100 rounded-lg">
                            <span className="text-xs font-bold text-amber-700 uppercase">Sua Justificação</span>
                            <p className="text-sm text-amber-900 mt-1">{anomaly.employeeJustification}</p>
                          </div>
                        )}

                        {anomaly.managerNotes && (
                          <div className="p-3 bg-purple-50 border border-purple-100 rounded-lg">
                            <span className="text-xs font-bold text-purple-700 uppercase">Notas do Responsável</span>
                            <p className="text-sm text-purple-900 mt-1">{anomaly.managerNotes}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* CONTENT TAB: TIMELINE */}
      {activeTab === 'timeline' && (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2 mb-6">
              <Clock className="text-brand-500" size={20} />
              Linha do Tempo
            </h3>
            <EmployeeTimeline
              userId={user.id}
              timeLogs={timeLogs}
              leaves={leaves}
              anomalies={anomalies}
              leaveTypes={leaveTypes}
            />
          </div>
        </div>
      )}

      {/* CHANGE PIN MODAL */}
      {isPinModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden animate-fade-in">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="text-lg font-bold text-gray-800">Alterar Código PIN</h3>
              <button onClick={() => { setIsPinModalOpen(false); setPinError(''); setPinData({ old: '', new: '', confirm: '' }); }} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handlePinChangeSubmit} className="p-6 space-y-4">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">PIN Atual</label>
                  <input
                    type="password"
                    maxLength={4}
                    placeholder="••••"
                    value={pinData.old}
                    onChange={(e) => setPinData({ ...pinData, old: e.target.value.replace(/\D/g, '') })}
                    className="w-full text-center px-4 py-3 text-xl tracking-widest border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 bg-gray-50"
                    required
                  />
                </div>
                <div className="border-t border-gray-100 pt-2"></div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Novo PIN</label>
                  <input
                    type="password"
                    maxLength={4}
                    placeholder="••••"
                    value={pinData.new}
                    onChange={(e) => setPinData({ ...pinData, new: e.target.value.replace(/\D/g, '') })}
                    className="w-full text-center px-4 py-3 text-xl tracking-widest border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Confirmar Novo PIN</label>
                  <input
                    type="password"
                    maxLength={4}
                    placeholder="••••"
                    value={pinData.confirm}
                    onChange={(e) => setPinData({ ...pinData, confirm: e.target.value.replace(/\D/g, '') })}
                    className="w-full text-center px-4 py-3 text-xl tracking-widest border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500"
                    required
                  />
                </div>
              </div>

              {pinError && (
                <div className="text-xs text-red-500 text-center font-bold bg-red-50 p-2 rounded">
                  {pinError}
                </div>
              )}

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full bg-brand-600 text-white font-bold py-3 rounded-lg hover:bg-brand-700 transition-colors shadow-sm disabled:opacity-50"
                  disabled={!pinData.old || !pinData.new || !pinData.confirm || pinData.new.length !== 4}
                >
                  Atualizar PIN
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyProfile;
