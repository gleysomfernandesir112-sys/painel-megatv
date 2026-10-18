import React, { useState } from 'react';
import { Customer } from '../../types';
import { useSigmaStore } from '../../store/SigmaStore';
import {
  CalendarClock,
  X,
  CheckCircle2,
  Clock,
  Users,
  Loader2,
  Gift
} from 'lucide-react';

interface BulkCourtesyModalProps {
  selectedCustomers: Customer[];
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

const PRESET_DAYS = [1, 2, 3, 5, 7, 15, 30];

export const BulkCourtesyModal: React.FC<BulkCourtesyModalProps> = ({
  selectedCustomers,
  isOpen,
  onClose,
  onComplete
}) => {
  const { addCourtesyDays, refreshLiveData } = useSigmaStore();
  const [days, setDays] = useState(3);
  const [reason, setReason] = useState('Prazo extra de pagamento');
  const [isExecuting, setIsExecuting] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number; currentUsername: string }>({
    current: 0,
    total: selectedCustomers.length,
    currentUsername: ''
  });
  const [result, setResult] = useState<{ successCount: number } | null>(null);

  if (!isOpen || selectedCustomers.length === 0) return null;

  const handleStartCourtesy = async () => {
    setIsExecuting(true);
    setProgress({ current: 0, total: selectedCustomers.length, currentUsername: selectedCustomers[0]?.username || '' });

    let successCount = 0;

    for (let i = 0; i < selectedCustomers.length; i++) {
      const cust = selectedCustomers[i];
      setProgress({
        current: i + 1,
        total: selectedCustomers.length,
        currentUsername: cust.username
      });

      try {
        if (addCourtesyDays) {
          await addCourtesyDays(cust.id, days);
        }
        successCount++;
      } catch (err) {
        console.warn('Erro ao estender cliente:', err);
      }

      await new Promise(r => setTimeout(r, 100));
    }

    setResult({ successCount });
    setIsExecuting(false);
    await refreshLiveData();
  };

  const handleFinish = () => {
    onComplete();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-fade-in select-none">
      <div className="bg-[#15171E] border border-[#262833] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-[#262833] flex items-center justify-between bg-[#1A1C24] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 flex items-center justify-center">
              <CalendarClock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white leading-tight">
                Estender Prazo / Cortesia em Massa
              </h3>
              <p className="text-xs text-[#92929F]">
                Adicionando dias extras para {selectedCustomers.length} clientes selecionados
              </p>
            </div>
          </div>
          {!isExecuting && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Body */}
        <div className="p-5 space-y-5 overflow-y-auto">
          {/* Tela de Resultado Final */}
          {result ? (
            <div className="space-y-4 py-2">
              <div className="p-4 rounded-xl border bg-emerald-500/10 border-emerald-500/30 text-emerald-400 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <div className="font-bold text-sm">
                    Dias adicionados com sucesso!
                  </div>
                  <div className="mt-1 text-gray-300">
                    <span className="text-emerald-400 font-bold">{result.successCount}</span> clientes receberam <span className="text-cyan-300 font-bold">+{days} dias</span> de cortesia.
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleFinish}
                className="w-full py-3 rounded-xl bg-[#009EF7] hover:bg-[#0088d4] text-white text-xs font-bold transition-all shadow-md cursor-pointer"
              >
                Concluir e Atualizar Lista
              </button>
            </div>
          ) : isExecuting ? (
            /* Tela de Execução em Progresso */
            <div className="space-y-5 py-6 text-center">
              <div className="w-14 h-14 rounded-2xl bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 flex items-center justify-center mx-auto animate-pulse">
                <Loader2 className="w-7 h-7 animate-spin" />
              </div>

              <div>
                <h4 className="text-sm font-bold text-white">
                  Estendendo vencimentos no servidor...
                </h4>
                <p className="text-xs text-gray-400 mt-1">
                  Processando <strong className="text-white font-mono">{progress.currentUsername}</strong> ({progress.current} de {progress.total})
                </p>
              </div>

              {/* Barra de Progresso */}
              <div className="w-full bg-[#1A1C24] rounded-full h-3 border border-[#262833] overflow-hidden">
                <div
                  className="bg-gradient-to-r from-cyan-500 to-emerald-400 h-full transition-all duration-300"
                  style={{ width: `${Math.round((progress.current / progress.total) * 100)}%` }}
                />
              </div>

              <p className="text-[11px] text-gray-500">
                Por favor, aguarde o envio das atualizações.
              </p>
            </div>
          ) : (
            /* Tela Inicial de Configuração */
            <>
              {/* Presets de Dias */}
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-2">
                  Quantidade de Dias Gratuitos a Adicionar:
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {PRESET_DAYS.map(d => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDays(d)}
                      className={`p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                        days === d
                          ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-xs'
                          : 'bg-[#1A1C24] border-[#262833] text-gray-400 hover:text-white hover:border-gray-600'
                      }`}
                    >
                      +{d} {d === 1 ? 'dia' : 'dias'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Motivo */}
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                  Motivo da Prorrogação:
                </label>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Ex: Aguardando PIX, Bonificação, Instabilidade temporária"
                  className="w-full bg-[#1A1C24] border border-[#262833] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400"
                />
              </div>

              {/* Quadro de Resumo */}
              <div className="bg-[#1A1C24] border border-[#262833] rounded-xl p-4 space-y-2.5 text-xs">
                <div className="flex items-center justify-between text-gray-400 border-b border-[#262833] pb-2">
                  <span className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-gray-500" /> Clientes selecionados:
                  </span>
                  <span className="font-bold text-white font-mono">{selectedCustomers.length}</span>
                </div>

                <div className="flex items-center justify-between text-gray-400 border-b border-[#262833] pb-2">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-gray-500" /> Prorrogação:
                  </span>
                  <span className="font-bold text-cyan-300 font-mono">+{days} dias adicionados</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                    <Gift className="w-3.5 h-3.5" /> Custo em créditos:
                  </span>
                  <span className="font-bold text-emerald-400 font-mono">
                    0 créditos (Gratuito)
                  </span>
                </div>
              </div>

              {/* Botões de Ação */}
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2.5 rounded-xl bg-[#1A1C24] hover:bg-[#232530] text-gray-300 hover:text-white text-xs font-semibold border border-[#262833] transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleStartCourtesy}
                  className="flex-1 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                >
                  <CalendarClock className="w-4 h-4" />
                  <span>Confirmar +{days} Dias</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
