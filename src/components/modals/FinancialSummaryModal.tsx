import React, { useState } from 'react';
import { X, Search, DollarSign, Wallet, ArrowUpRight, Clock, ShieldCheck, AlertCircle, CheckCircle2, Edit2, Users, Receipt } from 'lucide-react';
import { Customer, Reseller, UserProfile } from '../../types';
import { ConsolidatedCustomerMetrics, getCustomerPrice, parseExpiryDate } from '../../utils/customerMetrics';
import { EditCustomerModal } from './EditCustomerModal';

interface FinancialSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  metrics: ConsolidatedCustomerMetrics;
  resellers: Reseller[];
  profile: UserProfile;
  resellerInvoicesRevenue: number;
}

export const FinancialSummaryModal: React.FC<FinancialSummaryModalProps> = ({
  isOpen,
  onClose,
  metrics,
  resellers,
  profile,
  resellerInvoicesRevenue
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'with_price' | 'no_price' | 'expiring'>('all');
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  if (!isOpen) return null;

  const {
    directTotal,
    directActive,
    directExpired,
    directTrials,
    directCustomers,
    directActiveMRR,
    directTicketMedio,
    directWithPriceCount,
    directWithoutPriceCount,
    directExpiringSoon,
    directExpiringAmount
  } = metrics;

  const totalProjectedRevenue = directActiveMRR + resellerInvoicesRevenue;

  // Filtragem dos clientes diretos
  const filteredCustomers = directCustomers.filter(c => {
    const price = getCustomerPrice(c);
    const matchesSearch = !searchTerm.trim() || 
      c.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.name && c.name.toLowerCase().includes(searchTerm.toLowerCase()));

    if (!matchesSearch) return false;

    if (activeTab === 'with_price') return price > 0;
    if (activeTab === 'no_price') return price === 0;
    if (activeTab === 'expiring') return directExpiringSoon.some(exp => exp.id === c.id);

    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#14151C] border border-[#1E202B] rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-[#1E202B] flex items-center justify-between bg-[#161722]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#009EF7]/15 border border-[#009EF7]/30 flex items-center justify-center text-[#009EF7] shrink-0">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">Resumo Financeiro da Operação</h2>
                <span className="bg-[#50CD89]/15 text-[#50CD89] border border-[#50CD89]/30 text-[10px] font-bold px-2 py-0.5 rounded">
                  Dados 100% Reais
                </span>
              </div>
              <p className="text-xs text-[#92929F] mt-0.5">
                Consolidação financeira direta sem estimativas fictícias ou números simulados.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-[#1A1C24] hover:bg-[#232530] text-[#92929F] hover:text-white flex items-center justify-center transition-all cursor-pointer border border-[#232530]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Top 4 Real KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Direct Active MRR */}
            <div className="bg-[#181A24] border border-[#232530] rounded-xl p-4">
              <div className="flex items-center justify-between text-[#92929F] text-xs">
                <span>Receita Direta • MRR</span>
                <Wallet className="w-3.5 h-3.5 text-[#50CD89]" />
              </div>
              <div className="text-xl font-bold text-white mt-2">
                R$ {directActiveMRR.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
              <div className="text-[11px] text-[#50CD89] mt-0.5 font-medium">
                {directActive} clientes diretos ativos
              </div>
            </div>

            {/* Reseller Monthly Revenue */}
            <div className="bg-[#181A24] border border-[#232530] rounded-xl p-4">
              <div className="flex items-center justify-between text-[#92929F] text-xs">
                <span>Faturamento Revendas</span>
                <Users className="w-3.5 h-3.5 text-[#009EF7]" />
              </div>
              <div className="text-xl font-bold text-white mt-2">
                R$ {resellerInvoicesRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
              <div className="text-[11px] text-[#009EF7] mt-0.5 font-medium">
                {resellers.length} parceiros cadastrados
              </div>
            </div>

            {/* Total Projected Revenue */}
            <div className="bg-[#181A24] border border-[#232530] rounded-xl p-4">
              <div className="flex items-center justify-between text-[#92929F] text-xs">
                <span>Faturamento Total Real</span>
                <ArrowUpRight className="w-3.5 h-3.5 text-[#50CD89]" />
              </div>
              <div className="text-xl font-bold text-[#50CD89] mt-2">
                R$ {totalProjectedRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
              <div className="text-[11px] text-[#92929F] mt-0.5">
                Direto + Revendas ativas
              </div>
            </div>

            {/* Expiring Amount in 7 days */}
            <div className="bg-[#181A24] border border-[#232530] rounded-xl p-4">
              <div className="flex items-center justify-between text-[#92929F] text-xs">
                <span>A Receber (7 dias)</span>
                <Clock className="w-3.5 h-3.5 text-[#FFA800]" />
              </div>
              <div className="text-xl font-bold text-white mt-2">
                R$ {directExpiringAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
              <div className="text-[11px] text-[#FFA800] mt-0.5 font-medium">
                {directExpiringSoon.length} renovações da sua carteira
              </div>
            </div>
          </div>

          {/* Policy & Integrity Notice */}
          <div className="bg-[#12141C] border border-[#1E202B] rounded-xl p-4 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-[#009EF7] shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <div className="text-white font-semibold">Política de Valores & Integridade Financeira</div>
              <div className="text-[#92929F]">
                Clientes com valor indefinido possuem mensalidade fixa de <strong className="text-white">R$ 00,00</strong>. 
                Para clientes com planos definidos, o cálculo contabiliza estritamente os valores configurados.
              </div>
              <div className="text-[#5E6278] pt-1 flex items-center gap-4">
                <span>Clientes com valor definido: <strong className="text-[#50CD89]">{directWithPriceCount}</strong> (Ticket médio: R$ {directTicketMedio.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})</span>
                <span>Clientes com valor indefinido: <strong className="text-white">{directWithoutPriceCount}</strong> (R$ 0,00)</span>
              </div>
            </div>
          </div>

          {/* Breakdown Filter & Table */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              {/* Tab Pills */}
              <div className="flex items-center gap-1 bg-[#1A1C24] p-1 rounded-lg border border-[#232530] overflow-x-auto">
                <button
                  onClick={() => setActiveTab('all')}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                    activeTab === 'all'
                      ? 'bg-[#009EF7] text-white font-semibold shadow-sm'
                      : 'text-[#92929F] hover:text-white'
                  }`}
                >
                  Todos ({directTotal})
                </button>
                <button
                  onClick={() => setActiveTab('with_price')}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                    activeTab === 'with_price'
                      ? 'bg-[#009EF7] text-white font-semibold shadow-sm'
                      : 'text-[#92929F] hover:text-white'
                  }`}
                >
                  Com Valor ({directWithPriceCount})
                </button>
                <button
                  onClick={() => setActiveTab('no_price')}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                    activeTab === 'no_price'
                      ? 'bg-[#009EF7] text-white font-semibold shadow-sm'
                      : 'text-[#92929F] hover:text-white'
                  }`}
                >
                  Valor R$ 0,00 ({directWithoutPriceCount})
                </button>
                <button
                  onClick={() => setActiveTab('expiring')}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                    activeTab === 'expiring'
                      ? 'bg-[#009EF7] text-white font-semibold shadow-sm'
                      : 'text-[#92929F] hover:text-white'
                  }`}
                >
                  Vencendo em 7d ({directExpiringSoon.length})
                </button>
              </div>

              {/* Search */}
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-[#5E6278] absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar cliente..."
                  className="w-full bg-[#1A1C24] border border-[#232530] rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-[#5E6278] focus:outline-none focus:border-[#009EF7]"
                />
              </div>
            </div>

            {/* Customers Table */}
            <div className="bg-[#181A24] border border-[#232530] rounded-xl overflow-hidden">
              <div className="overflow-x-auto max-h-72 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-[#161722] z-10 text-[#92929F] text-[11px] uppercase tracking-wider border-b border-[#232530]">
                    <tr>
                      <th className="py-2.5 px-4">Cliente</th>
                      <th className="py-2.5 px-4">Status</th>
                      <th className="py-2.5 px-4">Vencimento</th>
                      <th className="py-2.5 px-4">Mensalidade Real</th>
                      <th className="py-2.5 px-4 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#232530]">
                    {filteredCustomers.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-[#92929F]">
                          Nenhum cliente encontrado neste filtro.
                        </td>
                      </tr>
                    ) : (
                      filteredCustomers.map((c) => {
                        const price = getCustomerPrice(c);
                        const hasPrice = price > 0;

                        return (
                          <tr key={c.id} className="hover:bg-[#1C1E2B] transition-colors">
                            <td className="py-2.5 px-4 font-mono font-medium text-white">
                              <div>{c.username}</div>
                              {c.name && <div className="text-[11px] text-[#5E6278] font-sans">{c.name}</div>}
                            </td>
                            <td className="py-2.5 px-4">
                              {c.status === 'ACTIVE' ? (
                                <span className="px-2 py-0.5 rounded bg-[#50CD89]/15 text-[#50CD89] border border-[#50CD89]/30 text-[10px] font-bold">
                                  Ativo
                                </span>
                              ) : c.status === 'EXPIRED' ? (
                                <span className="px-2 py-0.5 rounded bg-[#F1416C]/15 text-[#F1416C] border border-[#F1416C]/30 text-[10px] font-bold">
                                  Vencido
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded bg-[#1E202B] text-[#92929F] border border-[#2B2D3D] text-[10px] font-bold">
                                  {c.status}
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-4 text-[#92929F]">
                              {c.expires_at || '-'}
                            </td>
                            <td className="py-2.5 px-4">
                              {hasPrice ? (
                                <span className="px-2 py-0.5 rounded bg-[#50CD89]/15 text-[#50CD89] border border-[#50CD89]/30 font-mono font-bold text-xs inline-flex items-center gap-1">
                                  {price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded bg-[#1E202B] text-[#92929F] border border-[#2B2D3D] font-mono font-bold text-xs inline-flex items-center gap-1" title="Valor mensal fixo padrão">
                                  R$ 0,00
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-4 text-right">
                              <button
                                onClick={() => setEditingCustomer(c)}
                                className="px-2 py-1 rounded bg-[#232530] hover:bg-[#2B2D3D] text-[#92929F] hover:text-white text-[11px] font-medium border border-[#2B2D3D] transition-all inline-flex items-center gap-1 cursor-pointer"
                                title="Editar valor da assinatura deste cliente"
                              >
                                <Edit2 className="w-3 h-3 opacity-70" />
                                <span>Alterar Valor</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-[#1E202B] bg-[#161722] flex items-center justify-between text-xs text-[#92929F]">
          <div>
            Total de {directCustomers.length} clientes na carteira direta.
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-[#009EF7] hover:bg-[#0086D1] text-white font-semibold transition-all cursor-pointer"
          >
            Fechar Resumo
          </button>
        </div>
      </div>

      {/* Edit Customer Modal when altering price directly */}
      {editingCustomer && (
        <EditCustomerModal
          isOpen={true}
          customer={editingCustomer}
          onClose={() => setEditingCustomer(null)}
        />
      )}
    </div>
  );
};
