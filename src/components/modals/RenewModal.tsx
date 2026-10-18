import React, { useState } from 'react';
import { Customer } from '../../types';
import { useSigmaStore } from '../../store/SigmaStore';
import { X, Calendar, AlertCircle, CheckCircle2 } from 'lucide-react';

interface RenewModalProps {
  customer: Customer | null;
  onClose: () => void;
}

export const RenewModal: React.FC<RenewModalProps> = ({ customer, onClose }) => {
  const { profile, renewCustomer } = useSigmaStore();
  const [renewMode, setRenewMode] = useState<'meses' | 'dias'>('meses');
  const [months, setMonths] = useState(1);
  const [days, setDays] = useState(30);
  const [statusMsg, setStatusMsg] = useState<{ success: boolean; text: string } | null>(null);

  if (!customer) return null;

  const isUnlimited = profile.unlimited_credits || profile.creditos_ilimitados || profile.credits === 'ilimitado' || profile.role === 'master';
  const cost = renewMode === 'dias' ? 1 : months * (customer.connections_max || 1);

  // Parser seguro de datas: suporta ISO string (expiresAt), timestamp, ou DD/MM/YYYY
  const parseCustomerExpDate = (): Date => {
    if (customer.expiresAt) {
      const d = new Date(customer.expiresAt);
      if (!isNaN(d.getTime())) return d;
    }
    const raw = String(customer.expires_at || '').trim();
    if (raw && raw !== '-') {
      // Tenta parse ISO
      const isoD = new Date(raw);
      if (!isNaN(isoD.getTime())) return isoD;

      // Tenta parse DD/MM/YYYY
      const parts = raw.split(/[/ -]/);
      if (parts.length >= 3) {
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const year = parseInt(parts[2], 10);
        const d = new Date(year, month, day);
        if (!isNaN(d.getTime())) return d;
      }
    }
    return new Date();
  };

  const parsedCurrentExp = parseCustomerExpDate();
  const isCurrentlyActive = parsedCurrentExp.getTime() > Date.now();
  const baseDate = isCurrentlyActive ? parsedCurrentExp : new Date();

  const newExp = new Date(baseDate);
  if (renewMode === 'dias') {
    newExp.setDate(newExp.getDate() + Number(days || 30));
  } else {
    newExp.setMonth(newExp.getMonth() + Number(months || 1));
  }

  const handleConfirm = async () => {
    const res = await renewCustomer(customer.id, months, renewMode === 'dias' ? days : undefined);
    setStatusMsg({ success: res.success, text: res.message });
    if (res.success) {
      setTimeout(() => {
        onClose();
      }, 1400);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#1E1E2D] border border-[#2B2B40] rounded-xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-150 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#2B2B40] flex items-center justify-between bg-[#151521] shrink-0">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-[#009EF7]" />
            <h3 className="font-bold text-white text-base">Renovar Cliente</h3>
          </div>
          <button onClick={onClose} className="text-[#92929F] hover:text-white transition-colors cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 overflow-y-auto">
          {/* Customer Info Card */}
          <div className="bg-[#151521] border border-[#2B2B40] p-3.5 rounded-lg">
            <div className="text-xs text-[#92929F]">Cliente Selecionado</div>
            <div className="text-sm font-bold text-white mt-0.5">{customer.username}</div>
            <div className="text-xs text-[#6D6D80] mt-1 flex justify-between">
              <span>Vencimento atual:</span>
              <span className="text-amber-400 font-medium">{customer.expires_at}</span>
            </div>
          </div>

          {/* Period selection Mode */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-[#92929F] uppercase tracking-wider">
                Período de Renovação
              </label>
              <div className="flex items-center gap-1 bg-[#151521] p-0.5 rounded-lg border border-[#2B2B40]">
                <button
                  type="button"
                  onClick={() => setRenewMode('meses')}
                  className={`px-2 py-0.5 text-[10px] font-bold rounded cursor-pointer transition-all ${
                    renewMode === 'meses' ? 'bg-[#009EF7] text-white' : 'text-[#92929F] hover:text-white'
                  }`}
                >
                  Meses
                </button>
                <button
                  type="button"
                  onClick={() => setRenewMode('dias')}
                  className={`px-2 py-0.5 text-[10px] font-bold rounded cursor-pointer transition-all ${
                    renewMode === 'dias' ? 'bg-[#009EF7] text-white' : 'text-[#92929F] hover:text-white'
                  }`}
                >
                  Dias
                </button>
              </div>
            </div>

            {renewMode === 'meses' ? (
              <div className="grid grid-cols-4 gap-2">
                {[1, 3, 6, 12].map(m => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMonths(m)}
                    className={`py-2 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                      months === m
                        ? 'bg-[#009EF7] border-[#009EF7] text-white shadow-lg shadow-blue-500/30'
                        : 'bg-[#151521] border-[#2B2B40] text-[#92929F] hover:border-white hover:text-white'
                    }`}
                  >
                    {m} {m === 1 ? 'Mês' : 'Meses'}
                  </button>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-2">
                {[7, 15, 30, 60].map(d => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDays(d)}
                    className={`py-2 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                      days === d
                        ? 'bg-[#009EF7] border-[#009EF7] text-white shadow-lg shadow-blue-500/30'
                        : 'bg-[#151521] border-[#2B2B40] text-[#92929F] hover:border-white hover:text-white'
                    }`}
                  >
                    {d} Dias
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Summary */}
          <div className="bg-[#151521] p-3.5 rounded-lg border border-[#2B2B40] space-y-2 text-xs">
            <div className="flex justify-between text-[#92929F]">
              <span>Custo em Créditos:</span>
              <span className="text-white font-bold">{cost} crédito(s)</span>
            </div>
            <div className="flex justify-between text-[#92929F]">
              <span>Seu saldo atual:</span>
              <span className="text-[#50CD89] font-bold font-mono">
                {isUnlimited ? '∞ Ilimitado' : `${profile.credits} crédito(s)`}
              </span>
            </div>
            <div className="border-t border-[#2B2B40] pt-2 flex justify-between font-semibold">
              <span className="text-white">Novo vencimento:</span>
              <span className="text-[#50CD89] font-bold">{newExp.toLocaleDateString('pt-BR')}</span>
            </div>
          </div>

          {statusMsg && (
            <div className={`p-3 rounded-lg flex items-center gap-2 text-xs font-medium ${
              statusMsg.success ? 'bg-green-500/10 border border-green-500/30 text-green-400' : 'bg-red-500/10 border border-red-500/30 text-red-400'
            }`}>
              {statusMsg.success ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
              <span>{statusMsg.text}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#2B2B40] flex justify-end gap-3 bg-[#151521]">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#2B2B40] hover:bg-[#32324D] text-[#92929F] hover:text-white transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            className="px-5 py-2 text-xs font-bold rounded-lg bg-[#009EF7] hover:bg-[#0086D1] text-white shadow-lg shadow-blue-500/20 transition-colors cursor-pointer"
          >
            Confirmar Renovação ({cost}cr)
          </button>
        </div>
      </div>
    </div>
  );
};
