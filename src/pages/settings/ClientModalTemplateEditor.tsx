import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Save, RotateCcw, Copy, Check, CheckCircle2, Sparkles, Info, Eye,
  Code2, Smartphone, ShieldCheck, Loader2, Globe, ArrowRight, Zap, Layers, FileCheck
} from 'lucide-react';
import { DEFAULT_CLIENT_DETAILS_TEMPLATE, AVAILABLE_PLACEHOLDERS } from '../../components/modals/PlaylistModal';
import { APP_CONFIG, getBrandApiEndpoints, getFranchiseDomain } from '../../config/appConfig';
import { useSigmaStore } from '../../store/SigmaStore';

const PRESET_TEMPLATES = [
  {
    id: 'clean',
    title: '⚡ Direto & Limpo',
    desc: 'Apenas usuário, senha, validade e listas essenciais',
    content: `🎉 *Seus Dados de Acesso:*

👤 *Usuário:* {usuario}
🔑 *Senha:* {senha}
📦 *Plano:* {plano}
📅 *Vencimento:* {vencimento}
📶 *Conexões / Telas:* {conexoes}

🌐 *Servidor / DNS:*
{servidor}

📺 *Lista M3U (Link Curto):*
{link_curto_m3u}

📺 *Lista HLS (Link Curto):*
{link_curto_hls}

📺 *Lista Completa (M3U):*
{link_grande_m3u}`
  },
  {
    id: 'with_apps',
    title: '📱 Com Aplicativos da Franquia',
    desc: 'Credenciais + links dos aplicativos configurados',
    content: `🎉 *Seu Acesso Foi Ativado com Sucesso!*

Seguem seus dados para conexão:
👤 *Usuário:* {usuario}
🔑 *Senha:* {senha}
📦 *Plano:* {plano}
📅 *Vencimento:* {vencimento}
📶 *Telas:* {conexoes}

🌐 *Servidor / DNS:*
{servidor}

📲 *Aplicativo na Google Play Store:*
{app_playstore}

📥 *Download Direto (APK Principal):*
{app_apk}

📺 *Listas de Transmissão:*
• M3U: {link_curto_m3u}
• HLS: {link_curto_hls}

💬 *Suporte:* {whatsapp_suporte}`
  },
  {
    id: 'complete',
    title: '🌟 Completo & Profissional',
    desc: 'Boas-vindas, credenciais, apps, links alternativos e suporte',
    content: `🎉 *BEM-VINDO! Seu Acesso Foi Liberado!*

⏳ *Atenção:* Aguarde cerca de 1 minuto antes do primeiro login para validação no servidor.

🔑 *DADOS DE ACESSO:*
👤 *Usuário:* {usuario}
🔑 *Senha:* {senha}
📦 *Plano:* {plano}
💵 *Valor:* {preco_plano}
📅 *Vencimento:* {vencimento}
📶 *Conexões:* {conexoes}

🌐 *DNS / SERVIDOR:*
{servidor}

📲 *BAIXE NOSSOS APLICATIVOS:*
• Play Store: {app_playstore}
• APK Direto: {app_apk}
• WebPlayer: {app_webplayer}

📺 *LISTAS PARA SMART TV & PLAYERS:*
🟢 Link M3U: {link_curto_m3u}
🟢 Link HLS: {link_curto_hls}
🔴 SSIPTV: {link_ssiptv}

💬 Dúvidas ou suporte? Estamos à sua disposição!`
  }
];

