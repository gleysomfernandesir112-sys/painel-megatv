import React, { useState, useEffect } from 'react';
import { Customer } from '../../types';
import { maxPlayerApi } from '../../services/maxplayer';
import { apiService } from '../../services/apiService';
import { useSigmaStore } from '../../store/SigmaStore';
import { useBrandConfig, getColorMode } from '../../config/appConfig';
import {
  X, CheckCircle2, AlertCircle, RefreshCw, Copy, Check,
  MessageCircle, Eye, EyeOff, Minus, Plus, Tv2,
  User, Lock, Wifi, Sparkles, ShieldCheck, ChevronDown, CheckCircle
} from 'lucide-react';

interface AppActivationModalProps {
  customer: Customer;
  initialAppType?: string;
  isOpen?: boolean;
  onClose: () => void;
  onSuccess?: (result: any) => void;
}

export const DEFAULT_PARTNER_APPS: Array<{ id: string; name: string }> = [
  { id: '10', name: 'IBO REVENDA' },
  { id: '22', name: 'IBONEW' },
  { id: '12', name: 'VU REVENDA' },
  { id: '15', name: 'UNI REVENDA' },
  { id: '17', name: 'TV ROKU - GPC PRO' },
  { id: '18', name: 'GPC PRO ANDROID' },
  { id: '21', name: 'Gerencia Max' },
  { id: '13', name: 'FACILITA' },
  { id: '11', name: 'ZONE X' },
];

