import React, { useState } from 'react';
import { Location } from '../types';
import { MapPin, Plus, Search, Edit2, Trash2, X, Save, Globe, Mail, Clock, ShieldAlert, Phone } from 'lucide-react';
import { useToast } from '../context/ToastContext';

interface LocationsManagementProps {
    locations: Location[];
    onAddLocation: (loc: Location) => Promise<boolean>;
    onUpdateLocation: (loc: Location) => Promise<boolean>;
    onDeleteLocation: (id: number) => Promise<boolean>;
}

const LocationsManagement: React.FC<LocationsManagementProps> = ({ locations, onAddLocation, onUpdateLocation, onDeleteLocation }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [editingLocation, setEditingLocation] = useState<Location | null>(null);
    const { addToast } = useToast();

    const [formData, setFormData] = useState<Location>({
        id: 0,
        name: '',
        address: '',
        observations: '',
        locality: '',
        postalCode: '',
        mobile: '',
        phone: '',
        email: '',
        toleranceEntry: 30,
        toleranceExit: 30,
        blockEntry: false,
        blockExit: false,
        allowedIps: '',
        notificationEmails: { email1: '', email2: '' },
        status: 'active',
        coordinates: { lat: 41.1579, lng: -8.6291, radius: 750 },
        extraHoursStart: 0,
        missingHoursStart: 0,
        countExtraAfterExit: false,
        timezone: 'Europe/Lisbon'
    });



    // Add logic to get current location
    const handleGetCurrentLocation = () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setFormData(prev => ({
                        ...prev,
                        coordinates: {
                            lat: position.coords.latitude,
                            lng: position.coords.longitude,
                            radius: prev.coordinates?.radius || 750
                        }
                    }));
                    addToast('success', 'Localização atual capturada.');
                },
                (error) => {
                    console.error("Error getting location", error);
                    addToast('error', 'Erro ao obter localização. Verifique as permissões do browser.');
                }
            );
        } else {
            addToast('error', 'Geolocalização não suportada neste browser.');
        }
    };

    const handleOpenModal = (loc?: Location) => {
        if (loc) {
            setEditingLocation(loc);
            setFormData({
                ...loc,
                coordinates: loc.coordinates || { lat: 41.1579, lng: -8.6291, radius: 750 },
                extraHoursStart: loc.extraHoursStart || 0,
                missingHoursStart: loc.missingHoursStart || 0,
                countExtraAfterExit: loc.countExtraAfterExit || false,
                timezone: loc.timezone || 'Europe/Lisbon'
            });
        } else {
            setEditingLocation(null);
            setFormData({
                id: 0,
                name: '',
                address: '',
                observations: '',
                locality: '',
                postalCode: '',
                mobile: '',
                phone: '',
                email: '',
                toleranceEntry: 30,
                toleranceExit: 30,
                blockEntry: false,
                blockExit: false,
                allowedIps: '',
                notificationEmails: { email1: '', email2: '' },
                status: 'active',
                coordinates: { lat: 41.1579, lng: -8.6291, radius: 750 },
                extraHoursStart: 0,
                missingHoursStart: 0,
                countExtraAfterExit: false,
                timezone: 'Europe/Lisbon'
            });
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name) {
            addToast('error', 'O nome do local é obrigatório.');
            return;
        }

        let success = false;
        if (editingLocation) {
            success = await onUpdateLocation(formData);
        } else {
            success = await onAddLocation({ ...formData, id: Date.now(), createdAt: new Date().toISOString() });
        }

        if (success) {
            // Success toast is already handled in App.tsx to ensure consistency with other pages, or we can keep it here.
            // Current App.tsx refactor adds toast on success. So we just close modal.
            setIsModalOpen(false);
        }
    };

    const filteredLocations = locations.filter(l =>
        l.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        l.locality?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="p-6 max-w-7xl mx-auto mb-20">
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <MapPin className="text-brand-600" />
                        Todos os locais
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">Gerencie os locais físicos da sua organização.</p>
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors shadow-sm"
                >
                    <Plus size={20} />
                    Novo local
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                {/* Filters */}
                <div className="p-4 border-b border-gray-100 flex flex-col md:flex-row gap-4 justify-between items-center bg-gray-50/50">
                    <div className="relative w-full md:w-96">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Procurar..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                        />
                    </div>
                    <select className="px-4 py-2 border border-gray-200 rounded-lg text-sm bg-white text-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-500">
                        <option value="active">Ativo</option>
                        <option value="inactive">Inativo</option>
                        <option value="all">Todos</option>
                    </select>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-100 text-xs uppercase text-gray-500 font-semibold tracking-wider">
                                <th className="p-4">Nome</th>
                                <th className="p-4">Localidade</th>
                                <th className="p-4">Telefone</th>
                                <th className="p-4">Telemóvel</th>
                                <th className="p-4">Status</th>
                                <th className="p-4">Data Registo</th>
                                <th className="p-4 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-sm">
                            {filteredLocations.length > 0 ? (
                                filteredLocations.map((loc) => (
                                    <tr key={loc.id} className="hover:bg-gray-50 transition-colors group">
                                        <td className="p-4 font-medium text-gray-900">{loc.name}</td>
                                        <td className="p-4 text-gray-600">{loc.locality || '-'}</td>
                                        <td className="p-4 text-gray-600">{loc.phone || '-'}</td>
                                        <td className="p-4 text-gray-600">{loc.mobile || '-'}</td>
                                        <td className="p-4">
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${loc.status === 'active'
                                                ? 'bg-green-100 text-green-700'
                                                : 'bg-red-100 text-red-700'
                                                }`}>
                                                {loc.status === 'active' ? 'Ativo' : 'Inativo'}
                                            </span>
                                        </td>
                                        <td className="p-4 text-gray-500 text-xs">
                                            {loc.createdAt ? new Date(loc.createdAt).toLocaleString('pt-PT').slice(0, 16) : '-'}
                                        </td>
                                        <td className="p-4 text-right">
                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => handleOpenModal(loc)}
                                                    className="p-1.5 text-gray-500 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                                <button
                                                    onClick={async () => {
                                                        if (window.confirm('Tem a certeza que deseja eliminar este local?')) {
                                                            await onDeleteLocation(loc.id);
                                                        }
                                                    }}
                                                    className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={7} className="p-8 text-center text-gray-500 italic">
                                        Nenhum local encontrado.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Footer */}
                <div className="p-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                    <span>A mostrar de {filteredLocations.length > 0 ? 1 : 0} a {filteredLocations.length} num total de {filteredLocations.length} registos</span>
                    <div className="flex gap-1">
                        <button disabled className="px-3 py-1 border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-50">anterior</button>
                        <button className="px-3 py-1 bg-brand-600 text-white rounded font-bold">1</button>
                        <button disabled className="px-3 py-1 border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-50">próximo</button>
                    </div>
                </div>
            </div>

            {/* MODAL */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto animate-scale-in">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white z-10">
                            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                                {editingLocation ? 'Editar Local' : 'Novo local'}
                            </h2>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-8">

                            {/* Left Column: General Info */}
                            <div className="space-y-6">
                                <h3 className="font-bold text-gray-800 flex items-center gap-2 border-b border-gray-100 pb-2">
                                    <MapPin size={18} className="text-brand-500" /> Informação Geral
                                </h3>

                                <div className="space-y-4">
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1">Nome <span className="text-red-500">*</span></label>
                                        <input
                                            required
                                            value={formData.name}
                                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                                            className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-xs font-bold text-gray-500 uppercase">Morada</label>
                                            <textarea
                                                rows={3}
                                                value={formData.address}
                                                onChange={e => setFormData({ ...formData, address: e.target.value })}
                                                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-gray-500 uppercase">Observações</label>
                                            <textarea
                                                rows={3}
                                                value={formData.observations}
                                                onChange={e => setFormData({ ...formData, observations: e.target.value })}
                                                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-xs font-bold text-gray-500 uppercase">Localidade</label>
                                            <input
                                                value={formData.locality}
                                                onChange={e => setFormData({ ...formData, locality: e.target.value })}
                                                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-gray-500 uppercase">Código Postal</label>
                                            <input
                                                value={formData.postalCode}
                                                onChange={e => setFormData({ ...formData, postalCode: e.target.value })}
                                                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1"><Phone size={12} /> Telemóvel</label>
                                            <input
                                                value={formData.mobile}
                                                onChange={e => setFormData({ ...formData, mobile: e.target.value })}
                                                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1"><Phone size={12} /> Telefone</label>
                                            <input
                                                value={formData.phone}
                                                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1"><Mail size={12} /> Email</label>
                                        <input
                                            type="email"
                                            value={formData.email}
                                            onChange={e => setFormData({ ...formData, email: e.target.value })}
                                            className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Right Column: Settings */}
                            <div className="space-y-6">
                                {/* MAP SECTION */}
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center">
                                        <h3 className="font-bold text-gray-800 flex items-center gap-2 border-b border-gray-100 pb-2 w-full">
                                            <Globe size={18} className="text-brand-500" /> Localização & Mapa
                                        </h3>
                                    </div>

                                    {/* Map Embed and Inputs */}
                                    <div className="space-y-3">
                                        <div className="flex gap-2">
                                            <div className="relative flex-1">
                                                <input
                                                    type="number"
                                                    placeholder="Latitude"
                                                    value={formData.coordinates?.lat}
                                                    onChange={e => setFormData({ ...formData, coordinates: { ...formData.coordinates!, lat: parseFloat(e.target.value) } })}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none"
                                                />
                                            </div>
                                            <div className="relative flex-1">
                                                <input
                                                    type="number"
                                                    placeholder="Longitude"
                                                    value={formData.coordinates?.lng}
                                                    onChange={e => setFormData({ ...formData, coordinates: { ...formData.coordinates!, lng: parseFloat(e.target.value) } })}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none"
                                                />
                                            </div>
                                            <button
                                                type="button"
                                                onClick={handleGetCurrentLocation}
                                                className="bg-brand-50 hover:bg-brand-100 text-brand-600 p-2 rounded-lg border border-brand-200 transition-colors"
                                                title="Usar minha localização atual"
                                            >
                                                <MapPin size={20} />
                                            </button>
                                        </div>

                                        <div className="relative w-full h-48 bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
                                            <iframe
                                                width="100%"
                                                height="100%"
                                                frameBorder="0"
                                                src={`https://maps.google.com/maps?q=${formData.coordinates?.lat || 0},${formData.coordinates?.lng || 0}&z=15&output=embed`}
                                                title="Location Map"
                                            ></iframe>
                                            <div className="absolute top-2 right-2 bg-white/90 px-2 py-1 rounded text-[10px] font-mono text-gray-600 border border-gray-200 shadow-sm">
                                                Raio: {formData.coordinates?.radius}m
                                            </div>
                                        </div>

                                        <div>
                                            <label className="text-xs font-bold text-gray-500 uppercase">Raio de abrangência (metros)</label>
                                            <input
                                                type="number"
                                                value={formData.coordinates?.radius}
                                                onChange={e => setFormData({ ...formData, coordinates: { ...formData.coordinates!, radius: parseFloat(e.target.value) } })}
                                                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                            />
                                            <p className="text-[10px] text-gray-400 mt-1">Se não definido, será aplicado por defeito 750m.</p>
                                        </div>
                                    </div>
                                </div>

                                {/* EXTRA HOURS SECTION */}
                                <div className="space-y-4 pt-4 border-t border-gray-100">
                                    <h4 className="text-sm font-bold text-brand-800">Contabilização das horas extra/falta</h4>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-xs font-bold text-gray-500 uppercase">Horas Extra a partir de</label>
                                            <div className="flex items-center gap-2 mt-1">
                                                <input
                                                    type="number"
                                                    value={formData.extraHoursStart}
                                                    onChange={e => setFormData({ ...formData, extraHoursStart: parseInt(e.target.value) || 0 })}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
                                                />
                                                <span className="text-sm text-gray-500">minutos</span>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-gray-500 uppercase">Horas Falta a partir de</label>
                                            <div className="flex items-center gap-2 mt-1">
                                                <input
                                                    type="number"
                                                    value={formData.missingHoursStart}
                                                    onChange={e => setFormData({ ...formData, missingHoursStart: parseInt(e.target.value) || 0 })}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
                                                />
                                                <span className="text-sm text-gray-500">minutos</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-xs font-bold text-gray-500 uppercase flex items-center justify-between">
                                            <span>Contabilizar H.Extra apenas após a última saída</span>
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={formData.countExtraAfterExit}
                                                    onChange={e => setFormData({ ...formData, countExtraAfterExit: e.target.checked })}
                                                    className="sr-only peer"
                                                />
                                                <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-brand-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand-600"></div>
                                            </label>
                                        </label>
                                        <p className="text-[10px] text-gray-400 mt-2">
                                            As horas extra/falta só irão ser contabilizadas para um dia quando o colaborador ultrapassar o valor descrito acima.
                                        </p>
                                    </div>

                                    <div>
                                        <label className="text-xs font-bold text-gray-500 uppercase">Fuso Horário</label>
                                        <select
                                            value={formData.timezone}
                                            onChange={e => setFormData({ ...formData, timezone: e.target.value })}
                                            className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
                                        >
                                            <option value="Europe/Lisbon">Europe/Lisbon</option>
                                            <option value="Europe/London">Europe/London</option>
                                            <option value="Europe/Madrid">Europe/Madrid</option>
                                            <option value="UTC">UTC</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-6 pt-4 border-t border-gray-100">
                                    <h3 className="font-bold text-gray-800 flex items-center gap-2 border-b border-gray-100 pb-2">
                                        <ShieldAlert size={18} className="text-brand-500" /> Configurações de Ponto
                                    </h3>

                                    <div className="grid grid-cols-2 gap-6 bg-gray-50 p-4 rounded-lg border border-gray-200">
                                        <div>
                                            <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1"><Clock size={12} /> Tolerância Entrada</label>
                                            <input
                                                type="number"
                                                value={formData.toleranceEntry}
                                                onChange={e => setFormData({ ...formData, toleranceEntry: parseInt(e.target.value) || 0 })}
                                                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1"><Clock size={12} /> Tolerância Saída</label>
                                            <input
                                                type="number"
                                                value={formData.toleranceExit}
                                                onChange={e => setFormData({ ...formData, toleranceExit: parseInt(e.target.value) || 0 })}
                                                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
                                            />
                                        </div>

                                        <div>
                                            <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1"><ShieldAlert size={12} /> Bloqueio Entrada</label>
                                            <input
                                                type="checkbox"
                                                checked={formData.blockEntry}
                                                onChange={e => setFormData({ ...formData, blockEntry: e.target.checked })}
                                                className="mt-2 w-5 h-5 text-brand-600 rounded focus:ring-brand-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1"><ShieldAlert size={12} /> Bloqueio Saída</label>
                                            <input
                                                type="checkbox"
                                                checked={formData.blockExit}
                                                onChange={e => setFormData({ ...formData, blockExit: e.target.checked })}
                                                className="mt-2 w-5 h-5 text-brand-600 rounded focus:ring-brand-500"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1"><Globe size={12} /> Permissões de IP</label>
                                        <input
                                            placeholder="Ex: 192.168.1.1, 10.0.0.1"
                                            value={formData.allowedIps}
                                            onChange={e => setFormData({ ...formData, allowedIps: e.target.value })}
                                            className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
                                        />
                                        <p className="text-[10px] text-gray-400 mt-1">Separe múltiplos IPs por vírgula.</p>
                                    </div>

                                    <div className="space-y-4">
                                        <h4 className="text-sm font-bold text-brand-800">Notificações de faltas/férias</h4>
                                        <div>
                                            <label className="text-xs font-bold text-gray-500 uppercase">Email 1</label>
                                            <input
                                                type="email"
                                                value={formData.notificationEmails?.email1}
                                                onChange={e => setFormData({ ...formData, notificationEmails: { ...formData.notificationEmails, email1: e.target.value } })}
                                                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-gray-500 uppercase">Email 2</label>
                                            <input
                                                type="email"
                                                value={formData.notificationEmails?.email2}
                                                onChange={e => setFormData({ ...formData, notificationEmails: { ...formData.notificationEmails, email2: e.target.value } })}
                                                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
                                            />
                                        </div>
                                    </div>

                                </div>
                            </div>

                            {/* Footer Actions */}
                            <div className="lg:col-span-2 flex justify-end gap-3 pt-6 border-t border-gray-100 sticky bottom-0 bg-white pb-2">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-6 py-2 border border-gray-200 text-gray-600 rounded-lg font-bold hover:bg-gray-50 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="px-6 py-2 bg-brand-600 text-white rounded-lg font-bold hover:bg-brand-700 transition-colors flex items-center gap-2 shadow-lg shadow-brand-200"
                                >
                                    <Save size={18} />
                                    Guardar Local
                                </button>
                            </div>

                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LocationsManagement;
