import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useLocation, useNavigate } from 'react-router-dom';
import {
  Smartphone,
  QrCode,
  Power,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  CreditCard,
  Building,
  Key,
  ShieldCheck,
  Send,
  MessageCircle,
  Link as LinkIcon,
  HelpCircle,
  Copy,
  Check,
  Zap,
  Radio,
  Users,
  Clock,
  Sparkles,
  Flame,
  Gift,
  Tag,
  Calendar,
  Percent,
  Image as ImageIcon,
  Plus,
  Trash2,
  ExternalLink,
  MessageSquare,
  CheckCheck,
  Upload,
  FileText,
  X,
  Lock,
  ShieldAlert
} from 'lucide-react';
import { useSigmaStore } from '../../store/SigmaStore';
import { apiService } from '../../services/apiService';
import { normalizePhoneNumber, handlePhoneInputChange, handlePhoneInputPaste, handlePhoneInputBlur } from '../../utils/phone';
import { isPanelMaster } from '../../utils/panelAuth';

interface SlotStatus {
  slot: number;
  instanceName: string;
  connected: boolean;
  phone: string | null;
  name: string | null;
  profileName?: string | null;
  status: string;
  updatedAt?: string;
}

interface PaymentConfig {
  resellerId?: string;
  activeGateway: 'mercadopago' | 'asaas' | 'efi' | 'pix_manual' | 'none';
  enabled: boolean;
  mercadopagoAccessToken: string;
  asaasApiKey: string;
  efiClientId: string;
  efiClientSecret: string;
  efiPixKey: string;
  manualPixKey: string;
  manualPixType: 'celular' | 'cpf' | 'cnpj' | 'email' | 'aleatoria';
  manualPixBeneficiary: string;
  contactWhatsapp: string;
}

interface BotConfig {
  botName: string;
  supportPhone: string;
  supportMessage: string;
  partnerAppCode: string;
  autoTestEnabled: boolean;
  autoTestDurationHours: number;
  pixKey: string;
  pixBeneficiary: string;
}

export interface PromotionItem {
  id: string;
  ownerId?: string;
  title: string;
  type: 'fraction_discount' | 'bonus_days' | 'percentage_discount' | 'fixed_discount' | 'referral';
  months: number;
  fractionNumerator: number;
  fractionDenominator: number;
  discountPercent: number;
  bonusDays: number;
  fixedDiscountValue: number;
  imageUrl?: string;
  mediaBase64?: string;
  messageTemplate: string;
  scheduledDate?: string | null;
  scheduledDayOfMonth?: number | null;
  status: 'active' | 'scheduled' | 'sent' | 'paused';
  targetGroup: string;
  delayMs: number;
  appliedCount?: number;
  lastSentAt?: string | null;
  createdAt?: string;
}

interface WhatsAppBotPageProps {
  defaultTab?: 'slots' | 'flow' | 'promotions' | 'broadcast' | 'gateways' | 'test';
}

