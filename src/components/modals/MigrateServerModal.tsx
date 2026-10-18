import React, { useState } from 'react';
import { Customer } from '../../types';
import { APP_CONFIG } from '../../config/appConfig';
import { Server, X, ArrowRight } from 'lucide-react';

interface MigrateServerModalProps {
  customer: Customer;
  isOpen?: boolean;
  onClose: () => void;
}

export const MigrateServerModal: React.FC<MigrateServerModalProps> = ({
  customer,
  onClose
}) => {
  const [targetServer, setTargetServer] = useState(APP_CONFIG.defaultServerName);
  const servers = [
    { id: 'srv_1', name: `${APP_CONFIG.defaultServerName} (Principal)` },
    { id: 'srv_2', name: `${APP_CONFIG.defaultServerName} - CDN Ultra Low Latency` }
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    customer.server_name = targetServer;
    customer.server = targetServer;
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-fade-in select-none">
      <div className="bg-[#15171E] border border-[#262833] rounded-xl w-full max-w-md shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#262833] shrink-0">
          <div className="flex items-center gap-2 text-white font-bold text-base">
            <Server className="w-5 h-5 text-[#009EF7]" />
            <span>Migrar Servidor do Cliente</span>
          </div>
          <button onClick={onClose} className="text-[#5E6278] hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          <div className="bg-[#1A1C24] p-3 rounded-lg border border-[#262833]/60 text-xs text-[#92929F]">
            Cliente: <span className="text-white font-semibold font-mono">{customer.username}</span>
            <div className="mt-1 flex items-center gap-2 text-[11px] text-[#009EF7]">
              <span>Servidor Origem: {customer.server_name || customer.server || APP_CONFIG.defaultServerName}</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#92929F] mb-1.5">
              Selecione o Servidor de Destino
            </label>
            <select
              value={targetServer}
              onChange={(e) => setTargetServer(e.target.value)}
              className="w-full bg-[#1A1C24] border border-[#232530] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#009EF7]"
            >
              {servers.map((s) => (
                <option key={s.id} value={s.name}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div className="p-3 bg-[#009EF7]/10 border border-[#009EF7]/20 rounded-lg text-xs text-[#009EF7] flex items-start gap-2">
            <ArrowRight className="w-4 h-4 shrink-0 mt-0.5" />
            <span>A migração atualizará as rotas da CDN sem alterar o login e a senha do cliente.</span>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#262833]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-semibold text-[#92929F] hover:bg-[#1A1C24]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg text-xs font-semibold bg-[#009EF7] text-white hover:bg-[#0095E8]"
            >
              Executar Migração
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
