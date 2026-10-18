import React, { useState } from 'react';
import { Laptop, Smartphone, Globe, Shield, LogOut, CheckCircle2 } from 'lucide-react';

export const ActiveSessions: React.FC = () => {
  const [revoked, setRevoked] = useState(false);

  const browserInfo = typeof window !== 'undefined' ? window.navigator.userAgent : 'Windows 10 / Chrome';
  const screenResolution = typeof window !== 'undefined' ? `${window.screen.width}x${window.screen.height}` : '1920x1080';

  const handleRevokeAll = () => {
    setRevoked(true);
    setTimeout(() => setRevoked(false), 3000);
  };

  return (
    <div className="space-y-6 select-none">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Sessões Ativas</h1>
          <p className="text-xs text-[#92929F] mt-1">
            Dispositivos e navegadores atualmente autenticados na sua conta.
          </p>
        </div>

        <button
          onClick={handleRevokeAll}
          className="flex items-center gap-2 bg-[#F1416C]/15 text-[#F1416C] border border-[#F1416C]/30 hover:bg-[#F1416C] hover:text-white px-4 py-2 rounded-lg text-xs font-semibold transition-all"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Encerrar Outras Sessões</span>
        </button>
      </div>

      {revoked && (
        <div className="p-4 bg-[#50CD89]/10 border border-[#50CD89]/30 rounded-xl text-xs text-[#50CD89] flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>Outras sessões foram revogadas com sucesso!</span>
        </div>
      )}

      <div className="bg-[#14151C] border border-[#1E202B] rounded-xl p-5 space-y-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between p-4 bg-[#1A1C24] border border-[#232530] rounded-xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#009EF7]/10 flex items-center justify-center text-[#009EF7]">
                <Laptop className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white">Navegador Atual ({screenResolution})</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#50CD89]/15 text-[#50CD89] border border-[#50CD89]/30">
                    Sessão Ativa (Esta Conexão)
                  </span>
                </div>
                <div className="text-[11px] text-[#92929F] mt-0.5 max-w-xl truncate">
                  {browserInfo}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
