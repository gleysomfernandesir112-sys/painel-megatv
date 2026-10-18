import React, { useState } from 'react';
import {
  Trophy,
  Crown,
  Medal,
  Flame,
  Zap,
  ShieldCheck,
  Rocket,
  TrendingUp,
  Users,
  Award,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Info
} from 'lucide-react';
import { PanelGamificationRanking, ResellerRankingItem } from '../../types';
import { useBrandConfig, APP_CONFIG } from '../../config/appConfig';

interface ResellerRankingTabProps {
  rankingData: PanelGamificationRanking;
  currentUsername?: string;
  onRefresh?: () => void;
  isLoading?: boolean;
}

export const ResellerRankingTab: React.FC<ResellerRankingTabProps> = ({
  rankingData,
  currentUsername = '',
  onRefresh,
  isLoading = false
}) => {
  const brand = useBrandConfig();
  const franchisePrimary = brand.primaryColor || APP_CONFIG.primaryColor || '#009EF7';
  const [showRules, setShowRules] = useState(false);

  const { ranking = [], currentUserRank, panelName, month, totalParticipants } = rankingData;

  const top1 = ranking[0] || null;
  const top2 = ranking[1] || null;
  const top3 = ranking[2] || null;

  const getTierBadge = (tier: string) => {
    switch (tier) {
      case 'master':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-500/15 text-purple-300 border border-purple-500/30 flex items-center gap-1 shadow-xs">
            <Crown className="w-3 h-3 text-purple-400" />
            <span>Master</span>
          </span>
        );
      case 'diamond':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 flex items-center gap-1 shadow-xs">
            <Sparkles className="w-3 h-3 text-cyan-400" />
            <span>Diamante</span>
          </span>
        );
      case 'gold':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1 shadow-xs">
            <Medal className="w-3 h-3 text-amber-400" />
            <span>Ouro</span>
          </span>
        );
      case 'silver':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-300/15 text-slate-200 border border-slate-300/30 flex items-center gap-1 shadow-xs">
            <Medal className="w-3 h-3 text-slate-300" />
            <span>Prata</span>
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-700/15 text-amber-500 border border-amber-700/30 flex items-center gap-1 shadow-xs">
            <Medal className="w-3 h-3 text-amber-600" />
            <span>Bronze</span>
          </span>
        );
    }
  };

  const getBadgeIcon = (iconName: string) => {
    switch (iconName) {
      case 'Flame':
        return <Flame className="w-3 h-3 text-orange-400" />;
      case 'Rocket':
        return <Rocket className="w-3 h-3 text-blue-400" />;
      case 'ShieldCheck':
        return <ShieldCheck className="w-3 h-3 text-emerald-400" />;
      case 'Crown':
        return <Crown className="w-3 h-3 text-amber-400" />;
      case 'Zap':
        return <Zap className="w-3 h-3 text-yellow-400" />;
      default:
        return <Award className="w-3 h-3 text-purple-400" />;
    }
  };

  return (
    <div className="space-y-4 animate-fade-in select-none">
      {/* Header do Ranking */}
      <div className="bg-gradient-to-r from-[#14151C] via-[#161822] to-[#14151C] p-4 sm:p-5 rounded-2xl border border-[#232533] shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0 shadow-lg shadow-amber-500/10">
            <Trophy className="w-6 h-6 text-amber-400 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                Ranking de Revendas
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#009EF7]/15 text-[#009EF7] border border-[#009EF7]/30 uppercase">
                  {panelName}
                </span>
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#232530] text-gray-300 border border-[#2E3140]">
                {month}
              </span>
            </div>
            <p className="text-xs text-[#92929F] mt-0.5">
              Classificação mensal exclusiva dos revendedores do painel {panelName} ({totalParticipants} participantes).
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowRules(!showRules)}
            className="px-3 py-1.5 rounded-xl bg-[#1C1E28] hover:bg-[#232634] text-xs font-semibold text-gray-300 hover:text-white border border-[#2A2D3D] transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Info className="w-3.5 h-3.5 text-amber-400" />
            <span>Regras & Pontuação</span>
            {showRules ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {/* Regras Expansíveis */}
      {showRules && (
        <div className="p-4 bg-[#141620] border border-amber-500/30 rounded-2xl text-xs space-y-3 animate-fade-in shadow-xl">
          <div className="flex items-center gap-2 text-amber-400 font-bold">
            <Award className="w-4 h-4" />
            <span>Como funciona a pontuação e patentes do painel:</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-1">
            <div className="p-2.5 rounded-xl bg-[#191B26] border border-[#262836]">
              <span className="text-[11px] text-gray-400 block font-medium">Novos Clientes (Mês)</span>
              <span className="text-sm font-bold text-emerald-400">+10 Pontos (XP)</span>
              <span className="text-[10px] text-gray-500 block">Por cliente ativado no mês</span>
            </div>
            <div className="p-2.5 rounded-xl bg-[#191B26] border border-[#262836]">
              <span className="text-[11px] text-gray-400 block font-medium">Renovações</span>
              <span className="text-sm font-bold text-blue-400">+5 Pontos (XP)</span>
              <span className="text-[10px] text-gray-500 block">Por cliente renovado no mês</span>
            </div>
            <div className="p-2.5 rounded-xl bg-[#191B26] border border-[#262836]">
              <span className="text-[11px] text-gray-400 block font-medium">Base Ativa</span>
              <span className="text-sm font-bold text-purple-400">+1 Ponto (XP)</span>
              <span className="text-[10px] text-gray-500 block">Por cada cliente ativo</span>
            </div>
            <div className="p-2.5 rounded-xl bg-[#191B26] border border-[#262836]">
              <span className="text-[11px] text-gray-400 block font-medium">Bônus Retenção</span>
              <span className="text-sm font-bold text-amber-400">+50 Pontos Bônus</span>
              <span className="text-[10px] text-gray-500 block">Retenção &gt;= 80% (mín. 5 clientes)</span>
            </div>
          </div>
          <div className="text-[11px] text-gray-400 pt-1 border-t border-[#232533] flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-white">Patentes:</span>
            <span>🥉 Bronze (1-19)</span> •
            <span>🥈 Prata (20-49)</span> •
            <span>🥇 Ouro (50-99)</span> •
            <span>💎 Diamante (100-249)</span> •
            <span>👑 Master (250+)</span>
          </div>
        </div>
      )}

      {/* Card da Sua Posição (Se o revendedor logado estiver no ranking) */}
      {currentUserRank && (
        <div
          className="p-4 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl transition-all"
          style={{
            backgroundColor: 'rgba(0, 158, 247, 0.08)',
            borderColor: `${franchisePrimary}40`
          }}
        >
          <div className="flex items-center gap-3.5">
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center font-black text-sm shrink-0 shadow-md"
              style={{
                backgroundColor: `${franchisePrimary}20`,
                color: franchisePrimary,
                border: `1px solid ${franchisePrimary}50`
              }}
            >
              #{currentUserRank.rank}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-white">Sua Classificação no Painel</span>
                {getTierBadge(currentUserRank.tier)}
                <span className="text-[11px] text-gray-400 font-mono">({currentUserRank.username})</span>
              </div>
              <p className="text-[11px] text-gray-300 mt-0.5">
                Você acumulou <strong className="text-white font-bold">{currentUserRank.xp} XP</strong> este mês com{' '}
                <strong className="text-emerald-400">{currentUserRank.activeClients} clientes ativos</strong> e{' '}
                <strong className="text-blue-400">{currentUserRank.newClientsThisMonth} novas ativações</strong>.
              </p>
            </div>
          </div>

          <div className="w-full md:w-64 space-y-1.5 shrink-0">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-gray-400">Progresso para {currentUserRank.nextTierName || 'Nível Máximo'}</span>
              <span className="font-bold text-white font-mono">{currentUserRank.tierProgress}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-[#1A1C26] overflow-hidden border border-[#262836]">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${currentUserRank.tierProgress}%`,
                  backgroundColor: franchisePrimary
                }}
              />
            </div>
            {currentUserRank.nextTierName && (
              <span className="text-[10px] text-gray-500 block text-right">
                Meta: {currentUserRank.nextTierTarget} clientes ativos
              </span>
            )}
          </div>
        </div>
      )}

      {/* Pódio Visual Top 3 */}
      {ranking.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
          {/* 2º Lugar */}
          {top2 ? (
            <div className="bg-[#14151C] rounded-2xl border border-slate-400/30 p-4 flex flex-col justify-between relative order-2 md:order-1 shadow-lg hover:border-slate-300/50 transition-all">
              <div className="absolute top-3 right-3">
                <div className="w-8 h-8 rounded-full bg-slate-300/15 border border-slate-300/30 flex items-center justify-center font-bold text-slate-200 text-xs">
                  #2
                </div>
              </div>
              <div>
                <div className="w-10 h-10 rounded-xl bg-slate-400/15 border border-slate-400/30 flex items-center justify-center text-slate-200 mb-2.5">
                  <Medal className="w-5 h-5 text-slate-300" />
                </div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-white truncate">{top2.displayName}</h3>
                  {top2.username.toLowerCase() === currentUsername.toLowerCase() && (
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">Você</span>
                  )}
                </div>
                <div className="mt-1">{getTierBadge(top2.tier)}</div>
              </div>
              <div className="mt-4 pt-3 border-t border-[#232533] flex items-center justify-between text-xs">
                <div>
                  <span className="text-[10px] text-gray-400 block">Score</span>
                  <span className="font-bold text-slate-200 font-mono text-sm">{top2.xp} XP</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-gray-400 block">Ativos</span>
                  <span className="font-bold text-emerald-400 font-mono">{top2.activeClients}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="hidden md:block order-1 opacity-40 bg-[#14151C] rounded-2xl border border-[#232533] p-4 text-center py-10 text-xs text-gray-500">
              Vago (#2)
            </div>
          )}

          {/* 1º Lugar (Centro - Destaque Máximo) */}
          {top1 && (
            <div className="bg-gradient-to-b from-[#1E1B15] to-[#14151C] rounded-2xl border-2 border-amber-400/50 p-4.5 flex flex-col justify-between relative order-1 md:order-2 shadow-xl shadow-amber-500/10 scale-102 transition-all">
              <div className="absolute top-3 right-3">
                <div className="w-9 h-9 rounded-full bg-amber-400/25 border-2 border-amber-400/50 flex items-center justify-center font-black text-amber-300 text-sm shadow-md">
                  #1
                </div>
              </div>
              <div>
                <div className="w-12 h-12 rounded-xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-amber-400 mb-2.5 shadow-md shadow-amber-500/20">
                  <Crown className="w-6 h-6 text-amber-400 animate-bounce" />
                </div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-black text-white truncate">{top1.displayName}</h3>
                  {top1.username.toLowerCase() === currentUsername.toLowerCase() && (
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">Você</span>
                  )}
                </div>
                <div className="mt-1 flex items-center gap-1.5">
                  {getTierBadge(top1.tier)}
                  <span className="text-[10px] font-bold text-amber-400 uppercase">Campeão do Mês</span>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-amber-500/20 flex items-center justify-between text-xs">
                <div>
                  <span className="text-[10px] text-amber-300 block font-medium">Pontuação Total</span>
                  <span className="font-black text-amber-400 font-mono text-base">{top1.xp} XP</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-gray-400 block">Clientes Ativos</span>
                  <span className="font-bold text-emerald-400 font-mono text-sm">{top1.activeClients}</span>
                </div>
              </div>
            </div>
          )}

          {/* 3º Lugar */}
          {top3 ? (
            <div className="bg-[#14151C] rounded-2xl border border-amber-700/30 p-4 flex flex-col justify-between relative order-3 shadow-lg hover:border-amber-600/50 transition-all">
              <div className="absolute top-3 right-3">
                <div className="w-8 h-8 rounded-full bg-amber-700/15 border border-amber-700/30 flex items-center justify-center font-bold text-amber-500 text-xs">
                  #3
                </div>
              </div>
              <div>
                <div className="w-10 h-10 rounded-xl bg-amber-700/15 border border-amber-700/30 flex items-center justify-center text-amber-500 mb-2.5">
                  <Medal className="w-5 h-5 text-amber-600" />
                </div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-white truncate">{top3.displayName}</h3>
                  {top3.username.toLowerCase() === currentUsername.toLowerCase() && (
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">Você</span>
                  )}
                </div>
                <div className="mt-1">{getTierBadge(top3.tier)}</div>
              </div>
              <div className="mt-4 pt-3 border-t border-[#232533] flex items-center justify-between text-xs">
                <div>
                  <span className="text-[10px] text-gray-400 block">Score</span>
                  <span className="font-bold text-amber-500 font-mono text-sm">{top3.xp} XP</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-gray-400 block">Ativos</span>
                  <span className="font-bold text-emerald-400 font-mono">{top3.activeClients}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="hidden md:block order-3 opacity-40 bg-[#14151C] rounded-2xl border border-[#232533] p-4 text-center py-10 text-xs text-gray-500">
              Vago (#3)
            </div>
          )}
        </div>
      )}

      {/* Tabela de Classificação Completa */}
      <div className="bg-[#14151C] rounded-2xl border border-[#232533] overflow-hidden shadow-xl">
        <div className="px-4 py-3 border-b border-[#232533] flex items-center justify-between bg-[#191B26]">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-bold text-white uppercase tracking-wider">Classificação Geral</span>
          </div>
          <span className="text-[11px] text-gray-400 font-mono">
            {ranking.length} revendedores qualificados
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#161822] text-[#92929F] text-[10px] uppercase font-bold border-b border-[#232533]">
              <tr>
                <th className="py-2.5 px-3.5 text-center w-12">#</th>
                <th className="py-2.5 px-3">Revendedor</th>
                <th className="py-2.5 px-3">Patente</th>
                <th className="py-2.5 px-3 text-center">Ativos</th>
                <th className="py-2.5 px-3 text-center">Novos (Mês)</th>
                <th className="py-2.5 px-3 text-center">Renovações</th>
                <th className="py-2.5 px-3 text-center">Retenção</th>
                <th className="py-2.5 px-3 text-center">Conquistas</th>
                <th className="py-2.5 px-4 text-right">XP Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E202B]">
              {ranking.map((item) => {
                const isMe = item.username.toLowerCase() === currentUsername.toLowerCase();
                return (
                  <tr
                    key={item.id || item.username}
                    className={`transition-colors hover:bg-[#1A1C26] ${
                      isMe ? 'bg-[#009EF7]/10 hover:bg-[#009EF7]/15' : ''
                    }`}
                  >
                    {/* Rank */}
                    <td className="py-3 px-3.5 text-center font-bold font-mono">
                      {item.rank === 1 ? (
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/40 text-[11px]">
                          🥇
                        </span>
                      ) : item.rank === 2 ? (
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-300/20 text-slate-200 border border-slate-300/40 text-[11px]">
                          🥈
                        </span>
                      ) : item.rank === 3 ? (
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-700/20 text-amber-500 border border-amber-700/40 text-[11px]">
                          🥉
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">#{item.rank}</span>
                      )}
                    </td>

                    {/* Revendedor */}
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-xs truncate max-w-[140px] sm:max-w-none">
                          {item.displayName}
                        </span>
                        {isMe && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                            Você
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-gray-500 font-mono block">@{item.username}</span>
                    </td>

                    {/* Patente */}
                    <td className="py-3 px-3">
                      {getTierBadge(item.tier)}
                    </td>

                    {/* Clientes Ativos */}
                    <td className="py-3 px-3 text-center">
                      <span className="font-bold text-emerald-400 font-mono text-xs">
                        {item.activeClients}
                      </span>
                      <span className="text-[10px] text-gray-500 block">/ {item.totalClients} tot</span>
                    </td>

                    {/* Novos no Mês */}
                    <td className="py-3 px-3 text-center">
                      <span className="font-bold text-blue-400 font-mono text-xs">
                        +{item.newClientsThisMonth}
                      </span>
                    </td>

                    {/* Renovações */}
                    <td className="py-3 px-3 text-center font-mono text-xs text-gray-300">
                      {item.renewalsThisMonth}
                    </td>

                    {/* Retenção */}
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`font-bold font-mono text-xs ${
                          item.retentionRate >= 80
                            ? 'text-emerald-400'
                            : item.retentionRate >= 60
                            ? 'text-yellow-400'
                            : 'text-rose-400'
                        }`}
                      >
                        {item.retentionRate}%
                      </span>
                    </td>

                    {/* Conquistas (Badges) */}
                    <td className="py-3 px-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {item.badges.filter(b => b.unlocked).map(b => (
                          <span
                            key={b.id}
                            className="p-1 rounded-md bg-[#232533] border border-[#2E3140] cursor-help transition-all hover:scale-110"
                            title={`${b.name}: ${b.description}`}
                          >
                            {getBadgeIcon(b.icon)}
                          </span>
                        ))}
                      </div>
                    </td>

                    {/* XP Total */}
                    <td className="py-3 px-4 text-right">
                      <span className="font-black text-amber-400 font-mono text-sm block">
                        {item.xp} XP
                      </span>
                    </td>
                  </tr>
                );
              })}

              {ranking.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-gray-500">
                    Nenhum revendedor qualificado no momento.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
