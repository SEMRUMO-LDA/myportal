import React, { useState } from 'react';
import { X, Shield, Eye, Database, Clock, Mail, Phone, FileText, CheckCircle } from 'lucide-react';

interface PrivacyPolicyModalProps {
  onAccept: () => void;
  onDecline?: () => void;
  forceShow?: boolean;
}

const PrivacyPolicyModal: React.FC<PrivacyPolicyModalProps> = ({
  onAccept,
  onDecline,
  forceShow = false
}) => {
  const [isVisible, setIsVisible] = useState(true); // Always show when rendered

  const handleAccept = () => {
    localStorage.setItem('privacy_policy_accepted', 'true');
    localStorage.setItem('privacy_policy_accepted_date', new Date().toISOString());
    localStorage.setItem('privacy_policy_version', '1.0');
    setIsVisible(false);
    onAccept();
  };

  const handleDecline = () => {
    if (onDecline) {
      onDecline();
    } else {
      // GDPR: User has right to decline
      alert('Sem aceitar a Política de Privacidade, não poderá utilizar o sistema.');
      // Optional: Logout user
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white rounded-xl sm:rounded-2xl max-w-4xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-hidden shadow-2xl animate-fade-in-up">

        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 sm:p-6 text-white">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
              <Shield size={24} className="flex-shrink-0 sm:w-7 sm:h-7" />
              <div className="min-w-0">
                <h2 className="text-lg sm:text-2xl font-bold truncate">Política de Privacidade</h2>
                <p className="text-blue-100 text-xs sm:text-sm mt-0.5 sm:mt-1 truncate">RGPD / GDPR - Versão 1.0</p>
              </div>
            </div>
            <button
              onClick={() => setIsVisible(false)}
              className="p-1.5 sm:p-2 hover:bg-white/20 rounded-lg transition-colors flex-shrink-0"
              title="Pode aceitar mais tarde"
            >
              <X size={18} className="sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto max-h-[55vh] sm:max-h-[60vh]">

          {/* Introduction */}
          <div className="mb-4 sm:mb-6">
            <p className="text-sm sm:text-base text-gray-700 leading-relaxed">
              A <strong>SEMRUMO</strong> está comprometida em proteger a privacidade e os dados pessoais dos seus colaboradores.
              Esta Política de Privacidade explica como recolhemos, usamos, armazenamos e protegemos as suas informações
              em conformidade com o Regulamento Geral de Proteção de Dados (RGPD/GDPR).
            </p>
          </div>

          {/* Section 1: Data Collection */}
          <div className="mb-4 sm:mb-6">
            <div className="flex items-center gap-2 mb-2 sm:mb-3">
              <Database className="text-blue-600 flex-shrink-0" size={18} />
              <h3 className="text-base sm:text-lg font-bold text-gray-900">1. Dados que Recolhemos</h3>
            </div>
            <div className="pl-6 sm:pl-7 space-y-2">
              <p className="text-sm sm:text-base text-gray-600">Recolhemos as seguintes categorias de dados pessoais:</p>
              <ul className="list-disc list-inside space-y-1 text-xs sm:text-sm text-gray-600">
                <li><strong>Identificação:</strong> Nome, código colaborador, fotografia</li>
                <li><strong>Contacto:</strong> Email, telefone, morada</li>
                <li><strong>Profissionais:</strong> Departamento, função, horário trabalho</li>
                <li><strong>Assiduidade:</strong> Registos de ponto, férias, ausências</li>
                <li><strong>Localização:</strong> Coordenadas GPS (apenas durante picagem, opcional)</li>
                <li><strong>Financeiros:</strong> IBAN, NIF (para processamento salarial)</li>
                <li><strong>Documentos:</strong> Contratos, certificados, formações</li>
              </ul>
            </div>
          </div>

          {/* Section 2: Purpose */}
          <div className="mb-4 sm:mb-6">
            <div className="flex items-center gap-2 mb-2 sm:mb-3">
              <Eye className="text-blue-600 flex-shrink-0" size={18} />
              <h3 className="text-base sm:text-lg font-bold text-gray-900">2. Finalidade do Tratamento</h3>
            </div>
            <div className="pl-6 sm:pl-7 space-y-2">
              <p className="text-sm sm:text-base text-gray-600">Os seus dados são utilizados exclusivamente para:</p>
              <ul className="list-disc list-inside space-y-1 text-xs sm:text-sm text-gray-600">
                <li>Gestão de recursos humanos e processamento salarial</li>
                <li>Controlo de assiduidade e gestão de férias</li>
                <li>Cumprimento de obrigações legais e fiscais</li>
                <li>Comunicações internas da empresa</li>
                <li>Segurança e controlo de acessos</li>
                <li>Análise estatística anonimizada para melhorias</li>
              </ul>
            </div>
          </div>

          {/* Section 3: Legal Basis */}
          <div className="mb-4 sm:mb-6">
            <div className="flex items-center gap-2 mb-2 sm:mb-3">
              <FileText className="text-blue-600 flex-shrink-0" size={18} />
              <h3 className="text-base sm:text-lg font-bold text-gray-900">3. Base Legal</h3>
            </div>
            <div className="pl-6 sm:pl-7 text-sm sm:text-base text-gray-600">
              <p>O tratamento dos seus dados baseia-se em:</p>
              <ul className="list-disc list-inside space-y-1 mt-2 text-xs sm:text-sm">
                <li><strong>Execução de contrato:</strong> Contrato de trabalho (Art. 6º, nº1, al. b) RGPD)</li>
                <li><strong>Obrigação legal:</strong> Código do Trabalho, Segurança Social (Art. 6º, nº1, al. c) RGPD)</li>
                <li><strong>Consentimento:</strong> Para dados biométricos e localização (Art. 6º, nº1, al. a) RGPD)</li>
              </ul>
            </div>
          </div>

          {/* Section 4: Data Retention */}
          <div className="mb-4 sm:mb-6">
            <div className="flex items-center gap-2 mb-2 sm:mb-3">
              <Clock className="text-blue-600 flex-shrink-0" size={18} />
              <h3 className="text-base sm:text-lg font-bold text-gray-900">4. Conservação de Dados</h3>
            </div>
            <div className="pl-6 sm:pl-7 text-sm sm:text-base text-gray-600">
              <ul className="list-disc list-inside space-y-1 text-xs sm:text-sm">
                <li><strong>Dados de assiduidade:</strong> 5 anos (obrigação legal)</li>
                <li><strong>Documentos fiscais:</strong> 10 anos (AT)</li>
                <li><strong>Dados de localização:</strong> 90 dias (depois anonimizados)</li>
                <li><strong>Logs de sistema:</strong> 1 ano</li>
                <li><strong>Após cessação contrato:</strong> Período legal aplicável + arquivo histórico</li>
              </ul>
            </div>
          </div>

          {/* Section 5: Your Rights */}
          <div className="mb-4 sm:mb-6">
            <div className="flex items-center gap-2 mb-2 sm:mb-3">
              <CheckCircle className="text-green-600 flex-shrink-0" size={18} />
              <h3 className="text-base sm:text-lg font-bold text-gray-900">5. Os Seus Direitos</h3>
            </div>
            <div className="pl-6 sm:pl-7 text-sm sm:text-base text-gray-600">
              <p className="mb-2">Ao abrigo do RGPD, tem direito a:</p>
              <ul className="list-disc list-inside space-y-1 text-xs sm:text-sm">
                <li><strong>Acesso:</strong> Solicitar cópia dos seus dados (Art. 15º)</li>
                <li><strong>Retificação:</strong> Corrigir dados incorretos (Art. 16º)</li>
                <li><strong>Apagamento:</strong> Solicitar eliminação quando aplicável (Art. 17º)</li>
                <li><strong>Portabilidade:</strong> Receber dados em formato estruturado (Art. 20º)</li>
                <li><strong>Oposição:</strong> Opor-se a certos tratamentos (Art. 21º)</li>
                <li><strong>Limitação:</strong> Restringir o tratamento (Art. 18º)</li>
                <li><strong>Reclamação:</strong> Apresentar queixa à CNPD</li>
              </ul>
            </div>
          </div>

          {/* Section 6: Security */}
          <div className="mb-4 sm:mb-6">
            <div className="flex items-center gap-2 mb-2 sm:mb-3">
              <Shield className="text-blue-600 flex-shrink-0" size={18} />
              <h3 className="text-base sm:text-lg font-bold text-gray-900">6. Segurança dos Dados</h3>
            </div>
            <div className="pl-6 sm:pl-7 text-sm sm:text-base text-gray-600">
              <p>Implementamos medidas técnicas e organizativas incluindo:</p>
              <ul className="list-disc list-inside space-y-1 mt-2 text-xs sm:text-sm">
                <li>Encriptação de dados em trânsito (HTTPS) e em repouso</li>
                <li>Controlo de acessos baseado em funções (RBAC)</li>
                <li>Backups automáticos diários</li>
                <li>Monitorização e deteção de intrusões</li>
                <li>Formação regular dos colaboradores</li>
                <li>Auditorias de segurança periódicas</li>
              </ul>
            </div>
          </div>

          {/* Section 7: Data Sharing */}
          <div className="mb-4 sm:mb-6">
            <div className="flex items-center gap-2 mb-2 sm:mb-3">
              <Database className="text-blue-600 flex-shrink-0" size={18} />
              <h3 className="text-base sm:text-lg font-bold text-gray-900">7. Partilha de Dados</h3>
            </div>
            <div className="pl-6 sm:pl-7 text-sm sm:text-base text-gray-600">
              <p>Os seus dados podem ser partilhados com:</p>
              <ul className="list-disc list-inside space-y-1 mt-2 text-xs sm:text-sm">
                <li><strong>Entidades legais:</strong> AT, Segurança Social (quando obrigatório)</li>
                <li><strong>Processadores:</strong> Contabilidade, software RH (com DPA assinado)</li>
                <li><strong>Nunca vendemos</strong> os seus dados a terceiros</li>
              </ul>
            </div>
          </div>

          {/* Section 8: Contact */}
          <div className="mb-4 sm:mb-6">
            <div className="flex items-center gap-2 mb-2 sm:mb-3">
              <Mail className="text-blue-600 flex-shrink-0" size={18} />
              <h3 className="text-base sm:text-lg font-bold text-gray-900">8. Contactos</h3>
            </div>
            <div className="pl-6 sm:pl-7 text-sm sm:text-base text-gray-600">
              <p className="mb-2">Para exercer os seus direitos ou esclarecer dúvidas:</p>
              <div className="bg-gray-50 p-3 sm:p-4 rounded-lg">
                <p className="font-semibold text-sm sm:text-base">Encarregado de Proteção de Dados (DPO)</p>
                <p className="flex items-center gap-2 mt-1 text-xs sm:text-sm">
                  <Mail size={14} className="flex-shrink-0" /> dpo@semrumo.pt
                </p>
                <p className="flex items-center gap-2 mt-1 text-xs sm:text-sm">
                  <Phone size={14} className="flex-shrink-0" /> +351 XXX XXX XXX
                </p>
                <p className="text-xs mt-2 text-gray-500">Resposta em 30 dias úteis</p>
              </div>
            </div>
          </div>

          {/* Updates */}
          <div className="mb-4 sm:mb-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4">
              <p className="text-xs sm:text-sm text-blue-800">
                <strong>Última atualização:</strong> 16 de março de 2026<br />
                <strong>Versão:</strong> 1.0<br />
                Esta política pode ser atualizada. Será notificado de alterações significativas.
              </p>
            </div>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="border-t p-3 sm:p-6 bg-gray-50">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="text-xs sm:text-sm text-gray-500 text-center sm:text-left">
              Ao aceitar, confirma ter lido e compreendido esta política.
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <button
                onClick={handleDecline}
                className="px-4 sm:px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 font-semibold transition-colors text-sm sm:text-base order-2 sm:order-1"
              >
                Recusar
              </button>
              <button
                onClick={handleAccept}
                className="px-4 sm:px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold transition-colors flex items-center justify-center gap-2 text-sm sm:text-base order-1 sm:order-2"
              >
                <CheckCircle size={16} className="sm:w-[18px] sm:h-[18px]" />
                <span className="whitespace-nowrap">Aceito a Política</span>
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default PrivacyPolicyModal;