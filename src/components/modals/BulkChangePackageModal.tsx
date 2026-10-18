import React, { useState, useEffect } from 'react';
import { Customer } from '../../types';
import { fastCdnApi, FastCdnLista } from '../../services/fastcdn';
import { Package, X, Check, Loader2, Users, AlertCircle } from 'lucide-react';
import { useSigmaStore } from '../../store/SigmaStore';
import { useBrandConfig } from '../../config/appConfig';

interface BulkChangePackageModalProps {
  selectedCustomers: Customer[];
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export const BulkChangePackageModal: React.FC<BulkChangePackageModalProps> = ({
  selectedCustomers,
  isOpen,
  onClose,
  onComplete
}) => {
  const { updateCustomer, refreshLiveData } = useSigmaStore();
  const brand = useBrandConfig();
  const franchisePrimary = brand.primaryColor || '#009EF7';

  const [selectedPackage, setSelectedPackage] = useState('COMPLETO C/ ADULTOS');
  const [packages, setPackages] = useState<FastCdnLista[]>([
    { id: 'bq_completo', nome: 'COMPLETO C/ ADULTOS', padrao: true },
    { id: 'bq_sem_adulto', nome: 'COMPLETO S/ ADULTOS', padrao: false }
  ]);
  const [isExecuting, setIsExecuting] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number; currentUsername: string }>({
    current: 0,
    total: selectedCustomers.length,
    currentUsername: ''
  });
  const [result, setResult] = useState<{ successCount: number; failCount: number } | null>(null);

  useEffect(() => {
    fastCdnApi.getListas().then((list) => {
      if (Array.isArray(list) && list.length > 0) {
        setPackages(list);
      }
    }).catch(() => {});
  }, []);

  if (!isOpen || selectedCustomers.length === 0) return null;

  const handleStartUpdate = async () => {
    setIsExecuting(true);
    setProgress({ current: 0, total: selectedCustomers.length, currentUsername: selectedCustomers[0]?.username || '' });

    const pkgObj = packages.find(p => p.nome === selectedPackage || p.id === selectedPackage);
    const bouquetId = pkgObj ? pkgObj.id : selectedPackage;
    const bouquetName = pkgObj ? pkgObj.nome : selectedPackage;

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < selectedCustomers.length; i++) {
      const cust = selectedCustomers[i];
      setProgress({
        current: i + 1,
        total: selectedCustomers.length,
        currentUsername: cust.username
      });

      try {
        const res = await updateCustomer(cust.id, {
          package_id: bouquetId,
          package_name: bouquetName,
          package: bouquetName,
          bouquet_id: bouquetId,
          id_lista: bouquetId
        } as any);

        if (res.success) {
          successCount++;
        } else {
          failCount++;
        }
      } catch {
        failCount++;
      }
    }

    await refreshLiveData();
    setIsExecuting(false);
    setResult({ successCount, failCount });
  };

  const handleClose = () => {
    if (isExecuting) return;
    setResult(null);
    onClose();
    if (result) onComplete();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in select-none">
      <div className="bg-[#15171E] border border-[#262833] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#262833] shrink-0 bg-[#14151C]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-amber-500/15 text-amber-400">
              <Package className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Alterar Pacote em Massa</h3>
              <p className="text-[11px] text-[#92929F]">
                {selectedCustomers.length} cliente{selectedCustomers.length > 1 ? 's' : ''} selecionado{selectedCustomers.length > 1 ? 's' : ''}
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
              <div className="bg-[#1A1C24] p-3 rounded-xl border border-[#262833] text-xs text-gray-300 flex items-center gap-2">
                <Users className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>
                  O pacote escolhido abaixo será atribuído simultaneamente para todos os <strong>{selectedCustomers.length}</strong> clientes marcados.
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-2">
                  Selecione o Novo Pacote / Bouquet:
                </label>
                <div className="space-y-2">
                  {packages.map((pkg) => {
                    const isSelected = selectedPackage === pkg.nome || selectedPackage === pkg.id;
                    return (
                      <div
                        key={pkg.id}
                        onClick={() => setSelectedPackage(pkg.nome)}
                        className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all text-xs ${
                          isSelected
                            ? 'text-white shadow-xs'
                            : 'bg-[#1A1C24] border-[#232530] text-[#92929F] hover:text-white hover:bg-[#202230]'
                        }`}
                        style={isSelected ? {
                          backgroundColor: `${franchisePrimary}18`,
                          borderColor: franchisePrimary
                        } : {}}
                      >
                        <div className="flex items-center gap-2">
                          <Package className="w-4 h-4" style={{ color: isSelected ? franchisePrimary : '#5E6278' }} />
                          <span className="font-semibold">{pkg.nome}</span>
                        </div>
                        {isSelected && <Check className="w-4 h-4" style={{ color: franchisePrimary }} />}
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {/* Executing Progress */}
          {isExecuting && (
            <div className="py-6 text-center space-y-4">
              <Loader2 className="w-10 h-10 text-amber-400 animate-spin mx-auto" />
              <div>
                <h4 className="text-sm font-bold text-white">Atualizando pacotes em lote...</h4>
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
              <h4 className="text-sm font-bold text-white">Alteração em massa concluída!</h4>
              <p className="text-xs text-gray-300">
                <strong>{result.successCount}</strong> cliente(s) atualizado(s) com sucesso.
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
                onClick={handleStartUpdate}
                className="px-4 py-2 rounded-xl text-white text-xs font-bold transition-all shadow-md cursor-pointer"
                style={{ backgroundColor: franchisePrimary }}
              >
                Aplicar Pacote a {selectedCustomers.length} Clientes
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
