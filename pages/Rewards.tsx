import React from 'react';
import Header from '../components/Header';
import { User } from '../types';
import { CreditCard, Gift, Percent } from 'lucide-react';
import CollaboratorCard from '../components/CollaboratorCard';

interface RewardsProps {
    user: User;
}

const Rewards: React.FC<RewardsProps> = ({ user }) => {

    const benefits = [
        {
            company: 'HAKURA',
            discount: '10%',
            description: 'Desconto em consultas e serviços de saúde.',
            color: 'from-emerald-600 to-emerald-800'
        },
        {
            company: 'UMBRAL',
            discount: '10%',
            description: 'Desconto em qualquer reserva de estadia.',
            color: 'from-purple-600 to-purple-800'
        },
        {
            company: 'PORTUGALFÉRIAS',
            discount: '5%',
            description: 'Desconto em viagens.',
            color: 'from-blue-600 to-blue-800'
        }
    ];

    return (
        <div className="p-4 md:p-8 w-full max-w-6xl mx-auto animate-fade-in pb-20">
            <Header
                title="Clube de Benefícios"
                subtitle="O seu cartão de colaborador e vantagens exclusivas"
                hideControls={true}
            />



            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-6">

                {/* Left Column: Digital Card */}
                <div className="space-y-6">
                    <h3 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                        <CreditCard className="text-brand-600" />
                        O Seu Cartão Digital
                    </h3>

                    <CollaboratorCard user={user} />

                    <p className="text-center text-sm text-gray-500 bg-blue-50 p-4 rounded-lg border border-blue-100">
                        Apresente este cartão digital nos estabelecimentos parceiros para usufruir dos seus descontos.
                    </p>
                </div>

                {/* Right Column: Benefits List */}
                <div className="space-y-6">
                    <h3 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                        <Gift className="text-brand-600" />
                        Parceiros & Descontos
                    </h3>

                    <div className="grid gap-4">
                        {benefits.map((benefit, index) => (
                            <div key={index} className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center gap-5 hover:shadow-md transition-shadow group">
                                <div className={`w-16 h-16 rounded-lg bg-gradient-to-br ${benefit.color} flex items-center justify-center shadow-lg text-white font-bold text-xl`}>
                                    {benefit.discount}
                                </div>
                                <div className="flex-1">
                                    <h4 className="font-bold text-gray-900 group-hover:text-brand-600 transition-colors">{benefit.company}</h4>
                                    <p className="text-sm text-gray-500 mt-1">{benefit.description}</p>
                                </div>
                                <div className="text-gray-300">
                                    <Percent size={20} />
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="bg-gradient-to-r from-brand-600 to-brand-800 rounded-xl p-6 text-white shadow-lg relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10"></div>

                        <h4 className="font-bold text-lg mb-2 z-10 relative">Sugerir Nova Parceria</h4>
                        <p className="text-brand-100 text-sm mb-4 z-10 relative max-w-sm">
                            Conhece um local que seria um ótimo parceiro? Fale com os RH ou envie uma mensagem interna.
                        </p>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default Rewards;
