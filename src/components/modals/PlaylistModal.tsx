import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Customer } from '../../types';
import { APP_CONFIG, isHostedOnGithub, getBrandApiEndpoints, getFranchiseDomain } from '../../config/appConfig';
import { useSigmaStore } from '../../store/SigmaStore';
import {
  Copy, Check, X, Settings, RotateCcw, Eye, Save, Sparkles, CheckCircle2, AlertCircle,
  FileText, KeyRound, ExternalLink, Tv2
} from 'lucide-react';
import { CustomerNotesModal } from './CustomerNotesModal';
import { AppActivationModal } from './AppActivationModal';

export const DEFAULT_CLIENT_DETAILS_TEMPLATE = `🎉 *Seus Dados de Acesso:*

👤 *Usuário:* {usuario}
🔑 *Senha:* {senha}
📦 *Plano:* {plano}
📅 *Vencimento:* {vencimento}
📶 *Conexões / Telas:* {conexoes}

🌐 *Servidor / DNS:*
{servidor}

⚡ *Smart TV / IBO Player / Fire Stick (Recomendado):*
{link_smart_tv}

📺 *Lista M3U (Link Curto):*
{link_curto_m3u}

📺 *Lista HLS (Link Curto):*
{link_curto_hls}

📺 *Lista Completa (M3U):*
{link_grande_m3u}`;

export const AVAILABLE_PLACEHOLDERS = [
  { tag: '{usuario}', label: 'Usuário' },
  { tag: '{senha}', label: 'Senha' },
  { tag: '{plano}', label: 'Plano' },
  { tag: '{preco_plano}', label: 'Preço' },
  { tag: '{link_pagamento}', label: 'Link Pagamento' },
  { tag: '{criado_em}', label: 'Data Criação' },
  { tag: '{vencimento}', label: 'Vencimento' },
  { tag: '{conexoes}', label: 'Conexões / Telas' },
  { tag: '{servidor}', label: 'URL Servidor' },
  { tag: '{link_smart_tv}', label: 'Smart TV (IBO/LG/Samsung/Fire)' },
  { tag: '{link_canais_ao_vivo}', label: 'Apenas Canais Ao Vivo' },
  { tag: '{link_curto_m3u}', label: 'Link Curto M3U' },
  { tag: '{link_curto_hls}', label: 'Link Curto HLS' },
  { tag: '{link_grande_m3u}', label: 'Link Completo M3U' },
  { tag: '{link_grande_hls}', label: 'Link Completo HLS' },
  { tag: '{link_ssiptv}', label: 'Link SSIPTV' },
  { tag: '{url_xciptv}', label: 'URL XCIPTV' },
  { tag: '{url_smarters}', label: 'URL Smarters' },
  { tag: '{dns_stb}', label: 'DNS STB' },
  { tag: '{app_playstore}', label: 'App Play Store' },
  { tag: '{app_appstore}', label: 'App Store / Loja' },
  { tag: '{app_webplayer}', label: 'WebPlayer' },
  { tag: '{app_apk}', label: 'APK Principal (Android/TV)' },
  { tag: '{app_apk_secundario}', label: 'APK Secundário' },
  { tag: '{whatsapp_suporte}', label: 'WhatsApp Suporte' },
  { tag: '{notas}', label: 'Notas / Acessos Remotos' },
  { tag: '{observacoes}', label: 'Observações' }
];

interface PlaylistModalProps {
  customer: Customer | null;
  onClose: () => void;
}

