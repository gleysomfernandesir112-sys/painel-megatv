import React, { useState, useEffect } from 'react';
import { useSigmaStore } from '../../store/SigmaStore';
import { APP_CONFIG, isHostedOnGithub } from '../../config/appConfig';
import {
  Globe,
  CheckCircle2,
  Copy,
  Check,
  ShieldCheck,
  AlertCircle,
  ExternalLink,
  RefreshCw,
  Sparkles,
  Lock,
  ArrowRight
} from 'lucide-react';

import { isPanelMaster } from '../../utils/panelAuth';

export const CustomDomainPage: React.FC = () => {
  const { profile } = useSigmaStore();
  const isMaster = isPanelMaster(profile?.username, profile);

  const initialGh = React.useMemo(() => {
    try {
      const currentUrl = window.location.hostname.includes('github.io') ? window.location.href : (APP_CONFIG.panelUrl || '');
      if (currentUrl) {
        const parsed = new URL(currentUrl);
        if (parsed.hostname.endsWith('.github.io')) {
          const user = parsed.hostname.replace('.github.io', '');
          const repo = parsed.pathname.split('/')[1] || '';
          return {
            htmlUrl: `https://${parsed.hostname}/${repo ? repo + '/' : ''}`,
            user,
            repo
          };
        }
      }
    } catch {}
    return {
      htmlUrl: APP_CONFIG.panelUrl || window.location.origin,
      user: 'gleysomfernandesir112-sys',
      repo: (APP_CONFIG.panelUrl && APP_CONFIG.panelUrl.includes('painel-neo')) ? 'painel-neo' : 'painel-fast-iptv'
    };
  }, []);

  const [currentCname, setCurrentCname] = useState<string | null>(null);
  const [defaultDomain, setDefaultDomain] = useState<string>('painel.sigmast.site');
  const [customDomain, setCustomDomain] = useState<string | null>(null);
  const [slug, setSlug] = useState<string>('painel');
  const [htmlUrl, setHtmlUrl] = useState<string>(initialGh.htmlUrl);
  const [githubUser, setGithubUser] = useState<string>(initialGh.user || 'gleysomfernandesir112-sys');
  const [repoName, setRepoName] = useState<string>(initialGh.repo || 'painel-fast-iptv');
  const [inputDomain, setInputDomain] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ success: boolean; text: string } | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [testingDns, setTestingDns] = useState(false);
  const [dnsTestResult, setDnsTestResult] = useState<{ ok: boolean; message: string; details?: string } | null>(null);

  // Carrega a configuração atual do GitHub Pages via API central
  const loadDomainConfig = async () => {
    setLoading(true);
    try {
      const activeKey = localStorage.getItem('sigma_active_key') || localStorage.getItem('sigma_reseller_key') || localStorage.getItem('sigma_master_key') || APP_CONFIG.defaultApiKey;
      const sessionToken = localStorage.getItem('sigma_session_token') || localStorage.getItem('mediacms_session_token') || localStorage.getItem('token') || '';
      const headers: Record<string, string> = {};
      if (activeKey) headers['X-API-Key'] = activeKey;
      if (sessionToken) headers['Authorization'] = `Bearer ${sessionToken}`;

      const repoQuery = repoName ? `?repo=${encodeURIComponent(repoName)}` : '';
      const endpoints = isHostedOnGithub()
        ? [`${APP_CONFIG.apiBaseUrl}/api/v1/github/custom-domain${repoQuery}`]
        : [
            `/fastcdn-api/api/v1/github/custom-domain${repoQuery}`,
            `${APP_CONFIG.apiBaseUrl}/api/v1/github/custom-domain${repoQuery}`
          ];
      for (const url of endpoints) {
        try {
          const res = await fetch(url, { headers });
          if (res.ok) {
            const data = await res.json();
            if (data && data.success) {
              setCurrentCname(data.cname || null);
              if (data.defaultDomain) setDefaultDomain(data.defaultDomain);
              if (data.slug) setSlug(data.slug);
              if (data.customDomain) {
                setCustomDomain(data.customDomain);
                setInputDomain(data.customDomain);
              } else if (data.cname && data.defaultDomain && data.cname.toLowerCase() !== data.defaultDomain.toLowerCase()) {
                setCustomDomain(data.cname);
                setInputDomain(data.cname);
              } else {
                setCustomDomain(null);
                setInputDomain('');
              }
              if (data.html_url) setHtmlUrl(data.html_url);
              if (data.githubUser) setGithubUser(data.githubUser);
              if (data.repoName) setRepoName(data.repoName);
              break;
            }
          }
        } catch { /* try next */ }
      }
    } catch { /* fallback */ } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDomainConfig();
  }, []);

  const handleSaveDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isMaster) return;
    setSaving(true);
    setStatusMsg(null);

    const cleanDomain = inputDomain.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');

    try {
      const activeKey = localStorage.getItem('sigma_active_key') || localStorage.getItem('sigma_reseller_key') || localStorage.getItem('sigma_master_key') || APP_CONFIG.defaultApiKey;
      const sessionToken = localStorage.getItem('sigma_session_token') || localStorage.getItem('mediacms_session_token') || localStorage.getItem('token') || '';
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      if (activeKey) headers['X-API-Key'] = activeKey;
      if (sessionToken) headers['Authorization'] = `Bearer ${sessionToken}`;

      const endpoints = isHostedOnGithub()
        ? [`${APP_CONFIG.apiBaseUrl}/api/v1/github/custom-domain`]
        : [
            '/fastcdn-api/api/v1/github/custom-domain',
            `${APP_CONFIG.apiBaseUrl}/api/v1/github/custom-domain`
          ];

      let success = false;
      let msg = '';

      for (const url of endpoints) {
        try {
          const res = await fetch(url, {
            method: 'POST',
            headers,
            body: JSON.stringify({
              customDomain: cleanDomain,
              repoName
            })
          });

          const data = await res.json();
          if (res.ok && data.success) {
            success = true;
            msg = data.message;
            setCurrentCname(cleanDomain || defaultDomain || null);
            setCustomDomain(cleanDomain || null);
            break;
          } else if (data && data.error) {
            msg = data.error;
          }
        } catch { /* try next */ }
      }

      if (success) {
        setStatusMsg({ success: true, text: msg || 'Domínio atualizado com sucesso!' });
        await loadDomainConfig();
      } else {
        setStatusMsg({ success: false, text: msg || 'Falha ao conectar com o serviço de atualização de domínio.' });
      }
    } catch (err: any) {
      setStatusMsg({ success: false, text: err.message || 'Erro inesperado ao salvar domínio.' });
    } finally {
      setSaving(false);
    }
  };

  const testDnsResolution = async () => {
    const targetDomain = (inputDomain || customDomain || '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    if (!targetDomain) {
      setDnsTestResult({ ok: false, message: 'Digite um domínio no campo acima para testar o apontamento.' });
      return;
    }

    setTestingDns(true);
    setDnsTestResult(null);

    try {
      const res = await fetch(`https://dns.google/resolve?name=${encodeURIComponent(targetDomain)}&type=ANY`);
      if (!res.ok) throw new Error(`Falha HTTP ${res.status} ao consultar DNS`);
      const data = await res.json();
      
      const answers: Array<{ name: string; type: number; data: string }> = data.Answer || [];
      const hasCnameToGh = answers.some(a => a.data && (a.data.toLowerCase().includes('github.io') || a.data.toLowerCase().includes('sigmast.site')));
      const ghIps = ['185.199.108.153', '185.199.109.153', '185.199.110.153', '185.199.111.153'];
      const hasGhIp = answers.some(a => a.data && ghIps.includes(a.data.trim()));

      if (hasCnameToGh || hasGhIp) {
        setDnsTestResult({
          ok: true,
          message: 'Excelente! O DNS já está apontado para o painel!',
          details: `Registros encontrados: ${answers.map(a => a.data).join(', ')}`
        });
      } else if (answers.length > 0) {
        setDnsTestResult({
          ok: false,
          message: 'O domínio responde, mas ainda não aponta para o painel.',
          details: `Aponta atualmente para: ${answers.map(a => a.data).join(', ')}. Crie o CNAME apontando para ${defaultDomain || githubTargetHost}.`
        });
      } else {
        setDnsTestResult({
          ok: false,
          message: 'Nenhum registro DNS encontrado para este domínio.',
          details: 'Aguarde alguns minutos após configurar no seu provedor para a propagação acontecer.'
        });
      }
    } catch (err: any) {
      setDnsTestResult({
        ok: false,
        message: 'Não foi possível consultar o DNS no momento.',
        details: err.message
      });
    } finally {
      setTestingDns(false);
    }
  };

  const copyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const githubTargetHost = `${githubUser}.github.io`;

  return (
    <div className="space-y-6 select-none max-w-4xl">
      <div>
        <h1 className="text-xl font-bold text-white tracking-tight">Domínios do Painel Web</h1>
        <p className="text-xs text-[#92929F] mt-1">
          Hospedagem 100% independente no GitHub Pages com SSL automático, subdomínio padrão gratuito e suporte a domínio personalizado.
        </p>
      </div>

      {/* CARD 1: Domínio Padrão Gratuito (*.sigmast.site) - Sempre Ativo */}
      <div className="bg-[#14151C] border border-[#1E202B] rounded-2xl p-6 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1E202B] pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#50CD89]/15 flex items-center justify-center text-[#50CD89]">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-white">Domínio Padrão da Franquia</h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#50CD89]/15 text-[#50CD89] border border-[#50CD89]/30 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Sempre Ativo (SSL Grátis)
                </span>
              </div>
              <p className="text-xs text-[#38bdf8] font-mono mt-0.5 font-semibold">
                https://{defaultDomain}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => copyText(`https://${defaultDomain}`, 'default_url')}
              className="px-3 py-2 rounded-xl text-xs font-semibold text-[#92929F] hover:text-white bg-[#0F1014] border border-[#232530] transition-all flex items-center gap-1.5 cursor-pointer"
            >
              {copied === 'default_url' ? <Check className="w-3.5 h-3.5 text-[#50CD89]" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied === 'default_url' ? 'Copiado!' : 'Copiar Link'}</span>
            </button>
            <a
              href={`https://${defaultDomain}`}
              target="_blank"
              rel="noreferrer"
              className="px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-[#1A1C24] hover:bg-[#232530] border border-[#232530] transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5 text-[#38bdf8]" />
              <span>Abrir Endereço</span>
            </a>
          </div>
        </div>

        <p className="text-xs text-[#92929F] leading-relaxed">
          ⚡ <strong>Ativação Imediata:</strong> Este endereço foi provisionado automaticamente para sua franquia via wildcard DNS (<code className="text-[#38bdf8] font-mono">*.sigmast.site</code>). Ele já conta com certificado SSL/HTTPS Let's Encrypt ativo e <strong>nunca expira</strong>. Mesmo se você definir um domínio personalizado abaixo, este endereço continuará funcionando normalmente!
        </p>
      </div>

      {/* CARD 2: Domínio Customizado Próprio (Opcional) */}
      <div className="bg-[#14151C] border border-[#1E202B] rounded-2xl p-6 space-y-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1E202B] pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#009EF7]/15 flex items-center justify-center text-[#009EF7]">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-white">Domínio Personalizado Próprio</h2>
                {customDomain ? (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#50CD89]/15 text-[#50CD89] border border-[#50CD89]/30">
                    🟢 Domínio Próprio Ativo
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#92929F]/15 text-[#92929F] border border-[#92929F]/30">
                    Opcional
                  </span>
                )}
              </div>
              <p className="text-xs text-[#92929F] font-mono mt-0.5">
                {customDomain ? `https://${customDomain}` : 'Nenhum domínio próprio configurado (usando endereço padrão)'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadDomainConfig}
              title="Atualizar status do domínio"
              className="p-2.5 rounded-xl text-[#92929F] hover:text-white bg-[#0F1014] border border-[#232530] transition-all cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#009EF7]' : ''}`} />
            </button>
            {customDomain && (
              <a
                href={`https://${customDomain}`}
                target="_blank"
                rel="noreferrer"
                className="px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-[#1A1C24] hover:bg-[#232530] border border-[#232530] transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5 text-[#009EF7]" />
                <span>Abrir Domínio Próprio</span>
              </a>
            )}
          </div>
        </div>

        {/* Formulário para definir/alterar domínio customizado (apenas Master) */}
        {isMaster ? (
          <form onSubmit={handleSaveDomain} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-white mb-1.5 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#FF9900]" />
                <span>Definir ou Alterar Domínio Personalizado</span>
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={inputDomain}
                  onChange={(e) => setInputDomain(e.target.value)}
                  placeholder="Ex: painel.minhamarca.com ou gestorvip.com"
                  className="flex-1 px-4 py-3 bg-[#0F1014] border border-[#232530] rounded-xl text-xs text-white placeholder-[#5E6278] focus:outline-none focus:border-[#009EF7] font-mono transition-all"
                />
                <button
                  type="button"
                  onClick={testDnsResolution}
                  disabled={testingDns}
                  className="px-4 py-3 rounded-xl text-xs font-semibold text-[#92929F] hover:text-white bg-[#1A1C24] hover:bg-[#232530] border border-[#232530] transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${testingDns ? 'animate-spin text-[#009EF7]' : ''}`} />
                  <span>{testingDns ? 'Testando...' : 'Testar DNS'}</span>
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-3 rounded-xl text-xs font-bold text-white bg-[#009EF7] hover:bg-[#0095E8] transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
                >
                  {saving ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Gravando no GitHub...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Salvar Domínio</span>
                    </>
                  )}
                </button>
              </div>
              <p className="text-[11px] text-[#92929F] mt-1.5">
                💡 Ao configurar seu domínio próprio, o endereço padrão (<code className="text-[#38bdf8] font-mono">https://{defaultDomain}</code>) <strong>permanece ativo</strong> e redireciona automaticamente quem o acessar. Para remover o domínio próprio e voltar a usar 100% o padrão, deixe o campo em branco e clique em <strong>Salvar Domínio</strong>.
              </p>
            </div>

            {dnsTestResult && (
              <div
                className={`p-3.5 rounded-xl text-xs space-y-1 ${
                  dnsTestResult.ok
                    ? 'bg-[#50CD89]/10 border border-[#50CD89]/30 text-[#50CD89]'
                    : 'bg-[#FF9900]/10 border border-[#FF9900]/30 text-[#FF9900]'
                }`}
              >
                <div className="flex items-center gap-2 font-bold">
                  {dnsTestResult.ok ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                  <span>{dnsTestResult.message}</span>
                </div>
                {dnsTestResult.details && (
                  <p className="text-[11px] opacity-80 pl-6 font-mono">{dnsTestResult.details}</p>
                )}
              </div>
            )}

            {statusMsg && (
              <div
                className={`p-3.5 rounded-xl text-xs flex items-center gap-2.5 ${
                  statusMsg.success
                    ? 'bg-[#50CD89]/10 border border-[#50CD89]/30 text-[#50CD89]'
                    : 'bg-[#F1416C]/10 border border-[#F1416C]/30 text-[#F1416C]'
                }`}
              >
                {statusMsg.success ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                <span>{statusMsg.text}</span>
              </div>
            )}
          </form>
        ) : (
          <div className="p-4 bg-[#0F1014] rounded-xl border border-[#232530] text-xs text-[#92929F]">
            O domínio customizado do painel é administrado pelo Franqueador Master.
          </div>
        )}

        {/* Tabela de Registros DNS para Apontamento */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">Como Apontar no seu Provedor de DNS (Cloudflare, etc.)</h3>
            <span className="text-[11px] text-[#50CD89] font-medium flex items-center gap-1">
              <Lock className="w-3 h-3" /> SSL/HTTPS Automático Gratuito
            </span>
          </div>

          <div className="bg-[#0F1014] border border-[#232530] rounded-xl overflow-hidden text-xs">
            <table className="w-full text-left">
              <thead className="bg-[#16171F] border-b border-[#232530] text-[#92929F] text-[10px] uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Cenário</th>
                  <th className="py-3 px-4">Tipo</th>
                  <th className="py-3 px-4">Nome / Host</th>
                  <th className="py-3 px-4">Destino / Valor</th>
                  <th className="py-3 px-4 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#232530]/60">
                <tr>
                  <td className="py-3 px-4 text-white font-medium">Subdomínio do Painel (Recomendado)</td>
                  <td className="py-3 px-4 font-bold text-[#009EF7] font-mono">CNAME</td>
                  <td className="py-3 px-4 font-mono text-white">painel (ou o seu subdomínio)</td>
                  <td className="py-3 px-4 font-mono font-bold text-[#50CD89]">{defaultDomain || githubTargetHost}</td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => copyText(defaultDomain || githubTargetHost, 'cname_gh')}
                      className="px-3 py-1 rounded-lg bg-[#1A1C24] hover:bg-[#232530] text-white text-[11px] font-semibold border border-[#232530] transition-all cursor-pointer inline-flex items-center gap-1"
                    >
                      {copied === 'cname_gh' ? <Check className="w-3 h-3 text-[#50CD89]" /> : <Copy className="w-3 h-3" />}
                      <span>{copied === 'cname_gh' ? 'Copiado!' : 'Copiar Destino'}</span>
                    </button>
                  </td>
                </tr>
                <tr>
                  <td className="py-3 px-4 text-white font-medium">Domínio Raiz (Apex)</td>
                  <td className="py-3 px-4 font-bold text-[#009EF7] font-mono">A</td>
                  <td className="py-3 px-4 font-mono text-white">@ (ou em branco)</td>
                  <td className="py-3 px-4 font-mono font-bold text-white">185.199.108.153</td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => copyText('185.199.108.153', 'a_gh')}
                      className="px-3 py-1 rounded-lg bg-[#1A1C24] hover:bg-[#232530] text-white text-[11px] font-semibold border border-[#232530] transition-all cursor-pointer inline-flex items-center gap-1"
                    >
                      {copied === 'a_gh' ? <Check className="w-3 h-3 text-[#50CD89]" /> : <Copy className="w-3 h-3" />}
                      <span>{copied === 'a_gh' ? 'Copiado!' : 'Copiar IP'}</span>
                    </button>
                  </td>
                </tr>
                <tr>
                  <td className="py-3 px-4 text-white font-medium">Servidor da API / Streaming</td>
                  <td className="py-3 px-4 font-bold text-[#009EF7] font-mono">CNAME</td>
                  <td className="py-3 px-4 font-mono text-white">api (ou dns)</td>
                  <td className="py-3 px-4 font-mono font-bold text-[#FF9900]">{APP_CONFIG.defaultDns || 'fastcdn.fit'}</td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => copyText(APP_CONFIG.defaultDns || 'fastcdn.fit', 'cname_api')}
                      className="px-3 py-1 rounded-lg bg-[#1A1C24] hover:bg-[#232530] text-white text-[11px] font-semibold border border-[#232530] transition-all cursor-pointer inline-flex items-center gap-1"
                    >
                      {copied === 'cname_api' ? <Check className="w-3 h-3 text-[#50CD89]" /> : <Copy className="w-3 h-3" />}
                      <span>{copied === 'cname_api' ? 'Copiado!' : 'Copiar Destino'}</span>
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Guia Rápido Cloudflare */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">Passo a Passo na Cloudflare</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-[#0F1014] border border-[#232530] p-4 rounded-xl space-y-2">
              <div className="w-6 h-6 rounded-full bg-[#009EF7]/15 text-[#009EF7] flex items-center justify-center font-bold text-xs">1</div>
              <h4 className="text-xs font-bold text-white">Criar Apontamento CNAME</h4>
              <p className="text-[11px] text-[#92929F]">No painel DNS do seu domínio, crie um registro <strong>CNAME</strong> apontando seu subdomínio para <code className="text-[#009EF7] font-mono">{defaultDomain || githubTargetHost}</code>.</p>
            </div>
            <div className="bg-[#0F1014] border border-[#232530] p-4 rounded-xl space-y-2">
              <div className="w-6 h-6 rounded-full bg-[#50CD89]/15 text-[#50CD89] flex items-center justify-center font-bold text-xs">2</div>
              <h4 className="text-xs font-bold text-white">Salvar o Domínio Acima</h4>
              <p className="text-[11px] text-[#92929F]">Digite o endereço no formulário acima e clique em <strong>Salvar Domínio</strong> para registrar e ativar os dois links.</p>
            </div>
            <div className="bg-[#0F1014] border border-[#232530] p-4 rounded-xl space-y-2">
              <div className="w-6 h-6 rounded-full bg-[#FF9900]/15 text-[#FF9900] flex items-center justify-center font-bold text-xs">3</div>
              <h4 className="text-xs font-bold text-white">Ambos os Links Ativos</h4>
              <p className="text-[11px] text-[#92929F]">Seus clientes poderão acessar pelo domínio próprio ou pelo link gratuito <code className="text-[#38bdf8] font-mono">{defaultDomain}</code> com HTTPS automático!</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
