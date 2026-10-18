import React, { useState } from 'react';
import { Customer } from '../../types';
import { useSigmaStore } from '../../store/SigmaStore';
import {
  CalendarPlus,
  X,
  AlertTriangle,
  CheckCircle2,
  Wallet,
  Clock,
  Users,
  ShieldCheck,
  Loader2
} from 'lucide-react';

interface BulkRenewModalProps {
  selectedCustomers: Customer[];
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

const MONTH_OPTIONS = [
  { value: 1, label: '1 Mês', tag: 'Padrão' },
  { value: 2, label: '2 Meses', tag: '' },
  { value: 3, label: '3 Meses', tag: 'Trimestral' },
  { value: 6, label: '6 Meses', tag: 'Semestral' },
  { value: 12, label: '12 Meses', tag: 'Anual' }
];

export const BulkRenewModal: React.FC<BulkRenewModalProps> = ({
  selectedCustomers,
  isOpen,
  onClose,
  onComplete
}) => {
  const { profile, renewCustomer, refreshLiveData } = useSigmaStore();
  const [months, setMonths] = useState(1);
  const [isExecuting, setIsExecuting] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number; currentUsername: string }>({
    current: 0,
    total: selectedCustomers.length,
    currentUsername: ''
  });
  const [result, setResult] = useState<{
    successCount: number;
    failCount: number;
    errors: { username: string; message: string }[];
  } | null>(null);

  if (!isOpen || selectedCustomers.length === 0) return null;

  const isUnlimited = Boolean(
    profile.unlimited_credits ||
    profile.creditos_ilimitados ||
    profile.credits === 'ilimitado' ||
    profile.role === 'master' ||
    profile.role === 'admin'
  );

  const currentCredits = isUnlimited ? Infinity : Number(profile.credits || 0);

  // Calcula total de conexões/telas somando todos os selecionados
  const totalScreens = selectedCustomers.reduce((acc, c) => acc + (c.connections_max || 1), 0);
  const totalCost = totalScreens * months;
  const hasEnoughCredits = isUnlimited || currentCredits >= totalCost;
  const remainingCredits = isUnlimited
    ? '∞ Ilimitado'
    : Math.max(0, currentCredits - totalCost);