export const WhatsAppBotPage: React.FC<WhatsAppBotPageProps> = ({ defaultTab }) => {
  const { profile, customers } = useSigmaStore();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();

  const getInitialTab = (): 'slots' | 'flow' | 'promotions' | 'broadcast' | 'gateways' | 'test' => {
    if (location.pathname.includes('/automation/gateways')) return 'gateways';
    if (location.pathname.includes('/automation/broadcast')) return 'broadcast';
    if (location.pathname.includes('/automation/test')) return 'test';
    if (location.pathname.includes('/automation/flow')) return 'flow';
    if (location.pathname.includes('/automation/promotions')) return 'promotions';
    if (location.pathname.includes('/automation/whatsapp')) return 'slots';
    if (defaultTab) return defaultTab;
    const q = searchParams.get('tab');
    if (q && ['slots', 'flow', 'promotions', 'broadcast', 'gateways', 'test'].includes(q)) return q as any;
    return 'slots';
  };

  const [activeTab, setActiveTab] = useState<'slots' | 'flow' | 'promotions' | 'broadcast' | 'gateways' | 'test'>(getInitialTab);

  useEffect(() => {
    setActiveTab(getInitialTab());
  }, [location.pathname, searchParams, defaultTab]);

  const handleTabChange = (newTab: 'slots' | 'flow' | 'promotions' | 'broadcast' | 'gateways' | 'test') => {
    setActiveTab(newTab);
    const routeMap = {
      slots: '/automation/whatsapp',
      flow: '/automation/flow',
      promotions: '/automation/promotions',
      gateways: '/automation/gateways',
      broadcast: '/automation/broadcast',
      test: '/automation/test'
    };
    navigate(routeMap[newTab]);
  };

  // Slots State
  const [slots, setSlots] = useState<SlotStatus[]>([
    { slot: 1, instanceName: 'bot_slot_1', connected: false, phone: null, name: null, status: 'close' },
    { slot: 2, instanceName: 'bot_slot_2', connected: false, phone: null, name: null, status: 'close' },
    { slot: 3, instanceName: 'bot_slot_3', connected: false, phone: null, name: null, status: 'close' },
    { slot: 4, instanceName: 'bot_slot_4', connected: false, phone: null, name: null, status: 'close' },
    { slot: 5, instanceName: 'bot_slot_5', connected: false, phone: null, name: null, status: 'close' }
  ]);
  const [loadingSlots, setLoadingSlots] = useState(true);
  const [connectingSlot, setConnectingSlot] = useState<number | null>(null);
  const [qrCodeData, setQrCodeData] = useState<{ slot: number; qrCode: string; pairingCode?: string } | null>(null);
  const [disconnectingSlot, setDisconnectingSlot] = useState<number | null>(null);
  const [slotError, setSlotError] = useState<string | null>(null);

  // Gateways State
  const [paymentConfig, setPaymentConfig] = useState<PaymentConfig>({
    activeGateway: 'mercadopago',
    enabled: false,
    mercadopagoAccessToken: '',
    asaasApiKey: '',
    efiClientId: '',
    efiClientSecret: '',
    efiPixKey: '',
    manualPixKey: '',
    manualPixType: 'celular',
    manualPixBeneficiary: '',
    contactWhatsapp: ''
  });
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [savingConfig, setSavingConfig] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Flow & Support State
  const [botConfig, setBotConfig] = useState<BotConfig>({
    botName: 'MediaCMS TV',
    supportPhone: '',
    supportMessage: 'Olá! Nosso suporte humano e atendimento personalizado está à disposição. Aguarde um instante que já vamos te atender!',
    partnerAppCode: '0522464',
    autoTestEnabled: true,
    autoTestDurationHours: 4,
    pixKey: '',
    pixBeneficiary: ''
  });
  const [loadingBotConfig, setLoadingBotConfig] = useState(false);
  const [savingBotConfig, setSavingBotConfig] = useState(false);
  const [botConfigSaved, setBotConfigSaved] = useState(false);

  // Promotions State
  const [promotions, setPromotions] = useState<PromotionItem[]>([]);
  const [loadingPromos, setLoadingPromos] = useState(false);
  const [promoFormOpen, setPromoFormOpen] = useState(false);
  const [savingPromo, setSavingPromo] = useState(false);
  const [broadcastingPromoId, setBroadcastingPromoId] = useState<string | null>(null);
  const [promoForm, setPromoForm] = useState<PromotionItem>({
    id: '',
    title: 'Super Promoção 2 Meses com Desconto 3/4',
    type: 'fraction_discount',
    months: 2,
    fractionNumerator: 3,
    fractionDenominator: 4,
    discountPercent: 25,
    bonusDays: 5,
    fixedDiscountValue: 15,
    imageUrl: '',
    mediaBase64: '',
    messageTemplate:
      `🔥 *SUPER PROMOÇÃO EXCLUSIVA DE RENOVAÇÃO!* 📺🍿\n\n` +
      `Olá *{nome}*! Temos uma oportunidade especial para você continuar aproveitando o melhor da TV:\n\n` +
      `💎 *Oferta:* {meses_promocao} com super desconto!\n` +
      `❌ De: ~{valor_original}~\n` +
      `✅ *Por apenas: {valor_promocional}* (Economia de {economia}!)\n` +
      `🎁 *Validade total:* {total_dias} de acesso liberado sem travas!\n\n` +
      `⚡ *Renove com liberação instantânea no link:*\n` +
      `👉 {link_renovacao}\n\n` +
      `Ou pague pela Chave PIX: \`{pix_key}\` ({pix_beneficiario})\n` +
      `Aproveite, oferta por tempo limitado! 🚀`,
    scheduledDate: '',
    scheduledDayOfMonth: 10,
    status: 'active',
    targetGroup: 'all',
    delayMs: 3500
  });
  const [simBasePrice, setSimBasePrice] = useState<number>(30);
  const [promoScheduleType, setPromoScheduleType] = useState<'immediate' | 'date' | 'day_of_month'>('immediate');

  // Templates de Mensagens por Grupo
  const BROADCAST_TEMPLATES: Record<string, { label: string; badge: string; text: string }> = {
    expired: {
      label: 'Clientes Vencidos',
      badge: 'Volte a Renovar (Vencidos)',
      text: `Olá {nome}! Tudo bem? 📺

Notamos que seu acesso venceu em {vencimento}. Sentimos sua falta por aqui! 😔

Preparamos uma liberação imediata para você voltar hoje mesmo com o melhor do futebol, filmes e séries:
👉 Reativar agora: {link_renovacao}

🔑 Chave PIX: {pix_key}
💰 Valor da assinatura: {valor_mensal}

Após o PIX, a liberação é 100% automática em menos de 1 minuto. Se precisar de qualquer ajuda, basta responder aqui! 🤝`
    },
    '3days': {
      label: 'Vencendo em 3 Dias',
      badge: 'Lembrete Urgente (3 Dias)',
      text: `Olá {nome}! Lembrete importante sobre sua assinatura ⏰

Seu plano vence em breve, no dia {vencimento}.

Para não ficar sem seus canais favoritos, filmes e jogos ao vivo, garanta sua renovação antecipada:
👉 Renovar com ativação imediata: {link_renovacao}

🔑 Chave PIX: {pix_key}
💰 Valor: {valor_mensal}

A liberação é automática. Obrigado pela sua confiança! 🍿✨`
    },
    '7days': {
      label: 'Vencendo em 7 Dias',
      badge: 'Lembrete Prévio (7 Dias)',
      text: `Olá {nome}! Tudo bem? 🗓️

Passando para lembrar com carinho que sua assinatura vence na próxima semana, no dia {vencimento}.

Garanta sua tranquilidade renovando com calma quando for melhor para você:
👉 {link_renovacao}

🔑 Chave PIX: {pix_key}
💰 Valor: {valor_mensal}

Qualquer dúvida estamos à sua total disposição! 📺`
    },
    active: {
      label: 'Clientes Ativos',
      badge: 'Novidades no Catálogo (Ativos)',
      text: `Olá {nome}! Esperamos que esteja aproveitando ao máximo seus canais, filmes e séries! 🚀🍿

Passando para avisar que adicionamos novos filmes em cartaz, episódios inéditos e canais otimizados na sua grade hoje!

Seu acesso está ativo até {vencimento}.
Para consultar os detalhes do seu plano ou suporte:
👉 {link_renovacao}

Aproveite o melhor do entretenimento! 🎬🔥`
    },
    resellers_all: {
      label: "Todas as Revendas (Fatura Mensal)",
      badge: "Fatura",
      text: `🧾 *FECHAMENTO DE FATURA MENSAL*\n\n` +
            `Olá, *{nome}*! Segue o demonstrativo dos clientes ativos da sua rede:\n\n` +
            `👥 *Clientes Ativos:* {clientes_ativos}\n` +
            `💰 *Valor Total da Fatura:* R$ {total_fatura}\n` +
            `📅 *Vencimento:* Todo dia {dia_vencimento}\n\n` +
            `👉 *Acesse seu link de renovação/pagamento:*\n` +
            `{link_renovacao}\n\n` +
            `Caso prefira pagar direto pelo PIX:\n` +
            `🔑 *Chave PIX:* \`{pix_key}\` ({pix_beneficiario})\n\n` +
            `Qualquer dúvida ou comprovante, envie aqui! 🚀`
    },
    resellers_pending: {
      label: "Revendas com Fatura Pendente",
      badge: "Pendente",
      text: `⚠️ *LEMBRETE DE FATURA PENDENTE*\n\n` +
            `Olá, *{nome}*! Consta pendente o acerto da sua rede deste mês:\n\n` +
            `👥 *Clientes Ativos:* {clientes_ativos}\n` +
            `💰 *Valor da Fatura:* R$ {total_fatura}\n` +
            `📅 *Vencimento:* Dia {dia_vencimento}\n\n` +
            `👉 *Pague com facilidade pelo seu link exclusivo:*\n` +
            `{link_renovacao}\n\n` +
            `🔑 *Chave PIX:* \`{pix_key}\` ({pix_beneficiario})\n\n` +
            `Favor encaminhar o comprovante após a transferência!`
    },
    resellers_paid: {
      label: "Revendas com Fatura Paga (Agradecimento)",
      badge: "Quitado",
      text: `✅ *FATURA CONFIRMADA COM SUCESSO*\n\n` +
            `Olá, *{nome}*! Confirmamos o pagamento da fatura da sua rede no valor de R$ {total_fatura}.\n\n` +
            `Seus clientes e conexões continuam 100% ativos e liberados. Obrigado pela parceria! 🚀📺`
    },
    tests: {
      label: 'Testes Grátis',
      badge: 'Converter Teste em Assinante',
      text: `Olá {nome}! Tudo bem? 🎬

Esperamos que tenha gostado da nossa qualidade de canais, filmes e séries durante seu período de teste!

Para continuar assistindo sem travamentos e com acesso ilimitado a toda a programação, ative seu plano definitivo:
👉 {link_renovacao}

🔑 Chave PIX: {pix_key}
💰 Valor especial de adesão: {valor_mensal}

Ativação imediata e automática! Se tiver qualquer dúvida, basta responder aqui! 📱✨`
    },
    all: {
      label: 'Todos os Clientes',
      badge: 'Comunicado Geral (Todos)',
      text: `Olá {nome}! Comunicado importante sobre seu acesso 📢

Nossos servidores passaram por melhorias de velocidade e estabilidade para garantir a melhor experiência para você.

Acesse sua central para verificar seu vencimento ({vencimento}) e opções de renovação:
👉 {link_renovacao}

Dúvidas ou suporte? Responda a esta mensagem. Tenha um ótimo dia! 📺✨`
    }
  };

  // Broadcast State
  const [broadcastTarget, setBroadcastTarget] = useState<'all' | 'expired' | '3days' | '7days' | 'active' | 'tests' | 'resellers_all' | 'resellers_pending' | 'resellers_paid'>('all');
  const [broadcastMsg, setBroadcastMsg] = useState(
    BROADCAST_TEMPLATES.all.text
  );
  const [broadcastImage, setBroadcastImage] = useState('');
  const [broadcastDelay, setBroadcastDelay] = useState(4);
  const [broadcasting, setBroadcasting] = useState(false);
  const [broadcastResult, setBroadcastResult] = useState<string | null>(null);

  // Banner Upload State (Limite 5MB com Auto-Exclusão pós-envio)
  const MAX_BANNER_SIZE_MB = 5;
  const MAX_BANNER_BYTES = 5 * 1024 * 1024;
  const [bannerMode, setBannerMode] = useState<'upload' | 'url'>('upload');
  const [broadcastBannerFile, setBroadcastBannerFile] = useState<File | null>(null);
  const [broadcastBannerPreview, setBroadcastBannerPreview] = useState<string | null>(null);
  const [broadcastBannerBase64, setBroadcastBannerBase64] = useState<string | null>(null);
  const [broadcastBannerError, setBroadcastBannerError] = useState<string | null>(null);
  const [isDraggingBanner, setIsDraggingBanner] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const broadcastTextareaRef = useRef<HTMLTextAreaElement>(null);

  const handleBannerFileSelect = (file: File) => {
    setBroadcastBannerError(null);
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type.toLowerCase())) {
      setBroadcastBannerError('Formato inválido. Por favor, envie uma imagem nos formatos PNG, JPG, JPEG ou WEBP.');
      return;
    }

    if (file.size > MAX_BANNER_BYTES) {
      const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
      setBroadcastBannerError(`Arquivo excede o limite máximo permitido de ${MAX_BANNER_SIZE_MB} MB (tamanho atual: ${sizeMb} MB). Por favor, comprima a imagem ou selecione outro arquivo.`);
      return;
    }

    setBroadcastBannerFile(file);
    const objectUrl = URL.createObjectURL(file);
    setBroadcastBannerPreview(objectUrl);

    const reader = new FileReader();
    reader.onloadend = () => {
      setBroadcastBannerBase64(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveBanner = () => {
    if (broadcastBannerPreview && broadcastBannerPreview.startsWith('blob:')) {
      URL.revokeObjectURL(broadcastBannerPreview);
    }
    setBroadcastBannerFile(null);
    setBroadcastBannerPreview(null);
    setBroadcastBannerBase64(null);
    setBroadcastBannerError(null);
    setBroadcastImage('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleTargetChange = (newTarget: 'all' | 'expired' | '3days' | '7days' | 'active' | 'tests') => {
    setBroadcastTarget(newTarget);
    if (BROADCAST_TEMPLATES[newTarget]) {
      setBroadcastMsg(BROADCAST_TEMPLATES[newTarget].text);
    }
  };

  const applyTemplate = (templateKey: string) => {
    if (BROADCAST_TEMPLATES[templateKey]) {
      setBroadcastMsg(BROADCAST_TEMPLATES[templateKey].text);
    }
  };

  const insertBroadcastTag = (tag: string) => {
    if (!broadcastTextareaRef.current) {
      setBroadcastMsg(prev => prev + tag);
      return;
    }
    const textarea = broadcastTextareaRef.current;
    const start = textarea.selectionStart || 0;
    const end = textarea.selectionEnd || 0;
    const current = textarea.value;
    const updated = current.substring(0, start) + tag + current.substring(end);
    setBroadcastMsg(updated);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + tag.length, start + tag.length);
    }, 10);
  };

  // Test Message State
  const [testPhone, setTestPhone] = useState('');
  const [testMessage, setTestMessage] = useState('Olá! Mensagem de teste do robô WhatsApp.');
  const [sendingTest, setSendingTest] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Helper Universal de Requisição Autenticada
  const callApi = async (path: string, options: RequestInit = {}) => {
    const endpoints = apiService.getEndpoints(path);
    const authHeaders = apiService.getAuthHeaders();
    let lastError: string | null = null;

    for (const url of endpoints) {
      try {
        const res = await fetch(url, {
          ...options,
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            ...authHeaders,
            ...(options.headers || {})
          }
        });

        const data = await res.json().catch(() => null);
        if (res.ok) {
          return data || { success: true };
        }
        lastError = data?.error || data?.message || `HTTP ${res.status}`;
      } catch (err: any) {
        lastError = err.message;
      }
    }
    throw new Error(lastError || 'Falha na comunicação com o servidor.');
  };

  // 1. Carregar Slots
  const fetchSlots = async () => {
    try {
      setLoadingSlots(true);
      setSlotError(null);
      const data = await callApi('/api/v1/whatsapp/slots');
      const list = Array.isArray(data?.slots)
        ? data.slots
        : (Array.isArray(data?.slots?.slots) ? data.slots.slots : (Array.isArray(data?.data?.slots) ? data.data.slots : []));
      if (list && list.length > 0) {
        setSlots(list);
      }
    } catch (e: any) {
      console.warn('Aviso ao buscar slots:', e.message);
    } finally {
      setLoadingSlots(false);
    }
  };

  // 2. Carregar Configuração de Pagamento
  const fetchPaymentConfig = async () => {
    try {
      setLoadingConfig(true);
      const data = await callApi('/api/v1/reseller/payment-config');
      if (data && data.config) {
        setPaymentConfig(data.config);
      }
    } catch (e: any) {
      console.warn('Aviso ao buscar config de pagamentos:', e.message);
    } finally {
      setLoadingConfig(false);
    }
  };

  // 3. Carregar Configuração do Bot / Suporte
  const fetchBotConfig = async () => {
    try {
      setLoadingBotConfig(true);
      const data = await callApi('/api/v1/whatsapp/config');
      if (data && data.config) {
        setBotConfig(prev => ({ ...prev, ...data.config }));
      }
    } catch (e: any) {
      console.warn('Aviso ao buscar config do bot:', e.message);
    } finally {
      setLoadingBotConfig(false);
    }
  };

  // 4. Carregar Promoções
  const fetchPromotions = async () => {
    try {
      setLoadingPromos(true);
      const data = await callApi('/api/v1/promotions');
      if (data && Array.isArray(data.promotions)) {
        setPromotions(data.promotions);
      }
    } catch (e: any) {
      console.warn('Aviso ao buscar promoções:', e.message);
    } finally {
      setLoadingPromos(false);
    }
  };

  useEffect(() => {
    fetchSlots();
    fetchPaymentConfig();
    fetchBotConfig();
    fetchPromotions();
  }, []);

  // Conectar Slot e Obter QR Code
  const handleConnectSlot = async (slotNumber: number) => {
    try {
      setConnectingSlot(slotNumber);
      setSlotError(null);
      const data = await callApi(`/api/v1/whatsapp/slots/${slotNumber}/qrcode`, {
        method: 'POST'
      });

      const rawQr = data.qrcode || data.base64 || data.qrCode || (data.data && (data.data.qrcode || data.data.base64));
      if (rawQr) {
        let finalQr = rawQr;
        if (!finalQr.startsWith('http') && !finalQr.startsWith('data:image/')) {
          finalQr = `data:image/png;base64,${finalQr}`;
        }
        setQrCodeData({
          slot: slotNumber,
          qrCode: finalQr,
          pairingCode: data.pairingCode || data.pairing_code
        });
      } else if (data.connected) {
        alert(`Chip #${slotNumber} já está conectado e pronto!`);
      }
      fetchSlots();
    } catch (e: any) {
      setSlotError(`Erro ao gerar QR Code do Chip #${slotNumber}: ${e.message}`);
    } finally {
      setConnectingSlot(null);
    }
  };

  // Desconectar Slot
  const handleDisconnectSlot = async (slotNumber: number) => {
    if (!window.confirm(`Deseja realmente desconectar o Chip #${slotNumber}?`)) return;
    try {
      setDisconnectingSlot(slotNumber);
      await callApi(`/api/v1/whatsapp/slots/${slotNumber}/disconnect`, {
        method: 'POST'
      });
      if (qrCodeData?.slot === slotNumber) {
        setQrCodeData(null);
      }
      await fetchSlots();
    } catch (e: any) {
      alert(`Falha ao desconectar: ${e.message}`);
    } finally {
      setDisconnectingSlot(null);
    }
  };

  // Salvar Configurações de Gateway
  const handleSavePaymentConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingConfig(true);
      setSaveSuccess(false);
      const data = await callApi('/api/v1/reseller/payment-config', {
        method: 'POST',
        body: JSON.stringify(paymentConfig)
      });
      if (data && data.config) {
        setPaymentConfig(data.config);
      }
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (e: any) {
      alert(`Erro ao salvar: ${e.message}`);
    } finally {
      setSavingConfig(false);
    }
  };

  // Salvar Configurações do Bot & Suporte
  const handleSaveBotConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingBotConfig(true);
      setBotConfigSaved(false);
      const cleanPhone = normalizePhoneNumber(botConfig.supportPhone);
      const payload = {
        ...botConfig,
        supportPhone: cleanPhone
      };
      const data = await callApi('/api/v1/whatsapp/config', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      if (data && data.config) {
        setBotConfig(data.config);
      }
      setBotConfigSaved(true);
      setTimeout(() => setBotConfigSaved(false), 4000);
    } catch (e: any) {
      alert(`Erro ao salvar configurações do bot: ${e.message}`);
    } finally {
      setSavingBotConfig(false);
    }
  };

  // Salvar Promoção
  const handleSavePromotion = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingPromo(true);

      const payload = {
        ...promoForm,
        scheduledDate: promoScheduleType === 'date' ? promoForm.scheduledDate : null,
        scheduledDayOfMonth: promoScheduleType === 'day_of_month' ? Number(promoForm.scheduledDayOfMonth) : null,
        status: promoScheduleType === 'immediate' ? 'active' : 'scheduled'
      };

      const data = await callApi('/api/v1/promotions', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      if (data && data.promotion) {
        await fetchPromotions();
        setPromoFormOpen(false);
        alert(`Promoção "${data.promotion.title}" salva com sucesso!`);
      }
    } catch (e: any) {
      alert(`Erro ao salvar promoção: ${e.message}`);
    } finally {
      setSavingPromo(false);
    }
  };

  // Disparar Promoção Imediatamente para Clientes Diretos
  const handleBroadcastPromoNow = async (promoId: string) => {
    if (!window.confirm('Confirma o disparo imediato desta promoção para todos os seus clientes diretos?')) return;
    try {
      setBroadcastingPromoId(promoId);
      const data = await callApi(`/api/v1/promotions/${promoId}/broadcast-now`, {
        method: 'POST'
      });
      alert(data?.message || 'Disparo da promoção iniciado com sucesso!');
      await fetchPromotions();
    } catch (e: any) {
      alert(`Falha ao disparar promoção: ${e.message}`);
    } finally {
      setBroadcastingPromoId(null);
    }
  };

  // Excluir Promoção
  const handleDeletePromo = async (promoId: string) => {
    if (!window.confirm('Tem certeza que deseja excluir esta promoção?')) return;
    try {
      await callApi(`/api/v1/promotions/${promoId}`, {
        method: 'DELETE'
      });
      await fetchPromotions();
    } catch (e: any) {
      alert(`Falha ao excluir promoção: ${e.message}`);
    }
  };

  // Disparo de Teste com Round-Robin
  const handleSendTestMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTestPhone = normalizePhoneNumber(testPhone);
    if (!cleanTestPhone || !testMessage) return;
    try {
      setSendingTest(true);
      setTestResult(null);
      const data = await callApi('/api/v1/whatsapp/send', {
        method: 'POST',
        body: JSON.stringify({ phone: cleanTestPhone, message: testMessage })
      });
      if (data && data.success) {
        setTestResult({
          success: true,
          message: `Mensagem enviada com sucesso utilizando o Chip Slot #${data.slotUsed || 1}!`
        });
        setTestPhone('');
      } else {
        setTestResult({
          success: false,
          message: data?.error || 'Nenhum chip conectado ou erro ao enviar mensagem.'
        });
      }
    } catch (e: any) {
      setTestResult({
        success: false,
        message: 'Falha no envio: ' + e.message
      });
    } finally {
      setSendingTest(false);
    }
  };

  // Disparo em Massa Tradicional
  const handleStartBroadcast = async () => {
    if (!broadcastMsg.trim()) {
      alert('Por favor, informe a mensagem do comunicado antes de iniciar o disparo.');
      return;
    }
    const connectedCount = slots.filter(s => s.connected).length;
    if (connectedCount === 0) {
      alert('Atenção: É necessário ter pelo menos 1 Chip de WhatsApp conectado para disparar mensagens.');
      return;
    }

    const hasBanner = (bannerMode === 'upload' && Boolean(broadcastBannerBase64)) || (bannerMode === 'url' && Boolean(broadcastImage.trim()));

    if (!window.confirm(`Confirma o início do disparo em massa com intervalo de ${broadcastDelay}s entre mensagens para clientes diretos?${hasBanner ? '\n\nO banner enviado será utilizado e descartado automaticamente ao finalizar o disparo.' : ''}`)) return;

    try {
      setBroadcasting(true);
      setBroadcastResult(null);

      let mediaUrl = '';
      let mediaBase64 = '';

      if (bannerMode === 'upload' && broadcastBannerBase64) {
        // Tenta upload para obter URL temporária no servidor
        try {
          const upRes = await callApi('/api/v1/whatsapp/upload-banner', {
            method: 'POST',
            body: JSON.stringify({
              fileBase64: broadcastBannerBase64,
              fileName: broadcastBannerFile?.name || 'banner.jpg'
            })
          });
          if (upRes && upRes.url) {
            mediaUrl = upRes.url;
          } else {
            mediaBase64 = broadcastBannerBase64;
          }
        } catch {
          // Fallback seguro enviando Base64 direto
          mediaBase64 = broadcastBannerBase64;
        }
      } else if (bannerMode === 'url' && broadcastImage.trim()) {
        mediaUrl = broadcastImage.trim();
      }

      const data = await callApi('/api/v1/whatsapp/broadcast', {
        method: 'POST',
        body: JSON.stringify({
          message: broadcastMsg,
          targetGroup: broadcastTarget,
          delayMs: broadcastDelay * 1000,
          mediaUrl,
          mediaBase64
        })
      });

      // IMPORTANTE: O banner precisa ser apagado depois do envio
      handleRemoveBanner();

      setBroadcastResult(`✅ Disparo iniciado com sucesso para ${data.totalRecipients || 'todos os'} clientes diretos! O arquivo do banner foi transmitido e apagado da tela e do servidor.`);
    } catch (err: any) {
      setBroadcastResult(`Erro ao iniciar disparo: ${err.message}`);
    } finally {
      setBroadcasting(false);
    }
  };

  // Cálculo da simulação de promoção em tempo real
  const calculateSim = () => {
    const base = Number(simBasePrice) || 30;
    const months = Math.max(1, Number(promoForm.months) || 1);
    const original = base * months;
    let promoPrice = original;
    let savings = 0;
    let bonusDays = Number(promoForm.bonusDays) || 0;

    if (promoForm.type === 'fraction_discount') {
      const num = Number(promoForm.fractionNumerator) || 3;
      const den = Number(promoForm.fractionDenominator) || 4;
      promoPrice = Math.round((original * (num / den)) * 100) / 100;
      savings = Math.max(0, original - promoPrice);
    } else if (promoForm.type === 'percentage_discount') {
      const pct = Number(promoForm.discountPercent) || 20;
      savings = Math.round((original * (pct / 100)) * 100) / 100;
      promoPrice = Math.max(1, original - savings);
    } else if (promoForm.type === 'fixed_discount') {
      const disc = Number(promoForm.fixedDiscountValue) || 10;
      savings = Math.min(original - 1, disc);
      promoPrice = Math.max(1, original - savings);
    } else if (promoForm.type === 'bonus_days') {
      promoPrice = original;
      savings = 0;
      if (!bonusDays) bonusDays = 5;
    }

    const totalDays = (months * 30) + bonusDays;

    return {
      base,
      months,
      original,
      promoPrice,
      savings,
      bonusDays,
      totalDays
    };
  };

  const simResult = calculateSim();

  const renderSimMessagePreview = () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const renewBase = (origin.includes('fastcdn.fit') || origin.includes('137.131.166.160') || origin.includes('152.67.33.121') || origin.includes('localhost'))
      ? 'https://tvfast.lat'
      : (origin || 'https://tvfast.lat');

    return promoForm.messageTemplate
      .replace(/\{nome\}/g, 'João da Silva')
      .replace(/\{usuario\}/g, 'joaosilva')
      .replace(/\{vencimento\}/g, '15/10/2026')
      .replace(/\{valor_mensal\}/g, `R$ ${simResult.base.toFixed(2).replace('.', ',')}`)
      .replace(/\{meses_promocao\}/g, `${simResult.months} ${simResult.months === 1 ? 'mês' : 'meses'}`)
      .replace(/\{valor_original\}/g, `R$ ${simResult.original.toFixed(2).replace('.', ',')}`)
      .replace(/\{valor_promocional\}/g, `R$ ${simResult.promoPrice.toFixed(2).replace('.', ',')}`)
      .replace(/\{economia\}/g, `R$ ${simResult.savings.toFixed(2).replace('.', ',')}`)
      .replace(/\{dias_bonus\}/g, String(simResult.bonusDays))
      .replace(/\{total_dias\}/g, `${simResult.totalDays} dias`)
      .replace(/\{link_renovacao\}/g, `${renewBase}/renew/joaosilva`)
      .replace(/\{pix_key\}/g, paymentConfig.manualPixKey || 'seu-pix@empresa.com')
      .replace(/\{pix_beneficiario\}/g, paymentConfig.manualPixBeneficiary || botConfig.botName);
  };

  const connectedCount = slots.filter(s => Boolean(s.connected || s.status === 'open' || s.status === 'connected')).length;

  const insertTagToTemplate = (tag: string) => {
    setPromoForm(prev => ({
      ...prev,
      messageTemplate: prev.messageTemplate + ` ${tag} `
    }));
  };

  const cleanSupportPhone = (botConfig.supportPhone || '').replace(/\D/g, '');
  const supportWaLink = cleanSupportPhone
    ? `https://wa.me/${cleanSupportPhone.startsWith('55') ? cleanSupportPhone : `55${cleanSupportPhone}`}`
    : '#';

  const isMaster = isPanelMaster(profile?.username, profile) ||
    Boolean(profile?.is_master) ||
    Boolean(profile?.is_admin) ||
    profile?.role === 'master' ||
    profile?.role === 'admin' ||
    ['admin', 'andre2056', 'anderson'].includes((profile?.username || '').toLowerCase());

  const hasBotAccess = isMaster || Boolean(profile?.botAccess ?? profile?.bot_access);

  if (!hasBotAccess) {
    return (
      <div className="space-y-6 select-none max-w-3xl mx-auto py-12 px-4 animate-fade-in text-center">
        <div className="p-8 bg-[#15161E] border border-amber-500/30 rounded-3xl shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
          
          <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-5 shadow-lg">
            <Lock className="w-8 h-8" />
          </div>

          <span className="px-3 py-1 rounded-full text-xs font-bold border bg-amber-500/15 text-amber-400 border-amber-500/30 inline-flex items-center gap-1.5 uppercase tracking-wider mb-3">
            <ShieldAlert className="w-3.5 h-3.5" />
            Módulo Bloqueado
          </span>

          <h2 className="text-2xl font-black text-white tracking-tight mb-2">
            Acesso ao Bot de WhatsApp Desativado
          </h2>

          <p className="text-sm text-[#92929F] max-w-lg mx-auto leading-relaxed mb-6">
            O módulo dinâmico de WhatsApp (atendimento automatizado, múltiplos chips, cobranças PIX e campanhas) não está liberado para o seu usuário nesta revenda.
          </p>

          <div className="bg-[#101117] border border-[#232530] rounded-2xl p-4 max-w-md mx-auto text-left space-y-2 mb-6">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#92929F]">Usuário:</span>
              <span className="font-mono font-bold text-white">{profile?.username || 'Revendedor'}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#92929F]">Status do Bot:</span>
              <span className="font-bold text-[#F1416C]">Bloqueado na sua árvore</span>
            </div>
            {Number(profile?.botMonthlyCredits ?? profile?.bot_monthly_credits ?? 0) > 0 && (
              <div className="flex items-center justify-between text-xs pt-1 border-t border-[#232530]">
                <span className="text-[#92929F]">Custo Mensal do Módulo:</span>
                <span className="font-bold text-amber-400 font-mono">
                  {profile?.botMonthlyCredits ?? profile?.bot_monthly_credits} créditos / mês
                </span>
              </div>
            )}
          </div>

          <p className="text-xs text-[#5E6278] max-w-md mx-auto mb-6">
            Para ativar este módulo na sua conta e usufruir de auto-atendimento e cobranças automatizadas, solicite a liberação diretamente ao seu revendedor superior ou administrador master.
          </p>

          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => navigate('/')}
              className="px-5 py-2.5 rounded-xl bg-[#1E202B] hover:bg-[#282B3A] text-white text-xs font-semibold transition-colors cursor-pointer"
            >
              Voltar ao Início
            </button>
            {profile?.whatsapp && (
              <a
                href={`https://wa.me/${(profile.whatsapp || '').replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-5 py-2.5 rounded-xl bg-[#50CD89] hover:bg-[#47b87a] text-black text-xs font-bold transition-all flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 cursor-pointer"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Contatar Suporte</span>
              </a>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 select-none max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold text-white tracking-tight">Central de WhatsApp & Automações</h1>
            <span className="bg-[#009EF7]/15 text-[#009EF7] border border-[#009EF7]/30 text-[10px] font-bold px-2 py-0.5 rounded">
              Isolamento por Revenda
            </span>
          </div>
          <p className="text-xs text-[#92929F] mt-1">
            Gestão dos seus 5 chips WhatsApp, fluxos de auto-atendimento com suporte humano, campanhas de desconto dinâmico e renovação PIX.
          </p>
        </div>

        {/* Tab Toggle */}
        <div className="flex flex-wrap items-center bg-[#14151C] p-1 rounded-xl border border-[#1E202B] gap-1">
          <button
            onClick={() => handleTabChange('slots')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'slots' ? 'bg-[#009EF7] text-white shadow-sm' : 'text-[#92929F] hover:text-white'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Chips ({connectedCount}/5)</span>
          </button>

          <button
            onClick={() => handleTabChange('flow')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'flow' ? 'bg-[#009EF7] text-white shadow-sm' : 'text-[#92929F] hover:text-white'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
            <span>Fluxo & Suporte</span>
          </button>

          <button
            onClick={() => handleTabChange('promotions')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'promotions' ? 'bg-[#009EF7] text-white shadow-sm' : 'text-[#92929F] hover:text-white'
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-amber-400" />
            <span>Campanhas & Promos ({promotions.length})</span>
          </button>

          <button
            onClick={() => handleTabChange('broadcast')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'broadcast' ? 'bg-[#009EF7] text-white shadow-sm' : 'text-[#92929F] hover:text-white'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>Disparo em Massa</span>
          </button>

          <button
            onClick={() => handleTabChange('gateways')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'gateways' ? 'bg-[#009EF7] text-white shadow-sm' : 'text-[#92929F] hover:text-white'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>Gateways PIX</span>
          </button>

          <button
            onClick={() => handleTabChange('test')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'test' ? 'bg-[#009EF7] text-white shadow-sm' : 'text-[#92929F] hover:text-white'
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            <span>Simulador</span>
          </button>
        </div>
      </div>

      {slotError && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{slotError}</span>
        </div>
      )}

      {/* TAB 1: SLOTS DE WHATSAPP (5 CHIPS) */}
      {activeTab === 'slots' && (
        <div className="space-y-6">
          <div className="p-4 bg-[#14151C] border border-[#1E202B] rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#50CD89]/10 border border-[#50CD89]/20 text-[#50CD89] flex items-center justify-center shrink-0">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white">Pool de Rodízio Multi-Chip (Round-Robin)</h2>
                <p className="text-xs text-[#92929F] mt-0.5">
                  Conecte até 5 números do seu atendimento. As mensagens são distribuídas automaticamente entre eles para evitar aquecimento e bloqueios de operadora.
                </p>
              </div>
            </div>
            <button
              onClick={fetchSlots}
              disabled={loadingSlots}
              className="p-2.5 bg-[#1A1C26] hover:bg-[#232635] border border-[#232635] rounded-xl text-[#92929F] hover:text-white transition-all self-end sm:self-auto cursor-pointer"
              title="Atualizar status"
            >
              <RefreshCw className={`w-4 h-4 ${loadingSlots ? 'animate-spin text-[#009EF7]' : ''}`} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5].map((slotNumber) => {
              const slotData = slots.find(s => Number(s.slot) === Number(slotNumber));
              const isConnected = Boolean(slotData?.connected || slotData?.status === 'open' || slotData?.status === 'connected');
              const isConnecting = connectingSlot === slotNumber;
              const isDisconnecting = disconnectingSlot === slotNumber;
              const hasQrThisSlot = qrCodeData?.slot === slotNumber;

              return (
                <div
                  key={slotNumber}
                  className={`bg-[#15161E] border rounded-2xl p-5 flex flex-col justify-between transition-all ${
                    isConnected
                      ? 'border-[#50CD89]/40 shadow-lg shadow-emerald-500/5'
                      : 'border-[#232635] hover:border-[#32364A]'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="w-7 h-7 rounded-lg bg-[#1E202B] text-white font-bold text-xs flex items-center justify-center">
                          #{slotNumber}
                        </span>
                        <h3 className="text-sm font-bold text-white">Chip Slot {slotNumber}</h3>
                      </div>
                      <span
                        className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${
                          isConnected
                            ? 'bg-[#50CD89]/15 text-[#50CD89] border-[#50CD89]/30'
                            : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                        }`}
                      >
                        {isConnected ? 'Conectado' : 'Desconectado'}
                      </span>
                    </div>

                    <p className="text-xs text-[#7E8299] mb-4">
                      {isConnected
                        ? `Número: ${slotData?.phone || 'Identificado'} ${slotData?.profileName ? `(${slotData.profileName})` : ''}`
                        : 'Aguardando pareamento de WhatsApp via QR Code'}
                    </p>

                    {hasQrThisSlot && !isConnected && qrCodeData && (
                      <div className="my-4 p-4 bg-white rounded-xl flex flex-col items-center justify-center border border-white/20">
                        <img
                          src={qrCodeData.qrCode}
                          alt="QR Code WhatsApp"
                          className="w-44 h-44 object-contain"
                        />
                        <p className="text-[11px] text-zinc-800 font-bold mt-2 text-center">
                          Aponte a câmera do WhatsApp para escanear
                        </p>
                        {qrCodeData.pairingCode && (
                          <div className="mt-2 text-center">
                            <span className="text-[10px] text-zinc-500 block">Ou código de pareamento:</span>
                            <span className="text-xs font-mono font-bold text-zinc-900 bg-zinc-100 px-2 py-1 rounded">
                              {qrCodeData.pairingCode}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="pt-4 border-t border-[#232635] flex items-center gap-2">
                    {!isConnected ? (
                      <button
                        onClick={() => handleConnectSlot(slotNumber)}
                        disabled={isConnecting}
                        className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-[#009EF7] hover:bg-[#0086d4] text-white font-bold text-xs transition-all disabled:opacity-50 cursor-pointer"
                      >
                        {isConnecting ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Gerando QR Code...</span>
                          </>
                        ) : (
                          <>
                            <QrCode className="w-3.5 h-3.5" />
                            <span>{hasQrThisSlot ? 'Atualizar QR Code' : 'Conectar Chip'}</span>
                          </>
                        )}
                      </button>
                    ) : (
                      <button
                        onClick={() => handleDisconnectSlot(slotNumber)}
                        disabled={isDisconnecting}
                        className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 font-bold text-xs transition-all disabled:opacity-50 cursor-pointer"
                      >
                        <Power className="w-3.5 h-3.5" />
                        <span>Desconectar Chip</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: FLUXO DE AUTO-ATENDIMENTO & SUPORTE HUMANO */}
      {activeTab === 'flow' && (
        <form onSubmit={handleSaveBotConfig} className="bg-[#15161E] border border-[#232635] rounded-2xl p-6 space-y-6 max-w-4xl">
          <div>
            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-emerald-400" />
              <h2 className="text-base font-bold text-white">Fluxo de Auto-Atendimento & Suporte Humano</h2>
            </div>
            <p className="text-xs text-[#92929F] mt-1">
              Configure como o robô deve acolher seus clientes diretos, liberar testes grátis, orientar sobre os aplicativos parceiros e transferir para o seu suporte humano.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Telefone de Suporte Humano (Mandatório) */}
            <div className="p-4 bg-[#1A1C26] border border-[#232635] rounded-xl space-y-2">
              <label className="text-xs font-bold text-white flex items-center justify-between">
                <span>Número do Suporte Humano:</span>
                <span className="text-[10px] text-emerald-400 uppercase font-black">Obrigatório</span>
              </label>
              <input
                type="text"
                value={botConfig.supportPhone}
                onChange={(e) => {
                  const val = e.target.value;
                  if (/\D/.test(val)) {
                    setBotConfig(prev => ({ ...prev, supportPhone: normalizePhoneNumber(val) }));
                  } else {
                    setBotConfig(prev => ({ ...prev, supportPhone: val.slice(0, 15) }));
                  }
                }}
                onPaste={(e) => {
                  e.preventDefault();
                  const text = e.clipboardData.getData('text');
                  setBotConfig(prev => ({ ...prev, supportPhone: normalizePhoneNumber(text) }));
                }}
                onBlur={() => {
                  setBotConfig(prev => ({ ...prev, supportPhone: normalizePhoneNumber(prev.supportPhone) }));
                }}
                placeholder="Ex: (51) 99336-1718 ou 5551999998888"
                className="w-full bg-[#111218] border border-[#232635] text-xs font-mono text-white p-3 rounded-xl focus:border-[#009EF7] focus:outline-none"
              />
              <p className="text-[11px] text-[#7E8299] leading-relaxed">
                Quando o cliente solicitar suporte humano (Opção 5), o bot enviará este número com o link direto <strong className="text-emerald-400">wa.me</strong> para ele iniciar a conversa com seu atendente.
              </p>
              {cleanSupportPhone && (
                <div className="pt-2">
                  <a
                    href={supportWaLink}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400 hover:text-emerald-300 transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Testar link direto: {supportWaLink}</span>
                  </a>
                </div>
              )}
            </div>

            {/* Código de Ativação do Parceiro */}
            <div className="p-4 bg-[#1A1C26] border border-[#232635] rounded-xl space-y-2">
              <label className="text-xs font-bold text-white block">
                Código de Provedor nos Apps Parceiros:
              </label>
              <input
                type="text"
                value={botConfig.partnerAppCode}
                onChange={(e) => setBotConfig(prev => ({ ...prev, partnerAppCode: e.target.value }))}
                placeholder="Ex: 0522464"
                className="w-full bg-[#111218] border border-[#232635] text-xs font-mono text-white p-3 rounded-xl focus:border-[#009EF7] focus:outline-none"
              />
              <p className="text-[11px] text-[#7E8299] leading-relaxed">
                Código digitado pelos clientes em Smart TVs (Samsung, LG), TV Box e Fire Stick nos aplicativos homologados (Vizzion, Blessed, Super, Assist+).
              </p>
            </div>
          </div>

          {/* Nome da Marca e Teste Grátis */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="text-xs font-semibold text-[#A1A5B7] block mb-1">
                Nome do Robô / Marca de Atendimento:
              </label>
              <input
                type="text"
                value={botConfig.botName}
                onChange={(e) => setBotConfig(prev => ({ ...prev, botName: e.target.value }))}
                placeholder="Ex: MediaCMS TV"
                className="w-full bg-[#111218] border border-[#232635] text-xs text-white p-3 rounded-xl focus:border-[#009EF7] focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-[#A1A5B7] block mb-1">
                Duração do Teste Grátis Automático (Opção 1):
              </label>
              <select
                value={botConfig.autoTestDurationHours}
                onChange={(e) => setBotConfig(prev => ({ ...prev, autoTestDurationHours: Number(e.target.value) }))}
                className="w-full bg-[#111218] border border-[#232635] text-xs text-white p-3 rounded-xl focus:border-[#009EF7] focus:outline-none"
              >
                <option value={2}>2 Horas de Teste</option>
                <option value={4}>4 Horas de Teste (Recomendado)</option>
                <option value={6}>6 Horas de Teste</option>
                <option value={12}>12 Horas de Teste</option>
              </select>
            </div>
          </div>

          {/* Mensagem Personalizada de Suporte Humano */}
          <div>
            <label className="text-xs font-semibold text-[#A1A5B7] block mb-1">
              Instrução enviada ao cliente para falar com suporte humano:
            </label>
            <textarea
              rows={3}
              value={botConfig.supportMessage}
              onChange={(e) => setBotConfig(prev => ({ ...prev, supportMessage: e.target.value }))}
              placeholder="Digite as orientações para o cliente..."
              className="w-full bg-[#111218] border border-[#232635] text-xs text-white p-3 rounded-xl focus:border-[#009EF7] focus:outline-none resize-none leading-relaxed"
            />
          </div>

          <div className="pt-2 flex items-center gap-3">
            <button
              type="submit"
              disabled={savingBotConfig}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#50CD89] hover:bg-[#47be7d] text-white font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50 cursor-pointer"
            >
              {savingBotConfig ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
              <span>{savingBotConfig ? 'Salvando...' : 'Salvar Fluxo de Atendimento'}</span>
            </button>
            {botConfigSaved && (
              <span className="text-xs font-semibold text-[#50CD89] flex items-center gap-1.5">
                <Check className="w-4 h-4" />
                Configurações do fluxo salvas com sucesso!
              </span>
            )}
          </div>
        </form>
      )}

      {/* TAB 3: CAMPANHAS & PROMOÇÕES DINÂMICAS */}
      {activeTab === 'promotions' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Flame className="w-5 h-5 text-amber-400" />
                <h2 className="text-base font-bold text-white">Promoções & Campanhas Dinâmicas</h2>
              </div>
              <p className="text-xs text-[#92929F] mt-1">
                Crie promoções com descontos calculados dinamicamente para cada cliente (ex: 2 meses por 3/4 do valor, bônus de +5 dias) e programe disparos com foto.
              </p>
            </div>

            <button
              onClick={() => {
                setPromoFormOpen(true);
                setPromoForm(prev => ({ ...prev, id: '' }));
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-black font-extrabold text-xs shadow-lg shadow-amber-500/20 transition-all cursor-pointer self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Criar Nova Promoção</span>
            </button>
          </div>

          {/* Modal / Card de Criação de Promoção */}
          {promoFormOpen && (
            <form onSubmit={handleSavePromotion} className="p-6 bg-[#15161E] border border-amber-500/30 rounded-2xl space-y-6 shadow-2xl">
              <div className="flex items-center justify-between pb-3 border-b border-[#232635]">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Flame className="w-4 h-4 text-orange-400" />
                  <span>Configurar Campanha Promocional</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setPromoFormOpen(false)}
                  className="text-xs text-[#7E8299] hover:text-white cursor-pointer"
                >
                  Cancelar
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-[#A1A5B7] block mb-1">
                    Título da Promoção:
                  </label>
                  <input
                    type="text"
                    value={promoForm.title}
                    onChange={(e) => setPromoForm(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Ex: Super Promoção 2 Meses - Pague 3/4"
                    className="w-full bg-[#111218] border border-[#232635] text-xs text-white p-3 rounded-xl focus:border-[#009EF7] focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#A1A5B7] block mb-1">
                    Tipo de Vantagem da Promoção:
                  </label>
                  <select
                    value={promoForm.type}
                    onChange={(e) => setPromoForm(prev => ({ ...prev, type: e.target.value as any }))}
                    className="w-full bg-[#111218] border border-[#232635] text-xs text-white p-3 rounded-xl focus:border-[#009EF7] focus:outline-none"
                  >
                    <option value="fraction_discount">Desconto Proporcional (Ex: Pague 3/4 do valor)</option>
                    <option value="bonus_days">Bônus de Dias Extras (Ex: Renove 30 e Ganhe +5 Dias)</option>
                    <option value="percentage_discount">Desconto em Porcentagem (%)</option>
                    <option value="fixed_discount">Desconto em Valor Fixo (R$)</option>
                  </select>
                </div>
              </div>

              {/* Parâmetros do Desconto / Bônus */}
              <div className="p-4 bg-[#1A1C26] rounded-xl border border-[#232635] grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-semibold text-[#A1A5B7] block mb-1">
                    Meses de Renovação:
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={12}
                    value={promoForm.months}
                    onChange={(e) => setPromoForm(prev => ({ ...prev, months: Number(e.target.value) }))}
                    className="w-full bg-[#111218] border border-[#232635] text-xs text-white p-2.5 rounded-xl focus:border-[#009EF7] focus:outline-none"
                  />
                  <span className="text-[10px] text-[#7E8299] mt-1 block">Ex: 2 meses</span>
                </div>

                {promoForm.type === 'fraction_discount' && (
                  <>
                    <div>
                      <label className="text-xs font-semibold text-[#A1A5B7] block mb-1">
                        Fração a Pagar (Numerador):
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={10}
                        value={promoForm.fractionNumerator}
                        onChange={(e) => setPromoForm(prev => ({ ...prev, fractionNumerator: Number(e.target.value) }))}
                        className="w-full bg-[#111218] border border-[#232635] text-xs text-white p-2.5 rounded-xl focus:border-[#009EF7] focus:outline-none"
                      />
                      <span className="text-[10px] text-[#7E8299] mt-1 block">Ex: 3 (de 3/4)</span>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-[#A1A5B7] block mb-1">
                        Fração Total (Denominador):
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={10}
                        value={promoForm.fractionDenominator}
                        onChange={(e) => setPromoForm(prev => ({ ...prev, fractionDenominator: Number(e.target.value) }))}
                        className="w-full bg-[#111218] border border-[#232635] text-xs text-white p-2.5 rounded-xl focus:border-[#009EF7] focus:outline-none"
                      />
                      <span className="text-[10px] text-[#7E8299] mt-1 block">Ex: 4 (de 3/4 = 75%)</span>
                    </div>
                  </>
                )}

                {promoForm.type === 'bonus_days' && (
                  <div>
                    <label className="text-xs font-semibold text-[#A1A5B7] block mb-1">
                      Dias Bônus Grátis:
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={60}
                      value={promoForm.bonusDays}
                      onChange={(e) => setPromoForm(prev => ({ ...prev, bonusDays: Number(e.target.value) }))}
                      className="w-full bg-[#111218] border border-[#232635] text-xs text-white p-2.5 rounded-xl focus:border-[#009EF7] focus:outline-none"
                    />
                    <span className="text-[10px] text-[#7E8299] mt-1 block">Ex: 5 dias adicionais</span>
                  </div>
                )}

                {promoForm.type === 'percentage_discount' && (
                  <div>
                    <label className="text-xs font-semibold text-[#A1A5B7] block mb-1">
                      Porcentagem de Desconto (%):
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={90}
                      value={promoForm.discountPercent}
                      onChange={(e) => setPromoForm(prev => ({ ...prev, discountPercent: Number(e.target.value) }))}
                      className="w-full bg-[#111218] border border-[#232635] text-xs text-white p-2.5 rounded-xl focus:border-[#009EF7] focus:outline-none"
                    />
                  </div>
                )}

                {promoForm.type === 'fixed_discount' && (
                  <div>
                    <label className="text-xs font-semibold text-[#A1A5B7] block mb-1">
                      Desconto em R$:
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={200}
                      value={promoForm.fixedDiscountValue}
                      onChange={(e) => setPromoForm(prev => ({ ...prev, fixedDiscountValue: Number(e.target.value) }))}
                      className="w-full bg-[#111218] border border-[#232635] text-xs text-white p-2.5 rounded-xl focus:border-[#009EF7] focus:outline-none"
                    />
                  </div>
                )}
              </div>

              {/* Anexo de Imagem da Promoção */}
              <div>
                <label className="text-xs font-semibold text-[#A1A5B7] block mb-1">
                  URL da Imagem / Banner da Promoção (Opcional):
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={promoForm.imageUrl}
                    onChange={(e) => setPromoForm(prev => ({ ...prev, imageUrl: e.target.value }))}
                    placeholder="https://sua-imagem-ou-banner.jpg"
                    className="w-full bg-[#111218] border border-[#232635] text-xs font-mono text-white p-3 rounded-xl focus:border-[#009EF7] focus:outline-none"
                  />
                </div>
                <p className="text-[11px] text-[#7E8299] mt-1">
                  Se informado, o robô enviará a imagem com a mensagem como legenda diretamente no WhatsApp!
                </p>
              </div>

              {/* Programação / Agendamento */}
              <div className="p-4 bg-[#1A1C26] rounded-xl border border-[#232635] space-y-3">
                <label className="text-xs font-bold text-white flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#009EF7]" />
                  <span>Programação / Agendamento do Envio:</span>
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setPromoScheduleType('immediate')}
                    className={`p-3 rounded-xl border text-xs font-bold text-left transition-all cursor-pointer ${
                      promoScheduleType === 'immediate'
                        ? 'bg-[#009EF7]/15 border-[#009EF7] text-white'
                        : 'bg-[#111218] border-[#232635] text-[#92929F]'
                    }`}
                  >
                    <span>Disparo Manual</span>
                    <span className="block text-[10px] text-[#7E8299] font-normal mt-0.5">Dispare quando desejar</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPromoScheduleType('day_of_month')}
                    className={`p-3 rounded-xl border text-xs font-bold text-left transition-all cursor-pointer ${
                      promoScheduleType === 'day_of_month'
                        ? 'bg-amber-500/15 border-amber-500 text-white'
                        : 'bg-[#111218] border-[#232635] text-[#92929F]'
                    }`}
                  >
                    <span>Dia Fixo do Mês</span>
                    <span className="block text-[10px] text-amber-300 font-normal mt-0.5">Ex: Todo dia 10</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPromoScheduleType('date')}
                    className={`p-3 rounded-xl border text-xs font-bold text-left transition-all cursor-pointer ${
                      promoScheduleType === 'date'
                        ? 'bg-[#009EF7]/15 border-[#009EF7] text-white'
                        : 'bg-[#111218] border-[#232635] text-[#92929F]'
                    }`}
                  >
                    <span>Data Específica</span>
                    <span className="block text-[10px] text-[#7E8299] font-normal mt-0.5">Data e hora marcadas</span>
                  </button>
                </div>

                {promoScheduleType === 'day_of_month' && (
                  <div className="pt-2">
                    <label className="text-xs text-[#A1A5B7] block mb-1">
                      Dia do Mês para disparo automático:
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={31}
                      value={promoForm.scheduledDayOfMonth || 10}
                      onChange={(e) => setPromoForm(prev => ({ ...prev, scheduledDayOfMonth: Number(e.target.value) }))}
                      className="w-32 bg-[#111218] border border-[#232635] text-xs text-white p-2.5 rounded-xl focus:border-[#009EF7] focus:outline-none"
                    />
                    <span className="text-[11px] text-[#7E8299] ml-2">Ex: Todo dia 10 do mês às 09:00</span>
                  </div>
                )}

                {promoScheduleType === 'date' && (
                  <div className="pt-2">
                    <label className="text-xs text-[#A1A5B7] block mb-1">
                      Data e Hora do Disparo:
                    </label>
                    <input
                      type="datetime-local"
                      value={promoForm.scheduledDate || ''}
                      onChange={(e) => setPromoForm(prev => ({ ...prev, scheduledDate: e.target.value }))}
                      className="bg-[#111218] border border-[#232635] text-xs text-white p-2.5 rounded-xl focus:border-[#009EF7] focus:outline-none"
                    />
                  </div>
                )}
              </div>

              {/* Mensagem e Tags Dinâmicas */}
              <div>
                <label className="text-xs font-semibold text-[#A1A5B7] block mb-1">
                  Mensagem do WhatsApp (Tags Dinâmicas):
                </label>
                <textarea
                  rows={8}
                  value={promoForm.messageTemplate}
                  onChange={(e) => setPromoForm(prev => ({ ...prev, messageTemplate: e.target.value }))}
                  className="w-full bg-[#111218] border border-[#232635] text-xs text-white p-3 rounded-xl focus:border-[#009EF7] focus:outline-none resize-none font-mono leading-relaxed"
                />

                <div className="mt-2 flex flex-wrap gap-1.5 items-center">
                  <span className="text-[11px] text-[#7E8299]">Inserir tag rápida:</span>
                  {[
                    '{nome}',
                    '{usuario}',
                    '{valor_original}',
                    '{valor_promocional}',
                    '{economia}',
                    '{meses_promocao}',
                    '{total_dias}',
                    '{dias_bonus}',
                    '{link_renovacao}',
                    '{pix_key}',
                    '{suporte_link}'
                  ].map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => insertTagToTemplate(tag)}
                      className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#1A1C26] hover:bg-[#232635] border border-[#232635] text-[#009EF7] transition-all cursor-pointer"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* Simulador Dinâmico em Tempo Real */}
              <div className="p-4 bg-gradient-to-br from-[#121824] to-[#0E121B] border border-[#009EF7]/30 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span>Simulador Dinâmico (Como o cliente verá):</span>
                  </h4>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-[#7E8299]">Simular com mensalidade:</span>
                    <input
                      type="number"
                      value={simBasePrice}
                      onChange={(e) => setSimBasePrice(Number(e.target.value))}
                      className="w-20 bg-[#111218] border border-[#232635] text-xs text-white p-1 rounded font-bold text-center"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                  <div className="p-2 bg-[#1A1C26] rounded-lg">
                    <span className="text-[#7E8299] text-[10px] block">Valor Normal:</span>
                    <span className="font-bold text-white line-through">
                      R$ {simResult.original.toFixed(2).replace('.', ',')}
                    </span>
                  </div>
                  <div className="p-2 bg-[#1A1C26] rounded-lg border border-emerald-500/20">
                    <span className="text-emerald-400 text-[10px] font-bold block">Valor na Promoção:</span>
                    <span className="font-extrabold text-emerald-400 text-sm">
                      R$ {simResult.promoPrice.toFixed(2).replace('.', ',')}
                    </span>
                  </div>
                  <div className="p-2 bg-[#1A1C26] rounded-lg">
                    <span className="text-[#009EF7] text-[10px] block">Economia do Cliente:</span>
                    <span className="font-bold text-[#009EF7]">
                      R$ {simResult.savings.toFixed(2).replace('.', ',')}
                    </span>
                  </div>
                  <div className="p-2 bg-[#1A1C26] rounded-lg">
                    <span className="text-amber-300 text-[10px] block">Validade Adicionada:</span>
                    <span className="font-bold text-amber-300">
                      {simResult.totalDays} Dias {simResult.bonusDays > 0 ? `(+${simResult.bonusDays} bônus)` : ''}
                    </span>
                  </div>
                </div>

                <div className="p-3 bg-[#111218] rounded-xl border border-[#232635] text-[11px] font-mono text-[#D0D4E4] whitespace-pre-line max-h-40 overflow-y-auto">
                  {renderSimMessagePreview()}
                </div>
              </div>

              <div className="flex items-center gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setPromoFormOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-[#1A1C26] text-xs font-semibold text-[#A1A5B7] hover:text-white cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingPromo}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-black font-extrabold text-xs shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
                >
                  {savingPromo ? 'Salvando Promoção...' : 'Salvar Campanha'}
                </button>
              </div>
            </form>
          )}

          {/* Lista de Promoções */}
          <div className="space-y-3">
            {loadingPromos ? (
              <div className="p-8 text-center text-[#92929F] flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-[#009EF7]" />
                <span>Carregando campanhas promocionais...</span>
              </div>
            ) : promotions.length === 0 ? (
              <div className="p-8 bg-[#15161E] border border-[#232635] rounded-2xl text-center">
                <Flame className="w-8 h-8 text-amber-500/40 mx-auto mb-2" />
                <h3 className="text-sm font-bold text-white mb-1">Nenhuma promoção configurada</h3>
                <p className="text-xs text-[#92929F] max-w-md mx-auto mb-4">
                  Crie campanhas personalizadas para incentivar renovações antecipadas com bônus de dias ou descontos calculados dinamicamente para cada cliente.
                </p>
                <button
                  onClick={() => setPromoFormOpen(true)}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-black font-bold text-xs cursor-pointer"
                >
                  Criar Primeira Promoção
                </button>
              </div>
            ) : (
              promotions.map((promo) => (
                <div
                  key={promo.id}
                  className="p-5 bg-[#15161E] border border-[#232635] rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all hover:border-[#32364A]"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-amber-400" />
                      <h4 className="text-sm font-bold text-white">{promo.title}</h4>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20">
                        {promo.type === 'fraction_discount' ? 'Desconto 3/4' : promo.type === 'bonus_days' ? 'Bônus de Dias' : 'Promoção Ativa'}
                      </span>
                    </div>

                    <p className="text-xs text-[#92929F]">
                      {promo.type === 'fraction_discount'
                        ? `Renovação de ${promo.months} meses pagando ${promo.fractionNumerator}/${promo.fractionDenominator} do valor.`
                        : promo.type === 'bonus_days'
                        ? `Renovação de ${promo.months} mês com +${promo.bonusDays} dias de bônus grátis.`
                        : `Desconto promocional aplicado na renovação.`}
                    </p>

                    <div className="flex items-center gap-4 text-[11px] text-[#7E8299] pt-1">
                      {promo.scheduledDayOfMonth && (
                        <span className="flex items-center gap-1 text-amber-300">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>Agendado: Todo dia {promo.scheduledDayOfMonth}</span>
                        </span>
                      )}
                      <span>Enviados: <strong className="text-white">{promo.appliedCount || 0}</strong></span>
                      {promo.lastSentAt && (
                        <span>Último envio: {new Date(promo.lastSentAt).toLocaleDateString('pt-BR')}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                    <button
                      onClick={() => handleBroadcastPromoNow(promo.id)}
                      disabled={broadcastingPromoId === promo.id || connectedCount === 0}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#50CD89] hover:bg-[#47be7d] text-white font-bold text-xs shadow-md shadow-emerald-500/20 transition-all disabled:opacity-40 cursor-pointer"
                      title="Disparar para todos os seus clientes diretos agora"
                    >
                      {broadcastingPromoId === promo.id ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Send className="w-3.5 h-3.5" />
                      )}
                      <span>Disparar Agora</span>
                    </button>

                    <button
                      onClick={() => handleDeletePromo(promo.id)}
                      className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition-all cursor-pointer"
                      title="Excluir promoção"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 4: DISPARO EM MASSA TRADICIONAL COM ISOLAMENTO E MÍDIA */}
      {activeTab === 'broadcast' && (
        <div className="bg-[#15161E] border border-[#232635] rounded-2xl p-6 space-y-6 max-w-3xl">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Radio className="w-4 h-4 text-[#009EF7]" />
              <span>Disparo em Massa para Clientes Diretos</span>
            </h2>
            <p className="text-xs text-[#92929F] mt-0.5">
              Envie comunicados, lembretes ou promoções com foto exclusivamente para os seus clientes diretos, com isolamento estrito de sub-revendas.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-[#A1A5B7] block mb-1">
                Público Alvo (Clientes Diretos):
              </label>
              <select
                value={broadcastTarget}
                onChange={(e) => handleTargetChange(e.target.value as any)}
                className="w-full bg-[#111218] border border-[#232635] text-xs text-white p-3 rounded-xl focus:border-[#009EF7] focus:outline-none cursor-pointer"
              >
                <option value="all">Todos os Seus Clientes Diretos</option>
                <option value="expired">Apenas Contas Já Vencidas</option>
                <option value="3days">Vencendo nos Próximos 3 Dias</option>
                <option value="7days">Vencendo nos Próximos 7 Dias</option>
                <option value="active">Apenas Contas Ativas</option>
                <option value="tests">Clientes em Teste Grátis / Expirados</option>
                <option disabled className="text-[#5E6278] bg-[#161822]">────────── REVENDEDORES ──────────</option>
                <option value="resellers_all">🏢 Todas as Suas Revendas Diretas (Com Fatura)</option>
                <option value="resellers_pending">⏳ Revendas com Fatura Pendente de Pagamento</option>
                <option value="resellers_paid">✅ Revendas com Fatura Já Quitada</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-[#A1A5B7] block mb-1">
                Intervalo Anti-Bloqueio entre Envios:
              </label>
              <select
                value={broadcastDelay}
                onChange={(e) => setBroadcastDelay(Number(e.target.value))}
                className="w-full bg-[#111218] border border-[#232635] text-xs text-white p-3 rounded-xl focus:border-[#009EF7] focus:outline-none cursor-pointer"
              >
                <option value={3}>3 segundos (Rápido)</option>
                <option value={4}>4 segundos (Recomendado)</option>
                <option value={6}>6 segundos (Conservador)</option>
                <option value={10}>10 segundos (Ultra Seguro)</option>
              </select>
            </div>
          </div>

          {/* BANNER UPLOAD & CONTROLES */}
          <div className="space-y-3 bg-[#111218] border border-[#232635] p-4 rounded-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-[#009EF7]" />
                <span className="text-xs font-semibold text-white">Banner / Imagem Promocional (Opcional)</span>
                <span className="text-[10px] bg-[#009EF7]/10 text-[#009EF7] px-2 py-0.5 rounded-full font-medium border border-[#009EF7]/20">Máx. 5 MB</span>
              </div>
              <div className="flex items-center gap-1 bg-[#1A1C24] p-0.5 rounded-lg border border-[#2B2E3D]">
                <button
                  type="button"
                  onClick={() => setBannerMode('upload')}
                  className={`text-[10px] font-medium px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                    bannerMode === 'upload' ? 'bg-[#009EF7] text-white' : 'text-[#7E8299] hover:text-white'
                  }`}
                >
                  Upload de Arquivo
                </button>
                <button
                  type="button"
                  onClick={() => setBannerMode('url')}
                  className={`text-[10px] font-medium px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                    bannerMode === 'url' ? 'bg-[#009EF7] text-white' : 'text-[#7E8299] hover:text-white'
                  }`}
                >
                  Link / URL Externa
                </button>
              </div>
            </div>

            {bannerMode === 'upload' ? (
              <div>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleBannerFileSelect(file);
                  }}
                  className="hidden"
                />

                {!broadcastBannerPreview ? (
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDraggingBanner(true);
                    }}
                    onDragLeave={() => setIsDraggingBanner(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDraggingBanner(false);
                      const file = e.dataTransfer.files?.[0];
                      if (file) handleBannerFileSelect(file);
                    }}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 ${
                      isDraggingBanner
                        ? 'border-[#009EF7] bg-[#009EF7]/10'
                        : 'border-[#262838] hover:border-[#009EF7]/60 hover:bg-[#161822]'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-xl bg-[#1D1F2C] border border-[#2A2D3E] flex items-center justify-center text-[#009EF7]">
                      <Upload className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-white">
                        Clique para selecionar ou arraste o banner aqui
                      </p>
                      <p className="text-[11px] text-[#7E8299] mt-0.5">
                        Formatos suportados: PNG, JPG, JPEG ou WEBP • Limite: <strong className="text-amber-400">5 MB</strong>
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row items-center gap-4 bg-[#161822] border border-[#262838] p-3 rounded-xl">
                    <img
                      src={broadcastBannerPreview}
                      alt="Banner Preview"
                      className="w-32 h-20 object-cover rounded-lg border border-[#262838] shrink-0 bg-black/40"
                    />
                    <div className="flex-1 min-w-0 text-center sm:text-left">
                      <div className="flex items-center gap-2 justify-center sm:justify-start">
                        <span className="text-xs font-bold text-white truncate max-w-[220px]">
                          {broadcastBannerFile?.name || 'banner_selecionado.jpg'}
                        </span>
                        <span className="text-[10px] bg-[#50CD89]/15 text-[#50CD89] border border-[#50CD89]/30 px-1.5 py-0.2 rounded font-semibold">
                          Pronto
                        </span>
                      </div>
                      <p className="text-[11px] text-[#7E8299] mt-0.5">
                        Tamanho: {broadcastBannerFile ? (broadcastBannerFile.size / (1024 * 1024)).toFixed(2) : '0'} MB / 5 MB
                      </p>
                      <p className="text-[10px] text-[#38BDF8] flex items-center gap-1 mt-1 justify-center sm:justify-start">
                        <ShieldCheck className="w-3 h-3 text-[#38BDF8]" />
                        <span>Será apagado da tela e do servidor automaticamente pós-envio</span>
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveBanner}
                      className="px-3 py-1.5 bg-[#F1416C]/10 hover:bg-[#F1416C]/20 border border-[#F1416C]/30 text-[#F1416C] rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remover</span>
                    </button>
                  </div>
                )}

                {broadcastBannerError && (
                  <div className="mt-2 p-2.5 bg-[#F1416C]/10 border border-[#F1416C]/30 text-[#F1416C] rounded-xl text-xs flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{broadcastBannerError}</span>
                  </div>
                )}
              </div>
            ) : (
              <div>
                <input
                  type="text"
                  value={broadcastImage}
                  onChange={(e) => setBroadcastImage(e.target.value)}
                  placeholder="https://exemplo.com/banner.jpg"
                  className="w-full bg-[#15161E] border border-[#232635] text-xs font-mono text-white p-3 rounded-xl focus:border-[#009EF7] focus:outline-none"
                />
              </div>
            )}
          </div>

          {/* TEMPLATES RÁPIDOS & TEXTAREA */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-xs font-semibold text-[#A1A5B7]">
                Mensagem do Comunicado:
              </label>
              <button
                type="button"
                onClick={() => applyTemplate(broadcastTarget)}
                className="text-[11px] text-[#009EF7] hover:underline flex items-center gap-1 font-semibold cursor-pointer"
              >
                <Sparkles className="w-3 h-3" />
                <span>Restaurar Modelo Padrão deste Grupo</span>
              </button>
            </div>

            {/* SELETOR RÁPIDO DE MODELOS / TEMPLATES */}
            <div className="bg-[#111218] border border-[#232635] p-3 rounded-xl space-y-2">
              <div className="text-[11px] font-semibold text-[#7E8299] flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-[#009EF7]" />
                <span>Modelos Prontos por Grupo (Clique para Aplicar):</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(BROADCAST_TEMPLATES).map(([key, tpl]) => {
                  const isCurrent = broadcastTarget === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => applyTemplate(key)}
                      className={`text-[11px] px-2.5 py-1 rounded-lg border font-medium transition-all flex items-center gap-1 cursor-pointer ${
                        isCurrent
                          ? 'bg-[#009EF7]/15 border-[#009EF7]/40 text-[#009EF7] font-bold'
                          : 'bg-[#151722] border-[#252838] text-[#92929F] hover:text-white hover:border-[#383B4F]'
                      }`}
                    >
                      <span>{tpl.badge}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <textarea
              ref={broadcastTextareaRef}
              rows={8}
              value={broadcastMsg}
              onChange={(e) => setBroadcastMsg(e.target.value)}
              className="w-full bg-[#111218] border border-[#232635] text-xs text-white p-3.5 rounded-xl focus:border-[#009EF7] focus:outline-none resize-none font-mono leading-relaxed"
            />

            <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-[#7E8299] pt-1">
              <span>Tags interativas (clique para inserir):</span>
              {[
                { tag: '{nome}', label: 'Nome' },
                { tag: '{usuario}', label: 'Usuário' },
                { tag: '{vencimento}', label: 'Vencimento' },
                { tag: '{valor_mensal}', label: 'Valor Mensal' },
                { tag: '{link_renovacao}', label: 'Link PIX' },
                { tag: '{pix_key}', label: 'Chave PIX' }
              ].map(({ tag, label }) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => insertBroadcastTag(tag)}
                  title={`Inserir ${tag} no texto`}
                  className="px-2 py-0.5 bg-[#1A1C24] hover:bg-[#009EF7]/20 border border-[#2B2E3D] hover:border-[#009EF7]/50 text-[#009EF7] font-mono text-[10px] rounded cursor-pointer transition-all"
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {broadcastResult && (
            <div className="p-3.5 bg-[#009EF7]/10 border border-[#009EF7]/30 text-[#009EF7] rounded-xl text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{broadcastResult}</span>
            </div>
          )}

          <div className="pt-2 flex items-center justify-between">
            <span className="text-xs text-[#7E8299]">
              Chips ativos: <strong className="text-white">{connectedCount} conectado(s)</strong>
            </span>
            <button
              onClick={handleStartBroadcast}
              disabled={broadcasting || connectedCount === 0}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#50CD89] hover:bg-[#47be7d] text-white font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-40 cursor-pointer"
            >
              {broadcasting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              <span>{broadcasting ? 'Iniciando Disparo...' : 'Iniciar Disparo em Massa'}</span>
            </button>
          </div>
        </div>
      )}

      {/* TAB 5: GATEWAYS PIX */}
      {activeTab === 'gateways' && (
        <form onSubmit={handleSavePaymentConfig} className="bg-[#15161E] border border-[#232635] rounded-2xl p-6 space-y-6 max-w-4xl">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-[#009EF7]" />
              <span>Formas de Recebimento PIX para Renovação</span>
            </h2>
            <p className="text-xs text-[#92929F] mt-0.5">
              Defina como seus clientes realizarão os pagamentos de renovação. O valor é creditado integralmente para você.
            </p>
          </div>

          <div className="space-y-4">
            <label className="text-xs font-semibold text-[#A1A5B7] block">Selecione o Método Ativo:</label>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <button
                type="button"
                onClick={() => setPaymentConfig(prev => ({ ...prev, activeGateway: 'pix_manual' }))}
                className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                  paymentConfig.activeGateway === 'pix_manual'
                    ? 'bg-[#009EF7]/15 border-[#009EF7] text-white shadow-lg shadow-[#009EF7]/10'
                    : 'bg-[#14151C] border-[#232635] text-[#92929F] hover:border-[#32364A]'
                }`}
              >
                <div className="font-bold text-xs">Chave PIX Direta</div>
                <div className="text-[11px] text-[#7E8299] mt-0.5">Comprovante via WhatsApp</div>
              </button>

              <button
                type="button"
                onClick={() => setPaymentConfig(prev => ({ ...prev, activeGateway: 'mercadopago' }))}
                className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                  paymentConfig.activeGateway === 'mercadopago'
                    ? 'bg-[#009EF7]/15 border-[#009EF7] text-white shadow-lg shadow-[#009EF7]/10'
                    : 'bg-[#14151C] border-[#232635] text-[#92929F] hover:border-[#32364A]'
                }`}
              >
                <div className="font-bold text-xs">Mercado Pago</div>
                <div className="text-[11px] text-[#7E8299] mt-0.5">Baixa Automática</div>
              </button>

              <button
                type="button"
                onClick={() => setPaymentConfig(prev => ({ ...prev, activeGateway: 'asaas' }))}
                className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                  paymentConfig.activeGateway === 'asaas'
                    ? 'bg-[#009EF7]/15 border-[#009EF7] text-white shadow-lg shadow-[#009EF7]/10'
                    : 'bg-[#14151C] border-[#232635] text-[#92929F] hover:border-[#32364A]'
                }`}
              >
                <div className="font-bold text-xs">Asaas Bank</div>
                <div className="text-[11px] text-[#7E8299] mt-0.5">Baixa Automática</div>
              </button>

              <button
                type="button"
                onClick={() => setPaymentConfig(prev => ({ ...prev, activeGateway: 'none' }))}
                className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                  paymentConfig.activeGateway === 'none'
                    ? 'bg-[#009EF7]/15 border-[#009EF7] text-white shadow-lg shadow-[#009EF7]/10'
                    : 'bg-[#14151C] border-[#232635] text-[#92929F] hover:border-[#32364A]'
                }`}
              >
                <div className="font-bold text-xs">Desabilitado</div>
                <div className="text-[11px] text-[#7E8299] mt-0.5">Apenas Contato Direto</div>
              </button>
            </div>

            {paymentConfig.activeGateway === 'pix_manual' && (
              <div className="space-y-4 p-5 bg-[#1A1C26] rounded-xl border border-[#232635]">
                <div className="flex items-center gap-2 text-xs font-bold text-[#009EF7]">
                  <CreditCard className="w-4 h-4" />
                  <span>Configuração da Chave PIX Direta</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-[#A1A5B7] block mb-1">Tipo de Chave:</label>
                    <select
                      value={paymentConfig.manualPixType}
                      onChange={(e) => setPaymentConfig(prev => ({ ...prev, manualPixType: e.target.value as any }))}
                      className="w-full bg-[#111218] border border-[#232635] text-xs text-white p-3 rounded-xl focus:border-[#009EF7] focus:outline-none"
                    >
                      <option value="celular">Celular / Telefone</option>
                      <option value="cpf">CPF</option>
                      <option value="cnpj">CNPJ</option>
                      <option value="email">E-mail</option>
                      <option value="aleatoria">Chave Aleatória (EVP)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-[#A1A5B7] block mb-1">Chave PIX:</label>
                    <input
                      type="text"
                      value={paymentConfig.manualPixKey}
                      onChange={(e) => setPaymentConfig(prev => ({ ...prev, manualPixKey: e.target.value }))}
                      placeholder="Sua chave PIX..."
                      className="w-full bg-[#111218] border border-[#232635] text-xs font-mono text-white p-3 rounded-xl focus:border-[#009EF7] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-[#A1A5B7] block mb-1">Nome do Favorecido:</label>
                    <input
                      type="text"
                      value={paymentConfig.manualPixBeneficiary}
                      onChange={(e) => setPaymentConfig(prev => ({ ...prev, manualPixBeneficiary: e.target.value }))}
                      placeholder="Ex: João da Silva"
                      className="w-full bg-[#111218] border border-[#232635] text-xs text-white p-3 rounded-xl focus:border-[#009EF7] focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {paymentConfig.activeGateway === 'mercadopago' && (
              <div className="space-y-4 p-5 bg-[#1A1C26] rounded-xl border border-[#232635]">
                <label className="text-xs font-semibold text-[#A1A5B7] block mb-1">
                  Access Token de Produção do Mercado Pago:
                </label>
                <input
                  type="password"
                  value={paymentConfig.mercadopagoAccessToken}
                  onChange={(e) => setPaymentConfig(prev => ({ ...prev, mercadopagoAccessToken: e.target.value }))}
                  placeholder="APP_USR-..."
                  className="w-full bg-[#111218] border border-[#232635] text-xs font-mono text-white p-3 rounded-xl focus:border-[#009EF7] focus:outline-none"
                />
              </div>
            )}

            {paymentConfig.activeGateway === 'asaas' && (
              <div className="space-y-4 p-5 bg-[#1A1C26] rounded-xl border border-[#232635]">
                <label className="text-xs font-semibold text-[#A1A5B7] block mb-1">
                  Chave de API (Access Token) do Asaas:
                </label>
                <input
                  type="password"
                  value={paymentConfig.asaasApiKey}
                  onChange={(e) => setPaymentConfig(prev => ({ ...prev, asaasApiKey: e.target.value }))}
                  placeholder="$aact_YTU5YTE0M2M6N2Z..."
                  className="w-full bg-[#111218] border border-[#232635] text-xs font-mono text-white p-3 rounded-xl focus:border-[#009EF7] focus:outline-none"
                />
              </div>
            )}

            <div className="pt-2 flex items-center gap-3">
              <button
                type="submit"
                disabled={savingConfig}
                className="px-6 py-2.5 rounded-xl bg-[#009EF7] hover:bg-[#0086d4] text-white font-bold text-xs shadow-lg shadow-[#009EF7]/20 transition-all disabled:opacity-50 cursor-pointer flex items-center gap-2"
              >
                {savingConfig ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                <span>{savingConfig ? 'Salvando...' : 'Salvar Formas de Recebimento'}</span>
              </button>
              {saveSuccess && (
                <span className="text-xs font-semibold text-[#50CD89] flex items-center gap-1.5">
                  <Check className="w-4 h-4" />
                  Salvo com sucesso!
                </span>
              )}
            </div>
          </div>
        </form>
      )}

      {/* TAB 6: SIMULADOR DE ENVIO */}
      {activeTab === 'test' && (
        <form onSubmit={handleSendTestMessage} className="bg-[#15161E] border border-[#232635] rounded-2xl p-6 space-y-4 max-w-2xl">
          <div>
            <h2 className="text-base font-bold text-white">Simulador de Disparo WhatsApp</h2>
            <p className="text-xs text-[#92929F] mt-0.5">
              Envie uma mensagem de teste para o seu próprio número e verifique qual dos seus chips responderá.
            </p>
          </div>

          <div>
            <label className="text-xs font-semibold text-[#A1A5B7] block mb-1">
              Telefone de Destino (com DDI e DDD):
            </label>
            <input
              type="text"
              value={testPhone}
              onChange={(e) => handlePhoneInputChange(e, setTestPhone)}
              onPaste={(e) => handlePhoneInputPaste(e, setTestPhone)}
              onBlur={() => handlePhoneInputBlur(testPhone, setTestPhone)}
              placeholder="Ex: (51) 99336-1718 ou 5511999998888"
              className="w-full bg-[#111218] border border-[#232635] text-xs font-mono text-white p-3 rounded-xl focus:border-[#009EF7] focus:outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-[#A1A5B7] block mb-1">
              Mensagem:
            </label>
            <textarea
              rows={3}
              value={testMessage}
              onChange={(e) => setTestMessage(e.target.value)}
              className="w-full bg-[#111218] border border-[#232635] text-xs text-white p-3 rounded-xl focus:border-[#009EF7] focus:outline-none resize-none"
            />
          </div>

          {testResult && (
            <div
              className={`p-3.5 rounded-xl text-xs border flex items-center gap-2 ${
                testResult.success
                  ? 'bg-[#50CD89]/10 border-[#50CD89]/30 text-[#50CD89]'
                  : 'bg-red-500/10 border-red-500/30 text-red-400'
              }`}
            >
              {testResult.success ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
              <span>{testResult.message}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={sendingTest || !testPhone}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#50CD89] hover:bg-[#47be7d] text-white font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50 cursor-pointer"
          >
            {sendingTest ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            <span>{sendingTest ? 'Enviando...' : 'Disparar Teste'}</span>
          </button>
        </form>
      )}
    </div>
  );
};
