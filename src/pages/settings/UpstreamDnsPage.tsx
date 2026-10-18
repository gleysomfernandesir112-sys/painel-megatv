import React, { useState, useEffect } from 'react';
import { useSigmaStore } from '../../store/SigmaStore';
import { apiService } from '../../services/apiService';
import { isPanelMaster } from '../../utils/panelAuth';
import {
  Server,
  Activity,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Sparkles,
  Zap,
  Globe,
  Radio,
  Copy,
  Check,
  ShieldCheck,
  ArrowRight,
  ExternalLink,
  Flame,
  Layers
} from 'lucide-react';

interface UpstreamProvider {
  id: string;
  name: string;
  pool: string;
  dns: string;
  defaultDns?: string;
  description?: string;
  testEndpoint?: string;
  aliases?: string[];
  updatedAt?: string;
}

interface ProviderState {
  currentDns: string;
  candidateDns: string;
  isTesting: boolean;
  testResult: {
    ok: boolean;
    status?: number;
    latencyMs?: number;
    serverMessage?: string;
    error?: string;
  } | null;
  isSaving: boolean;
  saveMessage: {
    success: boolean;
    text: string;
  } | null;
}

export const UpstreamDnsPage: React.FC = () => {
  const { profile } = useSigmaStore();
  const isMaster = isPanelMaster(profile?.username, profile);

  const [loading, setLoading] = useState(true);
  const [providers, setProviders] = useState<UpstreamProvider[]>([]);
  const [providerStates, setProviderStates] = useState<Record<string, ProviderState>>({});
  const [globalMessage, setGlobalMessage] = useState<{ success: boolean; text: string } | null>(null);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 2500);
  };

  const loadProviders = async () => {
    setLoading(true);
    try {
      const res = await apiService.getUpstreamDns();
      if (res && res.providers && Array.isArray(res.providers)) {
        setProviders(res.providers);
        const states: Record<string, ProviderState> = {};
        for (const p of res.providers) {
          states[p.id] = {
            currentDns: p.dns,
            candidateDns: p.dns,
            isTesting: false,
            testResult: null,
            isSaving: false,
            saveMessage: null
          };
        }
        setProviderStates(states);
      }
    } catch (err: any) {
      setGlobalMessage({ success: false, text: `Erro ao carregar provedores: ${err.message}` });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProviders();
  }, []);

  const handleDnsChange = (providerId: string, val: string) => {
    setProviderStates(prev => ({
      ...prev,
      [providerId]: {
        ...(prev[providerId] || {
          currentDns: '',
          candidateDns: '',
          isTesting: false,
          testResult: null,
          isSaving: false,
          saveMessage: null
        }),
        candidateDns: val,
        testResult: null,
        saveMessage: null
      }
    }));
  };

  const handleTestConnection = async (p: UpstreamProvider) => {
    const st = providerStates[p.id];
    const candidate = (st?.candidateDns || p.dns).trim();

    if (!candidate) {
      setProviderStates(prev => ({
        ...prev,
        [p.id]: {
          ...prev[p.id],
          testResult: { ok: false, error: 'A URL do DNS não pode estar vazia.' }
        }
      }));
      return;
    }

    setProviderStates(prev => ({
      ...prev,
      [p.id]: {
        ...prev[p.id],
        isTesting: true,
        testResult: null,
        saveMessage: null
      }
    }));

    try {
      const result = await apiService.testUpstreamDns(candidate, p.testEndpoint, p.id);
      setProviderStates(prev => ({
        ...prev,
        [p.id]: {
          ...prev[p.id],
          isTesting: false,
          testResult: result
        }
      }));
    } catch (err: any) {
      setProviderStates(prev => ({
        ...prev,
        [p.id]: {
          ...prev[p.id],
          isTesting: false,
          testResult: { ok: false, error: err.message || 'Falha ao testar conectividade.' }
        }
      }));
    }
  };

  const handleSaveDns = async (p: UpstreamProvider) => {
    const st = providerStates[p.id];
    const candidate = (st?.candidateDns || p.dns).trim();

    if (!candidate) {
      return;
    }

    setProviderStates(prev => ({
      ...prev,
      [p.id]: {
        ...prev[p.id],
        isSaving: true,
        saveMessage: null
      }
    }));

    try {
      const res = await apiService.updateUpstreamDns(p.id, candidate);
      if (res.success) {
        setProviderStates(prev => ({
          ...prev,
          [p.id]: {
            ...prev[p.id],
            currentDns: candidate,
            candidateDns: candidate,
            isSaving: false,
            saveMessage: {
              success: true,
              text: res.message || `DNS de ${p.name} atualizado com sucesso!`
            }
          }
        }));
        setGlobalMessage({
          success: true,
          text: `DNS de ${p.name} atualizado para ${candidate}! ${res.updatedAccountsCount ?? 0} contas do pool sincronizadas instantaneamente.`
        });
        setTimeout(() => setGlobalMessage(null), 8000);
        // Atualiza a lista geral
        loadProviders();
      } else {
        setProviderStates(prev => ({
          ...prev,
          [p.id]: {
            ...prev[p.id],
            isSaving: false,
            saveMessage: {
              success: false,
              text: res.message || 'Erro ao atualizar DNS no servidor.'
            }
          }
        }));
      }
    } catch (err: any) {
      setProviderStates(prev => ({
        ...prev,
        [p.id]: {
          ...prev[p.id],
          isSaving: false,
          saveMessage: {
            success: false,
            text: err.message || 'Falha na requisição de atualização.'
          }
        }
      }));
    }
  };

  if (!isMaster) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-white mb-2">Acesso Restrito ao Painel Master</h2>
          <p className="text-gray-400 text-sm">
            Apenas a Franquia Master possui autorização para alterar os servidores e DNS upstream do sistema de streaming.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
              <Server className="w-7 h-7 text-[#00c0ef]" />
              Servidores & DNS Upstream
            </h1>
            <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold text-[10px] px-2.5 py-0.5 rounded-full flex items-center gap-1">
              <Zap className="w-3 h-3" />
              HOT-SWAP ATIVO
            </span>
          </div>
          <p className="text-sm text-gray-400 mt-1">
            Altere as URLs de servidores upstream em tempo real com 1 clique. Todas as contas de pool, canais e filmes são migrados sem queda e sem reiniciar o servidor.
          </p>
        </div>

        <button
          onClick={loadProviders}
          disabled={loading}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-[#1a222d] hover:bg-[#222d3b] text-gray-200 border border-gray-700/60 rounded-lg text-sm font-medium transition-all shadow-sm"
        >
          <RefreshCw className={`w-4 h-4 text-cyan-400 ${loading ? 'animate-spin' : ''}`} />
          <span>Atualizar Dados</span>
        </button>
      </div>

      {/* GLOBAL ALERT / STATUS BANNER */}
      {globalMessage && (
        <div
          className={`p-4 rounded-xl border flex items-center gap-3 transition-all ${
            globalMessage.success
              ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-200'
              : 'bg-red-500/15 border-red-500/30 text-red-200'
          }`}
        >
          {globalMessage.success ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
          )}
          <span className="text-sm font-medium">{globalMessage.text}</span>
        </div>
      )}

      {/* QUICK EXPLAINER CARD */}
      <div className="bg-gradient-to-r from-blue-950/40 via-cyan-950/20 to-slate-900 border border-cyan-500/30 rounded-2xl p-5 shadow-lg relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 bg-cyan-500/20 rounded-xl text-cyan-400 shrink-0 mt-0.5">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white flex items-center gap-2">
                Proteção Anti-Queda & Auto-Reescrita de Domínios
              </h3>
              <p className="text-xs text-gray-300 mt-1 leading-relaxed max-w-3xl">
                Quando um provedor (como PosTV) altera seu DNS oficial, basta digitar a nova URL abaixo, clicar em <strong>"Testar Conexão"</strong> e depois em <strong>"Salvar e Aplicar DNS"</strong>. O sistema reescreve automaticamente todos os domínios legados sem causar tela preta para clientes que já estejam assistindo.
              </p>
            </div>
          </div>
          <div className="shrink-0 flex items-center gap-2 bg-[#0c131c] px-3.5 py-2 rounded-xl border border-cyan-500/20 text-xs text-cyan-300 font-mono">
            <Activity className="w-4 h-4 text-emerald-400 animate-pulse" />
            <span>Pools Sincronizados em Memória</span>
          </div>
        </div>
      </div>

      {/* PROVIDERS LIST */}
      {loading && providers.length === 0 ? (
        <div className="py-16 text-center">
          <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin mx-auto mb-3" />
          <p className="text-gray-400 text-sm">Carregando lista de provedores upstream...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {providers.map(p => {
            const st = providerStates[p.id] || {
              currentDns: p.dns,
              candidateDns: p.dns,
              isTesting: false,
              testResult: null,
              isSaving: false,
              saveMessage: null
            };

            const isModified = st.candidateDns.trim() !== p.dns.trim();

            return (
              <div
                key={p.id}
                className="bg-[#141b24] border border-gray-800 hover:border-gray-700/80 rounded-2xl p-6 transition-all shadow-md relative"
              >
                {/* CARD HEADER */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-gray-800/80">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-[#1e293b] rounded-xl text-[#00c0ef] shrink-0">
                      <Radio className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg font-bold text-white">{p.name}</h2>
                        <span className="bg-gray-800 text-gray-300 text-[10px] font-mono px-2 py-0.5 rounded border border-gray-700">
                          ID: {p.id}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {p.description || `Pool: ${p.pool}`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    <span className="bg-blue-500/10 text-blue-400 border border-blue-500/30 text-xs px-2.5 py-1 rounded-lg font-medium flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5" />
                      Pool: {p.pool}
                    </span>
                    {p.id === 'postv' && (
                      <span className="bg-amber-500/10 text-amber-300 border border-amber-500/30 text-xs px-2.5 py-1 rounded-lg font-medium flex items-center gap-1">
                        <Flame className="w-3.5 h-3.5 text-amber-400" />
                        Live TV & Futebol
                      </span>
                    )}
                  </div>
                </div>

                {/* CURRENT DNS INFO */}
                <div className="mt-4 grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
                  <div className="lg:col-span-5 bg-[#0b1017] p-3.5 rounded-xl border border-gray-800">
                    <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1 flex items-center justify-between">
                      <span>DNS Atual em Operação</span>
                      {p.updatedAt && (
                        <span className="text-[10px] text-gray-500 lowercase">
                          atualizado recentemente
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <code className="text-sm font-mono text-emerald-400 truncate select-all">
                        {p.dns}
                      </code>
                      <button
                        onClick={() => copyToClipboard(p.dns)}
                        className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition-colors"
                        title="Copiar URL"
                      >
                        {copiedText === p.dns ? (
                          <Check className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* EDIT INPUT & ACTIONS */}
                  <div className="lg:col-span-7 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                    <div className="relative flex-1">
                      <input
                        type="text"
                        value={st.candidateDns}
                        onChange={e => handleDnsChange(p.id, e.target.value)}
                        placeholder="http://novo-dns.top"
                        className="w-full bg-[#0d141d] border border-gray-700/80 focus:border-[#00c0ef] focus:ring-1 focus:ring-[#00c0ef] text-white text-sm rounded-xl px-3.5 py-2.5 font-mono placeholder-gray-500 transition-all"
                      />
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleTestConnection(p)}
                        disabled={st.isTesting || st.isSaving}
                        className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3.5 py-2.5 bg-[#1e293b] hover:bg-[#2d3a4f] text-gray-200 border border-gray-700 rounded-xl text-xs font-semibold transition-all shadow-sm"
                      >
                        {st.isTesting ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
                            <span>Testando...</span>
                          </>
                        ) : (
                          <>
                            <Activity className="w-3.5 h-3.5 text-cyan-400" />
                            <span>Testar Conexão</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSaveDns(p)}
                        disabled={st.isSaving || st.isTesting || (!isModified && !st.testResult?.ok)}
                        className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md ${
                          isModified || st.testResult?.ok
                            ? 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white shadow-emerald-500/20'
                            : 'bg-gray-800 text-gray-500 cursor-not-allowed border border-gray-700/50'
                        }`}
                      >
                        {st.isSaving ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Salvando...</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Salvar e Aplicar DNS</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* TEST RESULT FEEDBACK */}
                {st.testResult && (
                  <div
                    className={`mt-3.5 p-3 rounded-xl border text-xs flex items-center justify-between gap-3 ${
                      st.testResult.ok
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                        : 'bg-red-500/10 border-red-500/30 text-red-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-medium">
                      {st.testResult.ok ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                      )}
                      <span>
                        {st.testResult.ok
                          ? st.testResult.serverMessage || 'Servidor online e respondendo com sucesso!'
                          : `Falha na conexão: ${st.testResult.error || `HTTP ${st.testResult.status}`}`}
                      </span>
                    </div>
                    {st.testResult.latencyMs !== undefined && (
                      <span className="font-mono text-[11px] bg-black/40 px-2.5 py-1 rounded-md shrink-0 border border-white/5">
                        Ping: {st.testResult.latencyMs}ms
                      </span>
                    )}
                  </div>
                )}

                {/* SAVE MESSAGE FEEDBACK */}
                {st.saveMessage && (
                  <div
                    className={`mt-3.5 p-3 rounded-xl border text-xs flex items-center gap-2 font-medium ${
                      st.saveMessage.success
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                        : 'bg-red-500/10 border-red-500/30 text-red-300'
                    }`}
                  >
                    {st.saveMessage.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                    )}
                    <span>{st.saveMessage.text}</span>
                  </div>
                )}

                {/* ALIASES / AUTO REWRITE BADGES */}
                {p.aliases && p.aliases.length > 0 && (
                  <div className="mt-4 pt-3.5 border-t border-gray-800/80 flex flex-wrap items-center gap-2">
                    <span className="text-[11px] font-medium text-gray-400 flex items-center gap-1.5 mr-1">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      Auto-reescrita de links legados:
                    </span>
                    {p.aliases.map(alias => (
                      <span
                        key={alias}
                        className="bg-gray-800/90 text-gray-300 text-[10px] font-mono px-2 py-0.5 rounded border border-gray-700/60"
                      >
                        {alias} ➜ {new URL(st.candidateDns || p.dns).host}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* CLI SHORTCUT FOOTER */}
      <div className="bg-[#101721] border border-gray-800/90 rounded-2xl p-5 text-gray-400 text-xs">
        <h4 className="font-bold text-gray-200 text-sm mb-1.5 flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-400" />
          Prefere alterar via terminal SSH?
        </h4>
        <p className="leading-relaxed mb-3 text-gray-400">
          Você também pode executar o comando CLI oficial diretamente na VPS Master ou Replica:
        </p>
        <div className="bg-[#080d14] p-3 rounded-xl border border-gray-800 font-mono text-cyan-300 select-all text-xs flex items-center justify-between">
          <span>node scripts/set-upstream-dns.js postv http://postdiscart.top</span>
          <button
            onClick={() => copyToClipboard('node scripts/set-upstream-dns.js postv http://postdiscart.top')}
            className="p-1 hover:text-white"
            title="Copiar comando"
          >
            {copiedText?.includes('scripts/set-upstream-dns.js') ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
export default UpstreamDnsPage;
