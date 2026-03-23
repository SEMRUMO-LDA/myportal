import React, { useState, useRef, useEffect } from 'react';
import { Camera, X, CheckCircle2, Upload, Image as ImageIcon, Trash2 } from 'lucide-react';
import { Vehicle, User, Trip, VehicleExpenseCategory } from '../types';
import { createVehicleExpense, uploadReceiptImage } from '../services/fleetService';
import { useToast } from '../context/ToastContext';

interface ExpenseModalProps {
    vehicle: Vehicle;
    user: User;
    activeTrip?: Trip;
    onClose: () => void;
    onSuccess: () => void;
}

const CATEGORIES: { key: VehicleExpenseCategory; label: string }[] = [
    { key: 'FUEL', label: 'Combustível' },
    { key: 'TOLLS', label: 'Portagem' },
    { key: 'PARKING', label: 'Estacionamento' },
    { key: 'MAINTENANCE', label: 'Oficina' },
    { key: 'OTHER', label: 'Outro' },
];

const ExpenseModal: React.FC<ExpenseModalProps> = ({ vehicle, user, activeTrip, onClose, onSuccess }) => {
    const [selectedCategory, setSelectedCategory] = useState<VehicleExpenseCategory>('FUEL');
    const [amount, setAmount] = useState<string>('');
    const [description, setDescription] = useState<string>('');

    // Fuel-specific fields
    const [liters, setLiters] = useState<string>('');
    const [kmAtFuel, setKmAtFuel] = useState<string>(vehicle.currentKm?.toString() || '');

    // Image State
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);

    const [submitting, setSubmitting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { addToast } = useToast();

    // Cleanup preview URL on unmount using a dedicated effect for cleanup
    useEffect(() => {
        return () => {
            if (previewUrl) {
                URL.revokeObjectURL(previewUrl);
            }
        };
    }, []); // Empty dependency array means this runs on mount/unmount logic if we tracked previewUrl updates properly, 
    // but simpler to just revoke when replacing.

    const handleFileSelect = (file: File) => {
        if (!file.type.startsWith('image/')) {
            addToast('error', 'Por favor selecione apenas imagens.');
            return;
        }

        // 10MB Limit
        if (file.size > 10 * 1024 * 1024) {
            addToast('error', 'A imagem é demasiado grande (Máx: 10MB).');
            return;
        }

        if (previewUrl) URL.revokeObjectURL(previewUrl);

        setImageFile(file);
        setPreviewUrl(URL.createObjectURL(file));
    };

    const onFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            handleFileSelect(e.target.files[0]);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFileSelect(e.dataTransfer.files[0]);
        }
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        if (e.clipboardData.files && e.clipboardData.files[0]) {
            handleFileSelect(e.clipboardData.files[0]);
        }
    };

    const removeImage = () => {
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setImageFile(null);
        setPreviewUrl(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    // Calculate consumption if we have liters and km difference
    const calculateConsumption = () => {
        if (!liters || !kmAtFuel || !vehicle.currentKm) return null;
        const kmDiff = parseFloat(kmAtFuel) - vehicle.currentKm;
        if (kmDiff <= 0 || parseFloat(liters) <= 0) return null;
        const consumption = (parseFloat(liters) / kmDiff) * 100;
        return consumption.toFixed(1);
    };

    const handleSubmit = async () => {
        if (!amount || parseFloat(amount) <= 0) {
            addToast('warning', 'Insira um valor válido');
            return;
        }

        setSubmitting(true);
        try {
            let receiptUrl = null;

            // Upload Image if present
            if (imageFile) {
                receiptUrl = await uploadReceiptImage(imageFile);
                if (!receiptUrl) {
                    throw new Error('Falha no upload da imagem');
                }
            }

            await createVehicleExpense({
                vehicleId: vehicle.id,
                userId: user.id,
                tripId: activeTrip?.id,
                date: new Date().toISOString(),
                category: selectedCategory as VehicleExpenseCategory,
                amount: parseFloat(amount),
                description: description,
                receiptUrl: receiptUrl || undefined,
                liters: selectedCategory === 'FUEL' && liters ? parseFloat(liters) : undefined,
                kmAtFuel: selectedCategory === 'FUEL' && kmAtFuel ? parseInt(kmAtFuel) : undefined
            });

            onSuccess();
        } catch (error) {
            console.error('Error submitting expense:', error);
            addToast('error', 'Erro ao registar despesa. Tente novamente.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div
            onPaste={handlePaste}
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-[60] flex items-center justify-center p-4"
        >
            <div className="bg-white rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-2xl relative animate-in fade-in zoom-in duration-300 flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="p-6 pb-0 flex justify-between items-center shrink-0">
                    <h2 className="text-2xl font-black text-gray-900 leading-tight">Registo de<br />Despesa</h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                        <X size={24} className="text-gray-400" />
                    </button>
                </div>

                <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar">

                    {/* Categories Grid */}
                    <div className="grid grid-cols-2 gap-2">
                        {CATEGORIES.map(cat => (
                            <button
                                key={cat.key}
                                onClick={() => setSelectedCategory(cat.key)}
                                className={`
                                    py-3 px-2 rounded-xl text-[10px] font-bold tracking-wider transition-all
                                    ${selectedCategory === cat.key
                                        ? 'bg-brand-600 text-white shadow-lg shadow-brand-500/30 ring-2 ring-brand-500 ring-offset-2'
                                        : 'bg-gray-50 text-gray-500 hover:bg-gray-100 border border-gray-100'
                                    }
                                    ${cat.key === 'OTHER' ? 'col-span-2' : ''}
                                `}
                            >
                                {cat.label}
                            </button>
                        ))}
                    </div>

                    {/* Amount Input */}
                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
                            Valor Total
                        </label>
                        <div className="relative group">
                            <span className="absolute left-6 top-1/2 -translate-y-1/2 text-3xl font-bold text-gray-300 group-focus-within:text-brand-500 transition-colors">€</span>
                            <input
                                type="number"
                                step="0.01"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="0.00"
                                className="w-full pl-14 pr-6 py-5 bg-brand-50/30 border-2 border-transparent focus:bg-white focus:border-brand-500 rounded-2xl text-4xl font-black text-gray-900 placeholder-gray-300 focus:outline-none transition-all text-center shadow-sm"
                            />
                        </div>
                    </div>

                    {/* Fuel-specific fields */}
                    {selectedCategory === 'FUEL' && (
                        <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-4 space-y-4 border border-amber-100">
                            <div className="flex items-center gap-2 text-amber-700 mb-2">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M3 22V8a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v14" />
                                    <path d="M17 8V6a2 2 0 0 0-2-2H9a2 2 0 0 0-2 2v2" />
                                    <path d="M21 12v4a2 2 0 0 1-2 2h-2" />
                                    <path d="M21 12l-2-2-2 2" />
                                </svg>
                                <span className="text-xs font-bold uppercase tracking-wider">Detalhes do Abastecimento</span>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">
                                        Litros
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={liters}
                                            onChange={(e) => setLiters(e.target.value)}
                                            placeholder="0.00"
                                            className="w-full px-3 py-3 bg-white border-2 border-amber-200 focus:border-amber-500 rounded-xl text-lg font-bold text-gray-900 placeholder-gray-300 focus:outline-none transition-all"
                                        />
                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">L</span>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">
                                        Km Atuais
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            value={kmAtFuel}
                                            onChange={(e) => setKmAtFuel(e.target.value)}
                                            placeholder="0"
                                            className="w-full px-3 py-3 bg-white border-2 border-amber-200 focus:border-amber-500 rounded-xl text-lg font-bold text-gray-900 placeholder-gray-300 focus:outline-none transition-all"
                                        />
                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">km</span>
                                    </div>
                                </div>
                            </div>

                            {/* Consumption estimate */}
                            {calculateConsumption() && (
                                <div className="flex items-center justify-center gap-2 py-2 bg-white/60 rounded-xl">
                                    <span className="text-xs text-gray-500">Consumo estimado:</span>
                                    <span className="text-sm font-bold text-amber-600">{calculateConsumption()} L/100km</span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Image Upload Area */}
                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
                            Comprovativo
                        </label>

                        <input
                            type="file"
                            accept="image/*"
                            capture="environment" // Native mobile camera support
                            ref={fileInputRef}
                            onChange={onFileInputChange}
                            className="hidden"
                        />

                        {previewUrl ? (
                            <div className="relative rounded-2xl overflow-hidden group shadow-md border-2 border-brand-100">
                                <img src={previewUrl} alt="Receipt preview" className="w-full h-48 object-cover" />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        className="p-3 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/40 transition-colors"
                                    >
                                        <Camera size={20} />
                                    </button>
                                    <button
                                        onClick={removeImage}
                                        className="p-3 bg-red-500/80 backdrop-blur-md rounded-full text-white hover:bg-red-500 transition-colors"
                                    >
                                        <Trash2 size={20} />
                                    </button>
                                </div>
                                <div className="absolute top-2 right-2 bg-green-500 text-white text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1 shadow-sm">
                                    <CheckCircle2 size={12} /> IMAGEM OK
                                </div>
                            </div>
                        ) : (
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={handleDrop}
                                className={`
                                    w-full h-40 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-3 cursor-pointer transition-all
                                    ${isDragging
                                        ? 'border-brand-500 bg-brand-50 scale-[1.02]'
                                        : 'border-gray-300 bg-gray-50 hover:bg-gray-100 hover:border-gray-400'
                                    }
                                `}
                            >
                                <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center text-brand-500">
                                    <Camera size={24} />
                                </div>
                                <div className="text-center">
                                    <p className="text-sm font-bold text-gray-600">
                                        Tirar Foto ou Carregar
                                    </p>
                                    <p className="text-[10px] text-gray-400 font-medium mt-1">
                                        Arrastar ou Colar também funciona
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Description Input */}
                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
                            Notas (Opcional)
                        </label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Detalhes adicionais..."
                            rows={2}
                            className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent focus:bg-white focus:border-brand-500 rounded-xl text-sm font-medium text-gray-700 placeholder-gray-400 focus:outline-none transition-all resize-none"
                        />
                    </div>

                    {/* Action Button */}
                    <button
                        onClick={handleSubmit}
                        disabled={submitting}
                        className="w-full py-4 rounded-xl font-bold text-lg shadow-xl shadow-brand-500/20 bg-brand-600 hover:bg-brand-700 text-white transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {submitting ? (
                            <>
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                <span className="animate-pulse">A Enviar...</span>
                            </>
                        ) : (
                            <>
                                <CheckCircle2 size={20} />
                                <span>Confirmar Registo</span>
                            </>
                        )}
                    </button>

                </div>
            </div>
        </div>
    );
};

export default ExpenseModal;
