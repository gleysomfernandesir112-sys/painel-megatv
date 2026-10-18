import React, { useState, useMemo } from 'react';
import {
  Users, UserCheck, UserX, Video, List, Package, ShieldCheck, Mail,
  Calendar, RotateCw, ExternalLink, Copy, Check, Tv, Plus, Lock, Globe,
  Smartphone, Zap, Search, X, Sparkles, MonitorPlay, Power, Film, Clapperboard, Activity, Radio,
  Eye, EyeOff
} from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { APP_CONFIG, useBrandConfig } from '../../config/appConfig';
import { AppActivationModal } from '../modals/AppActivationModal';
import { useSigmaStore } from '../../store/SigmaStore';
import { fastCdnApi } from '../../services/fastcdn';

interface XtreamClassicDashboardProps {
  profile: any;
  customers: any[];
  resellers: any[];
  bouquets: any[];
  metrics: {
    totalClients: number;
    activeClients: number;
    expiredClients: number;
    trialClients: number;
    totalSubresellers: number;
    activeResellers: number;
    blockedResellers: number;
  };
  refreshLiveData: () => void;
  isLoadingLive: boolean;
  onOpenQuickTest?: () => void;
}

export const XtreamClassicDashboard: React.FC<XtreamClassicDashboardProps> = ({
  profile,
  customers,
  resellers,
  bouquets,
  metrics,
  refreshLiveData,
  isLoadingLive,
  onOpenQuickTest
}) => {
  const brand = useBrandConfig();
  const navigate = useNavigate();
  const [copiedEpg, setCopiedEpg] = useState(false);

  // Estados para Ativação de Aplicativo Parceiro sob Demanda
  const [activationTargetApp, setActivationTargetApp] = useState<{ id: string; name: string } | null>(null);
  const [activationCustomer, setActivationCustomer] = useState<any | null>(null);
  const [showCustomerPicker, setShowCustomerPicker] = useState(false);
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [appFilter, setAppFilter] = useState<'all' | 'integrated' | 'smart_tv' | 'mobile'>('all');

  // Conexões Ao Vivo Reais (para miniaturização de Últimos Acessos)
  const { liveConnections, disconnectLiveConnection } = useSigmaStore();
  const [droppingLiveId, setDroppingLiveId] = useState<string | null>(null);
  const [isSimulatingLive, setIsSimulatingLive] = useState(false);

  const liveCount = liveConnections.filter((c: any) => c.type === 'live' || !c.type).length;
  const movieCount = liveConnections.filter((c: any) => c.type === 'movie').length;
  const seriesCount = liveConnections.filter((c: any) => c.type === 'series').length;

  const handleDisconnectLive = async (id: string, username: string) => {
    if (!window.confirm(`Deseja realmente derrubar a conexão de @${username}?`)) {
      return;
    }
    setDroppingLiveId(id || username);
    try {
      await disconnectLiveConnection(id, username);
      refreshLiveData();
    } catch {}
    finally {
      setDroppingLiveId(null);
    }
  };

  const handleSimulateLiveTest = async () => {
    setIsSimulatingLive(true);
    try {
      await fastCdnApi.postAction('simular_conexao', {});
      await refreshLiveData();
    } catch {}
    finally {
      setIsSimulatingLive(false);
    }
  };

  const partnerAppsList = useMemo(() => {
    const list: Array<{
      id: string;
      name: string;
      tagline: string;
      portalUrl: string;
      platform: string;
      badge: string;
      badgeColor: string;
      iconType: 'tv' | 'mobile' | 'web';
      canActivate: boolean;
      category: 'integrated' | 'smart_tv' | 'mobile' | 'brand';
    }> = [];

    // 1. Aplicativos Oficiais da Franquia (se configurados na personalização)
    if (brand.primaryApkUrl || brand.playStoreUrl) {
      list.push({
        id: 'brand_apk',
        name: `${brand.appName} - App Oficial Android`,
        tagline: 'Aplicativo APK oficial próprio da sua franquia para Android TV, TV Box e celular',
        portalUrl: brand.primaryApkUrl || brand.playStoreUrl || '#',
        platform: 'Android TV / TV Box / Celular',
        badge: 'App Oficial',
        badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
        iconType: 'mobile',
        canActivate: false,
        category: 'brand'
      });
    }

    if (brand.webPlayerUrl) {
      list.push({
        id: 'brand_web',
        name: `WebPlayer Direto (${brand.appName})`,
        tagline: 'Assista instantaneamente no navegador do computador, notebook ou Smart TV',
        portalUrl: brand.webPlayerUrl,
        platform: 'Navegador Web (Chrome, Edge, Safari)',
        badge: 'Web Oficial',
        badgeColor: 'bg-purple-50 text-purple-700 border-purple-200',
        iconType: 'web',
        canActivate: false,
        category: 'brand'
      });
    }

    // 2. Aplicativos Parceiros Oficiais e Homologados do Painel
    list.push(
      {
        id: 'maxplayer',
        name: 'MaxPlayer IPTV',
        tagline: 'Integração nativa no painel — ativação instantânea com usuário e senha do cliente',
        portalUrl: 'https://my.maxplayer.tv/',
        platform: 'Smart TVs, Android, Fire TV, iOS',
        badge: 'Ativação Nativa',
        badgeColor: 'bg-cyan-50 text-cyan-700 border-cyan-200',
        iconType: 'tv',
        canActivate: true,
        category: 'integrated'
      },
      {
        id: '10',
        name: 'IBO Player (IBO REVENDA)',
        tagline: 'Ativação rápida via endereço MAC para Smart TVs Samsung, LG, Android e Roku',
        portalUrl: 'https://iboplayer.com/',
        platform: 'Samsung Tizen, LG webOS, Android',
        badge: 'Smart TVs LG / Samsung',
        badgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
        iconType: 'tv',
        canActivate: true,
        category: 'smart_tv'
      },
      {
        id: '22',
        name: 'IBONEW Player',
        tagline: 'Nova geração do IBO Player com carregamento ultrarrápido e interface moderna',
        portalUrl: 'https://iboplayer.com/',
        platform: 'Smart TVs & Android TV',
        badge: 'Nova Geração',
        badgeColor: 'bg-orange-50 text-orange-700 border-orange-200',
        iconType: 'tv',
        canActivate: true,
        category: 'smart_tv'
      },
      {
        id: '12',
        name: 'VU Player Pro (VU REVENDA)',
        tagline: 'Ativação por MAC com suporte avançado a EPG dinâmico, logos de canais e categorias',
        portalUrl: 'https://vuplayer.pro/',
        platform: 'Samsung, LG, Android TV',
        badge: 'EPG Avançado',
        badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        iconType: 'tv',
        canActivate: true,
        category: 'smart_tv'
      },
      {
        id: '15',
        name: 'UNI Player (UNI REVENDA)',
        tagline: 'Interface leve e moderna com troca rápida de canais para TV Box e Smart TVs',
        portalUrl: 'https://uniplayer.net/',
        platform: 'Android TV & Smart TVs',
        badge: 'Ultra Leve',
        badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
        iconType: 'tv',
        canActivate: true,
        category: 'smart_tv'
      },
      {
        id: '17',
        name: 'TV ROKU (GPC PRO)',
        tagline: 'Aplicativo homologado e desenvolvido exclusivamente para televisores Roku TV',
        portalUrl: 'https://channelstore.roku.com/',
        platform: 'Roku OS',
        badge: 'Homologado Roku',
        badgeColor: 'bg-violet-50 text-violet-700 border-violet-200',
        iconType: 'tv',
        canActivate: true,
        category: 'smart_tv'
      },
      {
        id: '18',
        name: 'GPC PRO ANDROID',
        tagline: 'Player parceiro otimizado para Android TV, TV Box e dispositivos móveis',
        portalUrl: 'https://play.google.com/store/search?q=gpc+pro&c=apps',
        platform: 'Android TV & Celular',
        badge: 'Android Oficial',
        badgeColor: 'bg-teal-50 text-teal-700 border-teal-200',
        iconType: 'mobile',
        canActivate: true,
        category: 'mobile'
      },
      {
        id: '21',
        name: 'Gerencia Max',
        tagline: 'Player parceiro com sincronização automática e controle centralizado',
        portalUrl: 'https://gerenciamax.com/',
        platform: 'Smart TVs e TV Box',
        badge: 'Parceiro Integrado',
        badgeColor: 'bg-sky-50 text-sky-700 border-sky-200',
        iconType: 'tv',
        canActivate: true,
        category: 'integrated'
      },
      {
        id: '13',
        name: 'Facilita & Zone X',
        tagline: 'Players parceiros otimizados para aparelhos e Smart TVs de baixo consumo',
        portalUrl: 'https://iboplayer.com/',
        platform: 'TV Box e Smart TVs',
        badge: 'Econômico',
        badgeColor: 'bg-rose-50 text-rose-700 border-rose-200',
        iconType: 'tv',
        canActivate: true,
        category: 'smart_tv'
      }
    );

    return list;
  }, [brand]);

  const filteredPartnerApps = useMemo(() => {
    if (appFilter === 'all') return partnerAppsList;
    if (appFilter === 'integrated') return partnerAppsList.filter(a => a.canActivate);
    if (appFilter === 'smart_tv') return partnerAppsList.filter(a => a.category === 'smart_tv');
    if (appFilter === 'mobile') return partnerAppsList.filter(a => a.category === 'mobile' || a.category === 'brand');
    return partnerAppsList;
  }, [partnerAppsList, appFilter]);

  const handleOpenAppActivation = (app: { id: string; name: string }) => {
    setActivationTargetApp(app);
    if (customers.length === 1) {
      setActivationCustomer(customers[0]);
    } else {
      setShowCustomerPicker(true);
    }
  };

  const [showEpgPassword, setShowEpgPassword] = useState(false);
  const cleanUsername = profile?.username || 'usuario';
  const cleanPassword = profile?.password || '';
  const actualEpgUrl = `${APP_CONFIG.panelUrl || window.location.origin}/xmltv.php?username=${encodeURIComponent(cleanUsername)}&password=${encodeURIComponent(cleanPassword)}`;
  const maskedEpgUrl = `${APP_CONFIG.panelUrl || window.location.origin}/xmltv.php?username=${encodeURIComponent(cleanUsername)}&password=••••••••`;
  const displayedEpgUrl = showEpgPassword ? actualEpgUrl : maskedEpgUrl;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedEpg(true);
    setTimeout(() => setCopiedEpg(false), 2000);
  };

  // 5 últimos clientes adicionados
  const lastAddedCustomers = [...customers]
    .sort((a, b) => new Date(b.created_at || b.createdAt || 0).getTime() - new Date(a.created_at || a.createdAt || 0).getTime())
    .slice(0, 5);

  // 5 últimos acessos (clientes com last_activity ou ativos)
  const lastActiveCustomers = [...customers]
    .filter(c => c.last_activity || c.status === 'active')
    .slice(0, 5);

  return (
    <div className="space-y-4 sm:space-y-5 font-sans text-[#2c3e50] select-none">
      
      {/* ─── BARRA DE DADOS SUPERIOR (ESTILO XTREAM SERVER CLÁSSICO) ─── */}
      <div
        className="text-white px-5 py-4 rounded-xl shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-white/10"
        style={{ backgroundColor: brand.xtreamHeaderColor || '#2c3338' }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center"
            style={{
              backgroundColor: `${brand.xtreamPrimaryColor || '#00c0ef'}25`,
              border: `1px solid ${brand.xtreamPrimaryColor || '#00c0ef'}50`,
              color: brand.xtreamPrimaryColor || '#00c0ef'
            }}
          >
            <Tv className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-wide text-white leading-tight">
              Dashboard
            </h1>
            <p className="text-[11px] text-[#a0aab5]">
              Visão geral do servidor em tempo real • <span className="text-[#50CD89] font-medium">Servidor Online</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {onOpenQuickTest && (
            <button
              onClick={onOpenQuickTest}
              className="hover:opacity-95 text-white text-xs font-bold px-3.5 py-2 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer shadow-sm hover:shadow"
              style={{ backgroundColor: brand.xtreamCardActiveColor || '#00a65a' }}
            >
              <Plus className="w-4 h-4" />
              <span>Criar Teste Rápido</span>
            </button>
          )}

          <button
            onClick={refreshLiveData}
            disabled={isLoadingLive}
            title="Sincronizar dados do servidor"
            className="bg-black/30 hover:bg-black/40 text-white text-xs font-semibold px-3 py-2 rounded-lg flex items-center gap-1.5 border border-white/15 transition-all cursor-pointer disabled:opacity-50"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isLoadingLive ? 'animate-spin' : ''}`} style={{ color: brand.xtreamPrimaryColor || '#00c0ef' }} />
            <span className="hidden sm:inline">Sincronizar</span>
          </button>
        </div>
      </div>

      {/* ─── GRID DE CARDS COLORIDOS SÓLIDOS (DADOS 100% REAIS, COMPACTO E ELEGANTE) ─── */}
      <div className="bg-white rounded-xl border border-gray-200/80 p-3 sm:p-3.5 shadow-xs">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
          
          {/* 1. CLIENTES CADASTRADOS */}
          <div
            onClick={() => navigate('/customers')}
            className="rounded-xl p-2.5 sm:p-3 text-white shadow-2xs hover:shadow-md transition-all cursor-pointer relative overflow-hidden group"
            style={{ backgroundColor: brand.xtreamCardClientsColor || brand.xtreamPrimaryColor || '#00c0ef' }}
          >
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0">
                <Users className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <div className="text-right">
                <div className="text-[10px] font-bold uppercase tracking-wider text-white/90">
                  CLIENTES
                </div>
                <div className="text-xl sm:text-2xl font-black text-white mt-0.5 leading-none">
                  {metrics.totalClients}
                </div>
              </div>
            </div>
            <div className="mt-2 pt-1 border-t border-white/20 flex items-center justify-between text-[10px] text-white/90 font-medium">
              <span>Ver todos</span>
              <span className="group-hover:translate-x-1 transition-transform">→</span>
            </div>
          </div>

          {/* 2. CLIENTES ATIVOS */}
          <div
            onClick={() => navigate('/customers')}
            className="rounded-xl p-2.5 sm:p-3 text-white shadow-2xs hover:shadow-md transition-all cursor-pointer relative overflow-hidden group"
            style={{ backgroundColor: brand.xtreamCardActiveColor || '#00a65a' }}
          >
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0">
                <UserCheck className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <div className="text-right">
                <div className="text-[10px] font-bold uppercase tracking-wider text-white/90">
                  ATIVOS
                </div>
                <div className="text-xl sm:text-2xl font-black text-white mt-0.5 leading-none">
                  {metrics.activeClients}
                </div>
              </div>
            </div>
            <div className="mt-2 pt-1 border-t border-white/20 flex items-center justify-between text-[10px] text-white/90 font-medium">
              <span>Ver ativos</span>
              <span className="group-hover:translate-x-1 transition-transform">→</span>
            </div>
          </div>

          {/* 3. CLIENTES BLOQUEADOS / VENCIDOS */}
          <div
            onClick={() => navigate('/customers')}
            className="rounded-xl p-2.5 sm:p-3 text-white shadow-2xs hover:shadow-md transition-all cursor-pointer relative overflow-hidden group"
            style={{ backgroundColor: brand.xtreamCardExpiredColor || '#dd4b39' }}
          >
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0">
                <UserX className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <div className="text-right">
                <div className="text-[10px] font-bold uppercase tracking-wider text-white/90">
                  BLOQUEADOS
                </div>
                <div className="text-xl sm:text-2xl font-black text-white mt-0.5 leading-none">
                  {metrics.expiredClients}
                </div>
              </div>
            </div>
            <div className="mt-2 pt-1 border-t border-white/20 flex items-center justify-between text-[10px] text-white/90 font-medium">
              <span>Ver vencidos</span>
              <span className="group-hover:translate-x-1 transition-transform">→</span>
            </div>
          </div>

          {/* 4. TESTES CADASTRADOS */}
          <div
            onClick={() => navigate('/customers')}
            className="rounded-xl p-2.5 sm:p-3 text-white shadow-2xs hover:shadow-md transition-all cursor-pointer relative overflow-hidden group"
            style={{ backgroundColor: brand.xtreamCardTrialColor || '#f39c12' }}
          >
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0">
                <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <div className="text-right">
                <div className="text-[10px] font-bold uppercase tracking-wider text-white/90">
                  TESTES
                </div>
                <div className="text-xl sm:text-2xl font-black text-white mt-0.5 leading-none">
                  {metrics.trialClients}
                </div>
              </div>
            </div>
            <div className="mt-2 pt-1 border-t border-white/20 flex items-center justify-between text-[10px] text-white/90 font-medium">
              <span>Ver testes</span>
              <span className="group-hover:translate-x-1 transition-transform">→</span>
            </div>
          </div>

          {/* 5. CONEXÕES AO VIVO */}
          <div
            onClick={() => navigate('/customers/live-connections')}
            className="rounded-xl p-2.5 sm:p-3 text-white shadow-2xs hover:shadow-md transition-all cursor-pointer relative overflow-hidden group"
            style={{ backgroundColor: brand.xtreamCardLiveColor || '#0073b7' }}
          >
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0 relative">
                <Activity className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                {liveConnections.length > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                )}
              </div>
              <div className="text-right">
                <div className="text-[10px] font-bold uppercase tracking-wider text-white/90">
                  AO VIVO
                </div>
                <div className="text-xl sm:text-2xl font-black text-white mt-0.5 leading-none">
                  {liveConnections.length}
                </div>
              </div>
            </div>
            <div className="mt-2 pt-1 border-t border-white/20 flex items-center justify-between text-[10px] text-white/90 font-medium">
              <span>Em tempo real</span>
              <span className="group-hover:translate-x-1 transition-transform">→</span>
            </div>
          </div>

          {/* 6. VENDEDORES CADASTRADOS */}
          <div
            onClick={() => navigate('/resellers')}
            className="rounded-xl p-2.5 sm:p-3 text-white shadow-2xs hover:shadow-md transition-all cursor-pointer relative overflow-hidden group"
            style={{ backgroundColor: brand.xtreamCardResellersColor || '#605ca8' }}
          >
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0">
                <Users className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <div className="text-right">
                <div className="text-[10px] font-bold uppercase tracking-wider text-white/90">
                  REVENDAS
                </div>
                <div className="text-xl sm:text-2xl font-black text-white mt-0.5 leading-none">
                  {metrics.totalSubresellers}
                </div>
              </div>
            </div>
            <div className="mt-2 pt-1 border-t border-white/20 flex items-center justify-between text-[10px] text-white/90 font-medium">
              <span>Ver revendas</span>
              <span className="group-hover:translate-x-1 transition-transform">→</span>
            </div>
          </div>

          {/* 7. VENDEDORES ATIVOS */}
          <div
            onClick={() => navigate('/resellers')}
            className="rounded-xl p-2.5 sm:p-3 text-white shadow-2xs hover:shadow-md transition-all cursor-pointer relative overflow-hidden group"
            style={{ backgroundColor: brand.xtreamCardActiveColor || '#2e7d32' }}
          >
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0">
                <UserCheck className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <div className="text-right">
                <div className="text-[10px] font-bold uppercase tracking-wider text-white/90">
                  REV. ATIVAS
                </div>
                <div className="text-xl sm:text-2xl font-black text-white mt-0.5 leading-none">
                  {metrics.activeResellers}
                </div>
              </div>
            </div>
            <div className="mt-2 pt-1 border-t border-white/20 flex items-center justify-between text-[10px] text-white/90 font-medium">
              <span>Com saldo</span>
              <span className="group-hover:translate-x-1 transition-transform">→</span>
            </div>
          </div>

          {/* 8. VENDEDORES BLOQUEADOS */}
          <div
            onClick={() => navigate('/resellers')}
            className="rounded-xl p-2.5 sm:p-3 text-white shadow-2xs hover:shadow-md transition-all cursor-pointer relative overflow-hidden group"
            style={{ backgroundColor: brand.xtreamCardExpiredColor || '#d9534f' }}
          >
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0">
                <Lock className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <div className="text-right">
                <div className="text-[10px] font-bold uppercase tracking-wider text-white/90">
                  REV. BLOQUEADAS
                </div>
                <div className="text-xl sm:text-2xl font-black text-white mt-0.5 leading-none">
                  {metrics.blockedResellers}
                </div>
              </div>
            </div>
            <div className="mt-2 pt-1 border-t border-white/20 flex items-center justify-between text-[10px] text-white/90 font-medium">
              <span>Ver bloqueadas</span>
              <span className="group-hover:translate-x-1 transition-transform">→</span>
            </div>
          </div>

        </div>
      </div>

      {/* ─── SEÇÃO INFERIOR 1: ÚLTIMOS ADICIONADOS & ÚLTIMOS ACESSOS ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
        
        {/* Card: Últimos Adicionados */}
        <div className="bg-white rounded-xl border border-gray-200/80 shadow-sm overflow-hidden flex flex-col">
          <div className="py-3 px-5 border-b border-gray-100 bg-[#fafbfc] flex items-center justify-between">
            <h3 className="font-bold text-sm text-[#343a40]">Últimos Adicionados</h3>
            <span className="text-[11px] text-[#6c757d]">{lastAddedCustomers.length} recentes</span>
          </div>
          <div className="p-0 overflow-x-auto max-h-[320px] overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="bg-[#fafbfc] border-b border-gray-100 text-[#6c757d] font-bold text-[10px] uppercase sticky top-0 z-10">
                <tr>
                  <th className="py-2.5 px-3 text-left w-20">Logotipo</th>
                  <th className="py-2.5 px-3 text-left">Nome de Usuário</th>
                  <th className="py-2.5 px-3 text-right">Plano</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {lastAddedCustomers.length > 0 ? (
                  lastAddedCustomers.map((cust, idx) => (
                    <tr key={cust.id || idx} className="hover:bg-gray-50/80 transition-colors">
                      <td className="py-2.5 px-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-black text-xs border border-blue-100">
                          {cust.username ? cust.username.charAt(0).toUpperCase() : 'C'}
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-[#212529]">{cust.username}</div>
                        <div className="text-[10px] text-[#6c757d]">
                          {cust.name || (cust.is_trial ? 'Conta de Teste' : 'Assinatura Ativa')}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                          cust.is_trial
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {cust.is_trial ? 'Teste' : 'Cliente'}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="py-6 text-center text-[#adb5bd] text-xs">
                      Nenhum cliente cadastrado recentemente.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Card: Últimos Acessos (Versão Miniaturizada de Conexões Ao Vivo) */}
        <div className="bg-white rounded-xl border border-gray-200/80 shadow-sm overflow-hidden flex flex-col">
          <div className="py-3 px-5 border-b border-gray-100 bg-[#fafbfc] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm text-[#343a40]">Últimos Acessos</h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {liveConnections.length} ao vivo
              </span>
            </div>
            <Link
              to="/customers/live-connections"
              className="text-xs text-[#0073b7] hover:underline font-bold flex items-center gap-1"
            >
              <span>Ver todas</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Mini-contador de Conteúdo Assistido */}
          {liveConnections.length > 0 && (
            <div className="px-4 py-1.5 border-b border-gray-100 bg-gray-50/60 flex items-center gap-2 text-[11px] overflow-x-auto">
              <span className="text-gray-500 font-medium text-[10px]">Ao vivo:</span>
              <span className="px-1.5 py-0.2 rounded bg-cyan-50 text-cyan-700 border border-cyan-200 font-semibold flex items-center gap-1 text-[10px]">
                <Tv className="w-2.5 h-2.5 text-cyan-600" /> {liveCount} canais
              </span>
              <span className="px-1.5 py-0.2 rounded bg-purple-50 text-purple-700 border border-purple-200 font-semibold flex items-center gap-1 text-[10px]">
                <Film className="w-2.5 h-2.5 text-purple-600" /> {movieCount} filmes
              </span>
              <span className="px-1.5 py-0.2 rounded bg-amber-50 text-amber-700 border border-amber-200 font-semibold flex items-center gap-1 text-[10px]">
                <Clapperboard className="w-2.5 h-2.5 text-amber-600" /> {seriesCount} séries
              </span>
            </div>
          )}

          <div className="p-0 overflow-x-auto max-h-[320px] overflow-y-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-[#fafbfc] border-b border-gray-100 text-[#6c757d] font-bold text-[10px] uppercase sticky top-0 z-10">
                <tr>
                  <th className="py-2.5 px-3">Cliente</th>
                  <th className="py-2.5 px-3">Conteúdo Assistido</th>
                  <th className="py-2.5 px-3">Velocidade</th>
                  <th className="py-2.5 px-3">Player / IP</th>
                  <th className="py-2.5 px-3 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {liveConnections.length > 0 ? (
                  liveConnections.slice(0, 6).map((c: any) => (
                    <tr key={c.id || c.username} className="hover:bg-gray-50/80 transition-colors">
                      {/* Cliente */}
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center font-black text-xs shrink-0">
                            {c.username ? c.username.charAt(0).toUpperCase() : 'U'}
                          </div>
                          <div className="min-w-0">
                            <span className="font-bold text-gray-900 block truncate leading-tight">
                              {c.customer_name || c.name || c.username}
                            </span>
                            <span className="text-[10px] text-cyan-600 font-mono block">
                              @{c.username}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Conteúdo */}
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1.5 min-w-0 max-w-[170px]">
                          {c.type === 'movie' ? (
                            <Film className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                          ) : c.type === 'series' ? (
                            <Clapperboard className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                          ) : (
                            <Tv className="w-3.5 h-3.5 text-cyan-500 shrink-0" />
                          )}
                          <div className="min-w-0 truncate">
                            <span className="font-semibold text-gray-800 block truncate" title={c.stream_title}>
                              {c.stream_title || 'Canal Ao Vivo'}
                            </span>
                            <span className={`text-[9px] px-1 py-0.2 rounded font-bold uppercase ${
                              c.type === 'movie'
                                ? 'bg-purple-100 text-purple-700'
                                : c.type === 'series'
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-cyan-100 text-cyan-700'
                            }`}>
                              {c.type === 'movie' ? 'Filme' : c.type === 'series' ? 'Série' : 'Ao Vivo'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Velocidade */}
                      <td className="py-2.5 px-3">
                        <span className="text-[11px] font-mono font-semibold text-emerald-600 flex items-center gap-1">
                          <Zap className="w-3 h-3 text-emerald-500" />
                          {c.speed || c.bitrate || '10.5 Mbps'}
                        </span>
                      </td>

                      {/* Dispositivo / IP */}
                      <td className="py-2.5 px-3">
                        <div className="text-[11px] text-gray-700 font-medium truncate max-w-[110px]" title={c.player || c.user_agent}>
                          {c.player || (c.user_agent ? c.user_agent.split('/')[0] : 'IPTV Player')}
                        </div>
                        <span className="text-[10px] text-gray-400 font-mono block">
                          {c.ip_address || c.ip || '127.0.0.1'}
                        </span>
                      </td>

                      {/* Ação */}
                      <td className="py-2.5 px-3 text-right">
                        <button
                          onClick={() => handleDisconnectLive(c.id, c.username)}
                          disabled={droppingLiveId === (c.id || c.username)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors cursor-pointer disabled:opacity-50"
                          title="Derrubar conexão"
                        >
                          <Power className={`w-3.5 h-3.5 ${droppingLiveId === (c.id || c.username) ? 'animate-spin' : ''}`} />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-gray-400 text-xs">
                      <Activity className="w-7 h-7 mx-auto mb-1.5 text-gray-300 opacity-60" />
                      <span className="font-semibold block text-gray-600">Nenhuma conexão ativa transmitindo no momento.</span>
                      <span className="text-[11px] text-gray-400 mt-0.5 block">
                        Assim que um cliente abrir um canal, filme ou série, o stream aparecerá aqui em tempo real.
                      </span>
                      <div className="mt-3 flex items-center justify-center gap-2">
                        <button
                          onClick={handleSimulateLiveTest}
                          disabled={isSimulatingLive}
                          className="px-2.5 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md font-semibold flex items-center gap-1 transition-all cursor-pointer"
                        >
                          <Radio className="w-3 h-3 text-cyan-600" />
                          <span>{isSimulatingLive ? 'Simulando...' : 'Testar Conexão Ao Vivo'}</span>
                        </button>
                        <Link
                          to="/customers/live-connections"
                          className="px-2.5 py-1 text-xs bg-[#00c0ef]/10 hover:bg-[#00c0ef]/20 text-[#008cb0] rounded-md font-bold"
                        >
                          Tela Conexões
                        </Link>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* ─── SEÇÃO INFERIOR 2: SUGESTÕES DE APLICATIVOS & URL EPG ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
        
        {/* Card: Sugestões de aplicativos parceiros oficiais */}
        <div className="bg-white rounded-xl border border-gray-200/80 shadow-sm overflow-hidden flex flex-col">
          <div className="py-3 px-5 border-b border-gray-100 bg-[#fafbfc] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm text-[#343a40]">Sugestões de aplicativos parceiros</h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-50 text-cyan-700 border border-cyan-200 font-bold">
                {filteredPartnerApps.length} Apps Homologados
              </span>
            </div>
            <span className="text-[11px] text-gray-400 hidden sm:inline">
              Integração e Ativação no Painel
            </span>
          </div>

          {/* Filtros Rápidos */}
          <div className="px-4 py-2 border-b border-gray-100 bg-gray-50/60 flex items-center gap-1.5 overflow-x-auto text-[11px]">
            <button
              onClick={() => setAppFilter('all')}
              className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                appFilter === 'all'
                  ? 'bg-[#2c3338] text-white shadow-xs'
                  : 'text-gray-600 hover:bg-gray-200/60'
              }`}
            >
              Todos ({partnerAppsList.length})
            </button>
            <button
              onClick={() => setAppFilter('integrated')}
              className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                appFilter === 'integrated'
                  ? 'bg-[#00c0ef] text-white shadow-xs'
                  : 'text-gray-600 hover:bg-gray-200/60'
              }`}
            >
              Com Ativação Direta
            </button>
            <button
              onClick={() => setAppFilter('smart_tv')}
              className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                appFilter === 'smart_tv'
                  ? 'bg-[#0073b7] text-white shadow-xs'
                  : 'text-gray-600 hover:bg-gray-200/60'
              }`}
            >
              Smart TVs
            </button>
            <button
              onClick={() => setAppFilter('mobile')}
              className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                appFilter === 'mobile'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'text-gray-600 hover:bg-gray-200/60'
              }`}
            >
              Android / TV Box
            </button>
          </div>

          <div className="p-3.5 space-y-2 max-h-[360px] overflow-y-auto">
            {filteredPartnerApps.map((app) => (
              <div
                key={app.id}
                className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 transition-colors border border-gray-100 hover:border-gray-200"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-[#2c3338] text-white flex items-center justify-center text-xs font-bold shrink-0 shadow-xs">
                    {app.iconType === 'mobile' ? (
                      <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
                    ) : app.iconType === 'web' ? (
                      <Globe className="w-3.5 h-3.5 text-purple-400" />
                    ) : (
                      <Tv className="w-3.5 h-3.5 text-cyan-400" />
                    )}
                  </div>
                  <span className="font-bold text-xs text-[#212529] truncate">{app.name}</span>
                </div>

                {app.canActivate && (
                  <button
                    onClick={() => handleOpenAppActivation(app)}
                    className="px-2.5 py-1 text-[11px] bg-[#00c0ef]/10 hover:bg-[#00c0ef]/20 text-[#008cb0] border border-[#00c0ef]/30 rounded-md font-bold flex items-center gap-1 transition-all cursor-pointer shadow-2xs shrink-0"
                    title={`Ativar ${app.name} para um cliente`}
                  >
                    <Zap className="w-3 h-3 text-[#00c0ef]" />
                    <span>Ativar</span>
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Card: URL EPG */}
        <div className="bg-white rounded-xl border border-gray-200/80 shadow-sm overflow-hidden">
          <div className="py-3 px-5 border-b border-gray-100 bg-[#fafbfc]">
            <h3 className="font-bold text-sm text-[#343a40]">Guia de Programação (URL EPG)</h3>
          </div>
          <div className="p-5 space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#495057] mb-2">
                URL XMLTV para Sincronização Automática:
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={displayedEpgUrl}
                  className="flex-1 bg-[#f8f9fa] border border-[#ced4da] rounded-lg px-3.5 py-2.5 text-xs font-mono text-[#495057] focus:outline-none focus:border-[#00c0ef]"
                />
                <button
                  type="button"
                  onClick={() => setShowEpgPassword(!showEpgPassword)}
                  className="bg-gray-100 hover:bg-gray-200 border border-gray-300 text-gray-700 px-3 py-2.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer shrink-0"
                  title={showEpgPassword ? "Ocultar senha no link" : "Mostrar senha no link"}
                >
                  {showEpgPassword ? <EyeOff className="w-4 h-4 text-gray-600" /> : <Eye className="w-4 h-4 text-gray-600" />}
                </button>
                <button
                  type="button"
                  onClick={() => copyToClipboard(actualEpgUrl)}
                  className="bg-[#0073b7] hover:bg-[#005a92] text-white px-4 py-2.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 shadow-xs"
                  title="Copiar URL XMLTV funcional com credenciais"
                >
                  {copiedEpg ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedEpg ? 'Copiado!' : 'Copiar URL'}</span>
                </button>
              </div>
            </div>

            <p className="text-[11px] text-[#6c757d] leading-relaxed">
              Insira este link no campo EPG do seu aplicativo de IPTV (IPTV Smarters, TiviMate, XCIPTV, etc.) para carregar automaticamente as informações de programação de todos os canais ao vivo.
            </p>
          </div>
        </div>

      </div>

      {/* Modal de Seleção de Cliente para Ativação do Aplicativo */}
      {showCustomerPicker && activationTargetApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-md overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-[#fafbfc]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#00c0ef]/10 text-[#00a8d6] flex items-center justify-center">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900 leading-tight">
                    Ativar {activationTargetApp.name}
                  </h3>
                  <p className="text-[11px] text-gray-500">
                    Selecione o cliente que receberá a ativação
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowCustomerPicker(false);
                  setActivationTargetApp(null);
                  setCustomerSearchTerm('');
                }}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 border-b border-gray-100">
              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={customerSearchTerm}
                  onChange={e => setCustomerSearchTerm(e.target.value)}
                  placeholder="Pesquisar por usuário ou nome..."
                  className="w-full pl-9 pr-3 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:border-[#00c0ef] bg-gray-50 text-gray-800"
                  autoFocus
                />
              </div>
            </div>

            <div className="p-3 overflow-y-auto max-h-[50vh] space-y-1.5 divide-y divide-gray-50">
              {customers
                .filter(c => {
                  const term = customerSearchTerm.toLowerCase();
                  return (
                    (c.username || '').toLowerCase().includes(term) ||
                    (c.name || '').toLowerCase().includes(term)
                  );
                })
                .map((c, i) => (
                  <button
                    key={c.id || c.username || i}
                    onClick={() => {
                      setActivationCustomer(c);
                      setShowCustomerPicker(false);
                    }}
                    className="w-full p-2.5 rounded-xl hover:bg-cyan-50/60 border border-transparent hover:border-cyan-200 flex items-center justify-between text-left transition-colors cursor-pointer group"
                  >
                    <div>
                      <span className="font-bold text-xs text-gray-800 group-hover:text-cyan-800 block">
                        {c.name || c.username}
                      </span>
                      <span className="text-[11px] font-mono text-gray-500">
                        @{c.username}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                        c.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {c.status === 'active' ? 'Ativo' : 'Inativo'}
                      </span>
                      <span className="text-xs text-[#00c0ef] font-bold">Selecionar →</span>
                    </div>
                  </button>
                ))}

              {customers.length === 0 && (
                <div className="text-center py-6 text-gray-500 text-xs">
                  Nenhum cliente cadastrado no momento.
                  <div className="mt-3 flex justify-center gap-2">
                    <button
                      onClick={() => {
                        setShowCustomerPicker(false);
                        navigate('/customers/add');
                      }}
                      className="px-3 py-1.5 bg-[#00c0ef] text-white rounded-lg text-xs font-bold"
                    >
                      Cadastrar Cliente
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Ativação do Aplicativo Selecionado */}
      {activationCustomer && activationTargetApp && (
        <AppActivationModal
          customer={activationCustomer}
          initialAppType={activationTargetApp.id}
          onClose={() => {
            setActivationCustomer(null);
            setActivationTargetApp(null);
          }}
          onSuccess={() => {
            setActivationCustomer(null);
            setActivationTargetApp(null);
            refreshLiveData();
          }}
        />
      )}

    </div>
  );
};
