
function pruneTreeToUser(rootNode: HierarchyNode, targetUsername: string): HierarchyNode | null {
  if (!rootNode || !targetUsername) return rootNode;
  const target = targetUsername.toLowerCase();

  function search(node: HierarchyNode): HierarchyNode | null {
    if ((node.username || '').toLowerCase() === target) {
      return node;
    }
    for (const child of node.sub_revendas || []) {
      const found = search(child);
      if (found) return found;
    }
    return null;
  }

  const found = search(rootNode);
  if (!found) return null;

  function reindex(node: HierarchyNode, level: number): HierarchyNode {
    return {
      ...node,
      nivel: level,
      sub_revendas: (node.sub_revendas || []).map(child => reindex(child, level + 1))
    };
  }

  return reindex(found, 0);
}
import React, { useState } from 'react';
import { HierarchyNode, HierarchyResponse, normalizeHierarchyResponse } from '../../services/apiService';
import { HierarchyNodeItem } from './HierarchyNodeItem';
import { Network, RefreshCw, Users, Layers, ShieldCheck, Plus } from 'lucide-react';
import { Reseller, UserProfile } from '../../types';
import { Link } from 'react-router-dom';

interface HierarchyTreeProps {
  data: HierarchyResponse | null;
  fallbackResellers?: Reseller[];
  fallbackProfile?: UserProfile;
  isLoading: boolean;
  onRefresh: () => void;
  onTransferCredits: (node: HierarchyNode) => void;
  onManageApiKeys: (node: HierarchyNode) => void;
  onToggleBlock: (node: HierarchyNode) => void;
  onConfigurePricing?: (node: HierarchyNode) => void;
  onViewInvoice?: (node: HierarchyNode) => void;
  onDeleteReseller?: (node: HierarchyNode) => void;
}

