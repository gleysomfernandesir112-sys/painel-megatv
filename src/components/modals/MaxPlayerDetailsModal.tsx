import React, { useState } from 'react';
import { Customer } from '../../types';
import { useSigmaStore } from '../../store/SigmaStore';
import {
  Tv2, X, Check, Copy, MessageCircle, Eye, EyeOff,
  ShieldCheck, RefreshCw, Smartphone, Monitor, ExternalLink, RotateCcw, AlertTriangle
} from 'lucide-react';
import { APP_CONFIG, useBrandConfig } from '../../config/appConfig';

interface MaxPlayerDetailsModalProps {
  customer: Customer;
  isOpen?: boolean;
  onClose: () => void;
  onReactivate?: () => void;
  onDeactivate?: (customer: Customer) => void;
}

export const MaxPlayerDetailsModal: React.FC<MaxPlayerDetailsModalProps> = ({
  customer,
  isOpen = true,
  onClose,
  onReactivate,
  onDeactivate
}) => {
  const brand = useBrandConfig();
  const franchisePrimary = brand.primaryColor || APP_CONFIG.primaryColor || '#009EF7';
  const { reactivateMaxPlayer } = useSigmaStore();

  const [showPassword, setShowPassword] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [copiedMsg, setCopiedMsg] = useState(false);
  const [reactivating, setReactivating] = useState(false);

  if (!isOpen || !customer) return null;

  const pApp = (customer.partnerApp || customer.partner_app || {}) as any;
  const appUser = pApp.appUser || customer.username || '';
  const appPass = pApp.appPassword || customer.password || (customer as any).plainPasswordPreview || '';
  const serverDns = pApp.dns || 'fastcdn.fit';
  const maxplayerId = pApp.userId || pApp.maxplayerId || '';
  const expDate = customer.expires_at || customer.vencimento || 'Ativo';
  const clientName = customer.name && customer.name !== customer.username ? customer.name : customer.username;

  // Status calculation: Inativo (> 3 dias), Vencido (< 3 dias) ou Ativo
  const isExpClient = customer.status === 'EXPIRED';
  const rawStatus = String(pApp.status || '').toLowerCase();
  const expTime = pApp.expiresAt || pApp.expires_at;
  let isOverThreeDays = false;
  if (expTime) {
    const expMs = new Date(expTime).getTime();
    if (!isNaN(expMs) && (Date.now() - expMs >= 3 * 24 * 3600 * 1000)) {
      isOverThreeDays = true;
    }
  } else if (isExpClient) {
    const clientExp = customer.expires_at || customer.vencimento;
    if (clientExp) {
      const ms = new Date(clientExp).getTime();
      if (!isNaN(ms) && (Date.now() - ms >= 3 * 24 * 3600 * 1000)) {
        isOverThreeDays = true;
      }
    }
  }

  const isInactive = rawStatus === 'inactive' || rawStatus === 'deactivated' || Boolean(pApp.deactivatedAt) || isOverThreeDays;
  const isExpired = !isInactive && (rawStatus === 'expired' || isExpClient);

  const whatsappMessage =
    `📺 *SEUS DADOS DE ACESSO - MAX PLAYER* 📺\n\n` +
    `Olá, *${clientName}*! Seguem os dados para acessar pelo aplicativo *Max Player*:\n\n` +
    `👤 *Usuário:* \`${appUser}\`\n` +
    `🔑 *Senha:* \`${appPass || 'A mesma senha do seu IPTV'}\`\n` +
    `🌐 *Servidor / DNS:* \`${serverDns}\`\n` +
    `📅 *Vencimento:* ${expDate}\n\n` +
    `📲 *Como conectar:*\n` +
    `1. Abra o aplicativo *Max Player* na sua Smart TV, TV Box ou celular.\n` +
    `2. Digite seu usuário e senha informados acima.\n` +
    `3. Seus canais, filmes e séries vão carregar automaticamente!\n\n` +
    `Qualquer dúvida, estamos à disposição! 🚀`;

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(whatsappMessage);
    setCopiedMsg(true);
    setTimeout(() => setCopiedMsg(false), 2500);
  };

  const handleOpenWhatsApp = () => {
    const phone = (customer.whatsapp || '').replace(/\D/g, '');
    const encoded = encodeURIComponent(whatsappMessage);
    if (phone) {
      window.open(`https://wa.me/${phone}?text=${encoded}`, '_blank', 'noopener,noreferrer');
    } else {
      window.open(`https://wa.me/?text=${encoded}`, '_blank', 'noopener,noreferrer');
    }
  };

  const handleReactivateApp = async () => {
    setReactivating(true);
    try {
      const res = await reactivateMaxPlayer(customer.username || customer.id, 30);
      if (res.success) {
        alert(res.message);
        onClose();
      } else {
        alert(res.message);
      }
    } catch (err: any) {
      alert(`Erro ao reativar: ${err.message || 'Falha de comunicação'}`);
    } finally {
      setReactivating(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-fade-in select-none"
      onClick={onClose}
    >
      <div
        className="bg-[#15171E] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col"
        style={{
          border: `1px solid ${franchisePrimary}40`
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 border-b border-[#262833]"
          style={{ backgroundColor: `${franchisePrimary}15` }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{
                backgroundColor: `${franchisePrimary}25`,
                border: `1px solid ${franchisePrimary}40`,
                color: franchisePrimary
              }}
            >
              <Tv2 className="w-5 h-5" style={{ color: franchisePrimary }} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white">Acesso Max Player</h3>
                {isInactive ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30 inline-flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                    Inativo (&gt;3d • Sem Custo)
                  </span>
                ) : isExpired ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/15 text-red-400 border border-red-500/30 inline-flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400"></span>
                    Vencido
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#50CD89]/15 text-[#50CD89] border border-[#50CD89]/30 inline-flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#50CD89] animate-pulse"></span>
                    Ativo
                  </span>
                )}
              </div>
              <p className="text-xs text-[#92929F]">Conta vinculada à API do Max Player</p>
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
        <div className="p-5 space-y-4">
          {/* Alerta de Inatividade (>3 dias) */}
          {isInactive && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/25 rounded-xl text-xs flex items-start gap-2.5 text-amber-300">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
              <div>
                <span className="font-bold block text-white">Aplicativo Inativo no Painel</span>
                <span>Este cliente está há mais de 3 dias inativo/vencido. O app foi desativado automaticamente e <strong>não conta no custo da revenda</strong>.</span>
              </div>
            </div>
          )}

          {/* Card Info Cliente */}
          <div className="bg-[#1A1C24] p-3 rounded-xl border border-[#262833] flex items-center justify-between">
            <div>
              <div className="text-[10px] text-[#5E6278] uppercase font-semibold">Cliente</div>
              <div className="text-xs font-bold text-white font-mono">{customer.username}</div>
              {customer.name && customer.name !== customer.username && (
                <div className="text-[11px] text-[#92929F]">{customer.name}</div>
              )}
            </div>
            <div className="text-right">
              <div className="text-[10px] text-[#5E6278] uppercase font-semibold">Revendedor</div>
              <div className="text-xs font-semibold text-[#009EF7] font-mono">
                {customer.reseller_username || 'Direto'}
              </div>
              {maxplayerId && (
                <div className="text-[10px] text-[#92929F]">ID: #{maxplayerId}</div>
              )}
            </div>
          </div>

          {/* Credenciais de Acesso */}
          <div className="space-y-2.5">
            {/* Usuário */}
            <div className="bg-[#1A1C24] p-2.5 rounded-xl border border-[#262833] flex items-center justify-between">
              <div>
                <span className="text-[10px] text-[#92929F] font-semibold block uppercase">Usuário Max Player</span>
                <span className="text-xs font-bold text-white font-mono">{appUser}</span>
              </div>
              <button
                type="button"
                onClick={() => copyToClipboard(appUser, 'user')}
                className="p-1.5 rounded-lg bg-[#232530] hover:bg-[#2c2f3d] text-[#92929F] hover:text-white transition-all cursor-pointer"
                title="Copiar Usuário"
              >
                {copiedField === 'user' ? <Check className="w-4 h-4 text-[#50CD89]" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>

            {/* Senha */}
            <div className="bg-[#1A1C24] p-2.5 rounded-xl border border-[#262833] flex items-center justify-between">
              <div>
                <span className="text-[10px] text-[#92929F] font-semibold block uppercase">Senha</span>
                <span className="text-xs font-bold text-white font-mono">
                  {showPassword ? (appPass || '(Mesma do IPTV)') : '••••••••'}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="p-1.5 rounded-lg bg-[#232530] hover:bg-[#2c2f3d] text-[#92929F] hover:text-white transition-all cursor-pointer"
                  title={showPassword ? 'Ocultar Senha' : 'Ver Senha'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" style={{ color: franchisePrimary }} />}
                </button>
                <button
                  type="button"
                  onClick={() => copyToClipboard(appPass, 'pass')}
                  className="p-1.5 rounded-lg bg-[#232530] hover:bg-[#2c2f3d] text-[#92929F] hover:text-white transition-all cursor-pointer"
                  title="Copiar Senha"
                >
                  {copiedField === 'pass' ? <Check className="w-4 h-4 text-[#50CD89]" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Servidor DNS */}
            <div className="bg-[#1A1C24] p-2.5 rounded-xl border border-[#262833] flex items-center justify-between">
              <div>
                <span className="text-[10px] text-[#92929F] font-semibold block uppercase">Servidor / DNS</span>
                <span className="text-xs font-bold text-[#009EF7] font-mono">{serverDns}</span>
              </div>
              <button
                type="button"
                onClick={() => copyToClipboard(serverDns, 'dns')}
                className="p-1.5 rounded-lg bg-[#232530] hover:bg-[#009EF7]/20 text-[#92929F] hover:text-[#009EF7] transition-all cursor-pointer"
                title="Copiar Servidor"
              >
                {copiedField === 'dns' ? <Check className="w-4 h-4 text-[#50CD89]" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Dica de Dispositivos */}
          <div
            className="p-3 rounded-xl text-xs text-[#92929F] flex items-center gap-3"
            style={{
              backgroundColor: `${franchisePrimary}0d`,
              border: `1px solid ${franchisePrimary}25`
            }}
          >
            <Monitor className="w-5 h-5 shrink-0" style={{ color: franchisePrimary }} />
            <span>Compatível com Smart TV Samsung, LG, Android TV, Fire TV Stick e Celulares.</span>
          </div>

          {/* Ações */}
          <div className="space-y-2 pt-1">
            {/* Botão de Reativar quando inativo ou vencido */}
            {(isInactive || isExpired) && (
              <button
                type="button"
                disabled={reactivating}
                onClick={handleReactivateApp}
                className="w-full py-2.5 px-4 rounded-xl bg-[#50CD89] hover:bg-[#47be7d] text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-emerald-500/20 disabled:opacity-50"
              >
                {reactivating ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Reativando no Max Player...</span>
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-4 h-4" />
                    <span>Reativar Max Player (30 Dias)</span>
                  </>
                )}
              </button>
            )}

            <button
              type="button"
              onClick={handleCopyMessage}
              className="w-full py-2.5 px-4 rounded-xl text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer hover:opacity-95"
              style={{
                backgroundColor: franchisePrimary,
                boxShadow: `0 4px 14px ${franchisePrimary}40`
              }}
            >
              {copiedMsg ? <Check className="w-4 h-4 text-white" /> : <Copy className="w-4 h-4" />}
              <span>{copiedMsg ? 'Mensagem Copiada!' : 'Copiar Dados de Acesso (WhatsApp)'}</span>
            </button>

            <button
              type="button"
              onClick={handleOpenWhatsApp}
              className="w-full py-2.5 px-4 rounded-xl bg-[#50CD89]/15 hover:bg-[#50CD89]/25 text-[#50CD89] border border-[#50CD89]/30 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Enviar Direto no WhatsApp</span>
            </button>

            {onDeactivate && !isInactive && (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm(`Deseja realmente desativar o aplicativo MaxPlayer do cliente ${customer.username}?`)) {
                    onDeactivate(customer);
                    onClose();
                  }
                }}
                className="w-full py-2 px-4 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/25 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <span>Desativar / Desvincular Max Player</span>
              </button>
            )}

            {onReactivate && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onReactivate();
                }}
                className="w-full py-2 text-center text-xs text-[#92929F] hover:text-white transition-colors cursor-pointer"
              >
                Reconfigurar ou Renovar Max Player
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
