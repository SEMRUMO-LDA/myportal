
import React from 'react';
import { User, Company } from '../types';
import Header from '../components/Header';
import { Printer, Building2, User as UserIcon, MapPin, Phone, Mail, CreditCard, Calendar, Clock, Briefcase, FileText, Download } from 'lucide-react';

interface CollaboratorFileProps {
    user: User;
}

const CollaboratorFile: React.FC<CollaboratorFileProps> = ({ user }) => {

    const handlePrint = () => {
        window.print();
    };

    const getCompanyColor = (company: Company | string) => {
        switch (company) {
            case Company.AORUBRO: return 'text-red-700 border-red-700';
            case Company.HAKURA: return 'text-emerald-700 border-emerald-700';
            default: return 'text-blue-700 border-blue-700';
        }
    };

    const SectionTitle = ({ icon: Icon, title }: any) => (
        <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-gray-500 border-b border-gray-200 pb-2 mb-4 mt-6">
            <Icon size={16} /> {title}
        </h3>
    );

    const DataField = ({ label, value, highlight = false }: any) => (
        <div className="mb-4">
            <span className="block text-[10px] font-bold text-gray-400 uppercase">{label}</span>
            <span className={`block text-sm ${highlight ? 'font-bold text-gray-900' : 'font-medium text-gray-700'}`}>
                {value || '—'}
            </span>
        </div>
    );

    return (
        <div className="p-4 md:p-8 w-full max-w-5xl mx-auto">
            <div className="print:hidden">
                <Header
                    title="Ficha de Colaborador"
                    subtitle="Documento oficial de identificação e vínculo contratual"
                    hideControls
                />

                <div className="flex justify-end mb-6">
                    <button
                        onClick={handlePrint}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 shadow-sm transition-all"
                    >
                        <Printer size={18} /> Imprimir Ficha
                    </button>
                </div>
            </div>

            {/* DOCUMENT CONTAINER (A4 Style) */}
            <div className="bg-white p-8 md:p-12 shadow-lg rounded-xl border border-gray-200 print:shadow-none print:border-0 print:p-0 max-w-[210mm] mx-auto min-h-[297mm] relative">

                {/* HEADER */}
                <div className="flex justify-between items-start border-b-2 border-gray-900 pb-6 mb-8">
                    <div className="flex items-center gap-4">
                        <div className={`p-3 border-2 rounded-lg ${getCompanyColor(user.company)}`}>
                            <Building2 size={32} className="currentColor" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 uppercase tracking-tight">Ficha Técnica</h1>
                            <p className="text-sm font-medium text-gray-500">Registo de Colaborador Interno</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-xs font-bold text-gray-400 uppercase">Processado em</div>
                        <div className="font-mono text-sm">{new Date().toLocaleDateString('pt-PT')}</div>
                        <div className="mt-2 text-xs font-bold text-gray-400 uppercase">ID Sistema</div>
                        <div className="font-mono text-lg font-bold">#{user.id.toString().padStart(6, '0')}</div>
                    </div>
                </div>

                {/* PHOTO & SUMMARY */}
                <div className="flex flex-col md:flex-row gap-8 mb-8 items-center md:items-start bg-gray-50 p-6 rounded-lg print:bg-transparent print:p-0">
                    <img
                        src={user.photoUrl}
                        alt={user.name}
                        className="w-32 h-32 rounded-lg object-cover border-4 border-white shadow-sm print:border-gray-200"
                    />
                    <div className="flex-1 w-full text-center md:text-left">
                        <h2 className="text-2xl font-bold text-gray-900">{user.name}</h2>
                        <p className="text-lg text-gray-600 mb-4">{user.role}</p>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-left border-t border-gray-200 pt-4">
                            <div>
                                <span className="text-xs text-gray-400 uppercase font-bold">Departamento</span>
                                <p className="font-semibold text-gray-800">{user.department}</p>
                            </div>
                            <div>
                                <span className="text-xs text-gray-400 uppercase font-bold">Empresa</span>
                                <p className="font-semibold text-gray-800">{user.company}</p>
                            </div>
                            <div>
                                <span className="text-xs text-gray-400 uppercase font-bold">Estado</span>
                                <p className="font-semibold text-gray-800">{user.status}</p>
                            </div>
                            <div>
                                <span className="text-xs text-gray-400 uppercase font-bold">Admissão</span>
                                <p className="font-semibold text-gray-800">{user.admissionDate}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-2">

                    {/* LEFT COLUMN */}
                    <div>
                        <SectionTitle icon={UserIcon} title="Dados Pessoais" />
                        <div className="grid grid-cols-2 gap-4">
                            <DataField label="Nome Completo" value={user.name} highlight />
                            <DataField label="Data de Nascimento" value={user.birthDate} />
                            <DataField label="NIF" value={user.nif} />
                            <DataField label="Cartão de Cidadão" value={user.cc} />
                        </div>

                        <SectionTitle icon={MapPin} title="Contactos & Morada" />
                        <DataField label="Morada Fiscal" value={user.address} />
                        <div className="grid grid-cols-2 gap-4">
                            <DataField label="Email Institucional" value={user.email} />
                            <DataField label="Telefone" value={user.phone} />
                            <div className="col-span-2">
                                <DataField label="Contacto Emergência" value={user.emergencyContact} highlight />
                            </div>
                        </div>
                    </div>

                    {/* RIGHT COLUMN */}
                    <div>
                        <SectionTitle icon={Briefcase} title="Dados Contratuais" />
                        <div className="grid grid-cols-2 gap-4">
                            <DataField label="Função / Cargo" value={user.role} />
                            <DataField label="Departamento" value={user.department} />
                            <DataField label="Número Mecanográfico" value={`EMP-${user.id}`} />
                            <DataField label="Antiguidade" value={(() => {
                                const admission = new Date(user.admissionDate + 'T00:00:00');
                                const now = new Date();
                                let years = now.getFullYear() - admission.getFullYear();
                                if (now.getMonth() < admission.getMonth() || (now.getMonth() === admission.getMonth() && now.getDate() < admission.getDate())) years--;
                                return `${years} Anos`;
                            })()} />
                        </div>

                        <SectionTitle icon={Clock} title="Horário & Assiduidade" />
                        <div className="grid grid-cols-2 gap-4">
                            <DataField label="Entrada Prevista" value={user.workStartTime} />
                            <DataField label="Saída Prevista" value={user.workEndTime} />
                            <div className="col-span-2">
                                <DataField label="Regime de Ponto" value={user.attendanceConfig?.restriction === 'NONE' ? 'Isento / Flexível' : user.attendanceConfig?.restriction} />
                            </div>
                        </div>

                        <SectionTitle icon={CreditCard} title="Dados Bancários" />
                        <DataField label="IBAN (Processamento Salarial)" value={user.iban} highlight />
                        <DataField label="Modo Pagamento" value="Transferência Bancária" />
                    </div>

                </div>

                {/* FOOTER */}
                <div className="mt-12 pt-6 border-t border-gray-200 flex flex-col md:flex-row justify-between items-center text-xs text-gray-400 print:mt-auto print:absolute print:bottom-0 print:left-8 print:right-8">
                    <p>Documento confidencial gerado pelo portal My Profile SEMRUMO.</p>
                    <p className="mt-2 md:mt-0">Página 1 de 1</p>
                </div>

            </div>
        </div>
    );
};

export default CollaboratorFile;
