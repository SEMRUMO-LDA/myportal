import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { supabase } from '../services/supabaseClient';
import { useToast } from '../context/ToastContext';
import { X, UserCircle, Phone, Calendar, Heart, ChevronRight, CheckCircle2 } from 'lucide-react';

interface ProfileCompletionModalProps {
    user: User;
    onComplete: () => void;
    onDismiss: () => void;
}

interface MissingField {
    key: string;
    label: string;
    icon: React.ReactNode;
    type: string;
    placeholder: string;
    dbColumn: string;
}

const ProfileCompletionModal: React.FC<ProfileCompletionModalProps> = ({ user, onComplete, onDismiss }) => {
    const { addToast } = useToast();
    const [currentStep, setCurrentStep] = useState(0);
    const [values, setValues] = useState<Record<string, string>>({});
    const [isSaving, setIsSaving] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    // Determine which fields are missing
    const missingFields: MissingField[] = [];

    /* 
    // birthDate is now optional as per user request
    if (!user.birthDate || user.birthDate === '' || user.birthDate === '1900-01-01') {
        missingFields.push({
            key: 'birthDate',
            label: 'Data de Nascimento',
            icon: <Calendar size={24} className="text-blue-500" />,
            type: 'date',
            placeholder: '',
            dbColumn: 'birth_date'
        });
    }
    */

    if (!user.mobilePhone || user.mobilePhone === '') {
        missingFields.push({
            key: 'mobilePhone',
            label: 'Telemóvel',
            icon: <Phone size={24} className="text-green-500" />,
            type: 'tel',
            placeholder: 'Ex: 912 345 678',
            dbColumn: 'mobile_phone'
        });
    }

    if (!user.emergencyContact || user.emergencyContact === '') {
        missingFields.push({
            key: 'emergencyContact',
            label: 'Contacto de Emergência',
            icon: <Heart size={24} className="text-red-500" />,
            type: 'tel',
            placeholder: 'Ex: 918 765 432 (familiar)',
            dbColumn: 'emergency_contact'
        });
    }

    const currentField = missingFields[currentStep];
    const totalSteps = missingFields.length;
    const progress = totalSteps > 0 ? ((currentStep) / totalSteps) * 100 : 100;

    const handleNext = () => {
        if (currentStep < totalSteps - 1) {
            setCurrentStep(prev => prev + 1);
        } else {
            handleSave();
        }
    };

    const handleSkip = () => {
        if (currentStep < totalSteps - 1) {
            setCurrentStep(prev => prev + 1);
        } else {
            handleSave();
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            // Build update object with only filled fields
            const updateData: Record<string, any> = {};
            missingFields.forEach(field => {
                const value = values[field.key];
                if (value && value.trim() !== '') {
                    // Prepend +351 for phone fields
                    if (field.type === 'tel') {
                        const digits = value.trim().replace(/\s/g, '');
                        updateData[field.dbColumn] = `+351${digits}`;
                    } else {
                        updateData[field.dbColumn] = value.trim();
                    }
                }
            });

            if (Object.keys(updateData).length > 0) {
                const { error } = await supabase
                    .from('users')
                    .update(updateData)
                    .eq('id', user.id);

                if (error) throw error;
            }

            setShowSuccess(true);
            addToast('success', 'Dados atualizados com sucesso!');
            setTimeout(() => {
                onComplete();
            }, 1500);
        } catch (err) {
            console.error('Error updating profile:', err);
            addToast('error', 'Erro ao guardar dados. Pode atualizar mais tarde no seu perfil.');
            onDismiss();
        } finally {
            setIsSaving(false);
        }
    };

    if (missingFields.length === 0) return null;

    // Success State
    if (showSuccess) {
        return (
            <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[70] flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center animate-fade-in-up shadow-2xl">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle2 size={32} className="text-green-600" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 mb-2">Obrigado!</h2>
                    <p className="text-gray-500 text-sm">Os seus dados foram atualizados com sucesso.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[70] flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden animate-fade-in-up">

                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white relative">
                    <button
                        onClick={onDismiss}
                        className="absolute top-4 right-4 p-1.5 bg-white/20 hover:bg-white/30 rounded-full transition-colors"
                    >
                        <X size={16} />
                    </button>
                    <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 bg-white/20 rounded-xl">
                            <UserCircle size={24} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold">Complete o seu Perfil</h2>
                            <p className="text-white/70 text-xs">Ajude-nos a manter os seus dados atualizados</p>
                        </div>
                    </div>
                    {/* Progress Bar */}
                    <div className="w-full bg-white/20 rounded-full h-1.5 mt-2">
                        <div
                            className="bg-white h-1.5 rounded-full transition-all duration-500"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                    <p className="text-white/60 text-[10px] mt-1.5 text-right">
                        {currentStep + 1} de {totalSteps}
                    </p>
                </div>

                {/* Content */}
                <div className="p-6">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="p-3 bg-gray-100 rounded-2xl shrink-0">
                            {currentField.icon}
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-900">{currentField.label}</h3>
                            <p className="text-xs text-gray-500 mt-0.5">
                                {currentField.key === 'birthDate' && 'Para sabermos quando é o dia de lhe dar os parabéns!'}
                                {currentField.key === 'mobilePhone' && 'Para comunicações importantes da empresa.'}
                                {currentField.key === 'emergencyContact' && 'Para contactar alguém próximo em caso de necessidade.'}
                            </p>
                        </div>
                    </div>

                    {currentField.type === 'tel' ? (
                        <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-2xl focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all">
                            <span className="pl-4 text-gray-500 font-bold text-lg select-none shrink-0">+351</span>
                            <input
                                type="tel"
                                value={values[currentField.key] || ''}
                                onChange={(e) => setValues(prev => ({ ...prev, [currentField.key]: e.target.value }))}
                                placeholder={currentField.placeholder}
                                className="flex-1 p-4 pl-1 bg-transparent text-gray-900 font-medium outline-none text-lg"
                                autoFocus
                            />
                        </div>
                    ) : (
                        <input
                            type={currentField.type}
                            value={values[currentField.key] || ''}
                            onChange={(e) => setValues(prev => ({ ...prev, [currentField.key]: e.target.value }))}
                            placeholder={currentField.placeholder}
                            className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl text-gray-900 font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-center text-lg"
                            autoFocus
                        />
                    )}
                </div>

                {/* Actions */}
                <div className="px-6 pb-6 flex gap-3">
                    <button
                        onClick={handleSkip}
                        className="flex-1 py-3 text-sm font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-all"
                    >
                        Saltar
                    </button>
                    <button
                        onClick={handleNext}
                        disabled={isSaving}
                        className="flex-[2] py-3 bg-gray-900 hover:bg-gray-800 text-white font-bold text-sm rounded-xl transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
                    >
                        {currentStep < totalSteps - 1 ? (
                            <>Seguinte <ChevronRight size={16} /></>
                        ) : (
                            isSaving ? 'A guardar...' : 'Concluir'
                        )}
                    </button>
                </div>

                {/* Dismiss hint */}
                <div className="px-6 pb-4 text-center">
                    <p className="text-[10px] text-gray-400">
                        Pode atualizar estes dados mais tarde em "Meu Perfil"
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ProfileCompletionModal;