export const AppActivationModal: React.FC<AppActivationModalProps> = ({
  customer,
  initialAppType,
  onClose,
  onSuccess
}) => {
  const brand = useBrandConfig();
  const isClassic = getColorMode(brand) === 'light';
  const { profile, refreshLiveData } = useSigmaStore();

  // App Selection
  const [selectedAppType, setSelectedAppType] = useState<'maxplayer' | string>(initialAppType || 'maxplayer');
  const [partnerApps, setPartnerApps] = useState<Array<{ id: string; name: string }>>(DEFAULT_PARTNER_APPS);
  const [loadingPartnerApps, setLoadingPartnerApps] = useState(false);

  // Form Fields
  const [username, setUsername] = useState(() => {
    const pApp = (customer.partner_app || customer.partnerApp) as any;
    return pApp?.appUser || customer.username || '';
  });
  const [password, setPassword] = useState(() => {
    const pApp = (customer.partner_app || customer.partnerApp) as any;
    return pApp?.appPassword || customer.password || '';
  });
  const [showPassword, setShowPassword] = useState(false);
  const [clientName, setClientName] = useState(customer.name || customer.username || '');
  const [connections, setConnections] = useState<number>(() => {
    return Number(customer.connections_max || customer.connections_count || customer.conectado || 1);
  });

  // Calculate default duration in days from customer expiration
  const [durationDays, setDurationDays] = useState<number>(() => {
    const expStr = customer.expires_at || customer.expiresAt || customer.vencimento;
    if (expStr) {
      if (expStr.includes('/')) {
        const parts = expStr.split('/');
        if (parts.length === 3) {
          const expDate = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
          const diffMs = expDate.getTime() - Date.now();
          const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
          if (diffDays > 0) return diffDays;
        }
      } else if (expStr.includes('-')) {
        const expDate = new Date(expStr);
        const diffMs = expDate.getTime() - Date.now();
        const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        if (diffDays > 0) return diffDays;
      }
    }
    return 30;
  });

  // Partner App MAC Address (if applicable)
  const [mac, setMac] = useState<string>(() => {
    const pApp = customer.partner_app || customer.partnerApp;
    return pApp?.mac || '';
  });

  // Status & Submission
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Success State
  const [successData, setSuccessData] = useState<{
    appName: string;
    username: string;
    password?: string;
    mac?: string;
    durationDays: number;
    whatsappMsg: string;
  } | null>(null);

  // Carrega aplicativos do GerenciaApp e mescla com a lista padrão
  useEffect(() => {
    setLoadingPartnerApps(true);
    apiService.getPartnerApps(false)
      .then((list) => {
        if (Array.isArray(list) && list.length > 0) {
          const merged = [...DEFAULT_PARTNER_APPS];
          list.forEach((item) => {
            if (!merged.find(m => m.id === String(item.id))) {
              merged.push({ id: String(item.id), name: String(item.name) });
            }
          });
          setPartnerApps(merged);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingPartnerApps(false));
  }, []);

  const handleMacChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^a-fA-F0-9]/g, '').toUpperCase().slice(0, 12);
    const formatted = raw.match(/.{1,2}/g)?.join(':') || raw;
    setMac(formatted);
    setError(null);
  };

  const handleStepMinus = () => {
    if (connections > 1) {
      setConnections(connections - 1);
    }
  };

  const handleStepPlus = () => {
    if (connections < 100) {
      setConnections(connections + 1);
    }
  };

  const handleUseIptvCredentials = () => {
    setUsername(customer.username || '');
    setPassword(customer.password || (customer as any).plainPasswordPreview || '');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // 1. MaxPlayer Activation Flow
    if (selectedAppType === 'maxplayer') {
      if (!username.trim()) {
        setError('O nome de usuário do aplicativo é obrigatório.');
        return;
      }
      if (!password.trim()) {
        setError('A senha do aplicativo é obrigatória.');
        return;
      }

      setIsSubmitting(true);
      try {
        const res = await maxPlayerApi.createUser({
          username: username.trim(),
          password: password.trim(),
          iptvUser: customer.username,
          iptvPass: (customer as any).plainPasswordPreview || customer.password || password.trim(),
          maxConnections: Math.max(1, connections),
          durationDays: Math.max(1, Math.round(durationDays))
        });

        if (!res.success) {
          throw new Error(res.error || 'Falha ao ativar cliente no MaxPlayer.');
        }

        const expDate = new Date();
        expDate.setDate(expDate.getDate() + durationDays);
        const expFormatted = `${String(expDate.getDate()).padStart(2, '0')}/${String(expDate.getMonth() + 1).padStart(2, '0')}/${expDate.getFullYear()}`;

        const displayName = clientName.trim() || customer.name || username.trim();

        const whatsappMsg =
          `✅ *Aplicativo MaxPlayer Ativado com Sucesso!*\n\n` +
          `Olá, *${displayName}*! Seu aplicativo *MaxPlayer* foi configurado com sucesso.\n\n` +
          `📱 *Aplicativo:* MaxPlayer IPTV\n` +
          `👤 *Usuário:* \`${username.trim()}\`\n` +
          `🔑 *Senha:* \`${password.trim()}\`\n` +
          `📅 *Validade:* ${expFormatted} (${durationDays} dias)\n` +
          `📶 *Telas permitidas:* ${connections}\n\n` +
          `📺 *Como assistir no aplicativo:*\n` +
          `1. Abra o aplicativo *MaxPlayer* na sua Smart TV ou aparelho.\n` +
          `2. Digite o *Usuário* e a *Senha* fornecidos acima.\n` +
          `3. Pronto! O conteúdo já estará 100% liberado.\n\n` +
          `Se precisar de suporte, estou à disposição! 🚀`;

        try {
          localStorage.setItem(`maxplayer_user_${customer.username}`, JSON.stringify({
            userId: res.user_id,
            activatedAt: new Date().toISOString(),
            durationDays
          }));
        } catch {}

        setSuccessData({
          appName: 'MaxPlayer IPTV',
          username: username.trim(),
          password: password.trim(),
          durationDays,
          whatsappMsg
        });

        if (refreshLiveData) refreshLiveData();
        if (onSuccess) onSuccess(res);
      } catch (err: any) {
        setError(err?.message || 'Erro inesperado ao ativar no MaxPlayer.');
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    // 2. Partner App (MAC-based) Activation Flow
    const cleanMac = mac.replace(/[^a-fA-F0-9]/g, '');
    if (cleanMac.length !== 12) {
      setError('O endereço MAC deve conter exatamente 12 caracteres hexadecimais (ex: 00:1A:79:AB:CD:EF).');
      return;
    }

    setIsSubmitting(true);
    try {
      const chosenApp = partnerApps.find(a => a.id === selectedAppType);
      const appName = chosenApp ? chosenApp.name : 'Aplicativo Parceiro';

      let expiryIso = '';
      if (customer.expires_at && customer.expires_at.includes('/')) {
        const parts = customer.expires_at.split('/');
        if (parts.length === 3) {
          expiryIso = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        }
      }
      if (!expiryIso) {
        const d = new Date();
        d.setDate(d.getDate() + durationDays);
        expiryIso = d.toISOString().slice(0, 10);
      }

      const res = await apiService.activatePartnerApp({
        login_usuario: customer.username,
        username: customer.username,
        customerId: customer.id,
        mac,
        appId: selectedAppType,
        mode: 'xteam',
        expiresAt: expiryIso
      });

      const expDate = new Date();
      expDate.setDate(expDate.getDate() + durationDays);
      const expFormatted = `${String(expDate.getDate()).padStart(2, '0')}/${String(expDate.getMonth() + 1).padStart(2, '0')}/${expDate.getFullYear()}`;

      const displayName = clientName.trim() || customer.username;

      const whatsappMsg =
        `✅ *Aplicativo Ativado com Sucesso!*\n\n` +
        `Olá, *${displayName}*! Seu aplicativo foi ativado com sucesso.\n\n` +
        `📱 *Aplicativo:* ${appName}\n` +
        `📺 *MAC Ativado:* \`${mac}\`\n` +
        `📅 *Válido até:* ${expFormatted} (${durationDays} dias)\n\n` +
        `Reinicie o aplicativo na sua TV para carregar a grade completa. Qualquer dúvida, estou à disposição! 😊`;

      setSuccessData({
        appName,
        username: customer.username,
        mac,
        durationDays,
        whatsappMsg
      });

      if (refreshLiveData) refreshLiveData();
      if (onSuccess) onSuccess(res.activation || res);
    } catch (err: any) {
      setError(err?.message || 'Falha ao ativar aplicativo no GerenciaApp.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopy = () => {
    if (!successData) return;
    navigator.clipboard.writeText(successData.whatsappMsg).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const handleOpenWhatsApp = () => {
    if (!successData) return;
    const phone = (customer.whatsapp || '').replace(/\D/g, '');
    const encoded = encodeURIComponent(successData.whatsappMsg);
    if (phone) {
      window.open(`https://wa.me/${phone}?text=${encoded}`, '_blank', 'noopener,noreferrer');
    } else {
      window.open(`https://wa.me/?text=${encoded}`, '_blank', 'noopener,noreferrer');
    }
  };

  const userCredits = profile?.credits ?? 0;
  const isUnlimited = !!profile?.creditos_ilimitados;

  const selectedAppName = selectedAppType === 'maxplayer'
    ? 'MaxPlayer IPTV'
    : (partnerApps.find(a => a.id === selectedAppType)?.name || 'Aplicativo Parceiro');

  const isMacApp = selectedAppType !== 'maxplayer';

  // ──────────────────────────────────────────
  // TELA DE SUCESSO ELEGANTE E MODERNA
  // ──────────────────────────────────────────
  if (successData) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-fade-in select-none">
        <div className={`w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border transition-all ${
          isClassic
            ? 'bg-white border-gray-200 text-gray-900'
            : 'bg-[#11141d] border-[#222838] text-white'
        }`}>
          {/* Header Sucesso */}
          <div className={`flex items-center justify-between px-6 py-4.5 border-b ${
            isClassic ? 'bg-gray-50 border-gray-100' : 'bg-[#161a26] border-[#202534]'
          }`}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-500 shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h2 className={`text-base font-bold tracking-tight ${isClassic ? 'text-gray-900' : 'text-white'}`}>
                  Aplicativo Ativado!
                </h2>
                <p className={`text-xs ${isClassic ? 'text-gray-500' : 'text-gray-400'}`}>
                  {successData.appName} • Acesso liberado instantaneamente
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                isClassic ? 'text-gray-400 hover:text-gray-700 hover:bg-gray-200' : 'text-gray-400 hover:text-white hover:bg-white/10'
              }`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 space-y-4">
            {/* Cards de Resumo */}
            <div className="grid grid-cols-2 gap-3">
              <div className={`p-3 rounded-xl border ${
                isClassic ? 'bg-gray-50 border-gray-200' : 'bg-[#161a26] border-[#202534]'
              }`}>
                <span className={`text-[10px] font-bold uppercase tracking-wider block mb-1 ${
                  isClassic ? 'text-gray-500' : 'text-gray-400'
                }`}>
                  Identificação do App
                </span>
                <span className={`text-xs font-mono font-bold block truncate ${
                  isClassic ? 'text-gray-900' : 'text-white'
                }`}>
                  {successData.mac || successData.username}
                </span>
              </div>

              <div className={`p-3 rounded-xl border ${
                isClassic ? 'bg-gray-50 border-gray-200' : 'bg-[#161a26] border-[#202534]'
              }`}>
                <span className={`text-[10px] font-bold uppercase tracking-wider block mb-1 ${
                  isClassic ? 'text-gray-500' : 'text-gray-400'
                }`}>
                  Validade da Ativação
                </span>
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 block">
                  {successData.durationDays} dias liberados
                </span>
              </div>
            </div>

            {/* Mensagem Formatada para WhatsApp */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className={`text-xs font-bold ${isClassic ? 'text-gray-700' : 'text-gray-300'}`}>
                  Mensagem Pronta para o Cliente
                </span>
                <span className={`text-[11px] ${isClassic ? 'text-gray-400' : 'text-gray-500'}`}>
                  Envie com um clique
                </span>
              </div>
              <div className={`rounded-xl p-3.5 border max-h-[220px] overflow-y-auto ${
                isClassic ? 'bg-gray-50 border-gray-200 text-gray-800' : 'bg-[#0a0d14] border-[#1d2230] text-gray-200'
              }`}>
                <pre className="text-xs font-sans whitespace-pre-wrap leading-relaxed select-text">
                  {successData.whatsappMsg}
                </pre>
              </div>
            </div>

            {/* Botões de Ação */}
            <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={handleCopy}
                className={`flex-1 w-full py-2.5 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 shadow-sm ${
                  copied
                    ? 'bg-emerald-600 text-white'
                    : isClassic
                      ? 'bg-[#0073b7] hover:bg-[#005f9e] text-white'
                      : 'bg-[#009EF7] hover:bg-[#0086d1] text-white'
                }`}
              >
                {copied ? <><Check className="w-4 h-4" /> Copiado!</> : <><Copy className="w-4 h-4" /> Copiar Mensagem</>}
              </button>

              <button
                type="button"
                onClick={handleOpenWhatsApp}
                className="flex-1 w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-[#25D366] hover:bg-[#20ba59] text-white transition-all cursor-pointer flex items-center justify-center gap-2 shadow-sm"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Enviar no WhatsApp</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ──────────────────────────────────────────
  // TELA DE ATIVAÇÃO REMODELADA E ELEGANTE
  // ──────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-3 sm:p-4 animate-fade-in select-none">
      <div className={`w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border transition-all flex flex-col max-h-[92vh] ${
        isClassic
          ? 'bg-white border-gray-200 text-gray-900'
          : 'bg-[#11141d] border-[#222838] text-white'
      }`}>
        {/* Top Header */}
        <div className={`flex items-center justify-between px-6 py-4 border-b ${
          isClassic ? 'bg-gray-50/80 border-gray-200' : 'bg-[#151924] border-[#222738]'
        }`}>
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-xs ${
              isClassic
                ? 'bg-blue-50 text-[#0073b7] border border-blue-200'
                : 'bg-[#009EF7]/15 text-[#009EF7] border border-[#009EF7]/30'
            }`}>
              <Tv2 className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className={`text-base font-bold tracking-tight truncate ${isClassic ? 'text-gray-900' : 'text-white'}`}>
                Ativar Aplicativo Parceiro
              </h2>
              <div className="flex items-center gap-2 mt-0.5 text-xs truncate">
                <span className={`font-medium ${isClassic ? 'text-gray-500' : 'text-gray-400'}`}>Cliente:</span>
                <span className="font-mono font-bold text-blue-600 dark:text-cyan-400">@{customer.username}</span>
                {customer.name && (
                  <span className={`truncate ${isClassic ? 'text-gray-400' : 'text-gray-500'}`}>
                    • {customer.name}
                  </span>
                )}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className={`p-1.5 rounded-xl transition-colors cursor-pointer shrink-0 ml-2 ${
              isClassic
                ? 'text-gray-400 hover:text-gray-700 hover:bg-gray-200/60'
                : 'text-gray-400 hover:text-white hover:bg-white/10'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulário Principal */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 overflow-y-auto text-xs flex-1">
          {/* Alerta de Erro */}
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-start gap-2.5 text-rose-500 text-xs animate-shake">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{error}</div>
              <button
                type="button"
                onClick={() => setError(null)}
                className="text-rose-500/70 hover:text-rose-500 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* 1. SELETOR DE APLICATIVO */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className={`block font-bold text-[11px] uppercase tracking-wider ${
                isClassic ? 'text-gray-600' : 'text-gray-400'
              }`}>
                Escolha o Aplicativo <span className="text-rose-500">*</span>
              </label>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                !isMacApp
                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                  : 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
              }`}>
                {!isMacApp ? 'Ativação Direta (Login)' : 'Ativação via MAC'}
              </span>
            </div>

            <div className="relative">
              <select
                value={selectedAppType}
                onChange={(e) => {
                  setSelectedAppType(e.target.value);
                  setError(null);
                }}
                className={`w-full rounded-xl px-3.5 py-2.5 text-xs font-semibold appearance-none cursor-pointer transition-all border outline-hidden ${
                  isClassic
                    ? 'bg-white border-gray-300 text-gray-900 focus:border-[#0073b7] focus:ring-2 focus:ring-[#0073b7]/15'
                    : 'bg-[#151924] border-[#262c3e] text-white focus:border-[#009EF7] focus:ring-2 focus:ring-[#009EF7]/20'
                }`}
              >
                <optgroup label="Ativação Nativa / Usuário e Senha">
                  <option value="maxplayer">MaxPlayer IPTV (Smart TVs, TV Box e Celular)</option>
                </optgroup>
                <optgroup label="Ativação Homologada por MAC (GerenciaApp)">
                  {partnerApps.map((app) => (
                    <option key={app.id} value={app.id}>
                      {app.name}
                    </option>
                  ))}
                </optgroup>
              </select>
              <div className="absolute right-3.5 top-3 pointer-events-none text-gray-400">
                <ChevronDown className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* 2. CARD DE CREDENCIAIS / CONFIGURAÇÃO DO APP */}
          {!isMacApp ? (
            /* SELEÇÃO: MAXPLAYER (LOGIN NO APP) */
            <div className={`p-4 rounded-xl border space-y-3.5 ${
              isClassic ? 'bg-gray-50/70 border-gray-200' : 'bg-[#151924]/80 border-[#222838]'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Lock className={`w-4 h-4 ${isClassic ? 'text-[#0073b7]' : 'text-[#009EF7]'}`} />
                  <span className={`font-bold text-xs ${isClassic ? 'text-gray-900' : 'text-white'}`}>
                    Credenciais de Login no MaxPlayer
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleUseIptvCredentials}
                  title="Preencher com os dados do cliente IPTV"
                  className={`text-[11px] font-semibold transition-colors flex items-center gap-1 cursor-pointer ${
                    isClassic ? 'text-[#0073b7] hover:underline' : 'text-cyan-400 hover:text-cyan-300'
                  }`}
                >
                  <Sparkles className="w-3 h-3" />
                  <span>Mesmos do IPTV</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Usuário */}
                <div className="space-y-1">
                  <label className={`block text-[11px] font-medium ${isClassic ? 'text-gray-600' : 'text-gray-400'}`}>
                    Usuário no App <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative flex items-center">
                    <User className="w-3.5 h-3.5 absolute left-3 text-gray-400 pointer-events-none" />
                    <input
                      type="text"
                      autoComplete="off"
                      autoCorrect="off"
                      spellCheck={false}
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="usuario_app"
                      required
                      className={`w-full rounded-xl pl-8.5 pr-3 py-2 text-xs font-mono transition-all border outline-hidden ${
                        isClassic
                          ? 'bg-white border-gray-300 text-gray-900 focus:border-[#0073b7] focus:ring-1 focus:ring-[#0073b7]'
                          : 'bg-[#0d1017] border-[#262c3e] text-white focus:border-[#009EF7] focus:ring-1 focus:ring-[#009EF7]'
                      }`}
                    />
                  </div>
                </div>

                {/* Senha */}
                <div className="space-y-1">
                  <label className={`block text-[11px] font-medium ${isClassic ? 'text-gray-600' : 'text-gray-400'}`}>
                    Senha no App <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative flex items-center">
                    <Lock className="w-3.5 h-3.5 absolute left-3 text-gray-400 pointer-events-none" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      autoCorrect="off"
                      spellCheck={false}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="senha_app"
                      required
                      className={`w-full rounded-xl pl-8.5 pr-9 py-2 text-xs font-mono transition-all border outline-hidden ${
                        isClassic
                          ? 'bg-white border-gray-300 text-gray-900 focus:border-[#0073b7] focus:ring-1 focus:ring-[#0073b7]'
                          : 'bg-[#0d1017] border-[#262c3e] text-white focus:border-[#009EF7] focus:ring-1 focus:ring-[#009EF7]'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 text-gray-400 hover:text-gray-200 transition-colors cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              <p className={`text-[11px] leading-relaxed ${isClassic ? 'text-gray-500' : 'text-gray-400'}`}>
                O cliente utilizará esses dados para fazer login diretamente no MaxPlayer na TV ou dispositivo.
              </p>
            </div>
          ) : (
            /* SELEÇÃO: APP PARCEIRO VIA MAC */
            <div className={`p-4 rounded-xl border space-y-3.5 ${
              isClassic ? 'bg-gray-50/70 border-gray-200' : 'bg-[#151924]/80 border-[#222838]'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wifi className={`w-4 h-4 ${isClassic ? 'text-[#0073b7]' : 'text-[#009EF7]'}`} />
                  <span className={`font-bold text-xs ${isClassic ? 'text-gray-900' : 'text-white'}`}>
                    Endereço MAC do Dispositivo
                  </span>
                </div>
                <span className={`text-[11px] font-mono font-bold ${
                  mac.replace(/[^a-fA-F0-9]/g, '').length === 12
                    ? 'text-emerald-500'
                    : isClassic ? 'text-gray-400' : 'text-gray-500'
                }`}>
                  {mac.replace(/[^a-fA-F0-9]/g, '').length}/12 caracteres
                </span>
              </div>

              <div className="space-y-1">
                <input
                  type="text"
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                  value={mac}
                  onChange={handleMacChange}
                  placeholder="00:1A:79:AB:CD:EF"
                  maxLength={17}
                  required
                  className={`w-full rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold uppercase tracking-widest transition-all border outline-hidden ${
                    isClassic
                      ? 'bg-white border-gray-300 text-gray-900 focus:border-[#0073b7] focus:ring-1 focus:ring-[#0073b7]'
                      : 'bg-[#0d1017] border-[#262c3e] text-white focus:border-[#009EF7] focus:ring-1 focus:ring-[#009EF7]'
                  }`}
                />
              </div>

              <p className={`text-[11px] leading-relaxed ${isClassic ? 'text-gray-500' : 'text-gray-400'}`}>
                Localize o código MAC exibido na tela inicial do <strong className={isClassic ? 'text-gray-900' : 'text-white'}>{selectedAppName}</strong> na TV do cliente.
              </p>
            </div>
          )}

          {/* 3. RESUMO DA CONTA IPTV VINCULADA */}
          <div className={`p-3 rounded-xl border flex flex-wrap items-center justify-between gap-2 text-xs ${
            isClassic
              ? 'bg-blue-50/50 border-blue-100 text-gray-700'
              : 'bg-[#0e131d] border-[#1d2636] text-gray-300'
          }`}>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>
                Vinculado à lista de <strong className="font-mono">@{customer.username}</strong>
              </span>
            </div>
            <div className="flex items-center gap-3 text-[11px]">
              <span className={`font-mono ${isClassic ? 'text-blue-700' : 'text-cyan-400'}`}>fastcdn.fit</span>
              <span className="text-emerald-500 font-semibold">• Sem custo IPTV extra</span>
            </div>
          </div>

          {/* 4. CONEXÕES & NOME OPCIONAL */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {/* Telas simultâneas */}
            <div className="space-y-1.5">
              <label className={`block font-medium text-[11px] ${isClassic ? 'text-gray-600' : 'text-gray-400'}`}>
                Telas Simultâneas
              </label>
              <div className={`flex items-center w-full rounded-xl border overflow-hidden ${
                isClassic ? 'bg-white border-gray-300' : 'bg-[#0d1017] border-[#262c3e]'
              }`}>
                <button
                  type="button"
                  onClick={handleStepMinus}
                  disabled={connections <= 1}
                  className={`w-10 h-9 flex items-center justify-center transition-colors disabled:opacity-30 cursor-pointer ${
                    isClassic ? 'hover:bg-gray-100 text-gray-700' : 'hover:bg-white/10 text-gray-300'
                  }`}
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <div className={`flex-1 text-center font-bold font-mono text-xs ${
                  isClassic ? 'text-gray-900' : 'text-white'
                }`}>
                  {connections} {connections === 1 ? 'tela' : 'telas'}
                </div>
                <button
                  type="button"
                  onClick={handleStepPlus}
                  disabled={connections >= 100}
                  className={`w-10 h-9 flex items-center justify-center transition-colors disabled:opacity-30 cursor-pointer ${
                    isClassic ? 'hover:bg-gray-100 text-gray-700' : 'hover:bg-white/10 text-gray-300'
                  }`}
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Nome do Cliente (Opcional) */}
            <div className="space-y-1.5">
              <label className={`block font-medium text-[11px] ${isClassic ? 'text-gray-600' : 'text-gray-400'}`}>
                Nome de Exibição (Opcional)
              </label>
              <input
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Ex: Nome do cliente"
                className={`w-full rounded-xl px-3.5 py-2 text-xs transition-all border outline-hidden ${
                  isClassic
                    ? 'bg-white border-gray-300 text-gray-900 focus:border-[#0073b7]'
                    : 'bg-[#0d1017] border-[#262c3e] text-white focus:border-[#009EF7]'
                }`}
              />
            </div>
          </div>

          {/* 5. RESUMO DE CRÉDITOS (BARRA DISCRETA E ELEGANTE) */}
          <div className={`px-4 py-2.5 rounded-xl border flex items-center justify-between text-xs ${
            isClassic
              ? 'bg-gray-50 border-gray-200 text-gray-600'
              : 'bg-[#151924]/60 border-[#222738] text-gray-400'
          }`}>
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Custo de Ativação:</span>
              <span className="font-bold text-emerald-500">0 créditos (Grátis)</span>
            </div>
            <div className="text-[11px]">
              Saldo: <strong className={isClassic ? 'text-gray-900' : 'text-white'}>
                {isUnlimited ? '∞ Ilimitado' : `${Number(userCredits).toFixed(2)} créditos`}
              </strong>
            </div>
          </div>

          {/* 6. FOOTER COM BOTÕES */}
          <div className={`flex items-center justify-end gap-2.5 pt-3 border-t ${
            isClassic ? 'border-gray-200' : 'border-[#222738]'
          }`}>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className={`px-5 py-2.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50 ${
                isClassic
                  ? 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  : 'text-gray-400 hover:bg-white/10 hover:text-white'
              }`}
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={isSubmitting || (!isMacApp ? (!username.trim() || !password.trim()) : (mac.replace(/[^a-fA-F0-9]/g, '').length !== 12))}
              className={`px-6 py-2.5 rounded-xl text-xs font-bold text-white transition-all cursor-pointer shadow-md disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 ${
                isClassic
                  ? 'bg-[#0073b7] hover:bg-[#005f9e]'
                  : 'bg-[#009EF7] hover:bg-[#0086d1] shadow-[#009EF7]/20'
              }`}
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Ativando aplicativo...</span>
                </>
              ) : (
                <span>Ativar {selectedAppName}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
