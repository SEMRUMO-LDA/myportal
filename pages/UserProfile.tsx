
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { User, Absence, AbsenceStatus, UserStatus, Company, AbsenceType, OnboardingTask, AttendanceRestrictionType, UserHistoryLog, JobRole, Department, Location, ScheduleTemplate, UserStatusLabels, Leave, LeaveType, Anomaly } from '../types';
import { DEFAULT_ONBOARDING_TASKS, DEFAULT_ATTENDANCE_CONFIG } from '../constants';
import { calculateVacationBalance } from '../components/VacationBalanceCard';
import { ArrowLeft, Save, Sparkles, Mail, User as UserIcon, Calendar, MapPin, CreditCard, FileText, Phone, Camera, Building2, CheckSquare, PenTool, Eye, Globe, ShieldAlert, Plus, Trash2, LocateFixed, Clock, Lock, Banknote, Fingerprint, Heart, AlertCircle, History, Coffee, Briefcase as BriefcaseIcon, Settings, X, ChevronRight, RotateCw, CheckCircle2, Zap, AlertTriangle, CheckCircle } from 'lucide-react';
import { generateBio, generateWelcomeEmail } from '../services/geminiService';
import { historyService } from '../services/historyService';
import { useToast } from '../context/ToastContext';

interface UserProfileProps {
  users: User[];
  absences?: Absence[];
  roles?: JobRole[];
  departments?: Department[];
  onUpdateUser: (user: User) => void;
  onAddUser: (user: User) => void;
  locations?: Location[];
  scheduleTemplates?: ScheduleTemplate[];
  anomalies?: Anomaly[];
}

