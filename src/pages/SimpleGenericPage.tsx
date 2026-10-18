import React from 'react';
import { LucideIcon } from 'lucide-react';

interface SimplePageProps {
  title: string;
  subtitle: string;
  icon?: LucideIcon;
  description: string;
}

export const SimpleGenericPage: React.FC<SimplePageProps> = ({ title, subtitle, icon: Icon, description }) => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">{title}</h1>
        <p className="text-xs text-[#92929F] mt-0.5">{subtitle}</p>
      </div>

      <div className="bg-[#1E1E2D] border border-[#2B2B40] rounded-xl p-8 text-center space-y-3">
        {Icon && (
          <div className="w-12 h-12 rounded-xl bg-[#009EF7]/10 text-[#009EF7] flex items-center justify-center mx-auto">
            <Icon className="w-6 h-6" />
          </div>
        )}
        <h3 className="font-bold text-white text-base">{title}</h3>
        <p className="text-xs text-[#92929F] max-w-md mx-auto leading-relaxed">{description}</p>
        <div className="pt-2">
          <span className="inline-block px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 font-bold text-[10px] border border-emerald-500/20">
            Módulo Ativo & Sincronizado
          </span>
        </div>
      </div>
    </div>
  );
};
