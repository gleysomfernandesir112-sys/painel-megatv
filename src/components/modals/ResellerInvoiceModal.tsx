import React, { useState, useEffect } from 'react';
import { useSigmaStore } from '../../store/SigmaStore';
import { apiService } from '../../services/apiService';
import {
  X,
  Receipt,
  Users,
  Tv,
  DollarSign,
  Layers,
  Copy,
  Check,
  Calendar,
  Phone,
  Settings,
  CheckCircle2,
  Clock,
  Send,
  Smartphone,
  Bot,
  RotateCw,
  AlertCircle
} from 'lucide-react';

interface ResellerInvoiceModalProps {
  resellerUsername: string;
  onClose: () => void;
  onOpenPricing?: () => void;
}

export const ResellerInvoiceModal: React.FC<ResellerInvoiceModalProps> = ({
  resellerUsername,
  onClose,
  onOpenPricing
}) => {
  const {
    calculateResellerInvoice,
    globalBillingSettings,
    resellerPricings,
    toggleInvoicePaid,
    profile
  } = useSigmaStore();

  const [copiedText, setCopiedText] = useState(false);
  const [copiedPix, setCopiedPix] = useState(false);

  const [isBotConnected, setIsBotConnected] = useState(false);
  const [isCheckingBot, setIsCheckingBot] = useState(true);
  const [isSendingBot, setIsSendingBot] = useState(false);
  const [botSendResult, setBotSendResult] = useState<{ success: boolean; message: string } | null>(null);
  const [customPhone, setCustomPhone] = useState('');
  const [showPhonePrompt, setShowPhonePrompt] = useState(false);

  const invoice = calculateResellerInvoice(resellerUsername);
  const uKey = resellerUsername.toLowerCase();
  const pricing = resellerPricings[uKey];

  const isMaster = profile?.role === 'master';
  const myUsername = (profile?.username || '').toLowerCase();
  const mySavedPixKey = localStorage.getItem(`sigma_pix_key_${myUsername}`) || '';
  const mySavedPixName = localStorage.getItem(`sigma_pix_name_${myUsername}`) || '';

  // Se Master: usa pricing individual ou chave padrão do Master
  // Se Revendedor: usa chave do próprio revendedor logado. Se não configurada, NÃO coloca chave nenhuma!
  let effectivePixKey = '';
  let effectivePixName = '';

  if (isMaster) {
    effectivePixKey = pricing?.pix_key || globalBillingSettings.pix_key || '';
    effectivePixName = pricing?.pix_name || globalBillingSettings.pix_name || '';
  } else {
    effectivePixKey = pricing?.pix_key || mySavedPixKey || '';
    effectivePixName = pricing?.pix_name || mySavedPixName || '';
  }

  const monthFormatted = new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  const monthCap = monthFormatted.charAt(0).toUpperCase() + monthFormatted.slice(1);

  // Gera a mensagem personalizada de cobrança para WhatsApp
  const generateWhatsAppMessage = () => {
    let msg = `🧾 *FECHAMENTO DE MENSALIDADE - ${monthCap.toUpperCase()}*\n`;
    msg += `Olá, *${invoice.reseller_name || invoice.reseller_username}*! Segue o demonstrativo dos clientes da sua rede:\n\n`;

    msg += `👥 *Clientes Faturáveis (Somente Ativos):*\n`;
    msg += `• Clientes diretos ativos: ${invoice.direct_clients}\n`;
    if (invoice.subreseller_clients > 0) {
      msg += `• Clientes ativos de sub-revendas subordinadas: ${invoice.subreseller_clients}\n`;
      invoice.subresellers_detail.forEach(sub => {
        msg += `   ↳ ${sub.username}: ${sub.direct_clients} ativos\n`;
      });
    }
    msg += `👉 *Total de clientes ativos:* ${invoice.total_clients} (× R$ ${invoice.price_per_client.toFixed(2).replace('.', ',')}) = *R$ ${invoice.subtotal_clients.toFixed(2).replace('.', ',')}*\n`;
    msg += `_(Clientes vencidos e testes não foram contabilizados)_\n\n`;

    if (invoice.total_extra_screens > 0 && invoice.subtotal_screens > 0) {
      const telasInclusas = invoice.screens_per_credit || 1;
      msg += `📺 *Conexões Adicionais (Telas Extras além de ${telasInclusas} tela${telasInclusas > 1 ? 's' : ''} inclusa${telasInclusas > 1 ? 's' : ''}):*\n`;
      msg += `• ${invoice.total_extra_screens} conexões excedentes (× R$ ${invoice.price_per_extra_screen.toFixed(2).replace('.', ',')}) = *R$ ${invoice.subtotal_screens.toFixed(2).replace('.', ',')}*\n\n`;
    }

    // REGRA DE OURO: Se o revendedor não for cobrado por app parceiro (subtotal <= 0 ou preço 0), NÃO DEVE APARECER NA MENSAGEM!
    if (invoice.subtotal_partner_apps > 0) {
      msg += `📱 *Aplicativos Parceiros:*\n`;
      if (invoice.subtotal_gerencia_apps > 0) {
        msg += `• GerenciaApp: ${invoice.total_gerencia_apps} dispositivo(s) (× R$ ${invoice.price_per_gerencia_app.toFixed(2).replace('.', ',')}) = *R$ ${invoice.subtotal_gerencia_apps.toFixed(2).replace('.', ',')}*\n`;
      }
      if (invoice.subtotal_maxplayer_apps > 0) {
        msg += `• MaxPlayer: ${invoice.total_maxplayer_apps} conta(s) (× R$ ${invoice.price_per_maxplayer_app.toFixed(2).replace('.', ',')}) = *R$ ${invoice.subtotal_maxplayer_apps.toFixed(2).replace('.', ',')}*\n`;
      }
      msg += `👉 *Total Apps Parceiros:* *R$ ${invoice.subtotal_partner_apps.toFixed(2).replace('.', ',')}*\n\n`;
    }

    const renewalLink = `${window.location.origin}/#/renew/reseller/${encodeURIComponent(invoice.reseller_username)}`;

    msg += `━━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `💰 *TOTAL A ACERTAR: R$ ${invoice.total_amount.toFixed(2).replace('.', ',')}*\n`;
    msg += `📅 *Vencimento:* Todo dia ${invoice.due_day}\n\n`;
    msg += `👉 *Pagar com 1 clique pelo seu Link de Fatura:*\n${renewalLink}\n\n`;
    if (effectivePixKey) {
      msg += `🔑 *Ou pague por PIX direto:*\n${effectivePixKey}${effectivePixName ? ` (${effectivePixName})` : ''}\n`;
    }
    msg += `━━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `Por gentileza, encaminhe o comprovante após o pagamento. Qualquer dúvida estamos à disposição! 🚀`;

    return msg;
  };

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(generateWhatsAppMessage());
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  const handleCopyPix = () => {
    if (!effectivePixKey) return;
    navigator.clipboard.writeText(effectivePixKey);
    setCopiedPix(true);
    setTimeout(() => setCopiedPix(false), 2000);
  };

  const cleanWhatsappNumber = (invoice.whatsapp || '').replace(/\D/g, '');
  const waUrl = cleanWhatsappNumber
    ? `https://wa.me/${cleanWhatsappNumber.startsWith('55') ? cleanWhatsappNumber : `55${cleanWhatsappNumber}`}?text=${encodeURIComponent(generateWhatsAppMessage())}`
    : `https://wa.me/?text=${encodeURIComponent(generateWhatsAppMessage())}`;

  useEffect(() => {
    if (invoice.whatsapp) {
      setCustomPhone(invoice.whatsapp);
    }
  }, [invoice.whatsapp]);

  // Consulta se o robô do WhatsApp possui chips conectados e ativos
  useEffect(() => {
    let isMounted = true;
    const checkBot = async () => {
      try {
        setIsCheckingBot(true);
        const res = await apiService.getWhatsAppSlots();
        if (isMounted) {
          setIsBotConnected(Boolean(res.hasConnectedSlot));
        }
      } catch {
        if (isMounted) setIsBotConnected(false);
      } finally {
        if (isMounted) setIsCheckingBot(false);
      }
    };
    checkBot();
    return () => { isMounted = false; };
  }, []);

  const handleSendWhatsApp = async () => {
    // Se o bot não estiver conectado, abre diretamente o WhatsApp Web / wa.me
    if (!isBotConnected) {
      window.open(waUrl, '_blank', 'noopener,noreferrer');
      return;
    }

    const phoneToUse = (customPhone || invoice.whatsapp || '').replace(/\D/g, '');
    if (!phoneToUse || phoneToUse.length < 10) {
      setShowPhonePrompt(true);
      return;
    }

    setIsSendingBot(true);
    setBotSendResult(null);
    try {
      const message = generateWhatsAppMessage();
      const res = await apiService.sendWhatsAppMessage(phoneToUse, message);
      if (res && res.success) {
        setBotSendResult({
          success: true,
          message: `Mensagem de cobrança enviada com sucesso pelo Bot WhatsApp${res.slotUsed ? ` (Chip #${res.slotUsed})` : ''}!`
        });
        setShowPhonePrompt(false);
      } else {
        setBotSendResult({
          success: false,
          message: res?.error || 'Erro ao enviar via Bot WhatsApp. Você pode clicar no atalho para abrir no WhatsApp Web.'
        });
      }
    } catch (err: any) {
      setBotSendResult({
        success: false,
        message: err?.message || 'Falha na comunicação com o Bot WhatsApp.'
      });
    } finally {
      setIsSendingBot(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in select-none">
      <div className="bg-[#14151C] border border-[#1E202B] w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#1E202B] flex items-center justify-between bg-[#111217]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#009EF7]/10 border border-[#009EF7]/20 flex items-center justify-center text-[#009EF7]">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">Demonstrativo da Fatura</h2>
                <span className="text-xs px-2 py-0.5 rounded-md bg-[#1E202B] text-[#50CD89] font-mono font-bold">
                  {invoice.reseller_username}
                </span>
              </div>
              <p className="text-xs text-[#92929F] mt-0.5">
                Referência: <strong className="text-white">{monthCap}</strong> • Vencimento: todo dia <strong className="text-white">{invoice.due_day}</strong>
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
        <div className="p-5 space-y-4 overflow-y-auto">
          {/* Status do Pagamento & Ações Rápidas */}
          <div className="p-3.5 bg-[#1A1C24] border border-[#232530] rounded-xl flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-[#92929F]">Status deste mês:</span>
              <button
                onClick={() => toggleInvoicePaid(invoice.reseller_username)}
                className={`px-3 py-1 rounded-lg text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${
                  invoice.is_paid
                    ? 'bg-[#50CD89]/15 text-[#50CD89] border-[#50CD89]/30 hover:bg-[#50CD89]/25'
                    : 'bg-[#FFC700]/15 text-[#FFC700] border-[#FFC700]/30 hover:bg-[#FFC700]/25'
                }`}
                title="Clique para alternar entre Pago e Pendente"
              >
                {invoice.is_paid ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#50CD89]" />
                    <span>Fatura Paga</span>
                  </>
                ) : (
                  <>
                    <Clock className="w-3.5 h-3.5 text-[#FFC700]" />
                    <span>Pagamento Pendente</span>
                  </>
                )}
              </button>
            </div>

            {onOpenPricing && (
              <button
                onClick={onOpenPricing}
                className="text-xs text-[#009EF7] hover:text-[#50CD89] flex items-center gap-1 font-semibold transition-colors cursor-pointer"
              >
                <Settings className="w-3.5 h-3.5" />
                <span>Ajustar Preços</span>
              </button>
            )}
          </div>

          {/* Discriminação da Fatura */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-[#92929F] uppercase tracking-wider flex items-center gap-1.5">
              <span>Discriminação dos Valores</span>
            </h3>

            {/* Item 1: Clientes Diretos */}
            <div className="p-3 bg-[#1A1C24] border border-[#232530] rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#009EF7]/10 flex items-center justify-center text-[#009EF7]">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white">Clientes Diretos</div>
                  <div className="text-[11px] text-[#92929F]">
                    {invoice.direct_clients} clientes ativos × R$ {invoice.price_per_client.toFixed(2).replace('.', ',')}
                  </div>
                </div>
              </div>
              <div className="text-sm font-bold font-mono text-white">
                R$ {(invoice.direct_clients * invoice.price_per_client).toFixed(2).replace('.', ',')}
              </div>
            </div>

            {/* Item 2: Sub-revendas subordinadas */}
            <div className="p-3 bg-[#1A1C24] border border-[#232530] rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[#009EF7]/10 flex items-center justify-center text-[#009EF7]">
                    <Layers className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">Clientes de Sub-Revendas</div>
                    <div className="text-[11px] text-[#92929F]">
                      {invoice.subreseller_clients} clientes na rede subordinada × R$ {invoice.price_per_client.toFixed(2).replace('.', ',')}
                    </div>
                  </div>
                </div>
                <div className="text-sm font-bold font-mono text-white">
                  R$ {(invoice.subreseller_clients * invoice.price_per_client).toFixed(2).replace('.', ',')}
                </div>
              </div>

              {/* Lista detalhada de sub-revendas filhas se houver */}
              {invoice.subresellers_detail.length > 0 ? (
                <div className="mt-2 pt-2 border-t border-[#232530] space-y-1.5 pl-2">
                  <div className="text-[10px] font-bold text-[#5E6278] uppercase">Detalhamento por Sub-Revenda:</div>
                  {invoice.subresellers_detail.map((sub, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs text-[#92929F] py-0.5">
                      <span className="font-mono text-white">↳ {sub.username} {sub.name && `(${sub.name})`}</span>
                      <span className="text-white font-mono font-semibold">
                        {sub.direct_clients} cliente(s) {sub.extra_screens > 0 ? `+ ${sub.extra_screens} tela(s)` : ''}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-[11px] text-[#5E6278] italic pl-1">
                  Nenhuma sub-revenda subordinada ativa vinculada a este revendedor.
                </div>
              )}
            </div>

            {/* Item 3: Conexões Adicionais / Telas Extras */}
            <div className="p-3 bg-[#1A1C24] border border-[#232530] rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#50CD89]/10 flex items-center justify-center text-[#50CD89]">
                  <Tv className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white">Conexões Adicionais (Telas Extras)</div>
                  <div className="text-[11px] text-[#92929F]">
                    {invoice.total_extra_screens} tela(s) extra(s) na rede × R$ {invoice.price_per_extra_screen.toFixed(2).replace('.', ',')}
                  </div>
                </div>
              </div>
              <div className="text-sm font-bold font-mono text-white">
                R$ {invoice.subtotal_screens.toFixed(2).replace('.', ',')}
              </div>
            </div>

            {/* Item 4: Aplicativos Parceiros Ativos */}
            <div className="p-3 bg-[#1A1C24] border border-[#232530] rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[#009EF7]/10 flex items-center justify-center text-[#009EF7]">
                    <Smartphone className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-2">
                      <span>Aplicativos Parceiros Ativos</span>
                      {invoice.subtotal_partner_apps === 0 && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#50CD89]/15 text-[#50CD89] border border-[#50CD89]/30">
                          Isento / R$ 0,00
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-[#92929F]">
                      {invoice.total_partner_apps} app(s) ativo(s) na rede ({invoice.total_gerencia_apps} GerenciaApp, {invoice.total_maxplayer_apps} MaxPlayer)
                    </div>
                  </div>
                </div>
                <div className="text-sm font-bold font-mono text-white">
                  R$ {invoice.subtotal_partner_apps.toFixed(2).replace('.', ',')}
                </div>
              </div>

              {(invoice.total_gerencia_apps > 0 || invoice.total_maxplayer_apps > 0) && (
                <div className="mt-2 pt-2 border-t border-[#232530] space-y-1 pl-2 text-[11px] text-[#92929F]">
                  {invoice.total_gerencia_apps > 0 && (
                    <div className="flex items-center justify-between">
                      <span>• GerenciaApp ({invoice.total_gerencia_apps} dispositivos × R$ {invoice.price_per_gerencia_app.toFixed(2).replace('.', ',')}):</span>
                      <span className="font-mono text-white font-semibold">R$ {invoice.subtotal_gerencia_apps.toFixed(2).replace('.', ',')}</span>
                    </div>
                  )}
                  {invoice.total_maxplayer_apps > 0 && (
                    <div className="flex items-center justify-between">
                      <span>• MaxPlayer ({invoice.total_maxplayer_apps} contas × R$ {invoice.price_per_maxplayer_app.toFixed(2).replace('.', ',')}):</span>
                      <span className="font-mono text-white font-semibold">R$ {invoice.subtotal_maxplayer_apps.toFixed(2).replace('.', ',')}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Destaque do Total Geral */}
          <div className="p-4 bg-gradient-to-r from-[#1E202B] via-[#1A1C24] to-[#14151C] border-2 border-[#50CD89]/30 rounded-2xl flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-[#92929F] uppercase tracking-wider">Total a Pagar no Mês</div>
              <div className="text-xs text-[#50CD89] mt-0.5 font-medium">
                {invoice.total_clients} clientes no total + {invoice.total_extra_screens} conexões extras{invoice.total_partner_apps > 0 ? ` + ${invoice.total_partner_apps} apps parceiros` : ''}
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-[#50CD89] font-mono tracking-tight">
              R$ {invoice.total_amount.toFixed(2).replace('.', ',')}
            </div>
          </div>

          {/* Chave PIX */}
          {effectivePixKey && (
            <div className="p-3 bg-[#1A1C24] border border-[#232530] rounded-xl flex items-center justify-between">
              <div className="min-w-0 pr-2">
                <div className="text-[10px] text-[#92929F] font-bold uppercase">Chave PIX para Pagamento:</div>
                <div className="text-xs font-mono font-bold text-white truncate">{effectivePixKey}</div>
                {effectivePixName && <div className="text-[10px] text-[#5E6278]">{effectivePixName}</div>}
              </div>
              <button
                onClick={handleCopyPix}
                className="px-3 py-1.5 bg-[#232530] hover:bg-[#2c2e3d] text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0 cursor-pointer"
              >
                {copiedPix ? <Check className="w-3.5 h-3.5 text-[#50CD89]" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedPix ? 'Copiado!' : 'Copiar PIX'}</span>
              </button>
            </div>
          )}

          {/* Ações de Cobrança WhatsApp */}
          <div className="space-y-2.5 pt-2 border-t border-[#1E202B]">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-[#92929F]">Envio de Cobrança:</span>
              {isBotConnected ? (
                <span className="text-[11px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Bot WhatsApp Conectado
                </span>
              ) : (
                <span className="text-[11px] text-[#92929F] flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-600" />
                  Bot Off (WhatsApp Web)
                </span>
              )}
            </div>

            {/* Feedback de Envio pelo Bot */}
            {botSendResult && (
              <div className={`p-3 rounded-xl border text-xs flex items-center justify-between gap-2 animate-fade-in ${
                botSendResult.success
                  ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                  : 'bg-rose-500/15 border-rose-500/30 text-rose-300'
              }`}>
                <div className="flex items-center gap-2">
                  {botSendResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  )}
                  <span>{botSendResult.message}</span>
                </div>
                {!botSendResult.success && (
                  <a
                    href={waUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="underline text-xs font-bold hover:text-white shrink-0"
                  >
                    Abrir WhatsApp Web
                  </a>
                )}
              </div>
            )}

            {/* Prompt de Telefone caso revenda não tenha telefone cadastrado */}
            {showPhonePrompt && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-2 animate-fade-in">
                <p className="text-xs text-amber-300 font-semibold flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5" />
                  Esta revenda não possui WhatsApp com DDD cadastrado. Digite o número para envio:
                </p>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={customPhone}
                    onChange={(e) => setCustomPhone(e.target.value)}
                    placeholder="Ex: 5511999998888 ou (11) 99999-8888"
                    className="flex-1 bg-[#14151C] border border-[#232530] rounded-xl px-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 font-mono"
                  />
                  <button
                    type="button"
                    onClick={handleSendWhatsApp}
                    className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-black text-xs font-bold rounded-xl cursor-pointer"
                  >
                    Confirmar e Enviar
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowPhonePrompt(false)}
                    className="px-2 py-1.5 text-xs text-gray-400 hover:text-white cursor-pointer"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Botão Copiar Link da Fatura */}
              <button
                type="button"
                onClick={() => {
                  const link = `${window.location.origin}/#/renew/reseller/${encodeURIComponent(invoice.reseller_username)}`;
                  navigator.clipboard.writeText(link);
                  alert(`Link da fatura copiado:\n${link}`);
                }}
                className="w-full py-2.5 px-3 bg-[#1A1C24] hover:bg-[#232530] border border-[#232530] rounded-xl text-xs font-bold text-[#009EF7] transition-all flex items-center justify-center gap-2 cursor-pointer sm:col-span-2"
              >
                <Receipt className="w-4 h-4 text-[#009EF7]" />
                <span>Copiar Link Exclusivo da Fatura ({invoice.reseller_username})</span>
              </button>

              {/* Botão Copiar Mensagem */}
              <button
                type="button"
                onClick={handleCopyMessage}
                className="w-full py-2.5 px-3 bg-[#1A1C24] hover:bg-[#232530] border border-[#232530] rounded-xl text-xs font-bold text-white transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {copiedText ? (
                  <>
                    <Check className="w-4 h-4 text-[#50CD89]" />
                    <span className="text-[#50CD89]">Mensagem Copiada!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-[#009EF7]" />
                    <span>Copiar Mensagem WhatsApp</span>
                  </>
                )}
              </button>

              {/* Botão Enviar para WhatsApp (Usa Bot se ativo ou WhatsApp Web) */}
              <div className="flex items-center gap-1.5 w-full">
                <button
                  type="button"
                  disabled={isSendingBot}
                  onClick={handleSendWhatsApp}
                  className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-lg cursor-pointer disabled:opacity-50 select-none ${
                    isBotConnected
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-950/40'
                      : 'bg-[#25D366] hover:bg-[#20b859] text-black shadow-green-500/20'
                  }`}
                  title={
                    isBotConnected
                      ? 'Bot Conectado: Dispara a cobrança automaticamente pelo WhatsApp do Bot'
                      : 'Bot Desconectado: Abre a mensagem pronta no WhatsApp Web'
                  }
                >
                  {isSendingBot ? (
                    <>
                      <RotateCw className="w-4 h-4 animate-spin text-white" />
                      <span>Enviando pelo Bot...</span>
                    </>
                  ) : isBotConnected ? (
                    <>
                      <Bot className="w-4 h-4 text-emerald-300" />
                      <span>Enviar via Bot WhatsApp</span>
                      <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse" title="Bot Online" />
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Cobrar no WhatsApp</span>
                    </>
                  )}
                </button>

                {/* Atalho complementar para abrir manualmente no WhatsApp Web quando o bot estiver ativo */}
                {isBotConnected && (
                  <a
                    href={waUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2.5 bg-[#1A1C24] hover:bg-[#232530] border border-[#232530] text-[#25D366] hover:text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center cursor-pointer shrink-0"
                    title="Abrir no WhatsApp Web (wa.me) manualmente"
                  >
                    <Send className="w-4 h-4" />
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
