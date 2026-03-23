/**
 * LoginHeader Component
 * Header with logo and status indicators
 */

import React from 'react';
import { Clock, Wifi, WifiOff } from 'lucide-react';
import { getAppVersion } from '../../services/versionService';

interface LoginHeaderProps {
  isOnline?: boolean;
  currentTime: Date;
}

export const LoginHeader: React.FC<LoginHeaderProps> = ({
  isOnline = true,
  currentTime
}) => {
  return (
    <div className="flex items-center justify-between px-6 py-4 absolute top-0 left-0 right-0 z-20">
      {/* Logo */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center backdrop-blur-sm">
          <Clock className="text-white/80" size={20} />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-white">SEMRUMO</h1>
          <p className="text-white/60 text-xs">MY PORTAL</p>
        </div>
      </div>

      {/* Status & Time */}
      <div className="flex items-center gap-4">
        <div className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-full ${
          isOnline
            ? 'text-emerald-400 bg-emerald-400/20'
            : 'text-orange-400 bg-orange-400/20'
        }`}>
          {isOnline ? <Wifi size={14} /> : <WifiOff size={14} />}
          <span>{isOnline ? 'ONLINE' : 'OFFLINE'}</span>
          <span className="text-white/40">{getAppVersion()}</span>
        </div>

        {/* Time */}
        <div className="text-white text-2xl font-light">
          {currentTime.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </div>
  );
};