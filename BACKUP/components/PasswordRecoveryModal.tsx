import React, { useState } from 'react';
import { X, CheckCircle, AlertCircle, ArrowLeft, Key, MessageCircle, User } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { supabaseAdmin } from '../services/supabaseAdminClient';
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

  const [whatsappWarning, setWhatsappWarning] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!employeeCode || employeeCode.trim().length === 0) {
      setErrorMessage('Por favor, insira o seu ID de colaborador.');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');
    setWhatsappWarning('');

    try {
      // 1. FETCH USER — include both phone fields
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, name, phone, mobile_phone, email, auth_id')
        .eq('id', employeeCode.trim())
        .maybeSingle();

      if (userError) {
        console.error('[PinRecovery] User fetch error:', userError);
        throw new Error('Erro ao procurar colaborador. Tente novamente.');
      }

      if (!userData) {
        setErrorMessage('Não existe nenhum colaborador com este ID.');
        setStep('error');
        setIsLoading(false);
        return;
      }

      // 2. RESOLVE PHONE NUMBER — try phone first, then mobile_phone
      const userPhone = userData.phone?.trim() || (userData as any).mobile_phone?.trim() || '';
      
      if (!userPhone) {
        setErrorMessage('Este colaborador não tem um número de telemóvel registado. Contacte os Recursos Humanos.');
        setStep('error');
        setIsLoading(false);
        return;
      }

      // 3. CHECK AUTH — user must be migrated to Supabase Auth
      if (!userData.auth_id) {
        setErrorMessage('Utilizador não migrado para o sistema de autenticação. Contacte os RH.');
        setStep('error');
        setIsLoading(false);
        return;
      }

      // 4. GENERATE NEW PIN
      const newPin = Math.floor(100000 + Math.random() * 900000).toString();
      console.log('[PinRecovery] 🔐 New PIN generated for user', userData.id);

      // 5. UPDATE SUPABASE AUTH PASSWORD
      const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
        userData.auth_id,
        { password: newPin }
      );

      if (authError) {
        console.error('[PinRecovery] ❌ Auth update failed:', authError);
        throw new Error('Erro ao atualizar PIN no sistema de autenticação.');
      }
      console.log('[PinRecovery] ✅ Supabase Auth password updated');

      // 6. UPDATE PIN COLUMN + requires_new_pin FLAG IN USERS TABLE
      // CRITICAL: Without updating the pin column, collaborator/kiosk login won't work
      const { error: updateError } = await supabase
        .from('users')
        .update({ 
          pin: newPin,
          requires_new_pin: true 
        })
        .eq('id', userData.id);

      if (updateError) {
        console.error('[PinRecovery] ❌ Users table update failed:', updateError);
        throw new Error('Erro ao atualizar dados do utilizador.');
      }
      console.log('[PinRecovery] ✅ Users table updated (pin + requires_new_pin)');

      // 7. SEND WHATSAPP MESSAGE (non-blocking — PIN reset succeeds even if WhatsApp fails)
      const message = `🔐 *SEMRUMO MyPortal - Recuperação de PIN*\n\nOlá ${userData.name}!\n\nO seu PIN foi resetado com sucesso.\n\n🆔 *ID Colaborador:* ${userData.id}\n🔑 *Novo PIN:* ${newPin}\n\n⚠️ *IMPORTANTE:* Este PIN é temporário. Será obrigatório criar um novo PIN personalizado no próximo login.\n\n🔒 Por motivos de segurança, não partilhe este PIN com ninguém.`;

      try {
        await wassengerService.loadConfig();
        if (wassengerService.isConfigured()) {
          await wassengerService.sendMessage(userPhone, message);
          console.log('[PinRecovery] ✅ WhatsApp message sent to', userPhone);
        } else {
          console.warn('[PinRecovery] ⚠️ Wassenger not configured, skipping WhatsApp');
          setWhatsappWarning('PIN resetado com sucesso, mas o WhatsApp não está configurado. Comunique o novo PIN manualmente.');
        }
      } catch (whatsappError: any) {
        console.error('[PinRecovery] ⚠️ WhatsApp send failed (non-blocking):', whatsappError);
        setWhatsappWarning('PIN resetado com sucesso, mas houve um erro ao enviar o WhatsApp. Comunique o novo PIN manualmente.');
      }

      setStep('success');
    } catch (error: any) {
      console.error('[PinRecovery] ❌ Recovery failed:', error);
      setErrorMessage(error.message || 'Erro na recuperação de PIN. Contacte os Recursos Humanos.');
      setStep('error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setStep('input');
    setEmployeeCode('');
    setErrorMessage('');
    setWhatsappWarning('');
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
                <h3 className="text-2xl font-black text-gray-900 mb-2">
                  {whatsappWarning ? 'PIN Resetado!' : 'Mensagem Enviada!'}
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {whatsappWarning 
                    ? 'O PIN foi resetado com sucesso.' 
                    : <>Enviámos os seus dados de acesso via <span className="font-bold text-green-600">WhatsApp</span>.</>
                  }
                </p>
              </div>

              {whatsappWarning && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <p className="text-sm text-amber-800 font-medium">
                    ⚠️ {whatsappWarning}
                  </p>
                </div>
              )}

              <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                <p className="text-sm text-gray-700">
                  <span className="font-bold">✅ Próximos passos:</span>
                  <br />
                  {whatsappWarning 
                    ? '1. Comunique o novo PIN ao colaborador pessoalmente' 
                    : '1. Verifique as suas mensagens WhatsApp'
                  }
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
