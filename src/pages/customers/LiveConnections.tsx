import React, { useState } from 'react';
import { useSigmaStore } from '../../store/SigmaStore';
import { fastCdnApi } from '../../services/fastcdn';
import { RefreshCw, Activity, Power, Tv, Monitor, Clock, Globe, User, Radio, Film, Clapperboard, Zap } from 'lucide-react';

export const LiveConnections: React.FC = () => {
  const { liveConnections, refreshLiveData, isLoadingLive, disconnectLiveConnection } = useSigmaStore();
  const [droppingId, setDroppingId] = useState<string | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [actionNotice, setActionNotice] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'live' | 'movie' | 'series'>('all');

  const liveCount = liveConnections.filter((c: any) => c.type === 'live' || !c.type).length;
  const movieCount = liveConnections.filter((c: any) => c.type === 'movie').length;
  const seriesCount = liveConnections.filter((c: any) => c.type === 'series').length;

  const filteredConnections = liveConnections.filter((c: any) => {
    if (filterType === 'live') return c.type === 'live' || !c.type;
    if (filterType === 'movie') return c.type === 'movie';
    if (filterType === 'series') return c.type === 'series';
    return true;
  });

  const handleDisconnect = async (id: string, username: string) => {
    if (!window.confirm(`Deseja realmente derrubar a conexão de @${username}?`)) {
      return;
    }
    setDroppingId(id || username);
    try {
      const res = await disconnectLiveConnection(id, username);
      setActionNotice({ text: res.message || 'Conexão encerrada com sucesso.', type: 'success' });
      setTimeout(() => setActionNotice(null), 4000);
    } catch (err: any) {
      setActionNotice({ text: err.message || 'Falha ao encerrar conexão.', type: 'error' });
      setTimeout(() => setActionNotice(null), 4000);
    } finally {
      setDroppingId(null);
    }
  };

  const handleSimulateTest = async () => {
    setIsSimulating(true);
    try {
      const res = await fastCdnApi.postAction('simular_conexao', {});
      if (res && res.status === 'success') {
        setActionNotice({ text: res.message || 'Conexão simulada com sucesso para testes.', type: 'success' });
        await refreshLiveData();
      } else {
        setActionNotice({ text: res.message || 'Nenhum cliente disponível para teste.', type: 'error' });
      }
      setTimeout(() => setActionNotice(null), 4000);
    } catch (err: any) {
      setActionNotice({ text: err.message || 'Erro ao simular conexão.', type: 'error' });
      setTimeout(() => setActionNotice(null), 4000);
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <div className="space-y-6 select-none">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-white">Conexões Ativas</h1>
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px] font-bold inline-flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              {liveConnections.length} ativa{liveConnections.length === 1 ? '' : 's'}
            </span>
          </div>
          <p className="text-xs text-[#92929F] mt-0.5">
            Monitoramento em tempo real de canais ao vivo, filmes e séries transmitidos na sua rede.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {liveConnections.length === 0 && (
            <button
              onClick={handleSimulateTest}
              disabled={isSimulating || isLoadingLive}
              className="px-3 py-2 bg-[#1A1C24] hover:bg-[#222430] border border-[#262833] rounded-xl text-[#92929F] hover:text-white transition-all disabled:opacity-50 flex items-center gap-1.5 text-xs font-semibold"
              title="Gera uma conexão simulada controlada para testar o painel"
            >
              <Radio className={`w-3.5 h-3.5 text-cyan-400 ${isSimulating ? 'animate-pulse' : ''}`} />
              <span>{isSimulating ? 'Iniciando...' : 'Testar Conexão'}</span>
            </button>
          )}

          <button
            onClick={() => refreshLiveData()}
            disabled={isLoadingLive}
            className="p-2 bg-[#14151C] hover:bg-[#1E202B] border border-[#1E202B] rounded-xl text-[#92929F] hover:text-white transition-all disabled:opacity-50 flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${isLoadingLive ? 'animate-spin text-[#009EF7]' : ''}`} />
            <span>Atualizar</span>
          </button>
        </div>
      </div>

      {actionNotice && (
        <div className={`p-3 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
          actionNotice.type === 'success'
            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
            : 'bg-[#F1416C]/10 border-[#F1416C]/20 text-[#F1416C]'
        }`}>
          <span>{actionNotice.text}</span>
        </div>
      )}

      {/* Filtros por Tipo de Conteúdo */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setFilterType('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
            filterType === 'all'
              ? 'bg-[#009EF7] text-white shadow-sm'
              : 'bg-[#14151C] text-[#92929F] hover:text-white border border-[#1E202B]'
          }`}
        >
          <span>Todos</span>
          <span className="px-1.5 py-0.2 rounded text-[10px] bg-black/20 font-mono">{liveConnections.length}</span>
        </button>

        <button
          onClick={() => setFilterType('live')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
            filterType === 'live'
              ? 'bg-cyan-600 text-white shadow-sm'
              : 'bg-[#14151C] text-[#92929F] hover:text-white border border-[#1E202B]'
          }`}
        >
          <Tv className="w-3.5 h-3.5" />
          <span>Canais Ao Vivo</span>
          <span className="px-1.5 py-0.2 rounded text-[10px] bg-black/20 font-mono">{liveCount}</span>
        </button>

        <button
          onClick={() => setFilterType('movie')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
            filterType === 'movie'
              ? 'bg-purple-600 text-white shadow-sm'
              : 'bg-[#14151C] text-[#92929F] hover:text-white border border-[#1E202B]'
          }`}
        >
          <Film className="w-3.5 h-3.5" />
          <span>Filmes</span>
          <span className="px-1.5 py-0.2 rounded text-[10px] bg-black/20 font-mono">{movieCount}</span>
        </button>

        <button
          onClick={() => setFilterType('series')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
            filterType === 'series'
              ? 'bg-amber-600 text-white shadow-sm'
              : 'bg-[#14151C] text-[#92929F] hover:text-white border border-[#1E202B]'
          }`}
        >
          <Clapperboard className="w-3.5 h-3.5" />
          <span>Séries</span>
          <span className="px-1.5 py-0.2 rounded text-[10px] bg-black/20 font-mono">{seriesCount}</span>
        </button>
      </div>

      {/* Tabela de Conexões */}
      <div className="bg-[#14151C] border border-[#1E202B] rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[800px]">
            <thead className="bg-[#14151C] text-[#92929F] border-b border-[#1E202B] uppercase text-[10px]">
              <tr>
                <th className="py-3 px-4 font-bold">Cliente</th>
                <th className="py-3 px-4 font-bold">Conteúdo Assistido</th>
                <th className="py-3 px-4 font-bold">Velocidade</th>
                <th className="py-3 px-4 font-bold">Player / Dispositivo</th>
                <th className="py-3 px-4 font-bold">IP & País</th>
                <th className="py-3 px-4 font-bold">Início</th>
                <th className="py-3 px-4 font-bold">Duração</th>
                <th className="py-3 px-4 font-bold text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E202B]/60">
              {filteredConnections.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-xs text-[#5E6278]">
                    <Activity className="w-8 h-8 text-[#5E6278] mx-auto mb-2 opacity-50" />
                    {liveConnections.length === 0
                      ? 'Nenhuma conexão ativa no momento na sua rede.'
                      : 'Nenhuma conexão ativa correspondente ao filtro selecionado.'}
                  </td>
                </tr>
              ) : (
                filteredConnections.map((c: any) => (
                  <tr key={c.id} className="hover:bg-[#1A1C24]/50 transition-colors">
                    {/* Cliente com Nome e Login */}
                    <td className="py-3 px-4">
                      <div className="font-bold text-white text-xs flex items-center gap-1.5">
                        <User className="w-3 h-3 text-[#009EF7] shrink-0" />
                        <span>{c.customer_name || c.name || c.username}</span>
                      </div>
                      <div className="font-mono text-[10px] text-[#92929F] flex items-center gap-1.5 mt-0.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0 animate-pulse" />
                        <span className="text-[#009EF7] font-semibold">@{c.username}</span>
                        {c.reseller_username && c.reseller_username !== 'admin' && (
                          <span className="text-[#6D6D80] text-[9px] truncate max-w-[120px]">
                            • {c.reseller_username}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Conteúdo Assistido */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        {c.type === 'movie' ? (
                          <div className="w-7 h-7 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shrink-0">
                            <Film className="w-3.5 h-3.5" />
                          </div>
                        ) : c.type === 'series' ? (
                          <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
                            <Clapperboard className="w-3.5 h-3.5" />
                          </div>
                        ) : (
                          <div className="w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0">
                            <Tv className="w-3.5 h-3.5" />
                          </div>
                        )}
                        <div className="min-w-0 max-w-[240px]">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`font-semibold truncate text-xs ${
                                c.type === 'movie'
                                  ? 'text-purple-300'
                                  : c.type === 'series'
                                  ? 'text-amber-300'
                                  : 'text-cyan-400'
                              }`}
                              title={c.stream_title}
                            >
                              {c.stream_title || (c.type === 'movie' ? 'Filme VOD' : (c.type === 'series' ? 'Série' : 'Canal Ao Vivo'))}
                            </span>
                            <span
                              className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase shrink-0 ${
                                c.type === 'movie'
                                  ? 'bg-purple-500/15 text-purple-400 border border-purple-500/30'
                                  : c.type === 'series'
                                  ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                                  : 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30'
                              }`}
                            >
                              {c.type === 'movie' ? 'Filme' : c.type === 'series' ? 'Série' : 'Ao Vivo'}
                            </span>
                          </div>
                          <div className="text-[10px] text-[#6D6D80] truncate mt-0.5">
                            {c.category || (c.type === 'movie' ? 'Filmes VOD' : (c.type === 'series' ? 'Séries' : 'Transmissão Ao Vivo'))}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Velocidade / Taxa de Internet */}
                    <td className="py-3 px-4">
                      <div className="font-mono text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>{c.speed || '8.5 Mbps'}</span>
                      </div>
                      <div className="text-[10px] text-[#6D6D80] flex items-center gap-1 mt-0.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0 animate-pulse" />
                        <span>{c.speed_type || 'Taxa de Rede'}</span>
                      </div>
                    </td>

                    {/* Player / App */}
                    <td className="py-3 px-4">
                      <div className="text-[#92929F] flex items-center gap-1">
                        <Monitor className="w-3 h-3 text-[#5E6278] shrink-0" />
                        <span className="truncate max-w-[180px]">{c.user_agent || 'Player / Smart TV'}</span>
                      </div>
                    </td>

                    {/* IP & País */}
                    <td className="py-3 px-4">
                      <div className="font-mono text-[11px] text-white flex items-center gap-1">
                        <Globe className="w-3 h-3 text-[#5E6278] shrink-0" />
                        <span>{c.ip_address || '-'}</span>
                      </div>
                      <div className="text-[10px] text-[#6D6D80]">{c.country || 'BR'}</div>
                    </td>

                    {/* Início */}
                    <td className="py-3 px-4 text-[#92929F]">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-[#5E6278] shrink-0" />
                        <span>{c.connected_at || 'Agora'}</span>
                      </div>
                    </td>

                    {/* Duração */}
                    <td className="py-3 px-4">
                      <span className="text-emerald-400 font-bold font-mono text-xs">
                        {c.duration || '0s'}
                      </span>
                    </td>

                    {/* Ação: Derrubar Conexão */}
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleDisconnect(c.id, c.username)}
                        disabled={droppingId === (c.id || c.username)}
                        className="px-2.5 py-1 rounded bg-[#F1416C]/15 hover:bg-[#F1416C] text-[#F1416C] hover:text-white border border-[#F1416C]/30 text-[10px] font-bold transition-all inline-flex items-center gap-1 disabled:opacity-50 cursor-pointer"
                        title="Derrubar conexão deste cliente"
                      >
                        {droppingId === (c.id || c.username) ? (
                          <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                        ) : (
                          <Power className="w-2.5 h-2.5" />
                        )}
                        <span>Derrubar</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