export const PlaylistModal: React.FC<PlaylistModalProps> = ({ customer, onClose }) => {
  const { profile } = useSigmaStore();
  const [template, setTemplate] = useState<string>(DEFAULT_CLIENT_DETAILS_TEMPLATE);
  const [draftTemplate, setDraftTemplate] = useState<string>(DEFAULT_CLIENT_DETAILS_TEMPLATE);
  const [isEditing, setIsEditing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [maxPlayerOpen, setMaxPlayerOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Apenas o Master (administrador) pode personalizar o modelo
  const isMaster = profile?.role === 'admin';

  // Carrega template salvo e escuta atualizações em tempo real
  useEffect(() => {
    const syncTemplateFromLocalOrApi = async () => {
      let localSaved = '';
      try {
        localSaved = localStorage.getItem('sigma_client_details_template') || '';
      } catch {}

      if (localSaved && localSaved.trim().length > 10 && !localSaved.includes('atmos') && !localSaved.includes('IBOCONTROL')) {
        setTemplate(localSaved);
        setDraftTemplate(localSaved);
      }

      try {
        const endpoints = getBrandApiEndpoints('/api/v1/brand-settings');
        for (const url of endpoints) {
          try {
            const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
            if (res.ok) {
              const data = await res.json();
              const serverTemplate = data?.brand?.clientDetailsTemplate;
              if (serverTemplate && typeof serverTemplate === 'string' && serverTemplate.trim().length > 10) {
                if (!serverTemplate.includes('atmos') && !serverTemplate.includes('IBOCONTROL')) {
                  setTemplate(serverTemplate);
                  setDraftTemplate(serverTemplate);
                  try {
                    localStorage.setItem('sigma_client_details_template', serverTemplate);
                  } catch {}
                  break;
                }
              }
            }
          } catch {}
        }
      } catch {}
    };

    syncTemplateFromLocalOrApi();

    const handleTemplateUpdate = (event: any) => {
      if (event?.detail && typeof event.detail === 'string' && event.detail.trim().length > 10) {
        setTemplate(event.detail);
        setDraftTemplate(event.detail);
      } else {
        try {
          const updated = localStorage.getItem('sigma_client_details_template');
          if (updated && updated.trim().length > 10) {
            setTemplate(updated);
            setDraftTemplate(updated);
          }
        } catch {}
      }
    };

    window.addEventListener('client_details_template_updated', handleTemplateUpdate);
    window.addEventListener('storage', handleTemplateUpdate);

    return () => {
      window.removeEventListener('client_details_template_updated', handleTemplateUpdate);
      window.removeEventListener('storage', handleTemplateUpdate);
    };
  }, []);

  // Recarrega template quando o cliente selecionado mudar
  useEffect(() => {
    if (customer) {
      try {
        const localSaved = localStorage.getItem('sigma_client_details_template');
        if (localSaved && localSaved.trim().length > 10 && !localSaved.includes('atmos') && !localSaved.includes('IBOCONTROL')) {
          setTemplate(localSaved);
          setDraftTemplate(localSaved);
        }
      } catch {}
    }
  }, [customer?.id]);

  // Montagem das variáveis e URLs do cliente (seguro para hooks mesmo se customer for nulo)
  const dnsDomain = (APP_CONFIG.defaultDns || '').trim();
  const rawBase = (APP_CONFIG.panelUrl || '').trim();
  const serverUrl = (() => {
    if (dnsDomain) {
      return dnsDomain.startsWith('http') ? dnsDomain : `http://${dnsDomain}`;
    }
    if (rawBase && rawBase.length > 3) {
      return rawBase.startsWith('http') ? rawBase : `http://${rawBase}`;
    }
    return APP_CONFIG.apiBaseUrl || 'https://fastcdn.fit';
  })();

  const cleanServerDomain = (() => {
    try {
      return new URL(serverUrl).host;
    } catch {
      return serverUrl.replace(/^https?:\/\//, '').replace(/\/.*$/, '') || 'lurkcdn.online:80';
    }
  })();

  const shortBase = cleanServerDomain.includes('lurkcdn.online')
    ? 'http://e.lurkcdn.online'
    : `http://${cleanServerDomain}`;

  const customerAny = (customer || {}) as any;
  const username = customer?.username || '';
  const password = customer?.password || '';

  // Formatação de data de criação
  const formatDateTime = (dateVal: any) => {
    if (!dateVal) {
      const now = new Date();
      return `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    }
    try {
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return String(dateVal);
      return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
    } catch {
      return String(dateVal);
    }
  };

  const formatDateOnly = (dateVal: any) => {
    if (!dateVal) return 'Em breve';
    try {
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) {
        const str = String(dateVal);
        return str.includes(':') ? str : `${str} 23:59:59`;
      }
      return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()} 23:59:59`;
    } catch {
      return String(dateVal);
    }
  };

  const rawPrice = Number(customerAny.price ?? customerAny.subscription_value ?? customerAny.monthly_cost ?? 0);
  const formattedPrice = `R$ ${rawPrice.toFixed(2).replace('.', ',')}`;

  const planoName = customerAny.package_name || customerAny.packageName || customerAny.plano || 'PLANO COMPLETO (3 Telas)';
  const conexoes = String(customerAny.connections || customerAny.max_connections || customerAny.conexoes || 1);
  const dataCriacao = formatDateTime(customerAny.created_at || customerAny.criado_em);
  const dataVencimento = formatDateOnly(customerAny.vencimento || customerAny.expires_at || customerAny.expiresAt || customerAny.expiration || customerAny.exp_date);

  const paymentLink = customerAny.payment_link || customerAny.checkout_url || (customer?.id ? `${serverUrl}/checkout/${customer.id}` : `${serverUrl}/checkout`);

  // Mapa de substituição de placeholders
  const placeholderMap: Record<string, string> = {
    '{usuario}': username,
    '{senha}': password,
    '{plano}': planoName,
    '{preco_plano}': formattedPrice,
    '{link_pagamento}': paymentLink,
    '{criado_em}': dataCriacao,
    '{vencimento}': dataVencimento,
    '{conexoes}': conexoes,
    '{servidor}': serverUrl,
    '{url_xciptv}': serverUrl,
    '{url_smarters}': serverUrl,
    '{dns_stb}': APP_CONFIG.dnsStb || cleanServerDomain,
    '{app_playstore}': APP_CONFIG.playStoreUrl || '',
    '{link_app_playstore}': APP_CONFIG.playStoreUrl || '',
    '{app_appstore}': APP_CONFIG.appStoreUrl || '',
    '{loja_app_url}': APP_CONFIG.appStoreUrl || '',
    '{app_webplayer}': APP_CONFIG.webPlayerUrl || `${serverUrl}/webplayer`,
    '{webplayer_url}': APP_CONFIG.webPlayerUrl || `${serverUrl}/webplayer`,
    '{app_apk}': APP_CONFIG.primaryApkUrl || '',
    '{app_apk_principal}': APP_CONFIG.primaryApkUrl || '',
    '{apk_atmos_p}': APP_CONFIG.primaryApkUrl || '',
    '{app_apk_secundario}': APP_CONFIG.secondaryApkUrl || '',
    '{apk_atmos_ibo}': APP_CONFIG.secondaryApkUrl || '',
    '{link_smart_tv}': `${shortBase}/p/${username}/${password}/smart.m3u8`,
    '{link_canais_ao_vivo}': `${shortBase}/p/${username}/${password}/live.m3u8`,
    '{link_grande_m3u}': `${serverUrl}/get.php?username=${username}&password=${password}&type=m3u_plus&output=mpegts`,
    '{link_grande_hls}': `${serverUrl}/get.php?username=${username}&password=${password}&type=m3u_plus&output=hls`,
    '{link_curto_m3u}': `${shortBase}/p/${username}/${password}/m3u`,
    '{link_curto_hls}': `${shortBase}/p/${username}/${password}/hls`,
    '{link_ssiptv}': `${shortBase}/p/${username}/${password}/ssiptv`,
    '{link_cloudy}': `${serverUrl}/get.php?username=${username}&password=${password}&type=m3u_plus&output=hls`,
    '{whatsapp_suporte}': (profile as any)?.whatsapp || (profile as any)?.phone || APP_CONFIG.supportWhatsApp || '',
    '{notas}': customer?.notes || customerAny.notas || '',
    '{observacoes}': customer?.notes || customerAny.notas || ''
  };

  // Renderiza o texto substituindo todos os placeholders
  const renderedContent = useMemo(() => {
    let result = template;
    for (const [tag, val] of Object.entries(placeholderMap)) {
      result = result.split(tag).join(val);
    }
    return result;
  }, [template, placeholderMap]);

  // Cópia para clipboard
  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(renderedContent);
      setCopied(true);
      setStatusMessage('Copiado com sucesso para a área de transferência!');
      setTimeout(() => {
        setCopied(false);
        setStatusMessage(null);
      }, 2500);
      return true;
    } catch {
      setStatusMessage('Falha ao copiar. Selecione o texto manualmente.');
      setTimeout(() => setStatusMessage(null), 3000);
      return false;
    }
  };

  // Cópia e Fechar
  const handleCopyAndClose = async () => {
    await handleCopyText();
    setTimeout(() => {
      onClose();
    }, 400);
  };

  // Enviar / Abrir WhatsApp
  const handleOpenWhatsApp = () => {
    handleCopyText();
    const phone = String(customerAny.phone || customerAny.whatsapp || '').replace(/\D/g, '');
    const encoded = encodeURIComponent(renderedContent);
    const targetUrl = phone.length >= 8
      ? `https://api.whatsapp.com/send?phone=${phone.startsWith('55') ? phone : ('55' + phone)}&text=${encoded}`
      : `https://api.whatsapp.com/send?text=${encoded}`;

    window.open(targetUrl, '_blank', 'noopener,noreferrer');
  };

  // Inserir tag no cursor do textarea
  const insertPlaceholder = (tag: string) => {
    if (!textareaRef.current) {
      setDraftTemplate((prev) => prev + ' ' + tag);
      return;
    }
    const el = textareaRef.current;
    const start = el.selectionStart || 0;
    const end = el.selectionEnd || 0;
    const current = draftTemplate;
    const updated = current.substring(0, start) + tag + current.substring(end);
    setDraftTemplate(updated);
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + tag.length, start + tag.length);
    }, 50);
  };

  // Salvar modelo customizado (apenas Master)
  const handleSaveTemplate = async () => {
    if (!isMaster) return;
    setIsSaving(true);
    setStatusMessage(null);
    try {
      const endpoints = getBrandApiEndpoints('/api/v1/brand-settings');
      const domain = getFranchiseDomain();

      const masterKey = localStorage.getItem('sigma_active_key') || localStorage.getItem('fastcdn_api_key') || localStorage.getItem('sigma_reseller_key') || localStorage.getItem('sigma_master_key') || APP_CONFIG.defaultApiKey;
      const sessionToken = localStorage.getItem('sigma_session_token') || localStorage.getItem('mediacms_session_token') || localStorage.getItem('token') || (profile?.id ? String(profile.id) : '');

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      };
      if (masterKey) headers['X-API-Key'] = masterKey;
      if (sessionToken) headers['Authorization'] = `Bearer ${sessionToken}`;

      let savedOk = false;
      for (const url of endpoints) {
        try {
          const res = await fetch(url, {
            method: 'POST',
            headers,
            body: JSON.stringify({
              domain,
              clientDetailsTemplate: draftTemplate.trim()
            })
          });
          if (res.ok) {
            savedOk = true;
            break;
          }
        } catch {}
      }

      const finalSaved = draftTemplate.trim();
      setTemplate(finalSaved);
      try {
        localStorage.setItem('sigma_client_details_template', finalSaved);
        window.dispatchEvent(new CustomEvent('client_details_template_updated', { detail: finalSaved }));
      } catch {}

      setStatusMessage(savedOk ? 'Modelo salvo com sucesso no servidor para esta franquia!' : 'Modelo salvo localmente!');
      setIsEditing(false);
      setTimeout(() => setStatusMessage(null), 3500);
    } catch (err: any) {
      setStatusMessage('Erro ao salvar no servidor: ' + (err.message || 'Falha de conexão'));
    } finally {
      setIsSaving(false);
    }
  };

  // Restaurar padrão de fábrica
  const handleResetToDefault = () => {
    if (confirm('Deseja restaurar o modelo padrão de fábrica para os detalhes do cliente?')) {
      setDraftTemplate(DEFAULT_CLIENT_DETAILS_TEMPLATE);
      setTemplate(DEFAULT_CLIENT_DETAILS_TEMPLATE);
      try {
        localStorage.setItem('sigma_client_details_template', DEFAULT_CLIENT_DETAILS_TEMPLATE);
        window.dispatchEvent(new CustomEvent('client_details_template_updated', { detail: DEFAULT_CLIENT_DETAILS_TEMPLATE }));
      } catch {}
      setStatusMessage('Modelo padrão restaurado com sucesso!');
      setTimeout(() => setStatusMessage(null), 3000);
    }
  };

  if (!customer) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-3 md:p-6 animate-fade-in select-none">
      <div className="bg-[#12131A] border border-[#232530] rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        
        {/* Cabeçalho */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#232530] shrink-0 bg-[#161722]">
          <div className="flex items-center gap-2">
            <h3 className="text-white font-bold text-sm tracking-wide">
              Detalhes do Cliente
            </h3>
            {isMaster && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#009EF7]/15 text-[#009EF7] font-semibold border border-[#009EF7]/30">
                Master Admin
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {isMaster && (
              <button
                onClick={() => {
                  if (isEditing) {
                    setDraftTemplate(template);
                  }
                  setIsEditing(!isEditing);
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  isEditing
                    ? 'bg-[#009EF7] text-white shadow-md'
                    : 'bg-[#1F212D] text-[#92929F] hover:text-white hover:bg-[#2A2C3C]'
                }`}
                title="Personalizar texto e placeholders do modelo"
              >
                {isEditing ? <Eye className="w-3.5 h-3.5" /> : <Settings className="w-3.5 h-3.5 text-[#009EF7]" />}
                <span>{isEditing ? 'Ver Prévia' : 'Personalizar Modelo'}</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-1 rounded-lg text-[#92929F] hover:text-white hover:bg-[#1F212D] transition-colors cursor-pointer"
              title="Fechar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Notificação Toast */}
        {statusMessage && (
          <div className="mx-4 mt-3 px-3.5 py-2 bg-[#1A1C24] border border-[#009EF7]/40 rounded-xl text-xs text-[#00E5FF] flex items-center gap-2 animate-fade-in shrink-0">
            <CheckCircle2 className="w-4 h-4 text-[#50CD89] shrink-0" />
            <span className="font-medium">{statusMessage}</span>
          </div>
        )}

        {/* Conteúdo Central */}
        <div className="p-4 md:p-5 overflow-y-auto space-y-4 flex-1">
          {isEditing ? (
            /* Modo de Edição Exclusivo Master */
            <div className="space-y-3 animate-fade-in">
              <div className="p-3 bg-[#161722] rounded-xl border border-[#232530] text-[11px] text-[#92929F] space-y-1.5">
                <div className="flex items-center justify-between text-white font-semibold">
                  <span className="flex items-center gap-1.5 text-[#009EF7]">
                    <Sparkles className="w-3.5 h-3.5" />
                    Editor de Template de Mensagem (Master)
                  </span>
                  <button
                    onClick={handleResetToDefault}
                    className="text-[10px] text-[#F1416C] hover:underline flex items-center gap-1 cursor-pointer"
                    title="Voltar ao modelo original"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Restaurar Padrão
                  </button>
                </div>
                <p>
                  Insira as tags abaixo no texto. Ao abrir os detalhes de qualquer cliente, as tags serão substituídas automaticamente pelos dados reais.
                </p>

                {/* Chips de Placeholders */}
                <div className="pt-2">
                  <div className="text-[10px] font-bold text-[#5E6278] uppercase mb-1">
                    Tags Disponíveis (Clique para inserir no texto):
                  </div>
                  <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-1 bg-[#0E1017] rounded-lg border border-[#1E202B]">
                    {AVAILABLE_PLACEHOLDERS.map((item) => (
                      <button
                        key={item.tag}
                        type="button"
                        onClick={() => insertPlaceholder(item.tag)}
                        className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#1A1C24] hover:bg-[#009EF7] text-[#00E5FF] hover:text-white border border-[#262838] transition-all cursor-pointer"
                        title={`Inserir ${item.tag}`}
                      >
                        {item.tag} <span className="opacity-70 text-[9px]">({item.label})</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Textarea do Template */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-[#92929F] uppercase">
                  Texto do Modelo com Placeholders:
                </label>
                <textarea
                  ref={textareaRef}
                  value={draftTemplate}
                  onChange={(e) => setDraftTemplate(e.target.value)}
                  rows={14}
                  className="w-full rounded-xl p-3 text-xs font-mono text-[#E1E3EA] focus:outline-none leading-relaxed resize-y border border-[#282B38] focus:border-[#009EF7]"
                  style={{ backgroundColor: '#1A1C24', color: '#E1E3EA' }}
                  placeholder="Escreva aqui o modelo de dados do cliente..."
                />
              </div>

              {/* Botões do Editor */}
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#1F212D] text-[#92929F] hover:text-white transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveTemplate}
                  disabled={isSaving}
                  className="px-4 py-1.5 rounded-lg text-xs font-bold bg-[#009EF7] hover:bg-[#0086D1] text-white flex items-center gap-1.5 transition-all shadow-md cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSaving ? 'Salvando...' : 'Salvar Modelo'}</span>
                </button>
              </div>
            </div>
          ) : (
            /* Modo de Visualização Idêntico à Imagem do Usuário */
            <div className="space-y-4">
              {/* Card de Acessos Remotos & Notas (IBO Player, Roku, MAC) */}
              {((customer?.notes && customer.notes.trim().length > 0) || (customerAny.notas && customerAny.notas.trim().length > 0)) ? (
                <div className="p-3 bg-[#FFB800]/10 border border-[#FFB800]/30 rounded-xl flex items-center justify-between gap-3 animate-fade-in">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-[#FFB800]/20 flex items-center justify-center text-[#FFB800] shrink-0 border border-[#FFB800]/40">
                      <KeyRound className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-white flex items-center gap-1.5">
                        <span>Acessos Remotos / Notas Salvas</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#FFB800]/20 text-[#FFB800] font-semibold">
                          IBO / Roku / Apps
                        </span>
                      </div>
                      <p className="text-[11px] text-[#92929F] truncate">
                        Códigos de ativação e dados internos cadastrados para este cliente
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setNotesOpen(true)}
                    className="px-3 py-1.5 rounded-lg bg-[#FFB800] hover:bg-[#FFB800]/90 text-black font-bold text-xs flex items-center gap-1.5 shrink-0 shadow-md transition-all cursor-pointer hover:scale-105"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Ver Códigos</span>
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between px-3 py-2 bg-[#161722] border border-[#232530] rounded-xl text-xs text-[#92929F]">
                  <span className="flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-[#5E6278]" />
                    <span>Nenhum código remoto cadastrado para este cliente</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setNotesOpen(true)}
                    className="text-[11px] font-bold text-[#FFB800] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    + Adicionar Códigos (IBO/Roku)
                  </button>
                </div>
              )}

              {/* Caixa de Detalhes do Cliente - Sempre Cinza Escuro de Alto Contraste */}
              <div
                className="rounded-xl p-4 text-[12px] font-mono text-[#E1E3EA] leading-relaxed max-h-[56vh] overflow-y-auto whitespace-pre-wrap select-text border border-[#282B38] shadow-inner"
                style={{ backgroundColor: '#1A1C24', color: '#E1E3EA' }}
              >
                {renderedContent}
              </div>

              {/* Botões de Ação Inferiores */}
              <div className="space-y-3 pt-1">
                {/* Linha 1: WhatsApp (Verde) e Copiar (Azul) */}
                <div className="flex items-center justify-center gap-3">
                  <button
                    onClick={handleOpenWhatsApp}
                    className="flex-1 py-2.5 px-4 bg-[#25D366] hover:bg-[#20ba5a] text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/20 transition-all cursor-pointer hover:scale-[1.01]"
                    title="Copiar e abrir WhatsApp"
                  >
                    {/* SVG Oficial WhatsApp */}
                    <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                      <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.312.045-.694.074-1.115-.06-.274-.087-.63-.223-1.09-.425-1.964-.863-3.232-2.855-3.329-2.986-.096-.13-7.96-1.06 7.96-1.06.002 0 .804-1.066.804-1.066s.181-.24.32-.423c.139-.183.186-.312.279-.516.093-.204.047-.384-.023-.523-.07-.139-.628-1.512-.86-2.072-.226-.547-.457-.472-.628-.481-.162-.008-.348-.01-.534-.01-.186 0-.488.07-.744.348-.256.279-.976.954-.976 2.326s1 2.697 1.139 2.883c.14.186 1.968 3.006 4.77 4.215.666.288 1.187.46 1.593.589.67.213 1.28.183 1.762.111.538-.08 1.65-.674 1.883-1.326.233-.652.233-1.21.163-1.326-.07-.116-.256-.186-.535-.325z" />
                    </svg>
                    <span>WhatsApp</span>
                  </button>

                  <button
                    onClick={handleCopyText}
                    className="flex-1 py-2.5 px-4 bg-[#009EF7] hover:bg-[#0086D1] text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-blue-900/20 transition-all cursor-pointer hover:scale-[1.01]"
                    title="Copiar todos os dados para a área de transferência"
                  >
                    {copied ? <Check className="w-4 h-4 text-white" /> : <Copy className="w-4 h-4" />}
                    <span>{copied ? 'Copiado!' : 'Copiar'}</span>
                  </button>
                </div>

                {/* Linha 2: Fechar (Cinza), Ativar MaxPlayer (Roxo) e Copiar e Fechar (Azul) */}
                <div className="flex items-center justify-center gap-2.5 pt-1">
                  <button
                    onClick={onClose}
                    className="px-5 py-2 rounded-xl text-xs font-semibold bg-[#1C1E28] hover:bg-[#272A38] text-[#92929F] hover:text-white transition-all cursor-pointer border border-[#292B3A]"
                  >
                    Fechar
                  </button>

                  <button
                    type="button"
                    onClick={() => setMaxPlayerOpen(true)}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-[#8950FC]/15 hover:bg-[#8950FC]/25 text-[#b588ff] border border-[#8950FC]/30 transition-all flex items-center gap-1.5 cursor-pointer hover:brightness-110"
                    title="Ativar aplicativo (MaxPlayer / Parceiros) para este cliente"
                  >
                    <Tv2 className="w-3.5 h-3.5 text-[#b588ff]" />
                    <span>Ativar Aplicativo</span>
                  </button>

                  <button
                    onClick={handleCopyAndClose}
                    className="px-5 py-2 rounded-xl text-xs font-bold bg-[#009EF7] hover:bg-[#0086D1] text-white flex items-center gap-2 shadow-md transition-all cursor-pointer hover:brightness-110"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copiar e Fechar</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {notesOpen && (
        <CustomerNotesModal
          customer={customer}
          isOpen={notesOpen}
          onClose={() => setNotesOpen(false)}
        />
      )}

      {maxPlayerOpen && customer && (
        <AppActivationModal
          customer={customer}
          onClose={() => setMaxPlayerOpen(false)}
        />
      )}
    </div>
  );
};