  const handleStartRenew = async () => {
    if (!hasEnoughCredits && !isUnlimited) return;

    setIsExecuting(true);
    setProgress({ current: 0, total: selectedCustomers.length, currentUsername: selectedCustomers[0]?.username || '' });

    let successCount = 0;
    let failCount = 0;
    const errors: { username: string; message: string }[] = [];

    for (let i = 0; i < selectedCustomers.length; i++) {
      const cust = selectedCustomers[i];
      setProgress({
        current: i + 1,
        total: selectedCustomers.length,
        currentUsername: cust.username
      });

      try {
        const res = await renewCustomer(cust.id, months);
        if (res.success) {
          successCount++;
        } else {
          failCount++;
          errors.push({ username: cust.username, message: res.message || 'Erro desconhecido' });
        }
      } catch (err: any) {
        failCount++;
        errors.push({ username: cust.username, message: err.message || 'Falha de comunicação' });
      }

      // Pequena pausa entre requisições para evitar rate-limiting no servidor
      await new Promise(r => setTimeout(r, 120));
    }

    setResult({ successCount, failCount, errors });
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
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center">
              <CalendarPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white leading-tight">
                Renovação em Massa de Clientes
              </h3>
              <p className="text-xs text-[#92929F]">
                Renovando {selectedCustomers.length} {selectedCustomers.length === 1 ? 'cliente selecionado' : 'clientes selecionados'}
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
              <div className={`p-4 rounded-xl border flex items-start gap-3 ${
                result.failCount === 0
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
              }`}>
                <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <div className="font-bold text-sm">
                    {result.failCount === 0
                      ? 'Todos os clientes foram renovados com sucesso!'
                      : 'Operação de renovação concluída parcialmente.'}
                  </div>
                  <div className="mt-1 text-gray-300">
                    <span className="text-emerald-400 font-bold">{result.successCount}</span> renovados com sucesso
                    {result.failCount > 0 && (
                      <span> • <span className="text-rose-400 font-bold">{result.failCount}</span> falhas</span>
                    )}
                  </div>
                </div>
              </div>

              {result.errors.length > 0 && (
                <div className="p-3 bg-[#1A1C24] border border-[#262833] rounded-xl space-y-2">
                  <div className="text-xs font-bold text-rose-400">Falhas registradas:</div>
                  <div className="max-h-36 overflow-y-auto space-y-1 text-[11px] text-gray-400 font-mono">
                    {result.errors.map((e, idx) => (
                      <div key={idx} className="flex justify-between border-b border-[#262833] pb-1">
                        <span className="text-white font-bold">{e.username}:</span>
                        <span className="text-rose-300">{e.message}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={handleFinish}
                className="w-full py-3 rounded-xl bg-[#009EF7] hover:bg-[#0088d4] text-white text-xs font-bold transition-all shadow-md cursor-pointer"
              >
                Concluir e Atualizar Painel
              </button>
            </div>
          ) : isExecuting ? (
            /* Tela de Execução em Progresso */
            <div className="space-y-5 py-6 text-center">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center justify-center mx-auto animate-pulse">
                <Loader2 className="w-7 h-7 animate-spin" />
              </div>

              <div>
                <h4 className="text-sm font-bold text-white">
                  Renovando clientes no servidor...
                </h4>
                <p className="text-xs text-gray-400 mt-1">
                  Processando <strong className="text-white font-mono">{progress.currentUsername}</strong> ({progress.current} de {progress.total})
                </p>
              </div>

              {/* Barra de Progresso */}
              <div className="w-full bg-[#1A1C24] rounded-full h-3 border border-[#262833] overflow-hidden">
                <div
                  className="bg-gradient-to-r from-amber-500 to-emerald-400 h-full transition-all duration-300"
                  style={{ width: `${Math.round((progress.current / progress.total) * 100)}%` }}
                />
              </div>

              <p className="text-[11px] text-gray-500">
                Por favor, não feche a página durante o processamento em lote.
              </p>
            </div>
          ) : (
            /* Tela Inicial de Configuração e Resumo de Créditos */
            <>
              {/* Seleção do Período */}
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-2">
                  Selecione o Período de Renovação:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {MONTH_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setMonths(opt.value)}
                      className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-between transition-all cursor-pointer ${
                        months === opt.value
                          ? 'bg-amber-500/15 border-amber-500 text-amber-300 shadow-xs'
                          : 'bg-[#1A1C24] border-[#262833] text-gray-400 hover:text-white hover:border-gray-600'
                      }`}
                    >
                      <span>{opt.label}</span>
                      {opt.tag && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-black/40 text-gray-300 uppercase font-semibold">
                          {opt.tag}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quadro de Créditos e Resumo Financeiro */}
              <div className="bg-[#1A1C24] border border-[#262833] rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between text-xs border-b border-[#262833] pb-2.5">
                  <span className="text-gray-400 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-gray-500" /> Clientes selecionados:
                  </span>
                  <span className="font-bold text-white font-mono">
                    {selectedCustomers.length} ({totalScreens} {totalScreens === 1 ? 'tela/conexão' : 'telas/conexões'})
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs border-b border-[#262833] pb-2.5">
                  <span className="text-gray-400 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-gray-500" /> Período aplicado:
                  </span>
                  <span className="font-bold text-amber-400 font-mono">
                    +{months} {months === 1 ? 'mês' : 'meses'}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs border-b border-[#262833] pb-2.5">
                  <span className="text-gray-400 flex items-center gap-1.5">
                    <Wallet className="w-3.5 h-3.5 text-gray-500" /> Total de créditos necessários:
                  </span>
                  <span className="font-bold text-amber-400 font-mono text-sm">
                    {isUnlimited ? '∞ Gratuito' : `${totalCost} créditos`}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-400">Seu saldo após a operação:</span>
                  <span className={`font-bold font-mono ${
                    hasEnoughCredits ? 'text-emerald-400' : 'text-rose-400'
                  }`}>
                    {isUnlimited ? '∞ Ilimitado' : `${remainingCredits} créditos`}
                  </span>
                </div>
              </div>

              {/* Alerta de Saldo Insuficiente */}
              {!hasEnoughCredits && !isUnlimited && (
                <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-400 flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <strong>Saldo Insuficiente:</strong> Você possui{' '}
                    <span className="font-bold font-mono">{currentCredits} créditos</span>, mas precisa de{' '}
                    <span className="font-bold font-mono">{totalCost} créditos</span>. Recarregue seus créditos ou reduza o número de clientes selecionados.
                  </div>
                </div>
              )}

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
                  disabled={!hasEnoughCredits && !isUnlimited}
                  onClick={handleStartRenew}
                  className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                >
                  <CalendarPlus className="w-4 h-4" />
                  <span>Confirmar e Renovar ({totalCost} cr)</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
