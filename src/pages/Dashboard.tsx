import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, UserPlus, Search, RotateCw, AlertCircle, RefreshCw, Send, Check, Calendar, Wallet, Receipt } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useSigmaStore } from '../store/SigmaStore';
import { QuickTestModal } from '../components/modals/QuickTestModal';
import { FinancialSummaryModal } from '../components/modals/FinancialSummaryModal';
import { APP_CONFIG, useBrandConfig } from '../config/appConfig';
import { fastCdnApi } from '../services/fastcdn';
import { XtreamClassicDashboard } from '../components/themes/XtreamClassicDashboard';
import { 
  calculateCustomerMetrics, 
  isDirectReseller, 
  DashboardPeriod, 
  getPeriodDateRange, 
  filterCustomersByPeriod, 
  filterResellersByPeriod 
} from '../utils/customerMetrics';
import { DashboardGamificationBanner } from '../components/resellers/DashboardGamificationBanner';

export const Dashboard: React.FC = () => {
  const { profile, customers, resellers, refreshLiveData, isLoadingLive, calculateResellerInvoice, rankingData } = useSigmaStore();
  const [period, setPeriod] = useState<DashboardPeriod>('mes_atual');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [viewType, setViewType] = useState<'clientes' | 'revendas'>('clientes');
  const [testSearch, setTestSearch] = useState('');
  const [quickTestOpen, setQuickTestOpen] = useState(false);
  const [financialSummaryOpen, setFinancialSummaryOpen] = useState(false);

  const [bouquets, setBouquets] = useState<any[]>([]);

  useEffect(() => {
    fastCdnApi.getListas().then((list) => {
      if (Array.isArray(list) && list.length > 0) {
        setBouquets(list);
      }
    }).catch(() => {});
  }, []);

  // Intervalo e filtragem ativa por período
  const periodRange = getPeriodDateRange(period, customStartDate, customEndDate);
  const filteredCustomers = filterCustomersByPeriod(customers, periodRange);
  const filteredResellers = filterResellersByPeriod(resellers, periodRange);

  // Consolidação de métricas com isolamento financeiro da carteira direta vs rede de revendas
  const metrics = calculateCustomerMetrics(filteredCustomers, filteredResellers, profile);

  const {
    totalClients,
    activeClients,
    expiredClients,
    trialClients,
    retentionRate,
    directTotal,
    directActive,
    directExpired,
    directTrials,
    directActiveMRR,
    directTicketMedio,
    directExpiringSoon,
    directExpiringAmount,
    resellerClientsTotal,
    resellerClientsActive,
    resellerClientsExpired,
    resellerClientsTrials,
    totalSubresellers,
    activeResellers,
    blockedResellers,
    totalResellerCredits
  } = metrics;

  const directMrrFormatted = directActiveMRR.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
  const ticketMedioFormatted = directTicketMedio.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
  const expiringAmountFormatted = directExpiringAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 });

  // Faturamento faturado das revendas diretas (mensalidades de revenda de Nível 1 via calculateResellerInvoice)
  const directResellers = filteredResellers.filter(r => isDirectReseller(r, profile));
  const resellerInvoicesRevenue = directResellers.reduce((acc, r) => acc + calculateResellerInvoice(r.username).total_amount, 0);
  const resellerRevenueFormatted = resellerInvoicesRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 });

  const brand = useBrandConfig();
  if (brand.themeStyle === 'xtream-classic') {
    return (
      <>
        <XtreamClassicDashboard
          profile={profile}
          customers={customers}
          resellers={resellers}
          bouquets={bouquets}
          metrics={{
            totalClients,
            activeClients,
            expiredClients,
            trialClients,
            totalSubresellers,
            activeResellers,
            blockedResellers
          }}
          refreshLiveData={refreshLiveData}
          isLoadingLive={isLoadingLive}
          onOpenQuickTest={() => setQuickTestOpen(true)}
        />
        <QuickTestModal
          isOpen={quickTestOpen}
          onClose={() => setQuickTestOpen(false)}
        />
      </>
    );
  }

  return (
    <div className="space-y-4 text-[#92929F] text-xs font-sans select-none">
      {/* Subtle Top Info Bar */}
      <div className="bg-[#111319] border border-[#1E202B] px-3.5 py-2 rounded-xl flex items-center justify-between text-xs gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#009EF7]/15 text-[#009EF7] border border-[#009EF7]/30 shrink-0 uppercase">Painel</span>
          <span className="text-[#92929F] truncate text-[11px]">Sincronização em tempo real</span>
        </div>
        <button
          onClick={() => refreshLiveData()}
          disabled={isLoadingLive}
          className="text-[#009EF7] hover:text-[#009EF7]/80 text-[11px] font-semibold flex items-center gap-1.5 cursor-pointer shrink-0 transition-colors disabled:opacity-50"
        >
          <RotateCw className={`w-3.5 h-3.5 ${isLoadingLive ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Atualizar Dados</span>
        </button>
      </div>

      {/* Gamification / Ranking Banner */}
      <DashboardGamificationBanner rankingData={rankingData} />

      {/* Main Top Controls: Period Buttons & Toggle Clientes/Revendas */}
      <div className="space-y-2 pt-0.5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
          {/* Period selection - scrollable on mobile */}
          <div className="flex items-center gap-1 bg-[#14151C] p-1 rounded-xl border border-[#1E202B] overflow-x-auto scrollbar-none w-full lg:w-auto shrink-0">
            <button
              onClick={() => setPeriod('mes_atual')}
              className={`px-3 py-1.5 rounded-lg font-medium text-xs whitespace-nowrap transition-all ${
                period === 'mes_atual' ? 'bg-[#009EF7] text-white shadow-xs font-semibold' : 'text-[#92929F] hover:text-white'
              }`}
            >
              Mês atual
            </button>
            <button
              onClick={() => setPeriod('ultimos_30')}
              className={`px-3 py-1.5 rounded-lg font-medium text-xs whitespace-nowrap transition-all ${
                period === 'ultimos_30' ? 'bg-[#009EF7] text-white shadow-xs font-semibold' : 'text-[#92929F] hover:text-white'
              }`}
            >
              Últimos 30 dias
            </button>
            <button
              onClick={() => setPeriod('mes_passado')}
              className={`px-3 py-1.5 rounded-lg font-medium text-xs whitespace-nowrap transition-all ${
                period === 'mes_passado' ? 'bg-[#009EF7] text-white shadow-xs font-semibold' : 'text-[#92929F] hover:text-white'
              }`}
            >
              Mês passado
            </button>
            <button
              onClick={() => setPeriod('personalizado')}
              className={`px-3 py-1.5 rounded-lg font-medium text-xs whitespace-nowrap transition-all flex items-center gap-1.5 ${
                period === 'personalizado' ? 'bg-[#009EF7] text-white shadow-xs font-semibold' : 'text-[#92929F] hover:text-white'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Personalizado</span>
            </button>
          </div>

          {/* View Type Toggle (Clientes / Revendas) */}
          <div className="flex items-center justify-between lg:justify-end gap-2.5 w-full lg:w-auto">
            <span className="text-[11px] text-[#5E6278] hidden sm:inline-block truncate">
              {periodRange.label}
            </span>
            <div className="flex items-center gap-1 bg-[#14151C] p-1 rounded-xl border border-[#1E202B] w-full sm:w-auto shrink-0">
              <button
                onClick={() => setViewType('clientes')}
                className={`flex-1 sm:flex-initial px-3.5 py-1.5 rounded-lg font-medium text-xs transition-all text-center ${
                  viewType === 'clientes' ? 'bg-[#009EF7] text-white shadow-xs font-semibold' : 'text-[#92929F] hover:text-white'
                }`}
              >
                Clientes ({totalClients})
              </button>
              <button
                onClick={() => setViewType('revendas')}
                className={`flex-1 sm:flex-initial px-3.5 py-1.5 rounded-lg font-medium text-xs transition-all text-center ${
                  viewType === 'revendas' ? 'bg-[#009EF7] text-white shadow-xs font-semibold' : 'text-[#92929F] hover:text-white'
                }`}
              >
                Revendas ({totalSubresellers})
              </button>
            </div>
          </div>
        </div>

        {/* Date Inputs when 'personalizado' is active */}
        {period === 'personalizado' && (
          <div className="bg-[#14151C] border border-[#1E202B] rounded-lg p-2.5 flex flex-wrap items-center gap-3 text-xs">
            <span className="text-white font-medium flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#009EF7]" />
              <span>Filtrar datas:</span>
            </span>
            <div className="flex items-center gap-2">
              <span className="text-[#5E6278]">De:</span>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="bg-[#1A1C24] border border-[#232530] rounded px-2 py-1 text-white text-xs focus:outline-none focus:border-[#009EF7]"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[#5E6278]">Até:</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="bg-[#1A1C24] border border-[#232530] rounded px-2 py-1 text-white text-xs focus:outline-none focus:border-[#009EF7]"
              />
            </div>
            {(customStartDate || customEndDate) && (
              <button
                onClick={() => {
                  setCustomStartDate('');
                  setCustomEndDate('');
                }}
                className="text-[#92929F] hover:text-[#009EF7] underline text-[11px] cursor-pointer"
              >
                Limpar datas
              </button>
            )}
          </div>
        )}
      </div>

      {/* Grid Layout: Left Column (Metrics & AI Analysis) + Right Column (Teste Rápido Widget) */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* LEFT 3 COLUMNS: Main Metrics Cards & AI Box */}
        <div className="lg:col-span-3 space-y-4">
          {/* Conditional Metrics Rows: Clientes vs Revendas */}
          {viewType === 'clientes' ? (
            <>
              {/* Top 4 Metrics Row (Clientes) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
                {/* Clientes ativos */}
                <div className="bg-[#14151C] border border-[#1E202B] rounded-xl p-3 relative">
                  <div className="flex items-center justify-between text-[#92929F] text-xs">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="truncate">Clientes ativos</span>
                      <span className="px-1.5 py-0.2 rounded text-[9px] bg-[#1E202B] text-[#009EF7] font-bold shrink-0">TOTAL</span>
                    </div>
                    <RotateCw onClick={() => refreshLiveData()} className="w-3 h-3 text-[#5E6278] cursor-pointer hover:text-white shrink-0" />
                  </div>
                  <div className="text-lg sm:text-xl font-black text-white mt-1 sm:mt-1.5">{activeClients}</div>
                  <div className="text-[10px] sm:text-[11px] text-[#5E6278] mt-0.5 truncate">{directActive} diretos • {resellerClientsActive} revendas</div>
                </div>

                {/* Total de clientes */}
                <div className="bg-[#14151C] border border-[#1E202B] rounded-xl p-3">
                  <div className="text-[#92929F] text-xs truncate">Total de Clientes</div>
                  <div className="text-lg sm:text-xl font-black text-white mt-1 sm:mt-1.5">{totalClients}</div>
                  <div className="text-[10px] sm:text-[11px] text-[#50CD89] mt-0.5 truncate">{directTotal} diretos • {resellerClientsTotal} revendas</div>
                </div>

                {/* Expirando • Vencidos */}
                <div className="bg-[#14151C] border border-[#1E202B] rounded-xl p-3">
                  <div className="text-[#92929F] text-xs truncate">Vencidos / Expirados</div>
                  <div className="text-lg sm:text-xl font-black text-white mt-1 sm:mt-1.5">{expiredClients}</div>
                  <div className="text-[10px] sm:text-[11px] text-[#F1416C] mt-0.5 truncate">{directExpired} diretos • {resellerClientsExpired} revendas</div>
                </div>

                {/* Retenção */}
                <div className="bg-[#14151C] border border-[#1E202B] rounded-xl p-3">
                  <div className="text-[#92929F] text-xs truncate">Taxa de Ativos</div>
                  <div className="text-lg sm:text-xl font-black text-white mt-1 sm:mt-1.5">{retentionRate}%</div>
                  <div className="text-[10px] sm:text-[11px] text-[#50CD89] mt-0.5 truncate">{activeClients} ativos no servidor</div>
                </div>
              </div>

              {/* Bottom 4 Metrics Row (Clientes) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
                {/* Receita recorrente • MRR Direto */}
                <div className="bg-[#14151C] border border-[#1E202B] rounded-xl p-3 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[#92929F] text-[11px] truncate">Receita Direta • MRR</span>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => setFinancialSummaryOpen(true)}
                          title="Abrir Resumo Financeiro Completo"
                          className="px-1.5 py-0.5 rounded bg-[#1E202B] hover:bg-[#2B2D3D] text-[#50CD89] hover:text-white transition-all cursor-pointer flex items-center gap-1 text-[9px] font-semibold"
                        >
                          <Wallet className="w-2.5 h-2.5" />
                          <span>Extrato</span>
                        </button>
                      </div>
                    </div>
                    <div className="text-base sm:text-lg font-bold text-white mt-1">R$ {directMrrFormatted}</div>
                  </div>
                  <div className="text-[10px] sm:text-[11px] text-[#50CD89] mt-0.5 flex items-center justify-between">
                    <span className="truncate">{directActive} diretos</span>
                    <button
                      onClick={() => setFinancialSummaryOpen(true)}
                      className="text-[10px] text-[#009EF7] hover:underline cursor-pointer font-medium shrink-0 ml-1"
                    >
                      Detalhes &rarr;
                    </button>
                  </div>
                </div>

                {/* Clientes Diretos */}
                <div className="bg-[#14151C] border border-[#1E202B] rounded-xl p-3">
                  <div className="text-[#92929F] text-[11px] truncate">Clientes Diretos</div>
                  <div className="text-base sm:text-lg font-bold text-[#009EF7] mt-1">{directTotal}</div>
                  <div className="text-[10px] sm:text-[11px] text-[#5E6278] mt-0.5 truncate">Ticket R$ {ticketMedioFormatted}</div>
                </div>

                {/* Clientes sob Revendas */}
                <div className="bg-[#14151C] border border-[#1E202B] rounded-xl p-3">
                  <div className="text-[#92929F] text-[11px] truncate">Clientes Revendas</div>
                  <div className="text-base sm:text-lg font-bold text-[#9C27B0] mt-1">{resellerClientsTotal}</div>
                  <div className="text-[10px] sm:text-[11px] text-[#5E6278] mt-0.5 truncate">{totalSubresellers} revendas</div>
                </div>

                {/* Testes rápidos */}
                <div className="bg-[#14151C] border border-[#1E202B] rounded-xl p-3">
                  <div className="text-[#92929F] text-[11px] truncate">Testes Gerados</div>
                  <div className="text-base sm:text-lg font-bold text-white mt-1">{trialClients}</div>
                  <div className="text-[10px] sm:text-[11px] text-[#50CD89] mt-0.5 truncate">{directTrials} dir • {resellerClientsTrials} rev</div>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Top 4 Metrics Row (Revendas) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
                {/* Total de Revendas */}
                <div className="bg-[#14151C] border border-[#1E202B] rounded-xl p-3">
                  <div className="text-[#92929F] text-[11px] truncate">Sub-Revendas</div>
                  <div className="text-lg sm:text-xl font-black text-white mt-1">{totalSubresellers}</div>
                  <div className="text-[10px] sm:text-[11px] text-[#009EF7] mt-0.5 truncate">Parceiros</div>
                </div>

                {/* Revendas Ativas */}
                <div className="bg-[#14151C] border border-[#1E202B] rounded-xl p-3">
                  <div className="text-[#92929F] text-[11px] truncate">Revendas Ativas</div>
                  <div className="text-lg sm:text-xl font-black text-[#50CD89] mt-1">{activeResellers}</div>
                  <div className="text-[10px] sm:text-[11px] text-[#50CD89] mt-0.5 truncate">Operando</div>
                </div>

                {/* Créditos Distribuídos */}
                <div className="bg-[#14151C] border border-[#1E202B] rounded-xl p-3">
                  <div className="text-[#92929F] text-[11px] truncate">Créditos Revendas</div>
                  <div className="text-lg sm:text-xl font-black text-[#FFA800] mt-1">{totalResellerCredits}</div>
                  <div className="text-[10px] sm:text-[11px] text-[#5E6278] mt-0.5 truncate">Saldo em posse</div>
                </div>

                {/* Clientes das Revendas */}
                <div className="bg-[#14151C] border border-[#1E202B] rounded-xl p-3">
                  <div className="text-[#92929F] text-[11px] truncate">Clientes Revendas</div>
                  <div className="text-lg sm:text-xl font-black text-[#9C27B0] mt-1">{resellerClientsTotal}</div>
                  <div className="text-[10px] sm:text-[11px] text-[#9C27B0] mt-0.5 truncate">Contas parceiras</div>
                </div>
              </div>

              {/* Bottom 4 Metrics Row (Revendas) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
                {/* Revendas Bloqueadas */}
                <div className="bg-[#14151C] border border-[#1E202B] rounded-xl p-3">
                  <div className="text-[#92929F] text-[11px] truncate">Bloqueadas</div>
                  <div className="text-base sm:text-lg font-bold text-[#F1416C] mt-1">{blockedResellers}</div>
                  <div className="text-[10px] sm:text-[11px] text-[#5E6278] mt-0.5 truncate">Suspensas</div>
                </div>

                {/* Média de Clientes por Revenda */}
                <div className="bg-[#14151C] border border-[#1E202B] rounded-xl p-3">
                  <div className="text-[#92929F] text-[11px] truncate">Média Clientes</div>
                  <div className="text-base sm:text-lg font-bold text-white mt-1">
                    {totalSubresellers > 0 ? (resellerClientsTotal / totalSubresellers).toFixed(1) : '0'}
                  </div>
                  <div className="text-[10px] sm:text-[11px] text-[#5E6278] mt-0.5 truncate">Por parceiro</div>
                </div>

                {/* Média de Créditos */}
                <div className="bg-[#14151C] border border-[#1E202B] rounded-xl p-3">
                  <div className="text-[#92929F] text-[11px] truncate">Média Créditos</div>
                  <div className="text-base sm:text-lg font-bold text-white mt-1">
                    {totalSubresellers > 0 ? Math.round(totalResellerCredits / totalSubresellers) : 0}
                  </div>
                  <div className="text-[10px] sm:text-[11px] text-[#5E6278] mt-0.5 truncate">Saldo médio</div>
                </div>

                {/* Faturamento Previsto de Revendas */}
                <div className="bg-[#14151C] border border-[#1E202B] rounded-xl p-3">
                  <div className="text-[#92929F] text-[11px] truncate">Faturamento</div>
                  <div className="text-base sm:text-lg font-bold text-[#50CD89] mt-1">R$ {resellerRevenueFormatted}</div>
                  <div className="text-[10px] sm:text-[11px] text-[#5E6278] mt-0.5 truncate">Faturas revenda</div>
                </div>
              </div>
            </>
          )}

          {/* Bottom Row: Crescimento & Assistente de Renovação */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Crescimento Card */}
            <div className="bg-[#14151C] border border-[#1E202B] rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-bold text-[#5E6278] uppercase tracking-wider">CRESCIMENTO</div>
                  <div className="text-white font-bold text-sm mt-0.5">+{totalClients} clientes no período</div>
                </div>
                <div className="text-[11px] text-[#50CD89] font-semibold">{directTotal} diretos • {resellerClientsTotal} de revendas</div>
              </div>

              {/* Clean Minimalist Vector Graph */}
              <div className="h-28 flex items-end pt-2 relative">
                {/* Horizontal reference lines */}
                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-20">
                  <div className="border-b border-[#2E3142] w-full" />
                  <div className="border-b border-[#2E3142] w-full" />
                  <div className="border-b border-[#2E3142] w-full" />
                </div>
                <svg className="w-full h-full overflow-visible relative z-10" viewBox="0 0 300 80" preserveAspectRatio="none">
                  <path
                    d="M0,75 L40,72 L80,68 L120,55 L160,20 L200,45 L240,40 L300,28 L300,80 L0,80 Z"
                    fill="rgba(0, 158, 247, 0.08)"
                  />
                  <path
                    d="M0,75 L40,72 L80,68 L120,55 L160,20 L200,45 L240,40 L300,28"
                    fill="none"
                    stroke="#009EF7"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <circle cx="160" cy="20" r="3.5" fill="#009EF7" stroke="#0F1014" strokeWidth="2" />
                  <circle cx="300" cy="28" r="3.5" fill="#50CD89" stroke="#0F1014" strokeWidth="2" />
                </svg>
              </div>
            </div>

            {/* Assistente de Renovação Card */}
            <div className="bg-[#14151C] border border-[#1E202B] rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-[10px] font-bold text-[#5E6278] uppercase tracking-wider">ASSISTENTE DE RENOVAÇÃO</div>
                <Link to="/customers/renewal-assistant" className="text-[11px] text-[#009EF7] hover:underline font-semibold">
                  Ver todos
                </Link>
              </div>

              <div className="p-3 bg-[#1A1C24] rounded-lg border border-[#232530] flex items-center justify-between">
                <div>
                  <div className="text-white font-bold text-xs">{directExpiringSoon.length} Clientes Diretos a Renovar</div>
                  <div className="text-[11px] text-[#50CD89] mt-0.5">R$ {expiringAmountFormatted} a receber da sua carteira</div>
                </div>
                <Link
                  to="/customers/renewal-assistant?scope=DIRECT"
                  className="px-3 py-1.5 rounded-lg bg-[#50CD89] hover:bg-[#47be7d] text-white text-[11px] font-bold transition-all shadow-sm"
                >
                  Cobrar WhatsApp
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT 1 COLUMN: Teste Rápido Widget */}
        <div className="bg-[#14151C] border border-[#1E202B] rounded-xl p-4 flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-white font-bold text-sm">Teste Rápido</div>
              <span className="text-[10px] bg-[#50CD89]/15 text-[#50CD89] border border-[#50CD89]/30 px-2 py-0.5 rounded font-bold">
                0 Créditos (Grátis)
              </span>
            </div>

            {/* Quick Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#5E6278] absolute left-3 top-2.5" />
              <input
                type="text"
                value={testSearch}
                onChange={(e) => setTestSearch(e.target.value)}
                placeholder="Pesquisar..."
                className="w-full bg-[#1A1C24] border border-[#232530] rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-[#5E6278] focus:outline-none focus:border-[#009EF7]"
              />
            </div>

            {/* Accordion Categories */}
            <div className="space-y-1.5 max-h-72 overflow-y-auto pr-0.5">
              {bouquets.length > 0 ? (
                bouquets
                  .filter((b) => !testSearch.trim() || (b.nome || '').toLowerCase().includes(testSearch.trim().toLowerCase()))
                  .map((b) => (
                    <div key={b.id} className="border border-[#1E202B] rounded-lg overflow-hidden bg-[#16171F]">
                      <div
                        onClick={() => setQuickTestOpen(true)}
                        className="px-3 py-2 flex items-center justify-between gap-2 text-xs font-semibold text-white hover:bg-[#1C1E29] transition-all cursor-pointer"
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <span className="w-2 h-2 rounded-full bg-[#50CD89] shrink-0"></span>
                          <span className="truncate text-xs text-[#E1E3EA]">{b.nome}</span>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold text-[#50CD89] bg-[#50CD89]/10 hover:bg-[#50CD89]/20 shrink-0 transition-colors">
                          Gerar
                        </span>
                      </div>
                    </div>
                  ))
              ) : (
                <div className="border border-[#1E202B] rounded-lg overflow-hidden bg-[#16171F]">
                  <div
                    onClick={() => setQuickTestOpen(true)}
                    className="px-3 py-2 flex items-center justify-between gap-2 text-xs font-semibold text-white hover:bg-[#1C1E29] transition-all cursor-pointer"
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className="w-2 h-2 rounded-full bg-[#F1416C] shrink-0"></span>
                      <span className="truncate text-xs text-[#E1E3EA]">COMPLETO C/ ADULTOS (4h)</span>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold text-[#50CD89] bg-[#50CD89]/10 hover:bg-[#50CD89]/20 shrink-0 transition-colors">
                      Gerar
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Bottom Button: + Adicionar Cliente */}
          <Link
            to="/customers/add"
            className="w-full py-2.5 rounded-lg bg-[#009EF7] hover:bg-[#0095E8] text-white text-xs font-bold flex items-center justify-center gap-2 shadow-md shadow-blue-500/20 transition-all cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ Adicionar Cliente</span>
          </Link>
        </div>
      </div>

      <QuickTestModal isOpen={quickTestOpen} onClose={() => setQuickTestOpen(false)} />
      <FinancialSummaryModal
        isOpen={financialSummaryOpen}
        onClose={() => setFinancialSummaryOpen(false)}
        metrics={metrics}
        resellers={resellers}
        profile={profile}
        resellerInvoicesRevenue={resellerInvoicesRevenue}
      />
    </div>
  );
};
