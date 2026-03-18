import React, { useState, useEffect } from 'react';
import { UserPlus, Phone, Mail, User } from 'lucide-react';
import { supabase } from '../../services/supabaseClient';
import ExpandableCard from './ExpandableCard';

interface OnboardingResponsible {
  name: string;
  role: string;
  phone: string;
  email: string;
  photoUrl?: string;
}

const NewColleaguesWidget: React.FC = () => {
  const [responsible, setResponsible] = useState<OnboardingResponsible | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOnboardingResponsible();
  }, []);

  const fetchOnboardingResponsible = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('name, role, mobile_phone, email, photo_url, department')
        .or('role.eq.HR,role.eq.ADMIN,department.ilike.%recursos humanos%')
        .limit(1)
        .single();

      if (error) {
        setResponsible({
          name: 'RH - Leonardo',
          role: 'Recursos Humanos',
          phone: '+351 939 587 238',
          email: 'rh@semrumo.pt'
        });
      } else if (data) {
        setResponsible({
          name: data.name,
          role: data.department || data.role || 'Recursos Humanos',
          phone: data.mobile_phone || '+351 939 587 238',
          email: data.email,
          photoUrl: data.photo_url || undefined
        });
      }
    } catch (error) {
      setResponsible({
        name: 'RH - Leonardo',
        role: 'Recursos Humanos',
        phone: '+351 939 587 238',
        email: 'rh@semrumo.pt'
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-3xl p-5 h-20 animate-pulse">
        <div className="h-full flex items-center justify-center">
          <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  if (!responsible) {
    return null;
  }

  const collapsedContent = responsible.name;

  const expandedContent = (
    <div className="space-y-3">
      {/* Responsible Info */}
      <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 border border-white/30">
        <div className="flex items-center gap-3 mb-4">
          {responsible.photoUrl ? (
            <img
              src={responsible.photoUrl}
              alt={responsible.name}
              className="w-14 h-14 rounded-full border-2 border-white/50 object-cover shadow-lg"
            />
          ) : (
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-emerald-400 to-green-600 flex items-center justify-center shadow-lg">
              <User size={28} className="text-white" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-white text-lg font-black truncate">{responsible.name}</p>
            <p className="text-white/80 text-xs font-semibold truncate uppercase tracking-wide">
              {responsible.role}
            </p>
          </div>
        </div>

        {/* Contact Info */}
        <div className="space-y-2.5">
          {/* Phone */}
          <a
            href={`tel:${responsible.phone}`}
            className="flex items-center gap-3 text-white/90 hover:text-white transition-colors group/link bg-green-400/20 hover:bg-green-400/30 rounded-xl p-2.5"
          >
            <div className="bg-green-400/30 p-2 rounded-lg group-hover/link:bg-green-400/50 transition-colors">
              <Phone size={16} className="text-white" />
            </div>
            <span className="text-sm font-bold">{responsible.phone}</span>
          </a>

          {/* Email */}
          <a
            href={`mailto:${responsible.email}`}
            className="flex items-center gap-3 text-white/90 hover:text-white transition-colors group/link bg-green-400/20 hover:bg-green-400/30 rounded-xl p-2.5"
          >
            <div className="bg-green-400/30 p-2 rounded-lg group-hover/link:bg-green-400/50 transition-colors">
              <Mail size={16} className="text-white" />
            </div>
            <span className="text-sm font-bold truncate">{responsible.email}</span>
          </a>
        </div>
      </div>

      <p className="text-white/60 text-xs text-center italic">
        Contacte para qualquer dúvida ou assistência
      </p>
    </div>
  );

  return (
    <ExpandableCard
      title="Reporta a"
      icon={UserPlus}
      iconColor="bg-green-400/30"
      bgGradient="bg-gradient-to-br from-green-500 via-green-600 to-green-700"
      collapsedContent={collapsedContent}
      expandedContent={expandedContent}
    />
  );
};

export default NewColleaguesWidget;
