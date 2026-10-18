import React, { useState } from 'react';
import { HierarchyNode } from '../../services/apiService';
import {
  ChevronRight,
  ChevronDown,
  Users,
  Coins,
  Key,
  Ban,
  ShieldCheck,
  Crown,
  UserCheck,
  Layers,
  DollarSign,
  Receipt,
  Trash2,
  Bot,
  RotateCw
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useSigmaStore } from '../../store/SigmaStore';

interface HierarchyNodeItemProps {
  node: HierarchyNode;
  onTransferCredits: (node: HierarchyNode) => void;
  onManageApiKeys: (node: HierarchyNode) => void;
  onToggleBlock: (node: HierarchyNode) => void;
  onConfigurePricing?: (node: HierarchyNode) => void;
  onViewInvoice?: (node: HierarchyNode) => void;
  onDeleteReseller?: (node: HierarchyNode) => void;
}

export const HierarchyNodeItem: React.FC<HierarchyNodeItemProps> = ({
  node,
  onTransferCredits,
  onManageApiKeys,
  onToggleBlock,
  onConfigurePricing,
  onViewInvoice,
  onDeleteReseller
}) => {
  const { calculateResellerInvoice, profile, setResellerBotAccess } = useSigmaStore();
  const [isExpanded, setIsExpanded] = useState(true);
  const [togglingBot, setTogglingBot] = useState(false);

  const hasChildren = Array.isArray(node.sub_revendas) && node.sub_revendas.length > 0;
  const isDirectAdmin = node.nivel === 0 && (node.role === 'admin' || profile?.role === 'master');
  const isSelf = (node.username || '').toLowerCase() === (profile?.username || '').toLowerCase();
  const isMasterAccount = profile?.role === 'master' || (profile?.username || '').toLowerCase() === 'admin';

  const getNivelBadge = (nivel: number) => {
    if (node.role === 'admin') {
      return {
        label: 'Master Admin (Nível 0)',
        bg: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
        icon: <Crown className="w-3 h-3 text-amber-400" />
      };
    }
    if (isSelf) {
      return {
        label: isMasterAccount ? 'Master Admin (Titular)' : 'Sua Conta (Titular)',
        bg: isMasterAccount ? 'bg-amber-500/15 text-amber-400 border-amber-500/30' : 'bg-[#009EF7]/15 text-[#009EF7] border-[#009EF7]/30',
        icon: isMasterAccount ? <Crown className="w-3 h-3 text-amber-400" /> : <UserCheck className="w-3 h-3 text-[#009EF7]" />
      };
    }
    switch (nivel) {
      case 0:
        return {
          label: isMasterAccount ? 'Master Admin (Nível 0)' : 'Minha Revenda (Raiz)',
          bg: isMasterAccount ? 'bg-amber-500/15 text-amber-400 border-amber-500/30' : 'bg-[#009EF7]/15 text-[#009EF7] border-[#009EF7]/30',
          icon: isMasterAccount ? <Crown className="w-3 h-3 text-amber-400" /> : <UserCheck className="w-3 h-3 text-[#009EF7]" />
        };
      case 1:
        return {
          label: isMasterAccount ? 'Revenda Direta (Nível 1)' : 'Sub-Revenda Direta (Nível 1)',
          bg: 'bg-[#009EF7]/15 text-[#009EF7] border-[#009EF7]/30',
          icon: <UserCheck className="w-3 h-3 text-[#009EF7]" />
        };
      case 2:
        return {
          label: 'Sub-Revenda (Nível 2)',
          bg: 'bg-[#50CD89]/15 text-[#50CD89] border-[#50CD89]/30',
          icon: <Layers className="w-3 h-3 text-[#50CD89]" />
        };
      default:
        return {
          label: `Sub-Revenda (Nível ${nivel})`,
          bg: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
          icon: <Layers className="w-3 h-3 text-purple-400" />
        };
    }
  };

  const badge = getNivelBadge(node.nivel);

  return (
    <div className="relative">
      {/* Node Card */}
      <div className={`p-4 bg-[#14151C] border border-[#1E202B] rounded-2xl hover:border-[#009EF7]/40 transition-all ${
        node.status === 'suspended' || node.status === 'blocked' ? 'opacity-70 bg-[#14151C]/70' : ''
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Left Info */}
          <div className="flex items-start gap-3 min-w-0">
            {hasChildren ? (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-1.5 rounded-lg bg-[#1A1C24] hover:bg-[#232530] text-[#92929F] hover:text-white transition-all shrink-0 mt-0.5"
                title={isExpanded ? 'Recolher ramos' : 'Expandir ramos'}
              >
                {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>
            ) : (
              <div className="w-7 h-7 rounded-lg bg-[#1A1C24] flex items-center justify-center text-[#5E6278] shrink-0 mt-0.5">
                <span className="text-xs font-mono">•</span>
              </div>
            )}

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-white font-mono text-sm">{node.username}</span>
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border flex items-center gap-1 ${badge.bg}`}>
                  {badge.icon}
                  <span>{badge.label}</span>
                </span>
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                  node.status === 'active' || node.status === 'ACTIVE'
                    ? 'bg-[#50CD89]/15 text-[#50CD89] border-[#50CD89]/30'
                    : 'bg-[#F1416C]/15 text-[#F1416C] border-[#F1416C]/30'
                }`}>
                  {node.status === 'active' || node.status === 'ACTIVE' ? 'ATIVO' : 'SUSPENSO'}
                </span>
                {node.creditos_ilimitados && node.role !== 'admin' && (
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold border bg-purple-500/15 text-purple-300 border-purple-500/30 flex items-center gap-1 shadow-sm">
                    <span className="text-xs leading-none">∞</span> Ilimitado
                  </span>
                )}
                {node.role !== 'admin' && (
                  <button
                    type="button"
                    disabled={togglingBot}
                    onClick={async (e) => {
                      e.stopPropagation();
                      setTogglingBot(true);
                      try {
                        const cur = Boolean(node.botAccess ?? (node as any).bot_access);
                        const cr = Number(node.botMonthlyCredits ?? (node as any).bot_monthly_credits ?? 0);
                        await setResellerBotAccess(node.username || node.id, !cur, cr);
                      } finally {
                        setTogglingBot(false);
                      }
                    }}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold border flex items-center gap-1 transition-all cursor-pointer hover:scale-105 active:scale-95 disabled:opacity-50 select-none ${
                      Boolean(node.botAccess ?? (node as any).bot_access)
                        ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25 shadow-sm'
                        : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:bg-zinc-700 hover:text-zinc-200'
                    }`}
                    title={
                      togglingBot
                        ? 'Atualizando permissão do bot...'
                        : Boolean(node.botAccess ?? (node as any).bot_access)
                        ? `Bot WhatsApp Liberado${Number(node.botMonthlyCredits ?? (node as any).bot_monthly_credits ?? 0) > 0 ? ` (${node.botMonthlyCredits ?? (node as any).bot_monthly_credits} cr/mês)` : ' (Grátis)'} • Clique para Desativar`
                        : 'Bot WhatsApp Bloqueado • Clique para Ativar'
                    }
                  >
                    {togglingBot ? (
                      <RotateCw className="w-3 h-3 animate-spin text-emerald-400" />
                    ) : (
                      <Bot className="w-3 h-3" />
                    )}
                    <span>
                      {Boolean(node.botAccess ?? (node as any).bot_access)
                        ? `Bot Ativo${Number(node.botMonthlyCredits ?? (node as any).bot_monthly_credits ?? 0) > 0 ? ` (${node.botMonthlyCredits ?? (node as any).bot_monthly_credits} cr)` : ''}`
                        : 'Bot Off'}
                    </span>
                  </button>
                )}
              </div>

              {node.name && node.name !== node.username && (
                <p className="text-xs text-[#92929F] truncate mt-0.5">{node.name}</p>
              )}

              {/* Linhagem */}
              {Array.isArray(node.linhagem) && node.linhagem.length > 1 && (
                <div className="text-[11px] text-[#5E6278] font-mono mt-1 flex items-center gap-1 truncate">
                  <span>Linhagem:</span>
                  <span className="text-[#92929F]">{node.linhagem.join(' ➔ ')}</span>
                </div>
              )}
            </div>
          </div>

          {/* Right Metrics & Quick Actions */}
          <div className="flex items-center gap-2 flex-wrap sm:justify-end">
            {/* Credits Counter */}
            <div className={`px-3 py-1 rounded-xl text-center border ${
              node.creditos_ilimitados
                ? 'bg-purple-500/10 border-purple-500/30'
                : 'bg-[#1A1C24] border-[#232530]'
            }`}>
              <span className={`text-[9px] block uppercase font-semibold ${
                node.creditos_ilimitados ? 'text-purple-300' : 'text-[#92929F]'
              }`}>Créditos</span>
              <span className={`font-bold font-mono text-xs ${
                node.creditos_ilimitados ? 'text-purple-400 font-black' : 'text-[#50CD89]'
              }`}>
                {node.creditos_ilimitados ? '∞ Ilimitado' : `${node.creditos !== undefined ? node.creditos : 0} cr`}
              </span>
            </div>

            {/* Direct Clients Link */}
            <Link
              to={`/customers?reseller=${encodeURIComponent(node.username)}`}
              className="px-3 py-1 bg-[#1A1C24] hover:bg-[#009EF7]/15 border border-[#232530] hover:border-[#009EF7]/30 rounded-xl text-center transition-all group/link"
              title="Ver clientes deste revendedor"
            >
              <span className="text-[9px] text-[#92929F] block uppercase font-semibold">Clientes</span>
              <span className="text-[#009EF7] font-bold font-mono text-xs flex items-center justify-center gap-1">
                <Users className="w-3 h-3" />
                <span>{node.total_clientes_diretos !== undefined ? node.total_clientes_diretos : ((node as any).stats?.total_clientes || (node as any).total_clientes || node.clientes_diretos?.length || 0)}</span>
              </span>
            </Link>

            {/* Sub-resellers count badge */}
            {((node.total_sub_revendas !== undefined ? node.total_sub_revendas : ((node as any).stats?.total_sub_revendas || (node as any).sub_revendas_filhas || node.sub_revendas?.length || 0)) > 0) && (
              <div className="px-3 py-1 bg-[#1A1C24] border border-[#232530] rounded-xl text-center">
                <span className="text-[9px] text-[#92929F] block uppercase font-semibold">Rede</span>
                <span className="text-purple-400 font-bold font-mono text-xs">
                  {node.total_sub_revendas !== undefined ? node.total_sub_revendas : ((node as any).stats?.total_sub_revendas || (node as any).sub_revendas_filhas || node.sub_revendas?.length || 0)} sub
                </span>
              </div>
            )}

            {/* Invoice Pill */}
            {!isDirectAdmin && (() => {
              const inv = calculateResellerInvoice(node.username);
              return (
                <div className="px-3 py-1 bg-[#1A1C24] border border-[#50CD89]/30 rounded-xl text-center">
                  <span className="text-[9px] text-[#92929F] block uppercase font-semibold">Fatura</span>
                  <span className="text-[#50CD89] font-bold font-mono text-xs">
                    R$ {inv.total_amount.toFixed(2).replace('.', ',')}
                  </span>
                </div>
              );
            })()}

            {/* Action Buttons */}
            {!isDirectAdmin && (
              <div className="flex items-center gap-1.5 ml-1">
                {onViewInvoice && (
                  <button
                    onClick={() => onViewInvoice(node)}
                    className="px-2.5 py-1.5 rounded-xl bg-[#009EF7]/15 hover:bg-[#009EF7] text-[#009EF7] hover:text-white border border-[#009EF7]/30 text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer"
                    title="Ver Fatura / Extrato"
                  >
                    <Receipt className="w-3.5 h-3.5" />
                    <span className="hidden md:inline">Fatura</span>
                  </button>
                )}

                {onConfigurePricing && (
                  <button
                    onClick={() => onConfigurePricing(node)}
                    className="p-1.5 rounded-xl bg-[#1A1C24] hover:bg-[#232530] text-[#50CD89] hover:text-white border border-[#232530] transition-all cursor-pointer"
                    title="Ajustar Preços e Valores"
                  >
                    <DollarSign className="w-3.5 h-3.5" />
                  </button>
                )}

                <button
                  onClick={() => onTransferCredits(node)}
                  className="px-2.5 py-1.5 rounded-xl bg-[#50CD89]/15 hover:bg-[#50CD89] text-[#50CD89] hover:text-white border border-[#50CD89]/30 text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer"
                  title="Transferir ou estornar créditos"
                >
                  <Coins className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Créditos</span>
                </button>

                <button
                  onClick={() => onManageApiKeys(node)}
                  className="px-2.5 py-1.5 rounded-xl bg-[#009EF7]/15 hover:bg-[#009EF7] text-[#009EF7] hover:text-white border border-[#009EF7]/30 text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer"
                  title="Gerenciar Chaves de API para bots"
                >
                  <Key className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Chaves API</span>
                </button>

                <button
                  onClick={() => onToggleBlock(node)}
                  className="p-1.5 rounded-xl bg-[#1A1C24] hover:bg-[#232530] text-[#92929F] hover:text-white border border-[#232530] transition-all cursor-pointer"
                  title={node.status === 'active' || node.status === 'ACTIVE' ? 'Bloquear sub-revenda' : 'Desbloquear sub-revenda'}
                >
                  {node.status === 'active' || node.status === 'ACTIVE' ? (
                    <Ban className="w-3.5 h-3.5 text-amber-400" />
                  ) : (
                    <ShieldCheck className="w-3.5 h-3.5 text-[#50CD89]" />
                  )}
                </button>

                {onDeleteReseller && !isSelf && !isDirectAdmin && (
                  <button
                    onClick={() => onDeleteReseller(node)}
                    className="p-1.5 rounded-xl bg-[#1A1C24] hover:bg-[#F1416C]/20 text-[#92929F] hover:text-[#F1416C] border border-[#232530] hover:border-[#F1416C]/30 transition-all cursor-pointer"
                    title="Excluir revenda permanentemente"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Children Nodes (Recursive Sub-Resellers) */}
      {hasChildren && isExpanded && (
        <div className="pl-4 sm:pl-8 mt-3 space-y-3 border-l-2 border-[#1E202B]/80 ml-3.5 relative">
          {node.sub_revendas!.map((child) => (
            <HierarchyNodeItem
              key={child.id || child.username}
              node={child}
              onTransferCredits={onTransferCredits}
              onManageApiKeys={onManageApiKeys}
              onToggleBlock={onToggleBlock}
              onConfigurePricing={onConfigurePricing}
              onViewInvoice={onViewInvoice}
              onDeleteReseller={onDeleteReseller}
            />
          ))}
        </div>
      )}
    </div>
  );
};
