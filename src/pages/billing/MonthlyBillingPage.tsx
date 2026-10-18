import React, { useState } from 'react';
import { useSigmaStore } from '../../store/SigmaStore';
import {
  DollarSign,
  Users,
  Tv,
  Calendar,
  CheckCircle2,
  Clock,
  Search,
  RotateCw,
  Settings2,
  Send,
  Receipt,
  Layers,
  ArrowUpRight,
  TrendingUp,
  LayoutGrid,
  List,
  ChevronRight,
  Phone,
  Smartphone,
  X
} from 'lucide-react';
import { ResellerPricingModal } from '../../components/modals/ResellerPricingModal';
import { ResellerInvoiceModal } from '../../components/modals/ResellerInvoiceModal';
import { GlobalBillingSettingsModal } from '../../components/modals/GlobalBillingSettingsModal';
import { isDirectReseller } from '../../utils/customerMetrics';
import { PartnerAppItemDetail } from '../../types';

export const MonthlyBillingPage: React.FC = () => {
  const {
    resellers,
    calculateResellerInvoice,
    toggleInvoicePaid,
    refreshLiveData,
    isLoadingLive,
    profile
  } = useSigmaStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'PENDING' | 'PAID'>('ALL');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

  // Modais
  const [pricingTarget, setPricingTarget] = useState<any | null>(null);
  const [invoiceTarget, setInvoiceTarget] = useState<string | null>(null);
  const [globalSettingsOpen, setGlobalSettingsOpen] = useState(false);
  const [partnerAppsTarget, setPartnerAppsTarget] = useState<{
    resellerUsername: string;
    items: PartnerAppItemDetail[];
  } | null>(null);

  // Faturamento restrito exclusivamente a revendedores diretos (Nível 1)
  // Sub-revendas de nível 2, 3, 4 etc. são subordinadas aos revendedores e não aparecem como faturas de nível 1
  const directResellers = resellers.filter((reseller) => isDirectReseller(reseller, profile));

  // Calcula as faturas das revendas diretas de Nível 1
  const invoices = directResellers.map((reseller) => calculateResellerInvoice(reseller.username));

  // Métricas Consolidadas
  const totalProjected = invoices.reduce((sum, inv) => sum + inv.total_amount, 0);
  const totalPaid = invoices.filter((inv) => inv.is_paid).reduce((sum, inv) => sum + inv.total_amount, 0);
  const totalPending = invoices.filter((inv) => !inv.is_paid).reduce((sum, inv) => sum + inv.total_amount, 0);
  const totalClientsNetwork = invoices.reduce((sum, inv) => sum + inv.total_clients, 0);
  const totalScreensNetwork = invoices.reduce((sum, inv) => sum + inv.total_extra_screens, 0);
  const totalPartnerAppsNetwork = invoices.reduce((sum, inv) => sum + inv.total_partner_apps, 0);
  const totalPartnerAppsRevenue = invoices.reduce((sum, inv) => sum + inv.subtotal_partner_apps, 0);

  // Filtros de busca
  const filteredInvoices = invoices.filter((inv) => {
    const matchSearch =
      inv.reseller_username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (inv.reseller_name && inv.reseller_name.toLowerCase().includes(searchTerm.toLowerCase()));

    if (!matchSearch) return false;
    if (filterStatus === 'PENDING') return !inv.is_paid;
    if (filterStatus === 'PAID') return inv.is_paid;
    return true;
  });

  const monthFormatted = new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  const monthCap = monthFormatted.charAt(0).toUpperCase() + monthFormatted.slice(1);

  return (
    <div className="space-y-6 select-none">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-white tracking-tight">Faturamento & Mensalidades</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#50CD89]/15 text-[#50CD89] border border-[#50CD89]/30">
              {monthCap}
            </span>
          </div>
          <p className="text-xs text-[#92929F] mt-0.5">
            Faturamento e cobrança de revendedores diretos (Nível 1). Sub-revendas de níveis 2, 3 e 4 são consolidadas dentro das revendas responsáveis.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => refreshLiveData()}
            disabled={isLoadingLive}
            className="p-2 bg-[#14151C] hover:bg-[#1E202B] border border-[#1E202B] rounded-xl text-[#92929F] hover:text-white transition-all disabled:opacity-50 cursor-pointer"
            title="Atualizar dados"
          >
            <RotateCw className={`w-4 h-4 ${isLoadingLive ? 'animate-spin text-[#009EF7]' : ''}`} />
          </button>

          <button
            onClick={() => setGlobalSettingsOpen(true)}
            className="px-3.5 py-2 bg-[#1A1C24] hover:bg-[#232530] border border-[#232530] text-xs font-semibold text-white rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-md"
          >
            <Settings2 className="w-4 h-4 text-[#009EF7]" />
            <span>Preços Padrão & PIX</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* Total Previsto */}
        <div className="p-4 bg-[#14151C] border border-[#1E202B] rounded-2xl relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#92929F]">Faturamento Total</span>
            <div className="w-7 h-7 rounded-lg bg-[#50CD89]/10 flex items-center justify-center text-[#50CD89]">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-black text-white font-mono mt-2">
            R$ {totalProjected.toFixed(2).replace('.', ',')}
          </div>
          <div className="text-[11px] text-[#50CD89] mt-1 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            <span>Mês atual ({invoices.length} revendas)</span>
          </div>
        </div>

        {/* Total Recebido */}
        <div className="p-4 bg-[#14151C] border border-[#1E202B] rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#92929F]">Total Recebido</span>
            <div className="w-7 h-7 rounded-lg bg-[#50CD89]/10 flex items-center justify-center text-[#50CD89]">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-black text-[#50CD89] font-mono mt-2">
            R$ {totalPaid.toFixed(2).replace('.', ',')}
          </div>
          <div className="text-[11px] text-[#92929F] mt-1">
            {invoices.filter((i) => i.is_paid).length} faturas quitadas
          </div>
        </div>

        {/* Total Pendente */}
        <div className="p-4 bg-[#14151C] border border-[#1E202B] rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#92929F]">Total Pendente</span>
            <div className="w-7 h-7 rounded-lg bg-[#FFC700]/10 flex items-center justify-center text-[#FFC700]">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-black text-[#FFC700] font-mono mt-2">
            R$ {totalPending.toFixed(2).replace('.', ',')}
          </div>
          <div className="text-[11px] text-[#92929F] mt-1">
            {invoices.filter((i) => !i.is_paid).length} faturas a receber
          </div>
        </div>

        {/* Total de Clientes na Rede */}
        <div className="p-4 bg-[#14151C] border border-[#1E202B] rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#92929F]">Clientes Faturados</span>
            <div className="w-7 h-7 rounded-lg bg-[#009EF7]/10 flex items-center justify-center text-[#009EF7]">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-black text-white font-mono mt-2">
            {totalClientsNetwork}
          </div>
          <div className="text-[11px] text-[#009EF7] mt-1">
            Base ativa faturável
          </div>
        </div>

        {/* Telas Extras */}
        <div className="p-4 bg-[#14151C] border border-[#1E202B] rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#92929F]">Telas Extras</span>
            <div className="w-7 h-7 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400">
              <Tv className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-black text-white font-mono mt-2">
            {totalScreensNetwork}
          </div>
          <div className="text-[11px] text-purple-400 mt-1">
            Conexões extras (&gt; 1)
          </div>
        </div>

        {/* Apps Parceiros */}
        <div className="p-4 bg-[#14151C] border border-[#1E202B] rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#92929F]">Apps Parceiros</span>
            <div className="w-7 h-7 rounded-lg bg-[#A855F7]/10 flex items-center justify-center text-[#A855F7]">
              <Smartphone className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-black text-white font-mono mt-2">
            {totalPartnerAppsNetwork}
          </div>
          <div className="text-[11px] text-[#A855F7] mt-1 font-mono font-bold">
            R$ {totalPartnerAppsRevenue.toFixed(2).replace('.', ',')}
          </div>
        </div>
      </div>

      {/* Controls: Search, Filters & View Toggle */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#14151C] border border-[#1E202B] p-3 rounded-2xl">
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-[#5E6278] absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Buscar por login ou nome da revenda..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#1A1C24] border border-[#232530] rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-[#5E6278] focus:border-[#009EF7] focus:outline-none transition-colors"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          {/* Status Filter Buttons */}
          <div className="flex items-center border border-[#232530] rounded-xl overflow-hidden bg-[#1A1C24] text-xs">
            <button
              onClick={() => setFilterStatus('ALL')}
              className={`px-3 py-1.5 font-semibold transition-all cursor-pointer ${
                filterStatus === 'ALL' ? 'bg-[#009EF7] text-white' : 'text-[#92929F] hover:text-white'
              }`}
            >
              Todos ({invoices.length})
            </button>
            <button
              onClick={() => setFilterStatus('PENDING')}
              className={`px-3 py-1.5 font-semibold transition-all cursor-pointer ${
                filterStatus === 'PENDING' ? 'bg-[#FFC700] text-black font-bold' : 'text-[#92929F] hover:text-white'
              }`}
            >
              Pendentes ({invoices.filter((i) => !i.is_paid).length})
            </button>
            <button
              onClick={() => setFilterStatus('PAID')}
              className={`px-3 py-1.5 font-semibold transition-all cursor-pointer ${
                filterStatus === 'PAID' ? 'bg-[#50CD89] text-black font-bold' : 'text-[#92929F] hover:text-white'
              }`}
            >
              Pagos ({invoices.filter((i) => i.is_paid).length})
            </button>
          </div>

          {/* Table / Cards toggle */}
          <div className="flex items-center border border-[#232530] rounded-xl overflow-hidden bg-[#1A1C24]">
            <button
              onClick={() => setViewMode('table')}
              className={`p-2 transition-all cursor-pointer ${
                viewMode === 'table' ? 'bg-[#009EF7] text-white' : 'text-[#92929F] hover:text-white'
              }`}
              title="Visualização em Tabela"
            >
              <List className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={`p-2 transition-all cursor-pointer ${
                viewMode === 'cards' ? 'bg-[#009EF7] text-white' : 'text-[#92929F] hover:text-white'
              }`}
              title="Visualização em Cards"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Listing Content */}
      {filteredInvoices.length === 0 ? (
        <div className="p-12 text-center bg-[#14151C] border border-[#1E202B] rounded-2xl">
          <Receipt className="w-12 h-12 text-[#5E6278] mx-auto mb-3 opacity-40" />
          <h3 className="text-sm font-bold text-white">Nenhuma fatura encontrada</h3>
          <p className="text-xs text-[#92929F] mt-1">
            Nenhum revendedor corresponde aos filtros de busca atuais.
          </p>
        </div>
      ) : viewMode === 'table' ? (
        /* TABLE VIEW */
        <div className="bg-[#14151C] border border-[#1E202B] rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#111217] border-b border-[#1E202B] text-[#92929F] uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Revendedor</th>
                  <th className="py-3 px-4 text-center">Clientes Diretos</th>
                  <th className="py-3 px-4 text-center">Sub-Revendas</th>
                  <th className="py-3 px-4 text-center">Total Clientes</th>
                  <th className="py-3 px-4 text-center">Telas Extras</th>
                  <th className="py-3 px-4 text-center">Apps Parceiros</th>
                  <th className="py-3 px-4 text-center">R$ / Cliente</th>
                  <th className="py-3 px-4 text-center">R$ / Tela</th>
                  <th className="py-3 px-4 text-center">R$ / App</th>
                  <th className="py-3 px-4 text-right">Total Fatura</th>
                  <th className="py-3 px-4 text-center">Vencimento</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1E202B]/60 text-white">
                {filteredInvoices.map((inv) => (
                  <tr key={inv.reseller_username} className="hover:bg-[#1A1C24]/50 transition-colors">
                    {/* Revendedor */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-[#1E202B] flex items-center justify-center font-bold text-xs text-[#009EF7]">
                          {(inv.reseller_username || 'R').substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold font-mono text-white flex items-center gap-1.5">
                            <span>{inv.reseller_username}</span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#009EF7]/15 text-[#009EF7] border border-[#009EF7]/30 font-bold">
                              Nível 1 • Direto
                            </span>
                          </div>
                          {inv.reseller_name && inv.reseller_name !== inv.reseller_username && (
                            <div className="text-[11px] text-[#92929F]">{inv.reseller_name}</div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Clientes Diretos */}
                    <td className="py-3 px-4 text-center font-mono font-semibold text-white">
                      {inv.direct_clients}
                    </td>

                    {/* Sub-Revendas */}
                    <td className="py-3 px-4 text-center">
                      {inv.subreseller_clients > 0 ? (
                        <span className="px-2 py-0.5 rounded-md bg-purple-500/15 text-purple-300 font-mono font-bold text-[11px]" title={`${inv.subresellers_detail.length} sub-revenda(s) subordinada(s)`}>
                          +{inv.subreseller_clients}
                        </span>
                      ) : (
                        <span className="text-[#5E6278] font-mono">0</span>
                      )}
                    </td>

                    {/* Total Clientes */}
                    <td className="py-3 px-4 text-center font-mono font-black text-white">
                      <span className="px-2 py-0.5 rounded-md bg-[#1E202B] text-white">
                        {inv.total_clients}
                      </span>
                    </td>

                    {/* Telas Extras */}
                    <td className="py-3 px-4 text-center font-mono text-[#92929F]">
                      {inv.total_extra_screens > 0 ? (
                        <span className="text-[#009EF7] font-bold">+{inv.total_extra_screens}</span>
                      ) : (
                        '0'
                      )}
                    </td>

                    {/* Apps Parceiros */}
                    <td className="py-3 px-4 text-center">
                      {inv.total_partner_apps > 0 ? (
                        <button
                          onClick={() => setPartnerAppsTarget({
                            resellerUsername: inv.reseller_username,
                            items: inv.partner_apps_detail || []
                          })}
                          className="px-2 py-0.5 rounded-md bg-[#A855F7]/15 hover:bg-[#A855F7]/25 text-[#C084FC] border border-[#A855F7]/30 font-mono font-bold text-[11px] transition-colors cursor-pointer inline-flex items-center gap-1"
                          title="Clique para ver clientes com apps parceiros ativos"
                        >
                          <Smartphone className="w-3 h-3 text-[#A855F7]" />
                          <span>+{inv.total_partner_apps}</span>
                        </button>
                      ) : (
                        <span className="text-[#5E6278] font-mono">0</span>
                      )}
                    </td>

                    {/* Preço / Cliente */}
                    <td className="py-3 px-4 text-center font-mono">
                      <button
                        onClick={() => setPricingTarget({ username: inv.reseller_username, name: inv.reseller_name })}
                        className="px-2 py-0.5 rounded bg-[#1A1C24] hover:bg-[#232530] text-[#50CD89] border border-[#232530] hover:border-[#50CD89]/40 transition-colors cursor-pointer"
                        title="Clique para editar valor por cliente"
                      >
                        R$ {inv.price_per_client.toFixed(2).replace('.', ',')}
                      </button>
                    </td>

                    {/* Preço / Tela */}
                    <td className="py-3 px-4 text-center font-mono">
                      <button
                        onClick={() => setPricingTarget({ username: inv.reseller_username, name: inv.reseller_name })}
                        className="px-2 py-0.5 rounded bg-[#1A1C24] hover:bg-[#232530] text-[#009EF7] border border-[#232530] hover:border-[#009EF7]/40 transition-colors cursor-pointer"
                        title="Clique para editar valor por tela"
                      >
                        R$ {inv.price_per_extra_screen.toFixed(2).replace('.', ',')}
                      </button>
                    </td>

                    {/* Preço / App */}
                    <td className="py-3 px-4 text-center font-mono">
                      <button
                        onClick={() => setPricingTarget({ username: inv.reseller_username, name: inv.reseller_name })}
                        className="px-2 py-0.5 rounded bg-[#1A1C24] hover:bg-[#232530] text-[#A855F7] border border-[#232530] hover:border-[#A855F7]/40 transition-colors cursor-pointer"
                        title="Clique para editar valor por app parceiro"
                      >
                        R$ {inv.price_per_partner_app.toFixed(2).replace('.', ',')}
                      </button>
                    </td>

                    {/* Total da Fatura */}
                    <td className="py-3 px-4 text-right font-mono font-black text-sm text-[#50CD89]">
                      R$ {inv.total_amount.toFixed(2).replace('.', ',')}
                    </td>

                    {/* Vencimento */}
                    <td className="py-3 px-4 text-center text-[11px] text-[#92929F] font-mono">
                      Dia {inv.due_day}
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => toggleInvoicePaid(inv.reseller_username)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all cursor-pointer flex items-center gap-1 mx-auto ${
                          inv.is_paid
                            ? 'bg-[#50CD89]/15 text-[#50CD89] border-[#50CD89]/30 hover:bg-[#50CD89]/25'
                            : 'bg-[#FFC700]/15 text-[#FFC700] border-[#FFC700]/30 hover:bg-[#FFC700]/25'
                        }`}
                        title="Alternar entre Pago e Pendente"
                      >
                        {inv.is_paid ? (
                          <>
                            <CheckCircle2 className="w-3 h-3 text-[#50CD89]" />
                            <span>Pago</span>
                          </>
                        ) : (
                          <>
                            <Clock className="w-3 h-3 text-[#FFC700]" />
                            <span>Pendente</span>
                          </>
                        )}
                      </button>
                    </td>

                    {/* Ações */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Botão Ver Fatura */}
                        <button
                          onClick={() => setInvoiceTarget(inv.reseller_username)}
                          className="p-1.5 bg-[#1A1C24] hover:bg-[#232530] text-[#009EF7] rounded-lg border border-[#232530] transition-colors cursor-pointer"
                          title="Ver Demonstrativo da Fatura"
                        >
                          <Receipt className="w-3.5 h-3.5" />
                        </button>

                        {/* Botão Ajustar Valores */}
                        <button
                          onClick={() => setPricingTarget({ username: inv.reseller_username, name: inv.reseller_name })}
                          className="p-1.5 bg-[#1A1C24] hover:bg-[#232530] text-[#50CD89] rounded-lg border border-[#232530] transition-colors cursor-pointer"
                          title="Ajustar Valores por Cliente / Telas"
                        >
                          <DollarSign className="w-3.5 h-3.5" />
                        </button>

                        {/* Botão WhatsApp */}
                        <button
                          onClick={() => setInvoiceTarget(inv.reseller_username)}
                          className="p-1.5 bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#25D366] rounded-lg border border-[#25D366]/30 transition-colors cursor-pointer"
                          title="Cobrar via WhatsApp"
                        >
                          <Send className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* CARDS VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredInvoices.map((inv) => (
            <div
              key={inv.reseller_username}
              className="p-4 bg-[#14151C] border border-[#1E202B] rounded-2xl hover:border-[#009EF7]/40 transition-all space-y-3"
            >
              {/* Card Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#1E202B] flex items-center justify-center font-bold text-sm text-[#009EF7]">
                    {(inv.reseller_username || 'R').substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-bold font-mono text-white text-sm">
                      {inv.reseller_username}
                    </div>
                    <div className="text-xs text-[#92929F]">
                      Nível 1 • Direto • Vence todo dia {inv.due_day}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => toggleInvoicePaid(inv.reseller_username)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all cursor-pointer flex items-center gap-1 ${
                    inv.is_paid
                      ? 'bg-[#50CD89]/15 text-[#50CD89] border-[#50CD89]/30'
                      : 'bg-[#FFC700]/15 text-[#FFC700] border-[#FFC700]/30'
                  }`}
                >
                  {inv.is_paid ? 'Pago' : 'Pendente'}
                </button>
              </div>

              {/* Clientes, Telas & Apps Grid */}
              <div className="grid grid-cols-4 gap-2 text-center p-2.5 bg-[#1A1C24] rounded-xl border border-[#232530] text-xs">
                <div>
                  <div className="text-[10px] text-[#92929F]">Diretos</div>
                  <div className="font-mono font-bold text-white mt-0.5">{inv.direct_clients}</div>
                </div>
                <div>
                  <div className="text-[10px] text-[#92929F]">Sub-Revendas</div>
                  <div className="font-mono font-bold text-purple-400 mt-0.5">+{inv.subreseller_clients}</div>
                </div>
                <div>
                  <div className="text-[10px] text-[#92929F]">Telas Extras</div>
                  <div className="font-mono font-bold text-[#009EF7] mt-0.5">{inv.total_extra_screens}</div>
                </div>
                <div>
                  <div className="text-[10px] text-[#A855F7] font-semibold">Apps</div>
                  <div className="font-mono font-bold text-[#A855F7] mt-0.5">
                    {inv.total_partner_apps > 0 ? (
                      <button
                        onClick={() => setPartnerAppsTarget({
                          resellerUsername: inv.reseller_username,
                          items: inv.partner_apps_detail || []
                        })}
                        className="hover:underline cursor-pointer"
                        title="Ver detalhes dos apps parceiros"
                      >
                        +{inv.total_partner_apps}
                      </button>
                    ) : (
                      '0'
                    )}
                  </div>
                </div>
              </div>

              {/* Preços & Fatura */}
              <div className="flex items-center justify-between pt-1 text-xs">
                <div>
                  <span className="text-[#92929F]">Preço por cliente: </span>
                  <span className="text-white font-mono font-bold">R$ {inv.price_per_client.toFixed(2).replace('.', ',')}</span>
                  {inv.total_extra_screens > 0 && (
                    <div className="text-[11px] text-[#009EF7]">
                      + R$ {inv.price_per_extra_screen.toFixed(2).replace('.', ',')}/tela extra
                    </div>
                  )}
                  {inv.total_partner_apps > 0 && (
                    <div className="text-[11px] text-[#A855F7]">
                      + R$ {inv.price_per_partner_app.toFixed(2).replace('.', ',')}/app parceiro ({inv.total_partner_apps})
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-[#92929F] uppercase">Fatura Total</div>
                  <div className="text-lg font-black text-[#50CD89] font-mono">
                    R$ {inv.total_amount.toFixed(2).replace('.', ',')}
                  </div>
                </div>
              </div>

              {/* Card Actions */}
              <div className="pt-2 border-t border-[#1E202B] flex items-center justify-between gap-2">
                <button
                  onClick={() => setPricingTarget({ username: inv.reseller_username, name: inv.reseller_name })}
                  className="flex-1 py-1.5 px-2.5 bg-[#1A1C24] hover:bg-[#232530] border border-[#232530] rounded-xl text-xs font-semibold text-[#92929F] hover:text-white transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <DollarSign className="w-3.5 h-3.5 text-[#50CD89]" />
                  <span>Ajustar Preços</span>
                </button>

                <button
                  onClick={() => setInvoiceTarget(inv.reseller_username)}
                  className="flex-1 py-1.5 px-2.5 bg-[#009EF7]/10 hover:bg-[#009EF7]/20 border border-[#009EF7]/30 rounded-xl text-xs font-bold text-[#009EF7] transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Receipt className="w-3.5 h-3.5" />
                  <span>Ver Fatura</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAIS */}
      {pricingTarget && (
        <ResellerPricingModal
          reseller={pricingTarget}
          onClose={() => setPricingTarget(null)}
          onSuccess={() => refreshLiveData()}
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

      {globalSettingsOpen && (
        <GlobalBillingSettingsModal
          onClose={() => setGlobalSettingsOpen(false)}
        />
      )}

      {/* Modal Detalhes dos Apps Parceiros Ativos */}
      {partnerAppsTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in select-none">
          <div className="bg-[#14151C] border border-[#1E202B] w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-[#1E202B] flex items-center justify-between bg-[#111217]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#A855F7]/10 border border-[#A855F7]/20 flex items-center justify-center text-[#A855F7]">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <span>Apps Parceiros Ativos</span>
                    <span className="text-xs px-2 py-0.5 rounded-md bg-[#1E202B] text-[#A855F7] font-mono">
                      {partnerAppsTarget.resellerUsername}
                    </span>
                  </h2>
                  <p className="text-xs text-[#92929F]">
                    {partnerAppsTarget.items.length} aplicativo(s) parceiro(s) ativo(s) contabilizado(s) a partir de 03/10/2026.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setPartnerAppsTarget(null)}
                className="p-1.5 rounded-lg text-[#92929F] hover:text-white hover:bg-[#1E202B] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* List / Table */}
            <div className="p-5 overflow-y-auto space-y-3">
              {partnerAppsTarget.items.length === 0 ? (
                <div className="text-center py-8 text-[#5E6278] text-xs">
                  Nenhum aplicativo parceiro ativo encontrado para esta revenda.
                </div>
              ) : (
                <div className="divide-y divide-[#1E202B] border border-[#1E202B] rounded-xl overflow-hidden bg-[#161720]">
                  <div className="grid grid-cols-12 gap-2 px-3 py-2 bg-[#111217] text-[10px] font-bold text-[#92929F] uppercase tracking-wider">
                    <div className="col-span-4">Cliente</div>
                    <div className="col-span-3">Aplicativo</div>
                    <div className="col-span-3">Usuário / MAC</div>
                    <div className="col-span-2 text-right">Origem</div>
                  </div>
                  {partnerAppsTarget.items.map((item, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 px-3 py-2.5 items-center text-xs hover:bg-[#1A1C24]/60 transition-colors">
                      <div className="col-span-4 min-w-0">
                        <div className="font-mono font-bold text-white truncate">
                          {item.customer_username || item.customer_id}
                        </div>
                        {item.customer_name && (
                          <div className="text-[11px] text-[#92929F] truncate">{item.customer_name}</div>
                        )}
                      </div>
                      <div className="col-span-3">
                        <span className="px-2 py-0.5 rounded-md bg-[#A855F7]/15 text-[#C084FC] border border-[#A855F7]/30 text-[11px] font-semibold">
                          {item.app_name}
                        </span>
                        {item.activated_at && (
                          <div className="text-[10px] text-[#5E6278] mt-0.5">
                            Ativado: {new Date(item.activated_at).toLocaleDateString('pt-BR')}
                          </div>
                        )}
                      </div>
                      <div className="col-span-3 font-mono text-[11px] text-[#009EF7] truncate">
                        {item.app_user || item.mac || '—'}
                      </div>
                      <div className="col-span-2 text-right">
                        {item.is_subreseller ? (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-500/15 text-purple-300 border border-purple-500/30" title={`Sub-revenda: ${item.reseller_username}`}>
                            Sub-revenda
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#009EF7]/15 text-[#009EF7] border border-[#009EF7]/30">
                            Direto
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-[#1E202B] bg-[#111217] flex justify-end">
              <button
                onClick={() => setPartnerAppsTarget(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#1E202B] hover:bg-[#252836] text-white transition-colors cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