export const HierarchyTree: React.FC<HierarchyTreeProps> = ({
  data,
  fallbackResellers,
  fallbackProfile,
  isLoading,
  onRefresh,
  onTransferCredits,
  onManageApiKeys,
  onToggleBlock,
  onConfigurePricing,
  onViewInvoice,
  onDeleteReseller
}) => {
  // Obtém os dados normalizados ou sintetiza a partir dos dados locais da loja
  const effectiveData: HierarchyResponse | null = React.useMemo(() => {
    const currentUser = (fallbackProfile?.username || '').trim().toLowerCase();
    const isRootAdmin = currentUser === 'admin' || currentUser === 'andre2056' || fallbackProfile?.role === 'admin' || (fallbackProfile as any)?.is_admin === true;

    let treeData: HierarchyResponse | null = null;

    if (data) {
      if (data.arvore && !Array.isArray(data.arvore) && data.ator) {
        treeData = data;
      } else {
        treeData = normalizeHierarchyResponse(data, fallbackProfile?.username || 'admin');
      }
    }

    if (!treeData || !treeData.arvore) return null;

    // Se NÃO for o administrador raiz do sistema (ex: franquias como Anderson ou sub-revendedores),
    // a árvore SEMPRE exibe estritamente do usuário logado para baixo!
    if (!isRootAdmin && currentUser) {
      const rootUsername = (treeData.arvore.username || '').toLowerCase();
      if (rootUsername !== currentUser) {
        const pruned = pruneTreeToUser(treeData.arvore, currentUser);
        if (pruned) {
          return {
            ator: {
              id: pruned.id,
              username: pruned.username,
              name: pruned.name,
              role: pruned.role,
              nivel: 0,
              linhagem: pruned.linhagem
            },
            stats_globais: {
              total_revendas: (pruned.sub_revendas || []).length,
              total_clientes: pruned.total_clientes_diretos || 0,
              clientes_ativos: pruned.clientes_ativos_diretos || 0
            },
            arvore: pruned
          };
        } else {
          // Se o usuário ainda não possui subrevendas subordinadas cadastradas na árvore
          return {
            ator: {
              id: fallbackProfile?.id || `usr_${currentUser}`,
              username: fallbackProfile?.username || currentUser,
              name: fallbackProfile?.name || fallbackProfile?.username || currentUser,
              role: fallbackProfile?.role || 'master',
              nivel: 0,
              linhagem: [currentUser]
            },
            stats_globais: {
              total_revendas: 0,
              total_clientes: 0,
              clientes_ativos: 0
            },
            arvore: {
              id: fallbackProfile?.id || `usr_${currentUser}`,
              username: fallbackProfile?.username || currentUser,
              name: fallbackProfile?.name || fallbackProfile?.username || currentUser,
              role: fallbackProfile?.role || 'master',
              nivel: 0,
              status: 'active',
              creditos: fallbackProfile?.credits ?? 0,
              creditos_ilimitados: !!fallbackProfile?.unlimited_credits || !!fallbackProfile?.creditos_ilimitados,
              linhagem: [currentUser],
              total_clientes_diretos: 0,
              clientes_ativos_diretos: 0,
              total_sub_revendas: 0,
              clientes_diretos: [],
              sub_revendas: []
            }
          };
        }
      }
    }

    return treeData;
  }, [data, fallbackProfile]);

  if (isLoading && !effectiveData) {
    return (
      <div className="bg-[#14151C] border border-[#1E202B] rounded-2xl p-12 text-center space-y-3">
        <RefreshCw className="w-8 h-8 text-[#009EF7] animate-spin mx-auto" />
        <p className="text-white text-sm font-semibold">Carregando árvore de hierarquia...</p>
        <p className="text-xs text-[#92929F]">Mapeando revendas, sub-revendas e linhagens em tempo real.</p>
      </div>
    );
  }

  if (!effectiveData || !effectiveData.arvore) {
    return (
      <div className="bg-[#14151C] border border-[#1E202B] rounded-2xl p-12 text-center space-y-3">
        <Network className="w-8 h-8 text-[#5E6278] mx-auto" />
        <p className="text-white text-sm font-semibold">Nenhuma revenda encontrada na rede</p>
        <p className="text-xs text-[#92929F]">Cadastre seu primeiro parceiro para visualizar a árvore hierárquica.</p>
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            onClick={onRefresh}
            className="px-4 py-2 rounded-xl bg-[#1A1C24] hover:bg-[#232530] text-white text-xs font-semibold border border-[#232530] transition-all cursor-pointer"
          >
            Atualizar Dados
          </button>
          <Link
            to="/resellers/add"
            className="px-4 py-2 rounded-xl bg-[#009EF7] hover:bg-[#0095E8] text-white text-xs font-bold transition-all flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Criar Nova Revenda</span>
          </Link>
        </div>
      </div>
    );
  }

  const rootNode = effectiveData.arvore;
  const stats = effectiveData.stats_globais;

  return (
    <div className="space-y-4">
      {/* Global / Network Stats Header */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-[#14151C] border border-[#1E202B] rounded-xl p-3.5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/15 flex items-center justify-center text-purple-400 shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] text-[#92929F] block">Total de Sub-Painéis</span>
              <span className="text-lg font-bold text-white font-mono">{stats.total_revendas || (rootNode.sub_revendas?.length || 0)}</span>
            </div>
          </div>

          <div className="bg-[#14151C] border border-[#1E202B] rounded-xl p-3.5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#009EF7]/15 flex items-center justify-center text-[#009EF7] shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] text-[#92929F] block">Clientes na Rede</span>
              <span className="text-lg font-bold text-white font-mono">{stats.total_clientes || 0}</span>
            </div>
          </div>

          <div className="bg-[#14151C] border border-[#1E202B] rounded-xl p-3.5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#50CD89]/15 flex items-center justify-center text-[#50CD89] shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] text-[#92929F] block">Clientes Ativos</span>
              <span className="text-lg font-bold text-[#50CD89] font-mono">{stats.clientes_ativos || 0}</span>
            </div>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="bg-[#14151C] border border-[#1E202B] rounded-xl p-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-[#92929F]">
          <Network className="w-4 h-4 text-[#009EF7]" />
          <span>Estrutura Hierárquica em Cascata ({rootNode.username} ➔ {rootNode.sub_revendas?.length || 0} revendas conectadas)</span>
        </div>
        <button
          onClick={onRefresh}
          disabled={isLoading}
          className="p-1.5 rounded-lg bg-[#1A1C24] hover:bg-[#232530] text-[#92929F] hover:text-white border border-[#232530] transition-all disabled:opacity-50 flex items-center gap-1.5 text-xs cursor-pointer"
          title="Recarregar hierarquia"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-[#009EF7]' : ''}`} />
          <span className="hidden sm:inline">Atualizar Árvore</span>
        </button>
      </div>

      {/* Recursive Tree Render */}
      <div className="space-y-3">
        <HierarchyNodeItem
          node={rootNode}
          onTransferCredits={onTransferCredits}
          onManageApiKeys={onManageApiKeys}
          onToggleBlock={onToggleBlock}
          onConfigurePricing={onConfigurePricing}
          onViewInvoice={onViewInvoice}
          onDeleteReseller={onDeleteReseller}
        />
      </div>
    </div>
  );
};
