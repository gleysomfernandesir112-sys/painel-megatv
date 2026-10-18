import React, { useState } from 'react';
import { useSigmaStore } from '../../store/SigmaStore';
import { apiService } from '../../services/apiService';
import { X, Coins, ArrowUpRight, ArrowDownLeft, CheckCircle2, AlertCircle } from 'lucide-react';

interface TransferCreditsModalProps {
  reseller: {
    id?: string;
    username: string;
    name?: string;
    credits?: number;
    creditos?: number;
  };
  onClose: () => void;
  onSuccess?: () => void;
}

export const TransferCreditsModal: React.FC<TransferCreditsModalProps> = ({
  reseller,
  onClose,
  onSuccess
}) => {
  const { profile, refreshLiveData } = useSigmaStore();
  const [mode, setMode] = useState<'add' | 'recall'>('add');
  const [amount, setAmount] = useState(5);
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ success: boolean; text: string } | null>(null);

  const subCredits = reseller.creditos !== undefined ? reseller.creditos : (reseller.credits || 0);
  const parentCredits = profile.credits;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) return;

    setLoading(true);
    setStatusMsg(null);

    const delta = mode === 'add' ? amount : -amount;

    try {
      const res = await apiService.transferCredits(reseller.username, delta);
      setStatusMsg({
        success: true,
        text: res.message || (mode === 'add'
          ? `Sucesso: ${amount} crédito(s) transferido(s) para ${reseller.username}!`
          : `Sucesso: ${amount} crédito(s) recolhido(s) de ${reseller.username}!`)
      });

      await refreshLiveData();
      if (onSuccess) onSuccess();

      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      setStatusMsg({
        success: false,
        text: err.message || 'Erro ao processar transferência de créditos.'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-fade-in select-none">
      <div className="bg-[#15171E] border border-[#262833] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#262833] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              mode === 'add' ? 'bg-[#50CD89]/15 text-[#50CD89]' : 'bg-amber-500/15 text-amber-400'
            }`}>
              <Coins className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">Transferência & Estorno de Créditos</h3>
              <p className="text-[11px] text-[#92929F]">Sub-Revenda: <span className="text-white font-mono">{reseller.username}</span></p>
            </div>
          </div>
          <button onClick={onClose} className="text-[#5E6278] hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          {/* Operation Mode Selector */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-[#1A1C24] rounded-xl border border-[#232530]">
            <button
              type="button"
              onClick={() => setMode('add')}
              className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                mode === 'add'
                  ? 'bg-[#50CD89] text-white shadow-md shadow-emerald-500/20'
                  : 'text-[#92929F] hover:text-white'
              }`}
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>Transferir (+)</span>
            </button>
            <button
              type="button"
              onClick={() => setMode('recall')}
              className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                mode === 'recall'
                  ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20'
                  : 'text-[#92929F] hover:text-white'
              }`}
            >
              <ArrowDownLeft className="w-3.5 h-3.5" />
              <span>Estornar / Recolher (-)</span>
            </button>
          </div>

          {/* Balances Comparison */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-[#1A1C24] p-3 rounded-xl border border-[#232530] text-center">
              <span className="text-[10px] text-[#92929F] block uppercase font-semibold">Seu Saldo Disponível</span>
              <span className="text-white font-bold font-mono text-sm">
                {profile.unlimited_credits || profile.creditos_ilimitados || profile.credits === 'ilimitado'
                  ? '∞ Ilimitado'
                  : `${parentCredits} cr`}
              </span>
            </div>
            <div className="bg-[#1A1C24] p-3 rounded-xl border border-[#232530] text-center">
              <span className="text-[10px] text-[#92929F] block uppercase font-semibold">Saldo do Parceiro</span>
              <span className="text-[#50CD89] font-bold font-mono text-sm">{subCredits} cr</span>
            </div>
          </div>

          {/* Amount Input */}
          <div>
            <label className="block text-xs font-semibold text-[#92929F] mb-1.5 uppercase tracking-wider">
              {mode === 'add' ? 'Quantidade a Transferir' : 'Quantidade a Recolher'}
            </label>
            <input
              type="number"
              min="1"
              max={mode === 'add' ? (profile.unlimited_credits || profile.creditos_ilimitados || profile.credits === 'ilimitado' ? 99999 : Number(parentCredits)) : subCredits}
              value={amount}
              onChange={(e) => setAmount(Math.max(1, Number(e.target.value) || 0))}
              className="w-full bg-[#1A1C24] border border-[#232530] rounded-xl px-3.5 py-2.5 text-white font-mono font-bold text-sm focus:outline-none focus:border-[#009EF7]"
            />
          </div>

          {/* Quick presets */}
          <div className="flex gap-2">
            {[5, 10, 25, 50].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setAmount(preset)}
                className="flex-1 py-1.5 rounded-lg bg-[#1A1C24] hover:bg-[#232530] border border-[#232530] text-xs font-mono text-[#92929F] hover:text-white transition-all"
              >
                +{preset}
              </button>
            ))}
          </div>

          {/* Status Message */}
          {statusMsg && (
            <div className={`p-3 rounded-xl flex items-center gap-2 text-xs font-medium animate-fade-in ${
              statusMsg.success
                ? 'bg-[#50CD89]/10 border border-[#50CD89]/30 text-[#50CD89]'
                : 'bg-[#F1416C]/10 border border-[#F1416C]/30 text-[#F1416C]'
            }`}>
              {statusMsg.success ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
              <span>{statusMsg.text}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-2 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl bg-[#1A1C24] hover:bg-[#232530] text-[#92929F] hover:text-white border border-[#232530] text-xs font-semibold transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || (mode === 'add' && !(profile.unlimited_credits || profile.creditos_ilimitados || profile.credits === 'ilimitado') && amount > Number(parentCredits)) || (mode === 'recall' && amount > subCredits)}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold text-white transition-all disabled:opacity-50 cursor-pointer shadow-lg ${
                mode === 'add'
                  ? 'bg-[#50CD89] hover:bg-[#47be7d] shadow-emerald-500/20'
                  : 'bg-amber-500 hover:bg-amber-600 text-black shadow-amber-500/20'
              }`}
            >
              {loading ? 'Processando...' : mode === 'add' ? `Confirmar (+${amount} cr)` : `Recolher (-${amount} cr)`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
