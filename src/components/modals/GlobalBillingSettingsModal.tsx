import React, { useState } from 'react';
import { useSigmaStore } from '../../store/SigmaStore';
import { X, Settings2, DollarSign, Tv, Calendar, Sparkles, CheckCircle2, Smartphone } from 'lucide-react';

interface GlobalBillingSettingsModalProps {
  onClose: () => void;
  onSuccess?: () => void;
}

export const GlobalBillingSettingsModal: React.FC<GlobalBillingSettingsModalProps> = ({
  onClose,
  onSuccess
}) => {
  const { globalBillingSettings, updateGlobalBillingSettings } = useSigmaStore();

  const [defaultPriceClient, setDefaultPriceClient] = useState(globalBillingSettings.default_price_per_client);
  const [defaultScreensPerCredit, setDefaultScreensPerCredit] = useState(globalBillingSettings.default_screens_per_credit ?? 1);
  const [defaultPriceScreen, setDefaultPriceScreen] = useState(globalBillingSettings.default_price_per_extra_screen);
  const [defaultPriceGerenciaApp, setDefaultPriceGerenciaApp] = useState(globalBillingSettings.default_price_per_gerencia_app ?? globalBillingSettings.default_price_per_partner_app ?? 0.00);
  const [defaultPriceMaxPlayerApp, setDefaultPriceMaxPlayerApp] = useState(globalBillingSettings.default_price_per_maxplayer_app ?? globalBillingSettings.default_price_per_partner_app ?? 0.00);
  const [defaultDueDay, setDefaultDueDay] = useState(globalBillingSettings.default_due_day);
  const [pixKey, setPixKey] = useState(globalBillingSettings.pix_key || '');
  const [pixName, setPixName] = useState(globalBillingSettings.pix_name || '');
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateGlobalBillingSettings({
      default_price_per_client: Number(defaultPriceClient) || 0,
      default_screens_per_credit: Math.max(1, Number(defaultScreensPerCredit) || 1),
      default_price_per_extra_screen: Number(defaultPriceScreen) || 0,
      default_price_per_gerencia_app: Number(defaultPriceGerenciaApp) || 0,
      default_price_per_maxplayer_app: Number(defaultPriceMaxPlayerApp) || 0,
      default_price_per_partner_app: Number(defaultPriceGerenciaApp) || 0,
      default_due_day: Math.min(31, Math.max(1, Number(defaultDueDay) || 10)),
      pix_key: pixKey.trim(),
      pix_name: pixName.trim()
    });

    setSavedSuccess(true);
    if (onSuccess) onSuccess();
    setTimeout(() => {
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in select-none">
      <div className="bg-[#14151C] border border-[#1E202B] w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#1E202B] flex items-center justify-between bg-[#111217]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#009EF7]/10 border border-[#009EF7]/20 flex items-center justify-center text-[#009EF7]">
              <Settings2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Configurações Gerais de Preço & PIX</h2>
              <p className="text-xs text-[#92929F]">
                Valores padrão aplicados a novas revendas ou sem preço personalizado.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#92929F] hover:text-white hover:bg-[#1E202B] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto">
          {savedSuccess && (
            <div className="p-3 bg-[#50CD89]/10 border border-[#50CD89]/30 rounded-xl flex items-center gap-2.5 text-xs text-[#50CD89] font-medium">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Configurações gerais salvas com sucesso!</span>
            </div>
          )}

          {/* Grid Clientes e Telas */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Valor Padrão por Cliente */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-white flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-[#50CD89]" />
                <span>Por Cliente (R$)</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs font-bold text-[#5E6278]">R$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={defaultPriceClient}
                  onChange={(e) => setDefaultPriceClient(parseFloat(e.target.value) || 0)}
                  className="w-full bg-[#1A1C24] border border-[#232530] rounded-xl pl-8 pr-3 py-2 text-sm text-white font-mono focus:border-[#50CD89] focus:outline-none transition-colors"
                  required
                />
              </div>
            </div>

            {/* Telas Inclusas Padrão */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-white flex items-center gap-1.5">
                <Tv className="w-3.5 h-3.5 text-[#009EF7]" />
                <span>Telas no Crédito</span>
              </label>
              <select
                value={defaultScreensPerCredit}
                onChange={(e) => setDefaultScreensPerCredit(parseInt(e.target.value, 10) || 1)}
                className="w-full bg-[#1A1C24] border border-[#232530] rounded-xl px-3 py-2 text-sm text-white font-mono focus:border-[#009EF7] focus:outline-none transition-colors cursor-pointer"
              >
                <option value={1}>1 crédito = 1 tela</option>
                <option value={2}>1 crédito = 2 telas</option>
                <option value={3}>1 crédito = 3 telas</option>
                <option value={4}>1 crédito = 4 telas</option>
              </select>
            </div>

            {/* Valor Padrão por Tela Extra */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-white flex items-center gap-1.5">
                <Tv className="w-3.5 h-3.5 text-[#009EF7]" />
                <span>Tela Extra (R$)</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs font-bold text-[#5E6278]">R$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={defaultPriceScreen}
                  onChange={(e) => setDefaultPriceScreen(parseFloat(e.target.value) || 0)}
                  className="w-full bg-[#1A1C24] border border-[#232530] rounded-xl pl-8 pr-3 py-2 text-sm text-white font-mono focus:border-[#009EF7] focus:outline-none transition-colors"
                  required
                />
              </div>
            </div>
          </div>

          {/* Preços Padrão Apps Parceiros (Separados) */}
          <div className="p-3 bg-[#111217] border border-[#232530] rounded-xl space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-white flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5 text-[#009EF7]" />
                <span>Preços Padrão por App Parceiro</span>
              </label>
              <span className="text-[10px] text-[#92929F]">Mantenha em 0 se for isento</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#92929F] flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5 text-blue-400" />
                  <span>GerenciaApp (por dispositivo/MAC)</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs font-bold text-[#5E6278]">R$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={defaultPriceGerenciaApp}
                    onChange={(e) => setDefaultPriceGerenciaApp(parseFloat(e.target.value) || 0)}
                    className="w-full bg-[#1A1C24] border border-[#232530] rounded-xl pl-8 pr-3 py-2 text-sm text-white font-mono focus:border-blue-400 focus:outline-none transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#92929F] flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5 text-[#009EF7]" />
                  <span>MaxPlayer (por conta ativa)</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs font-bold text-[#5E6278]">R$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={defaultPriceMaxPlayerApp}
                    onChange={(e) => setDefaultPriceMaxPlayerApp(parseFloat(e.target.value) || 0)}
                    className="w-full bg-[#1A1C24] border border-[#232530] rounded-xl pl-8 pr-3 py-2 text-sm text-white font-mono focus:border-[#009EF7] focus:outline-none transition-colors"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Dia de Vencimento Padrão */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-white flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#FFC700]" />
              <span>Dia de Vencimento Padrão</span>
            </label>
            <input
              type="number"
              min="1"
              max="31"
              value={defaultDueDay}
              onChange={(e) => setDefaultDueDay(parseInt(e.target.value) || 10)}
              className="w-full bg-[#1A1C24] border border-[#232530] rounded-xl px-3 py-2 text-sm text-white font-mono focus:border-[#FFC700] focus:outline-none transition-colors"
            />
          </div>

          {/* Chave PIX Padrão do Sistema */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-white flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#009EF7]" />
              <span>Chave PIX Geral do Sistema</span>
            </label>
            <input
              type="text"
              value={pixKey}
              onChange={(e) => setPixKey(e.target.value)}
              className="w-full bg-[#1A1C24] border border-[#232530] rounded-xl px-3 py-2 text-xs text-white placeholder-[#5E6278] focus:border-[#009EF7] focus:outline-none transition-colors"
              placeholder="Ex: financeiro@suaempresa.com ou celular/CNPJ"
            />
          </div>

          {/* Nome do Titular PIX */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-white">
              Nome do Titular da Conta PIX (Opcional)
            </label>
            <input
              type="text"
              value={pixName}
              onChange={(e) => setPixName(e.target.value)}
              className="w-full bg-[#1A1C24] border border-[#232530] rounded-xl px-3 py-2 text-xs text-white placeholder-[#5E6278] focus:border-[#009EF7] focus:outline-none transition-colors"
              placeholder="Ex: Painel Streaming Ltda"
            />
          </div>

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-[#92929F] hover:text-white hover:bg-[#1E202B] transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={savedSuccess}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-[#009EF7] hover:bg-[#0086d4] text-white transition-all shadow-lg shadow-blue-500/20 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Salvar Padrões</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
