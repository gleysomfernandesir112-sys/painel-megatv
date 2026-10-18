import React from 'react';
import { useSigmaStore } from '../../store/SigmaStore';
import { isDirectCustomer, getCustomerPrice } from '../../utils/customerMetrics';
import { BarChart3, TrendingUp, Users, UserCheck, UserX, Clock, Server, Layers, ShieldCheck, Activity } from 'lucide-react';
import { APP_CONFIG } from '../../config/appConfig';

export const CustomersStatistics: React.FC = () => {
  const { customers, profile } = useSigmaStore();

  const total = customers.length;
  const active = customers.filter(c => c.status === 'ACTIVE').length;
  const expired = customers.filter(c => c.status === 'EXPIRED').length;
  const blocked = customers.filter(c => c.status === 'BLOCKED').length;
  const trials = customers.filter(c => c.is_trial).length;

  const directCustomers = customers.filter(c => isDirectCustomer(c, profile));
  const directActive = directCustomers.filter(c => c.status === 'ACTIVE');
  const directMRR = directActive.reduce((acc, c) => acc + getCustomerPrice(c), 0);

  const retentionRate = total > 0 ? Math.round((active / total) * 100) : 100;
  const churnRate = total > 0 ? Math.round(((expired + blocked) / total) * 100) : 0;
  const mrrValue = directMRR.toLocaleString('pt-BR', { minimumFractionDigits: 2 });

  // Group by servers dynamically
  const serverCounts: Record<string, number> = {};
  customers.forEach(c => {
    const sName = c.server_name || c.server || APP_CONFIG.defaultServerName;
    serverCounts[sName] = (serverCounts[sName] || 0) + 1;
  });

  // Group by packages dynamically
  const packageCounts: Record<string, number> = {};
  customers.forEach(c => {
    const pName = c.package_name || c.package || 'COMPLETO C/ ADULTOS';
    packageCounts[pName] = (packageCounts[pName] || 0) + 1;
  });

  return (
    <div className="space-y-6 select-none">
      <div>
        <h1 className="text-xl font-bold text-white tracking-tight">Estatísticas & Métricas da Base</h1>
        <p className="text-xs text-[#92929F] mt-1">
          Análise analítica em tempo real sincronizada com o servidor ({total} contas processadas).
        </p>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#14151C] border border-[#1E202B] rounded-xl p-4">
          <div className="flex items-center justify-between text-[#92929F] text-xs">
            <span>Total de Contas</span>
            <Users className="w-4 h-4 text-[#009EF7]" />
          </div>
          <div className="text-2xl font-bold text-white mt-2">{total}</div>
          <div className="text-[11px] text-[#50CD89] mt-1">100% sincronizado com a API</div>
        </div>

        <div className="bg-[#14151C] border border-[#1E202B] rounded-xl p-4">
          <div className="flex items-center justify-between text-[#92929F] text-xs">
            <span>Clientes Ativos</span>
            <UserCheck className="w-4 h-4 text-[#50CD89]" />
          </div>
          <div className="text-2xl font-bold text-white mt-2">{active}</div>
          <div className="text-[11px] text-[#50CD89] mt-1">{retentionRate}% de retenção ativa</div>
        </div>

        <div className="bg-[#14151C] border border-[#1E202B] rounded-xl p-4">
          <div className="flex items-center justify-between text-[#92929F] text-xs">
            <span>Testes Rápidos Gerados</span>
            <Clock className="w-4 h-4 text-[#FF9900]" />
          </div>
          <div className="text-2xl font-bold text-white mt-2">{trials}</div>
          <div className="text-[11px] text-[#92929F] mt-1">{trials > 0 ? Math.round((active / trials) * 100) : 100}% taxa de conversão</div>
        </div>

        <div className="bg-[#14151C] border border-[#1E202B] rounded-xl p-4">
          <div className="flex items-center justify-between text-[#92929F] text-xs">
            <span>Taxa de Churn (Expirados)</span>
            <UserX className="w-4 h-4 text-[#F1416C]" />
          </div>
          <div className="text-2xl font-bold text-white mt-2">{churnRate}%</div>
          <div className="text-[11px] text-[#92929F] mt-1">{expired} clientes vencidos</div>
        </div>
      </div>

      {/* Financial Projections Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#14151C] border border-[#1E202B] rounded-xl p-4">
          <div className="text-xs text-[#92929F]">MRR Carteira Direta (Mensal)</div>
          <div className="text-xl font-bold text-[#50CD89] mt-1.5">R$ {mrrValue}</div>
          <div className="text-[11px] text-[#92929F] mt-0.5">Base de {directActive.length} assinaturas diretas ativas</div>
        </div>

        <div className="bg-[#14151C] border border-[#1E202B] rounded-xl p-4">
          <div className="text-xs text-[#92929F]">Saldo de Créditos no Painel</div>
          <div className="text-xl font-bold text-[#009EF7] mt-1.5">{profile.credits} Créditos</div>
          <div className="text-[11px] text-[#92929F] mt-0.5">Disponíveis para criar / renovar</div>
        </div>

        <div className="bg-[#14151C] border border-[#1E202B] rounded-xl p-4">
          <div className="text-xs text-[#92929F]">Conexões Simultâneas Máximas</div>
          <div className="text-xl font-bold text-white mt-1.5">
            {customers.reduce((acc, c) => acc + (c.connections_max || 1), 0)} Telas
          </div>
          <div className="text-[11px] text-[#92929F] mt-0.5">Distribuídas na rede CDN</div>
        </div>
      </div>

      {/* Distribution Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Distribution by Server */}
        <div className="bg-[#14151C] border border-[#1E202B] rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-[#1E202B] pb-3">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Server className="w-4 h-4 text-[#009EF7]" />
              <span>Distribuição por Servidor CDN</span>
            </h2>
            <span className="text-xs text-[#92929F]">{Object.keys(serverCounts).length} Servidor(es)</span>
          </div>

          <div className="space-y-3 pt-1">
            {Object.keys(serverCounts).length === 0 ? (
              <div className="text-xs text-[#5E6278] py-4 text-center">Nenhum cliente cadastrado ainda.</div>
            ) : (
              Object.entries(serverCounts).map(([serverName, count], idx) => {
                const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                return (
                  <div key={serverName}>
                    <div className="flex justify-between text-xs text-[#92929F] mb-1">
                      <span className="text-white font-medium">{serverName}</span>
                      <span className="font-bold text-[#009EF7]">{count} cliente(s) ({pct}%)</span>
                    </div>
                    <div className="w-full bg-[#1A1C24] h-2.5 rounded-full overflow-hidden">
                      <div
                        className="bg-[#009EF7] h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Distribution by Package */}
        <div className="bg-[#14151C] border border-[#1E202B] rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-[#1E202B] pb-3">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#9C27B0]" />
              <span>Distribuição por Pacote / Bouquet</span>
            </h2>
            <span className="text-xs text-[#92929F]">{Object.keys(packageCounts).length} Pacote(s)</span>
          </div>

          <div className="space-y-3 pt-1">
            {Object.keys(packageCounts).length === 0 ? (
              <div className="text-xs text-[#5E6278] py-4 text-center">Nenhum pacote registrado.</div>
            ) : (
              Object.entries(packageCounts).map(([pkgName, count], idx) => {
                const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                const colors = ['bg-[#9C27B0]', 'bg-[#50CD89]', 'bg-[#009EF7]', 'bg-[#FF9900]'];
                const color = colors[idx % colors.length];
                return (
                  <div key={pkgName}>
                    <div className="flex justify-between text-xs text-[#92929F] mb-1">
                      <span className="text-white font-medium">{pkgName}</span>
                      <span className="font-bold text-white">{count} ({pct}%)</span>
                    </div>
                    <div className="w-full bg-[#1A1C24] h-2.5 rounded-full overflow-hidden">
                      <div
                        className={`${color} h-full rounded-full transition-all duration-500`}
                        style={{ width: `${pct}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
