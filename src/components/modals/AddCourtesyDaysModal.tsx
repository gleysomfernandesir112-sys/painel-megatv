import React, { useState } from 'react';
import { useSigmaStore } from '../../store/SigmaStore';
import { Customer } from '../../types';
import { Calendar, X } from 'lucide-react';

interface AddCourtesyDaysModalProps {
  customer: Customer;
  isOpen?: boolean;
  onClose: () => void;
}

export const AddCourtesyDaysModal: React.FC<AddCourtesyDaysModalProps> = ({
  customer,
  onClose
}) => {
  const { addCourtesyDays } = useSigmaStore();
  const [days, setDays] = useState(3);
  const [reason, setReason] = useState('Instabilidade temporária');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (addCourtesyDays) addCourtesyDays(customer.id, days);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-fade-in">
      <div className="bg-[#15171E] border border-[#262833] rounded-xl w-full max-w-md shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#262833] shrink-0">
          <div className="flex items-center gap-2 text-white font-bold text-base">
            <Calendar className="w-5 h-5 text-[#009EF7]" />
            <span>Adicionar Dias de Cortesia</span>
          </div>
          <button onClick={onClose} className="text-[#5E6278] hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          <div className="bg-[#1A1C24] p-3 rounded-lg border border-[#262833]/60 text-xs text-[#92929F]">
            Cliente: <span className="text-white font-semibold">{customer.username}</span>
            <br />
            Vencimento Atual: <span className="text-[#50CD89] font-semibold">{customer.expires_at}</span>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#92929F] mb-1.5">
              Quantidade de Dias Gratuitos
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[1, 3, 7, 15].map((d) => (
                <button
                  type="button"
                  key={d}
                  onClick={() => setDays(d)}
                  className={`py-2 rounded-lg text-xs font-semibold border transition-all ${
                    days === d
                      ? 'bg-[#009EF7] text-white border-[#009EF7]'
                      : 'bg-[#1A1C24] text-[#92929F] border-[#262833] hover:text-white'
                  }`}
                >
                  +{d} dias
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#92929F] mb-1.5">
              Motivo da Cortesia
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full bg-[#1A1C24] border border-[#262833] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#009EF7]"
              placeholder="Ex: Bonificação, Compensação..."
            />
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
              Aplicar Cortesia
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
