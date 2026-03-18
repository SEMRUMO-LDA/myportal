import React, { useState } from 'react';
import { Vehicle } from '../types';
import { Search, X, ChevronRight } from 'lucide-react';

interface VehicleSearchModalProps {
    vehicles: Vehicle[];
    suggestedVehicles: Vehicle[];
    onSelect: (vehicle: Vehicle) => void;
    onClose: () => void;
    isLoading: boolean;
}

const VehicleSearchModal: React.FC<VehicleSearchModalProps> = ({
    vehicles,
    suggestedVehicles,
    onSelect,
    onClose,
    isLoading
}) => {
    const [searchQuery, setSearchQuery] = useState('');

    // Filter logic extracted from main component
    const filteredVehicles = vehicles.filter(v => {
        const status = (v.status || '').toUpperCase();
        if (status !== 'AVAILABLE' && status !== 'DISPONIVEL') return false;

        const normalize = (str: string) => str.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
        const search = normalize(searchQuery);
        const plate = normalize(v.plate);

        return plate.includes(search) || (searchQuery.length > 2 && v.model.toUpperCase().includes(searchQuery));
    });

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-[2.5rem] w-full max-w-md h-[85vh] flex flex-col overflow-hidden shadow-2xl relative animate-zoom-in">
                <div className="p-8 pb-2">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Selecionar Viatura</h2>
                        <button onClick={onClose} className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors">
                            <X size={20} className="text-gray-600" />
                        </button>
                    </div>

                    <div className="relative mb-2">
                        <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                            <Search size={22} className="text-brand-500" />
                        </div>
                        <input
                            type="text"
                            className="block w-full pl-14 pr-4 py-5 border-2 border-brand-100 hover:border-brand-300 focus:border-brand-500 rounded-2xl bg-brand-50/30 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-0 transition-all font-bold text-lg uppercase tracking-wider"
                            placeholder="MATRÍCULA..."
                            autoFocus
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value.toUpperCase())}
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 pt-2 space-y-3">
                    {isLoading ? (
                        <div className="text-center py-20 opacity-50">
                            <div className="animate-spin text-brand-500 mb-4 mx-auto w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full"></div>
                            <p className="text-sm font-bold text-gray-400">A carregar frota...</p>
                        </div>
                    ) : (
                        <>
                            {/* SUGGESTIONS SECTION - Only show if no search query */}
                            {searchQuery === '' && suggestedVehicles.length > 0 && (
                                <div className="mb-6">
                                    <div className="flex items-center gap-2 mb-3 pl-1">
                                        <div className="w-1 h-4 bg-yellow-400 rounded-full"></div>
                                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Mais Usados por Si</h3>
                                    </div>
                                    <div className="space-y-3">
                                        {suggestedVehicles.map(v => {
                                            const isAvailable = vehicles.find(fleetV => fleetV.id === v.id)?.status === 'AVAILABLE' || vehicles.find(fleetV => fleetV.id === v.id)?.status === 'DISPONIVEL';

                                            // Sync suggestion with latest fleet state (km, status)
                                            const freshV = vehicles.find(fleetV => fleetV.id === v.id) || v;

                                            if (!isAvailable) return null; // Don't show if currently taken

                                            return (
                                                <button
                                                    key={`sugg-${freshV.id}`}
                                                    onClick={() => onSelect(freshV)}
                                                    className="w-full bg-brand-50/50 border-2 border-yellow-100 hover:border-yellow-400 hover:bg-yellow-50/30 p-5 rounded-2xl transition-all flex items-center justify-between group text-left shadow-sm"
                                                >
                                                    <div>
                                                        <div className="flex items-center gap-3 mb-1">
                                                            <span className="text-2xl font-bold text-gray-900 tracking-tight">{freshV.plate}</span>
                                                            <span className="bg-yellow-100 text-yellow-700 text-[10px] font-bold px-2 py-0.5 rounded-full">FREQUENTE</span>
                                                        </div>
                                                        <p className="text-sm text-gray-500 font-medium">{freshV.brand} {freshV.model}</p>
                                                    </div>
                                                    <div className="w-10 h-10 bg-yellow-100 rounded-xl flex items-center justify-center text-yellow-600">
                                                        <ChevronRight size={20} />
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                    <div className="flex items-center gap-2 mt-8 mb-3 pl-1">
                                        <div className="w-1 h-4 bg-gray-300 rounded-full"></div>
                                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Toda a Frota</h3>
                                    </div>
                                </div>
                            )}

                            {/* ALL VEHICLES LIST */}
                            {filteredVehicles.length > 0 ? (
                                filteredVehicles.map(v => (
                                    <button
                                        key={v.id}
                                        onClick={() => onSelect(v)}
                                        className="w-full bg-white border-2 border-gray-50 hover:border-brand-500 hover:bg-brand-50/30 p-5 rounded-2xl transition-all flex items-center justify-between group text-left shadow-sm hover:shadow-lg hover:shadow-brand-500/10"
                                    >
                                        <div>
                                            <div className="flex items-center gap-3 mb-1">
                                                <span className="text-2xl font-bold text-gray-900 tracking-tight group-hover:text-brand-600 transition-colors">{v.plate}</span>
                                                {v.currentKm < 1000 && <span className="bg-yellow-100 text-yellow-700 text-[10px] font-bold px-2 py-0.5 rounded-full">NOVO</span>}
                                            </div>
                                            <p className="text-sm text-gray-500 font-medium group-hover:text-brand-400">{v.brand} {v.model}</p>
                                        </div>
                                        <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center group-hover:bg-brand-500 group-hover:text-white transition-all text-gray-400">
                                            <ChevronRight size={20} />
                                        </div>
                                    </button>
                                ))
                            ) : (
                                <div className="text-center py-20">
                                    <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                                        <Search size={32} className="text-gray-300" />
                                    </div>
                                    <p className="text-gray-900 font-bold text-xl mb-2">Viatura não encontrada</p>
                                    <p className="text-gray-500">Tente outra matrícula.</p>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default VehicleSearchModal;
