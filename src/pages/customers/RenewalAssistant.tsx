import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useSigmaStore } from '../../store/SigmaStore';
import { isDirectCustomer, getCustomerPrice, parseExpiryDate, isExpiringSoon } from '../../utils/customerMetrics';
import { RefreshCw, Send, MessageCircle, Clock, CheckCircle2, AlertTriangle, Calendar, CalendarPlus, Filter, Sparkles, Check, ShieldAlert } from 'lucide-react';
import { BulkRenewModal } from '../../components/modals/BulkRenewModal';

export const RenewalAssistant: React.FC = () => {
  const { customers, profile, refreshLiveData, isLoadingLive, globalBillingSettings } = useSigmaStore();
  const location = useLocation();
  const urlParams = new URLSearchParams(location.search);
  const initialScope = urlParams.get('scope') === 'ALL' ? 'ALL' : 'DIRECT';

  const [scope, setScope] = useState<'DIRECT' | 'ALL'>(initialScope);
  const [filterPeriod, setFilterPeriod] = useState<'3days' | '7days' | 'expired' | 'all'>('7days');
  const [messageTemplate, setMessageTemplate] = useState(() => {
    const pixPart = globalBillingSettings?.pix_key ? `\n\n🔑 *PIX:* ${globalBillingSettings.pix_key}` : '';
    return `Olá {nome}, tudo bem?\n\nPassando para avisar que seu plano vence no dia *{vencimento}*.\n\n🔗 *Renove seu acesso instantaneamente pelo link:*\n{link_renovacao}\n\n(Ou responda a esta mensagem caso precise de suporte)${pixPart}`;
  });
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [sentSuccess, setSentSuccess] = useState(false);
  const [bulkRenewOpen, setBulkRenewOpen] = useState(false);

  // Separação de carteira direta vs clientes de revendas
  const directCustomers = customers.filter(c => isDirectCustomer(c, profile));
  const baseCustomers = scope === 'DIRECT' ? directCustomers : customers;

  const selectedCustomersForRenew = React.useMemo(() => {
    return customers.filter(c => selectedIds.includes(c.id));
  }, [customers, selectedIds]);

  const activeInScope = baseCustomers.filter(c => c.status === 'ACTIVE');
  const expiredInScope = baseCustomers.filter(c => c.status === 'EXPIRED' || (parseExpiryDate(c) !== null && parseExpiryDate(c)!.getTime() < Date.now()));

  const filteredCustomers = baseCustomers.filter((c) => {
    if (filterPeriod === 'expired') {
      return c.status === 'EXPIRED' || (parseExpiryDate(c) !== null && parseExpiryDate(c)!.getTime() < Date.now());
    }
    if (filterPeriod === '3days') {
      return isExpiringSoon(c, 3);
    }
    if (filterPeriod === '7days') {
      return isExpiringSoon(c, 7);
    }
    return true;
  });

  // Total a receber projetado (apenas carteira direta)
  const directActiveRevenue = directCustomers
    .filter(c => c.status === 'ACTIVE')
    .reduce((sum, c) => sum + getCustomerPrice(c), 0);
  const totalProjected = directActiveRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
  const retentionPct = baseCustomers.length > 0 ? Math.round((activeInScope.length / baseCustomers.length) * 100) : 100;

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredCustomers.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredCustomers.map((c) => c.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSendSingle = (customer: any) => {
    const renewLink = `${window.location.origin}/#/renew/${customer.username}`;
    const text = messageTemplate
      .replace('{nome}', customer.username)
      .replace('{vencimento}', customer.expires_at || 'Em breve')
      .replace('{plano}', customer.package_name || 'Plano VIP')
      .replace('{link_renovacao}', renewLink);
    const phone = (customer.whatsapp || '').replace(/\D/g, '');
    const url = phone ? `https://wa.me/${phone}?text=${encodeURIComponent(text)}` : `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleSendBulk = () => {
    setSentSuccess(true);
    setTimeout(() => setSentSuccess(false), 3500);
  };

  return (
    <div className="space-y-6 select-none">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-white tracking-tight">Assistente de Renovação WhatsApp</h1>
            <span className="bg-[#50CD89]/15 text-[#50CD89] border border-[#50CD89]/30 text-[10px] font-bold px-2 py-0.5 rounded">
              Servidor Ativo
            </span>
          </div>
          <p className="text-xs text-[#92929F] mt-1">
            Cobrança preventiva e mensagens de renovação para sua carteira direta ({directCustomers.length} clientes diretos).
          </p>
        </div>

        {/* Action Buttons & Scope Toggle */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Scope Selector */}
          <div className="flex items-center bg-[#14151C] p-1 rounded-lg border border-[#1E202B]">
            <button
              onClick={() => setScope('DIRECT')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                scope === 'DIRECT' ? 'bg-[#009EF7] text-white shadow-sm' : 'text-[#92929F] hover:text-white'
              }`}
            >
              Carteira Direta ({directCustomers.length})
            </button>
            <button
              onClick={() => setScope('ALL')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                scope === 'ALL' ? 'bg-[#009EF7] text-white shadow-sm' : 'text-[#92929F] hover:text-white'
              }`}
            >
              Toda a Rede ({customers.length})
            </button>
          </div>

          <button
            onClick={() => refreshLiveData()}
            disabled={isLoadingLive}
            className="p-2.5 bg-[#14151C] hover:bg-[#1E202B] border border-[#1E202B] rounded-lg text-[#92929F] hover:text-white transition-all disabled:opacity-50"
            title="Atualizar lista"
          >
            <RefreshCw className={`w-4 h-4 ${isLoadingLive ? 'animate-spin text-[#009EF7]' : ''}`} />
          </button>

          <button
            onClick={() => setBulkRenewOpen(true)}
            disabled={selectedIds.length === 0}
            className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white text-xs font-bold px-3.5 py-2.5 rounded-lg transition-all shadow-md shadow-amber-500/20 cursor-pointer"
            title="Renovar contas selecionadas debitando créditos"
          >
            <CalendarPlus className="w-3.5 h-3.5" />
            <span>Renovar Selecionados ({selectedIds.length})</span>
          </button>

          <button
            onClick={handleSendBulk}
            disabled={selectedIds.length === 0}
            className="flex items-center gap-2 bg-[#50CD89] hover:bg-[#47be7d] disabled:opacity-40 text-white text-xs font-semibold px-4 py-2.5 rounded-lg transition-all shadow-md shadow-emerald-500/20"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Disparar para Selecionados ({selectedIds.length})</span>
          </button>
        </div>
      </div>

      {scope === 'ALL' && (
        <div className="p-3 bg-[#FFA800]/10 border border-[#FFA800]/30 rounded-xl text-xs text-[#FFA800] flex items-center gap-2.5">
          <ShieldAlert className="w-4 h-4 shrink-0 text-[#FFA800]" />
          <span>
            <strong>Aviso de Isolamento:</strong> Clientes de sub-revendas pertencem a parceiros com preços e condições próprias. Para evitar atritos e respeitar a hierarquia comercial, envie cobranças apenas para sua <strong>Carteira Direta</strong>.
          </span>
        </div>
      )}

      {sentSuccess && (
        <div className="p-4 bg-[#50CD89]/10 border border-[#50CD89]/30 rounded-xl text-xs text-[#50CD89] flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{selectedIds.length} mensagem(ns) de lembrete preparadas para envio via WhatsApp!</span>
        </div>
      )}

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#14151C] border border-[#1E202B] rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#92929F] font-medium">Clientes Ativos (Diretos)</span>
            <Clock className="w-4 h-4 text-[#009EF7]" />
          </div>
          <div className="text-2xl font-bold text-white mt-2">{directCustomers.filter(c => c.status === 'ACTIVE').length}</div>
          <div className="text-[11px] text-[#50CD89] mt-1">R$ {totalProjected} a receber da carteira</div>
        </div>

        <div className="bg-[#14151C] border border-[#1E202B] rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#92929F] font-medium">Já Expirados (Diretos)</span>
            <AlertTriangle className="w-4 h-4 text-[#F1416C]" />
          </div>
          <div className="text-2xl font-bold text-white mt-2">{directCustomers.filter(c => c.status === 'EXPIRED').length}</div>
          <div className="text-[11px] text-[#F1416C] mt-1">Oportunidade de Reativação</div>
        </div>

        <div className="bg-[#14151C] border border-[#1E202B] rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#92929F] font-medium">Total Carteira Direta</span>
            <Calendar className="w-4 h-4 text-[#FF9900]" />
          </div>
          <div className="text-2xl font-bold text-white mt-2">{directCustomers.length}</div>
          <div className="text-[11px] text-[#92929F] mt-1">Exclui {customers.length - directCustomers.length} de revendas</div>
        </div>

        <div className="bg-[#14151C] border border-[#1E202B] rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#92929F] font-medium">Taxa de Renovação</span>
            <Sparkles className="w-4 h-4 text-[#50CD89]" />
          </div>
          <div className="text-2xl font-bold text-[#50CD89] mt-2">{retentionPct}%</div>
          <div className="text-[11px] text-[#92929F] mt-1">Retenção da base direta</div>
        </div>
      </div>

      {/* Grid: Template on left, Table on right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Template Editor */}
        <div className="bg-[#14151C] border border-[#1E202B] rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-[#1E202B] pb-3">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-[#50CD89]" />
              <span>Modelo da Mensagem WhatsApp</span>
            </h2>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#92929F] mb-1.5">
              Texto com Variáveis Dinâmicas
            </label>
            <textarea
              rows={8}
              value={messageTemplate}
              onChange={(e) => setMessageTemplate(e.target.value)}
              className="w-full bg-[#1A1C24] border border-[#232530] rounded-lg p-3 text-xs text-white placeholder-[#5E6278] focus:outline-none focus:border-[#009EF7] font-mono leading-relaxed"
            />
          </div>

          <div className="bg-[#1A1C24] p-3 rounded-lg border border-[#232530] text-[11px] text-[#92929F] space-y-1">
            <div className="font-bold text-white mb-1">Tags Disponíveis:</div>
            <div><code className="text-[#009EF7]">{'{nome}'}</code> : Nome de usuário do cliente</div>
            <div><code className="text-[#009EF7]">{'{vencimento}'}</code> : Data de validade</div>
            <div><code className="text-[#009EF7]">{'{plano}'}</code> : Nome do pacote</div>
            <div><code className="text-[#50CD89]">{'{link_renovacao}'}</code> : Link PIX automático do cliente</div>
          </div>
        </div>

        {/* Customer List Table */}
        <div className="lg:col-span-2 bg-[#14151C] border border-[#1E202B] rounded-xl p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1E202B] pb-3">
            <h2 className="text-sm font-bold text-white">
              Clientes Filtrados ({filteredCustomers.length})
              {scope === 'DIRECT' && <span className="ml-2 text-xs text-[#009EF7] font-normal">• Carteira Direta</span>}
            </h2>
            <div className="flex items-center gap-1.5">
              {[
                { id: '7days', label: '7 Dias (Próximos)' },
                { id: '3days', label: '3 Dias (Urgente)' },
                { id: 'expired', label: 'Expirados' },
                { id: 'all', label: 'Todos' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setFilterPeriod(tab.id as any)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                    filterPeriod === tab.id
                      ? 'bg-[#009EF7] text-white font-semibold'
                      : 'bg-[#1A1C24] text-[#92929F] hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto max-h-[500px]">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-[#14151C] z-10">
                <tr className="border-b border-[#1E202B] text-[#92929F] text-[11px] uppercase tracking-wider">
                  <th className="py-2.5 px-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.length === filteredCustomers.length && filteredCustomers.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded bg-[#1A1C24] border-[#232530]"
                    />
                  </th>
                  <th className="py-2.5 px-3">Cliente</th>
                  <th className="py-2.5 px-3">Vencimento</th>
                  <th className="py-2.5 px-3">Mensalidade</th>
                  <th className="py-2.5 px-3">WhatsApp</th>
                  <th className="py-2.5 px-3 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1E202B]/60">
                {filteredCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-xs text-[#5E6278]">
                      Nenhum cliente encontrado neste filtro.
                    </td>
                  </tr>
                ) : (
                  filteredCustomers.map((c) => {
                    const isDirect = isDirectCustomer(c, profile);
                    const price = getCustomerPrice(c);
                    return (
                      <tr key={c.id} className="hover:bg-[#1A1C24]/50 transition-colors">
                        <td className="py-3 px-3">
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(c.id)}
                            onChange={() => toggleSelect(c.id)}
                            className="rounded bg-[#1A1C24] border-[#232530]"
                          />
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-semibold text-white font-mono">{c.username}</div>
                          {!isDirect && (
                            <span className="text-[10px] text-[#9C27B0] bg-[#9C27B0]/10 px-1.5 py-0.5 rounded border border-[#9C27B0]/20">
                              Revenda: {c.reseller_username || c.dono || 'Sub'}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-[#92929F]">{c.expires_at}</td>
                        <td className="py-3 px-3">
                          {isDirect ? (
                            price > 0 ? (
                              <span className="font-mono text-xs text-[#50CD89] font-bold">
                                {Number(price).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                              </span>
                            ) : (
                              <span className="font-mono text-xs text-[#92929F]" title="Valor mensal fixo padrão">
                                R$ 00,00
                              </span>
                            )
                          ) : (
                            <span className="text-[11px] text-[#5E6278] italic">Revenda</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-[#50CD89] font-mono">{c.whatsapp || '-'}</td>
                        <td className="py-3 px-3 text-right">
                          <button
                            onClick={() => handleSendSingle(c)}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-semibold transition-all ${
                              isDirect
                                ? 'bg-[#50CD89]/15 text-[#50CD89] hover:bg-[#50CD89] hover:text-white border border-[#50CD89]/30'
                                : 'bg-[#1E202B] text-[#92929F] hover:text-white border border-[#2B2D3D]'
                            }`}
                            title={isDirect ? 'Cobrar via WhatsApp' : 'Cliente de Revenda parceira'}
                          >
                            <Send className="w-3 h-3" />
                            <span>{isDirect ? 'Cobrar' : 'Revenda'}</span>
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

      {/* Modal de Renovação em Massa no Assistente */}
      <BulkRenewModal
        isOpen={bulkRenewOpen}
        selectedCustomers={selectedCustomersForRenew}
        onClose={() => setBulkRenewOpen(false)}
        onComplete={() => {
          setSelectedIds([]);
          refreshLiveData();
        }}
      />
    </div>
  );
};
