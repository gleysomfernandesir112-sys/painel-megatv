import React from 'react';
import { useSigmaStore } from '../../store/SigmaStore';
import { FileText, ArrowDownRight, ArrowUpRight, Search, Calendar, Coins } from 'lucide-react';

export const CreditTransactions: React.FC = () => {
  const { transactions, profile } = useSigmaStore();

  return (
    <div className="space-y-6 select-none">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Extrato de Créditos</h1>
          <p className="text-xs text-[#92929F] mt-1">
            Histórico completo de consumo, renovações e transferências da sua conta.
          </p>
        </div>

        <div className="bg-[#14151C] border border-[#1E202B] rounded-xl px-4 py-2 flex items-center gap-3">
          <Coins className="w-5 h-5 text-[#50CD89]" />
          <div>
            <div className="text-[10px] uppercase text-[#92929F] font-bold">Saldo Disponível</div>
            <div className="text-base font-bold text-white">{profile.credits} Créditos</div>
          </div>
        </div>
      </div>

      <div className="bg-[#14151C] border border-[#1E202B] rounded-xl p-5 space-y-4">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#1E202B] text-[#92929F] text-[11px] uppercase tracking-wider">
                <th className="py-2.5 px-3">Data / Hora</th>
                <th className="py-2.5 px-3">Tipo</th>
                <th className="py-2.5 px-3">Créditos</th>
                <th className="py-2.5 px-3">Saldo Anterior</th>
                <th className="py-2.5 px-3">Saldo Final</th>
                <th className="py-2.5 px-3">Descrição</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E202B]/60">
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-xs text-[#5E6278]">
                    Nenhuma movimentação de créditos registrada ainda. Ao criar ou renovar clientes, as operações serão listadas aqui.
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-[#1A1C24]/50 transition-colors">
                    <td className="py-3 px-3 text-[#92929F] font-mono">{tx.date}</td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                        tx.type === 'RECHARGE'
                          ? 'bg-[#50CD89]/15 text-[#50CD89] border-[#50CD89]/30'
                          : 'bg-[#009EF7]/15 text-[#009EF7] border-[#009EF7]/30'
                      }`}>
                        {tx.type_label}
                      </span>
                    </td>
                    <td className={`py-3 px-3 font-bold font-mono ${
                      String(tx.credits).startsWith('+') ? 'text-[#50CD89]' : 'text-[#F1416C]'
                    }`}>
                      {tx.credits}
                    </td>
                    <td className="py-3 px-3 text-[#92929F] font-mono">{tx.balance_before}</td>
                    <td className="py-3 px-3 text-white font-bold font-mono">{tx.balance_after}</td>
                    <td className="py-3 px-3 text-[#92929F]">{tx.description}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
