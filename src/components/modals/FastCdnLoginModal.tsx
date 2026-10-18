import React from 'react';
import { useSigmaStore } from '../../store/SigmaStore';
import { APP_CONFIG } from '../../config/appConfig';
import { CheckCircle2, AlertCircle, RefreshCw, X, Zap, Server, Activity, Database, ShieldCheck, Users } from 'lucide-react';

interface FastCdnLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FastCdnLoginModal: React.FC<FastCdnLoginModalProps> = ({ isOpen, onClose }) => {
  const { profile, isLiveConnected, isLoadingLive, refreshLiveData, customers, resellers } = useSigmaStore();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-fade-in">
      <div className="bg-[#15171E] border border-[#262833] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-scale-up">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#262833]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#50CD89]/15 flex items-center justify-center text-[#50CD89]">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-white font-bold text-sm">Status da Conexão com o Servidor</h3>
              <p className="text-[11px] text-[#92929F]">Saúde da API, latência e dados operacionais.</p>
            </div>
          </div>
          <button onClick={onClose} className="text-[#5E6278] hover:text-white p-1 rounded-lg hover:bg-[#1A1C24] transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Status Indicator Banner */}
          <div className={`p-4 rounded-xl border flex items-center justify-between text-xs ${
            isLiveConnected
              ? 'bg-[#50CD89]/10 border-[#50CD89]/30 text-[#50CD89]'
              : 'bg-[#FF9900]/10 border-[#FF9900]/30 text-[#FF9900]'
          }`}>
            <div className="flex items-center gap-2.5">
              <span className={`w-3 h-3 rounded-full ${isLiveConnected ? 'bg-[#50CD89] animate-pulse' : 'bg-[#FF9900]'}`}></span>
              <div>
                <div className="font-bold text-sm">
                  {isLiveConnected ? 'Servidor Central Conectado & Operacional' : 'Conexão Offline'}
                </div>
                <div className="text-[11px] opacity-80 mt-0.5">
                  {isLiveConnected ? 'Sincronização em tempo real ativa' : 'Verifique a conexão de rede'}
                </div>
              </div>
            </div>
            <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-black/30">
              v{APP_CONFIG.appVersion}
            </span>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="bg-[#1A1C24] border border-[#232530] rounded-xl p-3">
              <div className="text-[#92929F] text-[11px]">Usuário na Sessão</div>
              <div className="text-white font-bold font-mono mt-1 text-sm truncate">{profile.username}</div>
              <div className="text-[11px] text-[#009EF7] font-semibold mt-1 flex items-center gap-1">
                {profile.role === 'master' ? (
                  <>
                    <ShieldCheck className="w-3.5 h-3.5 text-[#009EF7]" />
                    <span>Administrador Master</span>
                  </>
                ) : (
                  <>
                    <Users className="w-3.5 h-3.5 text-[#009EF7]" />
                    <span>Sub-Revenda</span>
                  </>
                )}
              </div>
            </div>

            <div className="bg-[#1A1C24] border border-[#232530] rounded-xl p-3">
              <div className="text-[#92929F] text-[11px]">Saldo em Créditos</div>
              <div className="text-[#50CD89] font-bold font-mono mt-1 text-sm">{profile.credits} Créditos</div>
              <div className="text-[10px] text-[#92929F] mt-0.5">Disponíveis para uso</div>
            </div>

            <div className="bg-[#1A1C24] border border-[#232530] rounded-xl p-3">
              <div className="text-[#92929F] text-[11px]">Base Total de Clientes</div>
              <div className="text-white font-bold font-mono mt-1 text-sm">{customers.length} Clientes</div>
              <div className="text-[10px] text-[#92929F] mt-0.5">
                {customers.filter(c => c.status === 'ACTIVE').length} ativos no momento
              </div>
            </div>

            <div className="bg-[#1A1C24] border border-[#232530] rounded-xl p-3">
              <div className="text-[#92929F] text-[11px]">Sub-Revendas</div>
              <div className="text-white font-bold font-mono mt-1 text-sm">{resellers.length} Revendas</div>
              <div className="text-[10px] text-[#92929F] mt-0.5">Parceiros cadastrados</div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between gap-3 pt-3 border-t border-[#262833]">
            <button
              type="button"
              onClick={() => refreshLiveData()}
              disabled={isLoadingLive}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#1A1C24] hover:bg-[#232530] text-white border border-[#232530] flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingLive ? 'animate-spin text-[#009EF7]' : ''}`} />
              <span>{isLoadingLive ? 'Sincronizando...' : 'Sincronizar Agora'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-[#009EF7] hover:bg-[#0095E8] text-white transition-all cursor-pointer"
            >
              Concluído
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