export const ClientModalTemplateEditor: React.FC = () => {
  const { profile } = useSigmaStore();
  const [template, setTemplate] = useState<string>(DEFAULT_CLIENT_DETAILS_TEMPLATE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copiedPreview, setCopiedPreview] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ success: boolean; text: string } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const franchiseDomain = getFranchiseDomain();

  // Carrega template da API central da franquia
  useEffect(() => {
    let isMounted = true;
    const loadTemplate = async () => {
      setLoading(true);

      // Fallback local inicial
      try {
        const local = localStorage.getItem('sigma_client_details_template');
        if (local && local.trim().length > 10 && !local.includes('atmos') && !local.includes('IBOCONTROL') && isMounted) {
          setTemplate(local);
        }
      } catch {}

      try {
        const endpoints = getBrandApiEndpoints('/api/v1/brand-settings');
        for (const url of endpoints) {
          try {
            const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
            if (res.ok) {
              const data = await res.json();
              const serverTemplate = data?.brand?.clientDetailsTemplate;
              if (serverTemplate && typeof serverTemplate === 'string' && serverTemplate.trim().length > 10 && isMounted) {
                if (!serverTemplate.includes('atmos') && !serverTemplate.includes('IBOCONTROL')) {
                  setTemplate(serverTemplate);
                  try {
                    localStorage.setItem('sigma_client_details_template', serverTemplate);
                  } catch {}
                  break;
                }
              }
            }
          } catch {}
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadTemplate();
    return () => { isMounted = false; };
  }, [franchiseDomain]);

  // Inserir tag no cursor do textarea
  const insertTag = (tag: string) => {
    if (!textareaRef.current) {
      setTemplate((prev) => prev + ' ' + tag);
      return;
    }
    const el = textareaRef.current;
    const start = el.selectionStart || 0;
    const end = el.selectionEnd || 0;
    const current = template;
    const updated = current.substring(0, start) + tag + current.substring(end);
    setTemplate(updated);
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + tag.length, start + tag.length);
    }, 50);
  };

  // Aplicar um modelo pré-configurado
  const applyPreset = (presetContent: string) => {
    if (confirm('Deseja substituir o modelo atual por este modelo pré-configurado? Você poderá editar antes de salvar.')) {
      setTemplate(presetContent);
      setStatusMsg({ success: true, text: 'Modelo pré-configurado aplicado! Clique em "Salvar Modelo" para gravar.' });
      setTimeout(() => setStatusMsg(null), 3500);
    }
  };

  // Dados fictícios para simulação de pré-visualização em tempo real (totalmente genéricos e integrados)
  const sampleCustomerData: Record<string, string> = {
    '{usuario}': 'cliente_exemplo',
    '{senha}': 'senha123456',
    '{plano}': 'PLANO COMPLETO (3 Telas)',
    '{preco_plano}': 'R$ 35,00',
    '{link_pagamento}': `http://${franchiseDomain || 'tvfast.lat'}/checkout/98231`,
    '{criado_em}': '20/09/2026 16:30:00',
    '{vencimento}': '20/10/2026 23:59:59',
    '{conexoes}': '3',
    '{servidor}': `http://${APP_CONFIG.defaultDns || franchiseDomain || 'fastcdn.fit'}`,
    '{link_smart_tv}': `http://${APP_CONFIG.defaultDns || franchiseDomain || 'fastcdn.fit'}/p/cliente_exemplo/senha123456/smart.m3u8`,
    '{link_canais_ao_vivo}': `http://${APP_CONFIG.defaultDns || franchiseDomain || 'fastcdn.fit'}/p/cliente_exemplo/senha123456/live.m3u8`,
    '{url_xciptv}': `http://${APP_CONFIG.defaultDns || franchiseDomain || 'fastcdn.fit'}`,
    '{url_smarters}': `http://${APP_CONFIG.defaultDns || franchiseDomain || 'fastcdn.fit'}`,
    '{dns_stb}': APP_CONFIG.dnsStb || `${APP_CONFIG.defaultDns || franchiseDomain || 'fastcdn.fit'}`,
    '{app_playstore}': APP_CONFIG.playStoreUrl || 'https://play.google.com/store/apps/details?id=com.app.iptv',
    '{link_app_playstore}': APP_CONFIG.playStoreUrl || 'https://play.google.com/store/apps/details?id=com.app.iptv',
    '{app_appstore}': APP_CONFIG.appStoreUrl || `http://${franchiseDomain || 'tvfast.lat'}/loja`,
    '{loja_app_url}': APP_CONFIG.appStoreUrl || `http://${franchiseDomain || 'tvfast.lat'}/loja`,
    '{app_webplayer}': APP_CONFIG.webPlayerUrl || `http://${franchiseDomain || 'tvfast.lat'}/webplayer`,
    '{webplayer_url}': APP_CONFIG.webPlayerUrl || `http://${franchiseDomain || 'tvfast.lat'}/webplayer`,
    '{app_apk}': APP_CONFIG.primaryApkUrl || `http://${franchiseDomain || 'tvfast.lat'}/downloads/app.apk`,
    '{app_apk_principal}': APP_CONFIG.primaryApkUrl || `http://${franchiseDomain || 'tvfast.lat'}/downloads/app.apk`,
    '{apk_atmos_p}': APP_CONFIG.primaryApkUrl || `http://${franchiseDomain || 'tvfast.lat'}/downloads/app.apk`,
    '{app_apk_secundario}': APP_CONFIG.secondaryApkUrl || `http://${franchiseDomain || 'tvfast.lat'}/downloads/player2.apk`,
    '{apk_atmos_ibo}': APP_CONFIG.secondaryApkUrl || `http://${franchiseDomain || 'tvfast.lat'}/downloads/player2.apk`,
    '{link_grande_m3u}': `http://${APP_CONFIG.defaultDns || franchiseDomain || 'fastcdn.fit'}/get.php?username=cliente_exemplo&password=senha123456&type=m3u_plus&output=mpegts`,
    '{link_grande_hls}': `http://${APP_CONFIG.defaultDns || franchiseDomain || 'fastcdn.fit'}/get.php?username=cliente_exemplo&password=senha123456&type=m3u_plus&output=hls`,
    '{link_curto_m3u}': `http://${APP_CONFIG.defaultDns || franchiseDomain || 'fastcdn.fit'}/p/cliente_exemplo/senha123456/m3u`,
    '{link_curto_hls}': `http://${APP_CONFIG.defaultDns || franchiseDomain || 'fastcdn.fit'}/p/cliente_exemplo/senha123456/hls`,
    '{link_ssiptv}': `http://${franchiseDomain || 'tvfast.lat'}/p/cliente_exemplo/senha123456/ssiptv`,
    '{whatsapp_suporte}': (profile as any)?.whatsapp || (profile as any)?.phone || APP_CONFIG.supportWhatsApp || '5511999999999'
  };

  // Render da pré-visualização
  const previewText = useMemo(() => {
    let res = template;
    for (const [tag, val] of Object.entries(sampleCustomerData)) {
      res = res.split(tag).join(val);
    }
    return res;
  }, [template, sampleCustomerData]);

  // Salvar no servidor da franquia
  const handleSave = async () => {
    setSaving(true);
    setStatusMsg(null);
    try {
      const endpoints = getBrandApiEndpoints('/api/v1/brand-settings');
      const domain = getFranchiseDomain();

      const masterKey = localStorage.getItem('sigma_active_key') || localStorage.getItem('sigma_reseller_key') || localStorage.getItem('sigma_master_key') || localStorage.getItem('fastcdn_api_key') || APP_CONFIG.defaultApiKey;
      const sessionToken = localStorage.getItem('sigma_session_token') || localStorage.getItem('mediacms_session_token') || localStorage.getItem('token') || (profile?.id ? String(profile.id) : '');

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      };
      if (masterKey) headers['X-API-Key'] = masterKey;
      if (sessionToken) headers['Authorization'] = `Bearer ${sessionToken}`;

      let saved = false;
      let errorText = '';

      for (const url of endpoints) {
        try {
          const res = await fetch(url, {
            method: 'POST',
            headers,
            body: JSON.stringify({
              domain,
              clientDetailsTemplate: template.trim()
            })
          });
          const data = await res.json().catch(() => ({}));
          if (res.ok && data && data.success) {
            saved = true;
            break;
          } else {
            errorText = data.message || data.error || `HTTP ${res.status}`;
          }
        } catch (e: any) {
          errorText = e.message || 'Falha de conexão';
        }
      }

      try {
        localStorage.setItem('sigma_client_details_template', template.trim());
        window.dispatchEvent(new CustomEvent('client_details_template_updated', { detail: template.trim() }));
      } catch {}

      if (saved) {
        setStatusMsg({ success: true, text: `Modelo salvo com sucesso no servidor para a franquia (${domain || 'ativa'})!` });
      } else {
        setStatusMsg({ success: true, text: 'Modelo salvo localmente no seu navegador!' });
      }
    } catch (err: any) {
      setStatusMsg({ success: false, text: err.message || 'Erro ao salvar modelo.' });
    } finally {
      setSaving(false);
      setTimeout(() => {
        setStatusMsg(prev => (prev?.success ? null : prev));
      }, 4500);
    }
  };

  // Restaurar padrão de fábrica
  const handleReset = () => {
    if (confirm('Deseja restaurar o modelo padrão de fábrica dos detalhes do cliente?')) {
      setTemplate(DEFAULT_CLIENT_DETAILS_TEMPLATE);
      try {
        localStorage.setItem('sigma_client_details_template', DEFAULT_CLIENT_DETAILS_TEMPLATE);
      } catch {}
      setStatusMsg({ success: true, text: 'Modelo padrão de fábrica restaurado!' });
      setTimeout(() => setStatusMsg(null), 3000);
    }
  };

  // Copiar pré-visualização
  const handleCopyPreview = async () => {
    try {
      await navigator.clipboard.writeText(previewText);
      setCopiedPreview(true);
      setTimeout(() => setCopiedPreview(false), 2000);
    } catch {
      alert('Falha ao copiar.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Banner Informativo de Franquia */}
      <div className="bg-[#14151C] border border-[#232530] rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-sm font-bold text-white tracking-wide">
              Modelo do Modal & Mensagem de Entrega
            </h2>
            <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-[#009EF7]/15 text-[#009EF7] font-semibold border border-[#009EF7]/30 flex items-center gap-1">
              <Globe className="w-3 h-3" />
              {franchiseDomain || 'Franquia Padrão'}
            </span>
          </div>
          <p className="text-xs text-[#92929F]">
            Configure o texto exato que aparece no modal de clientes e que pode ser enviado com 1 clique no WhatsApp.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-[#009EF7] hover:bg-[#0095E8] shadow-lg shadow-[#009EF7]/20 transition-all cursor-pointer disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Salvando...' : 'Salvar Modelo'}
          </button>

          <button
            type="button"
            onClick={handleReset}
            disabled={saving}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-[#92929F] bg-[#1A1C24] border border-[#232530] hover:text-white transition-all cursor-pointer disabled:opacity-50"
            title="Restaurar modelo original"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Restaurar
          </button>
        </div>
      </div>

      {/* Modelos Prontos em 1 Clique (Facilita a vida de qualquer usuário) */}
      <div className="bg-[#14151C] border border-[#232530] rounded-2xl p-4 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
            <Zap className="w-4 h-4 text-[#FFB800]" />
            Modelos Prontos (Clique para Aplicar)
          </span>
          <span className="text-[10px] text-[#5E6278]">Você pode alterar livremente após escolher</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
          {PRESET_TEMPLATES.map(p => (
            <button
              key={p.id}
              type="button"
              onClick={() => applyPreset(p.content)}
              className="p-3 bg-[#0F1014] hover:bg-[#1A1C24] border border-[#232530] hover:border-[#009EF7]/50 rounded-xl text-left transition-all group cursor-pointer"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-white group-hover:text-[#009EF7] transition-colors">
                  {p.title}
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-[#5E6278] group-hover:text-[#009EF7] group-hover:translate-x-0.5 transition-all" />
              </div>
              <p className="text-[11px] text-[#92929F] leading-tight line-clamp-2">
                {p.desc}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Alerta de Status */}
      {statusMsg && (
        <div className={`p-4 rounded-xl text-xs flex items-center gap-3 border transition-all ${
          statusMsg.success
            ? 'bg-[#50CD89]/10 text-[#50CD89] border-[#50CD89]/20'
            : 'bg-[#F1416C]/10 text-[#F1416C] border-[#F1416C]/20'
        }`}>
          {statusMsg.success ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <Info className="w-4 h-4 shrink-0" />}
          <span className="font-medium">{statusMsg.text}</span>
        </div>
      )}

      {/* Grade Principal: Editor + Placeholders + Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Coluna Esquerda: Editor e Tags (7 colunas) */}
        <div className="lg:col-span-7 space-y-4">
          
          {/* Caixa de Placeholders Clicáveis */}
          <div className="bg-[#14151C] border border-[#1E202B] rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white flex items-center gap-1.5 uppercase tracking-wider">
                <Code2 className="w-4 h-4 text-[#00E5FF]" />
                Variáveis Dinâmicas (Clique para Inserir)
              </span>
              <span className="text-[10px] text-[#5E6278]">
                {AVAILABLE_PLACEHOLDERS.length} disponíveis
              </span>
            </div>

            <p className="text-[11px] text-[#92929F]">
              Clique em qualquer botão abaixo para adicionar a tag no local onde o cursor estiver no texto:
            </p>

            <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-1 bg-[#0F1014] rounded-xl border border-[#232530]">
              {AVAILABLE_PLACEHOLDERS.map((p) => (
                <button
                  key={p.tag}
                  type="button"
                  onClick={() => insertTag(p.tag)}
                  className="px-2.5 py-1 rounded-lg bg-[#1A1C24] hover:bg-[#009EF7]/20 text-[#A1A5B7] hover:text-[#00E5FF] border border-[#282B38] hover:border-[#009EF7]/40 text-[11px] font-mono transition-all flex items-center gap-1 cursor-pointer"
                  title={`Inserir ${p.tag}`}
                >
                  <span className="text-[#009EF7] font-bold">+</span>
                  <span>{p.label}</span>
                  <span className="text-[9px] text-[#5E6278]">{p.tag}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Área de Texto do Modelo */}
          <div className="bg-[#14151C] border border-[#1E202B] rounded-2xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#009EF7]" />
                Texto do Modelo (WhatsApp / Modal)
              </label>
              <span className="text-[10px] text-[#5E6278] font-mono">
                {template.length} caracteres · {template.split('\n').length} linhas
              </span>
            </div>

            <textarea
              ref={textareaRef}
              value={template}
              onChange={(e) => setTemplate(e.target.value)}
              rows={20}
              className="w-full px-4 py-3 bg-[#0F1014] border border-[#232530] rounded-xl text-xs font-mono text-[#E1E3EA] placeholder-[#5E6278] focus:outline-none focus:border-[#009EF7] transition-all leading-relaxed resize-y"
              placeholder="Digite o modelo de mensagem aqui..."
            />

            <div className="flex items-center justify-between pt-1 text-[11px] text-[#5E6278]">
              <span>Dica: Use asteriscos para *negrito* e sublinhados para _itálico_ no WhatsApp.</span>
            </div>
          </div>
        </div>

        {/* Coluna Direita: Pré-visualização Dinâmica ao Vivo (5 colunas) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-[#14151C] border border-[#1E202B] rounded-2xl p-4 space-y-3 sticky top-4">
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-[#50CD89]" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Prévia em Tempo Real
                </span>
              </div>

              <button
                type="button"
                onClick={handleCopyPreview}
                className="px-2.5 py-1 rounded-lg text-[11px] font-semibold text-[#00E5FF] bg-[#00E5FF]/10 hover:bg-[#00E5FF]/20 border border-[#00E5FF]/20 transition-all flex items-center gap-1 cursor-pointer"
                title="Copiar texto renderizado de exemplo"
              >
                {copiedPreview ? <Check className="w-3.5 h-3.5 text-[#50CD89]" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedPreview ? 'Copiado!' : 'Copiar Prévia'}</span>
              </button>
            </div>

            <p className="text-[10px] text-[#5E6278]">
              Simulação de como o texto é renderizado para o cliente <code className="text-[#009EF7]">cliente_exemplo</code>:
            </p>

            {/* Container da Mensagem Renderizada estilo WhatsApp / Modal - Sempre Cinza Escuro */}
            <div
              className="p-4 rounded-xl border border-[#282B38] max-h-[620px] overflow-y-auto space-y-2 shadow-inner"
              style={{ backgroundColor: '#1A1C24' }}
            >
              <div className="text-[11px] text-[#E1E3EA] font-mono whitespace-pre-wrap break-all leading-relaxed select-text">
                {previewText}
              </div>
            </div>

            <div className="p-3 bg-[#161722] rounded-xl border border-[#232530] text-[10px] text-[#92929F] flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-[#50CD89] shrink-0 mt-0.5" />
              <span>
                As variáveis são preenchidas dinamicamente com base nas configurações da sua franquia e nos dados do cliente.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
