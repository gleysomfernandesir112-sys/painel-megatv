import React, { useState, useEffect } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import {
  CheckCircle2,
  AlertTriangle,
  QrCode,
  Copy,
  Check,
  Clock,
  ShieldCheck,
  Tv,
  ArrowRight,
  MessageCircle,
  RefreshCw,
  Sparkles,
  ExternalLink,
  Flame,
  Gift,
  Tag,
  CheckCheck
} from 'lucide-react';
import { apiService } from '../../services/apiService';

export interface ActivePromotion {
  id: string;
  title: string;
  type: string;
  months: number;
  bonusDays: number;
  totalDays: number;
  originalAmount: number;
  promotionalAmount: number;
  savings: number;
  description: string;
  imageUrl?: string | null;
}

interface RenewalInfo {
  canRenew: boolean;
  isReseller?: boolean;
  reason?: 'NO_PRICE' | 'NO_PAYMENT_METHOD';
  message?: string;
  dueDay?: number;
  totalAmount?: number;
  parent?: {
    id: string;
    username: string;
    name: string;
    contactWhatsapp?: string;
  };
  customer: {
    username: string;
    name: string;
    expiresAt?: string;
    maxConnections?: number;
    monthlyPrice?: number;
  };
  resellerData?: {
    username: string;
    name: string;
    whatsapp?: string;
    dueDay: number;
    totalAmount: number;
    totalClients: number;
    directClients: number;
    subresellerClients: number;
    extraScreens: number;
    isPaid: boolean;
    paidAt?: string | null;
    monthFormatted?: string;
    monthKey?: string;
  };
  reseller: {
    name: string;
    contactWhatsapp?: string;
  };
  gateway?: string;
  manualPix?: {
    key: string;
    type: string;
    beneficiary: string;
    contactWhatsapp?: string;
  };
  activePromotion?: ActivePromotion | null;
}

interface PaymentTransaction {
  txId: string;
  paymentId: string;
  status: string;
  qrCodeBase64?: string;
  qrCodeText?: string;
  pixKey?: string;
  pixType?: string;
  pixBeneficiary?: string;
  contactWhatsapp?: string;
  isManual?: boolean;
  amount: number;
  months?: number;
  bonusDays?: number;
  promoId?: string | null;
  expiresAt: string;
}

