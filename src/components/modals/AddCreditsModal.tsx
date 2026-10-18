import React, { useState } from 'react';
import { Reseller } from '../../types';
import { useSigmaStore } from '../../store/SigmaStore';
import { X, Coins, CheckCircle2, AlertCircle } from 'lucide-react';

interface AddCreditsModalProps {
  reseller: Reseller | null;
  onClose: () => void;
}

export const AddCreditsModal: React.FC<AddCreditsModalProps> = ({ reseller, onClose }) => {
  const { profile, addCreditsToReseller } = useSigmaStore();
  const [amount, setAmount] = useState(5);
  const [notes, setNotes] = useState('');
  const [statusMsg, setStatusMsg] = useState<{ success: boolean; text: string } | null>(null);

  if (!reseller) return null;

  const handleTransfer = async () => {
    const res = await addCreditsToReseller(reseller.id, amount, notes);
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
        <div className="px-6 py-4 border-b border-[#2B2B40] flex items-center justify-between bg-[#151521] shrink-0">
          <div className="flex items-center gap-2">
            <Coins className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-white text-base">Transferir Créditos</h3>
          </div>
          <button onClick={onClose} className="text-[#92929F] hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto">
          <div className="bg-[#151521] border border-[#2B2B40] p-3 rounded-lg flex justify-between items-center text-xs">
            <div>
              <span className="text-[#92929F] block text-[10px] uppercase">Destinatário</span>
              <span className="text-white font-bold text-sm">{reseller.username}</span>
            </div>
            <div className="text-right">
              <span className="text-[#92929F] block text-[10px] uppercase">Saldo Atual</span>
              <span className="text-[#50CD89] font-bold">{reseller.credits} cr</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#92929F] mb-1.5 uppercase">
              Quantidade de Créditos (Disponível: {profile.credits})
            </label>
            <input
              type="number"
              min="1"
              max={profile.credits}
              value={amount}
              onChange={e => setAmount(Number(e.target.value))}
              className="w-full bg-[#151521] border border-[#2B2B40] rounded-lg px-3 py-2 text-white font-bold text-sm focus:outline-none focus:border-[#009EF7]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#92929F] mb-1.5 uppercase">
              Observação (Opcional)
            </label>
            <input
              type="text"
              placeholder="Ex: Recarga via PIX comprovante #4928"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full bg-[#151521] border border-[#2B2B40] rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-[#009EF7]"
            />
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

        <div className="px-6 py-4 border-t border-[#2B2B40] flex justify-end gap-3 bg-[#151521]">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#2B2B40] hover:bg-[#32324D] text-[#92929F] hover:text-white transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleTransfer}
            className="px-5 py-2 text-xs font-bold rounded-lg bg-amber-500 hover:bg-amber-600 text-black shadow-lg shadow-amber-500/20 transition-colors"
          >
            Transferir {amount} Créditos
          </button>
        </div>
      </div>
    </div>
  );
};
