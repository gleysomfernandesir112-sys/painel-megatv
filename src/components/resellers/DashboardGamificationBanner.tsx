import React from 'react';
import { Trophy, Crown, Medal, Sparkles, ChevronRight, Award, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PanelGamificationRanking, ResellerRankingItem } from '../../types';
import { useBrandConfig, APP_CONFIG } from '../../config/appConfig';

interface DashboardGamificationBannerProps {
  rankingData: PanelGamificationRanking;
}

export const DashboardGamificationBanner: React.FC<DashboardGamificationBannerProps> = ({ rankingData }) => {
  const brand = useBrandConfig();
  const franchisePrimary = brand.primaryColor || APP_CONFIG.primaryColor || '#009EF7';

  const { currentUserRank, panelName, month } = rankingData;

  if (!currentUserRank) return null;

  const getTierIcon = (tier: string) => {
    switch (tier) {
      case 'master':
        return <Crown className="w-4 h-4 text-purple-400" />;
      case 'diamond':
        return <Sparkles className="w-4 h-4 text-cyan-400" />;
      case 'gold':
        return <Medal className="w-4 h-4 text-amber-400" />;
      case 'silver':
        return <Medal className="w-4 h-4 text-slate-300" />;
      default:
        return <Medal className="w-4 h-4 text-amber-600" />;
    }
  };

  return (
    <div
      className="p-3.5 sm:p-4 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-lg select-none transition-all hover:border-[#383C50]"
      style={{
        backgroundColor: 'rgba(20, 22, 32, 0.95)',
        borderColor: 'rgba(245, 158, 11, 0.25)'
      }}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0 shadow-sm shadow-amber-500/10">
          <Trophy className="w-5 h-5 text-amber-400 animate-pulse" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-white flex items-center gap-1.5">
              <span>Classificação no Painel</span>
              <span className="text-amber-400 font-black font-mono">#{currentUserRank.rank} Lugar</span>
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#1C1E2A] text-gray-300 border border-[#2B2E40] inline-flex items-center gap-1">
              {getTierIcon(currentUserRank.tier)}
              <span>{currentUserRank.tierName}</span>
            </span>
            <span className="text-[10px] font-bold font-mono text-amber-400">
              {currentUserRank.xp} XP
            </span>
          </div>
          <p className="text-[11px] text-gray-400 truncate mt-0.5">
            {currentUserRank.nextTierName ? (
              <>
                Faltam <strong>{Math.max(1, currentUserRank.nextTierTarget - currentUserRank.activeClients)} clientes</strong> para alcançar a patente{' '}
                <strong className="text-white">{currentUserRank.nextTierName}</strong>
              </>
            ) : (
              <span className="text-purple-300 font-semibold">Parabéns! Você alcançou a patente máxima Master 👑</span>
            )}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        {currentUserRank.nextTierName && (
          <div className="hidden lg:block w-36 space-y-1">
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-gray-400">Progresso</span>
              <span className="font-bold text-white font-mono">{currentUserRank.tierProgress}%</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-[#1A1C26] overflow-hidden border border-[#262836]">
              <div
                className="h-full rounded-full transition-all duration-500 bg-amber-400"
                style={{ width: `${currentUserRank.tierProgress}%` }}
              />
            </div>
          </div>
        )}

        <Link
          to="/resellers?tab=ranking"
          className="px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs whitespace-nowrap ml-auto"
        >
          <span>Ver Ranking 🏆</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
};
