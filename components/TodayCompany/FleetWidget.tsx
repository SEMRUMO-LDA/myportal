import React, { useState } from 'react';
import { Car, Calendar, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ExpandableCard from './ExpandableCard';

interface FleetWidgetProps {
  onStartTrip: () => void;
}

const FleetWidget: React.FC<FleetWidgetProps> = ({ onStartTrip }) => {
  const navigate = useNavigate();

  const collapsedContent = "Iniciar viagem ou reservar viatura";

  const expandedContent = (
    <div className="space-y-3">
      {/* Start Trip Button */}
      <button
        onClick={onStartTrip}
        className="w-full bg-blue-500/30 hover:bg-blue-500/40 backdrop-blur-sm text-white rounded-2xl p-4 flex items-center justify-between group transition-all border border-blue-400/30 hover:border-blue-400/50"
      >
        <div className="flex items-center gap-3">
          <div className="bg-blue-400/30 p-3 rounded-xl">
            <Car className="w-6 h-6 text-white" />
          </div>
          <div className="text-left">
            <h3 className="text-white text-base font-bold">Iniciar Viagem</h3>
            <p className="text-white/70 text-xs">Selecionar viatura da frota</p>
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-white/70 group-hover:translate-x-1 transition-transform" />
      </button>

      {/* Reserve Vehicle Button */}
      <button
        onClick={() => navigate('/portal/fleet-booking')}
        className="w-full bg-emerald-500/30 hover:bg-emerald-500/40 backdrop-blur-sm text-white rounded-2xl p-4 flex items-center justify-between group transition-all border border-emerald-400/30 hover:border-emerald-400/50"
      >
        <div className="flex items-center gap-3">
          <div className="bg-emerald-400/30 p-3 rounded-xl">
            <Calendar className="w-6 h-6 text-white" />
          </div>
          <div className="text-left">
            <h3 className="text-white text-base font-bold">Reservar Viatura</h3>
            <p className="text-white/70 text-xs">Visualizar mapa de ocupação e agendar</p>
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-white/70 group-hover:translate-x-1 transition-transform" />
      </button>

      <p className="text-white/60 text-xs text-center italic mt-2">
        Gerencie as viaturas da frota
      </p>
    </div>
  );

  return (
    <ExpandableCard
      title="Frota"
      icon={Car}
      iconColor="bg-blue-400/30"
      bgGradient="bg-gradient-to-br from-slate-600 via-slate-700 to-slate-800"
      collapsedContent={collapsedContent}
      expandedContent={expandedContent}
      defaultExpanded={false}
    />
  );
};

export default FleetWidget;
