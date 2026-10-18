import React, { useState, useMemo, useEffect } from 'react';
import { useSigmaStore } from '../../store/SigmaStore';
import { Reseller } from '../../types';
import { isCustomerActive } from '../../utils/customerMetrics';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Users,
  Plus,
  Search,
  Coins,
  Ban,
  ShieldCheck,
  MoreVertical,
  Key,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  RotateCw,
  LayoutGrid,
  List,
  Network,
  Phone,
  DollarSign,
  Receipt,
  Trash2,
  Tv2,
  Trophy,
  X,
  Bot
} from 'lucide-react';
import { TransferCreditsModal } from '../../components/modals/TransferCreditsModal';
import { SubresellerApiKeysModal } from '../../components/modals/SubresellerApiKeysModal';
import { ResellerPricingModal } from '../../components/modals/ResellerPricingModal';
import { ResellerInvoiceModal } from '../../components/modals/ResellerInvoiceModal';
import { BulkResellerCreditsModal } from '../../components/modals/BulkResellerCreditsModal';
import { HierarchyTree } from '../../components/hierarchy/HierarchyTree';
import { ResellerRankingTab } from '../../components/resellers/ResellerRankingTab';
import { fastCdnApi } from '../../services/fastcdn';
import { useBrandConfig, getThemeStyle } from '../../config/appConfig';

export const isResellerUnlimited = (r: any): boolean => {
  if (!r) return false;
  if (r.creditos_ilimitados === true || r.creditos_ilimitados === 'true' || r.creditos_ilimitados === 1) return true;
  if (r.unlimitedCredits === true || r.unlimitedCredits === 'true') return true;
  if (r.unlimited_credits === true || r.unlimited_credits === 'true') return true;
  if (typeof r.creditos === 'string' && (r.creditos.toLowerCase() === 'ilimitado' || r.creditos.toLowerCase() === 'unlimited')) return true;
  if (typeof r.credits === 'string' && (r.credits.toLowerCase() === 'ilimitado' || r.credits.toLowerCase() === 'unlimited')) return true;
  const numCredits = Number(r.creditos !== undefined ? r.creditos : r.credits);
  if (!isNaN(numCredits) && (numCredits >= 99999 || numCredits < 0)) return true;
  return false;
};

