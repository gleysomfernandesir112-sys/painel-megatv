import React, { useState, useEffect } from 'react';
import { Customer } from '../../types';
import { maxPlayerApi } from '../../services/maxplayer';
import {
  Tv2, X, Sparkles, CheckCircle2, AlertCircle,
  RefreshCw, Copy, Check, MessageCircle, Eye, EyeOff,
  Calendar, Layers, ShieldCheck, ExternalLink
} from 'lucide-react';

interface ActivateMaxPlayerModalProps {
  customer: Customer;
  isOpen?: boolean;
  onClose: () => void;
  onSuccess?: (result: any) => void;
}

export const ActivateMaxPlayerModal: React.FC<ActivateMaxPlayerModalProps> = ({
  customer,
  onClose,
  onSuccess
}) => {
  // Pre-fill credentials with customer data
  const [username, setUsername] = useState(customer.username || '');
  const [password, setPassword] = useState(customer.password || '');
  const [showPassword, setShowPassword] = useState(false);
  const [maxConnections, setMaxConnections] = useState<number>(() => {
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

  const [isCheckingStatus, setIsCheckingStatus] = useState(true);
  const [isIntegrationReady, setIsIntegrationReady] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check previous activation from localStorage cache
  const [prevActivation, setPrevActivation] = useState<{ userId?: string; activatedAt?: string } | null>(() => {
    try {
      const saved = localStorage.getItem(`maxplayer_user_${customer.username}`);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Success view state
  const [successData, setSuccessData] = useState<{
    userId: string;
    username: string;
    password: string;
    durationDays: number;
    whatsappMsg: string;
  } | null>(null);

  const [copied, setCopied] = useState(false);

  // Check backend MaxPlayer status on mount
  useEffect(() => {
    setIsCheckingStatus(true);
    maxPlayerApi.getStatus()
      .then((status) => {
        setIsIntegrationReady(status.enabled && status.hasKey);
      })
      .catch(() => {
        setIsIntegrationReady(false);
      })
      .finally(() => {
        setIsCheckingStatus(false);
      });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!username.trim()) {
      setError('O nome de usuário é obrigatório.');
      return;
    }
    if (!password.trim()) {
      setError('A senha é obrigatória.');
      return;
    }
    if (durationDays < 1) {
      setError('A duração deve ser de pelo menos 1 dia.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await maxPlayerApi.createUser({
        username: username.trim(),
        password: password.trim(),
        iptvUser: customer.username || username.trim(),
        iptvPass: customer.password || password.trim(),
        maxConnections: Math.max(1, maxConnections),
        durationDays: Math.max(1, Math.round(durationDays))
      });

      if (!res.success) {
        throw new Error(res.error || 'Falha ao ativar cliente no MaxPlayer.');
      }

      // Calculate approximate expiration date for message
      const expDate = new Date();
      expDate.setDate(expDate.getDate() + durationDays);
      const expFormatted = `${String(expDate.getDate()).padStart(2, '0')}/${String(expDate.getMonth() + 1).padStart(2, '0')}/${expDate.getFullYear()}`;

      const clientDisplayName = customer.name && customer.name !== customer.username ? customer.name : username;

      // WhatsApp message formatted specifically for MaxPlayer
      const whatsappMsg =
        `✅ *MaxPlayer Ativado com Sucesso!*\n\n` +
        `Olá, *${clientDisplayName}*! Seu aplicativo MaxPlayer foi ativado e já está pronto para uso.\n\n` +
        `👤 *Usuário:* \`${username.trim()}\`\n` +
        `🔑 *Senha:* \`${password.trim()}\`\n` +
        `🌐 *Servidor:* fastcdn.fit\n` +
        `📅 *Válido até:* ${expFormatted} (${durationDays} dias)\n` +
        `📶 *Telas simultâneas:* ${maxConnections}\n\n` +
        `📺 *Como acessar no aplicativo:*\n` +
        `1. Abra o aplicativo *MaxPlayer* na sua Smart TV, TV Box ou dispositivo.\n` +
        `2. Selecione a opção de login e preencha com seu Usuário e Senha acima.\n` +
        `3. Seus canais, filmes e séries serão carregados automaticamente!\n\n` +
        `Qualquer dúvida, é só me chamar por aqui. Bom entretenimento! 🚀`;

      // Save activation state to localStorage
      try {
        localStorage.setItem(`maxplayer_user_${customer.username}`, JSON.stringify({
          userId: res.user_id,
          activatedAt: new Date().toISOString(),
          durationDays
        }));
      } catch {}

      setSuccessData({
        userId: res.user_id || 'OK',
        username: username.trim(),
        password: password.trim(),
        durationDays,
        whatsappMsg
      });

      if (onSuccess) onSuccess(res);
    } catch (err: any) {
      console.error('[ActivateMaxPlayerModal] Erro:', err);
      setError(err?.message || 'Erro inesperado ao ativar no MaxPlayer.');
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

  // ──────────────────────────────────────────
  // TELA DE SUCESSO
  // ──────────────────────────────────────────
  if (successData) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-fade-in select-none">
        <div className="bg-[#15171E] border border-[#262833] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
          {/* Header Sucesso */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#262833] bg-[#50CD89]/5">
            <div className="flex items-center gap-2.5 text-white font-bold text-base">
              <div className="p-2 rounded-xl bg-[#50CD89]/15 text-[#50CD89] border border-[#50CD89]/25">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[#50CD89]">MaxPlayer Ativado!</div>
                <p className="text-xs text-[#92929F] font-normal">Cliente registrado com sucesso no MaxPlayer</p>
              </div>
            </div>
            <button onClick={onClose} className="text-[#5E6278] hover:text-white p-1 rounded-lg transition-colors cursor-pointer">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 space-y-4">
            {/* Resumo */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-[#1A1C24] rounded-xl p-3 border border-[#262833] text-center">
                <div className="text-[10px] text-[#5E6278] uppercase tracking-wider mb-1">Usuário</div>
                <div className="text-xs text-white font-bold font-mono truncate">{successData.username}</div>
              </div>
              <div className="bg-[#1A1C24] rounded-xl p-3 border border-[#262833] text-center">
                <div className="text-[10px] text-[#5E6278] uppercase tracking-wider mb-1">Duração</div>
                <div className="text-xs text-[#50CD89] font-bold">{successData.durationDays} dias</div>
              </div>
              <div className="bg-[#1A1C24] rounded-xl p-3 border border-[#262833] text-center">
                <div className="text-[10px] text-[#5E6278] uppercase tracking-wider mb-1">ID MaxPlayer</div>
                <div className="text-[11px] text-[#9C27B0] font-mono font-bold truncate">#{successData.userId}</div>
              </div>
            </div>

            {/* Mensagem WhatsApp */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <MessageCircle className="w-3.5 h-3.5 text-[#25D366]" />
                <span className="text-xs font-semibold text-[#92929F]">Mensagem de acesso pronta para o WhatsApp:</span>
              </div>
              <div className="bg-[#0a1a10] border border-[#25D366]/25 rounded-xl p-4 relative max-h-[35vh] overflow-y-auto">
                <pre className="text-xs text-[#d4f5da] whitespace-pre-wrap font-sans leading-relaxed select-text">
                  {successData.whatsappMsg}
                </pre>
              </div>
            </div>

            {/* Botões */}
            <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-1">
              <button
                onClick={handleCopy}
                className={`flex-1 w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  copied
                    ? 'bg-[#50CD89] text-black shadow-lg shadow-[#50CD89]/25'
                    : 'bg-[#009EF7] hover:bg-[#0086D1] text-white shadow-lg shadow-blue-500/20'
                }`}
              >
                {copied ? (
                  <><Check className="w-4 h-4" /> Copiado!</>
                ) : (
                  <><Copy className="w-4 h-4" /> Copiar Mensagem</>
                )}
              </button>

              <button
                onClick={handleOpenWhatsApp}
                className="flex-1 w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold bg-[#25D366] hover:bg-[#20bb5a] text-white shadow-lg shadow-[#25D366]/20 transition-all cursor-pointer"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Abrir WhatsApp</span>
              </button>

              <button
                onClick={onClose}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-semibold text-[#92929F] hover:bg-[#1A1C24] border border-[#262833] transition-colors cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ──────────────────────────────────────────
  // TELA DE FORMULÁRIO
  // ──────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-fade-in select-none">
      <div className="bg-[#15171E] border border-[#262833] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#262833] shrink-0 bg-[#1A1C24]/60">
          <div className="flex items-center gap-2.5 text-white font-bold text-base">
            <div className="p-2 rounded-xl bg-[#9C27B0]/15 text-[#9C27B0] border border-[#9C27B0]/30">
              <Tv2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span>Ativar no MaxPlayer</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#9C27B0]/20 text-[#C084FC] border border-[#9C27B0]/30">
                  Sob Demanda
                </span>
              </div>
              <p className="text-xs text-[#92929F] font-normal">
                Liberação de acesso para o cliente no app MaxPlayer
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#5E6278] hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          {/* Banner de Aviso: Integração não configurada */}
          {!isCheckingStatus && !isIntegrationReady && (
            <div className="p-4 bg-[#FF9900]/10 border border-[#FF9900]/30 rounded-xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-[#FF9900] shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="text-sm font-bold text-[#FF9900] mb-0.5">Integração MaxPlayer não configurada</div>
                <div className="text-xs text-[#FF9900]/80">
                  A chave da API MaxPlayer não foi configurada ou a integração está desativada no servidor. Acesse <b>Configurações &gt; Integrações</b> para ativar.
                </div>
              </div>
            </div>
          )}

          {/* Banner de Erro de Envio */}
          {error && (
            <div className="p-4 bg-[#F1416C]/10 border border-[#F1416C]/30 rounded-xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-[#F1416C] shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="text-sm font-bold text-[#F1416C] mb-0.5">Falha na ativação</div>
                <div className="text-xs text-[#F1416C]/80">{error}</div>
              </div>
              <button type="button" onClick={() => setError(null)} className="text-[#F1416C]/50 hover:text-[#F1416C] cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Card Resumo do Cliente */}
          <div className="bg-[#1A1C24] p-3.5 rounded-xl border border-[#262833]/80 flex items-center justify-between">
            <div>
              <div className="text-[11px] text-[#5E6278] uppercase tracking-wider font-semibold">Cliente IPTV</div>
              <div className="text-sm text-white font-bold font-mono">{customer.username}</div>
              <div className="text-[11px] text-[#92929F]">{customer.name || 'Sem nome adicional'}</div>
            </div>
            <div className="text-right">
              <div className="text-[11px] text-[#5E6278] uppercase tracking-wider font-semibold">Vencimento Atual</div>
              <div className="text-xs text-[#50CD89] font-semibold">{customer.expires_at || customer.vencimento || 'N/A'}</div>
              <div className="text-[10px] text-[#92929F]">{customer.package || customer.package_name || 'Plano Completo'}</div>
            </div>
          </div>

          {/* Banner de Cliente já ativado anteriormente */}
          {prevActivation && (
            <div className="p-3 bg-[#9C27B0]/10 border border-[#9C27B0]/20 rounded-xl text-xs flex items-start gap-2.5 text-[#C084FC]">
              <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Cliente já ativado anteriormente no MaxPlayer:</span>
                <div className="text-[11px] text-[#92929F] mt-0.5">
                  ID: <span className="font-mono text-white">#{prevActivation.userId}</span>
                  {prevActivation.activatedAt && ` · Ativado em ${new Date(prevActivation.activatedAt).toLocaleDateString('pt-BR')}`}
                  <br />
                  <span className="text-[#C084FC]">Você pode reativar ou estender a assinatura preenchendo abaixo.</span>
                </div>
              </div>
            </div>
          )}

          {/* Campos de Login e Senha */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#92929F] mb-1.5">
                Usuário no MaxPlayer
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="login_do_cliente"
                className="w-full bg-[#1A1C24] border border-[#262833] rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-[#9C27B0] transition-colors"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#92929F] mb-1.5">
                Senha no MaxPlayer
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="senha_do_cliente"
                  className="w-full bg-[#1A1C24] border border-[#262833] rounded-xl px-3.5 pr-10 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-[#9C27B0] transition-colors"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-[#5E6278] hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          {/* Conexões e Duração */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#92929F] mb-1.5 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-[#50CD89]" />
                Conexões / Telas
              </label>
              <input
                type="number"
                min={1}
                max={10}
                value={maxConnections}
                onChange={(e) => setMaxConnections(Number(e.target.value))}
                className="w-full bg-[#1A1C24] border border-[#262833] rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#9C27B0] transition-colors"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#92929F] mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#009EF7]" />
                Duração (em dias)
              </label>
              <input
                type="number"
                min={1}
                max={730}
                value={durationDays}
                onChange={(e) => setDurationDays(Number(e.target.value))}
                className="w-full bg-[#1A1C24] border border-[#262833] rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#9C27B0] transition-colors"
                required
              />
            </div>
          </div>

          {/* Atalhos rápidos de duração */}
          <div>
            <span className="text-[11px] text-[#5E6278] block mb-1.5">Atalhos de duração:</span>
            <div className="flex items-center gap-2 flex-wrap">
              {[30, 60, 90, 180, 365].map((d) => (
                <button
                  type="button"
                  key={d}
                  onClick={() => setDurationDays(d)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                    durationDays === d
                      ? 'bg-[#9C27B0]/20 text-[#C084FC] border-[#9C27B0]/50 font-bold'
                      : 'bg-[#1A1C24] text-[#92929F] border-[#262833] hover:text-white'
                  }`}
                >
                  {d} dias {d === 30 ? '(1 mês)' : d === 90 ? '(3 meses)' : d === 180 ? '(6 meses)' : d === 365 ? '(1 ano)' : ''}
                </button>
              ))}
            </div>
          </div>

          {/* Servidor Vinculado */}
          <div className="bg-[#12131A] p-3 rounded-xl border border-[#232530] flex items-center justify-between text-xs">
            <span className="text-[#92929F]">Servidor DNS Vinculado:</span>
            <span className="font-mono text-white font-bold bg-[#1A1C24] px-2 py-0.5 rounded border border-[#262833]">
              fastcdn.fit
            </span>
          </div>

          {/* Footer / Botões */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#262833]">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-[#92929F] hover:bg-[#1A1C24] transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isCheckingStatus || !isIntegrationReady || !username.trim() || !password.trim()}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-[#9C27B0] hover:bg-[#8E24AA] shadow-lg shadow-[#9C27B0]/20 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Ativando no MaxPlayer...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Ativar no MaxPlayer
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
