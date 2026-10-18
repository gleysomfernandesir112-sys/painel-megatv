import React, { useState, useEffect } from 'react';
import { Customer } from '../../types';
import { apiService } from '../../services/apiService';
import { useSigmaStore } from '../../store/SigmaStore';
import {
  Sparkles, X, Smartphone, RefreshCw, CheckCircle2,
  AlertCircle, Calendar, Layers, Copy, Check, MessageCircle
} from 'lucide-react';

interface ActivatePartnerAppModalProps {
  customer: Customer;
  isOpen?: boolean;
  onClose: () => void;
  onSuccess?: (activation: any) => void;
}

export const ActivatePartnerAppModal: React.FC<ActivatePartnerAppModalProps> = ({
  customer,
  onClose,
  onSuccess
}) => {
  const { refreshLiveData } = useSigmaStore();
  const currentApp = customer.partner_app || customer.partnerApp;

  const [apps, setApps] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedAppId, setSelectedAppId] = useState<string>(currentApp?.appId || '');
  const [mac, setMac] = useState<string>(currentApp?.mac || '');
  const [mode, setMode] = useState<'xteam' | 'm3u8'>('xteam');
  const [expiresAt, setExpiresAt] = useState<string>(() => {
    if (customer.expires_at && customer.expires_at.includes('/')) {
      const parts = customer.expires_at.split('/');
      if (parts.length === 3) {
        return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
    }
    if (customer.expiresAt) {
      return customer.expiresAt.slice(0, 10);
    }
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    return d.toISOString().slice(0, 10);
  });

  const [isLoadingApps, setIsLoadingApps] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Estado de sucesso com dados completos da ativação
  const [successData, setSuccessData] = useState<{
    appName: string;
    mac: string;
    expiresAt: string;
    whatsappMsg: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  // Formata o endereço MAC dinamicamente: XX:XX:XX:XX:XX:XX
  const handleMacChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^a-fA-F0-9]/g, '').toUpperCase().slice(0, 12);
    const formatted = raw.match(/.{1,2}/g)?.join(':') || raw;
    setMac(formatted);
    setError(null);
  };

  const loadApps = async (forceRefresh = false) => {
    setIsLoadingApps(true);
    setError(null);
    try {
      const list = await apiService.getPartnerApps(forceRefresh);
      if (Array.isArray(list) && list.length > 0) {
        setApps(list);
        if (!selectedAppId || !list.find(a => a.id === selectedAppId)) {
          setSelectedAppId(list[0].id);
        }
      } else {
        setError('Nenhum aplicativo parceiro disponível nesta conta do GerenciaApp.');
      }
    } catch (err: any) {
      setError(err.message || 'Falha ao consultar aplicativos parceiros.');
    } finally {
      setIsLoadingApps(false);
    }
  };

  useEffect(() => {
    loadApps(false);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanMac = mac.replace(/[^a-fA-F0-9]/g, '');
    if (cleanMac.length !== 12) {
      setError('O endereço MAC deve conter exatamente 12 caracteres hexadecimais (ex: 00:1A:79:AB:CD:EF).');
      return;
    }

    if (!selectedAppId) {
      setError('Selecione um aplicativo parceiro para ativar.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await apiService.activatePartnerApp({
        login_usuario: customer.username,
        username: customer.username,
        customerId: customer.id,
        mac,
        appId: selectedAppId,
        mode,
        expiresAt
      });

      const chosenApp = apps.find(a => a.id === selectedAppId);
      const appName = chosenApp ? chosenApp.name : 'Aplicativo';

      // Formata data de validade para o Brasil
      const [y, m, d] = expiresAt.split('-');
      const expiryFormatted = `${d}/${m}/${y}`;

      // Monta a mensagem pronta para WhatsApp
      const whatsappMsg =
        `✅ *App Ativado com Sucesso!*\n\n` +
        `Olá! Seu aplicativo foi ativado com sucesso no nosso servidor.\n\n` +
        `📱 *Aplicativo:* ${appName}\n` +
        `📺 *MAC do Dispositivo:* \`${mac}\`\n` +
        `📅 *Válido até:* ${expiryFormatted}\n\n` +
        `Abra o aplicativo na sua TV e aproveite! Qualquer dúvida, é só chamar. 😊`;

      setSuccessData({ appName, mac, expiresAt: expiryFormatted, whatsappMsg });

      if (refreshLiveData) refreshLiveData();
      if (onSuccess) onSuccess(res.activation || res);
    } catch (err: any) {
      console.error('[ActivatePartnerAppModal] Erro na ativação:', err);
      setError(err.message || 'Falha ao ativar aplicativo no GerenciaApp.');
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

  // ──────────────────────────────────────────
  // TELA DE SUCESSO
  // ──────────────────────────────────────────
  if (successData) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-fade-in">
        <div className="bg-[#15171E] border border-[#262833] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
          {/* Header sucesso */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#262833] bg-[#50CD89]/5">
            <div className="flex items-center gap-2.5 text-white font-bold text-base">
              <div className="p-2 rounded-xl bg-[#50CD89]/15 text-[#50CD89] border border-[#50CD89]/25">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[#50CD89]">Ativação Concluída!</div>
                <p className="text-xs text-[#92929F] font-normal">Dispositivo cadastrado no GerenciaApp</p>
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
                <div className="text-[10px] text-[#5E6278] uppercase tracking-wider mb-1">Aplicativo</div>
                <div className="text-xs text-white font-bold leading-tight">{successData.appName}</div>
              </div>
              <div className="bg-[#1A1C24] rounded-xl p-3 border border-[#262833] text-center">
                <div className="text-[10px] text-[#5E6278] uppercase tracking-wider mb-1">MAC</div>
                <div className="text-[10px] text-white font-mono font-bold">{successData.mac}</div>
              </div>
              <div className="bg-[#1A1C24] rounded-xl p-3 border border-[#262833] text-center">
                <div className="text-[10px] text-[#5E6278] uppercase tracking-wider mb-1">Válido até</div>
                <div className="text-xs text-[#50CD89] font-bold">{successData.expiresAt}</div>
              </div>
            </div>

            {/* Mensagem WhatsApp */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <MessageCircle className="w-3.5 h-3.5 text-[#25D366]" />
                <span className="text-xs font-semibold text-[#92929F]">Mensagem pronta para WhatsApp</span>
              </div>
              <div className="bg-[#0a1a10] border border-[#25D366]/25 rounded-xl p-4 relative">
                <pre className="text-xs text-[#d4f5da] whitespace-pre-wrap font-sans leading-relaxed">
                  {successData.whatsappMsg}
                </pre>
              </div>
            </div>

            {/* Botões */}
            <div className="flex items-center gap-3 pt-1">
              <button
                onClick={handleCopy}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  copied
                    ? 'bg-[#50CD89] text-black shadow-lg shadow-[#50CD89]/25'
                    : 'bg-[#25D366] hover:bg-[#20bb5a] text-white shadow-lg shadow-[#25D366]/20'
                }`}
              >
                {copied ? (
                  <><Check className="w-4 h-4" /> Copiado!</>
                ) : (
                  <><Copy className="w-4 h-4" /> Copiar Mensagem WhatsApp</>
                )}
              </button>
              <button
                onClick={onClose}
                className="px-5 py-3 rounded-xl text-xs font-semibold text-[#92929F] hover:bg-[#1A1C24] border border-[#262833] transition-colors cursor-pointer"
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-fade-in">
      <div className="bg-[#15171E] border border-[#262833] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#262833] shrink-0 bg-[#1A1C24]/60">
          <div className="flex items-center gap-2.5 text-white font-bold text-base">
            <div className="p-2 rounded-xl bg-[#00E5FF]/10 text-[#00E5FF] border border-[#00E5FF]/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span>Ativar App Parceiro</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#00E5FF]/15 text-[#00E5FF] font-semibold border border-[#00E5FF]/30">
                  GerenciaApp
                </span>
              </div>
              <p className="text-xs text-[#92929F] font-normal">
                Ativação automática por MAC no painel do desenvolvedor
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
          {/* Banner de Erro — sempre visível no topo */}
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
              <div className="text-[11px] text-[#5E6278] uppercase tracking-wider font-semibold">Cliente</div>
              <div className="text-sm text-white font-bold">{customer.username}</div>
              <div className="text-[11px] text-[#92929F]">{customer.name || 'Sem nome registrado'}</div>
            </div>
            <div className="text-right">
              <div className="text-[11px] text-[#5E6278] uppercase tracking-wider font-semibold">Validade</div>
              <div className="text-xs text-[#50CD89] font-semibold">{customer.expires_at || 'Ilimitado'}</div>
              <div className="text-[10px] text-[#92929F]">{customer.package || 'Plano Completo'}</div>
            </div>
          </div>

          {/* Notificação de App já ativo */}
          {currentApp && (
            <div className="p-3 bg-[#00E5FF]/10 border border-[#00E5FF]/20 rounded-xl text-xs flex items-start gap-2.5 text-[#00E5FF]">
              <Smartphone className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Dispositivo já ativado:</span> {currentApp.appName}
                <div className="text-[11px] text-[#92929F] mt-0.5">
                  MAC: <span className="font-mono text-white">{currentApp.mac}</span>
                  {currentApp.activatedAt && ` · Ativado em ${new Date(currentApp.activatedAt).toLocaleDateString('pt-BR')}`}
                </div>
              </div>
            </div>
          )}

          {/* Seleção do Aplicativo Parceiro */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-[#92929F] flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5 text-[#00E5FF]" />
                Aplicativo Parceiro
              </label>
              <button
                type="button"
                onClick={() => loadApps(true)}
                disabled={isLoadingApps}
                className="text-[11px] text-[#00E5FF] hover:underline flex items-center gap-1 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3 h-3 ${isLoadingApps ? 'animate-spin' : ''}`} />
                Atualizar Lista
              </button>
            </div>

            {isLoadingApps ? (
              <div className="py-6 flex items-center justify-center gap-2 bg-[#1A1C24] border border-[#262833] rounded-xl text-xs text-[#92929F]">
                <RefreshCw className="w-4 h-4 animate-spin text-[#00E5FF]" />
                Carregando aplicativos do GerenciaApp...
              </div>
            ) : (
              <select
                value={selectedAppId}
                onChange={(e) => setSelectedAppId(e.target.value)}
                className="w-full bg-[#1A1C24] border border-[#262833] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#00E5FF] transition-colors cursor-pointer"
                required
              >
                {apps.map((app) => (
                  <option key={app.id} value={app.id}>
                    {app.name} (ID: {app.id})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Endereço MAC */}
          <div>
            <label className="block text-xs font-semibold text-[#92929F] mb-1.5">
              Endereço MAC do Dispositivo
            </label>
            <div className="relative">
              <input
                type="text"
                value={mac}
                onChange={handleMacChange}
                placeholder="00:1A:79:XX:XX:XX"
                className="w-full bg-[#1A1C24] border border-[#262833] rounded-xl px-3.5 py-2.5 text-xs text-white font-mono uppercase tracking-wider focus:outline-none focus:border-[#00E5FF] transition-colors"
                maxLength={17}
                required
              />
              <span className="absolute right-3.5 top-2.5 text-[10px] font-mono text-[#5E6278]">
                {mac.replace(/[^a-fA-F0-9]/g, '').length}/12
              </span>
            </div>
            <p className="text-[11px] text-[#5E6278] mt-1">
              Digite os 12 caracteres hexadecimais exibidos na tela do aplicativo na Smart TV ou TV Box.
            </p>
          </div>

          {/* Opções Avançadas: Modo e Vencimento */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-xs font-semibold text-[#92929F] mb-1.5 flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-[#50CD89]" />
                Modo da Playlist
              </label>
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value as any)}
                className="w-full bg-[#1A1C24] border border-[#262833] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#00E5FF] transition-colors cursor-pointer"
              >
                <option value="xteam">Xtream Codes (Recomendado)</option>
                <option value="m3u8">M3U Plus / HLS</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#92929F] mb-1.5 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-[#009EF7]" />
                Data de Expiração no App
              </label>
              <input
                type="date"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                className="w-full bg-[#1A1C24] border border-[#262833] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#00E5FF] transition-colors"
                required
              />
            </div>
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
              disabled={isSubmitting || isLoadingApps || !mac || mac.replace(/[^a-fA-F0-9]/g, '').length !== 12}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-black bg-[#00E5FF] hover:bg-[#00D0E8] shadow-lg shadow-[#00E5FF]/20 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Ativando no GerenciaApp...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Ativar Aplicativo
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
