import React, { useState, useEffect } from 'react';
import { useSigmaStore } from '../store/SigmaStore';
import { fastCdnApi } from '../services/fastcdn';
import { maxPlayerApi } from '../services/maxplayer';
import { APP_CONFIG } from '../config/appConfig';
import { LayoutGrid, MessageCircle, CreditCard, Webhook, CheckCircle2, Key, ShieldCheck, Eye, EyeOff, Loader2, AlertCircle, ToggleLeft, ToggleRight, Tv2 } from 'lucide-react';

export const IntegrationsPage: React.FC = () => {
  const { isLiveConnected } = useSigmaStore();

  // MaxPlayer Integration State
  const [mpApiKey, setMpApiKey] = useState('');
  const [mpEnabled, setMpEnabled] = useState(false);
  const [mpHasKey, setMpHasKey] = useState(false);
  const [mpKeyPreview, setMpKeyPreview] = useState<string | null>(null);
  const [mpLoading, setMpLoading] = useState(true);
  const [mpTesting, setMpTesting] = useState(false);
  const [mpTestResult, setMpTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [mpSaving, setMpSaving] = useState(false);

  // Load status from server on mount
  useEffect(() => {
    setMpLoading(true);
    maxPlayerApi.getStatus()
      .then((status) => {
        setMpEnabled(status.enabled);
        setMpHasKey(status.hasKey);
        setMpKeyPreview(status.keyPreview);
      })
      .catch(() => {})
      .finally(() => setMpLoading(false));
  }, []);

  const handleMpSave = async () => {
    if (!mpApiKey.trim() && !mpHasKey) {
      setMpTestResult({ ok: false, message: 'Informe a chave API antes de salvar.' });
      return;
    }
    setMpSaving(true);
    setMpTestResult(null);
    try {
      const result = await maxPlayerApi.saveConfig(mpApiKey.trim(), mpEnabled);
      if (result.success) {
        setMpTestResult({ ok: true, message: 'Configuração salva no servidor com sucesso!' });
        setMpHasKey(true);
        if (mpApiKey.trim()) {
          setMpKeyPreview('mpk_' + '***********' + mpApiKey.trim().slice(-6));
          setMpApiKey(''); // clear field after saving
        }
      } else {
        setMpTestResult({ ok: false, message: result.error || 'Erro ao salvar.' });
      }
    } catch (err: any) {
      setMpTestResult({ ok: false, message: err?.message || 'Erro de rede.' });
    } finally {
      setMpSaving(false);
    }
  };

  const handleMpToggle = async (newValue: boolean) => {
    setMpEnabled(newValue);
    setMpTestResult(null);
    // Persist toggle immediately to server
    try {
      await maxPlayerApi.saveConfig('', newValue);
    } catch {}
  };

  const handleMpTest = async () => {
    setMpTesting(true);
    setMpTestResult(null);
    try {
      const info = await maxPlayerApi.testConnection();
      setMpTestResult({
        ok: true,
        message: `Conectado! Conta: ${info.name} · ${info.users}/${info.max_users} usuários`
      });
    } catch (err: any) {
      setMpTestResult({
        ok: false,
        message: err?.message || 'Falha ao conectar com MaxPlayer'
      });
    } finally {
      setMpTesting(false);
    }
  };

  return (
    <div className="space-y-6 select-none">
      <div>
        <h1 className="text-xl font-bold text-white tracking-tight">Integrações &amp; Automação</h1>
        <p className="text-xs text-[#92929F] mt-1">
          Conexões ativas de API, instâncias de WhatsApp e gateways.
        </p>
      </div>

      {/* API Status Card */}
      <div className="bg-[#14151C] border border-[#1E202B] rounded-xl p-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#50CD89]/10 flex items-center justify-center text-[#50CD89]">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white">Chave Master da API</span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                isLiveConnected
                  ? 'bg-[#50CD89]/15 text-[#50CD89] border-[#50CD89]/30'
                  : 'bg-[#FF9900]/15 text-[#FF9900] border-[#FF9900]/30'
              }`}>
                {isLiveConnected ? 'Protegida & Conectada' : 'Offline'}
              </span>
            </div>
            <div className="text-xs text-[#50CD89] font-medium flex items-center gap-1.5 mt-0.5">
              <ShieldCheck className="w-3.5 h-3.5 text-[#50CD89]" />
              <span>Configuração de acesso segura</span>
            </div>
          </div>
        </div>
      </div>

      {/* MaxPlayer Integration Card */}
      <div className="bg-[#14151C] border border-[#1E202B] rounded-2xl p-6 space-y-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#9C27B0]/10 border border-[#9C27B0]/20 flex items-center justify-center text-[#9C27B0]">
              <Tv2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-white">MaxPlayer IPTV</h2>
                {mpLoading ? (
                  <Loader2 className="w-3.5 h-3.5 text-[#5E6278] animate-spin" />
                ) : (
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                    mpEnabled && mpHasKey
                      ? 'bg-[#50CD89]/15 text-[#50CD89] border-[#50CD89]/30'
                      : mpHasKey
                        ? 'bg-[#FF9900]/15 text-[#FF9900] border-[#FF9900]/30'
                        : 'bg-[#92929F]/15 text-[#92929F] border-[#92929F]/30'
                  }`}>
                    {mpEnabled && mpHasKey ? 'Ativo' : mpHasKey ? 'Desativado' : 'Sem chave'}
                  </span>
                )}
              </div>
              <p className="text-xs text-[#92929F] mt-0.5">
                Ao criar um cliente oficial no painel, ele é criado automaticamente no MaxPlayer com as mesmas credenciais.
              </p>
            </div>
          </div>

          {/* Toggle */}
          <button
            onClick={() => handleMpToggle(!mpEnabled)}
            disabled={mpLoading || !mpHasKey}
            className={`shrink-0 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${mpEnabled ? 'text-[#50CD89]' : 'text-[#5E6278]'}`}
            title={mpEnabled ? 'Desativar integração' : 'Ativar integração'}
          >
            {mpEnabled
              ? <ToggleRight className="w-8 h-8" />
              : <ToggleLeft className="w-8 h-8" />
            }
          </button>
        </div>

        {/* Current Key Status (server-side, masked) */}
        {mpHasKey && mpKeyPreview && (
          <div className="flex items-center gap-2 px-3.5 py-2.5 bg-[#50CD89]/5 border border-[#50CD89]/20 rounded-xl">
            <ShieldCheck className="w-3.5 h-3.5 text-[#50CD89] shrink-0" />
            <span className="text-xs text-[#50CD89] font-mono flex-1 truncate">{mpKeyPreview}</span>
            <span className="text-[10px] text-[#50CD89]/60 font-medium">Armazenada no servidor</span>
          </div>
        )}

        {/* API Key Field (for updating the key) */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-[#92929F] uppercase tracking-wider">
            {mpHasKey ? 'Atualizar Chave da API MaxPlayer' : 'Chave da API MaxPlayer (Api-Token)'}
          </label>
          <div className="relative flex items-center">
            <input
              type="password"
              value={mpApiKey}
              onChange={(e) => { setMpApiKey(e.target.value); setMpTestResult(null); }}
              placeholder={mpHasKey ? 'Cole aqui para substituir a chave atual' : 'mpk_...'}
              className="w-full bg-[#1A1C24] border border-[#232530] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-[#5E6278] focus:outline-none focus:border-[#9C27B0] font-mono transition-colors"
            />
          </div>
          <p className="text-[10px] text-[#5E6278]">
            {mpHasKey
              ? 'A chave atual está segura no servidor. Preencha apenas para trocar.'
              : 'Encontre em: Painel MaxPlayer → API Keys. Começa com mpk_'}
          </p>
        </div>

        {/* Test Result */}
        {mpTestResult && (
          <div className={`flex items-start gap-2 px-3.5 py-2.5 rounded-xl border text-xs font-medium ${
            mpTestResult.ok
              ? 'bg-[#50CD89]/10 border-[#50CD89]/30 text-[#50CD89]'
              : 'bg-[#F1416C]/10 border-[#F1416C]/30 text-[#F1416C]'
          }`}>
            {mpTestResult.ok
              ? <CheckCircle2 className="w-4 h-4 shrink-0 mt-px" />
              : <AlertCircle className="w-4 h-4 shrink-0 mt-px" />
            }
            <span>{mpTestResult.message}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={handleMpTest}
            disabled={mpTesting || !mpHasKey}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-[#9C27B0] hover:bg-[#8e22a0] text-white transition-all disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
          >
            {mpTesting
              ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /><span>Testando...</span></>
              : <><ShieldCheck className="w-3.5 h-3.5" /><span>Testar Conexão</span></>
            }
          </button>
          <button
            onClick={handleMpSave}
            disabled={mpSaving || (!mpApiKey.trim() && !mpHasKey)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-[#1A1C24] hover:bg-[#232530] text-white border border-[#232530] transition-all cursor-pointer disabled:opacity-40"
          >
            {mpSaving
              ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /><span>Salvando...</span></>
              : <span>Salvar Configuração</span>
            }
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Botbot WhatsApp */}
        <div className="bg-[#14151C] border border-[#1E202B] rounded-xl p-5 space-y-4">
          <div className="w-10 h-10 rounded-lg bg-[#50CD89]/10 flex items-center justify-center text-[#50CD89]">
            <MessageCircle className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white">Bot WhatsApp &amp; WhatsAuto</h2>
            <p className="text-xs text-[#92929F] mt-1">
              Disparo automático de testes em 1 clique e lembretes de cobrança via API v1.3.0.
            </p>
          </div>
          <button
            onClick={() => alert('Endpoint para bots configurado: ' + APP_CONFIG.apiBaseUrl + '/api/v1/user.php com action: "teste"')}
            className="w-full py-2 rounded-lg text-xs font-semibold bg-[#50CD89] text-white hover:bg-[#47be7d] transition-all cursor-pointer"
          >
            Configurar WhatsAuto Bot
          </button>
        </div>

        {/* Mercado Pago / PIX */}
        <div className="bg-[#14151C] border border-[#1E202B] rounded-xl p-5 space-y-4">
          <div className="w-10 h-10 rounded-lg bg-[#009EF7]/10 flex items-center justify-center text-[#009EF7]">
            <CreditCard className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white">Mercado Pago PIX</h2>
            <p className="text-xs text-[#92929F] mt-1">
              Geração de QR Code PIX com confirmação instantânea para clientes e revendas.
            </p>
          </div>
          <button
            onClick={() => alert('Configuração de PIX ativa!')}
            className="w-full py-2 rounded-lg text-xs font-semibold bg-[#009EF7] text-white hover:bg-[#0095E8] transition-all cursor-pointer"
          >
            Configurar Credenciais PIX
          </button>
        </div>

        {/* Webhooks */}
        <div className="bg-[#14151C] border border-[#1E202B] rounded-xl p-5 space-y-4">
          <div className="w-10 h-10 rounded-lg bg-[#9C27B0]/10 flex items-center justify-center text-[#9C27B0]">
            <Webhook className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white">Webhooks de Eventos</h2>
            <p className="text-xs text-[#92929F] mt-1">
              Receba notificações HTTP em tempo real quando um cliente for criado ou renovado.
            </p>
          </div>
          <button
            onClick={() => alert('Webhooks apontados para o endpoint oficial da API.')}
            className="w-full py-2 rounded-lg text-xs font-semibold bg-[#1A1C24] text-[#92929F] hover:text-white border border-[#232530] transition-all cursor-pointer"
          >
            Gerenciar Endpoints
          </button>
        </div>
      </div>

      {/* AI-First API Documentation & Spec v1.3.0 */}
      <div className="bg-[#14151C] border border-[#1E202B] rounded-2xl p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1E202B] pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#009EF7]/10 border border-[#009EF7]/20 flex items-center justify-center text-[#009EF7]">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>API de Streaming — Referência IA</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#009EF7]/15 text-[#009EF7] border border-[#009EF7]/30">
                  AI-First
                </span>
              </h2>
              <p className="text-xs text-[#92929F] mt-0.5">
                Especificação token-otimizada para ChatGPT, Claude, Cursor, WhatsAuto e automações.
              </p>
            </div>
          </div>

          <a
            href="https://fastcdn.fit/api-docs"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 rounded-xl text-xs font-bold bg-[#009EF7] hover:bg-[#0086D1] text-white transition-all shadow-md shadow-blue-500/20 text-center"
          >
            Documentação Interativa ↗
          </a>
        </div>

        {/* Endpoints Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-[#1A1C24] p-3.5 rounded-xl border border-[#232530] space-y-1">
            <span className="text-[10px] text-[#92929F] uppercase font-bold tracking-wider">Especificação LLMs</span>
            <div className="font-mono text-xs text-white truncate">https://fastcdn.fit/llms.txt</div>
            <button
              onClick={() => {
                navigator.clipboard.writeText('https://fastcdn.fit/llms.txt');
                alert('URL llms.txt copiada!');
              }}
              className="text-[11px] text-[#009EF7] hover:underline font-semibold cursor-pointer pt-1 block"
            >
              Copiar URL
            </button>
          </div>

          <div className="bg-[#1A1C24] p-3.5 rounded-xl border border-[#232530] space-y-1">
            <span className="text-[10px] text-[#92929F] uppercase font-bold tracking-wider">OpenAPI 3.1 JSON</span>
            <div className="font-mono text-xs text-white truncate">https://fastcdn.fit/openapi.json</div>
            <button
              onClick={() => {
                navigator.clipboard.writeText('https://fastcdn.fit/openapi.json');
                alert('URL openapi.json copiada!');
              }}
              className="text-[11px] text-[#009EF7] hover:underline font-semibold cursor-pointer pt-1 block"
            >
              Copiar URL
            </button>
          </div>

          <div className="bg-[#1A1C24] p-3.5 rounded-xl border border-[#232530] space-y-1">
            <span className="text-[10px] text-[#92929F] uppercase font-bold tracking-wider">Endpoint Smart AI</span>
            <div className="font-mono text-xs text-white truncate">https://fastcdn.fit/api/v1/ai-spec</div>
            <button
              onClick={() => {
                navigator.clipboard.writeText('https://fastcdn.fit/api/v1/ai-spec');
                alert('URL ai-spec copiada!');
              }}
              className="text-[11px] text-[#009EF7] hover:underline font-semibold cursor-pointer pt-1 block"
            >
              Copiar URL
            </button>
          </div>
        </div>

        {/* AI System Prompt Snippet */}
        <div className="bg-[#101117] border border-[#1E202B] rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-white">System Prompt Recomendado para IAs &amp; Bots</span>
            <button
              onClick={() => {
                const prompt = `You are a streaming panel API integration assistant. You generate valid JSON payloads and API requests for managing streaming clients and sub-resellers.\nAlways format requests using 'Authorization: Bearer fcdn_live_{KEY}' (or 'X-API-Key: fcdn_live_{KEY}') and 'Content-Type: application/json'.\nWhen creating a client, calculate credits as (connections * months). Supports 'meses' or 'dias'.\nWhen creating tests, use action 'teste' with 'horas' (default 4).\nWhen managing sub-resellers, use action 'criar_subrevenda' and 'creditos_subrevenda' (positive to fund, negative to recall).\nWhen authenticating a reseller from an external website, use 'POST /api/v1/auth/reseller-login' with the parent's X-API-Key.\nTo view the recursive multi-level branch or global system, use 'GET /api/v1/hierarchy'.`;
                navigator.clipboard.writeText(prompt);
                alert('System Prompt copiado com sucesso!');
              }}
              className="text-[#50CD89] hover:underline font-semibold cursor-pointer text-xs flex items-center gap-1"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Copiar Prompt para ChatGPT</span>
            </button>
          </div>
          <pre className="text-[11px] font-mono text-[#92929F] bg-[#161720] p-3 rounded-lg overflow-x-auto whitespace-pre-wrap leading-relaxed border border-[#232530]">
{`You are a streaming panel API integration assistant. You generate valid JSON payloads and API requests for managing streaming clients and sub-resellers.
Always format requests using 'Authorization: Bearer fcdn_live_{KEY}' and 'Content-Type: application/json'.
- Teste Grátis: POST /api/v1/user.php { "action": "teste", "horas": 4, "nome_usuario": "Nome" }
- Criar Cliente: POST /api/v1/user.php { "action": "criar", "login_usuario": "...", "senha_usuario": "...", "meses": 1, "conectado": 1 }
- Sub-Revendas: POST /api/v1/user.php { "action": "criar_subrevenda", "creditos": 10 }
- Árvore Hierárquica: GET /api/v1/hierarchy`}
          </pre>
        </div>
      </div>
    </div>
  );
};
