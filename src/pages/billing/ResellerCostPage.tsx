import React, { useState } from 'react';
import { useSigmaStore } from '../../store/SigmaStore';
import { isDirectCustomer, getCustomerPrice, isCustomerActiveForBilling, getCustomerPartnerApps } from '../../utils/customerMetrics';
import { DollarSign, Users, TrendingUp, Info, AlertCircle, Smartphone, Layers, UserCheck } from 'lucide-react';

export const ResellerCostPage: React.FC = () => {
  const { profile, customers, resellerPricings } = useSigmaStore();
  const [viewScope, setViewScope] = useState<'DIRECT' | 'NETWORK'>('DIRECT');

  // Custo mensal REAL vindo da API do usuário logado ou da tabela de precificação do Master
  const myUsername = (profile?.username || '').toLowerCase();
  const pricingConfig = resellerPricings[myUsername];
  const monthlyCost = Number(pricingConfig?.fixed_monthly_cost || (profile as any)?.monthly_cost || (profile as any)?.custo_mensal || 0);

  const myDirectCustomers = customers.filter(c => isDirectCustomer(c, profile));
  const myNetworkCustomers = customers;
  const hasSubClients = myNetworkCustomers.length > myDirectCustomers.length;

  const displayedCustomers = (viewScope === 'DIRECT' || !hasSubClients) ? myDirectCustomers : myNetworkCustomers;

  // Apenas clientes ATIVOS (não vencidos) entram na receita ativa da revenda
  const activeDisplayed = displayedCustomers.filter(c => isCustomerActiveForBilling(c));
  const totalRevenue = activeDisplayed.reduce((sum, c: any) => sum + getCustomerPrice(c), 0);
  const activeCount = activeDisplayed.length;
  const netMargin = totalRevenue - monthlyCost;

  // Total de aplicativos parceiros na carteira selecionada
  const partnerAppsCount = displayedCustomers.reduce((acc, c) => acc + getCustomerPartnerApps(c).length, 0);

  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <div className="space-y-6 select-none">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Custo & Receita Operacional</h1>
          <p className="text-xs text-[#92929F] mt-1">
            Acompanhamento financeiro real da sua carteira de clientes sincronizado diretamente com o servidor.
          </p>
        </div>

        {hasSubClients && (
          <div className="flex items-center gap-1 bg-[#1A1C24] p-1 rounded-lg border border-[#232530] shrink-0 self-start sm:self-auto">
            <button
              onClick={() => setViewScope('DIRECT')}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                viewScope === 'DIRECT'
                  ? 'bg-[#009EF7] text-white shadow-xs'
                  : 'text-[#92929F] hover:text-white'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Diretos ({myDirectCustomers.length})</span>
            </button>
            <button
              onClick={() => setViewScope('NETWORK')}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                viewScope === 'NETWORK'
                  ? 'bg-[#009EF7] text-white shadow-xs'
                  : 'text-[#92929F] hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Toda a Rede ({myNetworkCustomers.length})</span>
            </button>
          </div>
        )}
      </div>

      {/* Cards Financeiros */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        <div className="bg-[#14151C] border border-[#1E202B] rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2 text-[#F1416C]">
            <DollarSign className="w-4 h-4" />
            <span className="text-[11px] font-bold uppercase tracking-wider">Custo Fixo Mensal</span>
          </div>
          <div className="text-2xl font-black text-white font-mono">{fmt(monthlyCost)}</div>
          <p className="text-[10px] text-[#92929F]">Valor mensal definido pelo Master</p>
        </div>

        <div className="bg-[#14151C] border border-[#1E202B] rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2 text-[#50CD89]">
            <TrendingUp className="w-4 h-4" />
            <span className="text-[11px] font-bold uppercase tracking-wider">Receita Ativa</span>
          </div>
          <div className="text-2xl font-black text-white font-mono">{fmt(totalRevenue)}</div>
          <p className="text-[10px] text-[#92929F]">Soma das assinaturas de clientes ativos</p>
        </div>

        <div className="bg-[#14151C] border border-[#1E202B] rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2 text-[#009EF7]">
            <Users className="w-4 h-4" />
            <span className="text-[11px] font-bold uppercase tracking-wider">Clientes Ativos</span>
          </div>
          <div className="text-2xl font-black text-white font-mono">{activeCount}</div>
          <p className="text-[10px] text-[#92929F]">{displayedCustomers.length} total na carteira</p>
        </div>

        <div className="bg-[#14151C] border border-[#1E202B] rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2 text-[#FF9900]">
            <Smartphone className="w-4 h-4" />
            <span className="text-[11px] font-bold uppercase tracking-wider">Apps Parceiros</span>
          </div>
          <div className="text-2xl font-black text-white font-mono">{partnerAppsCount}</div>
          <p className="text-[10px] text-[#92929F]">MaxPlayer + GerenciaApp vinculados</p>
        </div>

        <div className={`bg-[#14151C] border rounded-xl p-4 space-y-2 ${netMargin >= 0 ? 'border-[#50CD89]/30' : 'border-[#F1416C]/30'}`}>
          <div className={`flex items-center gap-2 ${netMargin >= 0 ? 'text-[#50CD89]' : 'text-[#F1416C]'}`}>
            <TrendingUp className="w-4 h-4" />
            <span className="text-[11px] font-bold uppercase tracking-wider">Lucro Estimado</span>
          </div>
          <div className={`text-2xl font-black font-mono ${netMargin >= 0 ? 'text-[#50CD89]' : 'text-[#F1416C]'}`}>
            {fmt(netMargin)}
          </div>
          <p className="text-[10px] text-[#92929F]">Receita Bruta − Custo Fixo</p>
        </div>
      </div>

      {/* Detalhamento por Cliente */}
      <div className="bg-[#14151C] border border-[#1E202B] rounded-xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-white">
            {viewScope === 'DIRECT' ? 'Detalhamento dos Clientes Diretos' : 'Detalhamento da Rede Completa (Diretos + Sub-Revendas)'} & Mensalidades
          </h2>
          <span className="text-xs text-[#92929F] font-mono">{displayedCustomers.length} clientes</span>
        </div>
        {displayedCustomers.length === 0 ? (
          <p className="text-xs text-[#92929F]">Nenhum cliente cadastrado nesta carteira.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#1E202B] text-[#92929F] uppercase tracking-wider text-[10px]">
                  <th className="py-2.5 px-3">Cliente / Login</th>
                  {viewScope === 'NETWORK' && hasSubClients && <th className="py-2.5 px-3">Revendedor / Dono</th>}
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">App Parceiro</th>
                  <th className="py-2.5 px-3">Vencimento</th>
                  <th className="py-2.5 px-3 text-right">Valor Mensal (R$)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1E202B]/60">
                {displayedCustomers.map((c) => {
                  const pApps = getCustomerPartnerApps(c);
                  return (
                    <tr key={c.id} className="hover:bg-[#16171F]">
                      <td className="py-2.5 px-3 font-medium text-white font-mono">
                        <div>{c.username}</div>
                        {c.name && c.name !== c.username && <div className="text-[10px] text-[#92929F] font-sans">{c.name}</div>}
                      </td>
                      {viewScope === 'NETWORK' && hasSubClients && (
                        <td className="py-2.5 px-3 text-[#009EF7] font-mono">
                          {c.dono || c.reseller_username || '-'}
                        </td>
                      )}
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          c.status === 'ACTIVE' ? 'bg-[#50CD89]/15 text-[#50CD89]' : 'bg-[#F1416C]/15 text-[#F1416C]'
                        }`}>
                          {c.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        {pApps.length > 0 ? (
                          <div className="flex items-center gap-1 flex-wrap">
                            {pApps.map((pa, paIdx) => (
                              <span
                                key={pa.mac || paIdx}
                                className={`px-1.5 py-0.2 rounded text-[10px] font-semibold border ${
                                  pa.is_client_active
                                    ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                                    : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                                }`}
                                title={pa.mac ? `MAC: ${pa.mac}` : (pa.app_user ? `Usuário: ${pa.app_user}` : undefined)}
                              >
                                {pa.app_name}
                                {pa.mac && <span className="font-mono text-[9px] opacity-70 ml-1">{pa.mac.slice(-5)}</span>}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[#5E6278]">-</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-[#92929F]">{c.expires_at || '-'}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-[#50CD89]">
                        {fmt(getCustomerPrice(c))}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-[#14151C] border border-[#232530] rounded-xl p-4 flex items-start gap-3">
        <Info className="w-4 h-4 text-[#009EF7] shrink-0 mt-0.5" />
        <div className="text-xs text-[#92929F]">
          <p className="font-semibold text-white mb-1">Como personalizar o valor de cada cliente?</p>
          <p>Para alterar o valor da mensalidade de qualquer cliente, acesse o menu <strong>Clientes & Testes</strong> e clique no botão <strong>Editar</strong> em cada cliente.</p>
        </div>
      </div>
    </div>
  );
};