const InputField = ({ label, name, type = 'text', icon: Icon, fullWidth = false, readOnly = false, placeholder = '', required = false, formData, handleChange, errors, ...rest }: any) => (
  <div className={`flex flex-col gap-1.5 ${fullWidth ? 'col-span-2' : ''}`}>
    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
      {Icon && <Icon size={14} />} {label} {required && <span className="text-red-500">*</span>}
      {readOnly && <Lock size={10} className="text-gray-400" />}
    </label>
    <div className="relative">
      <input
        type={type}
        name={name}
        readOnly={readOnly}
        placeholder={placeholder}
        value={(formData as any)[name] || ''}
        onChange={handleChange}
        {...rest}
        className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all ${readOnly
          ? 'bg-gray-100 border-gray-200 text-gray-500 cursor-not-allowed select-all'
          : errors[name]
            ? 'bg-red-50 border-red-300 focus:ring-red-500'
            : 'bg-white border-gray-300'
          }`}
      />
      {errors[name] && (
        <div className="flex items-center gap-1 mt-1 text-xs text-red-600 font-medium">
          <AlertCircle size={12} /> {errors[name]}
        </div>
      )}
    </div>
  </div>
);

const UserProfile: React.FC<UserProfileProps> = ({ users, absences = [], roles = [], departments = [], locations = [], scheduleTemplates = [], leftOutProp, leaves = [], leaveTypes = [], anomalies = [], onUpdateUser, onAddUser }: any) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isSavingRef = useRef(false);
  const isNew = id === 'new';

  const [activeTab, setActiveTab] = useState<'personal' | 'professional' | 'access' | 'onboarding' | 'docs' | 'history' | 'schedule' | 'anomalias'>('personal');
  const [imgError, setImgError] = useState(false);
  const [loadingAi, setLoadingAi] = useState(false);
  const [aiResult, setAiResult] = useState<{ type: 'bio' | 'email', content: string } | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Validation Errors State
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { addToast } = useToast();

  // States for adding new restrictions
  const [newIp, setNewIp] = useState('');
  const [newLocation, setNewLocation] = useState({ name: '', lat: 0, lng: 0, radius: 100 });

  const [formData, setFormData] = useState<User>({
    id: isNew ? Math.max(...users.map(u => u.id), 0) + 1 : 0,
    code: '',
    name: '',
    email: '',
    role: '',
    department: '',
    company: Company.SEMRUMO,
    status: UserStatus.ACTIVE,
    nif: '',
    cc: '',
    niss: '',
    nationality: 'Portuguesa',
    maritalStatus: '',
    address: '',
    birthDate: '',
    admissionDate: new Date().toISOString().split('T')[0],
    phone: '',
    photoUrl: 'https://picsum.photos/200/200',
    emergencyContact: '',
    onboardingTasks: DEFAULT_ONBOARDING_TASKS,
    documents: [],
    attendanceConfig: {
      restriction: 'NONE',
      allowedIps: [],
      allowedLocations: [],
      manualEntry: false,
      desktopWebEntry: true,
      mobileWebEntry: true,
      appEntry: true,
      vacationRequests: true,
      disableAnomalies: false,
      hourBank: false,
      blockEntry: false,
      flexibleSchedule: false,
      isRemote: false,
      homeCoordinates: { lat: 0, lng: 0, radius: 100 }
    },
    workStartTime: '09:00',
    workEndTime: '18:00',
    lunchStartTime: '13:00',
    lunchEndTime: '14:00',
    vacationDaysYearly: 22,
    vacationDaysCarryover: 0,
    iban: ''
  });

  const [historyLogs, setHistoryLogs] = useState<UserHistoryLog[]>([]);

  // Vacation Balance
  const vacationBalance = useMemo(() => {
    if (isNew) return null;
    return calculateVacationBalance(formData, leaves, formData.id, leaveTypes, scheduleTemplates);
  }, [formData, leaves, leaveTypes, scheduleTemplates, isNew]);

  // Fetch History Logs
  useEffect(() => {
    if (!isNew && id) {
      historyService.getLogs(Number(id)).then(logs => setHistoryLogs(logs));
    }
  }, [id, isNew]);

  const formatDateForInput = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      if (dateStr.startsWith('0001') || dateStr.startsWith('0000')) return '';
      return dateStr.split('T')[0];
    } catch {
      return '';
    }
  };

  // Initial Load - Only sync when ID changes or if data hasn't been loaded yet for this ID
  const lastLoadedIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isNew && id && !isSavingRef.current) {
      const foundUser = users.find(u => u.id === parseInt(id));

      // Only update formData if the ID has actually changed
      if (foundUser && lastLoadedIdRef.current !== id) {
        setFormData({
          ...foundUser,
          birthDate: formatDateForInput(foundUser.birthDate),
          admissionDate: formatDateForInput(foundUser.admissionDate),
          onboardingTasks: foundUser.onboardingTasks || DEFAULT_ONBOARDING_TASKS,
          documents: foundUser.documents || [],
          attendanceConfig: {
            ...DEFAULT_ATTENDANCE_CONFIG,
            ...foundUser.attendanceConfig
          }
        });
        lastLoadedIdRef.current = id;
      } else if (!foundUser && users.length > 0) {
        // Only navigate away if users list is not empty and user not found
        navigate('/admin/users');
      }
    }
  }, [id, users, navigate, isNew]);

  // Auto-save has been removed - use manual save button only

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    let finalValue = value;
    if (name === 'nif') {
      finalValue = value.replace(/\s/g, '').substring(0, 9);
    }
    setFormData(prev => ({ ...prev, [name]: finalValue }));
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      addToast('error', "O ficheiro é demasiado grande. Máximo: 2MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setFormData(prev => ({ ...prev, photoUrl: event.target!.result as string }));
      }
    };
    reader.readAsDataURL(file);
  };

  const toggleOnboardingTask = (taskId: string) => {
    setFormData(prev => {
      const newTasks = prev.onboardingTasks?.map(t =>
        t.id === taskId ? { ...t, completed: !t.completed } : t
      );
      return { ...prev, onboardingTasks: newTasks };
    });
  };

  const handleRestrictionChange = (type: AttendanceRestrictionType) => {
    setFormData(prev => ({
      ...prev,
      attendanceConfig: { ...prev.attendanceConfig!, restriction: type }
    }));
  };

  const handleAddIp = () => {
    if (!newIp) return;
    if (formData.attendanceConfig?.allowedIps.includes(newIp)) {
      addToast('warning', "Este IP já está na lista.");
      return;
    }
    setFormData(prev => ({
      ...prev,
      attendanceConfig: {
        ...prev.attendanceConfig!,
        allowedIps: [...prev.attendanceConfig!.allowedIps, newIp]
      }
    }));
    setNewIp('');
  };

  const handleRemoveIp = (ip: string) => {
    setFormData(prev => ({
      ...prev,
      attendanceConfig: {
        ...prev.attendanceConfig!,
        allowedIps: prev.attendanceConfig!.allowedIps.filter(i => i !== ip)
      }
    }));
  };

  const handleGetCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setNewLocation(prev => ({
            ...prev,
            lat: position.coords.latitude,
            lng: position.coords.longitude
          }));
        },
        () => addToast('error', "Não foi possível obter a localização.")
      );
    }
  };

  const handleAddLocation = () => {
    if (!newLocation.name) {
      addToast('warning', "Por favor defina um nome para a localização.");
      return;
    }
    const newLoc = { ...newLocation, id: `loc-${Date.now()}` };
    setFormData(prev => ({
      ...prev,
      attendanceConfig: {
        ...prev.attendanceConfig!,
        allowedLocations: [...prev.attendanceConfig!.allowedLocations, newLoc]
      }
    }));
    setNewLocation({ name: '', lat: 0, lng: 0, radius: 100 });
  };

  const handleRemoveLocation = (id: string) => {
    setFormData(prev => ({
      ...prev,
      attendanceConfig: {
        ...prev.attendanceConfig!,
        allowedLocations: prev.attendanceConfig!.allowedLocations.filter(l => l.id !== id)
      }
    }));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) newErrors.name = "O Nome Completo é obrigatório.";
    // Validate birthDate: must exist and not be invalid placeholder dates
    if (!formData.birthDate || formData.birthDate.startsWith('0000') || formData.birthDate.startsWith('0001')) {
      newErrors.birthDate = "A Data de Nascimento é obrigatória.";
    }


    if (!formData.admissionDate) newErrors.admissionDate = "A Data de Admissão é obrigatória.";

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      if (newErrors.name || newErrors.birthDate) setActiveTab('personal');
      else if (newErrors.role) setActiveTab('professional');
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    // Validate form first
    if (!validateForm()) {
      window.scrollTo(0, 0);
      addToast('error', 'Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    // Set saving state
    isSavingRef.current = true;
    setSaveStatus('saving');

    try {
      console.log('[UserProfile] Saving user data...', formData.name);

      if (isNew) {
        await onAddUser(formData);
        console.log('[UserProfile] New user created successfully');
        addToast('success', 'Colaborador criado com sucesso!');
      } else {
        await onUpdateUser(formData);
        console.log('[UserProfile] User updated successfully');
        addToast('success', 'Dados guardados com sucesso!');
      }

      setSaveStatus('saved');
      setLastSaved(new Date());

      // Navigate back to user list after short delay
      setTimeout(() => {
        navigate('/admin/users');
      }, 500);

    } catch (error: any) {
      console.error('[UserProfile] Save error:', error);
      setSaveStatus('error');
      addToast('error', error.message || 'Erro ao guardar dados. Por favor, tente novamente.');
    } finally {
      isSavingRef.current = false;
      // Reset status after 3 seconds
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  const handleAiAction = async (action: 'bio' | 'email') => {
    setLoadingAi(true);
    let result = action === 'bio' ? await generateBio(formData) : await generateWelcomeEmail(formData);
    setAiResult({ type: action, content: result });
    if (action === 'bio') setFormData(prev => ({ ...prev, bio: result }));
    setLoadingAi(false);
  };

  return (
    <div className="p-4 md:p-8 w-full max-w-6xl mx-auto pb-24">
      <div className="flex justify-between items-center mb-6">
        <button onClick={() => navigate('/admin/users')} className="flex items-center gap-2 text-gray-500 hover:text-brand-600 transition-colors">
          <ArrowLeft size={20} /><span>Voltar à lista</span>
        </button>
        <h1 className="text-xl font-bold text-gray-800">{isNew ? 'Criar Nova Ficha' : `Ficha #${formData.id}`}</h1>
      </div>

      {Object.keys(errors).length > 0 && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start gap-3">
          <AlertCircle className="shrink-0 mt-0.5" size={18} />
          <div>
            <p className="font-bold text-sm">Campos em falta:</p>
            <ul className="list-disc list-inside text-xs mt-1">
              {Object.values(errors).map((err, i) => <li key={i}>{err}</li>)}
            </ul>
          </div>
        </div>
      )}

      {/* Header Profile Card */}
      <div className={`bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6 flex flex-col md:flex-row gap-6 ${formData.status !== UserStatus.ACTIVE ? 'opacity-75 grayscale bg-gray-50' : ''}`}>
        <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()} title="Clique para alterar foto">
          {(() => {
            // Check if we have a valid photo to display
            const hasValidPhoto = !imgError &&
              formData.photoUrl &&
              formData.photoUrl.trim() !== '' &&
              !formData.photoUrl.includes('picsum.photos') &&
              formData.photoUrl !== 'https://via.placeholder.com/200';

            if (hasValidPhoto) {
              return (
                <img
                  src={formData.photoUrl}
                  alt="Profile"
                  className="w-24 h-24 rounded-full object-cover border-4 border-gray-100 shadow-md bg-white"
                  onError={() => setImgError(true)}
                />
              );
            }

            // Show generic profile icon
            return (
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center border-4 border-white shadow-md">
                <UserIcon size={40} strokeWidth={1.5} className="text-slate-400" />
              </div>
            );
          })()}

          <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/30 rounded-full transition-all duration-200">
            <Camera className="text-white opacity-0 group-hover:opacity-100 transition-opacity" size={24} />
          </div>
          <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handlePhotoUpload} />
        </div>
        <div className="flex-1 relative">
          {formData.status !== UserStatus.ACTIVE && (
            <div className={`absolute top-0 right-0 px-3 py-1 rounded-full text-xs font-bold uppercase ${formData.status === UserStatus.INACTIVE ? 'bg-red-100 text-red-700 border border-red-200' : 'bg-orange-100 text-orange-700 border border-orange-200'}`}>
              {UserStatusLabels[formData.status] || formData.status}
            </div>
          )}
          <h1 className="text-2xl font-bold text-gray-900">{formData.name || 'Novo Colaborador'}</h1>
          <p className="text-gray-500">{formData.role} • {formData.department}</p>
          <div className="flex items-center gap-4 mt-4">
            <button onClick={() => handleAiAction('email')} disabled={loadingAi} className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50">Gerar Email</button>
            <div className="flex items-center gap-3">
              <button
                onClick={handleSave}
                className="px-6 py-2 bg-brand-600 text-white rounded-lg text-sm font-bold hover:bg-brand-700 shadow-sm flex items-center gap-2"
              >
                {saveStatus === 'saving' ? <RotateCw size={16} className="animate-spin" /> : <Save size={16} />}
                Guardar Ficha
              </button>

              {saveStatus !== 'idle' && (
                <div className={`flex items-center gap-1.5 text-xs font-medium animate-in fade-in slide-in-from-left-2 ${saveStatus === 'saved' ? 'text-green-600' :
                  saveStatus === 'saving' ? 'text-gray-400' :
                    'text-red-600'
                  }`}>
                  {saveStatus === 'saving' && <span>A guardar...</span>}
                  {saveStatus === 'saved' && (
                    <>
                      <CheckCircle2 size={14} />
                      <span>Guardado {lastSaved && `às ${lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`}</span>
                    </>
                  )}
                  {saveStatus === 'error' && (
                    <>
                      <AlertCircle size={14} />
                      <span>Erro ao guardar</span>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 mb-6 overflow-x-auto bg-white rounded-t-xl px-2 pt-2 sticky top-0 z-10 shadow-sm">
        <TabButton id="personal" label="Dados Pessoais" icon={UserIcon} active={activeTab} onClick={setActiveTab} />
        <TabButton id="professional" label="Profissional" icon={BriefcaseIcon} active={activeTab} onClick={setActiveTab} />
        <TabButton id="schedule" label="Gestão de Tempo" icon={Clock} active={activeTab} onClick={setActiveTab} />
        <TabButton id="access" label="Picagens" icon={Fingerprint} active={activeTab} onClick={setActiveTab} />
        <TabButton id="onboarding" label="Onboarding" icon={CheckSquare} active={activeTab} onClick={setActiveTab} />
        <TabButton id="docs" label="Documentos" icon={FileText} active={activeTab} onClick={setActiveTab} />
        <TabButton id="anomalias" label="Anomalias" icon={AlertCircle} active={activeTab} onClick={setActiveTab} />
        <TabButton id="history" label="Histórico" icon={History} active={activeTab} onClick={setActiveTab} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">

          {/* PERSONAL TAB */}
          {activeTab === 'personal' && (
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 animate-fade-in space-y-6">
              <h3 className="text-lg font-bold border-b pb-2">Identificação</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <InputField label="Nome Completo" name="name" fullWidth required formData={formData} handleChange={handleChange} errors={errors} />
                <InputField label="Data Nascimento" name="birthDate" type="date" required formData={formData} handleChange={handleChange} errors={errors} />
                {/* CC and NIF removed as per request */}
                <InputField label="Email" name="email" fullWidth formData={formData} handleChange={handleChange} errors={errors} />
                <InputField label="Telemóvel" name="phone" formData={formData} handleChange={handleChange} errors={errors} />
                <InputField label="Morada" name="address" fullWidth required formData={formData} handleChange={handleChange} errors={errors} />
              </div>
            </div>
          )}

          {/* PROFESSIONAL TAB */}
          {activeTab === 'professional' && (
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 animate-fade-in space-y-6">
              <h3 className="text-lg font-bold border-b pb-2">Dados Contratuais</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-gray-500 uppercase flex items-center gap-1.5">
                    Estado do Colaborador
                  </label>
                  <select name="status" value={formData.status} onChange={handleChange} className={`px-3 py-2 border rounded-lg text-sm font-medium ${formData.status === UserStatus.ACTIVE ? 'bg-green-50 text-green-700 border-green-200' : formData.status === UserStatus.ON_LEAVE ? 'bg-orange-50 text-orange-700 border-orange-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                    {Object.values(UserStatus).map(s => <option key={s} value={s}>{UserStatusLabels[s] || s}</option>)}
                  </select>
                </div>
                {/* Employee Code removed as per request */}
                <div className="flex flex-col gap-1.5 hidden md:block"></div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-gray-500 uppercase">Função</label>
                  <select name="role" value={formData.role} onChange={handleChange} className="px-3 py-2 border rounded-lg text-sm bg-white">
                    <option value="">Selecione...</option>
                    {roles.map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-gray-500 uppercase">Departamento</label>
                  <select name="department" value={formData.department} onChange={handleChange} className="px-3 py-2 border rounded-lg text-sm bg-white">
                    <option value="">Selecione...</option>
                    {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5 col-span-2">
                  <label className="text-xs font-semibold text-gray-500 uppercase flex items-center gap-1.5">
                    <MapPin size={14} /> Locais de Trabalho
                  </label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {(formData.locationIds || []).map(locId => {
                      const loc = locations.find(l => l.id === locId);
                      return loc ? (
                        <div key={locId} className="flex items-center gap-1.5 bg-brand-50 text-brand-700 px-3 py-1.5 rounded-full text-sm font-medium">
                          <MapPin size={12} />
                          {loc.name}
                          <button
                            type="button"
                            onClick={() => setFormData(prev => ({
                              ...prev,
                              locationIds: (prev.locationIds || []).filter(id => id !== locId)
                            }))}
                            className="ml-1 text-brand-400 hover:text-brand-700"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ) : null;
                    })}
                  </div>
                  <div className="flex gap-2">
                    <select
                      className="flex-1 px-3 py-2 border rounded-lg text-sm bg-white border-gray-300"
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        if (val && !(formData.locationIds || []).includes(val)) {
                          setFormData(prev => ({
                            ...prev,
                            locationIds: [...(prev.locationIds || []), val],
                            locationId: prev.locationId || val // Set first as primary
                          }));
                        }
                        e.target.value = '';
                      }}
                    >
                      <option value="">Adicionar local...</option>
                      {locations.filter(l => !(formData.locationIds || []).includes(l.id)).map(l => (
                        <option key={l.id} value={l.id}>{l.name}</option>
                      ))}
                    </select>
                  </div>
                  <p className="text-[10px] text-gray-400">Selecione os locais onde o colaborador pode trabalhar.</p>
                </div>
                <InputField label="Data Admissão" name="admissionDate" type="date" required formData={formData} handleChange={handleChange} errors={errors} />
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
                    <Calendar size={14} /> Modelo de Horário
                  </label>
                  <div className="relative">
                    <select
                      name="scheduleTemplateId"
                      value={formData.scheduleTemplateId || ''}
                      onChange={(e) => {
                        const val = e.target.value ? parseInt(e.target.value) : undefined;
                        // If switching to a non-cyclic or undefined template, clear cycle date? Maybe keep it.
                        // But if switching TO a cyclic template, we might want to prompt or highlight the date field.
                        setFormData(prev => ({ ...prev, scheduleTemplateId: val }));
                      }}
                      className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent appearance-none"
                    >
                      <option value="">Sem modelo atribuído</option>
                      {scheduleTemplates.map(t => (
                        <option key={t.id} value={t.id}>
                          {t.name} ({t.cycleDays ? `Rotativo ${t.cycleDays} dias` : `${t.totalWeeklyHours}h/sem`})
                        </option>
                      ))}
                    </select>
                    <ChevronRight size={16} className="absolute right-3 top-3 text-gray-400 rotate-90" />
                  </div>
                </div>

                {/* Cycle Start Date - Only if template is cyclic */}
                {(() => {
                  const selectedTemplate = scheduleTemplates.find(t => t.id === formData.scheduleTemplateId);
                  if (selectedTemplate?.cycleDays) {
                    return (
                      <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                        <InputField
                          label="Início do Ciclo (Dia 1)"
                          name="scheduleCycleStartDate"
                          type="date"
                          icon={RotateCw}
                          required
                          formData={formData}
                          handleChange={handleChange}
                          errors={errors}
                          placeholder="Data de referência para o dia 1"
                        />
                        <p className="text-[10px] text-gray-500 mt-1 ml-1">
                          Esta data conta como o <strong>Dia 1</strong> do ciclo de {selectedTemplate.cycleDays} dias.
                        </p>
                      </div>
                    );
                  }
                  return null;
                })()}
                <div className="col-span-2">
                  <label className="text-xs font-semibold text-gray-500 uppercase">Bio</label>
                  <textarea name="bio" value={formData.bio} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg text-sm mt-1" rows={3} />
                </div>
              </div>
            </div>
          )}

          {/* ACCESS TAB */}
          {activeTab === 'access' && (
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 animate-fade-in space-y-8">
              <div>
                <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2 border-b border-gray-100 pb-2">
                  <Fingerprint size={20} className="text-brand-500" /> Permissões de Picagem
                </h3>

                {/* SECURITY & PIN CARD */}
                <div className="mb-8 p-6 bg-orange-50/50 border border-orange-100 rounded-xl space-y-4">
                  <h4 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                    <Lock size={16} className="text-orange-600" /> Segurança de Acesso
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="text-xs font-semibold text-gray-500 uppercase flex items-center gap-1 mb-1">
                        PIN de Acesso (Kiosk/App)
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={formData.pin || ''}
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                            setFormData(prev => ({ ...prev, pin: val }));
                          }}
                          placeholder="0000"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm tracking-widest font-mono text-center focus:ring-2 focus:ring-brand-500 focus:outline-none"
                        />
                        <button
                          className="px-3 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200"
                          onClick={() => setFormData(prev => ({ ...prev, pin: Math.floor(1000 + Math.random() * 9000).toString() }))}
                          title="Gerar PIN Aleatório"
                        >
                          <Sparkles size={16} />
                        </button>
                      </div>
                      <p className="text-[10px] text-gray-400 mt-1">Utilizado para picagem em modo Quiosque.</p>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-gray-500 uppercase flex items-center gap-1 mb-1">
                        Password de Login (Web)
                      </label>
                      <button
                        onClick={async () => {
                          // In a real app we might call a backend function here. 
                          // Since we are client-side only mostly, we simulate.
                          // But if we have supabase:
                          /* 
                          const { error } = await supabase.auth.resetPasswordForEmail(formData.email, {
                            redirectTo: 'https://myportal.com/update-password',
                          })
                          */
                          if (!formData.email) {
                            addToast('error', 'O utilizador não tem email definido.');
                            return;
                          }
                          addToast('info', `Instruções de redefinição enviadas para ${formData.email} (Simulação)`);
                        }}
                        className="w-full px-4 py-2 border border-gray-300 bg-white text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 flex items-center justify-center gap-2"
                      >
                        <Mail size={16} />
                        Enviar Email de Redefinição
                      </button>
                      <p className="text-[10px] text-gray-400 mt-1">Envia um link para o colaborador definir uma nova password.</p>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">

                  {/* Column 1 */}
                  <div className="space-y-6">
                    <ToggleField
                      label="Receber Alertas WhatsApp"
                      checked={formData.whatsappEnabled}
                      onChange={(c) => setFormData(prev => ({ ...prev, whatsappEnabled: c }))}
                    />

                    <ToggleField
                      label="Restrição de Picagem por IP"
                      checked={formData.attendanceConfig?.restrictIp}
                      onChange={(c) => {
                        const newGeo = formData.attendanceConfig?.restrictGeo || false;
                        let newRestriction: AttendanceRestrictionType = 'NONE';
                        if (c && newGeo) newRestriction = 'BOTH';
                        else if (c) newRestriction = 'IP';
                        else if (newGeo) newRestriction = 'GEO';

                        setFormData(prev => ({
                          ...prev,
                          attendanceConfig: {
                            ...prev.attendanceConfig!,
                            restrictIp: c,
                            restriction: newRestriction
                          }
                        }));
                      }}
                    />

                    <ToggleField
                      label="Picagem manual"
                      checked={formData.attendanceConfig?.manualEntry}
                      onChange={(c) => setFormData(prev => ({ ...prev, attendanceConfig: { ...prev.attendanceConfig!, manualEntry: c } }))}
                    />

                    <ToggleField
                      label="Pedidos Férias"
                      checked={formData.attendanceConfig?.vacationRequests}
                      onChange={(c) => setFormData(prev => ({ ...prev, attendanceConfig: { ...prev.attendanceConfig!, vacationRequests: c } }))}
                    />

                    <ToggleField
                      label="Bolsa de Horas"
                      checked={formData.attendanceConfig?.hourBank}
                      onChange={(c) => setFormData(prev => ({ ...prev, attendanceConfig: { ...prev.attendanceConfig!, hourBank: c } }))}
                    />

                    <ToggleField
                      label="Horário Flexível"
                      checked={formData.attendanceConfig?.flexibleSchedule}
                      onChange={(c) => setFormData(prev => ({ ...prev, attendanceConfig: { ...prev.attendanceConfig!, flexibleSchedule: c } }))}
                    />
                    {formData.attendanceConfig?.flexibleSchedule && (
                      <div className="ml-1 mt-2 p-3 bg-blue-50 border border-blue-100 rounded-lg">
                        <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">Horas Mínimas Diárias</label>
                        <input
                          type="number"
                          min="1"
                          max="24"
                          step="0.5"
                          value={formData.attendanceConfig?.minimumDailyHours ?? 8}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            attendanceConfig: { ...prev.attendanceConfig!, minimumDailyHours: parseFloat(e.target.value) || 8 }
                          }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500"
                        />
                        <p className="text-[10px] text-gray-400 mt-1">
                          Nº de horas que o colaborador deve cumprir por dia. Excedentes vão para bolsa de horas.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Column 2 */}
                  <div className="space-y-6">
                    <ToggleField
                      label="Restrição de Picagem por Raio Geográfico"
                      checked={formData.attendanceConfig?.restrictGeo}
                      onChange={(c) => {
                        const newIp = formData.attendanceConfig?.restrictIp || false;
                        let newRestriction: AttendanceRestrictionType = 'NONE';
                        if (c && newIp) newRestriction = 'BOTH';
                        else if (c) newRestriction = 'GEO';
                        else if (newIp) newRestriction = 'IP';

                        setFormData(prev => ({
                          ...prev,
                          attendanceConfig: {
                            ...prev.attendanceConfig!,
                            restrictGeo: c,
                            restriction: newRestriction
                          }
                        }));
                      }}
                    />

                    <div className="hidden md:block h-6"></div>

                    <ToggleField
                      label="Desativar anomalias"
                      checked={formData.attendanceConfig?.disableAnomalies}
                      onChange={(c) => setFormData(prev => ({ ...prev, attendanceConfig: { ...prev.attendanceConfig!, disableAnomalies: c } }))}
                    />

                    <ToggleField
                      label="Bloquear picagem"
                      checked={formData.attendanceConfig?.blockEntry}
                      onChange={(c) => setFormData(prev => ({ ...prev, attendanceConfig: { ...prev.attendanceConfig!, blockEntry: c } }))}
                    />

                    <div>
                      <ToggleField
                        label="Ocultar Ausências"
                        checked={formData.attendanceConfig?.hideAbsences}
                        onChange={(c) => setFormData(prev => ({ ...prev, attendanceConfig: { ...prev.attendanceConfig!, hideAbsences: c } }))}
                      />
                      <p className="text-[10px] text-gray-400 mt-1 ml-1">Se ativo, as ausências deste colaborador não aparecem para colegas no Calendário de Equipa, e este colaborador também não verá as ausências dos outros.</p>
                    </div>
                  </div>
                </div>

                <div className="mt-8 text-xs text-gray-500 space-y-2 border-t border-gray-100 pt-4">
                  <p>Tanto o código como o cartão são válidos para efectuar o login no processo da picagem.</p>
                  <p>A introdução do cookie permite validar se os colaboradores fazem a picagem em dispositivos diferentes.</p>
                  <p>O horário flexível baseia-se em quantidades de horas diárias.</p>
                </div>
              </div>

              {/* IP Configuration (Conditional) */}
              {(formData.attendanceConfig?.restrictIp) && (
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 mt-6">
                  <h4 className="text-sm font-bold text-gray-700 mb-2">IPs Permitidos</h4>
                  <div className="flex gap-2 mb-2">
                    <input value={newIp} onChange={(e) => setNewIp(e.target.value)} placeholder="Ex: 192.168.1.1" className="px-3 py-1.5 border border-gray-300 rounded text-sm flex-1" />
                    <button type="button" onClick={handleAddIp} className="px-3 py-1.5 bg-brand-600 text-white rounded text-sm font-bold">Adicionar</button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {formData.attendanceConfig?.allowedIps.map(ip => (
                      <div key={ip} className="bg-white border border-gray-200 px-2 py-1 rounded text-xs flex items-center gap-2">
                        {ip}
                        <button type="button" onClick={() => handleRemoveIp(ip)}><X size={12} className="text-red-500" /></button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ONBOARDING TAB */}
          {activeTab === 'onboarding' && (
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <h3 className="font-bold mb-4">Checklist</h3>
              <div className="space-y-3">{formData.onboardingTasks?.map(task => (
                <div key={task.id} onClick={() => toggleOnboardingTask(task.id)} className={`flex items-center gap-3 p-3 rounded border cursor-pointer ${task.completed ? 'bg-green-50' : 'bg-gray-50'}`}>
                  <div className={`w-5 h-5 rounded border flex items-center justify-center ${task.completed ? 'bg-green-500 border-green-500' : 'bg-white'}`}>{task.completed && <CheckSquare size={12} className="text-white" />}</div>
                  <span>{task.label}</span>
                </div>
              ))}</div>
            </div>
          )}

          {/* ANOMALIAS TAB */}
          {activeTab === 'anomalias' && (
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 animate-fade-in">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                  <AlertCircle className="text-orange-500" size={20} />
                  Anomalias de Assiduidade
                </h3>
                <span className="text-xs bg-gray-100 text-gray-600 px-3 py-1 rounded-full font-medium">
                  {anomalies.filter(a => a.userId === formData.id).length} Registos
                </span>
              </div>

              {anomalies.filter(a => a.userId === formData.id).length === 0 ? (
                <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                  <CheckCircle2 className="mx-auto mb-2 text-green-400" size={32} />
                  <p className="font-bold text-gray-700">Sem anomalias registadas</p>
                  <p className="text-sm mt-1">A assiduidade deste colaborador está impecável!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {anomalies
                    .filter(a => a.userId === formData.id)
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
                              <span className="text-xs font-bold text-amber-700 uppercase">Justificação do Colaborador</span>
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
          )}

          {/* HISTORY TAB */}
          {activeTab === 'history' && (
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <h3 className="font-bold mb-4">Audit Log</h3>
              <div className="space-y-4">
                {historyLogs.length === 0 && <p className="text-sm text-gray-400">Sem registo de histórico.</p>}
                {historyLogs.map(log => (
                  <div key={log.id} className="text-sm border-l-2 pl-3 border-gray-200">
                    <div className="flex justify-between items-start">
                      <span className="font-bold text-gray-700">{log.action}</span>
                      <span className="text-xs text-gray-400">{log.date}</span>
                    </div>
                    <p className="text-xs text-gray-500 mb-1">por {log.changedBy}</p>

                    {log.action === 'UPDATE' && log.field ? (
                      <div className="bg-gray-50 p-2 rounded text-xs mt-1">
                        <span className="font-semibold text-gray-600">{log.field}:</span>
                        <span className="line-through text-red-400 mx-2">{log.oldValue || '(vazio)'}</span>
                        <span className="text-gray-400">→</span>
                        <span className="text-green-600 font-medium ml-2">{log.newValue}</span>
                      </div>
                    ) : (
                      <p className="text-gray-600 mt-1">{log.newValue || '-'}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SCHEDULE / TIME MANAGEMENT TAB */}
          {activeTab === 'schedule' && (
            <div className="space-y-6 animate-fade-in">
              {/* Assigned Schedule */}
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <h3 className="text-lg font-bold border-b pb-2 mb-4 flex items-center gap-2">
                  <Clock size={18} className="text-brand-500" /> Horário Atribuído
                </h3>

                {formData.scheduleTemplateId ? (() => {
                  const template = scheduleTemplates.find(t => t.id === formData.scheduleTemplateId);
                  if (!template) return <p className="text-gray-400 italic">Modelo não encontrado</p>;

                  const weekDays = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];

                  return (
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h4 className="font-bold text-gray-800">{template.name}</h4>
                          <p className="text-sm text-gray-500">
                            {template.cycleDays
                              ? `Ciclo de ${template.cycleDays} dias`
                              : `${template.totalWeeklyHours}h/semana`
                            }
                          </p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${template.cycleDays ? 'bg-purple-50 text-purple-600' : 'bg-brand-50 text-brand-600'}`}>
                          {template.cycleDays ? 'Rotativo' : 'Fixo'}
                        </span>
                      </div>

                      {template.cycleDays ? (
                        <div>
                          <p className="text-xs text-gray-500 mb-2">Padrão do Ciclo:</p>
                          <div className="flex flex-wrap gap-2">
                            {template.cyclePattern?.map((d, i) => (
                              <div key={i} className={`w-10 h-10 flex flex-col items-center justify-center rounded-lg border ${d.isOff ? 'bg-gray-50 border-gray-200 text-gray-400' : 'bg-purple-50 border-purple-100 text-purple-700'}`}>
                                <span className="text-[8px] uppercase font-bold text-gray-400">D{d.dayIndex}</span>
                                <span className="text-xs font-bold">{d.isOff ? 'F' : 'T'}</span>
                              </div>
                            ))}
                          </div>
                          {formData.scheduleCycleStartDate && (
                            <p className="text-xs text-purple-600 mt-2 flex items-center gap-1">
                              <RotateCw size={12} /> Ciclo iniciado em: {new Date(formData.scheduleCycleStartDate).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      ) : (
                        <div className="grid grid-cols-7 gap-2">
                          {weekDays.map((day, idx) => {
                            const jsDay = (idx + 1) % 7; // Convert Monday=0 to Sunday=0
                            const schedDay = template.weeklyPattern?.find(d => d.day === jsDay);
                            const isWorkDay = schedDay && !schedDay.isOff;

                            return (
                              <div key={day} className={`p-3 rounded-lg text-center ${isWorkDay ? 'bg-brand-50 border border-brand-100' : 'bg-gray-50 border border-gray-100'}`}>
                                <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">{day.slice(0, 3)}</p>
                                {isWorkDay ? (
                                  <>
                                    <p className="text-xs font-bold text-brand-700">{schedDay.start}</p>
                                    <p className="text-[10px] text-gray-400">-</p>
                                    <p className="text-xs font-bold text-brand-700">{schedDay.end}</p>
                                  </>
                                ) : (
                                  <p className="text-xs text-gray-400 italic">Folga</p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })() : (
                  <div className="text-center py-8">
                    <Clock size={32} className="text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-400">Nenhum modelo de horário atribuído</p>
                    <p className="text-xs text-gray-400">Atribua um modelo no separador Profissional</p>
                  </div>
                )}
              </div>

              {/* Vacation Days Management */}
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <h3 className="text-lg font-bold border-b pb-2 mb-4 flex items-center gap-2">
                  <Calendar size={20} className="text-brand-600" />
                  Gestão de Dias de Férias
                </h3>

                {!isNew && vacationBalance && (
                  <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between shadow-sm animate-in fade-in slide-in-from-top-2 duration-500">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-amber-100 rounded-lg">
                        <Zap size={20} className="text-amber-500" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide">Saldo Corrente Férias</p>
                        <h4 className="text-2xl font-black text-amber-900">{vacationBalance.remaining} dias</h4>
                      </div>
                    </div>
                    <div className="px-3 py-1 bg-white/50 rounded-full border border-amber-200">
                      <span className="text-[10px] font-bold text-amber-600 uppercase tracking-widest">Disponível</span>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  {/* Current Year Vacation Days */}
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-blue-700 uppercase">Ano Corrente {new Date().getFullYear()}</span>
                      <Calendar size={16} className="text-blue-600" />
                    </div>
                    <div className="text-2xl font-bold text-blue-900">{formData.vacationDaysYearly ?? 22} dias</div>
                    <p className="text-xs text-blue-600 mt-1">Dias anuais atribuídos</p>
                  </div>

                  {/* Carryover Days */}
                  <div className="bg-gradient-to-br from-amber-50 to-amber-100 p-4 rounded-lg border border-amber-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-amber-700 uppercase">Transição</span>
                      <ChevronRight size={16} className="text-amber-600" />
                    </div>
                    <div className="text-2xl font-bold text-amber-900">{formData.vacationDaysCarryover ?? 0} dias</div>
                    <p className="text-xs text-amber-600 mt-1">Dias transitados de {new Date().getFullYear() - 1}</p>
                  </div>

                  {/* Adjustments */}
                  <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 p-4 rounded-lg border border-emerald-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-emerald-700 uppercase">Ajustes</span>
                      <PenTool size={16} className="text-emerald-600" />
                    </div>
                    <div className="text-2xl font-bold text-emerald-900">{formData.vacationAdjustments ?? 0} dias</div>
                    <p className="text-xs text-emerald-600 mt-1">Ajustes manuais (+ ou -)</p>
                  </div>
                </div>

                {/* Total Available */}
                <div className="bg-gradient-to-r from-brand-500 to-brand-600 p-4 rounded-lg text-white shadow-md">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold opacity-90">Total Disponível</p>
                      <p className="text-3xl font-bold">
                        {((formData.vacationDaysYearly ?? 22) + (formData.vacationDaysCarryover ?? 0) + (formData.vacationAdjustments ?? 0))} dias
                      </p>
                    </div>
                    <CheckCircle2 size={32} className="opacity-80" />
                  </div>
                </div>

                {/* Edit Fields (Admin Only) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 pt-4 border-t border-gray-200">
                  <InputField
                    label="Dias Anuais"
                    name="vacationDaysYearly"
                    type="number"
                    icon={Calendar}
                    formData={formData}
                    handleChange={(e: any) => setFormData(prev => ({ ...prev, vacationDaysYearly: parseInt(e.target.value) || 0 }))}
                    errors={errors}
                    placeholder="22"
                  />
                  <InputField
                    label="Dias Transitados"
                    name="vacationDaysCarryover"
                    type="number"
                    icon={ChevronRight}
                    formData={formData}
                    handleChange={(e: any) => setFormData(prev => ({ ...prev, vacationDaysCarryover: parseInt(e.target.value) || 0 }))}
                    errors={errors}
                    placeholder="0"
                  />
                  <InputField
                    label="Ajustes (+ ou -)"
                    name="vacationAdjustments"
                    type="number"
                    icon={PenTool}
                    formData={formData}
                    handleChange={(e: any) => setFormData(prev => ({ ...prev, vacationAdjustments: parseInt(e.target.value) || 0 }))}
                    errors={errors}
                    placeholder="0"
                  />
                </div>
              </div>

              {/* Recent Absences */}
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <h3 className="text-lg font-bold border-b pb-2 mb-4">Ausências Recentes</h3>

                {(() => {
                  const userAbsences = absences.filter(a => a.userId === formData.id).slice(0, 5);

                  if (userAbsences.length === 0) {
                    return <p className="text-gray-400 text-center py-4 italic">Sem ausências registadas</p>;
                  }

                  return (
                    <div className="space-y-3">
                      {userAbsences.map(a => (
                        <div key={a.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className={`w-2 h-2 rounded-full ${a.status === 'APPROVED' ? 'bg-green-500' : a.status === 'PENDING' ? 'bg-amber-500' : 'bg-red-500'}`} />
                            <div>
                              <p className="text-sm font-bold text-gray-800">{a.type}</p>
                              <p className="text-xs text-gray-500">
                                {new Date(a.startDate).toLocaleDateString('pt-PT')} - {new Date(a.endDate).toLocaleDateString('pt-PT')}
                              </p>
                            </div>
                          </div>
                          <span className={`px-2 py-1 rounded text-[10px] font-bold ${a.status === 'APPROVED' ? 'bg-green-100 text-green-700' : a.status === 'PENDING' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                            {a.status === 'APPROVED' ? 'Aprovado' : a.status === 'PENDING' ? 'Pendente' : 'Rejeitado'}
                          </span>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar Info - AI and Quick Stats */}
        <div className="space-y-6">
          {aiResult && (
            <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 text-sm">
              <div className="flex justify-between">
                <h4 className="font-bold text-indigo-900 mb-2 flex items-center gap-2"><Sparkles size={14} /> Assistente RH</h4>
                <button onClick={() => setAiResult(null)}><X size={14} className="text-indigo-400" /></button>
              </div>
              {aiResult.content}
            </div>
          )}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h4 className="font-bold text-xs uppercase text-gray-400 mb-4">Detalhes</h4>
            <div className="flex justify-between py-2 border-b border-gray-50">
              <span className="text-gray-500 text-sm">ID Sistema</span>
              <span className="font-mono text-sm">#{formData.id}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-50">
              <span className="text-gray-500 text-sm">Status</span>
              <span className="font-bold text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">{UserStatusLabels[formData.status]}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-50">
              <span className="text-gray-500 text-sm">Restrição</span>
              <span className="text-xs font-bold text-gray-700">{formData.attendanceConfig?.restriction || 'NENHUMA'}</span>
            </div>
          </div>
        </div>
      </div>
    </div >
  );
};

// Helper Components

const TabButton = ({ id, label, icon: Icon, active, onClick }: any) => (
  <button
    onClick={() => onClick(id)}
    className={`px-4 py-3 text-sm font-medium transition-colors relative whitespace-nowrap flex items-center gap-2 outline-none ${active === id ? 'text-brand-600 bg-brand-50 rounded-t-lg border-b-2 border-brand-600' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50 rounded-t-lg'}`}
  >
    <Icon size={16} /> {label}
  </button>
);

const ToggleField = ({ label, checked, onChange, disabled = false }: { label: string, checked?: boolean, onChange: (c: boolean) => void, disabled?: boolean }) => (
  <div className={`flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 ${disabled ? 'opacity-50' : ''}`}>
    <span className="font-bold text-sm text-gray-800">{label}</span>
    <label className="relative inline-flex items-center cursor-pointer">
      <input
        type="checkbox"
        className="sr-only peer"
        checked={checked || false}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
      />
      <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-brand-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand-600"></div>
    </label>
  </div>
);

export default UserProfile;
