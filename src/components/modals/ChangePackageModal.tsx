import React, { useState, useEffect } from 'react';
import { Customer } from '../../types';
import { fastCdnApi, FastCdnLista } from '../../services/fastcdn';
import { Package, X, Check } from 'lucide-react';
import { useSigmaStore } from '../../store/SigmaStore';
import { useBrandConfig } from '../../config/appConfig';

interface ChangePackageModalProps {
  customer: Customer;
  isOpen?: boolean;
  onClose: () => void;
}

export const ChangePackageModal: React.FC<ChangePackageModalProps> = ({
  customer,
  onClose
}) => {
  const { updateCustomer, refreshLiveData } = useSigmaStore();
  const brand = useBrandConfig();
  const franchisePrimary = brand.primaryColor || '#009EF7';

  const [selectedPackage, setSelectedPackage] = useState(customer.package_name || 'COMPLETO C/ ADULTOS');
  const [packages, setPackages] = useState<FastCdnLista[]>([
    { id: 'bq_completo', nome: 'COMPLETO C/ ADULTOS', padrao: true },
    { id: 'bq_sem_adulto', nome: 'COMPLETO S/ ADULTOS', padrao: false }
  ]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fastCdnApi.getListas().then((list) => {
      if (Array.isArray(list) && list.length > 0) {
        setPackages(list);
      }
    }).catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const pkgObj = packages.find(p => p.nome === selectedPackage || p.id === selectedPackage);
    const bouquetId = pkgObj ? pkgObj.id : selectedPackage;
    const bouquetName = pkgObj ? pkgObj.nome : selectedPackage;

    try {
      await updateCustomer(customer.id, {
        package_id: bouquetId,
        package_name: bouquetName,
        package: bouquetName,
        bouquet_id: bouquetId,
        id_lista: bouquetId
      } as any);
      await refreshLiveData();
      customer.package_name = bouquetName;
      customer.package = bouquetName;
      customer.package_id = bouquetId;
    } catch (_) {}
    setSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-fade-in select-none">
      <div className="bg-[#15171E] border border-[#262833] rounded-xl w-full max-w-md shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#262833] shrink-0">
          <div className="flex items-center gap-2 text-white font-bold text-base">
            <Package className="w-5 h-5" style={{ color: franchisePrimary }} />
            <span>Alterar Pacote / Bouquet</span>
          </div>
          <button onClick={onClose} className="text-[#5E6278] hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          <div className="bg-[#1A1C24] p-3 rounded-lg border border-[#262833]/60 text-xs text-[#92929F]">
            Cliente: <span className="text-white font-semibold font-mono">{customer.username}</span>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-medium text-[#92929F] mb-1">
              Selecione o Novo Pacote
            </label>
            {packages.map((pkg) => {
              const isSelected = selectedPackage === pkg.nome || selectedPackage === pkg.id;
              return (
                <div
                  key={pkg.id}
                  onClick={() => setSelectedPackage(pkg.nome)}
                  className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all text-xs ${
                    isSelected
                      ? 'text-white'
                      : 'bg-[#1A1C24] border-[#232530] text-[#92929F] hover:text-white'
                  }`}
                  style={isSelected ? {
                    backgroundColor: `${franchisePrimary}18`,
                    borderColor: franchisePrimary
                  } : {}}
                >
                  <div className="flex flex-col">
                    <span className="font-medium">{pkg.nome}</span>
                    {pkg.id === 'bq_leve_10k_4k' && (
                      <span className="text-[10px] text-gray-400 mt-0.5">Otimizado p/ TVs antigas (máx 10k filmes / 4k séries)</span>
                    )}
                  </div>
                  {isSelected && <Check className="w-4 h-4" style={{ color: franchisePrimary }} />}
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#262833]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-semibold text-[#92929F] hover:bg-[#1A1C24] cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-lg text-xs font-semibold text-white cursor-pointer transition-all hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: franchisePrimary }}
            >
              {saving ? 'Salvando...' : 'Salvar Alteração'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
