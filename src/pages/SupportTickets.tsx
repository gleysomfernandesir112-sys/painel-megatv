import React, { useState, useEffect } from 'react';
import { useSigmaStore } from '../store/SigmaStore';
import { useBrandConfig, APP_CONFIG } from '../config/appConfig';
import { apiService } from '../services/apiService';
import { SupportTicket } from '../types';
import { isPanelMaster } from '../utils/panelAuth';
import {
  HelpCircle,
  Plus,
  MessageSquare,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Film,
  Tv,
  Tv2,
  Clapperboard,
  Send,
  X,
  Search,
  RefreshCw,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  Filter,
  Check,
  AlertCircle,
  Trash2,
  Edit3
} from 'lucide-react';

export const SupportTickets: React.FC = () => {
  const { profile } = useSigmaStore();
  const brand = useBrandConfig();
  const franchisePrimary = brand.primaryColor || APP_CONFIG.primaryColor || '#009EF7';

  const isMaster = isPanelMaster(profile?.username, profile);

  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filtros
  const [filterType, setFilterType] = useState<'ALL' | 'request' | 'report'>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Modal Novo Ticket
  const [showNewModal, setShowNewModal] = useState(false);
  const [modalMode, setModalMode] = useState<'request' | 'report'>('request');
  const [contentType, setContentType] = useState<'movie' | 'series' | 'channel'>('movie');
  const [contentTitle, setContentTitle] = useState('');
  const [contentYear, setContentYear] = useState('');
  const [description, setDescription] = useState('');
  const [issueType, setIssueType] = useState('Sem Áudio');

  // Estado de verificação de catálogo
  const [checkingCatalog, setCheckingCatalog] = useState(false);
  const [catalogMatch, setCatalogMatch] = useState<any | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modal de Resposta do Master
  const [replyModalTarget, setReplyModalTarget] = useState<SupportTicket | null>(null);
  const [replyStatus, setReplyStatus] = useState<'OPEN' | 'IN_ANALYSIS' | 'ADDED' | 'RESOLVED' | 'REJECTED'>('IN_ANALYSIS');
  const [replyMessage, setReplyMessage] = useState('');
  const [replySubmitting, setReplySubmitting] = useState(false);

  const fetchTickets = async () => {
    try {
      const list = await apiService.getTickets();
      if (Array.isArray(list)) {
        setTickets(list);
      }
    } catch {} finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchTickets();
  };

  // Verificação de disponibilidade sob demanda
  const handleCheckCatalogManual = async () => {
    if (!contentTitle.trim()) return;
    setCheckingCatalog(true);
    setCatalogMatch(null);
    setErrorMessage(null);
    try {
      const res = await apiService.checkTicketContent(contentTitle.trim(), contentType);
      if (res && res.exists && res.item) {
        setCatalogMatch(res.item);
      } else {
        setCatalogMatch(false); // confirmado que não existe
      }
    } catch (err: any) {
      setErrorMessage('Erro ao consultar o catálogo. Tente novamente.');
    } finally {
      setCheckingCatalog(false);
    }
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contentTitle.trim()) {
      setErrorMessage('Informe o título do filme/série ou nome do canal.');
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    // Se for solicitação de conteúdo, faz a verificação antes de criar
    if (modalMode === 'request') {
      try {
        const check = await apiService.checkTicketContent(contentTitle.trim(), contentType);
        if (check && check.exists && check.item) {
          setCatalogMatch(check.item);
          setSubmitting(false);
          return; // Não cria o ticket!
        }
      } catch {}
    }

    const fullDesc = modalMode === 'report'
      ? `Problema: ${issueType}${description ? ' - ' + description.trim() : ''}`
      : description.trim();

    try {
      const res = await apiService.createTicket({
        type: modalMode,
        contentType,
        title: contentTitle.trim(),
        year: contentYear.trim(),
        description: fullDesc
      });

      if (res && res.alreadyAvailable) {
        setCatalogMatch(res.item);
        return;
      }

      if (res && res.success) {
        setShowNewModal(false);
        setContentTitle('');
        setContentYear('');
        setDescription('');
        setCatalogMatch(null);
        setSuccessToast(res.message || 'Chamado registrado com sucesso!');
        setTimeout(() => setSuccessToast(null), 4000);
        await fetchTickets();
      } else {
        setErrorMessage(res?.message || 'Falha ao registrar ticket.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao registrar ticket.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenReplyModal = (tck: SupportTicket) => {
    setReplyModalTarget(tck);
    setReplyStatus((tck.status as any) || 'IN_ANALYSIS');
    setReplyMessage(tck.adminReply || '');
  };

  const handleSaveReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyModalTarget) return;
    setReplySubmitting(true);
    try {
      const res = await apiService.updateTicket(replyModalTarget.id, {
        status: replyStatus,
        adminReply: replyMessage.trim()
      });
      if (res && res.success) {
        setReplyModalTarget(null);
        setSuccessToast('Ticket atualizado com sucesso globalmente!');
        setTimeout(() => setSuccessToast(null), 3000);
        await fetchTickets();
      } else {
        alert(res?.message || 'Erro ao atualizar.');
      }
    } catch (err: any) {
      alert(err.message || 'Erro ao atualizar.');
    } finally {
      setReplySubmitting(false);
    }
  };

  const handleDeleteTicket = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja remover este ticket permanentemente?')) return;
    try {
      await apiService.deleteTicket(id);
      setTickets(prev => prev.filter(t => t.id !== id));
      setSuccessToast('Ticket excluído com sucesso.');
      setTimeout(() => setSuccessToast(null), 3000);
    } catch {}
  };

  // Filtragem
  const filteredTickets = tickets.filter(t => {
    if (filterType !== 'ALL' && t.type !== filterType) return false;
    if (filterStatus !== 'ALL' && t.status !== filterStatus) return false;
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      const matchTitle = (t.title || '').toLowerCase().includes(term);
      const matchId = (t.id || '').toLowerCase().includes(term);
      const matchDesc = (t.description || '').toLowerCase().includes(term);
      const matchAuthor = (t.reportedBy || '').toLowerCase().includes(term);
      if (!matchTitle && !matchId && !matchDesc && !matchAuthor) return false;
    }
    return true;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ADDED':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#50CD89]/20 text-[#50CD89] border border-[#50CD89]/40 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-[#50CD89]" />
            <span>Adicionado ao Catálogo</span>
          </span>
        );
      case 'RESOLVED':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#50CD89]/20 text-[#50CD89] border border-[#50CD89]/40 flex items-center gap-1">
            <Check className="w-3 h-3 text-[#50CD89]" />
            <span>Resolvido / Corrigido</span>
          </span>
        );
      case 'IN_ANALYSIS':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#009EF7]/20 text-[#009EF7] border border-[#009EF7]/40 flex items-center gap-1">
            <Clock className="w-3 h-3 text-[#009EF7] animate-pulse" />
            <span>Em Análise</span>
          </span>
        );
      case 'REJECTED':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#F1416C]/15 text-[#F1416C] border border-[#F1416C]/30 flex items-center gap-1">
            <X className="w-3 h-3 text-[#F1416C]" />
            <span>Não Encontrado / Recusado</span>
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#FF9900]/20 text-[#FF9900] border border-[#FF9900]/40 flex items-center gap-1">
            <Clock className="w-3 h-3 text-[#FF9900]" />
            <span>Pendente</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 select-none max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-white tracking-tight">Central Global de Conteúdo & Suporte</h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
              Rede Global
            </span>
          </div>
          <p className="text-xs text-[#92929F] mt-1">
            Solicitação de novos títulos e reporte de canais ou VODs com verificação automática de catálogo.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 bg-[#14151C] hover:bg-[#1E202B] border border-[#1E202B] rounded-xl text-[#92929F] hover:text-white transition-all cursor-pointer"
            title="Atualizar lista de tickets"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-[#009EF7]' : ''}`} />
          </button>
          <button
            onClick={() => {
              setShowNewModal(true);
              setCatalogMatch(null);
              setErrorMessage(null);
            }}
            className="flex items-center gap-2 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-md cursor-pointer hover:brightness-110"
            style={{ backgroundColor: franchisePrimary }}
          >
            <Plus className="w-4 h-4" />
            <span>Solicitar ou Reportar Conteúdo</span>
          </button>
        </div>
      </div>

      {successToast && (
        <div className="p-3.5 bg-[#50CD89]/10 border border-[#50CD89]/30 rounded-xl text-xs text-[#50CD89] flex items-center gap-2.5 animate-fade-in shadow-lg">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-[#50CD89]" />
          <span className="font-semibold">{successToast}</span>
        </div>
      )}

      {/* Barra de Filtros e Busca */}
      <div className="bg-[#14151C] border border-[#1E202B] rounded-xl p-3 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 text-[#5E6278] absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Buscar por título, código ou solicitante..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#1A1C24] border border-[#232530] rounded-lg pl-8 pr-3 py-2 text-xs text-white placeholder-[#5E6278] focus:outline-none focus:border-[#009EF7] transition-colors"
          />
        </div>

        {/* Tipo de Ticket */}
        <div className="flex items-center gap-1 bg-[#1A1C24] p-1 rounded-lg border border-[#232530] shrink-0">
          <button
            onClick={() => setFilterType('ALL')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
              filterType === 'ALL' ? 'bg-[#2E3344] text-white shadow-xs' : 'text-[#92929F] hover:text-white'
            }`}
          >
            Todos ({tickets.length})
          </button>
          <button
            onClick={() => setFilterType('request')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer flex items-center gap-1 ${
              filterType === 'request' ? 'bg-purple-600/30 text-purple-300 border border-purple-500/40 shadow-xs' : 'text-[#92929F] hover:text-white'
            }`}
          >
            <Sparkles className="w-3 h-3 text-purple-400" />
            <span>Pedidos</span>
          </button>
          <button
            onClick={() => setFilterType('report')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer flex items-center gap-1 ${
              filterType === 'report' ? 'bg-amber-600/30 text-amber-300 border border-amber-500/40 shadow-xs' : 'text-[#92929F] hover:text-white'
            }`}
          >
            <AlertTriangle className="w-3 h-3 text-amber-400" />
            <span>Reports</span>
          </button>
        </div>

        {/* Status */}
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="bg-[#1A1C24] border border-[#232530] text-xs text-white rounded-lg px-3 py-2 focus:outline-none cursor-pointer shrink-0"
        >
          <option value="ALL">Todos os status</option>
          <option value="OPEN">Pendentes / Abertos</option>
          <option value="IN_ANALYSIS">Em Análise</option>
          <option value="ADDED">Adicionados ao Catálogo</option>
          <option value="RESOLVED">Resolvidos / Corrigidos</option>
          <option value="REJECTED">Não Disponíveis</option>
        </select>
      </div>

      {/* Lista de Tickets */}
      <div className="bg-[#14151C] border border-[#1E202B] rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#1E202B] text-[#92929F] text-[11px] uppercase tracking-wider bg-[#111217]">
                <th className="py-3 px-4">Código / Tipo</th>
                <th className="py-3 px-4">Conteúdo</th>
                <th className="py-3 px-4">Categoria</th>
                <th className="py-3 px-4">Detalhes / Descrição</th>
                <th className="py-3 px-4">Solicitante</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E202B]/60">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-[#92929F]">
                    <div className="flex flex-col items-center gap-2">
                      <RefreshCw className="w-5 h-5 animate-spin text-[#009EF7]" />
                      <span>Carregando tickets da rede global...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredTickets.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-[#5E6278]">
                    <HelpCircle className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="text-sm font-semibold text-white">Nenhum chamado encontrado</p>
                    <p className="text-xs text-[#92929F] mt-1">
                      {searchTerm || filterType !== 'ALL' || filterStatus !== 'ALL'
                        ? 'Nenhum chamado corresponde aos filtros aplicados.'
                        : 'Nenhum pedido ou report aberto no momento. Clique em "+ Solicitar ou Reportar Conteúdo".'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredTickets.map((tck) => {
                  const isRequest = tck.type === 'request';
                  return (
                    <tr key={tck.id} className="hover:bg-[#1A1C24]/60 transition-colors">
                      {/* Código e Tipo */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-mono font-bold text-white text-xs">{tck.id}</div>
                        <div className="mt-1">
                          {isRequest ? (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-500/15 text-purple-400 border border-purple-500/30 inline-flex items-center gap-1">
                              <Sparkles className="w-2.5 h-2.5" /> Pedido
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30 inline-flex items-center gap-1">
                              <AlertTriangle className="w-2.5 h-2.5" /> Report
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Conteúdo */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-white text-xs flex items-center gap-1.5">
                          {tck.contentType === 'movie' && <Film className="w-3.5 h-3.5 text-blue-400 shrink-0" />}
                          {tck.contentType === 'series' && <Clapperboard className="w-3.5 h-3.5 text-purple-400 shrink-0" />}
                          {tck.contentType === 'channel' && <Tv className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                          <span className="truncate max-w-[220px]">{tck.title}</span>
                          {tck.year && <span className="text-[#92929F] text-[11px]">({tck.year})</span>}
                        </div>
                        <div className="text-[10px] text-[#5E6278] mt-0.5">
                          Criado em: {tck.createdAt || tck.created_at || '-'}
                        </div>
                      </td>

                      {/* Categoria */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="text-[#92929F] font-medium text-xs">
                          {tck.contentType === 'movie' ? 'Filme VOD' : tck.contentType === 'series' ? 'Série VOD' : 'Canal Ao Vivo'}
                        </span>
                      </td>

                      {/* Descrição & Resposta do Master */}
                      <td className="py-3.5 px-4 max-w-sm">
                        <div className="text-xs text-gray-300 break-words">{tck.description || '-'}</div>
                        {tck.adminReply && (
                          <div className="mt-2 p-2 rounded-lg bg-[#50CD89]/10 border border-[#50CD89]/25 text-[11px] text-emerald-300 flex items-start gap-1.5 animate-fade-in">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                            <div>
                              <span className="font-bold text-white">Resposta do Suporte Master ({tck.respondedBy || 'Equipe'}): </span>
                              <span>{tck.adminReply}</span>
                              {tck.respondedAt && <span className="text-[#5E6278] text-[10px] block mt-0.5">{tck.respondedAt}</span>}
                            </div>
                          </div>
                        )}
                      </td>

                      {/* Solicitante */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-mono text-xs text-white">{tck.reportedBy || 'Revenda'}</div>
                        <div className="text-[10px] text-[#5E6278] font-mono truncate max-w-[120px]">
                          {tck.franchiseDomain || 'tvfast.lat'}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">{getStatusBadge(tck.status)}</td>

                      {/* Ações (Master pode responder, alterar status ou excluir) */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {isMaster ? (
                            <>
                              <button
                                onClick={() => handleOpenReplyModal(tck)}
                                className="px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer hover:brightness-110"
                                style={{
                                  backgroundColor: `${franchisePrimary}20`,
                                  borderColor: `${franchisePrimary}40`,
                                  color: franchisePrimary,
                                  borderWidth: 1
                                }}
                                title="Responder ou alterar status do ticket"
                              >
                                <Edit3 className="w-3 h-3" />
                                <span>{tck.adminReply ? 'Editar Resposta' : 'Responder'}</span>
                              </button>
                              <button
                                onClick={() => handleDeleteTicket(tck.id)}
                                className="p-1 rounded-lg text-red-400/60 hover:text-red-400 hover:bg-red-500/10 transition-all cursor-pointer"
                                title="Excluir ticket"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          ) : (
                            <span className="text-[11px] text-[#5E6278] italic">Aguardando Equipe</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL DE CRIAÇÃO: COM VERIFICAÇÃO AUTOMÁTICA DE DISPONIBILIDADE */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-[#15171E] border border-[#262833] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#262833]">
              <div className="flex items-center gap-2">
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-white"
                  style={{ backgroundColor: franchisePrimary }}
                >
                  {modalMode === 'request' ? <Sparkles className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                </div>
                <div>
                  <h3 className="text-white font-bold text-sm">
                    {modalMode === 'request' ? 'Solicitar Adição de Conteúdo' : 'Reportar Problema em Canal ou VOD'}
                  </h3>
                  <p className="text-[11px] text-[#92929F]">Central unificada da rede de streaming</p>
                </div>
              </div>
              <button
                onClick={() => setShowNewModal(false)}
                className="text-[#5E6278] hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Alternância de Abas: Pedido vs Report */}
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-2 bg-[#1A1C24] p-1 rounded-xl border border-[#232530]">
                <button
                  type="button"
                  onClick={() => {
                    setModalMode('request');
                    setCatalogMatch(null);
                    setErrorMessage(null);
                  }}
                  className={`py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    modalMode === 'request'
                      ? 'bg-purple-600 text-white shadow-md'
                      : 'text-[#92929F] hover:text-white'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Pedir Novo Conteúdo</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setModalMode('report');
                    setCatalogMatch(null);
                    setErrorMessage(null);
                  }}
                  className={`py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    modalMode === 'report'
                      ? 'bg-amber-600 text-white shadow-md'
                      : 'text-[#92929F] hover:text-white'
                  }`}
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Reportar com Problema</span>
                </button>
              </div>

              {/* CARD DE CONTEÚDO JÁ DISPONÍVEL (BLOQUEIO AUTOMÁTICO DE CRIAÇÃO) */}
              {catalogMatch && (
                <div className="p-4 rounded-xl bg-emerald-500/15 border-2 border-emerald-500/50 space-y-3 animate-fade-in text-left">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wide">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                    <span>Conteúdo Já Disponível na Plataforma!</span>
                  </div>
                  <div className="flex items-start gap-3 bg-[#111217] p-3 rounded-lg border border-emerald-500/30">
                    {catalogMatch.poster && (
                      <img
                        src={catalogMatch.poster}
                        alt={catalogMatch.title}
                        className="w-12 h-16 object-cover rounded-md shrink-0 border border-white/10"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="text-white font-bold text-sm truncate">{catalogMatch.title}</div>
                      <div className="text-xs text-gray-300 mt-0.5">
                        Categoria: <strong className="text-white font-bold">{catalogMatch.category}</strong>
                      </div>
                      {catalogMatch.year && (
                        <div className="text-xs text-[#92929F]">Ano de Lançamento: {catalogMatch.year}</div>
                      )}
                      <div className="text-[11px] text-emerald-400 font-semibold mt-1">
                        Código / ID no servidor: {catalogMatch.id}
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-gray-300 leading-relaxed">
                    🎉 Este título já foi adicionado ao catálogo oficial e está pronto para ser assistido nos aplicativos ou reprodutores Web. <strong className="text-white">Não é necessário criar ticket para ele.</strong>
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setShowNewModal(false);
                      setContentTitle('');
                      setCatalogMatch(null);
                    }}
                    className="w-full py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold transition-all cursor-pointer shadow-md"
                  >
                    Entendido, vou assistir agora!
                  </button>
                </div>
              )}

              {errorMessage && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-400 flex items-center gap-2 animate-fade-in">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {!catalogMatch && (
                <form onSubmit={handleCreateTicket} className="space-y-4">
                  {/* Tipo de Mídia: Filme / Série / Canal */}
                  <div>
                    <label className="block text-xs font-semibold text-[#92929F] uppercase tracking-wider mb-1.5">
                      Tipo de Conteúdo *
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => { setContentType('movie'); setCatalogMatch(null); }}
                        className={`p-2.5 rounded-xl text-xs font-bold flex flex-col items-center justify-center gap-1 border transition-all cursor-pointer ${
                          contentType === 'movie'
                            ? 'bg-blue-500/20 text-blue-400 border-blue-500/50'
                            : 'bg-[#1A1C24] text-[#92929F] border-[#232530] hover:text-white'
                        }`}
                      >
                        <Film className="w-4 h-4" />
                        <span>Filme</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => { setContentType('series'); setCatalogMatch(null); }}
                        className={`p-2.5 rounded-xl text-xs font-bold flex flex-col items-center justify-center gap-1 border transition-all cursor-pointer ${
                          contentType === 'series'
                            ? 'bg-purple-500/20 text-purple-400 border-purple-500/50'
                            : 'bg-[#1A1C24] text-[#92929F] border-[#232530] hover:text-white'
                        }`}
                      >
                        <Clapperboard className="w-4 h-4" />
                        <span>Série / Anime</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => { setContentType('channel'); setCatalogMatch(null); }}
                        className={`p-2.5 rounded-xl text-xs font-bold flex flex-col items-center justify-center gap-1 border transition-all cursor-pointer ${
                          contentType === 'channel'
                            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50'
                            : 'bg-[#1A1C24] text-[#92929F] border-[#232530] hover:text-white'
                        }`}
                      >
                        <Tv className="w-4 h-4" />
                        <span>Canal Ao Vivo</span>
                      </button>
                    </div>
                  </div>

                  {/* Nome do Conteúdo */}
                  <div>
                    <label className="block text-xs font-semibold text-[#92929F] uppercase tracking-wider mb-1.5">
                      {contentType === 'channel' ? 'Nome do Canal *' : 'Título do Filme ou Série *'}
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        required
                        placeholder={
                          contentType === 'movie'
                            ? 'Ex: Avatar 2, Duna Parte 2...'
                            : contentType === 'series'
                            ? 'Ex: Monster, The Bear...'
                            : 'Ex: Premiere 1, SporTV...'
                        }
                        value={contentTitle}
                        onChange={(e) => {
                          setContentTitle(e.target.value);
                          setCatalogMatch(null);
                        }}
                        className="flex-1 bg-[#1A1C24] border border-[#232530] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-[#5E6278] focus:outline-none focus:border-[#009EF7]"
                      />
                      {modalMode === 'request' && (
                        <button
                          type="button"
                          onClick={handleCheckCatalogManual}
                          disabled={checkingCatalog || !contentTitle.trim()}
                          className="px-3.5 py-2 bg-[#232530] hover:bg-[#2d303f] disabled:opacity-40 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
                          title="Verificar se já existe no servidor antes de enviar"
                        >
                          <Search className={`w-3.5 h-3.5 ${checkingCatalog ? 'animate-spin' : ''}`} />
                          <span>{checkingCatalog ? 'Buscando...' : 'Verificar'}</span>
                        </button>
                      )}
                    </div>
                    {catalogMatch === false && (
                      <p className="text-[11px] text-emerald-400 font-medium mt-1 flex items-center gap-1">
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span>Confirmado: Título ainda não consta no catálogo. Pode solicitar!</span>
                      </p>
                    )}
                  </div>

                  {/* Ano de Lançamento (Para Filmes ou Séries) */}
                  {contentType !== 'channel' && (
                    <div>
                      <label className="block text-xs font-semibold text-[#92929F] uppercase tracking-wider mb-1.5">
                        Ano de Lançamento (Opcional)
                      </label>
                      <input
                        type="text"
                        maxLength={4}
                        placeholder="Ex: 2024"
                        value={contentYear}
                        onChange={(e) => setContentYear(e.target.value.replace(/\D/g, ''))}
                        className="w-full bg-[#1A1C24] border border-[#232530] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-[#5E6278] focus:outline-none focus:border-[#009EF7] font-mono"
                      />
                    </div>
                  )}

                  {/* Se for Report: Tipo de Falha */}
                  {modalMode === 'report' && (
                    <div>
                      <label className="block text-xs font-semibold text-[#92929F] uppercase tracking-wider mb-1.5">
                        Tipo de Falha *
                      </label>
                      <select
                        value={issueType}
                        onChange={(e) => setIssueType(e.target.value)}
                        className="w-full bg-[#1A1C24] border border-[#232530] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#009EF7]"
                      >
                        <option value="Canal Fora do Ar (Offline)">Canal Fora do Ar (Offline)</option>
                        <option value="Sem Áudio ou Áudio Atrasado">Sem Áudio ou Áudio Atrasado</option>
                        <option value="Travando / Congelando">Travando / Congelando</option>
                        <option value="Episódio ou Stream Trocado">Episódio ou Stream Trocado</option>
                        <option value="Sem Legenda ou Legenda Dessincronizada">Sem Legenda ou Legenda Dessincronizada</option>
                        <option value="Outro Problema Técnico">Outro Problema Técnico</option>
                      </select>
                    </div>
                  )}

                  {/* Observações / Descrição Adicional */}
                  <div>
                    <label className="block text-xs font-semibold text-[#92929F] uppercase tracking-wider mb-1.5">
                      {modalMode === 'report' ? 'Detalhes do Problema (Opcional)' : 'Observações Especiais (Opcional)'}
                    </label>
                    <textarea
                      rows={3}
                      placeholder={
                        modalMode === 'report'
                          ? 'Descreva onde ocorre a falha (ex: trava aos 15 minutos, canal fica tela preta)...'
                          : 'Ex: Preferência por áudio dublado em português ou versão 4K...'
                      }
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full bg-[#1A1C24] border border-[#232530] rounded-xl p-3 text-xs text-white placeholder-[#5E6278] focus:outline-none focus:border-[#009EF7]"
                    />
                  </div>

                  {/* Botões do Modal */}
                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#232530]">
                    <button
                      type="button"
                      onClick={() => setShowNewModal(false)}
                      className="px-4 py-2.5 rounded-xl text-xs font-semibold text-[#92929F] hover:bg-[#1A1C24] transition-colors cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={submitting || checkingCatalog}
                      className="px-5 py-2.5 rounded-xl text-xs font-bold text-white transition-all cursor-pointer flex items-center gap-2 shadow-lg disabled:opacity-50"
                      style={{ backgroundColor: franchisePrimary }}
                    >
                      {submitting ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Verificando & Registrando...</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5" />
                          <span>{modalMode === 'request' ? 'Enviar Pedido de Conteúdo' : 'Enviar Report de Erro'}</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE RESPOSTA DO MASTER (EXCLUSIVO PARA MASTERS) */}
      {replyModalTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-[#15171E] border border-[#262833] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#262833]">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <div>
                  <h3 className="text-white font-bold text-sm">Gerenciar Ticket #{replyModalTarget.id}</h3>
                  <p className="text-[11px] text-[#92929F]">Resposta e status sincronizados para todos os painéis</p>
                </div>
              </div>
              <button
                onClick={() => setReplyModalTarget(null)}
                className="text-[#5E6278] hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveReply} className="p-6 space-y-4">
              <div className="p-3 rounded-xl bg-[#111217] border border-[#232530] text-xs">
                <span className="text-[#92929F]">Conteúdo:</span>{' '}
                <strong className="text-white font-bold">{replyModalTarget.title}</strong>{' '}
                <span className="text-gray-400">({replyModalTarget.type === 'request' ? 'Pedido' : 'Report'})</span>
                {replyModalTarget.description && (
                  <div className="mt-1 text-[11px] text-gray-300 break-words">{replyModalTarget.description}</div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#92929F] uppercase tracking-wider mb-1.5">
                  Atualizar Status *
                </label>
                <select
                  value={replyStatus}
                  onChange={(e) => setReplyStatus(e.target.value as any)}
                  className="w-full bg-[#1A1C24] border border-[#232530] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#009EF7]"
                >
                  <option value="IN_ANALYSIS">Em Análise pela Equipe</option>
                  <option value="ADDED">Adicionado ao Catálogo (Concluído)</option>
                  <option value="RESOLVED">Resolvido / Corrigido (Concluído)</option>
                  <option value="REJECTED">Não Encontrado / Recusado</option>
                  <option value="OPEN">Pendente / Aberto</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#92929F] uppercase tracking-wider mb-1.5">
                  Mensagem de Resposta Oficial
                </label>
                <textarea
                  rows={4}
                  placeholder="Ex: Título adicionado com sucesso em 1080p na categoria de lançamentos..."
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  className="w-full bg-[#1A1C24] border border-[#232530] rounded-xl p-3 text-xs text-white placeholder-[#5E6278] focus:outline-none focus:border-[#009EF7]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#232530]">
                <button
                  type="button"
                  onClick={() => setReplyModalTarget(null)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-[#92929F] hover:bg-[#1A1C24] transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={replySubmitting}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-white transition-all cursor-pointer flex items-center gap-2 shadow-lg"
                  style={{ backgroundColor: franchisePrimary }}
                >
                  {replySubmitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Salvando...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Salvar Resposta Global</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
