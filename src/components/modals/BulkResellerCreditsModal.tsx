import React, { useState } from 'react';
import { Reseller } from '../../types';
import { Coins, X, Check, Loader2, Users, AlertCircle, ShieldAlert } from 'lucide-react';
import { useSigmaStore } from '../../store/SigmaStore';
import { apiService } from '../../services/apiService';
import { useBrandConfig } from '../../config/appConfig';
import { isResellerUnlimited } from '../../pages/resellers/ResellersListing';

interface BulkResellerCreditsModalProps {
  selectedResellers: Reseller[];
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export const BulkResellerCreditsModal: React.FC<BulkResellerCreditsModalProps> = ({
  selectedResellers,
  isOpen,
  onClose,
  onComplete
}) => {
  const { profile, refreshLiveData } = useSigmaStore();
  const brand = useBrandConfig();
  const franchisePrimary = brand.primaryColor || '#009EF7';

  const [creditsAmount, setCreditsAmount] = useState<number>(10);
  const [isExecuting, setIsExecuting] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number; currentUsername: string }>({
    current: 0,
    total: selectedResellers.length,
    currentUsername: ''
  });
  const [result, setResult] = useState<{ successCount: number; failCount: number; errors: string[] } | null>(null);

  if (!isOpen || selectedResellers.length === 0) return null;

  const isMasterUnlimited = Boolean(
    profile.unlimited_credits ||
    profile.creditos_ilimitados ||
    profile.credits === 'ilimitado' ||
    profile.role === 'master' ||
    profile.role === 'admin'
  );

  const currentMasterCredits = isMasterUnlimited ? Infinity : Number(profile.credits || 0);
  const totalCost = creditsAmount * selectedResellers.length;
  const hasEnoughCredits = isMasterUnlimited || currentMasterCredits >= totalCost;

  const handleStartTransfer = async () => {
    if (!hasEnoughCredits && !isMasterUnlimited) return;
    if (creditsAmount <= 0) return;

    setIsExecuting(true);
    setProgress({ current: 0, total: selectedResellers.length, currentUsername: selectedResellers[0]?.username || '' });

    let successCount = 0;
    let failCount = 0;
    const errors: string[] = [];

    for (let i = 0; i < selectedResellers.length; i++) {
      const res = selectedResellers[i];
      setProgress({
        current: i + 1,
        total: selectedResellers.length,
        currentUsername: res.username
      });

      try {
        const transferRes = await apiService.transferCredits(res.username, creditsAmount);
        if (transferRes && (transferRes.success || transferRes.status === 'success')) {
          successCount++;
        } else {
          failCount++;
          errors.push(`${res.username}: ${transferRes?.message || 'Falha'}`);
        }
      } catch (err: any) {
        failCount++;
        errors.push(`${res.username}: ${err.message || 'Erro'}`);
      }
    }

    await refreshLiveData();
    setIsExecuting(false);
    setResult({ successCount, failCount, errors });
  };

