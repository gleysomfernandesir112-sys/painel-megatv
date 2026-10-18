import React, { useState } from 'react';
import { useSigmaStore } from '../../store/SigmaStore';
import { Trash2, RotateCcw, Search, CheckCircle2 } from 'lucide-react';

export const CustomersDeleted: React.FC = () => {
  const { deletedCustomers, restoreCustomer } = useSigmaStore();
  const [search, setSearch] = useState('');
  const [restored, setRestored] = useState<string | null>(null);

  const filtered = deletedCustomers.filter(item =>
    item.username.toLowerCase().includes(search.toLowerCase())
  );

  const handleRestore = (id: string, username: string) => {
    restoreCustomer(id);
    setRestored(username);
    setTimeout(() => setRestored(null), 3000);
  };

  return (
    <div className="space-y-6 select-none">
      <div>
        <h1 className="text-xl font-bold text-white tracking-tight">Lixeira de Clientes</h1>
        <p className="text-xs text-[#92929F] mt-1">
          Registro de clientes e testes excluídos recentemente.
        </p>
      </div>

      {restored && (
        <div className="p-4 bg-[#50CD89]/10 border border-[#50CD89]/30 rounded-xl text-xs text-[#50CD89] flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>Cliente <strong>{restored}</strong> restaurado com sucesso!</span>
        </div>
      )}

      <div className="bg-[#14151C] border border-[#1E202B] rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 text-[#5E6278] absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Buscar cliente excluído..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#1A1C24] border border-[#232530] rounded-lg pl-8 pr-4 py-2 text-xs text-white placeholder-[#5E6278] focus:outline-none focus:border-[#009EF7]"
            />
          </div>
          <span className="text-xs text-[#92929F]">{filtered.length} registro(s)</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#1E202B] text-[#92929F] text-[11px] uppercase tracking-wider">
                <th className="py-2.5 px-3">Usuário</th>
                <th className="py-2.5 px-3">Servidor</th>
                <th className="py-2.5 px-3">Data de Exclusão</th>
                <th className="py-2.5 px-3">Motivo</th>
                <th className="py-2.5 px-3 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E202B]/60">
              {filtered.map((item) => (
                <tr key={item.id} className="hover:bg-[#1A1C24]/50 transition-colors">
                  <td className="py-3 px-3 font-semibold text-white font-mono">{item.username}</td>
                  <td className="py-3 px-3 text-[#92929F]">{item.server}</td>
                  <td className="py-3 px-3 text-[#92929F]">{item.deleted_at}</td>
                  <td className="py-3 px-3">
                    <span className="px-2 py-0.5 rounded text-[10px] bg-[#F1416C]/10 text-[#F1416C] border border-[#F1416C]/20">
                      {item.reason}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <button
                      onClick={() => handleRestore(item.id, item.username)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#009EF7]/15 text-[#009EF7] hover:bg-[#009EF7] hover:text-white border border-[#009EF7]/30 text-[11px] font-semibold transition-all"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Limpar da Lixeira</span>
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-10 text-xs text-[#5E6278]">
                    Nenhum cliente na lixeira.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
