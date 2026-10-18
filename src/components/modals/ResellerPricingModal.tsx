import React, { useState } from 'react';
import { useSigmaStore } from '../../store/SigmaStore';
import { X, DollarSign, Tv, Calendar, CheckCircle2, ShieldAlert, Sparkles, Layers, Info, Smartphone, Bot, Coins } from 'lucide-react';

interface ResellerPricingModalProps {
  reseller: {
    username: string;
    name?: string;
    nivel?: number;
    id?: string;
    botAccess?: boolean;
    bot_access?: boolean;
    botMonthlyCredits?: number;
    bot_monthly_credits?: number;
  };
  onClose: () => void;
  onSuccess?: () => void;
}

export const ResellerPricingModal: React.FC<ResellerPricingModalProps> = ({
  reseller,
  onClose,
  onSuccess
}) => {
  const {
    resellers,
    resellerPricings,
    globalBillingSettings,
    updateResellerPricing,
    setResellerBotAccess,
    calculateResellerInvoice
  } = useSigmaStore();

  const uKey = (reseller.username || '').toLowerCase();
  const existingPricing = resellerPricings[uKey];
  const foundReseller = resellers.find(r =>
    (r.username || '').toLowerCase() === uKey ||
    (reseller.id && r.id === reseller.id)
  );

  const [pricePerClient, setPricePerClient] = useState<number>(
    existingPricing?.price_per_client ?? globalBillingSettings.default_price_per_client
  );
  const [screensPerCredit, setScreensPerCredit] = useState<number>(
    existingPricing?.screens_per_credit ?? globalBillingSettings.default_screens_per_credit ?? 1
  );
  const [pricePerScreen, setPricePerScreen] = useState<number>(
    existingPricing?.price_per_extra_screen ?? globalBillingSettings.default_price_per_extra_screen
  );
  const [pricePerGerenciaApp, setPricePerGerenciaApp] = useState<number>(
    existingPricing?.price_per_gerencia_app ?? existingPricing?.price_per_partner_app ?? globalBillingSettings.default_price_per_gerencia_app ?? 0.00
  );
  const [pricePerMaxPlayer, setPricePerMaxPlayer] = useState<number>(
    existingPricing?.price_per_maxplayer_app ?? existingPricing?.price_per_partner_app ?? globalBillingSettings.default_price_per_maxplayer_app ?? 0.00
  );
  const [dueDay, setDueDay] = useState<number>(
    existingPricing?.due_day ?? globalBillingSettings.default_due_day
  );
  const [includeSubresellers, setIncludeSubresellers] = useState<boolean>(
    existingPricing?.include_subreseller_clients ?? true
  );
  const [pixKey, setPixKey] = useState<string>(
    existingPricing?.pix_key ?? ''
  );
  const [notes, setNotes] = useState<string>(
    existingPricing?.notes ?? ''
  );

  const [botAccessEnabled, setBotAccessEnabled] = useState<boolean>(() => {
    if (existingPricing?.bot_access_enabled !== undefined) return Boolean(existingPricing.bot_access_enabled);
    if (foundReseller?.botAccess !== undefined) return Boolean(foundReseller.botAccess);
    if (foundReseller?.bot_access !== undefined) return Boolean(foundReseller.bot_access);
    if (reseller.botAccess !== undefined) return Boolean(reseller.botAccess);
    if (reseller.bot_access !== undefined) return Boolean(reseller.bot_access);
    return false;
  });

  const [botMonthlyCredits, setBotMonthlyCredits] = useState<number>(() => {
    if (existingPricing?.bot_credits_monthly_cost !== undefined) return Number(existingPricing.bot_credits_monthly_cost);
    if (foundReseller?.botMonthlyCredits !== undefined) return Number(foundReseller.botMonthlyCredits);
    if (foundReseller?.bot_monthly_credits !== undefined) return Number(foundReseller.bot_monthly_credits);
    if (reseller.botMonthlyCredits !== undefined) return Number(reseller.botMonthlyCredits);
    if (reseller.bot_monthly_credits !== undefined) return Number(reseller.bot_monthly_credits);
    return 0;
  });

  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Calcula estimativa da fatura atual com os valores inseridos
  const currentSummary = calculateResellerInvoice(reseller.username);
  const simTotalClients = includeSubresellers
    ? currentSummary.direct_clients + currentSummary.subreseller_clients
    : currentSummary.direct_clients;
  const simExtraScreens = currentSummary.total_extra_screens;
  const simGerenciaApps = includeSubresellers
    ? currentSummary.direct_gerencia_apps + currentSummary.subreseller_gerencia_apps
    : currentSummary.direct_gerencia_apps;
  const simMaxPlayerApps = includeSubresellers
    ? currentSummary.direct_maxplayer_apps + currentSummary.subreseller_maxplayer_apps
    : currentSummary.direct_maxplayer_apps;

  const simSubtotalClients = Number((simTotalClients * (pricePerClient || 0)).toFixed(2));
  const simSubtotalScreens = Number((simExtraScreens * (pricePerScreen || 0)).toFixed(2));
  const simSubtotalGerencia = Number((simGerenciaApps * (pricePerGerenciaApp || 0)).toFixed(2));
  const simSubtotalMaxPlayer = Number((simMaxPlayerApps * (pricePerMaxPlayer || 0)).toFixed(2));
  const simSubtotalPartnerApps = Number((simSubtotalGerencia + simSubtotalMaxPlayer).toFixed(2));
  const simTotalAmount = Number((simSubtotalClients + simSubtotalScreens + simSubtotalPartnerApps).toFixed(2));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updateResellerPricing(reseller.username, {
        reseller_username: reseller.username,
        price_per_client: Number(pricePerClient) || 0,
        screens_per_credit: Math.max(1, Number(screensPerCredit) || 1),
        price_per_extra_screen: Number(pricePerScreen) || 0,
        price_per_gerencia_app: Number(pricePerGerenciaApp) || 0,
        price_per_maxplayer_app: Number(pricePerMaxPlayer) || 0,
        price_per_partner_app: Number(pricePerGerenciaApp) || 0,
        due_day: Math.min(31, Math.max(1, Number(dueDay) || 10)),
        include_subreseller_clients: includeSubresellers,
        pix_key: pixKey.trim() || undefined,
        notes: notes.trim() || undefined,
        bot_access_enabled: botAccessEnabled,
        bot_credits_monthly_cost: Number(botMonthlyCredits) || 0
      });

      await setResellerBotAccess(reseller.username, botAccessEnabled, Number(botMonthlyCredits) || 0);

      setSavedSuccess(true);
      if (onSuccess) onSuccess();
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err) {
      console.error('Erro ao salvar valores da revenda:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in select-none">
      <div className="bg-[#14151C] border border-[#1E202B] w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#1E202B] flex items-center justify-between bg-[#111217]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#50CD89]/10 border border-[#50CD89]/20 flex items-center justify-center text-[#50CD89]">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>Personalizar Valores</span>
                <span className="text-xs px-2 py-0.5 rounded-md bg-[#1E202B] text-[#009EF7] font-mono">
                  {reseller.username}
                </span>
              </h2>
              <p className="text-xs text-[#92929F]">
                Defina os valores cobrados por cliente e tela extra para esta revenda.
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
              <span>Valores personalizados salvos com sucesso!</span>
            </div>
          )}

          {/* Grid de Preços: Clientes e Telas */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Valor por Cliente */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-white flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-[#50CD89]" />
                <span>Por Cliente Ativo (R$)</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs font-bold text-[#5E6278]">R$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={pricePerClient}
                  onChange={(e) => setPricePerClient(parseFloat(e.target.value) || 0)}
                  className="w-full bg-[#1A1C24] border border-[#232530] rounded-xl pl-8 pr-3 py-2 text-sm text-white font-mono focus:border-[#50CD89] focus:outline-none transition-colors"
                  placeholder="1.00"
                  required
                />
              </div>
              <p className="text-[10px] text-[#5E6278]">
                Por cliente ativo faturável.
              </p>
            </div>

            {/* Telas Inclusas por Crédito / Ativo */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-white flex items-center gap-1.5">
                <Tv className="w-3.5 h-3.5 text-[#009EF7]" />
                <span>Telas no Crédito</span>
              </label>
              <select
                value={screensPerCredit}
                onChange={(e) => setScreensPerCredit(parseInt(e.target.value, 10) || 1)}
                className="w-full bg-[#1A1C24] border border-[#232530] rounded-xl px-3 py-2 text-sm text-white font-mono focus:border-[#009EF7] focus:outline-none transition-colors cursor-pointer"
              >
                <option value={1}>1 crédito = 1 tela</option>
                <option value={2}>1 crédito = 2 telas (sem custo extra)</option>
                <option value={3}>1 crédito = 3 telas</option>
                <option value={4}>1 crédito = 4 telas</option>
              </select>
              <p className="text-[10px] text-[#92929F]">
                {screensPerCredit > 1 ? `Permite até ${screensPerCredit} telas sem custo adicional.` : 'Apenas 1 conexão inclusa.'}
              </p>
            </div>

            {/* Valor por Tela Extra */}
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
                  value={pricePerScreen}
                  onChange={(e) => setPricePerScreen(parseFloat(e.target.value) || 0)}
                  className="w-full bg-[#1A1C24] border border-[#232530] rounded-xl pl-8 pr-3 py-2 text-sm text-white font-mono focus:border-[#009EF7] focus:outline-none transition-colors"
                  placeholder="0.50"
                  required
                />
              </div>
              <p className="text-[10px] text-[#5E6278]">
                Cobrado além de {screensPerCredit} tela{screensPerCredit > 1 ? 's' : ''} inclusa{screensPerCredit > 1 ? 's' : ''}.
              </p>
            </div>
          </div>

          {/* Seção de Preços Distintos para Apps Parceiros */}
          <div className="p-3 bg-[#111217] border border-[#232530] rounded-xl space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-white flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5 text-[#009EF7]" />
                <span>Preços por Aplicativo Parceiro</span>
              </label>
              <span className="text-[10px] text-[#92929F]">Mantenha em R$ 0,00 se isento</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* GerenciaApp */}
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
                    value={pricePerGerenciaApp}
                    onChange={(e) => setPricePerGerenciaApp(parseFloat(e.target.value) || 0)}
                    className="w-full bg-[#1A1C24] border border-[#232530] rounded-xl pl-8 pr-3 py-2 text-sm text-white font-mono focus:border-blue-400 focus:outline-none transition-colors"
                    placeholder="0.00"
                  />
                </div>
                <p className="text-[10px] text-[#5E6278]">
                  Cobrado por cada dispositivo (MAC) ativo.
                </p>
              </div>

              {/* MaxPlayer */}
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
                    value={pricePerMaxPlayer}
                    onChange={(e) => setPricePerMaxPlayer(parseFloat(e.target.value) || 0)}
                    className="w-full bg-[#1A1C24] border border-[#232530] rounded-xl pl-8 pr-3 py-2 text-sm text-white font-mono focus:border-[#009EF7] focus:outline-none transition-colors"
                    placeholder="0.00"
                  />
                </div>
                <p className="text-[10px] text-[#5E6278]">
                  Cobrado por cada usuário MaxPlayer ativo.
                </p>
              </div>
            </div>
          </div>

          {/* Dia de Vencimento */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-white flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#FFC700]" />
                <span>Dia de Vencimento</span>
              </label>
              <input
                type="number"
                min="1"
                max="31"
                value={dueDay}
                onChange={(e) => setDueDay(parseInt(e.target.value) || 10)}
                className="w-full bg-[#1A1C24] border border-[#232530] rounded-xl px-3 py-2 text-sm text-white font-mono focus:border-[#FFC700] focus:outline-none transition-colors"
                placeholder="10"
              />
              <p className="text-[11px] text-[#5E6278]">
                Dia do mês em que a fatura vence (ex: dia 10).
              </p>
            </div>

            {/* Chave PIX personalizada */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-white flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#009EF7]" />
                <span>Chave PIX Específica (Opcional)</span>
              </label>
              <input
                type="text"
                value={pixKey}
                onChange={(e) => setPixKey(e.target.value)}
                className="w-full bg-[#1A1C24] border border-[#232530] rounded-xl px-3 py-2 text-xs text-white placeholder-[#5E6278] focus:border-[#009EF7] focus:outline-none transition-colors"
                placeholder={globalBillingSettings.pix_key || 'Usa a chave global padrão'}
              />
              <p className="text-[11px] text-[#5E6278]">
                Deixe vazio para usar a Chave PIX Geral do sistema.
              </p>
            </div>
          </div>

          {/* Checkbox: Cobrar sub-revendas subordinadas */}
          <div className="p-3 bg-[#1A1C24] border border-[#232530] rounded-xl space-y-2">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={includeSubresellers}
                onChange={(e) => setIncludeSubresellers(e.target.checked)}
                className="mt-0.5 rounded border-[#232530] text-[#009EF7] focus:ring-0"
              />
              <div>
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-[#009EF7]" />
                  <span>Cobrar clientes de sub-revendas na fatura do pai</span>
                </span>
                <p className="text-[11px] text-[#92929F] mt-0.5 leading-relaxed">
                  Quando ativado, os clientes de todas as sub-revendas subordinadas a este revendedor são somados na fatura dele (ex: Anderson tem 5 clientes e a sub-revenda dele tem 10, Anderson paga por 15 clientes totais).
                </p>
              </div>
            </label>
          </div>

          {/* Seção Modular: Bot WhatsApp e Cobrança Mensal em Créditos */}
          <div className="p-3.5 bg-gradient-to-br from-[#12141A] to-[#181B24] border border-[#232530] rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center border transition-colors ${
                  botAccessEnabled
                    ? 'bg-[#50CD89]/15 border-[#50CD89]/30 text-[#50CD89]'
                    : 'bg-zinc-800 border-zinc-700 text-zinc-400'
                }`}>
                  <Bot className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span>Módulo Bot WhatsApp</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold border transition-colors ${
                      botAccessEnabled
                        ? 'bg-[#50CD89]/15 text-[#50CD89] border-[#50CD89]/30'
                        : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                    }`}>
                      {botAccessEnabled ? 'LIBERADO' : 'BLOQUEADO'}
                    </span>
                  </h3>
                  <p className="text-[10px] text-[#92929F]">
                    Controle dinâmico de liberação do bot para esta revenda subordinada.
                  </p>
                </div>
              </div>

              {/* Toggle Switch */}
              <button
                type="button"
                onClick={() => setBotAccessEnabled(!botAccessEnabled)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer shrink-0 ${
                  botAccessEnabled ? 'bg-[#50CD89]' : 'bg-[#2B2D3A]'
                }`}
                title={botAccessEnabled ? 'Clique para bloquear acesso ao bot' : 'Clique para liberar acesso ao bot'}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    botAccessEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {botAccessEnabled && (
              <div className="pt-2 border-t border-[#232530]/80 space-y-2 animate-fade-in">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <label className="text-xs font-semibold text-white flex items-center gap-1.5">
                    <Coins className="w-3.5 h-3.5 text-amber-400" />
                    <span>Custo Mensal em Créditos pelo Bot</span>
                  </label>
                  <div className="relative w-full sm:w-36">
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={botMonthlyCredits}
                      onChange={(e) => setBotMonthlyCredits(Math.max(0, parseInt(e.target.value, 10) || 0))}
                      className="w-full bg-[#1A1C24] border border-[#232530] rounded-xl pr-14 pl-3 py-1.5 text-xs text-white font-mono focus:border-amber-400 focus:outline-none transition-colors"
                      placeholder="0"
                    />
                    <span className="absolute right-3 top-2 text-[10px] font-bold text-amber-400">cr/mês</span>
                  </div>
                </div>
                <p className="text-[10px] text-[#5E6278] leading-relaxed">
                  {botMonthlyCredits > 0
                    ? `Serão debitados ${botMonthlyCredits} crédito(s) mensalmente desta revenda no 1º dia do mês para manter o bot ativo.`
                    : '0 créditos = Acesso liberado gratuitamente sem débito mensal de créditos.'}
                </p>
              </div>
            )}
          </div>

          {/* Observações */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-white">
              Observações Financeiras (Opcional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-[#1A1C24] border border-[#232530] rounded-xl px-3 py-2 text-xs text-white placeholder-[#5E6278] focus:border-[#50CD89] focus:outline-none transition-colors"
              placeholder="Ex: Preço promocional acordado no WhatsApp"
            />
          </div>

          {/* Card de Simulação em Tempo Real */}
          <div className="p-3.5 bg-gradient-to-br from-[#1A1C24] to-[#14151C] border border-[#50CD89]/25 rounded-xl space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-white flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-[#50CD89]" />
                <span>Simulação da Fatura Atual</span>
              </span>
              <span className="px-2 py-0.5 rounded bg-[#50CD89]/15 text-[#50CD89] font-bold text-[10px]">
                Em tempo real
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center pt-1 text-xs">
              <div className="p-2 bg-[#14151C] rounded-lg border border-[#232530]">
                <div className="text-[10px] text-[#92929F]">Clientes Diretos</div>
                <div className="text-white font-mono font-bold mt-0.5">{currentSummary.direct_clients}</div>
              </div>
              <div className="p-2 bg-[#14151C] rounded-lg border border-[#232530]">
                <div className="text-[10px] text-[#92929F]">Sub-Revendas</div>
                <div className="text-white font-mono font-bold mt-0.5">
                  {includeSubresellers ? currentSummary.subreseller_clients : 0}
                </div>
              </div>
              <div className="p-2 bg-[#14151C] rounded-lg border border-[#232530]">
                <div className="text-[10px] text-[#92929F]">Telas Extras</div>
                <div className="text-white font-mono font-bold mt-0.5">{simExtraScreens}</div>
              </div>
              <div className="p-2 bg-[#14151C] rounded-lg border border-[#232530]">
                <div className="text-[10px] text-[#A855F7] font-semibold">Apps Parceiros</div>
                <div className="text-[#A855F7] font-mono font-bold mt-0.5">
                  {simGerenciaApps + simMaxPlayerApps} ({simGerenciaApps} Ger. / {simMaxPlayerApps} Max)
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 pt-1 border-t border-[#232530]">
              <span className="text-xs text-[#92929F]">
                Total: <strong className="text-white">{simTotalClients}</strong> clientes ({simTotalClients} × R$ {Number(pricePerClient).toFixed(2)})
                {simExtraScreens > 0 && ` + ${simExtraScreens} telas (× R$ ${Number(pricePerScreen).toFixed(2)})`}
                {simSubtotalGerencia > 0 && ` + GerenciaApp R$ ${simSubtotalGerencia.toFixed(2)}`}
                {simSubtotalMaxPlayer > 0 && ` + MaxPlayer R$ ${simSubtotalMaxPlayer.toFixed(2)}`}
              </span>
              <span className="text-base font-black text-[#50CD89] font-mono">
                R$ {simTotalAmount.toFixed(2).replace('.', ',')}
              </span>
            </div>
          </div>

          {/* Buttons */}
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
              disabled={savedSuccess || isSaving}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-[#50CD89] hover:bg-[#47b87a] text-black transition-all shadow-lg shadow-green-500/20 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 className={`w-4 h-4 ${isSaving ? 'animate-spin' : ''}`} />
              <span>{isSaving ? 'Salvando...' : savedSuccess ? 'Salvo!' : 'Salvar Valores'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