  const handleClose = () => {
    if (isExecuting) return;
    setResult(null);
    onClose();
    if (result) onComplete();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in select-none">
      <div className="bg-[#15171E] border border-[#262833] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#262833] shrink-0 bg-[#14151C]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-amber-500/15 text-amber-400">
              <Coins className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Adicionar Créditos em Massa</h3>
              <p className="text-[11px] text-[#92929F]">
                {selectedResellers.length} revendedor{selectedResellers.length > 1 ? 'es' : ''} selecionado{selectedResellers.length > 1 ? 's' : ''}
              </p>
            </div>
          </div>
          {!isExecuting && (
            <button onClick={handleClose} className="p-1 rounded-lg text-[#5E6278] hover:text-white cursor-pointer">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4">
          {!result && !isExecuting && (
            <>
              {/* Saldo Atual */}
              <div className="p-3 rounded-xl bg-[#1A1C24] border border-[#232530] flex items-center justify-between text-xs">
                <span className="text-[#92929F]">Seu Saldo Disponível:</span>
                <span className="font-bold text-white flex items-center gap-1 font-mono">
                  {isMasterUnlimited ? (
                    <span className="text-emerald-400 font-bold">∞ Ilimitado</span>
                  ) : (
                    <span>{currentMasterCredits} créditos</span>
                  )}
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-2">
                  Créditos a transferir para cada revenda:
                </label>
                <div className="relative">
                  <Coins className="w-4 h-4 text-amber-400 absolute left-3 top-2.5" />
                  <input
                    type="number"
                    min="1"
                    max="1000"
                    value={creditsAmount}
                    onChange={(e) => setCreditsAmount(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="w-full bg-[#1A1C24] border border-[#232530] rounded-xl pl-9 pr-3 py-2 text-sm text-white font-bold focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div className="flex items-center gap-2 mt-2">
                  {[5, 10, 20, 50, 100].map(val => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setCreditsAmount(val)}
                      className="px-2.5 py-1 rounded-lg bg-[#1A1C24] hover:bg-[#202230] text-[#92929F] hover:text-white border border-[#232530] text-xs font-mono font-medium cursor-pointer"
                    >
                      +{val}
                    </button>
                  ))}
                </div>
              </div>

              {/* Resumo do Débito */}
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs space-y-1">
                <div className="flex justify-between text-gray-300">
                  <span>Revendas selecionadas:</span>
                  <span className="font-bold text-white">{selectedResellers.length}</span>
                </div>
                <div className="flex justify-between text-gray-300">
                  <span>Créditos por revenda:</span>
                  <span className="font-bold text-white">+{creditsAmount}</span>
                </div>
                <div className="flex justify-between text-amber-300 pt-1 border-t border-amber-500/20 font-bold">
                  <span>Total debitado do seu saldo:</span>
                  <span>{isMasterUnlimited ? '0 (Ilimitado)' : `${totalCost} créditos`}</span>
                </div>
              </div>

              {!hasEnoughCredits && !isMasterUnlimited && (
                <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  <span>Saldo insuficiente. Você possui {currentMasterCredits} créditos mas necessita de {totalCost}.</span>
                </div>
              )}
            </>
          )}

          {/* Executing Progress */}
          {isExecuting && (
            <div className="py-6 text-center space-y-4">
              <Loader2 className="w-10 h-10 text-amber-400 animate-spin mx-auto" />
              <div>
                <h4 className="text-sm font-bold text-white">Transferindo créditos em lote...</h4>
                <p className="text-xs text-[#92929F] mt-1 font-mono">
                  Processando ({progress.current}/{progress.total}): <span className="text-white font-semibold">{progress.currentUsername}</span>
                </p>
              </div>
              <div className="w-full bg-[#1A1C24] rounded-full h-2 overflow-hidden border border-[#262833]">
                <div
                  className="bg-amber-400 h-2 transition-all duration-200"
                  style={{ width: `${Math.round((progress.current / progress.total) * 100)}%` }}
                />
              </div>
            </div>
          )}

          {/* Result */}
          {result && (
            <div className="py-4 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-500/15 text-emerald-400 flex items-center justify-center mx-auto">
                <Check className="w-6 h-6 stroke-[3]" />
              </div>
              <h4 className="text-sm font-bold text-white">Recarga em lote finalizada!</h4>
              <p className="text-xs text-gray-300">
                <strong>{result.successCount}</strong> revenda(s) recarregada(s) com sucesso (+{creditsAmount} créditos cada).
                {result.failCount > 0 && (
                  <span className="text-rose-400 block mt-1">({result.failCount} falha(s))</span>
                )}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-[#14151C] border-t border-[#262833] flex items-center justify-end gap-3 shrink-0">
          {!result && !isExecuting ? (
            <>
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 rounded-xl bg-[#202330] hover:bg-[#282C3D] text-gray-300 text-xs font-semibold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleStartTransfer}
                disabled={!hasEnoughCredits && !isMasterUnlimited}
                className="px-4 py-2 rounded-xl text-white text-xs font-bold transition-all shadow-md cursor-pointer bg-amber-500 hover:bg-amber-600 disabled:opacity-50"
              >
                Recarregar {selectedResellers.length} Revendas (+{creditsAmount} cada)
              </button>
            </>
          ) : result ? (
            <button
              type="button"
              onClick={handleClose}
              className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold cursor-pointer"
            >
              Concluir
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
};
