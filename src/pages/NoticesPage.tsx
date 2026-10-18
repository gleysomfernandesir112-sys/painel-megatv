import React from 'react';
import { useSigmaStore } from '../store/SigmaStore';
import { Bell, Calendar, User } from 'lucide-react';

export const NoticesPage: React.FC = () => {
  const { notices } = useSigmaStore();

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-xl font-bold text-white">Avisos & Comunicados</h1>
        <p className="text-xs text-[#92929F] mt-0.5">Histórico de notícias, manutenções e novos recursos da administração.</p>
      </div>

      <div className="space-y-4">
        {notices.map(n => (
          <div key={n.id} className="bg-[#1E1E2D] border border-[#2B2B40] rounded-xl p-5 space-y-3">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-lg bg-blue-500/10 text-[#009EF7]">
                  <Bell className="w-4 h-4" />
                </span>
                <h3 className="font-bold text-white text-base">{n.title}</h3>
              </div>
              <span className="text-xs text-[#6D6D80] shrink-0 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" /> {n.date}
              </span>
            </div>
            <p className="text-xs text-[#92929F] leading-relaxed pl-10">{n.content}</p>
            <div className="pl-10 text-[10px] text-[#6D6D80]">Publicado por: {n.author}</div>
          </div>
        ))}
      </div>
    </div>
  );
};
