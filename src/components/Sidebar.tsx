import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Bell,
  HelpCircle,
  User,
  LayoutGrid,
  Lock,
  ShieldAlert,
  LogOut,
  Users,
  RefreshCw,
  Tv,
  BarChart3,
  Trash2,
  ListCheck,
  Search,
  UserCheck,
  Zap,
  X,
  ShieldCheck,
  Activity,
  Receipt,
  Palette,
  Megaphone,
  DollarSign,
  Globe,
  FileText,
  Settings,
  Calendar,
  Mail,
  ChevronDown,
  ChevronRight,
  Sparkles,
  Film,
  Smartphone,
  MessageCircle,
  Bot,
  Radio,
  CreditCard,
  Send,
  Flame,
  MessageSquare,
  Server
} from 'lucide-react';
import { useSigmaStore } from '../store/SigmaStore';
import { useBrandConfig } from '../config/appConfig';
import { isPanelMaster } from '../utils/panelAuth';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { profile, logout, isLiveConnected } = useSigmaStore();
  const brand = useBrandConfig();
  const navigate = useNavigate();

  const handleLogout = () => {
    onClose?.();
    logout();
    navigate('/login');
  };

  const handleLinkClick = () => {
    onClose?.();
  };

  // Privilégio Master: O único Master do painel DEVE ser o dono definido na franquia deste painel
  const isMaster = isPanelMaster(profile?.username, profile);
  const hasBotAccess = isMaster ||
    Boolean(profile?.is_master) ||
    Boolean(profile?.is_admin) ||
    profile?.role === 'master' ||
    profile?.role === 'admin' ||
    ['admin', 'andre2056', 'anderson'].includes((profile?.username || '').toLowerCase()) ||
    Boolean(profile?.botAccess ?? profile?.bot_access);

  // Layout da barra lateral: 'auto' segue o tema (comportamento legado); 'xtream'/'sigma' forçam.
  const isXtream = brand.sidebarLayout === 'xtream'
    ? true
    : brand.sidebarLayout === 'sigma'
      ? false
      : brand.themeStyle === 'xtream-classic';

  const location = useLocation();
  const currentPath = location.pathname;

  const [openAccordions, setOpenAccordions] = useState<{ [key: string]: boolean }>({
    customers: currentPath.startsWith('/customers') && !currentPath.includes('live-connections'),
    resellers: currentPath.startsWith('/resellers') || currentPath.startsWith('/billing'),
    automation: currentPath.startsWith('/automation'),
    master: currentPath.startsWith('/settings'),
    security: true
  });

  useEffect(() => {
    if (currentPath.startsWith('/customers') && !currentPath.includes('live-connections')) {
      setOpenAccordions(prev => ({ ...prev, customers: true }));
    } else if (currentPath.startsWith('/resellers') || currentPath.startsWith('/billing')) {
      setOpenAccordions(prev => ({ ...prev, resellers: true }));
    } else if (currentPath.startsWith('/automation')) {
      setOpenAccordions(prev => ({ ...prev, automation: true }));
    } else if (currentPath.startsWith('/settings')) {
      setOpenAccordions(prev => ({ ...prev, master: true }));
    } else if (currentPath.startsWith('/account') || currentPath.startsWith('/active-sessions') || currentPath.startsWith('/profile') || currentPath.startsWith('/billing/cost')) {
      setOpenAccordions(prev => ({ ...prev, security: true }));
    }
  }, [currentPath]);

  const toggleAccordion = (key: string) => {
    setOpenAccordions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const xtreamPrimary = brand.xtreamPrimaryColor || '#00c0ef';
  const xtreamHeader = brand.xtreamHeaderColor || '#181c22';
  const xtreamSidebar = brand.xtreamSidebarColor || '#20252c';

  const xtreamSidebarContent = (
    <div
      className="flex flex-col h-full text-[#9a9da0] select-none text-xs font-sans"
      style={{ backgroundColor: xtreamSidebar }}
    >
      {/* Top Header: Logo do Servidor + Nome do Servidor + Notificações & Logout */}
      <div
        className="h-18 px-4 flex items-center justify-between border-b border-white/10 shrink-0"
        style={{ backgroundColor: xtreamHeader }}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1 mr-2">
          {brand.logoImageUrl ? (
            <img src={brand.logoImageUrl} alt={brand.logoText} className="h-9 w-auto max-w-[42px] object-contain shrink-0 drop-shadow-md" />
          ) : (
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-black shadow-md shrink-0 logo-gradient-box"
              style={{
                background: `linear-gradient(135deg, ${brand.logoGradientFrom || '#E91E63'}, ${brand.logoGradientTo || '#9C27B0'})`
              }}
            >
              {brand.logoIcon || '▶'}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <span className="font-extrabold text-white tracking-tight text-sm truncate block leading-tight">
              {brand.logoText || brand.appName || 'Painel de Gestão'}
            </span>
            <span
              className="text-[10px] font-mono tracking-wider font-semibold block uppercase"
              style={{ color: xtreamPrimary }}
            >
              Xtream Control
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1 text-[#9a9da0] shrink-0">
          <button
            onClick={() => { onClose?.(); navigate('/notices'); }}
            className="p-1.5 rounded-lg hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Avisos e Notificações"
          >
            <Bell className="w-4 h-4" />
          </button>
          <button
            onClick={handleLogout}
            className="p-1.5 rounded-lg hover:text-red-400 hover:bg-white/10 transition-colors cursor-pointer"
            title="Encerrar Sessão"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Top User & Balance Bar (Pinned at top below logo - Always visible) */}
      <div className="px-3.5 py-2.5 bg-black/30 border-b border-white/10 flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 shadow-xs"
            style={{
              backgroundColor: `${xtreamPrimary}20`,
              border: `1px solid ${xtreamPrimary}40`,
              color: xtreamPrimary
            }}
          >
            {profile.username ? profile.username.charAt(0).toUpperCase() : 'U'}
          </div>
          <div className="min-w-0">
            <span className="block text-white font-bold text-xs truncate leading-tight">{profile.username}</span>
            <span className={`inline-block text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded ${
              isMaster
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25'
            }`}>
              {isMaster ? 'Master' : 'Revenda'}
            </span>
          </div>
        </div>
        <div className="text-right shrink-0">
          <span className="block text-[9px] text-gray-400 uppercase font-semibold">Saldo</span>
          <span className="text-emerald-400 font-mono font-bold text-xs">
            {profile.unlimited_credits || profile.creditos_ilimitados || profile.credits === 'ilimitado'
              ? '∞ Ilimitado'
              : `${profile.credits} cr`}
          </span>
        </div>
      </div>

      {/* Navigation Body */}
      <div className="flex-1 overflow-y-auto py-3 px-3 space-y-1.5 scrollbar-none">
        
        {/* 1. Dashboard (Direct Link with Xtream Primary Color) */}
        <NavLink
          to="/dashboard"
          onClick={handleLinkClick}
          style={({ isActive }) => (isActive ? { backgroundColor: xtreamPrimary, color: '#ffffff', fontWeight: 'bold' } : {})}
          className={({ isActive }) =>
            `flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all group ${
              isActive
                ? 'shadow-md shadow-black/20 font-bold'
                : 'text-[#9a9da0] hover:bg-white/5 hover:text-white'
            }`
          }
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-black/20 flex items-center justify-center shrink-0">
              <LayoutDashboard className="w-4 h-4" />
            </div>
            <span className="truncate">Dashboard</span>
          </div>
          <span className="text-[10px] opacity-60 group-hover:translate-x-0.5 transition-transform">›</span>
        </NavLink>

        {/* 2. Conexões Ativas (Live monitor) */}
        <NavLink
          to="/customers/live-connections"
          onClick={handleLinkClick}
          style={({ isActive }) => (isActive ? { backgroundColor: xtreamPrimary, color: '#ffffff', fontWeight: 'bold' } : {})}
          className={({ isActive }) =>
            `flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all group ${
              isActive
                ? 'shadow-md shadow-black/20 font-bold'
                : 'text-[#9a9da0] hover:bg-white/5 hover:text-white'
            }`
          }
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-black/20 flex items-center justify-center shrink-0 text-emerald-400">
              <Activity className="w-4 h-4" />
            </div>
            <span className="truncate">Conexões Ativas</span>
          </div>
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0"></span>
        </NavLink>

        {/* 3. Gestão de Clientes (Accordion Dropdown) */}
        <div className="space-y-1">
          <button
            type="button"
            onClick={() => toggleAccordion('customers')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              currentPath.startsWith('/customers') && !currentPath.includes('live-connections')
                ? 'bg-[#181c22] text-white border border-[#00c0ef]/40'
                : 'text-[#9a9da0] hover:bg-[#181c22] hover:text-white'
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-black/20 flex items-center justify-center shrink-0 text-[#00c0ef]">
                <Users className="w-4 h-4" />
              </div>
              <span className="truncate">Gestão de Clientes</span>
            </div>
            <ChevronDown
              className={`w-4 h-4 shrink-0 transition-transform duration-200 ${
                openAccordions.customers ? 'rotate-180 text-[#00c0ef]' : 'text-gray-500'
              }`}
            />
          </button>

          {openAccordions.customers && (
            <div className="pl-4 pr-1 py-1 space-y-0.5 border-l-2 border-[#00c0ef]/30 ml-4 animate-fade-in">
              <NavLink
                to="/customers"
                end
                onClick={handleLinkClick}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    isActive ? 'bg-[#00c0ef] text-white font-bold' : 'text-[#8a929b] hover:bg-[#181c22] hover:text-white'
                  }`
                }
              >
                <span>• Clientes & Testes</span>
              </NavLink>

              <NavLink
                to="/customers/add"
                onClick={handleLinkClick}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    isActive ? 'bg-[#00c0ef] text-white font-bold' : 'text-emerald-400 hover:bg-[#181c22] hover:text-emerald-300'
                  }`
                }
              >
                <span>+ Criar Cliente / Teste</span>
              </NavLink>

              <NavLink
                to="/customers/renewal-assistant"
                onClick={handleLinkClick}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    isActive ? 'bg-[#00c0ef] text-white font-bold' : 'text-[#8a929b] hover:bg-[#181c22] hover:text-white'
                  }`
                }
              >
                <span>• Assistente de Renovação</span>
              </NavLink>

              <NavLink
                to="/customers/statistics"
                onClick={handleLinkClick}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    isActive ? 'bg-[#00c0ef] text-white font-bold' : 'text-[#8a929b] hover:bg-[#181c22] hover:text-white'
                  }`
                }
              >
                <span>• Estatísticas & Gráficos</span>
              </NavLink>

              <NavLink
                to="/customers/migration"
                onClick={handleLinkClick}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    isActive ? 'bg-[#00c0ef] text-white font-bold' : 'text-[#8a929b] hover:bg-[#181c22] hover:text-white'
                  }`
                }
              >
                <span>• Importação / Migração</span>
              </NavLink>

              <NavLink
                to="/customers/deleted"
                onClick={handleLinkClick}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    isActive ? 'bg-[#00c0ef] text-white font-bold' : 'text-[#8a929b] hover:bg-[#181c22] hover:text-white'
                  }`
                }
              >
                <span>• Lixeira de Clientes</span>
              </NavLink>
            </div>
          )}
        </div>

        {/* 4. Rede de Revendas (Accordion Dropdown) */}
        <div className="space-y-1">
          <button
            type="button"
            onClick={() => toggleAccordion('resellers')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              currentPath.startsWith('/resellers') || currentPath.startsWith('/billing')
                ? 'bg-[#181c22] text-white border border-[#00c0ef]/40'
                : 'text-[#9a9da0] hover:bg-[#181c22] hover:text-white'
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-black/20 flex items-center justify-center shrink-0 text-emerald-400">
                <UserCheck className="w-4 h-4" />
              </div>
              <span className="truncate">Rede de Revendas</span>
            </div>
            <ChevronDown
              className={`w-4 h-4 shrink-0 transition-transform duration-200 ${
                openAccordions.resellers ? 'rotate-180 text-[#00c0ef]' : 'text-gray-500'
              }`}
            />
          </button>

          {openAccordions.resellers && (
            <div className="pl-4 pr-1 py-1 space-y-0.5 border-l-2 border-emerald-500/30 ml-4 animate-fade-in">
              <NavLink
                to="/resellers"
                end
                onClick={handleLinkClick}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    isActive ? 'bg-[#00c0ef] text-white font-bold' : 'text-[#8a929b] hover:bg-[#181c22] hover:text-white'
                  }`
                }
              >
                <span>• Lista de Revendas</span>
              </NavLink>

              <NavLink
                to="/resellers/add"
                onClick={handleLinkClick}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    isActive ? 'bg-[#00c0ef] text-white font-bold' : 'text-emerald-400 hover:bg-[#181c22] hover:text-emerald-300'
                  }`
                }
              >
                <span>+ Cadastrar Sub-Revenda</span>
              </NavLink>

              <NavLink
                to="/billing/monthly"
                onClick={handleLinkClick}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    isActive ? 'bg-[#00c0ef] text-white font-bold' : 'text-[#8a929b] hover:bg-[#181c22] hover:text-white'
                  }`
                }
              >
                <span>• Faturamento & Mensalidades</span>
              </NavLink>

              <NavLink
                to="/resellers/credit-transactions"
                onClick={handleLinkClick}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    isActive ? 'bg-[#00c0ef] text-white font-bold' : 'text-[#8a929b] hover:bg-[#181c22] hover:text-white'
                  }`
                }
              >
                <span>• Extrato de Créditos</span>
              </NavLink>
            </div>
          )}
        </div>

        {/* 5. Bots & Automações (Accordion Dropdown) */}
        <div className="space-y-1">
          <button
            type="button"
            onClick={() => toggleAccordion('automation')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              currentPath.startsWith('/automation')
                ? 'bg-[#181c22] text-white border border-[#00c0ef]/40'
                : 'text-[#9a9da0] hover:bg-[#181c22] hover:text-white'
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-black/20 flex items-center justify-center shrink-0 text-[#00c0ef]">
                <Bot className="w-4 h-4" />
              </div>
              <span className="truncate">Bots & Automações</span>
              {!hasBotAccess && (
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700 flex items-center gap-1 font-mono">
                  <Lock className="w-2.5 h-2.5" /> Off
                </span>
              )}
            </div>
            <ChevronDown
              className={`w-4 h-4 shrink-0 transition-transform duration-200 ${
                openAccordions.automation ? 'rotate-180 text-[#00c0ef]' : 'text-gray-500'
              }`}
            />
          </button>

          {openAccordions.automation && (
            <div className="pl-4 pr-1 py-1 space-y-0.5 border-l-2 border-[#00c0ef]/30 ml-4 animate-fade-in">
              <NavLink
                to="/automation/whatsapp"
                end
                onClick={handleLinkClick}
                style={({ isActive }) => (isActive ? { backgroundColor: xtreamPrimary, color: '#ffffff' } : {})}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    isActive ? 'font-bold shadow-xs' : 'text-[#8a929b] hover:bg-[#181c22] hover:text-white'
                  }`
                }
              >
                <span className="truncate">• WhatsApp Multi-Chip (5)</span>
              </NavLink>

              <NavLink
                to="/automation/flow"
                end
                onClick={handleLinkClick}
                style={({ isActive }) => (isActive ? { backgroundColor: xtreamPrimary, color: '#ffffff' } : {})}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    isActive ? 'font-bold shadow-xs' : 'text-[#8a929b] hover:bg-[#181c22] hover:text-white'
                  }`
                }
              >
                <span className="truncate">• Fluxo & Suporte Humano</span>
              </NavLink>

              <NavLink
                to="/automation/promotions"
                end
                onClick={handleLinkClick}
                style={({ isActive }) => (isActive ? { backgroundColor: xtreamPrimary, color: '#ffffff' } : {})}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    isActive ? 'font-bold shadow-xs' : 'text-[#8a929b] hover:bg-[#181c22] hover:text-white'
                  }`
                }
              >
                <span className="truncate">• Campanhas & Promos</span>
              </NavLink>

              <NavLink
                to="/automation/broadcast"
                end
                onClick={handleLinkClick}
                style={({ isActive }) => (isActive ? { backgroundColor: xtreamPrimary, color: '#ffffff' } : {})}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    isActive ? 'font-bold shadow-xs' : 'text-[#8a929b] hover:bg-[#181c22] hover:text-white'
                  }`
                }
              >
                <span className="truncate">• Disparo em Massa</span>
              </NavLink>

              <NavLink
                to="/automation/gateways"
                end
                onClick={handleLinkClick}
                style={({ isActive }) => (isActive ? { backgroundColor: xtreamPrimary, color: '#ffffff' } : {})}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    isActive ? 'font-bold shadow-xs' : 'text-[#8a929b] hover:bg-[#181c22] hover:text-white'
                  }`
                }
              >
                <span className="truncate">• Cobrança & PIX</span>
              </NavLink>

              <NavLink
                to="/automation/test"
                end
                onClick={handleLinkClick}
                style={({ isActive }) => (isActive ? { backgroundColor: xtreamPrimary, color: '#ffffff' } : {})}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    isActive ? 'font-bold shadow-xs' : 'text-[#8a929b] hover:bg-[#181c22] hover:text-white'
                  }`
                }
              >
                <span className="truncate">• Teste & Simulador</span>
              </NavLink>
            </div>
          )}
        </div>

        {/* 6. Avisos & Suporte */}
        <NavLink
          to="/notices"
          onClick={handleLinkClick}
          style={({ isActive }) => (isActive ? { backgroundColor: xtreamPrimary, color: '#ffffff', fontWeight: 'bold' } : {})}
          className={({ isActive }) =>
            `flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all group ${
              isActive
                ? 'shadow-md shadow-black/20 font-bold'
                : 'text-[#9a9da0] hover:bg-white/5 hover:text-white'
            }`
          }
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-black/20 flex items-center justify-center shrink-0 text-amber-400">
              <Megaphone className="w-4 h-4" />
            </div>
            <span className="truncate">Avisos e Notificações</span>
          </div>
          <span className="text-[10px] opacity-60 group-hover:translate-x-0.5 transition-transform">›</span>
        </NavLink>

        <NavLink
          to="/support-tickets"
          onClick={handleLinkClick}
          style={({ isActive }) => (isActive ? { backgroundColor: xtreamPrimary, color: '#ffffff', fontWeight: 'bold' } : {})}
          className={({ isActive }) =>
            `flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all group ${
              isActive
                ? 'shadow-md shadow-black/20 font-bold'
                : 'text-[#9a9da0] hover:bg-white/5 hover:text-white'
            }`
          }
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-black/20 flex items-center justify-center shrink-0 text-sky-400">
              <HelpCircle className="w-4 h-4" />
            </div>
            <span className="truncate">Tickets de Suporte</span>
          </div>
          <span className="text-[10px] opacity-60 group-hover:translate-x-0.5 transition-transform">›</span>
        </NavLink>

        {/* 6. FERRAMENTAS MASTER (EXCLUSIVO PARA MASTER DO PAINEL) */}
        {isMaster && (
          <div
            className="mt-3 p-2.5 rounded-2xl bg-black/25 border shadow-md space-y-1.5"
            style={{ borderColor: `${xtreamPrimary}35` }}
          >
            <div className="px-2 py-1 flex items-center justify-between">
              <div
                className="flex items-center gap-1.5 font-bold text-[11px] uppercase tracking-wider"
                style={{ color: xtreamPrimary }}
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Painel Master</span>
              </div>
              <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold text-[9px] px-2 py-0.5 rounded-full">
                MASTER
              </span>
            </div>

            <div className="space-y-0.5 pt-1">
              <NavLink
                to="/settings/brand"
                onClick={handleLinkClick}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium transition-colors ${
                    isActive ? 'bg-[#00c0ef] text-white font-bold shadow-xs' : 'text-gray-300 hover:bg-[#202936] hover:text-white'
                  }`
                }
              >
                <Palette className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="truncate">Personalização da Marca</span>
              </NavLink>

              <NavLink
                to="/settings/modal"
                onClick={handleLinkClick}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium transition-colors ${
                    isActive ? 'bg-[#00c0ef] text-white font-bold shadow-xs' : 'text-gray-300 hover:bg-[#202936] hover:text-white'
                  }`
                }
              >
                <FileText className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span className="truncate">Tela de Ativação / Modal</span>
              </NavLink>

              <NavLink
                to="/settings/domain"
                onClick={handleLinkClick}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium transition-colors ${
                    isActive ? 'bg-[#00c0ef] text-white font-bold shadow-xs' : 'text-gray-300 hover:bg-[#202936] hover:text-white'
                  }`
                }
              >
                <Globe className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <span className="truncate">Domínio Personalizado</span>
              </NavLink>
            </div>
          </div>
        )}

        {/* 7. PREFERÊNCIAS & SISTEMA */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <NavLink
              to="/account"
              onClick={handleLinkClick}
              className={({ isActive }) =>
                `flex-1 flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  isActive || currentPath.startsWith('/account')
                    ? 'bg-[#181c22] text-white border border-[#00c0ef]/40 font-bold'
                    : 'text-[#9a9da0] hover:bg-[#181c22] hover:text-white'
                }`
              }
            >
              <div className="w-7 h-7 rounded-lg bg-black/20 flex items-center justify-center shrink-0 text-gray-400">
                <Lock className="w-4 h-4" />
              </div>
              <span className="truncate">Conta & Segurança</span>
            </NavLink>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); toggleAccordion('security'); }}
              className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer ml-1"
              title={openAccordions.security ? "Recolher submenu" : "Expandir submenu"}
            >
              <ChevronDown
                className={`w-4 h-4 shrink-0 transition-transform duration-200 ${
                  openAccordions.security ? 'rotate-180 text-[#00c0ef]' : 'text-gray-500'
                }`}
              />
            </button>
          </div>

          {openAccordions.security && (
            <div className="pl-4 pr-1 py-1 space-y-0.5 border-l-2 border-gray-600/40 ml-4 animate-fade-in">
              <NavLink
                to="/account"
                onClick={handleLinkClick}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    isActive ? 'bg-[#00c0ef] text-white font-bold' : 'text-[#8a929b] hover:bg-[#181c22] hover:text-white'
                  }`
                }
              >
                <span>• Minha Conta / Perfil</span>
              </NavLink>

              {!isMaster && (
                <NavLink
                  to="/billing/cost"
                  onClick={handleLinkClick}
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                      isActive ? 'bg-[#00c0ef] text-white font-bold' : 'text-emerald-400 hover:bg-[#181c22] hover:text-emerald-300'
                    }`
                  }
                >
                  <DollarSign className="w-3.5 h-3.5 shrink-0" />
                  <span>Meu Custo & Receita</span>
                </NavLink>
              )}

              <NavLink
                to="/account-security"
                onClick={handleLinkClick}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    isActive ? 'bg-[#00c0ef] text-white font-bold' : 'text-[#8a929b] hover:bg-[#181c22] hover:text-white'
                  }`
                }
              >
                <span>• Segurança da Conta</span>
              </NavLink>

              <NavLink
                to="/active-sessions"
                onClick={handleLinkClick}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    isActive ? 'bg-[#00c0ef] text-white font-bold' : 'text-[#8a929b] hover:bg-[#181c22] hover:text-white'
                  }`
                }
              >
                <span>• Sessões Ativas</span>
              </NavLink>

              {brand.webPlayerUrl && (
                <div
                  onClick={() => {
                    onClose?.();
                    window.open(brand.webPlayerUrl, '_blank', 'noopener,noreferrer');
                  }}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-cyan-400 hover:bg-[#181c22] hover:text-cyan-300 transition-colors cursor-pointer"
                >
                  <Tv className="w-3.5 h-3.5 shrink-0" />
                  <span>Acessar Web Player</span>
                </div>
              )}
            </div>
          )}
        </div>

      </div>

      {/* Sidebar Footer: Server Status & Encerrar Sessão */}
      <div className="p-3 border-t border-[#2c333a] bg-[#181c22] shrink-0 space-y-2">
        <div className="px-1 flex items-center justify-between text-[11px]">
          <span className="text-gray-400 font-medium">Servidor Principal</span>
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-semibold text-[10px]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Online</span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Encerrar Sessão</span>
        </button>
      </div>
    </div>
  );

  const sidebarContent = (
    <div
      className="flex flex-col h-full text-[#92929F] select-none transition-colors"
      style={{ backgroundColor: 'var(--theme-sidebar, #111217)' }}
    >
      {/* Brand logo & Mobile Close Button */}
      <div className={`h-16 px-5 flex items-center justify-between border-b shrink-0 ${
        isXtream ? 'border-[#2e3740]' : 'border-[#1B1D24]/60'
      }`}>
        <div className="flex items-center gap-2.5 min-w-0">
          {brand.logoImageUrl ? (
            <img src={brand.logoImageUrl} alt={brand.logoText} className="h-7 object-contain" />
          ) : (
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-black shadow-md shrink-0 logo-gradient-box"
              style={{
                background: `linear-gradient(135deg, ${brand.logoGradientFrom}, ${brand.logoGradientTo})`
              }}
            >
              {brand.logoIcon}
            </div>
          )}
          <span className="font-bold text-white tracking-tight text-sm truncate">{brand.logoText || brand.appName}</span>
        </div>

        {/* Mobile close button */}
        <button
          type="button"
          onClick={onClose}
          className="md:hidden p-1.5 rounded-lg text-[#92929F] hover:text-white hover:bg-[#1A1C24] transition-colors"
          title="Fechar menu"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Top User & Balance Bar (Pinned at top below logo - Always visible) */}
      <div className="px-4 py-2.5 bg-black/20 border-b border-[#1B1D24] flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-[#009EF7]/20 border border-[#009EF7]/30 flex items-center justify-center text-[#009EF7] font-bold text-xs shrink-0">
            {profile.username ? profile.username.charAt(0).toUpperCase() : 'U'}
          </div>
          <div className="min-w-0 leading-tight">
            <span className="truncate text-xs font-bold text-white block" title={profile.username}>{profile.username}</span>
            <span className={`inline-block text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded ${
              isMaster
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25'
            }`}>
              {isMaster ? 'Master' : 'Revendedor'}
            </span>
          </div>
        </div>
        <div className="text-right shrink-0">
          <span className="block text-[9px] text-gray-400 uppercase font-semibold">Saldo</span>
          <span className="text-emerald-400 font-mono font-bold text-xs">
            {profile.unlimited_credits || profile.creditos_ilimitados || profile.credits === 'ilimitado'
              ? '∞ Ilimitado'
              : `${profile.credits} cr`}
          </span>
        </div>
      </div>

      {/* Navigation Sections */}
      <div className="flex-1 overflow-y-auto py-2 px-3 space-y-4">
        {/* GESTÃO PRINCIPAL */}
        <div>
          <div className="px-3 mb-1 text-[10px] font-bold text-[#4B4E63] uppercase tracking-wider">
            {brand.appShortName}
          </div>
          <div className="space-y-0.5">
            <NavLink
              to="/dashboard"
              onClick={handleLinkClick}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-[#009EF7] text-white shadow-md shadow-blue-500/20'
                    : 'text-[#92929F] hover:text-white hover:bg-[#16171F]'
                }`
              }
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Dashboard</span>
            </NavLink>

            <NavLink
              to="/notices"
              onClick={handleLinkClick}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  isActive ? 'bg-[#009EF7] text-white' : 'text-[#92929F] hover:text-white hover:bg-[#16171F]'
                }`
              }
            >
              <Megaphone className="w-4 h-4" />
              <span>Avisos e Notificações</span>
            </NavLink>

            <NavLink
              to="/support-tickets"
              onClick={handleLinkClick}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  isActive ? 'bg-[#009EF7] text-white' : 'text-[#92929F] hover:text-white hover:bg-[#16171F]'
                }`
              }
            >
              <HelpCircle className="w-4 h-4" />
              <span>Tickets de Suporte</span>
            </NavLink>
          </div>
        </div>

        {/* CLIENTES & STREAMING */}
        <div>
          <div className="px-3 mb-1 text-[10px] font-bold text-[#4B4E63] uppercase tracking-wider">
            Clientes & Acessos
          </div>
          <div className="space-y-0.5">
            <NavLink
              to="/customers"
              onClick={handleLinkClick}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  isActive ? 'bg-[#009EF7] text-white' : 'text-[#92929F] hover:text-white hover:bg-[#16171F]'
                }`
              }
            >
              <Users className="w-4 h-4" />
              <span>Clientes & Testes</span>
            </NavLink>

            <NavLink
              to="/customers/add"
              onClick={handleLinkClick}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  isActive ? 'bg-[#009EF7] text-white' : 'text-[#92929F] hover:text-white hover:bg-[#16171F]'
                }`
              }
            >
              <Zap className="w-4 h-4 text-[#009EF7]" />
              <span>Criar Cliente / Teste</span>
            </NavLink>

            <NavLink
              to="/customers/live-connections"
              onClick={handleLinkClick}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  isActive ? 'bg-[#009EF7] text-white' : 'text-[#92929F] hover:text-white hover:bg-[#16171F]'
                }`
              }
            >
              <Tv className="w-4 h-4" />
              <span>Conexões Ativas</span>
            </NavLink>

            <NavLink
              to="/customers/renewal-assistant"
              onClick={handleLinkClick}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  isActive ? 'bg-[#009EF7] text-white' : 'text-[#92929F] hover:text-white hover:bg-[#16171F]'
                }`
              }
            >
              <RefreshCw className="w-4 h-4" />
              <span>Assistente de Renovação</span>
            </NavLink>

            <NavLink
              to="/customers/statistics"
              onClick={handleLinkClick}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  isActive ? 'bg-[#009EF7] text-white' : 'text-[#92929F] hover:text-white hover:bg-[#16171F]'
                }`
              }
            >
              <BarChart3 className="w-4 h-4" />
              <span>Estatísticas & Gráficos</span>
            </NavLink>

            <NavLink
              to="/customers/deleted"
              onClick={handleLinkClick}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  isActive ? 'bg-[#009EF7] text-white' : 'text-[#92929F] hover:text-white hover:bg-[#16171F]'
                }`
              }
            >
              <Trash2 className="w-4 h-4" />
              <span>Lixeira de Clientes</span>
            </NavLink>
          </div>
        </div>

        {/* REDE DE SUB-REVENDAS (Disponível para Revendedores e Masters) */}
        <div>
          <div className="px-3 mb-1 text-[10px] font-bold text-[#4B4E63] uppercase tracking-wider">
            Rede de Revendas
          </div>
            <div className="space-y-0.5">
              <NavLink
                to="/resellers"
                onClick={handleLinkClick}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    isActive ? 'bg-[#009EF7] text-white' : 'text-[#92929F] hover:text-white hover:bg-[#16171F]'
                  }`
                }
              >
                <UserCheck className="w-4 h-4" />
                <span>Lista de Revendas</span>
              </NavLink>

              <NavLink
                to="/resellers/add"
                onClick={handleLinkClick}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    isActive ? 'bg-[#009EF7] text-white' : 'text-[#92929F] hover:text-white hover:bg-[#16171F]'
                  }`
                }
              >
                <Users className="w-4 h-4 text-[#50CD89]" />
                <span>Cadastrar Sub-Revenda</span>
              </NavLink>

              <NavLink
                to="/billing/monthly"
                onClick={handleLinkClick}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    isActive ? 'bg-[#009EF7] text-white' : 'text-[#92929F] hover:text-white hover:bg-[#16171F]'
                  }`
                }
              >
                <Receipt className="w-4 h-4 text-[#50CD89]" />
                <span>Faturamento & Mensalidades</span>
              </NavLink>

              <NavLink
                to="/resellers/credit-transactions"
                onClick={handleLinkClick}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    isActive ? 'bg-[#009EF7] text-white' : 'text-[#92929F] hover:text-white hover:bg-[#16171F]'
                  }`
                }
              >
                <ListCheck className="w-4 h-4" />
                <span>Extrato de Créditos</span>
              </NavLink>
            </div>
          </div>

        {/* BOTS & AUTOMAÇÕES */}
        <div>
          <div className="px-3 mb-1 text-[10px] font-bold text-[#4B4E63] uppercase tracking-wider flex items-center justify-between">
            <span>Bots & Automações</span>
            {!hasBotAccess && (
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700 flex items-center gap-1 font-mono normal-case">
                <Lock className="w-2.5 h-2.5" /> Bloqueado
              </span>
            )}
          </div>
          <div className="space-y-0.5">
            <NavLink
              to="/automation/whatsapp"
              end
              onClick={handleLinkClick}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  isActive ? 'bg-[#009EF7] text-white' : 'text-[#92929F] hover:text-white hover:bg-[#16171F]'
                }`
              }
            >
              <Smartphone className="w-4 h-4 text-[#50CD89]" />
              <span>WhatsApp Multi-Chip (5)</span>
            </NavLink>

            <NavLink
              to="/automation/flow"
              end
              onClick={handleLinkClick}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  isActive ? 'bg-[#009EF7] text-white' : 'text-[#92929F] hover:text-white hover:bg-[#16171F]'
                }`
              }
            >
              <Bot className="w-4 h-4 text-[#7239EA]" />
              <span>Fluxo & Suporte Humano</span>
            </NavLink>

            <NavLink
              to="/automation/promotions"
              end
              onClick={handleLinkClick}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  isActive ? 'bg-[#009EF7] text-white' : 'text-[#92929F] hover:text-white hover:bg-[#16171F]'
                }`
              }
            >
              <Flame className="w-4 h-4 text-[#F1416C]" />
              <span>Campanhas & Promos</span>
            </NavLink>

            <NavLink
              to="/automation/gateways"
              end
              onClick={handleLinkClick}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  isActive ? 'bg-[#009EF7] text-white' : 'text-[#92929F] hover:text-white hover:bg-[#16171F]'
                }`
              }
            >
              <CreditCard className="w-4 h-4 text-[#009EF7]" />
              <span>Cobrança & PIX Automático</span>
            </NavLink>

            <NavLink
              to="/automation/broadcast"
              end
              onClick={handleLinkClick}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  isActive ? 'bg-[#009EF7] text-white' : 'text-[#92929F] hover:text-white hover:bg-[#16171F]'
                }`
              }
            >
              <Radio className="w-4 h-4 text-amber-400" />
              <span>Disparo em Massa</span>
            </NavLink>

            <NavLink
              to="/automation/test"
              end
              onClick={handleLinkClick}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  isActive ? 'bg-[#009EF7] text-white' : 'text-[#92929F] hover:text-white hover:bg-[#16171F]'
                }`
              }
            >
              <Send className="w-4 h-4 text-[#00E5FF]" />
              <span>Teste & Simulador</span>
            </NavLink>
          </div>
        </div>

        {/* CONFIGURAÇÕES & CONTA */}
        <div>
          <div className="px-3 mb-1 text-[10px] font-bold text-[#4B4E63] uppercase tracking-wider">
            Preferências & Sistema
          </div>
          <div className="space-y-0.5">
            {/* Custo & Receita — visível para revendedores */}
            {!isMaster && (
              <NavLink
                to="/billing/cost"
                onClick={handleLinkClick}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    isActive ? 'bg-[#009EF7] text-white' : 'text-[#92929F] hover:text-white hover:bg-[#16171F]'
                  }`
                }
              >
                <DollarSign className="w-4 h-4 text-[#50CD89]" />
                <span>Meu Custo & Receita</span>
              </NavLink>
            )}

            {/* Personalização — apenas master */}
            {isMaster && (
              <>
                <NavLink
                  to="/settings/brand"
                  onClick={handleLinkClick}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                      isActive ? 'bg-[#009EF7] text-white' : 'text-[#92929F] hover:text-white hover:bg-[#16171F]'
                    }`
                  }
                >
                  <Palette className="w-4 h-4 text-[#FF9900]" />
                  <span>Personalização</span>
                </NavLink>

                <NavLink
                  to="/settings/modal"
                  onClick={handleLinkClick}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                      isActive ? 'bg-[#009EF7] text-white' : 'text-[#92929F] hover:text-white hover:bg-[#16171F]'
                    }`
                  }
                >
                  <FileText className="w-4 h-4 text-[#00E5FF]" />
                  <span>Modelo do Modal</span>
                </NavLink>

                <NavLink
                  to="/settings/domain"
                  onClick={handleLinkClick}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                      isActive ? 'bg-[#009EF7] text-white' : 'text-[#92929F] hover:text-white hover:bg-[#16171F]'
                    }`
                  }
                >
                  <Globe className="w-4 h-4 text-[#009EF7]" />
                  <span>Domínio Personalizado</span>
                </NavLink>
              </>
            )}

            <NavLink
              to="/account"
              onClick={handleLinkClick}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  isActive ? 'bg-[#009EF7] text-white' : 'text-[#92929F] hover:text-white hover:bg-[#16171F]'
                }`
              }
            >
              <User className="w-4 h-4" />
              <span>Perfil & Dados</span>
            </NavLink>


            <NavLink
              to="/account-security"
              onClick={handleLinkClick}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  isActive ? 'bg-[#009EF7] text-white' : 'text-[#92929F] hover:text-white hover:bg-[#16171F]'
                }`
              }
            >
              <Lock className="w-4 h-4" />
              <span>Segurança da Conta</span>
            </NavLink>
          </div>
        </div>
      </div>

      {/* Bottom user stats & logout */}
      <div className={`p-3 border-t shrink-0 mt-auto space-y-2 ${
        isXtream ? 'border-[#2e3740] bg-[#1a2026]' : 'border-[#1B1D24]/80 bg-[#0d0e12]'
      }`}>
        <div className="px-1 flex items-center justify-between text-[11px]">
          <span className="text-gray-400 font-medium">Servidor Principal</span>
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-semibold text-[10px]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Online</span>
          </div>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-[#F1416C] hover:bg-[#F1416C]/10 border border-transparent hover:border-[#F1416C]/20 transition-all cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Encerrar Sessão</span>
        </button>
      </div>
    </div>
  );

  const finalContent = isXtream ? xtreamSidebarContent : sidebarContent;

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside data-sidebar={isXtream ? 'xtream' : 'sigma'} className={`hidden md:flex w-[240px] border-r shrink-0 sticky top-0 h-screen overflow-hidden flex flex-col z-20 ${
        isXtream ? 'border-[#2c333a] bg-[#222831]' : 'border-[#1B1D24] bg-[#111217]'
      }`}>
        {finalContent}
      </aside>

      {/* Mobile Slide-in Drawer */}
      <aside
        data-sidebar={isXtream ? 'xtream' : 'sigma'}
        className={`fixed inset-y-0 left-0 z-50 w-72 md:hidden border-r shadow-2xl overflow-hidden flex flex-col transform transition-transform duration-300 ease-in-out ${
          isXtream ? 'border-[#2c333a] bg-[#222831]' : 'border-[#1B1D24] bg-[#111217]'
        } ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {finalContent}
      </aside>
    </>
  );
};