export const PublicRenewPage: React.FC = () => {
  const { username } = useParams<{ username: string }>();
  const location = useLocation();
  const isResellerRoute = location.pathname.includes('/renew/reseller/');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [renewalInfo, setRenewalInfo] = useState<RenewalInfo | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<'promo' | 'normal'>('promo');

  // Estados de Pagamento
  const [generatingPix, setGeneratingPix] = useState(false);
  const [transaction, setTransaction] = useState<PaymentTransaction | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [isPaid, setIsPaid] = useState(false);
  const [pollCount, setPollCount] = useState(0);

  const callPublicApi = async (path: string, options: RequestInit = {}) => {
    const endpoints = apiService.getEndpoints(path);
    let lastError: string | null = null;
    for (const url of endpoints) {
      try {
        const res = await fetch(url, {
          ...options,
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            ...(options.headers || {})
          }
        });
        const data = await res.json().catch(() => null);
        if (res.ok) return data || { success: true };
        lastError = data?.error || data?.message || `HTTP ${res.status}`;
      } catch (err: any) {
        lastError = err.message;
      }
    }
    throw new Error(lastError || 'Falha de conexão com o servidor.');
  };

  // 1. Carregar informações do cliente
  useEffect(() => {
    if (!username) {
      setError('Usuário não especificado na URL.');
      setLoading(false);
      return;
    }

    const fetchInfo = async () => {
      try {
        setLoading(true);
        setError(null);
        const endpoint = isResellerRoute
          ? `/api/v1/public/renew/reseller/${encodeURIComponent(username)}`
          : `/api/v1/public/renew/${encodeURIComponent(username)}`;
        const data = await callPublicApi(endpoint);

        if (!data || !data.success) {
          setError(data?.error || 'Conta de cliente não encontrada.');
          setLoading(false);
          return;
        }

        if (data.isReseller && data.reseller) {
          data.resellerData = data.reseller;
          data.customer = {
            username: data.reseller.username,
            name: data.reseller.name,
            monthlyPrice: data.reseller.totalAmount
          };
        }
        setRenewalInfo(data);
        if (data.activePromotion) {
          setSelectedPlan('promo');
        } else {
          setSelectedPlan('normal');
        }
      } catch (err: any) {
        setError('Falha de conexão com o servidor. Tente novamente mais tarde.');
      } finally {
        setLoading(false);
      }
    };

    fetchInfo();
  }, [username]);

  // 2. Polling para checar confirmação automática do PIX
  useEffect(() => {
    if (!transaction || !transaction.txId || isPaid || transaction.isManual) return;

    const interval = setInterval(async () => {
      try {
        const data = await callPublicApi(`/api/v1/public/renew/${encodeURIComponent(username || '')}/status/${transaction.txId}`);
        if (data && data.success && data.isPaid) {
          setIsPaid(true);
          clearInterval(interval);
        }
      } catch (e) {
        // Ignora erro de rede temporário no polling
      }
      setPollCount(prev => prev + 1);
    }, 4000);

    return () => clearInterval(interval);
  }, [transaction, username, isPaid]);

  // Gerar PIX Dinâmico ou Manual (com suporte a plano promocional)
  const handleGeneratePix = async () => {
    if (!username) return;
    try {
      setGeneratingPix(true);
      setError(null);

      const isPromo = selectedPlan === 'promo' && Boolean(renewalInfo?.activePromotion);
      const payload: any = {};
      if (isPromo && renewalInfo?.activePromotion) {
        payload.promoId = renewalInfo.activePromotion.id;
        payload.months = renewalInfo.activePromotion.months;
      } else {
        payload.months = 1;
      }

      const pixEndpoint = (isResellerRoute || renewalInfo?.isReseller)
        ? `/api/v1/public/renew/reseller/${encodeURIComponent(username)}/pix`
        : `/api/v1/public/renew/${encodeURIComponent(username)}/pix`;
      const data = await callPublicApi(pixEndpoint, {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      if (!data || !data.success) {
        setError(data?.message || data?.error || 'Não foi possível gerar a cobrança PIX.');
        return;
      }

      setTransaction(data.transaction);
      if (data.transaction.status === 'PAID') {
        setIsPaid(true);
      }
    } catch (err: any) {
      setError(err.message || 'Erro de conexão ao gerar PIX.');
    } finally {
      setGeneratingPix(false);
    }
  };

  const handleCopyKey = () => {
    const key = transaction?.pixKey || renewalInfo?.manualPix?.key;
    if (!key) return;
    navigator.clipboard.writeText(key);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 3000);
  };

  const handleCopyCode = () => {
    const code = transaction?.qrCodeText;
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 3000);
  };

  // Formata data de expiração
  const formatExpiry = (isoString?: string) => {
    if (!isoString) return 'Vencido';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch {
      return isoString;
    }
  };

  const cleanWhatsappNumber = (phone?: string) => {
    if (!phone) return '';
    return phone.replace(/\D/g, '');
  };

  const formatPhoneNumber = (phone?: string) => {
    if (!phone) return '';
    const clean = phone.replace(/\D/g, '');
    if (clean.length === 13 && clean.startsWith('55')) {
      return `+55 (${clean.slice(2, 4)}) ${clean.slice(4, 9)}-${clean.slice(9)}`;
    }
    if (clean.length === 11) {
      return `(${clean.slice(0, 2)}) ${clean.slice(2, 7)}-${clean.slice(7)}`;
    }
    return phone;
  };

  const formatPixKey = (key?: string, type?: string) => {
    if (!key) return '';
    const clean = String(key).trim();
    const digitsOnly = clean.replace(/\D/g, '');
    if (type === 'cnpj' || digitsOnly.length === 14) {
      if (digitsOnly.length === 14) {
        return `${digitsOnly.slice(0, 2)}.${digitsOnly.slice(2, 5)}.${digitsOnly.slice(5, 8)}/${digitsOnly.slice(8, 12)}-${digitsOnly.slice(12)}`;
      }
    }
    if (type === 'cpf' || digitsOnly.length === 11) {
      if (digitsOnly.length === 11) {
        return `${digitsOnly.slice(0, 3)}.${digitsOnly.slice(3, 6)}.${digitsOnly.slice(6, 9)}-${digitsOnly.slice(9)}`;
      }
    }
    return clean;
  };

  const getSupportPhone = () => {
    return transaction?.contactWhatsapp || renewalInfo?.reseller?.contactWhatsapp || renewalInfo?.manualPix?.contactWhatsapp || '';
  };

  const whatsappSupportUrl = () => {
    const phone = cleanWhatsappNumber(getSupportPhone());
    const msg = `Olá! Preciso de ajuda para renovar minha assinatura IPTV (Usuário: ${username}).`;
    return phone ? `https://wa.me/${phone}?text=${encodeURIComponent(msg)}` : '#';
  };

  const getWhatsappReceiptUrl = () => {
    const phone = cleanWhatsappNumber(getSupportPhone());
    const clientName = renewalInfo?.customer.name || renewalInfo?.customer.username || username || '';
    const amountStr = Number(transaction?.amount || renewalInfo?.customer.monthlyPrice || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
    const pixKey = transaction?.pixKey || renewalInfo?.manualPix?.key || '';
    const beneficiary = transaction?.pixBeneficiary || renewalInfo?.manualPix?.beneficiary || '';

    let msg = `Olá! Realizei o pagamento da renovação da minha assinatura IPTV via PIX.\n\n`;
    msg += `👤 *Assinante:* ${clientName} (@${renewalInfo?.customer.username || username})\n`;
    msg += `💰 *Valor:* R$ ${amountStr}\n`;
    if (pixKey) {
      msg += `🔑 *Chave PIX:* ${pixKey}${beneficiary ? ` (${beneficiary})` : ''}\n`;
    }
    msg += `\nEstou enviando o comprovante de pagamento em anexo para confirmação e liberação do meu sinal!`;

    return phone ? `https://wa.me/${phone}?text=${encodeURIComponent(msg)}` : '#';
  };

  return (
    <div className="min-h-screen bg-[#0E0F14] text-white flex flex-col items-center justify-center p-4 sm:p-6 selection:bg-[#009EF7] selection:text-white">
      {/* Background Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-[#009EF7]/10 blur-[120px] rounded-full pointer-events-none" />

      {/* Header / Brand */}
      <div className="flex items-center gap-3 mb-6 z-10">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#009EF7] to-[#0052cc] flex items-center justify-center shadow-lg shadow-[#009EF7]/20 border border-white/10">
          <Tv className="w-5 h-5 text-white" />
        </div>
        <div className="text-left">
          <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-1.5">
            Auto-Atendimento <span className="text-[#009EF7]">PIX</span>
          </h1>
          <p className="text-xs text-[#7E8299]">Renovação Instantânea de Assinatura</p>
        </div>
      </div>

      {/* Main Container */}
      <div className="w-full max-w-md bg-[#15161E] border border-[#232635] rounded-2xl shadow-2xl overflow-hidden z-10 transition-all">
        {/* Loading State */}
        {loading && (
          <div className="p-10 flex flex-col items-center justify-center text-center">
            <RefreshCw className="w-8 h-8 text-[#009EF7] animate-spin mb-4" />
            <p className="text-sm font-medium text-[#92929F]">Localizando conta de acesso...</p>
            <p className="text-xs text-[#5E6278] mt-1">Identificando condições de renovação</p>
          </div>
        )}

        {/* Global Error State */}
        {!loading && error && !renewalInfo && (
          <div className="p-8 text-center">
            <div className="w-12 h-12 bg-red-500/10 border border-red-500/20 text-red-400 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h2 className="text-base font-bold text-white mb-2">Conta não localizada</h2>
            <p className="text-xs text-[#92929F] mb-6 leading-relaxed">{error}</p>
            <a
              href="/"
              className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-[#1E202B] hover:bg-[#282B3A] text-xs font-semibold text-[#A1A5B7] transition-all"
            >
              Voltar ao Início
            </a>
          </div>
        )}

        {/* Informações Carregadas */}
        {!loading && renewalInfo && (
          <>
            {/* Header do Card com Resumo do Cliente */}
            <div className="bg-[#1A1C26] p-5 border-b border-[#232635]">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-semibold text-[#7E8299] uppercase tracking-wider block">
                    {renewalInfo.isReseller ? "Revendedor / Parceiro" : "Assinante"}
                  </span>
                  <h2 className="text-base font-bold text-white tracking-tight">
                    {renewalInfo.isReseller ? (renewalInfo.resellerData?.name || renewalInfo.resellerData?.username) : (renewalInfo.customer?.name || renewalInfo.customer?.username)}
                  </h2>
                  <span className="text-xs font-mono text-[#009EF7] block mt-0.5">
                    @{renewalInfo.isReseller ? renewalInfo.resellerData?.username : renewalInfo.customer?.username}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[11px] font-semibold text-[#7E8299] uppercase tracking-wider block">Vencimento</span>
                  <span className="text-xs font-semibold text-white block mt-0.5">
                    {renewalInfo.isReseller
                      ? `Todo dia ${renewalInfo.resellerData?.dueDay || 10}`
                      : formatExpiry(renewalInfo.customer?.expiresAt)}
                  </span>
                  <span className="inline-block mt-1 text-[10px] px-2 py-0.5 rounded-full font-bold bg-[#009EF7]/10 text-[#009EF7] border border-[#009EF7]/20">
                    {renewalInfo.isReseller
                      ? `${renewalInfo.resellerData?.totalClients || 0} Clientes Ativos`
                      : `${renewalInfo.customer?.maxConnections || 1} ${(renewalInfo.customer?.maxConnections || 1) === 1 ? 'Tela' : 'Telas'}`}
                  </span>
                </div>
              </div>
            </div>

            {/* Caso 1: Não pode renovar por falta de preço ou gateway */}
            {!renewalInfo.canRenew ? (
              <div className="p-6 text-center">
                <div className="w-12 h-12 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-white mb-2">
                  {renewalInfo.reason === 'NO_PRICE' ? 'Valor Não Definido' : 'Método de Pagamento Indisponível'}
                </h3>
                <p className="text-xs text-[#92929F] mb-6 leading-relaxed">
                  {renewalInfo.message}
                </p>

                {cleanWhatsappNumber(renewalInfo.reseller.contactWhatsapp) ? (
                  <a
                    href={whatsappSupportUrl()}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#50CD89] hover:bg-[#47be7d] text-white font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>Falar no WhatsApp com o Responsável</span>
                  </a>
                ) : (
                  <div className="p-3 bg-[#1E202B] rounded-xl text-xs text-[#7E8299]">
                    Por favor, entre em contato diretamente com a pessoa que gerencia sua conta.
                  </div>
                )}
              </div>
            ) : isPaid ? (
              /* Sucesso: Pagamento Confirmado e Acesso Liberado */
              <div className="p-8 text-center">
                <div className="w-16 h-16 bg-[#50CD89]/20 border border-[#50CD89] text-[#50CD89] rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <h3 className="text-lg font-black text-white mb-2">Pagamento Confirmado!</h3>
                <p className="text-xs text-[#92929F] leading-relaxed mb-6">
                  Sua conta foi renovada com sucesso por mais <strong>30 dias</strong>. Seu sinal já está 100% ativo e liberado!
                </p>
                <div className="p-4 bg-[#1A1C26] rounded-xl border border-[#232635] text-left text-xs space-y-2 mb-6">
                  <div className="flex justify-between">
                    <span className="text-[#7E8299]">{renewalInfo.isReseller ? "Status da Fatura:" : "Status do Sinal:"}</span>
                    <span className="text-[#50CD89] font-bold">● {renewalInfo.isReseller ? "Quitada / Confirmada" : "Ativo / Liberado"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#7E8299]">{renewalInfo.isReseller ? "Período Liquidado:" : "Período Adicionado:"}</span>
                    <span className="text-white font-semibold">{renewalInfo.isReseller ? (renewalInfo.resellerData?.monthFormatted || "Fatura Quitada") : "+ 30 Dias"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#7E8299]">Usuário:</span>
                    <span className="text-[#009EF7] font-mono">{renewalInfo.isReseller ? (renewalInfo.resellerData?.username || renewalInfo.customer?.username) : renewalInfo.customer?.username}</span>
                  </div>
                </div>

                <div className="text-[11px] text-[#5E6278]">
                  {renewalInfo.isReseller ? "O comprovante de liquidação da sua fatura foi registrado com sucesso!" : "Você já pode reiniciar seu aplicativo IPTV e aproveitar toda a programação! 🚀"}
                </div>
              </div>
            ) : transaction ? (
              /* PIX Gerado: Exibe QR Code e Chave Copia e Cola */
              <div className="p-6">
                <div className="text-center mb-5">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#50CD89]/10 border border-[#50CD89]/30 text-[#50CD89] text-xs font-bold mb-2">
                    <span className="w-2 h-2 rounded-full bg-[#50CD89] animate-pulse" />
                    PIX Gerado com Sucesso
                  </div>
                  <div className="text-2xl font-black text-white tracking-tight">
                    R$ {Number(transaction.amount || (renewalInfo.isReseller ? renewalInfo.resellerData?.totalAmount : renewalInfo.customer?.monthlyPrice)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                  <p className="text-[11px] text-[#7E8299] mt-0.5">{renewalInfo.isReseller ? `Fechamento de Fatura (${renewalInfo.resellerData?.monthFormatted || "Mês Vigente"})` : "Renovação mensal (1 mês de assinatura)"}</p>
                </div>

                {/* QR Code Container */}
                {transaction.qrCodeBase64 ? (
                  <div className="flex flex-col items-center justify-center mb-5">
                    <div className="p-3.5 bg-white rounded-2xl shadow-xl border border-white/20">
                      <img
                        src={transaction.qrCodeBase64}
                        alt="QR Code PIX"
                        className="w-48 h-48 object-contain"
                      />
                    </div>
                    <p className="text-[11px] text-[#7E8299] mt-2">
                      Abra o app do seu banco e aponte a câmera para ler o QR Code
                    </p>
                  </div>
                ) : null}

                {/* 1. Chave PIX Direta (Manual) */}
                {transaction.pixKey && (
                  <div className="space-y-1.5 mb-4 text-left">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold text-[#A1A5B7] flex items-center gap-1.5">
                        <span>{renewalInfo.isReseller ? "Chave PIX do Responsável:" : "Chave PIX da Revenda:"}</span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-black uppercase bg-[#009EF7]/15 text-[#009EF7] border border-[#009EF7]/20">
                          {transaction.pixType || 'CNPJ'}
                        </span>
                      </label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={formatPixKey(transaction.pixKey, transaction.pixType)}
                        className="w-full bg-[#111218] border border-[#232635] text-xs font-mono font-semibold text-white p-3 rounded-xl select-all focus:outline-none focus:border-[#009EF7]"
                      />
                      <button
                        onClick={handleCopyKey}
                        className={`p-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center shrink-0 cursor-pointer ${
                          copiedKey
                            ? 'bg-[#50CD89] text-white shadow-lg shadow-emerald-500/20'
                            : 'bg-[#009EF7] hover:bg-[#0086d4] text-white shadow-lg shadow-[#009EF7]/20'
                        }`}
                        title="Copiar chave PIX"
                      >
                        {copiedKey ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                    {copiedKey && (
                      <p className="text-[11px] text-[#50CD89] font-semibold text-left">
                        ✓ Chave PIX ({transaction.pixType?.toUpperCase() || 'CNPJ'}) copiada!
                      </p>
                    )}
                  </div>
                )}

                {/* 2. Código PIX Copia e Cola (BR Code) */}
                {transaction.qrCodeText && (
                  <div className="space-y-1.5 mb-4 text-left">
                    <label className="text-[11px] font-bold text-[#A1A5B7] block">
                      PIX Copia e Cola (Código Completo):
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={transaction.qrCodeText}
                        className="w-full bg-[#111218] border border-[#232635] text-xs font-mono text-[#7E8299] p-2.5 rounded-xl select-all focus:outline-none"
                      />
                      <button
                        onClick={handleCopyCode}
                        className={`p-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center shrink-0 cursor-pointer ${
                          copiedCode
                            ? 'bg-[#50CD89] text-white shadow-lg shadow-emerald-500/20'
                            : 'bg-[#1E202B] hover:bg-[#282B3A] text-white border border-[#32364A]'
                        }`}
                        title="Copiar código copia e cola"
                      >
                        {copiedCode ? <Check className="w-4 h-4 text-[#50CD89]" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                    {copiedCode && (
                      <p className="text-[11px] text-[#50CD89] font-semibold text-left">
                        ✓ Código Copia e Cola copiado para a área de transferência!
                      </p>
                    )}
                  </div>
                )}

                {/* Informações de Favorecido */}
                {transaction.pixBeneficiary && (
                  <div className="p-3 bg-[#1A1C26] border border-[#232635] rounded-xl text-xs space-y-1 mb-5 text-left">
                    <div className="flex justify-between items-center">
                      <span className="text-[#7E8299]">Titular / Favorecido:</span>
                      <span className="text-white font-bold">{transaction.pixBeneficiary}</span>
                    </div>
                  </div>
                )}

                {/* AÇÃO PRINCIPAL: SE FOR MANUAL -> SOLICITAÇÃO EXPLÍCITA DE COMPROVANTE VIA WHATSAPP */}
                {transaction.isManual ? (
                  <div className="p-4 bg-gradient-to-b from-[#13281E] to-[#0E1A14] border-2 border-[#50CD89]/60 rounded-2xl shadow-xl shadow-emerald-950/40 text-center space-y-3.5 mt-2">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#50CD89]/20 border border-[#50CD89]/40 text-[#50CD89] text-[11px] font-black uppercase tracking-wider">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>Envio de Comprovante Obrigatório</span>
                    </div>

                    <p className="text-xs text-[#E1E3EA] leading-relaxed">
                      Após realizar a transferência ou pagamento pelo seu banco, <strong>envie o comprovante</strong> para o nosso WhatsApp para ativarmos seu sinal imediatamente:
                    </p>

                    {getSupportPhone() && (
                      <div className="inline-flex items-center justify-center gap-1.5 px-3 py-1 bg-[#111218]/60 border border-[#232635] rounded-lg text-xs font-semibold text-[#50CD89]">
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>Suporte: {formatPhoneNumber(getSupportPhone())}</span>
                      </div>
                    )}

                    <a
                      href={getWhatsappReceiptUrl()}
                      target="_blank"
                      rel="noreferrer"
                      className="w-full inline-flex items-center justify-center gap-2.5 py-3.5 px-5 rounded-xl bg-[#25D366] hover:bg-[#20ba59] active:scale-[0.99] text-white font-extrabold text-sm shadow-xl shadow-[#25D366]/30 transition-all cursor-pointer"
                    >
                      <MessageCircle className="w-5 h-5 fill-white" />
                      <span>Enviar Comprovante via WhatsApp</span>
                    </a>
                  </div>
                ) : (
                  /* Polling / Aguardando Banco Automático */
                  <div className="p-3 bg-[#111218] border border-[#232635] rounded-xl flex items-center gap-3">
                    <RefreshCw className="w-4 h-4 text-[#009EF7] animate-spin shrink-0" />
                    <div className="text-[11px] leading-tight text-left">
                      <span className="text-white font-medium block">Aguardando confirmação bancária...</span>
                      <span className="text-[#5E6278] block mt-0.5">Identificação instantânea automática</span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Tela Inicial de Confirmação: Seleção de Oferta e Botão de Gerar PIX */
              <div className="p-6 text-center">
                {renewalInfo.activePromotion && (
                  <div className="mb-6">
                    {/* Imagem/Banner da Promoção se houver */}
                    {renewalInfo.activePromotion.imageUrl && (
                      <div className="mb-4 rounded-xl overflow-hidden border border-[#232635] shadow-lg">
                        <img
                          src={renewalInfo.activePromotion.imageUrl}
                          alt={renewalInfo.activePromotion.title}
                          className="w-full max-h-48 object-cover"
                        />
                      </div>
                    )}

                    {/* Banner de Aviso Promocional */}
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 text-amber-300 text-xs font-bold mb-4 animate-pulse">
                      <Flame className="w-4 h-4 text-orange-400" />
                      <span>OFERTA ESPECIAL DISPONÍVEL!</span>
                    </div>

                    {/* Seletor de Planos */}
                    <div className="space-y-3 text-left">
                      {/* Opção Promocional */}
                      <div
                        onClick={() => setSelectedPlan('promo')}
                        className={`p-4 rounded-2xl border-2 transition-all cursor-pointer relative overflow-hidden ${
                          selectedPlan === 'promo'
                            ? 'bg-gradient-to-br from-[#1B2234] to-[#121622] border-[#009EF7] shadow-lg shadow-[#009EF7]/10'
                            : 'bg-[#15161E] border-[#232635] hover:border-[#32364A]'
                        }`}
                      >
                        <div className="absolute top-0 right-0 bg-gradient-to-l from-orange-500 to-amber-500 text-black text-[10px] font-black uppercase px-3 py-0.5 rounded-bl-xl tracking-wider">
                          Recomendado
                        </div>

                        <div className="flex items-start gap-3">
                          <div className={`w-5 h-5 rounded-full border-2 mt-0.5 flex items-center justify-center shrink-0 ${
                            selectedPlan === 'promo' ? 'border-[#009EF7] bg-[#009EF7]' : 'border-[#43475D]'
                          }`}>
                            {selectedPlan === 'promo' && <div className="w-2 h-2 rounded-full bg-white" />}
                          </div>

                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                                <Sparkles className="w-4 h-4 text-amber-400" />
                                {renewalInfo.activePromotion.title || 'Oferta Promocional'}
                              </h4>
                            </div>

                            <div className="mt-1 flex items-baseline gap-2">
                              <span className="text-2xl font-black text-white">
                                R$ {Number(renewalInfo.activePromotion.promotionalAmount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </span>
                              {renewalInfo.activePromotion.savings > 0 && (
                                <span className="text-xs line-through text-[#7E8299]">
                                  R$ {Number(renewalInfo.activePromotion.originalAmount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </span>
                              )}
                            </div>

                            <p className="text-xs text-[#A1A5B7] mt-1 leading-relaxed">
                              {renewalInfo.activePromotion.description}
                            </p>

                            <div className="mt-2.5 flex flex-wrap gap-2">
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-lg">
                                <CheckCheck className="w-3.5 h-3.5" />
                                {renewalInfo.activePromotion.totalDays} Dias de Acesso
                              </span>
                              {renewalInfo.activePromotion.bonusDays > 0 && (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-lg">
                                  <Gift className="w-3.5 h-3.5" />
                                  +{renewalInfo.activePromotion.bonusDays} Dias Bônus Grátis
                                </span>
                              )}
                              {renewalInfo.activePromotion.savings > 0 && (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#009EF7] bg-[#009EF7]/10 border border-[#009EF7]/20 px-2 py-0.5 rounded-lg">
                                  Economia de R$ {Number(renewalInfo.activePromotion.savings).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Opção Padrão (1 Mês) */}
                      <div
                        onClick={() => setSelectedPlan('normal')}
                        className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                          selectedPlan === 'normal'
                            ? 'bg-[#1B2234] border-[#009EF7]'
                            : 'bg-[#15161E] border-[#232635] hover:border-[#32364A]'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                            selectedPlan === 'normal' ? 'border-[#009EF7] bg-[#009EF7]' : 'border-[#43475D]'
                          }`}>
                            {selectedPlan === 'normal' && <div className="w-2 h-2 rounded-full bg-white" />}
                          </div>

                          <div className="flex-1 flex items-center justify-between">
                            <div>
                              <span className="text-xs font-bold text-white block">Plano Mensal Padrão</span>
                              <span className="text-[11px] text-[#7E8299] block">+30 Dias de Acesso</span>
                            </div>
                            <span className="text-sm font-bold text-white">
                              R$ {Number(renewalInfo.customer.monthlyPrice).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Se não houver promoção ativa, mostra visual tradicional */}
                {!renewalInfo.activePromotion && (
                  <div className="mb-6">
                    <span className="text-xs font-semibold text-[#7E8299] uppercase tracking-wider block mb-1">
                      {renewalInfo.isReseller ? `Fatura Mensal (${renewalInfo.resellerData?.monthFormatted || "Mês Vigente"})` : "Valor da Mensalidade"}
                    </span>
                    <div className="text-3xl font-black text-white tracking-tight">
                      R$ {Number(renewalInfo.isReseller ? renewalInfo.resellerData?.totalAmount : renewalInfo.customer?.monthlyPrice).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </div>
                    <span className="inline-block mt-2 text-xs text-[#50CD89] font-medium bg-[#50CD89]/10 border border-[#50CD89]/20 px-3 py-1 rounded-full">
                      {renewalInfo.isReseller ? `Fechamento de Rede (${renewalInfo.resellerData?.totalClients || 0} Clientes)` : "Acesso Completo por +30 Dias"}
                    </span>
                  </div>
                )}

                <div className="p-4 bg-[#1A1C26] border border-[#232635] rounded-xl text-left text-xs space-y-2.5 mb-6">
                  <div className="flex items-center gap-2 text-white">
                    <ShieldCheck className="w-4 h-4 text-[#50CD89] shrink-0" />
                    <span>Liberação após envio do comprovante</span>
                  </div>
                  <div className="flex items-center gap-2 text-white">
                    <Clock className="w-4 h-4 text-[#009EF7] shrink-0" />
                    <span>Disponível 24 horas por dia, 7 dias por semana</span>
                  </div>
                  <div className="flex items-center gap-2 text-white">
                    <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>Não precisa reinstalar nem reconfigurar nada</span>
                  </div>
                </div>

                <button
                  onClick={handleGeneratePix}
                  disabled={generatingPix}
                  className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-[#009EF7] hover:bg-[#0086d4] text-white font-bold text-sm shadow-xl shadow-[#009EF7]/20 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {generatingPix ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Gerando PIX com o Banco...</span>
                    </>
                  ) : (
                    <>
                      <QrCode className="w-4 h-4" />
                      <span>
                        {(() => {
                          const val = renewalInfo.isReseller
                            ? Number(renewalInfo.resellerData?.totalAmount || 0)
                            : Number(selectedPlan === "promo" && renewalInfo.activePromotion ? renewalInfo.activePromotion.promotionalAmount : (renewalInfo.customer?.monthlyPrice || 0));
                          const formatted = val.toLocaleString("pt-BR", { minimumFractionDigits: 2 });
                          return renewalInfo.gateway === "pix_manual"
                            ? (renewalInfo.isReseller ? `Ver Chave PIX da Fatura: R$ ${formatted}` : `Ver Chave PIX: R$ ${formatted}`)
                            : (renewalInfo.isReseller ? `Pagar Fatura via PIX: R$ ${formatted}` : `Gerar PIX: R$ ${formatted}`);
                        })()}
                      </span>
                    </>
                  )}
                </button>

                {cleanWhatsappNumber(getSupportPhone()) && (
                  <div className="mt-4 pt-4 border-t border-[#232635]">
                    <a
                      href={whatsappSupportUrl()}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs text-[#7E8299] hover:text-white transition-colors"
                    >
                      <MessageCircle className="w-3.5 h-3.5 text-[#50CD89]" />
                      <span>Dúvidas? Fale com o suporte no WhatsApp</span>
                    </a>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer Segurança */}
      <div className="flex items-center gap-2 mt-6 text-[11px] text-[#5E6278] z-10">
        <ShieldCheck className="w-3.5 h-3.5 text-[#50CD89]" />
        <span>Pagamento seguro via PIX com ativação automatizada</span>
      </div>
    </div>
  );
};
