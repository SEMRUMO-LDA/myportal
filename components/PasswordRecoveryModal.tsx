import React, { useState } from 'react';
import { X, CheckCircle, AlertCircle, ArrowLeft, Key, MessageCircle, User } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { wassengerService } from '../services/wassengerService';

interface PasswordRecoveryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Step = 'input' | 'success' | 'error';

const PasswordRecoveryModal: React.FC<PasswordRecoveryModalProps> = ({ isOpen, onClose }) => {
  const [step, setStep] = useState<Step>('input');
  const [employeeCode, setEmployeeCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!employeeCode || employeeCode.trim().length === 0) {
      setErrorMessage('Por favor, insira o seu ID de colaborador.');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      // Check if user exists with this employee code
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, name, phone, email, pin')
        .eq('id', employeeCode.trim())
        .maybeSingle();

      if (userError) throw userError;

      if (!userData) {
        setErrorMessage('Não existe nenhum colaborador com este ID.');
        setStep('error');
        setIsLoading(false);
        return;
      }

      // Check if user has a phone number
      if (!userData.phone || userData.phone.trim().length === 0) {
        setErrorMessage('Este colaborador não tem um número de telemóvel registado. Por favor, contacte os Recursos Humanos.');
        setStep('error');
        setIsLoading(false);
        return;
      }

      // Reset PIN to default value (1111) for recovery
      const defaultPin = '1111';

      // Update user's PIN to default value in database
      const { error: updateError } = await supabase
        .from('users')
        .update({
          pin: defaultPin,
          requires_new_pin: true // Force user to change PIN on next login
        })
        .eq('id', userData.id);

      if (updateError) {
        console.error('Error resetting PIN:', updateError);
        throw new Error('Erro ao resetar o PIN. Por favor, tente novamente.');
      }

      // Format WhatsApp message with new default PIN
      const message = `Olá ${userData.name}!\n\nOs seus dados de acesso ao SEMRUMO MyPortal são:\n\n🔑 *Password (PIN):* ${defaultPin}\n\nPara aceder, utilize o seu ID e o código PIN indicado. DEVERÁ TROCAR O PIN dentro da sua área reservada assim que possível.`;

      // Send WhatsApp message
      await wassengerService.sendMessage(userData.phone, message);

      setStep('success');
    } catch (error: any) {
      console.error('Password recovery error:', error);
      setErrorMessage(error.message || 'Erro ao enviar mensagem WhatsApp. Por favor, contacte os Recursos Humanos.');
      setStep('error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setStep('input');
    setEmployeeCode('');
    setErrorMessage('');
    setIsLoading(false);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-[2.5rem] max-w-md w-full shadow-2xl animate-slide-up overflow-hidden">
        {/* Header */}
        <div className="relative bg-gradient-to-br from-green-600 to-green-700 p-8 text-white">
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
          >
            <X size={20} />
          </button>

          <div className="flex items-center gap-4 mb-3">
            <div className="bg-white/20 p-4 rounded-2xl backdrop-blur-sm">
              <MessageCircle size={32} className="text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-black tracking-tight">Recuperar Password</h2>
              <p className="text-green-100 text-sm font-medium">Enviaremos os dados para o seu WhatsApp</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-8">
          {step === 'input' && (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-3">
                  ID do Colaborador
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <User size={20} className="text-gray-400" />
                  </div>
                  <input
                    type="text"
                    value={employeeCode}
                    onChange={(e) => setEmployeeCode(e.target.value)}
                    placeholder="Ex: EMP001"
                    className="w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all text-base font-medium uppercase"
                    autoFocus
                    required
                  />
                </div>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                <p className="text-sm text-gray-700">
                  <span className="font-bold">💬 Nota:</span> Receberá uma mensagem WhatsApp com os seus dados de acesso. Certifique-se que tem um número de telemóvel registado.
                </p>
              </div>

              <button
                type="submit"
                disabled={isLoading || !employeeCode}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 rounded-xl transition-all transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></div>
                    A enviar...
                  </>
                ) : (
                  <>
                    <MessageCircle size={20} />
                    Enviar via WhatsApp
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleClose}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 rounded-xl transition-all"
              >
                Cancelar
              </button>
            </form>
          )}

          {step === 'success' && (
            <div className="text-center space-y-6">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle size={48} className="text-green-600" />
              </div>

              <div>
                <h3 className="text-2xl font-black text-gray-900 mb-2">Mensagem Enviada!</h3>
                <p className="text-gray-600 leading-relaxed">
                  Enviámos os seus dados de acesso via <span className="font-bold text-green-600">WhatsApp</span>.
                </p>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                <p className="text-sm text-gray-700">
                  <span className="font-bold">✅ Próximos passos:</span>
                  <br />
                  1. Verifique as suas mensagens WhatsApp
                  <br />
                  2. Utilize o ID e código PIN recebidos
                  <br />
                  3. Aceda ao portal com os seus dados
                </p>
              </div>

              <button
                onClick={handleClose}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 rounded-xl transition-all transform hover:scale-105 active:scale-95 shadow-lg"
              >
                Fechar
              </button>

              <button
                onClick={handleReset}
                className="w-full text-gray-500 hover:text-gray-700 font-semibold py-2 flex items-center justify-center gap-2 transition-colors"
              >
                <ArrowLeft size={16} />
                Tentar com outro ID
              </button>
            </div>
          )}

          {step === 'error' && (
            <div className="text-center space-y-6">
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                <AlertCircle size={48} className="text-red-600" />
              </div>

              <div>
                <h3 className="text-2xl font-black text-gray-900 mb-2">Erro</h3>
                <p className="text-gray-600 leading-relaxed">
                  {errorMessage}
                </p>
              </div>

              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <p className="text-sm text-gray-700">
                  <span className="font-bold">💡 Sugestão:</span> Verifique se o ID do colaborador está correto ou contacte o departamento de RH para assistência.
                </p>
              </div>

              <button
                onClick={handleReset}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 rounded-xl transition-all transform hover:scale-105 active:scale-95 shadow-lg flex items-center justify-center gap-2"
              >
                <ArrowLeft size={20} />
                Tentar Novamente
              </button>

              <button
                onClick={handleClose}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 rounded-xl transition-all"
              >
                Fechar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PasswordRecoveryModal;