export const ResellersListing: React.FC = () => {
  const {
    resellers,
    customers,
    profile,
    hierarchyData,
    fetchHierarchy,
    toggleBlockReseller,
    deleteReseller,
    refreshLiveData,
    isLoadingLive,
    calculateResellerInvoice,
    rankingData,
    setResellerBotAccess
  } = useSigmaStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState('');
  const [creditFilter, setCreditFilter] = useState<'ALL' | 'UNLIMITED' | 'WITH_CREDITS' | 'ZERO_CREDITS'>('ALL');
  const [creditTarget, setCreditTarget] = useState<any | null>(null);
  const [apiKeysTarget, setApiKeysTarget] = useState<any | null>(null);
  const [pricingTarget, setPricingTarget] = useState<any | null>(null);
  const [invoiceTarget, setInvoiceTarget] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Reseller | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [actionMenuOpenId, setActionMenuOpenId] = useState<string | null>(null);
  const brand = useBrandConfig();
  const isXtream = brand.themeStyle === 'xtream-classic';

  const [viewMode, setViewMode] = useState<'tree' | 'cards' | 'table' | 'ranking'>(() => {
    if (searchParams.get('tab') === 'ranking') return 'ranking';
    const saved = localStorage.getItem('sigma_reseller_view_mode');
    if (saved === 'ranking') return 'ranking';
    const activeTheme = getThemeStyle();
    if (activeTheme === 'xtream-classic') {
      return saved === 'table' ? 'table' : 'cards';
    }
    return (saved as any) || 'tree';
  });

  // Atualiza os dados e hierarquia sempre que o componente for montado
  useEffect(() => {
    refreshLiveData();
    fetchHierarchy();
  }, [refreshLiveData, fetchHierarchy]);

  // Sincroniza se a aba ranking for passada por URL
  useEffect(() => {
    if (searchParams.get('tab') === 'ranking' && viewMode !== 'ranking') {
      setViewMode('ranking');
    }
  }, [searchParams]);

  // Se o tema ativo for Xtream Classic e estiver em modo árvore, chaveia automaticamente para Cards
  useEffect(() => {
    if (isXtream && viewMode === 'tree') {
      setViewMode('cards');
    }
  }, [isXtream]);

  const handleSetViewMode = (mode: 'tree' | 'cards' | 'table' | 'ranking') => {
    setViewMode(mode);
    localStorage.setItem('sigma_reseller_view_mode', mode);
    if (mode === 'ranking') {
      setSearchParams({ tab: 'ranking' });
    } else if (searchParams.has('tab')) {
      searchParams.delete('tab');
      setSearchParams(searchParams);
    }
  };

  // API Key Generator State
  const [generatedKey, setGeneratedKey] = useState<{ reseller: string; key: string } | null>(null);
  const [copied, setCopied] = useState(false);

  // Seleção e Ações em Massa de Revendas
  const [selectedResellerIds, setSelectedResellerIds] = useState<Set<string>>(new Set());
  const [bulkCreditsOpen, setBulkCreditsOpen] = useState(false);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const [togglingBotId, setTogglingBotId] = useState<string | null>(null);

  const handleToggleBot = async (r: any) => {
    const targetKey = r.id || r.username;
    const currentStatus = Boolean(r.botAccess ?? (r as any).bot_access);
    const nextStatus = !currentStatus;
    const monthlyCredits = Number(r.botMonthlyCredits ?? (r as any).bot_monthly_credits ?? 0);

    setTogglingBotId(targetKey);
    try {
      const res = await setResellerBotAccess(r.username || r.id, nextStatus, monthlyCredits);
      if (res && res.success) {
        showToast(res.message || `Bot WhatsApp ${nextStatus ? 'ativado' : 'desativado'} para ${r.username}!`);
      } else {
        showToast((res as any)?.message || 'Erro ao alterar permissão do Bot.');
      }
    } catch (err: any) {
      showToast(err?.message || 'Falha ao comunicar com o servidor.');
    } finally {
      setTogglingBotId(null);
    }
  };

  // Contagens para filtros rápidos
  const unlimitedCount = resellers.filter(isResellerUnlimited).length;
  const withCreditsCount = resellers.filter(r => !isResellerUnlimited(r) && Number(r.credits) > 0).length;
  const zeroCreditsCount = resellers.filter(r => !isResellerUnlimited(r) && Number(r.credits) <= 0).length;

  const filtered = resellers.filter((r) => {
    const matchSearch =
      (r.username || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.name && r.name.toLowerCase().includes(searchTerm.toLowerCase()));
    if (!matchSearch) return false;

    if (creditFilter === 'UNLIMITED') return isResellerUnlimited(r);
    if (creditFilter === 'WITH_CREDITS') return !isResellerUnlimited(r) && Number(r.credits) > 0;
    if (creditFilter === 'ZERO_CREDITS') return !isResellerUnlimited(r) && Number(r.credits) <= 0;
    return true;
  });

  const selectedResellersList = useMemo(() => {
    return filtered.filter(r => selectedResellerIds.has(r.id));
  }, [filtered, selectedResellerIds]);

  const toggleSelectAll = () => {
    if (selectedResellerIds.size === filtered.length) {
      setSelectedResellerIds(new Set());
    } else {
      setSelectedResellerIds(new Set(filtered.map(r => r.id)));
    }
  };

  const handleBulkBlock = async () => {
    if (selectedResellerIds.size === 0) return;
    if (!window.confirm(`Deseja bloquear as ${selectedResellerIds.size} revendas selecionadas?`)) return;
    setBulkActionLoading(true);
    let count = 0;
    for (const r of selectedResellersList) {
      if (r.status === 'ACTIVE') {
        const res = await toggleBlockReseller(r.id);
        if (res.success) count++;
      }
    }
    await refreshLiveData();
    setBulkActionLoading(false);
    setSelectedResellerIds(new Set());
    showToast(`${count} revenda(s) bloqueada(s) com sucesso!`);
  };

  const handleBulkUnblock = async () => {
    if (selectedResellerIds.size === 0) return;
    setBulkActionLoading(true);
    let count = 0;
    for (const r of selectedResellersList) {
      if (r.status !== 'ACTIVE') {
        const res = await toggleBlockReseller(r.id);
        if (res.success) count++;
      }
    }
    await refreshLiveData();
    setBulkActionLoading(false);
    setSelectedResellerIds(new Set());
    showToast(`${count} revenda(s) desbloqueada(s) com sucesso!`);
  };

  const handleBulkCopyZap = async () => {
    if (selectedResellersList.length === 0) return;
    const lines = [
      `📋 *REDE DE REVENDAS (${selectedResellersList.length})*`,
      `📅 *Data:* ${new Date().toLocaleDateString('pt-BR')}`,
      ''
    ];
    selectedResellersList.forEach((r, idx) => {
      const phone = r.whatsapp ? r.whatsapp.replace(/\D/g, '') : 'Sem WhatsApp';
      lines.push(`${idx + 1}. *${r.username}* (${r.name || 'Sem nome'}) - WhatsApp: ${phone}`);
    });
    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      showToast(`Lista de ${selectedResellersList.length} revendas copiada!`);
    } catch {
      showToast('Erro ao copiar para a área de transferência.');
    }
  };

  const handleGenerateApiKey = async (reseller: Reseller) => {
    try {
      const res = await fastCdnApi.gerarChaveSubRevenda(reseller.username);
      setGeneratedKey({
        reseller: reseller.username,
        key: res.chave_api || res.token || `fcdn_live_${Math.random().toString(36).substring(2, 15)}`
      });
      setActionMenuOpenId(null);
    } catch (err: any) {
      alert(err.message || 'Erro ao gerar chave de API para a sub-revenda.');
    }
  };

  const copyKey = () => {
    if (!generatedKey) return;
    navigator.clipboard.writeText(generatedKey.key);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 select-none" onClick={() => setActionMenuOpenId(null)}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Revendas & Sub-Painéis</h1>
          <p className="text-xs text-[#92929F] mt-0.5">
            Gestão de revendedores subordinados, transferência de créditos e emissão de chaves de API.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => { refreshLiveData(); fetchHierarchy(); }}
            disabled={isLoadingLive}
            className="p-2 bg-[#14151C] hover:bg-[#1E202B] border border-[#1E202B] rounded-xl text-[#92929F] hover:text-white transition-all disabled:opacity-50"
            title="Atualizar lista"
          >
            <RotateCw className={`w-4 h-4 ${isLoadingLive ? 'animate-spin text-[#009EF7]' : ''}`} />
          </button>

          {/* View mode toggle - Tree, Cards, Table, Ranking */}
          <div className="flex items-center border border-[#232530] rounded-xl overflow-hidden bg-[#14151C]">
            <button
              onClick={() => handleSetViewMode('tree')}
              className={`p-2 text-xs transition-all flex items-center gap-1 cursor-pointer ${
                viewMode === 'tree' ? 'bg-[#009EF7] text-white' : 'text-[#92929F] hover:text-white'
              }`}
              title="Árvore Hierárquica Multinível"
            >
              <Network className="w-3.5 h-3.5" />
              <span className="hidden sm:inline text-[11px] font-semibold">Árvore</span>
            </button>
            <button
              onClick={() => handleSetViewMode('cards')}
              className={`p-2 text-xs transition-all flex items-center gap-1 cursor-pointer ${
                viewMode === 'cards' ? 'bg-[#009EF7] text-white' : 'text-[#92929F] hover:text-white'
              }`}
              title="Visualização em Cards"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="hidden sm:inline text-[11px] font-semibold">Cards ({resellers.length})</span>
            </button>
            <button
              onClick={() => handleSetViewMode('table')}
              className={`p-2 text-xs transition-all flex items-center gap-1 cursor-pointer ${
                viewMode === 'table' ? 'bg-[#009EF7] text-white' : 'text-[#92929F] hover:text-white'
              }`}
              title="Visualização em Tabela"
            >
              <List className="w-3.5 h-3.5" />
              <span className="hidden sm:inline text-[11px] font-semibold">Tabela ({resellers.length})</span>
            </button>
            <button
              onClick={() => handleSetViewMode('ranking')}
              className={`p-2 text-xs transition-all flex items-center gap-1 cursor-pointer ${
                viewMode === 'ranking' ? 'bg-[#009EF7] text-white' : 'text-[#92929F] hover:text-white'
              }`}
              title="Ranking e Gamificação por Painel"
            >
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline text-[11px] font-semibold">Ranking</span>
            </button>
          </div>

          <Link
            to="/resellers/add"
            className="px-4 py-2 bg-[#009EF7] hover:bg-[#0095E8] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-md shadow-blue-500/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>+ Nova Revenda</span>
          </Link>
        </div>
      </div>

      {/* API Key Notification Banner */}
      {generatedKey && (
        <div className="p-4 bg-[#009EF7]/10 border border-[#009EF7]/30 rounded-2xl space-y-2 animate-fade-in">
          <div className="flex items-center justify-between text-xs font-bold text-[#009EF7]">
            <span className="flex items-center gap-2">
              <Key className="w-4 h-4" />
              <span>Chave de API gerada para {generatedKey.reseller}</span>
            </span>
            <button onClick={() => setGeneratedKey(null)} className="text-[#92929F] hover:text-white">
              Fechar
            </button>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={generatedKey.key}
              className="flex-1 bg-[#14151C] border border-[#232530] rounded-xl px-3 py-1.5 text-xs text-white font-mono"
            />
            <button
              onClick={copyKey}
              className="px-3 py-1.5 bg-[#009EF7] text-white text-xs font-bold rounded-xl flex items-center gap-1"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copiado!' : 'Copiar'}</span>
            </button>
          </div>
          <p className="text-[11px] text-[#92929F]">
            Envie esta chave para seu parceiro configurar no WhatsAuto, WhatsApp Bot ou sistema de cobrança.
          </p>
        </div>
      )}

      {/* View Content: Ranking vs Tree vs Cards vs Table */}
      {viewMode === 'ranking' ? (
        <ResellerRankingTab
          rankingData={rankingData}
          currentUsername={profile.username}
          onRefresh={() => refreshLiveData()}
          isLoading={isLoadingLive}
        />
      ) : viewMode === 'tree' ? (
        <HierarchyTree
          data={hierarchyData}
          fallbackResellers={resellers}
          fallbackProfile={profile}
          isLoading={isLoadingLive}
          onRefresh={() => { refreshLiveData(); fetchHierarchy(); }}
          onTransferCredits={(node) => setCreditTarget(node)}
          onManageApiKeys={(node) => setApiKeysTarget(node)}
          onToggleBlock={(node) => toggleBlockReseller(node.id || node.username)}
          onConfigurePricing={(node) => setPricingTarget({ username: node.username, name: node.name })}
          onViewInvoice={(node) => setInvoiceTarget(node.username)}
          onDeleteReseller={(node) => {
            const found = resellers.find(r => r.username.toLowerCase() === node.username.toLowerCase());
            setDeleteTarget(found || {
              id: node.id,
              username: node.username,
              name: node.name,
              credits: Number(node.creditos) || 0,
              status: 'ACTIVE',
              subresellers_count: 0,
              customers_count: 0,
              created_at: ''
            });
          }}
        />
      ) : (
        <>
          {/* Filter Toolbar */}
          <div className="bg-[#14151C] border border-[#1E202B] rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative w-full max-w-sm">
              <Search className="w-3.5 h-3.5 text-[#5E6278] absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Buscar revenda por login ou nome..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-[#1A1C24] border border-[#232530] rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-[#5E6278] focus:outline-none focus:border-[#009EF7]"
              />
            </div>

            {/* Quick Credit Filters */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              <button
                onClick={() => setCreditFilter('ALL')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                  creditFilter === 'ALL'
                    ? 'bg-[#009EF7] text-white'
                    : 'bg-[#1A1C24] text-[#92929F] hover:text-white border border-[#232530]'
                }`}
              >
                Todas ({resellers.length})
              </button>
              <button
                onClick={() => setCreditFilter('UNLIMITED')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1 ${
                  creditFilter === 'UNLIMITED'
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-500/20'
                    : 'bg-purple-500/10 text-purple-300 hover:bg-purple-500/20 border border-purple-500/30'
                }`}
              >
                <span>∞ Ilimitadas</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-purple-500/30">{unlimitedCount}</span>
              </button>
              <button
                onClick={() => setCreditFilter('WITH_CREDITS')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                  creditFilter === 'WITH_CREDITS'
                    ? 'bg-[#50CD89] text-white shadow-md shadow-emerald-500/20'
                    : 'bg-[#1A1C24] text-[#92929F] hover:text-white border border-[#232530]'
                }`}
              >
                Com Saldo ({withCreditsCount})
              </button>
              <button
                onClick={() => setCreditFilter('ZERO_CREDITS')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                  creditFilter === 'ZERO_CREDITS'
                    ? 'bg-[#F1416C] text-white'
                    : 'bg-[#1A1C24] text-[#92929F] hover:text-white border border-[#232530]'
                }`}
              >
                Zeradas ({zeroCreditsCount})
              </button>
            </div>
          </div>

          {/* Empty State */}
          {filtered.length === 0 ? (
            <div className="bg-[#14151C] border border-[#1E202B] rounded-2xl p-10 text-center max-w-md mx-auto my-6 space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-[#1A1C24] border border-[#262833] flex items-center justify-center mx-auto text-[#92929F]">
                <Users className="w-7 h-7" />
              </div>
              <div>
                <p className="text-sm font-bold text-white">Nenhuma revenda encontrada</p>
                <p className="text-xs text-[#92929F] mt-1 leading-relaxed">
                  {isLoadingLive
                    ? 'Sincronizando revendas com o servidor...'
                    : 'Expanda sua rede criando revendedores com controle de créditos e clientes.'}
                </p>
              </div>
              {!isLoadingLive && (
                <div className="pt-2">
                  <Link
                    to="/resellers/add"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white transition-all shadow-lg cursor-pointer hover:opacity-90 active:scale-95 bg-[#009EF7]"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Criar Primeira Revenda</span>
                  </Link>
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Barra de Seleção / Contagem */}
              <div className="flex items-center justify-between px-1 py-1 mb-2 bg-[#14151C] border border-[#1E202B] rounded-xl px-3 py-2">
                <label className="flex items-center gap-2 text-xs text-[#92929F] hover:text-white cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={filtered.length > 0 && selectedResellerIds.size === filtered.length}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded border-[#2E3245] bg-[#1A1C24] text-blue-500 focus:ring-0 cursor-pointer"
                  />
                  <span>Selecionar todas as revendas ({filtered.length})</span>
                </label>
                {selectedResellerIds.size > 0 && (
                  <span className="text-xs text-amber-400 font-semibold flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                    {selectedResellerIds.size} selecionada(s)
                  </span>
                )}
              </div>

              {/* CARDS VIEW (Mobile default & Desktop option) */}
              {(viewMode === 'cards' || window.innerWidth < 768) && (
                <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 ${viewMode === 'table' ? 'md:hidden' : ''}`}>
                  {filtered.map((r) => {
                    const totalClients = customers.filter(c => (c.reseller_username || '').toLowerCase() === r.username.toLowerCase()).length || r.customers_count || 0;
                    const activeClients = customers.filter(c => (c.reseller_username || '').toLowerCase() === r.username.toLowerCase() && isCustomerActive(c) && !c.is_trial).length || r.active_customers_count || Math.max(0, totalClients - (r.clientes_expirados || 0));
                    const partnerAppsCount = customers.filter(c => {
                      if ((c.reseller_username || '').toLowerCase() !== r.username.toLowerCase()) return false;
                      const p = (c.partnerApp || c.partner_app) as any;
                      return Boolean(p && (p.status === 'active' || p.appName || p.app_name));
                    }).length;
                    const isSelected = selectedResellerIds.has(r.id);
                    return (
                      <div
                        key={r.id}
                        className={`bg-[#14151C] border rounded-xl p-4 transition-all group relative ${
                          isSelected ? 'border-amber-500/50 bg-[#161722]' : 'border-[#1E202B] hover:border-[#009EF7]/30'
                        }`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {/* Header: Username & Status */}
                        <div className="flex items-start justify-between mb-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  setSelectedResellerIds(prev => {
                                    const next = new Set(prev);
                                    if (next.has(r.id)) next.delete(r.id);
                                    else next.add(r.id);
                                    return next;
                                  });
                                }}
                                className="w-4 h-4 rounded border-[#2E3245] bg-[#1A1C24] text-blue-500 focus:ring-0 cursor-pointer shrink-0"
                              />
                              <span className="font-bold text-white font-mono text-sm truncate">{r.username}</span>
                              <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                                r.status === 'ACTIVE'
                                  ? 'bg-[#50CD89]/15 text-[#50CD89] border-[#50CD89]/30'
                                  : 'bg-[#F1416C]/15 text-[#F1416C] border-[#F1416C]/30'
                              }`}>
                                {r.status === 'ACTIVE' ? 'ATIVO' : 'BLOQUEADO'}
                              </span>
                              {isResellerUnlimited(r) && (
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold border bg-purple-500/15 text-purple-300 border-purple-500/30 flex items-center gap-1 shadow-sm font-sans">
                                  <span className="text-xs leading-none">∞</span> Ilimitado
                                </span>
                              )}
                              <button
                                type="button"
                                disabled={togglingBotId === (r.id || r.username)}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleBot(r);
                                }}
                                className={`px-2 py-0.5 rounded-md text-[10px] font-bold border flex items-center gap-1 transition-all cursor-pointer hover:scale-105 active:scale-95 disabled:opacity-50 select-none ${
                                  Boolean(r.botAccess ?? (r as any).bot_access)
                                    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25 shadow-sm'
                                    : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:bg-zinc-700 hover:text-zinc-200'
                                }`}
                                title={
                                  togglingBotId === (r.id || r.username)
                                    ? 'Atualizando permissão do bot...'
                                    : Boolean(r.botAccess ?? (r as any).bot_access)
                                    ? `Bot WhatsApp Liberado${Number(r.botMonthlyCredits ?? (r as any).bot_monthly_credits ?? 0) > 0 ? ` (${r.botMonthlyCredits ?? (r as any).bot_monthly_credits} cr/mês)` : ' (Grátis)'} • Clique para Desativar`
                                    : 'Bot WhatsApp Bloqueado • Clique para Ativar'
                                }
                              >
                                {togglingBotId === (r.id || r.username) ? (
                                  <RotateCw className="w-3 h-3 animate-spin text-emerald-400" />
                                ) : (
                                  <Bot className="w-3 h-3" />
                                )}
                                <span>
                                  {Boolean(r.botAccess ?? (r as any).bot_access)
                                    ? `Bot Ativo${Number(r.botMonthlyCredits ?? (r as any).bot_monthly_credits ?? 0) > 0 ? ` (${r.botMonthlyCredits ?? (r as any).bot_monthly_credits} cr)` : ''}`
                                    : 'Bot Off'}
                                </span>
                              </button>
                            </div>
                            {r.name && <p className="text-xs text-[#92929F] truncate mt-0.5">{r.name}</p>}
                            {r.linhagem && r.linhagem.length > 1 && (
                              <div className="text-[10px] text-[#009EF7] font-mono mt-1 flex items-center gap-1 truncate" title={r.linhagem.join(' ➔ ')}>
                                <span className="text-[9px] bg-[#009EF7]/15 px-1.5 py-0.2 rounded border border-[#009EF7]/30">Linhagem</span>
                                <span className="truncate">{r.linhagem.join(' ➔ ')}</span>
                              </div>
                            )}
                            {r.whatsapp && (
                              <a
                                href={`https://wa.me/${r.whatsapp}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[11px] text-[#50CD89] flex items-center gap-1 mt-1 hover:underline"
                              >
                                <Phone className="w-3 h-3" /> {r.whatsapp}
                              </a>
                            )}
                          </div>

                          {/* Action Menu */}
                          <div className="relative shrink-0 ml-2">
                            <button
                              onClick={(e) => { e.stopPropagation(); setActionMenuOpenId(actionMenuOpenId === r.id ? null : r.id); }}
                              className="p-1.5 rounded-lg text-[#92929F] hover:text-white hover:bg-[#1A1C24] transition-all"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>

                            {actionMenuOpenId === r.id && (
                              <div className="absolute right-0 top-8 w-52 bg-[#15171E] border border-[#262833] rounded-xl shadow-2xl z-50 py-1.5 text-left animate-fade-in">
                                <Link
                                  to={`/customers?reseller=${encodeURIComponent(r.username)}`}
                                  className="w-full px-3 py-2 text-xs text-[#92929F] hover:text-white hover:bg-[#1A1C24] flex items-center gap-2 cursor-pointer"
                                >
                                  <Users className="w-3.5 h-3.5 text-[#009EF7]" />
                                  <span>Ver Clientes ({totalClients})</span>
                                </Link>
                                <button
                                  onClick={() => {
                                    setApiKeysTarget(r);
                                    setActionMenuOpenId(null);
                                  }}
                                  className="w-full px-3 py-2 text-xs text-[#92929F] hover:text-white hover:bg-[#1A1C24] flex items-center gap-2 cursor-pointer"
                                >
                                  <Key className="w-3.5 h-3.5 text-[#50CD89]" />
                                  <span>Gerenciar Chaves API</span>
                                </button>
                                <button
                                  onClick={() => {
                                    handleToggleBot(r);
                                    setActionMenuOpenId(null);
                                  }}
                                  className="w-full px-3 py-2 text-xs text-[#92929F] hover:text-white hover:bg-[#1A1C24] flex items-center gap-2 cursor-pointer transition-colors"
                                >
                                  <Bot className={`w-3.5 h-3.5 ${Boolean(r.botAccess ?? (r as any).bot_access) ? 'text-amber-400' : 'text-emerald-400'}`} />
                                  <span>{Boolean(r.botAccess ?? (r as any).bot_access) ? 'Desativar Bot WhatsApp' : 'Ativar Bot WhatsApp'}</span>
                                </button>
                                <button
                                  onClick={() => {
                                    setCreditTarget(r);
                                    setActionMenuOpenId(null);
                                  }}
                                  className="w-full px-3 py-2 text-xs text-[#92929F] hover:text-white hover:bg-[#1A1C24] flex items-center gap-2 cursor-pointer"
                                >
                                  <Coins className="w-3.5 h-3.5 text-[#FFC700]" />
                                  <span>Recarregar Créditos</span>
                                </button>
                                <button
                                  onClick={() => {
                                    setPricingTarget(r);
                                    setActionMenuOpenId(null);
                                  }}
                                  className="w-full px-3 py-2 text-xs text-[#92929F] hover:text-white hover:bg-[#1A1C24] flex items-center gap-2 cursor-pointer"
                                >
                                  <DollarSign className="w-3.5 h-3.5 text-[#50CD89]" />
                                  <span>Configurar Preços</span>
                                </button>
                                <button
                                  onClick={() => {
                                    setInvoiceTarget(r.username);
                                    setActionMenuOpenId(null);
                                  }}
                                  className="w-full px-3 py-2 text-xs text-[#92929F] hover:text-white hover:bg-[#1A1C24] flex items-center gap-2 cursor-pointer"
                                >
                                  <Receipt className="w-3.5 h-3.5 text-[#009EF7]" />
                                  <span>Demonstrativo Fatura</span>
                                </button>
                                <button
                                  onClick={() => {
                                    toggleBlockReseller(r.id);
                                    setActionMenuOpenId(null);
                                  }}
                                  className="w-full px-3 py-2 text-xs text-[#92929F] hover:text-white hover:bg-[#1A1C24] flex items-center gap-2 cursor-pointer"
                                >
                                  <Ban className="w-3.5 h-3.5 text-[#FF9900]" />
                                  <span>{r.status === 'BLOCKED' ? 'Desbloquear' : 'Bloquear'}</span>
                                </button>
                                <button
                                  onClick={() => {
                                    setDeleteTarget(r);
                                    setActionMenuOpenId(null);
                                  }}
                                  className="w-full px-3 py-2 text-xs text-[#F1416C] hover:bg-[#F1416C]/15 flex items-center gap-2 cursor-pointer border-t border-[#262833]/60 transition-colors"
                                >
                                  <Trash2 className="w-3.5 h-3.5 text-[#F1416C]" />
                                  <span>Excluir Revenda</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Stats */}
                        <div className="grid grid-cols-2 gap-2 my-3">
                          {isResellerUnlimited(r) ? (
                            <div className="bg-[#1A1C24] p-2.5 rounded-xl border border-purple-500/30 bg-purple-500/5 text-center">
                              <span className="text-[10px] text-purple-300 block uppercase font-semibold">Créditos</span>
                              <span className="text-purple-400 font-black font-mono text-sm inline-flex items-center gap-1">
                                <span className="text-base leading-none">∞</span> Ilimitado
                              </span>
                            </div>
                          ) : (
                            <div className="bg-[#1A1C24] p-2.5 rounded-xl border border-[#232530] text-center">
                              <span className="text-[10px] text-[#92929F] block uppercase font-semibold">Créditos</span>
                              <span className="text-[#50CD89] font-bold font-mono text-sm">{r.credits}</span>
                            </div>
                          )}
                          <Link
                            to={`/customers?reseller=${encodeURIComponent(r.username)}`}
                            className="bg-[#1A1C24] hover:bg-[#1E202B] p-2.5 rounded-xl border border-[#232530] text-center transition-all group/stat"
                          >
                            <span className="text-[10px] text-[#92929F] block uppercase font-semibold">Clientes Ativos</span>
                            <span className="text-[#009EF7] font-bold font-mono text-sm">{activeClients}</span>
                            {partnerAppsCount > 0 && (
                              <span className="text-[10px] text-purple-300 font-bold block mt-0.5">
                                ⚡ {partnerAppsCount} app{partnerAppsCount > 1 ? 's' : ''}
                              </span>
                            )}
                            {totalClients !== activeClients && (
                              <span className="text-[9px] text-[#92929F] block font-sans">({totalClients} total)</span>
                            )}
                          </Link>
                        </div>

                        {/* Financial Invoice Pill */}
                        {(() => {
                          const inv = calculateResellerInvoice(r.username);
                          return (
                            <div className="p-2.5 bg-[#1A1C24] border border-[#232530] rounded-xl flex items-center justify-between mb-3 text-xs">
                              <div>
                                <div className="text-[10px] text-[#92929F] uppercase font-bold flex items-center gap-1">
                                  <DollarSign className="w-3 h-3 text-[#50CD89]" />
                                  <span>Fatura Estimada</span>
                                </div>
                                <div className="text-sm font-black text-[#50CD89] font-mono mt-0.5">
                                  R$ {inv.total_amount.toFixed(2).replace('.', ',')}
                                  <span className="text-[10px] font-normal text-[#92929F] ml-1 font-sans">
                                    ({inv.total_clients} ativos @ R$ {inv.price_per_client.toFixed(2)})
                                  </span>
                                  {inv.total_partner_apps > 0 && (
                                    <div className="text-[10px] text-purple-400 font-semibold mt-0.5">
                                      +{inv.total_partner_apps} app(s) (R$ {inv.subtotal_partner_apps.toFixed(2).replace('.', ',')})
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() => setPricingTarget(r)}
                                  className="px-2 py-1 rounded-lg bg-[#232530] hover:bg-[#2c2e3d] text-[#50CD89] text-[11px] font-semibold transition-colors cursor-pointer flex items-center gap-1"
                                  title="Ajustar Valores por Cliente / Telas"
                                >
                                  <DollarSign className="w-3 h-3" />
                                  <span>Valores</span>
                                </button>
                                <button
                                  onClick={() => setInvoiceTarget(r.username)}
                                  className="p-1.5 rounded-lg bg-[#009EF7]/15 hover:bg-[#009EF7]/25 text-[#009EF7] text-[11px] font-semibold transition-colors cursor-pointer"
                                  title="Ver Fatura / Cobrar"
                                >
                                  <Receipt className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })()}

                        {/* Quick Actions */}
                        <div className="pt-2 border-t border-[#1E202B] flex gap-2">
                          <button
                            onClick={() => setCreditTarget(r)}
                            className="flex-1 py-1.5 rounded-lg bg-[#50CD89]/15 text-[#50CD89] hover:bg-[#50CD89] hover:text-white border border-[#50CD89]/30 text-[11px] font-semibold transition-all flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <Coins className="w-3 h-3" />
                            <span>Créditos</span>
                          </button>
                          <button
                            onClick={() => setApiKeysTarget(r)}
                            className="flex-1 py-1.5 rounded-lg bg-[#009EF7]/15 text-[#009EF7] hover:bg-[#009EF7] hover:text-white border border-[#009EF7]/30 text-[11px] font-semibold transition-all flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <Key className="w-3 h-3" />
                            <span>Chaves API</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* TABLE VIEW (Desktop only) */}
              <div className={`bg-[#14151C] border border-[#1E202B] rounded-xl overflow-visible ${viewMode === 'cards' ? 'hidden' : 'hidden md:block'}`}>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-[#1E202B] text-[#92929F] text-[11px] uppercase tracking-wider bg-[#14151C]">
                        <th className="py-3 px-3 w-10 text-center">
                          <input
                            type="checkbox"
                            checked={filtered.length > 0 && selectedResellerIds.size === filtered.length}
                            onChange={toggleSelectAll}
                            className="w-4 h-4 rounded border-[#2E3245] bg-[#1A1C24] text-blue-500 focus:ring-0 cursor-pointer"
                          />
                        </th>
                        <th className="py-3 px-4 font-semibold">Revendedor / Usuário</th>
                        <th className="py-3 px-4 font-semibold text-center">Créditos</th>
                        <th className="py-3 px-4 font-semibold text-center">Clientes Ativos</th>
                        <th className="py-3 px-4 font-semibold text-center">Fatura Estimada</th>
                        <th className="py-3 px-4 font-semibold">Status</th>
                        <th className="py-3 px-4 font-semibold text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1E202B]/60">
                      {filtered.map((r) => {
                        const totalClients = customers.filter(c => (c.reseller_username || '').toLowerCase() === r.username.toLowerCase()).length || r.customers_count || 0;
                        const activeClients = customers.filter(c => (c.reseller_username || '').toLowerCase() === r.username.toLowerCase() && isCustomerActive(c) && !c.is_trial).length || r.active_customers_count || Math.max(0, totalClients - (r.clientes_expirados || 0));
                        const partnerAppsCount = customers.filter(c => {
                          if ((c.reseller_username || '').toLowerCase() !== r.username.toLowerCase()) return false;
                          const p = (c.partnerApp || c.partner_app) as any;
                          return Boolean(p && (p.status === 'active' || p.appName || p.app_name));
                        }).length;
                        const inv = calculateResellerInvoice(r.username);
                        const isSelected = selectedResellerIds.has(r.id);
                        return (
                          <tr key={r.id} className={`hover:bg-[#1A1C24]/50 transition-colors group ${isSelected ? 'bg-[#181a28]' : ''}`}>
                            <td className="py-3.5 px-3 text-center">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  setSelectedResellerIds(prev => {
                                    const next = new Set(prev);
                                    if (next.has(r.id)) next.delete(r.id);
                                    else next.add(r.id);
                                    return next;
                                  });
                                }}
                                className="w-4 h-4 rounded border-[#2E3245] bg-[#1A1C24] text-blue-500 focus:ring-0 cursor-pointer"
                              />
                            </td>
                            <td className="py-3.5 px-4">
                              <div className="font-bold text-white font-mono">{r.username}</div>
                              {r.name && <div className="text-[11px] text-[#92929F]">{r.name}</div>}
                              {r.linhagem && r.linhagem.length > 1 && (
                                <div className="text-[10px] text-[#009EF7] font-mono mt-0.5 flex items-center gap-1">
                                  <span className="text-[9px] bg-[#009EF7]/15 px-1 rounded">Rede:</span>
                                  <span>{r.linhagem.join(' ➔ ')}</span>
                                </div>
                              )}
                              {r.whatsapp && <div className="text-[10px] text-[#50CD89]">{r.whatsapp}</div>}
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              {isResellerUnlimited(r) ? (
                                <span className="px-2.5 py-1 rounded-md bg-purple-500/15 text-purple-300 border border-purple-500/30 font-bold font-mono text-xs inline-flex items-center gap-1 shadow-xs">
                                  <span className="text-sm leading-none">∞</span> Ilimitado
                                </span>
                              ) : (
                                <span className="px-2.5 py-1 rounded-md bg-[#50CD89]/15 text-[#50CD89] border border-[#50CD89]/30 font-bold font-mono text-xs">
                                  {r.credits} Créditos
                                </span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              <Link
                                to={`/customers?reseller=${encodeURIComponent(r.username)}`}
                                className="px-2.5 py-1 bg-[#1A1C24] hover:bg-[#009EF7]/15 text-white hover:text-[#009EF7] rounded text-[11px] font-mono border border-[#232530] hover:border-[#009EF7]/30 transition-all inline-flex items-center gap-1.5"
                                title="Clique para ver os clientes desta revenda"
                              >
                                <Users className="w-3 h-3 text-[#009EF7]" />
                                <span>{activeClients} ativos</span>
                              </Link>
                              {partnerAppsCount > 0 && (
                                <div className="mt-1">
                                  <span className="px-2 py-0.5 rounded bg-purple-500/15 text-purple-300 border border-purple-500/30 text-[10px] font-bold inline-flex items-center gap-1 shadow-xs" title={`${partnerAppsCount} aplicativo(s) parceiro(s) ativo(s) nesta revenda`}>
                                    <Tv2 className="w-2.5 h-2.5 text-purple-400" />
                                    <span>{partnerAppsCount} app{partnerAppsCount > 1 ? 's' : ''}</span>
                                  </span>
                                </div>
                              )}
                              {totalClients !== activeClients && (
                                <div className="text-[10px] text-[#92929F] mt-0.5">
                                  {totalClients} no total
                                </div>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              <div>
                                <span className="font-mono font-bold text-xs text-[#50CD89]">
                                  R$ {inv.total_amount.toFixed(2).replace('.', ',')}
                                </span>
                                <div className="text-[10px] text-[#92929F]">
                                  {inv.total_clients} ativos @ R$ {inv.price_per_client.toFixed(2)}
                                </div>
                                {inv.total_partner_apps > 0 && (
                                  <div className="text-[10px] text-purple-400 font-semibold mt-0.5">
                                    +{inv.total_partner_apps} app(s) (R$ {inv.subtotal_partner_apps.toFixed(2).replace('.', ',')})
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="py-3.5 px-4">
                              <div className="flex flex-col gap-1 items-start">
                                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                                  r.status === 'ACTIVE'
                                    ? 'bg-[#50CD89]/15 text-[#50CD89] border-[#50CD89]/30'
                                    : 'bg-[#F1416C]/15 text-[#F1416C] border-[#F1416C]/30'
                                }`}>
                                  {r.status === 'ACTIVE' ? 'ATIVO' : 'BLOQUEADO'}
                                </span>
                                <button
                                  type="button"
                                  disabled={togglingBotId === (r.id || r.username)}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleToggleBot(r);
                                  }}
                                  className={`px-2 py-0.5 rounded-md text-[10px] font-bold border flex items-center gap-1 transition-all cursor-pointer hover:scale-105 active:scale-95 disabled:opacity-50 select-none ${
                                    Boolean(r.botAccess ?? (r as any).bot_access)
                                      ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25 shadow-sm'
                                      : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:bg-zinc-700 hover:text-zinc-200'
                                  }`}
                                  title={
                                    togglingBotId === (r.id || r.username)
                                      ? 'Atualizando permissão do bot...'
                                      : Boolean(r.botAccess ?? (r as any).bot_access)
                                      ? `Bot WhatsApp Liberado${Number(r.botMonthlyCredits ?? (r as any).bot_monthly_credits ?? 0) > 0 ? ` (${r.botMonthlyCredits ?? (r as any).bot_monthly_credits} cr/mês)` : ' (Grátis)'} • Clique para Desativar`
                                      : 'Bot WhatsApp Bloqueado • Clique para Ativar'
                                  }
                                >
                                  {togglingBotId === (r.id || r.username) ? (
                                    <RotateCw className="w-3 h-3 animate-spin text-emerald-400" />
                                  ) : (
                                    <Bot className="w-3 h-3" />
                                  )}
                                  <span>
                                    {Boolean(r.botAccess ?? (r as any).bot_access)
                                      ? `Bot Ativo${Number(r.botMonthlyCredits ?? (r as any).bot_monthly_credits ?? 0) > 0 ? ` (${r.botMonthlyCredits ?? (r as any).bot_monthly_credits} cr)` : ''}`
                                      : 'Bot Off'}
                                  </span>
                                </button>
                              </div>
                            </td>
                            <td className="py-3.5 px-4 text-right relative">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => setInvoiceTarget(r.username)}
                                  className="px-2 py-1 rounded bg-[#009EF7]/15 text-[#009EF7] hover:bg-[#009EF7] hover:text-white border border-[#009EF7]/30 text-[11px] font-semibold transition-all flex items-center gap-1 cursor-pointer"
                                  title="Ver Demonstrativo da Fatura"
                                >
                                  <Receipt className="w-3 h-3" />
                                  <span>Fatura</span>
                                </button>

                                <button
                                  onClick={() => setPricingTarget(r)}
                                  className="px-2 py-1 rounded bg-[#50CD89]/15 text-[#50CD89] hover:bg-[#50CD89] hover:text-white border border-[#50CD89]/30 text-[11px] font-semibold transition-all flex items-center gap-1 cursor-pointer"
                                  title="Ajustar Valores por Cliente / Telas"
                                >
                                  <DollarSign className="w-3 h-3" />
                                  <span>Valores</span>
                                </button>

                                <button
                                  onClick={() => setCreditTarget(r)}
                                  className="px-2 py-1 rounded bg-[#1A1C24] text-[#92929F] hover:text-white border border-[#232530] text-[11px] font-semibold transition-all flex items-center gap-1 cursor-pointer"
                                  title="Transferir ou recolher créditos"
                                >
                                  <Coins className="w-3 h-3 text-[#50CD89]" />
                                  <span>Créditos</span>
                                </button>

                                <button
                                  onClick={() => setApiKeysTarget(r)}
                                  className="px-2.5 py-1 rounded bg-[#009EF7]/15 text-[#009EF7] hover:bg-[#009EF7] hover:text-white border border-[#009EF7]/30 text-[11px] font-semibold transition-all flex items-center gap-1 cursor-pointer"
                                  title="Chaves de API para Bots"
                                >
                                  <Key className="w-3 h-3" />
                                  <span>Chaves API</span>
                                </button>

                                <button
                                  onClick={() => setDeleteTarget(r)}
                                  className="p-1.5 rounded bg-[#1A1C24] hover:bg-[#F1416C]/15 text-[#92929F] hover:text-[#F1416C] border border-[#232530] hover:border-[#F1416C]/30 text-[11px] font-semibold transition-all flex items-center cursor-pointer"
                                  title="Excluir revenda permanentemente"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>

                                <div className="relative">
                                  <button
                                    onClick={(e) => { e.stopPropagation(); setActionMenuOpenId(actionMenuOpenId === r.id ? null : r.id); }}
                                    className="p-1 rounded text-[#92929F] hover:text-white hover:bg-[#1A1C24] transition-all"
                                  >
                                    <MoreVertical className="w-4 h-4" />
                                  </button>

                                  {actionMenuOpenId === r.id && (
                                    <div className="absolute right-0 top-7 w-48 bg-[#15171E] border border-[#262833] rounded-xl shadow-2xl z-50 py-1.5 animate-fade-in text-left">
                                      <Link
                                        to={`/customers?reseller=${encodeURIComponent(r.username)}`}
                                        className="w-full px-3 py-1.5 text-xs text-[#92929F] hover:text-white hover:bg-[#1A1C24] flex items-center gap-2 cursor-pointer"
                                      >
                                        <Users className="w-3.5 h-3.5 text-[#009EF7]" />
                                        <span>Ver Clientes ({totalClients})</span>
                                      </Link>

                                      <button
                                        onClick={() => {
                                          setApiKeysTarget(r);
                                          setActionMenuOpenId(null);
                                        }}
                                        className="w-full px-3 py-1.5 text-xs text-[#92929F] hover:text-white hover:bg-[#1A1C24] flex items-center gap-2 cursor-pointer"
                                      >
                                        <Key className="w-3.5 h-3.5 text-[#009EF7]" />
                                        <span>Chaves de API Bots</span>
                                      </button>

                                      <button
                                        onClick={() => {
                                          handleToggleBot(r);
                                          setActionMenuOpenId(null);
                                        }}
                                        className="w-full px-3 py-1.5 text-xs text-[#92929F] hover:text-white hover:bg-[#1A1C24] flex items-center gap-2 cursor-pointer transition-colors"
                                      >
                                        <Bot className={`w-3.5 h-3.5 ${Boolean(r.botAccess ?? (r as any).bot_access) ? 'text-amber-400' : 'text-emerald-400'}`} />
                                        <span>{Boolean(r.botAccess ?? (r as any).bot_access) ? 'Desativar Bot WhatsApp' : 'Ativar Bot WhatsApp'}</span>
                                      </button>

                                      <button
                                        onClick={() => {
                                          toggleBlockReseller(r.id);
                                          setActionMenuOpenId(null);
                                        }}
                                        className="w-full px-3 py-1.5 text-xs text-[#92929F] hover:text-white hover:bg-[#1A1C24] flex items-center gap-2 cursor-pointer"
                                      >
                                        <Ban className="w-3.5 h-3.5 text-[#FF9900]" />
                                        <span>{r.status === 'BLOCKED' ? 'Desbloquear' : 'Bloquear'}</span>
                                      </button>

                                      <button
                                        onClick={() => {
                                          setDeleteTarget(r);
                                          setActionMenuOpenId(null);
                                        }}
                                        className="w-full px-3 py-1.5 text-xs text-[#F1416C] hover:bg-[#F1416C]/15 flex items-center gap-2 cursor-pointer border-t border-[#262833]/60 transition-colors"
                                      >
                                        <Trash2 className="w-3.5 h-3.5 text-[#F1416C]" />
                                        <span>Excluir Revenda</span>
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </>
      )}

      {/* Modals */}
      {creditTarget && (
        <TransferCreditsModal
          reseller={creditTarget}
          onClose={() => setCreditTarget(null)}
          onSuccess={() => { refreshLiveData(); fetchHierarchy(); }}
        />
      )}

      {apiKeysTarget && (
        <SubresellerApiKeysModal
          reseller={apiKeysTarget}
          onClose={() => setApiKeysTarget(null)}
        />
      )}

      {pricingTarget && (
        <ResellerPricingModal
          reseller={pricingTarget}
          onClose={() => setPricingTarget(null)}
          onSuccess={() => { refreshLiveData(); fetchHierarchy(); }}
        />
      )}

      {invoiceTarget && (
        <ResellerInvoiceModal
          resellerUsername={invoiceTarget}
          onClose={() => setInvoiceTarget(null)}
          onOpenPricing={() => {
            const target = invoiceTarget;
            setInvoiceTarget(null);
            setPricingTarget({ username: target });
          }}
        />
      )}

      {/* Modal de Confirmação para Exclusão de Revenda */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-fade-in select-none" onClick={() => { if (!isDeleting) setDeleteTarget(null); }}>
          <div className="bg-[#15171E] border border-[#262833] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="px-6 py-4 border-b border-[#262833] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#F1416C]/15 border border-[#F1416C]/30 text-[#F1416C] flex items-center justify-center">
                  <Trash2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">Excluir Revendedor</h3>
                  <p className="text-[11px] text-[#92929F]">Confirmação de exclusão permanente</p>
                </div>
              </div>
              <button
                onClick={() => { setDeleteTarget(null); setDeleteError(null); }}
                className="text-[#5E6278] hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
                disabled={isDeleting}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              <p className="text-xs text-[#92929F] leading-relaxed">
                Tem certeza que deseja excluir permanentemente o revendedor <span className="font-mono font-bold text-white bg-[#1A1C24] px-1.5 py-0.5 rounded border border-[#232530]">{deleteTarget.username}</span>?
              </p>

              <div className="p-3.5 bg-[#F1416C]/10 border border-[#F1416C]/20 rounded-xl space-y-1">
                <div className="flex items-center gap-2 text-xs font-bold text-[#F1416C]">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>Atenção: Ação irreversível</span>
                </div>
                <p className="text-[11px] text-[#92929F] pl-6">
                  Esta revenda perderá o acesso ao painel imediatamente, seus créditos serão revogados e todas as credenciais de API associadas deixarão de funcionar.
                </p>
              </div>

              {deleteError && (
                <div className="p-3 bg-[#F1416C]/10 border border-[#F1416C]/30 rounded-xl text-xs text-[#F1416C]">
                  {deleteError}
                </div>
              )}

              {/* Actions */}
              <div className="pt-2 flex gap-2.5">
                <button
                  type="button"
                  onClick={() => { setDeleteTarget(null); setDeleteError(null); }}
                  disabled={isDeleting}
                  className="flex-1 py-2.5 rounded-xl bg-[#1A1C24] hover:bg-[#232530] text-[#92929F] hover:text-white border border-[#232530] text-xs font-semibold transition-all disabled:opacity-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    setIsDeleting(true);
                    setDeleteError(null);
                    const res = await deleteReseller(deleteTarget.username);
                    setIsDeleting(false);
                    if (res.success) {
                      setDeleteTarget(null);
                    } else {
                      setDeleteError(res.message);
                    }
                  }}
                  disabled={isDeleting}
                  className="flex-1 py-2.5 rounded-xl bg-[#F1416C] hover:bg-[#d9214e] text-white text-xs font-bold transition-all shadow-lg shadow-red-500/20 disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{isDeleting ? 'Excluindo...' : 'Sim, Excluir Revenda'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Floating Bulk Action Bar para Revendas */}
      {selectedResellerIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-[#161822]/95 border border-[#2E3245] backdrop-blur-md rounded-2xl px-5 py-3 shadow-2xl flex items-center gap-3.5 flex-wrap animate-in fade-in slide-in-from-bottom-3 max-w-[95vw]">
          <div className="text-xs text-white font-medium flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
            <span><strong className="text-white font-bold">{selectedResellerIds.size}</strong> revenda(s) selecionada(s)</span>
          </div>
          <div className="h-4 w-px bg-white/10 hidden sm:block" />
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setBulkCreditsOpen(true)}
              disabled={bulkActionLoading}
              className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-amber-500/20 cursor-pointer disabled:opacity-50"
            >
              <Coins className="w-4 h-4" />
              <span>Recarregar Créditos</span>
            </button>

            <button
              type="button"
              onClick={handleBulkCopyZap}
              className="px-3 py-1.5 rounded-xl bg-[#25D366]/20 hover:bg-[#25D366]/30 text-[#25D366] border border-[#25D366]/40 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Phone className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Copiar Zap</span>
            </button>

            <button
              type="button"
              onClick={handleBulkBlock}
              disabled={bulkActionLoading}
              className="px-3 py-1.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
            >
              <Ban className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Bloquear</span>
            </button>

            <button
              type="button"
              onClick={handleBulkUnblock}
              disabled={bulkActionLoading}
              className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Desbloquear</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedResellerIds(new Set())}
              className="px-2.5 py-1.5 rounded-xl bg-[#202330] hover:bg-[#282C3D] text-gray-400 hover:text-white text-xs font-semibold transition-all cursor-pointer"
            >
              Limpar
            </button>
          </div>
        </div>
      )}

      {/* Global Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 bg-[#15171E] border border-amber-500/40 text-white rounded-xl shadow-2xl animate-in fade-in slide-in-from-bottom-2">
          <div className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
            <Check className="w-4 h-4 stroke-[3]" />
          </div>
          <span className="text-xs font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Modal de Recarga em Massa de Revendas */}
      <BulkResellerCreditsModal
        isOpen={bulkCreditsOpen}
        selectedResellers={selectedResellersList}
        onClose={() => setBulkCreditsOpen(false)}
        onComplete={() => {
          setSelectedResellerIds(new Set());
          showToast('Recarga em massa finalizada com sucesso!');
        }}
      />
    </div>
  );
};
