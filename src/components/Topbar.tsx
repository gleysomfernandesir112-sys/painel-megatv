import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Moon, Maximize2, Settings, RefreshCw, Menu, ShieldCheck, Sparkles, LogOut, Wallet } from 'lucide-react';
import { useSigmaStore } from '../store/SigmaStore';
import { useBrandConfig } from '../config/appConfig';
import { apiService } from '../services/apiService';
import { FastCdnLoginModal } from './modals/FastCdnLoginModal';

interface TopbarProps {
  onToggleMobileMenu?: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({ onToggleMobileMenu }) => {
  const { profile, isLiveConnected, isLoadingLive, refreshLiveData, isDemo, logout } = useSigmaStore();
  const brand = useBrandConfig();
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const navigate = useNavigate();
  const isXtream = brand.themeStyle === 'xtream-classic';

  useEffect(() => {
    let isMounted = true;
    const fetchCounts = async () => {
      try {
        const [ticketsRes, annRes] = await Promise.allSettled([
          apiService.getTickets(),
          apiService.getAnnouncements()
        ]);
        let total = 0;
        if (ticketsRes.status === 'fulfilled' && Array.isArray(ticketsRes.value)) {
          total += ticketsRes.value.filter((t: any) => t.status === 'OPEN').length;
        }
        if (annRes.status === 'fulfilled' && Array.isArray(annRes.value)) {
          total += annRes.value.length;
        }
        if (isMounted) setUnreadCount(total);
      } catch {}
    };
    fetchCounts();
    const interval = setInterval(fetchCounts, 60000);
    return () => { isMounted = false; clearInterval(interval); };
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  return (
    <>
      <header className={`h-16 px-3 sm:px-6 flex items-center justify-between shrink-0 select-none z-20 transition-colors ${
        isXtream
          ? 'bg-[#222831] border-b border-[#2e3740]'
          : 'bg-[#111217] border-b border-[#1B1D24]'
      }`}>
        {/* Left: Mobile hamburger + Title / Logo */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {/* Mobile hamburger menu toggle */}
          <button
            type="button"
            onClick={onToggleMobileMenu}
            className={`md:hidden p-2 rounded-lg transition-colors shrink-0 ${
              isXtream ? 'text-[#a0aab5] hover:text-white hover:bg-[#2c3338]' : 'text-[#92929F] hover:text-white hover:bg-[#1A1C24]'
            }`}
            title="Abrir Menu de Navegação"
            aria-label="Abrir Menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Mobile Mini Logo */}
          <div className="flex items-center gap-2 md:hidden shrink-0">
            {brand.logoImageUrl ? (
              <img src={brand.logoImageUrl} alt={brand.appShortName} className="h-7 object-contain" />
            ) : (
              <div
                className="w-7 h-7 rounded-lg text-white text-xs font-black flex items-center justify-center shadow-md shrink-0"
                style={{
                  background: `linear-gradient(135deg, ${brand.logoGradientFrom}, ${brand.logoGradientTo})`
                }}
              >
                {brand.logoIcon}
              </div>
            )}
            <span className="font-bold text-white text-sm tracking-tight truncate max-w-[110px] sm:max-w-none">
              {brand.appShortName}
            </span>
          </div>

          {/* Desktop Title & Live Connection Status Pill */}
          <div className="hidden md:flex items-center gap-3">
            <h1 className="text-white font-bold text-base tracking-wide">
              {isXtream ? (brand.logoText || brand.appName || 'Painel de Gestão') : 'Painel de Gestão'}
            </h1>
            {isDemo ? (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                <Sparkles className="w-3.5 h-3.5 animate-pulse text-amber-400" />
                <span>MODO DEMO (VISUAL)</span>
              </div>
            ) : (
              <button
                onClick={() => setStatusModalOpen(true)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all cursor-pointer ${
                  isLiveConnected
                    ? 'bg-[#50CD89]/10 text-[#50CD89] border-[#50CD89]/30 hover:bg-[#50CD89]/20'
                    : 'bg-[#FF9900]/10 text-[#FF9900] border-[#FF9900]/30 hover:bg-[#FF9900]/20'
                }`}
                title="Clique para ver o status da conexão com o servidor"
              >
                <span className={`w-2 h-2 rounded-full ${isLiveConnected ? 'bg-[#50CD89] animate-pulse' : 'bg-[#FF9900]'}`}></span>
                <span>{isLiveConnected ? 'Servidor Online' : 'Conexão Offline'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Right action icons */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* Prominent Credit Balance Pill */}
          {profile && (
            <div 
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold text-xs"
              title="Saldo de Créditos Atual"
            >
              <Wallet className="w-3.5 h-3.5 text-emerald-400" />
              <span>
                {profile.unlimited_credits || profile.creditos_ilimitados || profile.credits === 'ilimitado'
                  ? '∞ Ilimitado'
                  : `${profile.credits ?? 0} cr`}
              </span>
            </div>
          )}

          {isDemo && (
            <button
              onClick={() => {
                logout();
                navigate('/login');
              }}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-red-500/15 text-red-400 border border-red-500/30 hover:bg-red-500/25 transition-all cursor-pointer mr-1"
              title="Sair do Modo Demonstração"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sair do Demo</span>
            </button>
          )}

          {/* Quick Refresh Live Data Button */}
          <button
            onClick={() => refreshLiveData()}
            disabled={isLoadingLive}
            className={`p-2 rounded-lg transition-all disabled:opacity-50 ${
              isXtream ? 'text-[#a0aab5] hover:text-white hover:bg-[#2c3338]' : 'text-[#92929F] hover:text-white hover:bg-[#16171F]'
            }`}
            title="Sincronizar dados do servidor"
          >
            <RefreshCw className={`w-4 h-4 ${isLoadingLive ? 'animate-spin text-[#009EF7]' : ''}`} />
          </button>

          {/* Bell Notifications */}
          <button
            onClick={() => navigate('/notices')}
            className={`relative p-2 rounded-lg transition-all ${
              isXtream ? 'text-[#a0aab5] hover:text-white hover:bg-[#2c3338]' : 'text-[#92929F] hover:text-white hover:bg-[#16171F]'
            }`}
            title={`Avisos e Notificações ${unreadCount > 0 ? `(${unreadCount})` : ''}`}
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white font-black text-[10px] flex items-center justify-center border-2 border-[#111217] shadow-sm animate-pulse">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {/* Fullscreen (Desktop only) */}
          <button
            onClick={toggleFullscreen}
            className={`hidden sm:block p-2 rounded-lg transition-all ${
              isXtream ? 'text-[#a0aab5] hover:text-white hover:bg-[#2c3338]' : 'text-[#92929F] hover:text-white hover:bg-[#16171F]'
            }`}
            title="Alternar Tela Cheia"
          >
            <Maximize2 className="w-4 h-4" />
          </button>

          {/* Settings */}
          <button
            onClick={() => navigate('/account-settings')}
            className={`p-2 rounded-lg transition-all ${
              isXtream ? 'text-[#a0aab5] hover:text-white hover:bg-[#2c3338]' : 'text-[#92929F] hover:text-white hover:bg-[#16171F]'
            }`}
            title="Configurações do Perfil"
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* User Avatar & Credits Pill */}
          <div
            onClick={() => setStatusModalOpen(true)}
            className={`ml-1 sm:ml-2 flex items-center gap-2 sm:gap-2.5 pl-2 sm:pl-3 border-l cursor-pointer group ${
              isXtream ? 'border-[#323b44]' : 'border-[#1B1D24]'
            }`}
            title="Clique para ver detalhes da conta e do servidor"
          >
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold tracking-wider group-hover:ring-2 transition-all shrink-0 shadow-md"
              style={{
                backgroundColor: brand.primaryColor
              }}
            >
              {profile.username ? profile.username.substring(0, 2).toUpperCase() : 'AD'}
            </div>
            <div className="text-left">
              <div className="text-xs font-bold text-white group-hover:text-[#009EF7] transition-colors truncate max-w-[90px] sm:max-w-[120px]">
                {profile.username}
              </div>
              <div className="text-[10px] text-[#50CD89] font-bold">
                {profile.unlimited_credits || profile.creditos_ilimitados || profile.credits === 'ilimitado'
                  ? '∞ Ilimitado'
                  : `${profile.credits} cr`}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Server Status Modal (Zero API Key prompt) */}
      <FastCdnLoginModal isOpen={statusModalOpen} onClose={() => setStatusModalOpen(false)} />
    </>
  );
};
