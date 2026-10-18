import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { Customer, Reseller, CreditTransaction, LiveConnection, Notice, SupportTicket, UserProfile, ResellerPricing, GlobalBillingSettings, ResellerInvoiceSummary, SubresellerDownstreamDetail, PartnerAppItemDetail, PanelGamificationRanking } from '../types';
import { fastCdnApi, FastCdnCliente, FastCdnSubRevenda } from '../services/fastcdn';
import { apiService, HierarchyResponse, HierarchyNode } from '../services/apiService';
import { APP_CONFIG, isHostedOnGithub } from '../config/appConfig';
import { MasterKeyStore, ResellerPassStore } from '../utils/auth';
import { isPanelMaster } from '../utils/panelAuth';
import { isCustomerActiveForBilling, isCustomerActive, parseExpiryDate, getCustomerPartnerApp, getCustomerPartnerApps, calculatePanelGamificationRanking } from '../utils/customerMetrics';
import { DEMO_PROFILE, DEMO_CUSTOMERS, DEMO_RESELLERS, DEMO_LIVE_CONNECTIONS, DEMO_TRANSACTIONS, DEMO_HIERARCHY, checkIsDedicatedDemoPanel } from '../utils/demoData';

export interface DeletedCustomerItem {
  id: string;
  username: string;
  server: string;
  deleted_at: string;
  reason: string;
  connections: number;
}

export interface SigmaStoreType {
  profile: UserProfile;
  customers: Customer[];
  resellers: Reseller[];
  hierarchyData: HierarchyResponse | null;
  transactions: CreditTransaction[];
  deletedCustomers: DeletedCustomerItem[];
  liveConnections: LiveConnection[];
  notices: Notice[];
  tickets: SupportTicket[];
  theme: 'dark' | 'light';
  apiKey: string;
  isAuthenticated: boolean;
  isLoadingLive: boolean;
  liveError: string | null;
  isLiveConnected: boolean;
  isDemo: boolean;
  enterDemoMode: () => void;
  toggleTheme: () => void;
  loginWithApiKey: (key: string, persist?: boolean) => Promise<boolean>;
  loginWithCredentials: (username: string, password: string, remember?: boolean) => Promise<{ success: boolean; message: string }>;
  logout: () => void;
  refreshLiveData: () => Promise<void>;
  fetchHierarchy: () => Promise<HierarchyResponse | null>;
  disconnectLiveConnection: (id: string, username: string) => Promise<{ success: boolean; message: string }>;
  // Actions
  addCustomer: (cust: any) => Promise<{ success: boolean; message: string; customer?: any }>;
  updateCustomer: (id: string, updates: Partial<Customer>) => Promise<{ success: boolean; message: string }>;
  deleteCustomer: (id: string, reason?: string) => Promise<{ success: boolean; message: string }>;
  restoreCustomer: (id: string) => void;
  renewCustomer: (id: string, months: number, days?: number) => Promise<{ success: boolean; message: string }>;
  addCourtesyDays: (customerId: string, days: number) => void;
  toggleBlockCustomer: (id: string) => Promise<{ success: boolean; message: string }>;
  reactivateMaxPlayer: (loginOrId: string, days?: number) => Promise<{ success: boolean; message: string }>;
  addReseller: (res: any) => Promise<{ success: boolean; message: string }>;
  deleteReseller: (idOrUsername: string) => Promise<{ success: boolean; message: string }>;
  addCreditsToReseller: (resellerId: string, amount: number, notes?: string) => Promise<{ success: boolean; message: string }>;
  toggleBlockReseller: (id: string) => Promise<{ success: boolean; message: string }>;
  addTicket: (title: string, category: string, message: string) => void;
  setTwoFactor: (enabled: boolean) => void;
  updateProfile: (updates: Partial<UserProfile>) => void;
  // Faturamento e Cobrança
  resellerPricings: Record<string, ResellerPricing>;
  globalBillingSettings: GlobalBillingSettings;
  invoicePayments: Record<string, { status: 'PENDING' | 'PAID'; paid_at?: string }>;
  updateResellerPricing: (username: string, pricing: Partial<ResellerPricing>) => Promise<void> | void;
  updateGlobalBillingSettings: (settings: Partial<GlobalBillingSettings>) => void;
  calculateResellerInvoice: (resellerUsername: string, monthKey?: string) => ResellerInvoiceSummary;
  toggleInvoicePaid: (resellerUsername: string, monthKey?: string) => void;
  saveCustomerPrice: (username: string, price: number) => Promise<void>;
  rankingData: PanelGamificationRanking;
  setResellerBotAccess: (userIdOrUsername: string, enabled: boolean, monthlyCredits?: number) => Promise<{ success: boolean; message: string }>;
}


export const getSavedCustomerPrice = (username: string): number => {
  try {
    const map = JSON.parse(localStorage.getItem('sigma_customer_prices') || '{}');
    return Number(map[(username || '').toLowerCase()]) || 0;
  } catch { return 0; }
};

export const setSavedCustomerPrice = (username: string, price: number) => {
  try {
    const map = JSON.parse(localStorage.getItem('sigma_customer_prices') || '{}');
    map[(username || '').toLowerCase()] = Number(price) || 0;
    localStorage.setItem('sigma_customer_prices', JSON.stringify(map));
  } catch {}
};

const SigmaStoreContext = createContext<SigmaStoreType | undefined>(undefined);

const mapFastCdnClientToCustomer = (c: FastCdnCliente): Customer => {
  const rawDono = (c as any).reseller_username || (c as any).dono_username || (c as any).dono || (c as any).owner || (c as any).revendedor || (c as any).criado_por || '';
  const isDirect = !rawDono || rawDono.toLowerCase() === 'revendedor' || rawDono.toLowerCase() === 'admin' || rawDono.toLowerCase() === 'master' || rawDono.toLowerCase() === 'andre2056' || rawDono.toLowerCase() === 'direto';
  const finalReseller = isDirect ? 'Andre2056' : rawDono;

  const isTestUser = Boolean(c.is_test || (c as any).isTest);
  let status: 'ACTIVE' | 'EXPIRED' | 'BLOCKED' | 'TRIAL' = 'EXPIRED';
  if (c.status === 'blocked' || c.status === 'suspended') {
    status = 'BLOCKED';
  } else if (isTestUser) {
    status = (c.status === 'active' || !c.status) ? 'TRIAL' : 'EXPIRED';
  } else if (c.status === 'active') {
    status = 'ACTIVE';
  }

  // Se o cliente não foi marcado ativamente pelo backend, valida vencimento
  const expiryRaw = c.vencimento || c.expiresAt || (c as any).expires_at;
  if (expiryRaw && c.status !== 'active') {
    const parsedExp = parseExpiryDate({ expires_at: c.vencimento || '', expiresAt: c.expiresAt } as any);
    if (parsedExp && parsedExp.getTime() < Date.now()) {
      status = 'EXPIRED';
    }
  }

  const rawSubVal = (c as any).subscription_value !== undefined ? (c as any).subscription_value : (c as any).subscriptionValue;
  const parsedPrice = Number(rawSubVal);
  const clientPrice = (!isNaN(parsedPrice) && parsedPrice > 0) ? parsedPrice : getSavedCustomerPrice(c.login_usuario || c.id || '');

  return {
    id: c.id || c.login_usuario || `user_${Date.now()}`,
    username: c.login_usuario || c.id || 'desconhecido',
    password: c.senha_usuario,
    name: c.nome_usuario || c.login_usuario || 'Desconhecido',
    whatsapp: c.whatsapp || '',
    status,
    created_at: c.criado_em || new Date().toISOString(),
    expires_at: c.vencimento || (c.expiresAt ? new Date(c.expiresAt).toLocaleDateString('pt-BR') : '-'),
    expiresAt: c.expiresAt,
    server: APP_CONFIG.defaultServerName,
    server_id: 'fastcdn_v1',
    server_name: APP_CONFIG.defaultServerName,
    package: (c as any).package_name || (c as any).package || (c as any).bouquet_name || (c.bouquet_id === 'bq_sem_adulto' ? 'COMPLETO S/ ADULTOS' : (c.bouquet_id === 'bq_leve_10k_4k' ? 'COMPLETO S/ ADULTOS (TV ANTIGA - 10K/4K)' : (c.bouquet_id === 'bq_canais' ? 'CANAIS' : 'COMPLETO C/ ADULTOS'))),
    package_id: c.bouquet_id || (c as any).package_id || APP_CONFIG.defaultBouquetId,
    package_name: (c as any).package_name || (c as any).package || (c as any).bouquet_name || (c.bouquet_id === 'bq_sem_adulto' ? 'COMPLETO S/ ADULTOS' : (c.bouquet_id === 'bq_leve_10k_4k' ? 'COMPLETO S/ ADULTOS (TV ANTIGA - 10K/4K)' : (c.bouquet_id === 'bq_canais' ? 'CANAIS' : 'COMPLETO C/ ADULTOS'))),
    max_connections: Number(c.conectado || (c as any).maxConnections || (c as any).max_connections || 1),
    active_connections: Number(c.telas_ativas !== undefined ? c.telas_ativas : ((c as any).activeScreens || (c as any).active_connections || 0)),
    connections_count: Number(c.telas_ativas !== undefined ? c.telas_ativas : ((c as any).activeScreens || (c as any).active_connections || 0)),
    connections_max: Number(c.conectado || (c as any).maxConnections || (c as any).max_connections || 1),
    conectado: Number(c.conectado || (c as any).maxConnections || (c as any).max_connections || 1),
    telas_ativas: Number(c.telas_ativas !== undefined ? c.telas_ativas : ((c as any).activeScreens || (c as any).active_connections || 0)),
    reseller_username: finalReseller,
    reseller_id: isDirect ? 'master' : `res_${finalReseller}`,
    dono: rawDono || (isDirect ? 'Andre2056' : finalReseller),
    notes: c.notas || (c as any).notes || '',
    subscription_value: clientPrice,
    is_trial: isTestUser,
    m3u_url: c.m3u_url,
    epg_url: c.epg_url,
    partnerApp: (c as any).partnerApp || (c as any).partner_app || (c as any).partner || null,
    partner_app: (c as any).partnerApp || (c as any).partner_app || (c as any).partner || null,
    partnerDevices: Array.isArray((c as any).partnerDevices) ? (c as any).partnerDevices : ((c as any).partnerApp ? [(c as any).partnerApp] : []),
    mac: ((c as any).partnerApp && (c as any).partnerApp.mac) || ((c as any).partner_app && (c as any).partner_app.mac) || (c as any).mac || ''
  };
};

export const isResellerUnlimitedCredits = (s: any): boolean => {
  if (!s) return false;
  if (s.creditos_ilimitados === true || s.creditos_ilimitados === 'true' || s.creditos_ilimitados === 1) return true;
  if (s.unlimitedCredits === true || s.unlimitedCredits === 'true') return true;
  if (s.unlimited_credits === true || s.unlimited_credits === 'true') return true;
  if (typeof s.creditos === 'string' && (s.creditos.toLowerCase() === 'ilimitado' || s.creditos.toLowerCase() === 'unlimited')) return true;
  if (typeof s.credits === 'string' && (s.credits.toLowerCase() === 'ilimitado' || s.credits.toLowerCase() === 'unlimited')) return true;
  const numCredits = Number(s.creditos !== undefined ? s.creditos : s.credits);
  if (!isNaN(numCredits) && (numCredits >= 99999 || numCredits < 0)) return true;
  return false;
};

const mapFastCdnSubRevendaToReseller = (s: any): Reseller => {
  const username = s.username || s.login_usuario || s.id || 'desconhecido';
  const name = s.name || s.nome_usuario || username;
  const isUnlimited = isResellerUnlimitedCredits(s);
  const rawCredits = s.creditos !== undefined ? s.creditos : (s.credits || 0);
  const credits = isUnlimited ? 999999 : (typeof rawCredits === 'number' ? rawCredits : Number(rawCredits) || 0);
  const customersCount = s.total_clientes !== undefined
    ? s.total_clientes
    : (s.clientes_count !== undefined ? s.clientes_count : (s.stats?.total_clientes || 0));
  const expiredCount = s.clientes_expirados !== undefined
    ? s.clientes_expirados
    : (s.stats?.clientes_expirados !== undefined ? s.stats.clientes_expirados : 0);
  const activeCustomersCount = s.clientes_ativos !== undefined
    ? s.clientes_ativos
    : (s.stats?.clientes_ativos !== undefined ? s.stats.clientes_ativos : Math.max(0, customersCount - expiredCount));
  const subCount = s.sub_revendas_filhas !== undefined
    ? s.sub_revendas_filhas
    : (s.total_sub_revendas !== undefined ? s.total_sub_revendas : (s.stats?.total_sub_revendas || 0));

  return {
    id: s.id || `sub_${username}`,
    username,
    name,
    whatsapp: s.whatsapp || '',
    status: (s.status === 'active' || s.status === 'ACTIVE') ? 'ACTIVE' : 'BLOCKED',
    credits,
    creditos_ilimitados: isUnlimited,
    customers_count: customersCount,
    active_customers_count: activeCustomersCount,
    clientes_expirados: expiredCount,
    subresellers_count: subCount,
    sub_revendas_filhas: subCount,
    pai_id: s.pai_id,
    pai_username: s.pai_username,
    linhagem: Array.isArray(s.linhagem) ? s.linhagem : (s.pai_username ? [s.pai_username, username] : []),
    nivel: s.nivel || 1,
    ultimo_acesso: s.ultimo_acesso || null,
    notas: s.notas || s.notes || '',
    bot_access: Boolean(s.botAccess !== undefined ? s.botAccess : (s.bot_access !== undefined ? s.bot_access : false)),
    botAccess: Boolean(s.botAccess !== undefined ? s.botAccess : (s.bot_access !== undefined ? s.bot_access : false)),
    bot_monthly_credits: Number(s.botMonthlyCredits !== undefined ? s.botMonthlyCredits : (s.bot_monthly_credits || 0)),
    botMonthlyCredits: Number(s.botMonthlyCredits !== undefined ? s.botMonthlyCredits : (s.bot_monthly_credits || 0)),
    created_at: s.criado_em || s.created_at || new Date().toISOString()
  };
};

const initialEmptyProfile: UserProfile = {
  id: '',
  username: '',
  role: 'reseller',
  credits: 0,
  membership_expiry_date: '-',
  online_users_count: 0,
  two_factor_enabled: false
};

export const SigmaStoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isDedicatedDemo = checkIsDedicatedDemoPanel();

  const [apiKey, setApiKey] = useState<string>(() => MasterKeyStore.get() || APP_CONFIG.defaultApiKey);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    if (isDedicatedDemo) return true;
    return typeof window !== 'undefined' && !!localStorage.getItem('sigma_session_user');
  });
  const [isLoadingLive, setIsLoadingLive] = useState(false);
  const [liveError, setLiveError] = useState<string | null>(null);
  const [isLiveConnected, setIsLiveConnected] = useState(isDedicatedDemo);

  const [isDemo, setIsDemo] = useState<boolean>(() => {
    return isDedicatedDemo || (typeof window !== 'undefined' && (
      localStorage.getItem('sigma_is_demo') === 'true' ||
      localStorage.getItem('sigma_session_user') === 'demo'
    ));
  });

  // Estados padrão rigorosamente em branco (sem mockups nem dados persistidos de sessões anteriores)
  const [profile, setProfile] = useState<UserProfile>(() => {
    try {
      const savedUser = typeof window !== 'undefined' ? localStorage.getItem('sigma_session_user') : null;
      if (isDedicatedDemo || savedUser === 'demo') {
        return DEMO_PROFILE;
      }
      const saved = typeof window !== 'undefined' ? localStorage.getItem('sigma_profile') : null;
      if (savedUser && saved) {
        const parsed = JSON.parse(saved);
        if (parsed && (parsed.username || '').toLowerCase() === savedUser.toLowerCase()) {
          return parsed;
        }
      }
    } catch {}
    return initialEmptyProfile;
  });

  const [customers, setCustomers] = useState<Customer[]>(() => {
    if (isDedicatedDemo || (typeof window !== 'undefined' && localStorage.getItem('sigma_session_user') === 'demo')) {
      return DEMO_CUSTOMERS;
    }
    return [];
  });
  const [resellers, setResellers] = useState<Reseller[]>(() => {
    if (isDedicatedDemo || (typeof window !== 'undefined' && localStorage.getItem('sigma_session_user') === 'demo')) {
      return DEMO_RESELLERS;
    }
    return [];
  });
  const [hierarchyData, setHierarchyData] = useState<HierarchyResponse | null>(() => {
    if (isDedicatedDemo || (typeof window !== 'undefined' && localStorage.getItem('sigma_session_user') === 'demo')) {
      return DEMO_HIERARCHY;
    }
    return null;
  });
  const [transactions, setTransactions] = useState<CreditTransaction[]>(() => {
    if (isDedicatedDemo || (typeof window !== 'undefined' && localStorage.getItem('sigma_session_user') === 'demo')) {
      return DEMO_TRANSACTIONS;
    }
    return [];
  });
  const [deletedCustomers, setDeletedCustomers] = useState<DeletedCustomerItem[]>([]);
  const [liveConnections, setLiveConnections] = useState<LiveConnection[]>(() => {
    if (isDedicatedDemo || (typeof window !== 'undefined' && localStorage.getItem('sigma_session_user') === 'demo')) {
      return DEMO_LIVE_CONNECTIONS;
    }
    return [];
  });

  // Limpeza de segurança na inicialização para erradicar qualquer cache de revendas ou clientes de outras contas
  useEffect(() => {
    try {
      if (!isDedicatedDemo && localStorage.getItem('sigma_session_user') !== 'demo') {
        localStorage.removeItem('sigma_customers');
        localStorage.removeItem('sigma_resellers');
        localStorage.removeItem('sigma_transactions');
      }
    } catch {}
  }, [isDedicatedDemo]);

  const [notices] = useState<Notice[]>([
    {
      id: 'not_1',
      title: 'Infraestrutura Cloud Streaming Ativa',
      content: 'O painel está conectado à rede de alta disponibilidade. Todos os novos clientes e testes são sincronizados diretamente com os servidores centrais.',
      date: new Date().toLocaleDateString('pt-BR'),
      author: 'Sistema'
    },
    {
      id: 'not_2',
      title: 'Atualização de Rotas e Playlists Xtream',
      content: 'Rotas de streaming otimizadas com suporte a HLS m3u8, TS e EPG XMLTV integrado.',
      date: new Date().toLocaleDateString('pt-BR'),
      author: 'Administração'
    }
  ]);

  const [tickets, setTickets] = useState<SupportTicket[]>(() => {
    try {
      const saved = localStorage.getItem('sigma_tickets');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [theme, setTheme] = useState<'dark' | 'light'>(APP_CONFIG.defaultTheme);

  // Configurações de Faturamento e Preços por Revenda
  const [resellerPricings, setResellerPricings] = useState<Record<string, ResellerPricing>>(() => {
    try {
      const saved = localStorage.getItem('sigma_reseller_pricings');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [globalBillingSettings, setGlobalBillingSettings] = useState<GlobalBillingSettings>(() => {
    try {
      const saved = localStorage.getItem('sigma_global_billing');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      default_price_per_client: 1.00,
      default_screens_per_credit: 1,
      default_price_per_extra_screen: 0.50,
      default_price_per_partner_app: 0.00,
      default_price_per_gerencia_app: 0.00,
      default_price_per_maxplayer_app: 0.00,
      default_due_day: 10,
      pix_key: 'financeiro@painel.top',
      pix_name: 'Gestão de Pagamentos'
    };
  });

  const [invoicePayments, setInvoicePayments] = useState<Record<string, { status: 'PENDING' | 'PAID'; paid_at?: string }>>(() => {
    try {
      const saved = localStorage.getItem('sigma_invoice_payments');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const logTransaction = (type: 'RECHARGE' | 'RENEWAL' | 'NEW_CLIENT' | 'TRANSFER', credits: number, description: string, user: string) => {
    const currentBalance = profile.credits;
    const isUnlimited = typeof currentBalance === 'string' && (currentBalance.toLowerCase() === 'ilimitado' || currentBalance === 'unlimited');
    const numericCurrent = typeof currentBalance === 'number' ? currentBalance : 0;
    const newTx: CreditTransaction = {
      id: 'tx_' + Date.now(),
      date: new Date().toLocaleDateString('pt-BR') + ' ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      type,
      type_label: type === 'RECHARGE' ? 'Recarga' : type === 'NEW_CLIENT' ? 'Novo Cliente' : type === 'RENEWAL' ? 'Renovação' : 'Transferência',
      credits: (credits > 0 ? '+' : '') + credits,
      balance_before: isUnlimited ? 'Ilimitado' : numericCurrent,
      balance_after: isUnlimited ? 'Ilimitado' : (numericCurrent + credits),
      description,
      user
    };
    setTransactions(prev => {
      const updated = [newTx, ...prev];
      localStorage.setItem('sigma_transactions', JSON.stringify(updated));
      return updated;
    });
  };

  const enterDemoMode = () => {
    localStorage.setItem('sigma_session_user', 'demo');
    localStorage.setItem('sigma_session_role', 'master');
    localStorage.setItem('sigma_is_demo', 'true');
    setIsDemo(true);
    setIsAuthenticated(true);
    setIsLiveConnected(true);
    setProfile(DEMO_PROFILE);
    setCustomers(DEMO_CUSTOMERS);
    setResellers(DEMO_RESELLERS);
    setLiveConnections(DEMO_LIVE_CONNECTIONS);
    setTransactions(DEMO_TRANSACTIONS);
    setHierarchyData(DEMO_HIERARCHY);
  };

  const refreshLiveData = useCallback(async () => {
    const sessionUser = typeof window !== 'undefined' ? localStorage.getItem('sigma_session_user') : null;
    const sessionRole = typeof window !== 'undefined' ? (localStorage.getItem('sigma_session_role') || 'master') : 'master';

    // Se estiver em modo demonstração, carrega dados mock ricos sem chamar API
    const isDemoActive = checkIsDedicatedDemoPanel() || (typeof window !== 'undefined' && (
      localStorage.getItem('sigma_is_demo') === 'true' ||
      sessionUser === 'demo'
    ));
    if (isDemoActive) {
      setProfile(DEMO_PROFILE);
      setCustomers(DEMO_CUSTOMERS);
      setResellers(DEMO_RESELLERS);
      setLiveConnections(DEMO_LIVE_CONNECTIONS);
      setTransactions(DEMO_TRANSACTIONS);
      setHierarchyData(DEMO_HIERARCHY);
      setIsAuthenticated(true);
      setIsLiveConnected(true);
      setIsLoadingLive(false);
      setIsDemo(true);
      return;
    }

    // Se não há usuário logado na sessão, não carrega dados
    if (!sessionUser) {
      setIsAuthenticated(false);
      setIsLiveConnected(false);
      return;
    }

    const storedResellerKey = typeof window !== 'undefined'
      ? (localStorage.getItem('sigma_active_key') || localStorage.getItem('sigma_reseller_key') || localStorage.getItem('fastcdn_api_key'))
      : null;
    const masterKey = MasterKeyStore.get() || storedResellerKey || APP_CONFIG.defaultApiKey;
    if (!masterKey) {
      setIsAuthenticated(false);
      setIsLiveConnected(false);
      return;
    }

    setIsLoadingLive(true);
    setLiveError(null);
    try {
      const storedResellerKey = typeof window !== 'undefined' ? localStorage.getItem('sigma_reseller_key') : null;
      const activeApiKey = storedResellerKey || masterKey;
      fastCdnApi.setApiKey(activeApiKey, true);
      apiService.setSession(localStorage.getItem('sigma_session_token') || '', activeApiKey);
      const [resumo, rawClientes, rawSubrevendas, rawConexoes] = await Promise.all([
        fastCdnApi.getResumo(),
        fastCdnApi.getClientes(),
        fastCdnApi.getSubRevendas(),
        fastCdnApi.getLiveConnections().catch(() => [])
      ]);

      const revInfo: any = resumo.revendedor || resumo;

      const sessionUserLower = (sessionUser || '').toLowerCase().trim();
      // REGRA ABSOLUTA DE SEGURANÇA MULTI-TENANT:
      const isMasterUser = Boolean(
        revInfo.is_franchise_master === true ||
        revInfo.is_master === true ||
        revInfo.is_admin === true ||
        revInfo.role === 'admin' ||
        isPanelMaster(sessionUser, revInfo)
      );
      const isResellerSession = !isMasterUser;

      // Sincroniza e corrige imediatamente o papel na sessão local
      if (typeof window !== 'undefined') {
        const expectedRole = isMasterUser ? 'master' : 'reseller';
        if (localStorage.getItem('sigma_session_role') !== expectedRole) {
          localStorage.setItem('sigma_session_role', expectedRole);
        }
      }

      let liveCredits = revInfo.creditos !== undefined ? revInfo.creditos : (resumo.creditos || 0);
      let liveLogin = sessionUser || revInfo.login || resumo.usuario || 'admin';

      // Se for revenda/sub-revenda logada, pega os créditos específicos dela
      let mySubUnlimited = false;
      if (isResellerSession && Array.isArray(rawSubrevendas)) {
        const mySub = rawSubrevendas.find((s: any) => (s.login_usuario || s.username || '').toLowerCase() === sessionUserLower);
        if (mySub) {
          if (mySub.creditos !== undefined && typeof mySub.creditos === 'number') {
            liveCredits = mySub.creditos;
          }
          // Preserva flag de crédito ilimitado do mySub concedido pelo administrador
          if (mySub.creditos_ilimitados === true || String(mySub.creditos) === 'ilimitado' || mySub.unlimited_credits === true || mySub.unlimitedCredits === true) {
            mySubUnlimited = true;
          }
        }
      }

      // Verifica com rigor se o perfil / revendedor possui créditos ilimitados concedidos
      const isRevInfoUnlimited =
        Boolean(revInfo.creditos_ilimitados) ||
        Boolean(revInfo.unlimited_credits) ||
        Boolean(revInfo.unlimitedCredits) ||
        String(revInfo.creditos).toLowerCase() === 'ilimitado' ||
        String(resumo.creditos).toLowerCase() === 'ilimitado' ||
        (typeof revInfo.creditos === 'number' && (revInfo.creditos >= 99999 || revInfo.creditos < 0)) ||
        (typeof resumo.creditos === 'number' && (resumo.creditos >= 99999 || resumo.creditos < 0));

      // Se for master deste painel ou tiver créditos ilimitados no backend
      const isUnlimited = isMasterUser ? true : (isRevInfoUnlimited || mySubUnlimited);
      const finalCredits = isUnlimited
        ? 999999
        : (typeof liveCredits === 'number' ? liveCredits : (Number(liveCredits) || 0));

      setProfile({
        id: sessionUser || revInfo.id || 'res_live',
        username: liveLogin,
        name: revInfo.nome || liveLogin,
        whatsapp: revInfo.whatsapp || '',
        role: (revInfo.role === 'admin' || sessionUserLower === 'admin' || sessionUserLower === 'andre2056') ? 'admin' : (isMasterUser ? 'master' : 'reseller'),
        is_admin: revInfo.is_admin === true || revInfo.role === 'admin' || sessionUserLower === 'admin' || sessionUserLower === 'andre2056',
        is_master: isMasterUser,
        isMaster: isMasterUser,
        franchise_id: revInfo.franchise_id || revInfo.franchiseId || null,
        franchiseId: revInfo.franchise_id || revInfo.franchiseId || null,
        status: 'ACTIVE',
        credits: finalCredits,
        unlimited_credits: isUnlimited,
        creditos_ilimitados: isUnlimited,
        membership_expiry_date: revInfo.vencimento || revInfo.membership_expiry_date || 'Ilimitado',
        online_users_count: Array.isArray(rawClientes) ? rawClientes.filter((c: any) => c.status === 'active').length : 0,
        two_factor_enabled: localStorage.getItem('sigma_2fa') === 'true'
      });
      // Sincronizar tabela de preços descritos pelo usuário do backend VPS
      try {
        const token = localStorage.getItem('sigma_session_token') || activeApiKey;
        const base = (APP_CONFIG.apiBaseUrl || 'https://fastcdn.fit').replace(/\/+$/, '');
        const endpoints = isHostedOnGithub()
          ? [`${base}/api/v1/customer-prices`]
          : [
              `/fastcdn-api/api/v1/customer-prices`,
              `${base}/api/v1/customer-prices`
            ];
        for (const url of endpoints) {
          try {
            const pRes = await fetch(url, {
              headers: {
                'Authorization': `Bearer ${token}`,
                'X-API-Key': token
              }
            });
            if (pRes.ok) {
              const pData = await pRes.json();
              if (pData && pData.prices && typeof pData.prices === 'object') {
                const cur = JSON.parse(localStorage.getItem('sigma_customer_prices') || '{}');
                const merged = { ...cur, ...pData.prices };
                localStorage.setItem('sigma_customer_prices', JSON.stringify(merged));
                break;
              }
            }
          } catch {}
        }
      } catch {}

      // Sincronizar tabela de preços e condições personalizadas por revenda do backend VPS
      try {
        const token = localStorage.getItem('sigma_session_token') || activeApiKey;
        const base = (APP_CONFIG.apiBaseUrl || 'https://fastcdn.fit').replace(/\/+$/, '');
        const resellerEndpoints = isHostedOnGithub()
          ? [`${base}/api/v1/reseller-prices`, `${base}/api/reseller-prices`]
          : [
              `/fastcdn-api/api/v1/reseller-prices`,
              `${base}/api/v1/reseller-prices`,
              `${base}/api/reseller-prices`,
              `/api/v1/reseller-prices`
            ];
        for (const url of resellerEndpoints) {
          try {
            const rRes = await fetch(url, {
              headers: {
                'Authorization': `Bearer ${token}`,
                'X-API-Key': token
              }
            });
            if (rRes.ok) {
              const rData = await rRes.json();
              if (rData && rData.prices && typeof rData.prices === 'object') {
                const cur = JSON.parse(localStorage.getItem('sigma_reseller_pricings') || '{}');
                const merged = { ...cur, ...rData.prices };
                localStorage.setItem('sigma_reseller_pricings', JSON.stringify(merged));
                setResellerPricings(merged);
                break;
              }
            }
          } catch {}
        }
      } catch {}

      if (Array.isArray(rawClientes)) {
        // Excluir rigorosamente contas de revendedores e administradores para não aparecerem nem serem contabilizados como clientes
        const onlyRealClients = rawClientes.filter((c: any) => {
          const role = String(c.role || c.tipo || '').toLowerCase();
          return role !== 'reseller' && role !== 'subreseller' && role !== 'admin' && !c.is_reseller && !c.isReseller;
        });
        let mappedClients = onlyRealClients.map(mapFastCdnClientToCustomer);
        // Revendedor vê clientes dele E de toda sua árvore de sub-revendas
        if (isResellerSession) {
          const sessionUserLower = sessionUser.toLowerCase();
          const myNetworkUsers = new Set<string>();
          myNetworkUsers.add(sessionUserLower);

          if (Array.isArray(rawSubrevendas)) {
            rawSubrevendas.forEach((s: any) => {
              const u = (s.login_usuario || s.username || '').toLowerCase();
              const pai = (s.pai_username || s.parent_reseller || '').toLowerCase();
              const lin = (s.linhagem || []).map((l: any) => String(l).toLowerCase());
              if (pai === sessionUserLower || lin.includes(sessionUserLower)) {
                if (u) myNetworkUsers.add(u);
              }
            });
          }

          mappedClients = mappedClients.filter(c => {
            const dono = (c.dono || c.reseller_username || '').toLowerCase();
            return myNetworkUsers.has(dono) || dono === sessionUserLower;
          });
        }

        // Processar conexões ao vivo retornadas da API com isolamento rigoroso por revendedor
        let activeConns: LiveConnection[] = [];
        if (Array.isArray(rawConexoes) && rawConexoes.length > 0) {
          activeConns = rawConexoes
            .filter((conn: any) => {
              if (!isResellerSession) return true;
              const sessionUserLower = sessionUser.toLowerCase();
              const dono = String(conn.reseller_username || conn.reseller_id || '').toLowerCase();
              const connUser = String(conn.username || '').toLowerCase();
              const clientInMyNetwork = mappedClients.some(c => c.username.toLowerCase() === connUser);
              return clientInMyNetwork || dono === sessionUserLower;
            })
            .map((conn: any) => {
              const matchedClient = mappedClients.find(c => c.username.toLowerCase() === String(conn.username || '').toLowerCase());
              return {
                id: conn.id || `conn_${conn.username}_${Date.now()}`,
                username: conn.username,
                customer_name: conn.customer_name || matchedClient?.name || conn.username,
                stream_title: conn.stream_title || matchedClient?.package_name || (conn.type === 'movie' ? 'Filme VOD' : (conn.type === 'series' ? 'Série' : 'Conexão Ao Vivo')),
                category: conn.category || (conn.type === 'movie' ? 'Filmes VOD' : (conn.type === 'series' ? 'Séries' : 'Transmissão Ao Vivo')),
                type: conn.type || 'live',
                speed: conn.speed || '8.5 Mbps',
                speed_type: conn.speed_type || (conn.speed ? 'Tempo Real' : 'Taxa Estimada'),
                user_agent: conn.user_agent || 'Player / Dispositivo',
                ip_address: conn.ip_address || '-',
                country: conn.country || 'BR',
                connected_at: conn.connected_at || 'Agora',
                duration: conn.duration || '0s'
              };
            });
        }

        // Se a API não retornou sessões detalhadas mas os clientes possuem telas_ativas > 0
        if (activeConns.length === 0) {
          activeConns = mappedClients
            .filter(c => (c.telas_ativas ?? 0) > 0)
            .map((c) => {
              const telas = c.telas_ativas ?? 1;
              return {
                id: 'conn_' + (c.id || c.username),
                username: c.username,
                customer_name: c.name || c.username,
                stream_title: c.package_name || 'Conexão Ativa',
                category: 'Transmissão Ao Vivo',
                type: 'live',
                speed: '7.5 Mbps',
                speed_type: 'Taxa Estimada',
                user_agent: `Dispositivo Ativo (${telas} tela${telas > 1 ? 's' : ''})`,
                ip_address: (c as any).ip || (c as any).ip_atual || '-',
                country: 'BR',
                connected_at: 'Agora',
                duration: '-'
              };
            });
        }

        // Sincronizar contagem em tempo real de conexões ativas nos clientes
        if (activeConns.length > 0) {
          const countByUsername = new Map<string, number>();
          for (const conn of activeConns) {
            const u = String(conn.username || '').toLowerCase();
            countByUsername.set(u, (countByUsername.get(u) || 0) + 1);
          }
          mappedClients = mappedClients.map(c => {
            const activeNow = countByUsername.get(c.username.toLowerCase());
            if (activeNow !== undefined) {
              return {
                ...c,
                active_connections: activeNow,
                connections_count: activeNow,
                telas_ativas: activeNow
              };
            }
            return c;
          });
        }

        // Preservação de apps parceiros: clientes vencidos mantêm seus apps parceiros registrados (com status expired)
        const now = Date.now();
        const isClientExpired = (c: any) => {
          if (c.status === 'EXPIRED') return true;
          const exp = parseExpiryDate(c);
          return exp ? exp.getTime() < now : false;
        };

        mappedClients = mappedClients.map(c => {
          if (isClientExpired(c) && (c.partnerApp || c.partner_app)) {
            const p = (c.partnerApp || c.partner_app) as any;
            const updatedP = { ...p, status: 'expired' };
            return {
              ...c,
              partnerApp: updatedP,
              partner_app: updatedP
            };
          }
          return c;
        });

        // Sincronizar contas ativas da API MaxPlayer nos clientes (apenas não vencidos)
        try {
          const token = localStorage.getItem('sigma_session_token') || activeApiKey;
          const base = (APP_CONFIG.apiBaseUrl || 'https://fastcdn.fit').replace(/\/+$/, '');
          const maxEndpoints = isHostedOnGithub()
            ? [`${base}/api/v1/integrations/maxplayer/active-users`]
            : [
                `/fastcdn-api/api/v1/integrations/maxplayer/active-users`,
                `${base}/api/v1/integrations/maxplayer/active-users`,
                `/api/v1/integrations/maxplayer/active-users`
              ];
          for (const url of maxEndpoints) {
            try {
              const mRes = await fetch(url, {
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'X-API-Key': token
                }
              });
              if (mRes.ok) {
                const mData = await mRes.json();
                if (mData && mData.activeMap) {
                  mappedClients = mappedClients.map(c => {
                    const existingApp = (c.partnerApp || c.partner_app || {}) as any;
                    const isMax = Boolean(
                      existingApp.appName?.toLowerCase().includes('max') ||
                      (existingApp.appUser && !existingApp.mac)
                    );
                    if (!isMax) {
                      return c;
                    }

                    const cleanU = (c.username || '').toLowerCase();
                    const cleanAppUser = String(existingApp.appUser || '').replace(/[@]/g, '').trim().toLowerCase();
                    const maxInfo = mData.activeMap[cleanU] || (cleanAppUser ? mData.activeMap[cleanAppUser] : null);

                    if (maxInfo) {
                      const isExpired = isClientExpired(c);
                      const partnerData = {
                        ...existingApp,
                        appName: 'MaxPlayer',
                        appUser: maxInfo.appUser || c.username,
                        appPassword: maxInfo.appPassword || existingApp.appPassword || c.password || '******',
                        userId: maxInfo.maxplayerId,
                        maxplayerId: maxInfo.maxplayerId,
                        dns: 'fastcdn.fit',
                        status: isExpired ? 'expired' : 'active',
                        is_active: !isExpired,
                        is_inactive: false,
                        is_deactivated: false,
                        activatedAt: existingApp.activatedAt || 'Ativo'
                      };
                      delete partnerData.deactivatedAt;
                      delete partnerData.deactivationReason;
                      return {
                        ...c,
                        partnerApp: partnerData,
                        partner_app: partnerData
                      };
                    } else {
                      // Cliente configurado com MaxPlayer, porém NÃO consta ativo na API upstream do MaxPlayer!
                      const partnerData = {
                        ...existingApp,
                        appName: 'MaxPlayer',
                        status: 'inactive',
                        is_active: false,
                        is_inactive: true,
                        is_deactivated: true,
                        deactivatedAt: existingApp.deactivatedAt || new Date().toISOString(),
                        deactivationReason: existingApp.deactivationReason || 'Desativado no MaxPlayer'
                      };
                      return {
                        ...c,
                        partnerApp: partnerData,
                        partner_app: partnerData
                      };
                    }
                  });
                  break;
                }
              }
            } catch {}
          }
        } catch {}

        // Sincronizar contas ativas da API GerenciaApp nos clientes (apenas não vencidos)
        try {
          const token = localStorage.getItem('sigma_session_token') || activeApiKey;
          const base = (APP_CONFIG.apiBaseUrl || 'https://fastcdn.fit').replace(/\/+$/, '');
          const gerenciaEndpoints = isHostedOnGithub()
            ? [`${base}/api/v1/integrations/gerenciaapp/active-users`]
            : [
                `/fastcdn-api/api/v1/integrations/gerenciaapp/active-users`,
                `${base}/api/v1/integrations/gerenciaapp/active-users`,
                `/api/v1/integrations/gerenciaapp/active-users`
              ];
          for (const url of gerenciaEndpoints) {
            try {
              const gRes = await fetch(url, {
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'X-API-Key': token
                }
              });
              if (gRes.ok) {
                const gData = await gRes.json();
                if (gData && gData.activeMap) {
                  mappedClients = mappedClients.map(c => {
                    if (isClientExpired(c)) {
                      return c;
                    }
                    const cleanU = c.username.toLowerCase();
                    const cleanMac = (c.partnerApp?.mac || c.partner_app?.mac || '').replace(/[^a-f\d]/gi, '').toUpperCase();
                    const gInfo = gData.activeMap[cleanU] || (cleanMac ? gData.activeMap[cleanMac] : null);
                    if (gInfo) {
                      const existingApp = (c.partnerApp || c.partner_app || {}) as any;
                      const isMax = Boolean(existingApp.appName?.toLowerCase().includes('max') || (existingApp.appUser && !existingApp.mac));
                      const partnerData = isMax ? existingApp : {
                        ...existingApp,
                        appName: existingApp.appName && existingApp.appName !== 'App Parceiro' ? existingApp.appName : (gInfo.appName || 'GerenciaApp'),
                        appUser: gInfo.clientUsername || c.username,
                        mac: gInfo.mac || existingApp.mac,
                        userId: String(gInfo.gerenciaAppId || gInfo.id),
                        gerenciaAppId: gInfo.gerenciaAppId || gInfo.id,
                        status: 'active',
                        activatedAt: existingApp.activatedAt || gInfo.createdAt || 'Ativo',
                        expiresAt: gInfo.expiresAt || existingApp.expiresAt
                      };
                      const allDevices = Array.isArray(gInfo.devices) && gInfo.devices.length > 0
                        ? gInfo.devices
                        : (gInfo.mac ? [{ mac: gInfo.mac, appName: gInfo.appName || 'GerenciaApp', createdAt: gInfo.createdAt, expiresAt: gInfo.expiresAt }] : []);
                      return {
                        ...c,
                        partnerApp: partnerData,
                        partner_app: partnerData,
                        partnerDevices: allDevices
                      };
                    }
                    return c;
                  });
                  break;
                }
              }
            } catch {}
          }
        } catch {}

        // Dispara limpeza preventiva em segundo plano no servidor para clientes vencidos
        try {
          const token = localStorage.getItem('sigma_session_token') || activeApiKey;
          const base = (APP_CONFIG.apiBaseUrl || 'https://fastcdn.fit').replace(/\/+$/, '');
          const cleanupEndpoints = isHostedOnGithub()
            ? [`${base}/api/v1/partner-apps/cleanup-expired`]
            : [
                `/fastcdn-api/api/v1/partner-apps/cleanup-expired`,
                `${base}/api/v1/partner-apps/cleanup-expired`,
                `/api/v1/partner-apps/cleanup-expired`
              ];
          for (const url of cleanupEndpoints) {
            fetch(url, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'X-API-Key': token,
                'Content-Type': 'application/json'
              }
            }).catch(() => {});
            break;
          }
        } catch {}

        setCustomers(mappedClients);
        setLiveConnections(activeConns);
      }

      if (Array.isArray(rawSubrevendas)) {
        let mappedSubs = rawSubrevendas.map(mapFastCdnSubRevendaToReseller);
        if (isResellerSession) {
          mappedSubs = mappedSubs.filter(s => {
            const pai = (s.pai_username || s.parent_reseller || '').toLowerCase();
            const lin = (s.linhagem || []).map((l: any) => String(l).toLowerCase());
            return pai === sessionUserLower || lin.includes(sessionUserLower);
          });
        }
        setResellers(mappedSubs);
      }

      // Sincroniza a árvore de hierarquia recursiva multinível
      apiService.getHierarchy().then((hData) => {
        if (hData && hData.arvore) {
          setHierarchyData(hData);
        }
      }).catch(() => {});

      setIsAuthenticated(true);
      setIsLiveConnected(true);
    } catch (err: any) {
      console.warn('[API] sync error:', err.message);
      setLiveError(err.message);
      setIsLiveConnected(false);
    } finally {
      setIsLoadingLive(false);
    }
  }, []);

  const fetchHierarchy = useCallback(async (): Promise<HierarchyResponse | null> => {
    if (isDemo || checkIsDedicatedDemoPanel() || (typeof window !== 'undefined' && (localStorage.getItem('sigma_is_demo') === 'true' || localStorage.getItem('sigma_session_user') === 'demo'))) {
      setHierarchyData(DEMO_HIERARCHY);
      return DEMO_HIERARCHY;
    }
    try {
      const data = await apiService.getHierarchy();
      if (data && data.arvore) {
        setHierarchyData(data);
        return data;
      }
    } catch (err: any) {
      console.warn('Erro ao carregar hierarquia:', err.message);
    }
    return null;
  }, [isDemo]);

  useEffect(() => {
    const sessionUser = typeof window !== 'undefined' ? localStorage.getItem('sigma_session_user') : null;
    if (sessionUser || checkIsDedicatedDemoPanel()) {
      refreshLiveData();
      fetchHierarchy();
    }
  }, [refreshLiveData, fetchHierarchy]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  const loginWithApiKey = async (key: string, persist = true): Promise<boolean> => {
    setIsLoadingLive(true);
    setLiveError(null);
    try {
      fastCdnApi.setApiKey(key, persist);
      setApiKey(key);
      const resumo = await fastCdnApi.getResumo();
      if (resumo && (resumo.status === 'success' || resumo.creditos !== undefined)) {
        setIsAuthenticated(true);
        await refreshLiveData();
        return true;
      }
      throw new Error('Chave de API não autorizada');
    } catch (err: any) {
      setLiveError(err.message);
      setIsAuthenticated(false);
      setIsLiveConnected(false);
      return false;
    } finally {
      setIsLoadingLive(false);
    }
  };

  const loginWithCredentials = async (
    username: string,
    password: string,
    remember = true
  ): Promise<{ success: boolean; message: string }> => {
    setIsLoadingLive(true);
    setLiveError(null);
    try {
      // --- 0. Interceptação de Modo Demonstração (apenas visual) ---
      if (username.trim().toLowerCase() === 'demo') {
        enterDemoMode();
        setIsLoadingLive(false);
        return { success: true, message: 'Modo Demonstração visual ativado com sucesso!' };
      }

      const masterKey = MasterKeyStore.get() || APP_CONFIG.defaultApiKey;
      if (masterKey) {
        fastCdnApi.setApiKey(masterKey, true);
      }

      // Purga preventiva de segurança para evitar qualquer dado residual no painel
      try {
        localStorage.removeItem('sigma_customers');
        localStorage.removeItem('sigma_resellers');
        localStorage.removeItem('sigma_transactions');
      } catch {}
      setCustomers([]);
      setResellers([]);
      setTransactions([]);
      setLiveConnections([]);
      setHierarchyData(null);

      // --- 1. Autenticação Direta do Revendedor via API Oficial ---
      try {
        const authRes = await fastCdnApi.autenticarRevenda(username, password);
        if (authRes && authRes.success) {
          if (authRes.franchise_owner) {
            localStorage.setItem('sigma_franchise_owner', String(authRes.franchise_owner).trim().toLowerCase());
            (window as any).__APP_CONFIG__ = { ...((window as any).__APP_CONFIG__ || {}), franchiseOwner: String(authRes.franchise_owner).trim().toLowerCase() };
          }
          // REGRA ESTRITA: Apenas o dono desta franquia específica é Master
          const isMasterRevenda = Boolean(
            authRes.is_franchise_master === true ||
            authRes.is_master === true ||
            isPanelMaster(username, { ...authRes.reseller, is_franchise_master: authRes.is_franchise_master, is_master: authRes.is_master })
          );
          localStorage.setItem('sigma_session_user', username);
          localStorage.setItem('sigma_session_role', isMasterRevenda ? 'master' : 'reseller');
          if (authRes.token) {
            localStorage.setItem('sigma_session_token', authRes.token);
          }
          if (authRes.api_key) {
            localStorage.setItem('sigma_reseller_key', authRes.api_key);
            localStorage.setItem('sigma_active_key', authRes.api_key);
            fastCdnApi.setApiKey(authRes.api_key, true);
            apiService.setSession(authRes.token || '', authRes.api_key);
          }
          await ResellerPassStore.set(username, password);
          setIsAuthenticated(true);
          await refreshLiveData();
          return { success: true, message: authRes.message || `Bem-vindo, ${username}!` };
        }
      } catch {
        // Segue para verificação master alternativa caso a API esteja inacessível
      }

      // --- 2. Verificação de Acesso Master / Admin (apenas se credenciais estiverem configuradas) ---
      const envAdminUser = (APP_CONFIG.adminUsername || '').toLowerCase();
      const envAdminPass = APP_CONFIG.adminPassword || '';

      const isEnvAdmin =
        Boolean(envAdminUser && envAdminPass) &&
        username.toLowerCase() === envAdminUser &&
        password === envAdminPass;

      const storedMasterUser = MasterKeyStore.getMasterUsername().toLowerCase();
      const isStoredMaster =
        Boolean(storedMasterUser) &&
        username.toLowerCase() === storedMasterUser &&
        (await MasterKeyStore.verifyMasterPassword(password));

      if (isEnvAdmin || isStoredMaster) {
        localStorage.setItem('sigma_session_user', username);
        localStorage.setItem('sigma_session_role', 'master');
        setApiKey(masterKey);
        setIsAuthenticated(true);
        await refreshLiveData();
        return { success: true, message: 'Bem-vindo, ' + username + '!' };
      }

      // --- Fallback: verificação estrutural com dados da lista de sub-revendas ---
      let subRevendaFound = false;
      let subRevendaData: any = null;

      try {
        const subs = await fastCdnApi.getSubRevendas();
        if (Array.isArray(subs)) {
          const match = subs.find((s: any) => (s.login_usuario || s.username || '').toLowerCase() === username.toLowerCase());
          if (match) {
            subRevendaFound = true;
            subRevendaData = match;
          }
        }
      } catch { /* ignora */ }

      if (!subRevendaFound) {
        try {
          const busca = await fastCdnApi.postAction('buscar', { login_usuario: username });
          if (busca && (busca.status === 'success' || busca.login_usuario || busca.usuario)) {
            subRevendaFound = true;
            subRevendaData = busca;
          }
        } catch { /* ignora */ }
      }

      if (!subRevendaFound) {
        return { success: false, message: 'Usuário ou senha incorretos.' };
      }

      const hasLocalPass = ResellerPassStore.has(username);
      let passOk = false;
      if (hasLocalPass) {
        passOk = await ResellerPassStore.verify(username, password);
      } else if (subRevendaData && (subRevendaData.senha_usuario === password || subRevendaData.password === password)) {
        passOk = true;
        await ResellerPassStore.set(username, password);
      }

      if (!passOk) {
        return { success: false, message: 'Senha incorreta para esta sub-revenda.' };
      }

      const isFallbackMaster = isPanelMaster(username, subRevendaData);
      localStorage.setItem('sigma_session_user', username);
      localStorage.setItem('sigma_session_role', isFallbackMaster ? 'master' : 'reseller');
      setApiKey(masterKey);
      setIsAuthenticated(true);
      await refreshLiveData();
      return { success: true, message: 'Bem-vindo, ' + username + '!' };
    } catch (err: any) {
      const msg = err.message || 'Erro ao autenticar.';
      setLiveError(msg);
      return { success: false, message: msg };
    } finally {
      setIsLoadingLive(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('sigma_session_user');
    localStorage.removeItem('sigma_session_role');
    localStorage.removeItem('sigma_reseller_key');
    localStorage.removeItem('sigma_active_key');
    localStorage.removeItem('sigma_session_token');
    localStorage.removeItem('sigma_profile');
    localStorage.removeItem('sigma_customers');
    localStorage.removeItem('sigma_resellers');
    localStorage.removeItem('sigma_transactions');
    localStorage.removeItem('sigma_deleted_customers');
    localStorage.removeItem('sigma_is_demo');
    setIsDemo(false);
    apiService.clearSession();
    fastCdnApi.clearApiKey();
    setHierarchyData(null);
    setCustomers([]);
    setResellers([]);
    setTransactions([]);
    setLiveConnections([]);
    setIsAuthenticated(false);
    setIsLiveConnected(false);
    setProfile(initialEmptyProfile);
  };

  const saveCustomerPrice = async (username: string, price: number): Promise<void> => {
    const cleanUser = (username || '').trim().toLowerCase();
    const cleanPrice = Number(price) || 0;
    if (!cleanUser) return;

    // 1. Atualizar localStorage
    setSavedCustomerPrice(cleanUser, cleanPrice);

    // 2. Atualizar estado em memória dos clientes
    setCustomers(prev => {
      const updated = prev.map(c => {
        if ((c.username || '').toLowerCase() === cleanUser || (c.id || '').toLowerCase() === cleanUser) {
          return { ...c, subscription_value: cleanPrice };
        }
        return c;
      });
      localStorage.setItem('sigma_customers', JSON.stringify(updated));
      return updated;
    });

    // 3. Persistir no backend VPS
    try {
      const token = localStorage.getItem('sigma_session_token') ||
        localStorage.getItem('sigma_active_key') ||
        localStorage.getItem('sigma_reseller_key') ||
        MasterKeyStore.get() ||
        APP_CONFIG.defaultApiKey;
      const endpoints = isHostedOnGithub()
        ? [
            `${APP_CONFIG.apiBaseUrl}/api/v1/customer-prices`,
            `${APP_CONFIG.apiBaseUrl}/api/customer-prices`
          ]
        : [
            '/fastcdn-api/api/v1/customer-prices',
            `${APP_CONFIG.apiBaseUrl}/api/v1/customer-prices`,
            `${APP_CONFIG.apiBaseUrl}/api/customer-prices`,
            '/api/v1/customer-prices'
          ];
      for (const url of endpoints) {
        try {
          const res = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
              'X-API-Key': token
            },
            body: JSON.stringify({ username: cleanUser, price: cleanPrice })
          });
          if (res.ok) break;
        } catch {}
      }
    } catch {}
  };

  const addCustomer = async (cust: any) => {
    if (isDemo) {
      return { success: false, message: 'Modo Demonstração: criação de clientes desabilitada no painel visual.' };
    }
    try {
      if (cust.is_trial) {
        const apiRes = await fastCdnApi.criarTeste({
          horas: cust.hours || APP_CONFIG.defaultTestHours,
          nome_usuario: cust.name || cust.username,
          whatsapp: cust.whatsapp,
          bouquet_id: cust.package_id || APP_CONFIG.defaultBouquetId
        });
        await refreshLiveData();
        return { success: true, message: 'Teste rápido gerado com sucesso no servidor!', customer: apiRes };
      } else {
        const isDays = !!(cust.days || cust.dias);
        const cost = isDays ? 1 : (cust.connections_max || cust.connections_count || 1) * (cust.months || 1);
        const bouquet = cust.package_id || cust.bouquet_id || cust.id_lista || APP_CONFIG.defaultBouquetId;
        const subVal = cust.subscription_value !== undefined ? Number(cust.subscription_value) : undefined;
        if (subVal !== undefined && !isNaN(subVal)) {
          await saveCustomerPrice(cust.username, subVal);
        }
        const apiRes = await fastCdnApi.criarCliente({
          login_usuario: cust.username,
          senha_usuario: cust.password,
          nome_usuario: cust.name || cust.username,
          meses: cust.months,
          dias: cust.days || cust.dias,
          conectado: cust.connections_max || cust.connections_count || 1,
          whatsapp: cust.whatsapp,
          notas: cust.notes,
          bouquet_id: bouquet,
          id_lista: bouquet,
          subscription_value: subVal
        });
        const durationDesc = isDays ? `${cust.days || cust.dias} dia(s)` : `${cust.months || 1} mês/telas`;
        logTransaction('NEW_CLIENT', -cost, `Criação do cliente ${cust.username} (${durationDesc})`, cust.username);
        await refreshLiveData();
        return { success: true, message: 'Cliente criado com sucesso no servidor!', customer: apiRes };
      }
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  };

  const updateCustomer = async (id: string, updates: Partial<Customer>): Promise<{ success: boolean; message: string }> => {
    if (isDemo) {
      return { success: false, message: 'Modo Demonstração: edição desabilitada no painel visual.' };
    }
    const target = customers.find(c => c.id === id || c.username === id);
    if (!target) return { success: false, message: 'Cliente não encontrado.' };

    try {
      if (updates.subscription_value !== undefined) {
        await saveCustomerPrice(target.username, Number(updates.subscription_value));
      }
      await fastCdnApi.editarCliente({
        login_usuario: target.username,
        nome_usuario: updates.name,
        senha_usuario: updates.password,
        conectado: updates.connections_max || updates.max_connections,
        whatsapp: updates.whatsapp,
        notas: updates.notes,
        bouquet_id: updates.package_id || updates.package,
        id_lista: updates.package_id || updates.package,
        subscription_value: updates.subscription_value !== undefined ? Number(updates.subscription_value) : undefined
      });

      setCustomers(prev => {
        const updated = prev.map(c => (c.id === id || c.username === id ? { ...c, ...updates } : c));
        localStorage.setItem('sigma_customers', JSON.stringify(updated));
        return updated;
      });

      await refreshLiveData();
      return { success: true, message: 'Dados do cliente atualizados com sucesso!' };
    } catch (err: any) {
      return { success: false, message: err.message || 'Erro ao atualizar cliente.' };
    }
  };

  const deleteCustomer = async (id: string, reason = 'Excluído pelo revendedor') => {
    if (isDemo) {
      return { success: false, message: 'Modo Demonstração: exclusão desabilitada no painel visual.' };
    }
    const target = customers.find(c => c.id === id || c.username === id);
    if (!target) return { success: false, message: 'Cliente não encontrado.' };
    try {
      await fastCdnApi.deletarCliente(target.username);
      setCustomers(prev => {
        const updated = prev.filter(c => c.id !== id && c.username !== id);
        localStorage.setItem('sigma_customers', JSON.stringify(updated));
        return updated;
      });

      // Save to trash bin
      const trashItem: DeletedCustomerItem = {
        id: target.id,
        username: target.username,
        server: target.server_name || APP_CONFIG.defaultServerName,
        deleted_at: new Date().toLocaleDateString('pt-BR') + ' ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        reason,
        connections: target.connections_max || 1
      };
      setDeletedCustomers(prev => {
        const updated = [trashItem, ...prev.filter(p => p.username !== target.username)];
        localStorage.setItem('sigma_deleted_customers', JSON.stringify(updated));
        return updated;
      });

      return { success: true, message: 'Cliente excluído com sucesso!' };
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  };

  const restoreCustomer = (id: string) => {
    if (isDemo) return;
    setDeletedCustomers(prev => {
      const updated = prev.filter(item => item.id !== id);
      localStorage.setItem('sigma_deleted_customers', JSON.stringify(updated));
      return updated;
    });
    refreshLiveData();
  };

  const addCourtesyDays = async (customerId: string, days: number) => {
    if (isDemo) return;
    const target = customers.find(c => c.id === customerId || c.username === customerId);
    if (!target) return;

    try {
      await fastCdnApi.renovarCliente(target.username, 0, target.connections_max || 1, days);
      await refreshLiveData();
    } catch (err: any) {
      console.warn('[CORTESIA] Erro ao adicionar dias no servidor:', err.message);
      setCustomers(prev => {
        const updated = prev.map(c => {
          if (c.id === customerId || c.username === customerId) {
            const d = new Date();
            d.setDate(d.getDate() + days);
            return { ...c, expires_at: d.toLocaleDateString('pt-BR') + ' 23:59' };
          }
          return c;
        });
        localStorage.setItem('sigma_customers', JSON.stringify(updated));
        return updated;
      });
    }
  };

  const renewCustomer = async (customerId: string, months: number, days?: number) => {
    if (isDemo) {
      return { success: false, message: 'Modo Demonstração: renovação desabilitada no painel visual.' };
    }
    const target = customers.find(c => c.id === customerId);
    if (!target) return { success: false, message: 'Cliente não encontrado.' };

    try {
      await fastCdnApi.renovarCliente(target.username, months, target.connections_max || 1, days);
      const desc = days && days > 0 ? `${days} dia(s)` : `${months} mês(es)`;
      const cost = days && days > 0 ? 1 : months * (target.connections_max || 1);
      logTransaction('RENEWAL', -cost, `Renovação de ${desc} para ${target.username}`, target.username);
      setCustomers(prev => prev.map(c => {
        if (c.id === customerId || c.username === target.username) {
          return {
            ...c,
            status: 'ACTIVE',
            is_trial: false
          };
        }
        return c;
      }));
      await refreshLiveData();
      return { success: true, message: `Cliente ${target.username} renovado por ${desc} com sucesso!` };
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  };

  const toggleBlockCustomer = async (id: string) => {
    if (isDemo) {
      return { success: false, message: 'Modo Demonstração: bloqueio desabilitado no painel visual.' };
    }
    const target = customers.find(c => c.id === id);
    if (!target) return { success: false, message: 'Cliente não encontrado.' };

    const isCurrentlyInactive = target.status === 'BLOCKED' || target.status === 'EXPIRED' || (target as any).status === 'suspended';
    const shouldBlock = !isCurrentlyInactive;
    try {
      if (shouldBlock) {
        await fastCdnApi.bloquearCliente(target.username);
      } else {
        await fastCdnApi.desbloquearCliente(target.username);
      }
      setCustomers(prev => {
        const newStatus: Customer['status'] = shouldBlock ? 'BLOCKED' : 'ACTIVE';
        const updated = prev.map(c => {
          if (c.id === id) {
            const nextDate = shouldBlock ? c.expires_at : new Date(Date.now() + 30 * 24 * 3600 * 1000).toLocaleDateString('pt-BR');
            return { ...c, status: newStatus, expires_at: nextDate, vencimento: nextDate };
          }
          return c;
        });
        localStorage.setItem('sigma_customers', JSON.stringify(updated));
        return updated;
      });
      await refreshLiveData();
      return { success: true, message: shouldBlock ? 'Cliente bloqueado com sucesso!' : 'Cliente desbloqueado e reativado com sucesso!' };
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  };

  const reactivateMaxPlayer = async (loginOrId: string, days: number = 30): Promise<{ success: boolean; message: string }> => {
    if (isDemo) {
      return { success: false, message: 'Modo Demonstração: reativação desabilitada no painel visual.' };
    }
    try {
      await fastCdnApi.reativarMaxPlayer(loginOrId, days);
      setCustomers(prev => prev.map(c => {
        if ((c.username || '').toLowerCase() === loginOrId.toLowerCase() || c.id === loginOrId) {
          const existingPartner = (c.partnerApp || c.partner_app || {}) as any;
          const updatedPartner = {
            ...existingPartner,
            status: 'active',
            is_active: true,
            is_inactive: false,
            is_deactivated: false,
            deactivatedAt: undefined,
            deactivationReason: undefined
          };
          return {
            ...c,
            partnerApp: updatedPartner,
            partner_app: updatedPartner
          };
        }
        return c;
      }));
      await refreshLiveData();
      return { success: true, message: `Max Player reativado com sucesso para ${loginOrId}!` };
    } catch (err: any) {
      return { success: false, message: err.message || 'Erro ao reativar Max Player' };
    }
  };

  const disconnectLiveConnection = async (id: string, username: string): Promise<{ success: boolean; message: string }> => {
    if (isDemo) {
      return { success: false, message: 'Modo Demonstração: encerramento de conexão desabilitado no painel visual.' };
    }
    try {
      await fastCdnApi.derrubarConexao(id || username);
      setLiveConnections(prev => prev.filter(c => c.id !== id && c.username !== username));
      setCustomers(prev => prev.map(c => {
        if (c.username.toLowerCase() === username.toLowerCase()) {
          return {
            ...c,
            active_connections: 0,
            connections_count: 0,
            telas_ativas: 0
          };
        }
        return c;
      }));
      return { success: true, message: 'Conexão encerrada com sucesso!' };
    } catch (err: any) {
      return { success: false, message: err.message || 'Erro ao derrubar conexão.' };
    }
  };

  const addReseller = async (res: any) => {
    if (isDemo) {
      return { success: false, message: 'Modo Demonstração: criação de revendas desabilitada no painel visual.' };
    }
    try {
      await fastCdnApi.criarSubRevenda({
        login_usuario: res.username,
        senha_usuario: res.password || '123456',
        nome_usuario: res.name || res.username,
        creditos: res.credits || 0,
        whatsapp: res.whatsapp
      });
      if (res.credits > 0) {
        logTransaction('TRANSFER', -res.credits, `Transferência inicial para sub-revenda ${res.username}`, res.username);
      }
      await refreshLiveData();
      return { success: true, message: 'Sub-revenda criada com sucesso no servidor!' };
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  };

  const addCreditsToReseller = async (resellerId: string, amount: number, notes?: string) => {
    if (isDemo) {
      return { success: false, message: 'Modo Demonstração: transferência de créditos desabilitada no painel visual.' };
    }
    const target = resellers.find(r => r.id === resellerId || r.username === resellerId);
    const targetLogin = target ? target.username : resellerId;

    try {
      await apiService.transferCredits(targetLogin, amount);
      const isRecall = amount < 0;
      logTransaction(
        isRecall ? 'RECHARGE' : 'TRANSFER',
        isRecall ? Math.abs(amount) : -amount,
        notes || (isRecall ? `Recolhimento de ${Math.abs(amount)} créditos de ${targetLogin}` : `Transferência de ${amount} créditos para ${targetLogin}`),
        targetLogin
      );
      await refreshLiveData();
      await fetchHierarchy();
      return {
        success: true,
        message: isRecall
          ? `${Math.abs(amount)} créditos recolhidos de ${targetLogin} com sucesso!`
          : `${amount} créditos transferidos para ${targetLogin} com sucesso!`
      };
    } catch (err: any) {
      return { success: false, message: err.message || 'Erro ao processar créditos.' };
    }
  };

  const toggleBlockReseller = async (id: string) => {
    if (isDemo) {
      return { success: false, message: 'Modo Demonstração: bloqueio de revendas desabilitado no painel visual.' };
    }
    const target = resellers.find(r => r.id === id || r.username === id);
    if (!target) return { success: false, message: 'Revenda não encontrada.' };

    const shouldBlock = target.status !== 'BLOCKED';
    try {
      if (shouldBlock) {
        await apiService.blockSubreseller(target.username);
      } else {
        await apiService.unblockSubreseller(target.username);
      }
      setResellers(prev => {
        const newStatus: Reseller['status'] = shouldBlock ? 'BLOCKED' : 'ACTIVE';
        const updated = prev.map(r => (r.id === id || r.username === id ? { ...r, status: newStatus } : r));
        localStorage.setItem('sigma_resellers', JSON.stringify(updated));
        return updated;
      });
      await fetchHierarchy();
      return { success: true, message: shouldBlock ? 'Sub-revenda bloqueada!' : 'Sub-revenda desbloqueada!' };
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  };

  const deleteReseller = async (idOrUsername: string) => {
    if (isDemo) {
      return { success: false, message: 'Modo Demonstração: exclusão de revendas desabilitada no painel visual.' };
    }
    const target = resellers.find(r => r.id === idOrUsername || r.username === idOrUsername);
    const username = target ? target.username : idOrUsername;

    try {
      await apiService.deleteSubreseller(username);
      setResellers(prev => {
        const updated = prev.filter(r => r.id !== idOrUsername && r.username !== idOrUsername && r.username !== username);
        localStorage.setItem('sigma_resellers', JSON.stringify(updated));
        return updated;
      });
      await refreshLiveData();
      await fetchHierarchy();
      return { success: true, message: `Revenda "${username}" excluída com sucesso!` };
    } catch (err: any) {
      return { success: false, message: err.message || 'Erro ao excluir revenda.' };
    }
  };

  const setResellerBotAccess = async (userIdOrUsername: string, enabled: boolean, monthlyCredits = 0) => {
    if (isDemo) {
      setResellers(prev => prev.map(r => {
        if (r.id === userIdOrUsername || r.username.toLowerCase() === userIdOrUsername.toLowerCase()) {
          return {
            ...r,
            botAccess: enabled,
            bot_access: enabled,
            botMonthlyCredits: monthlyCredits,
            bot_monthly_credits: monthlyCredits
          };
        }
        return r;
      }));
      return { success: true, message: `Permissão de bot atualizada para ${enabled ? 'Liberado' : 'Bloqueado'} (Demo)` };
    }

    try {
      const res = await apiService.setResellerBotAccess(userIdOrUsername, enabled, monthlyCredits);
      if (res && res.success) {
        setResellers(prev => prev.map(r => {
          if (r.id === userIdOrUsername || r.username.toLowerCase() === userIdOrUsername.toLowerCase()) {
            return {
              ...r,
              botAccess: enabled,
              bot_access: enabled,
              botMonthlyCredits: monthlyCredits,
              bot_monthly_credits: monthlyCredits
            };
          }
          return r;
        }));
        await refreshLiveData();
        await fetchHierarchy();
        return { success: true, message: res.message || 'Permissão do Bot WhatsApp atualizada com sucesso!' };
      }
      return { success: false, message: (res as any)?.error || 'Erro ao alterar permissão do bot.' };
    } catch (err: any) {
      return { success: false, message: err.message || 'Falha na comunicação com o servidor.' };
    }
  };

  const addTicket = (title: string, category: string, message: string) => {
    const newTck: SupportTicket = {
      id: 'TCK-' + Math.floor(1000 + Math.random() * 9000),
      title,
      category,
      status: 'OPEN',
      created_at: new Date().toLocaleDateString('pt-BR') + ' ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      last_reply: 'Aguardando suporte'
    };
    setTickets(prev => {
      const updated = [newTck, ...prev];
      localStorage.setItem('sigma_tickets', JSON.stringify(updated));
      return updated;
    });
  };

  const setTwoFactor = (enabled: boolean) => {
    localStorage.setItem('sigma_2fa', enabled ? 'true' : 'false');
    setProfile(prev => ({ ...prev, two_factor_enabled: enabled }));
  };

  const updateProfile = (updates: Partial<UserProfile>) => {
    setProfile(prev => {
      const merged = { ...prev, ...updates };
      try {
        localStorage.setItem('sigma_profile', JSON.stringify(merged));
      } catch {}
      return merged;
    });
  };

  // Funções de Gestão de Preços e Faturamento
  const updateResellerPricing = async (username: string, pricing: Partial<ResellerPricing>) => {
    const key = (username || '').toLowerCase();
    setResellerPricings(prev => {
      const existing = prev[key] || {
        reseller_username: username,
        price_per_client: globalBillingSettings.default_price_per_client,
        price_per_extra_screen: globalBillingSettings.default_price_per_extra_screen,
        due_day: globalBillingSettings.default_due_day,
        include_subreseller_clients: true
      };
      const updated = {
        ...prev,
        [key]: {
          ...existing,
          ...pricing,
          updated_at: new Date().toISOString()
        }
      };
      localStorage.setItem('sigma_reseller_pricings', JSON.stringify(updated));
      return updated;
    });

    // Enviar para o backend VPS para persistência permanente e cluster sync
    try {
      const token = localStorage.getItem('sigma_session_token') ||
        localStorage.getItem('sigma_active_key') ||
        localStorage.getItem('sigma_reseller_key') ||
        MasterKeyStore.get() ||
        APP_CONFIG.defaultApiKey;
      const base = (APP_CONFIG.apiBaseUrl || 'https://fastcdn.fit').replace(/\/+$/, '');
      const endpoints = isHostedOnGithub()
        ? [
            `${base}/api/v1/reseller-prices`,
            `${base}/api/reseller-prices`
          ]
        : [
            '/fastcdn-api/api/v1/reseller-prices',
            `${base}/api/v1/reseller-prices`,
            `${base}/api/reseller-prices`,
            '/api/v1/reseller-prices'
          ];
      for (const url of endpoints) {
        try {
          const res = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
              'X-API-Key': token
            },
            body: JSON.stringify({
              username,
              ...pricing
            })
          });
          if (res.ok) break;
        } catch {}
      }
    } catch {}
  };

  const updateGlobalBillingSettings = (settings: Partial<GlobalBillingSettings>) => {
    setGlobalBillingSettings(prev => {
      const updated = { ...prev, ...settings };
      localStorage.setItem('sigma_global_billing', JSON.stringify(updated));
      return updated;
    });
  };

  const toggleInvoicePaid = (resellerUsername: string, monthKey?: string) => {
    const mKey = monthKey || new Date().toISOString().substring(0, 7);
    const paymentKey = `${mKey}_${(resellerUsername || '').toLowerCase()}`;
    setInvoicePayments(prev => {
      const current = prev[paymentKey]?.status === 'PAID';
      const updated = {
        ...prev,
        [paymentKey]: {
          status: (current ? 'PENDING' : 'PAID') as 'PENDING' | 'PAID',
          paid_at: current ? undefined : new Date().toISOString()
        }
      };
      localStorage.setItem('sigma_invoice_payments', JSON.stringify(updated));
      return updated;
    });
  };

  const calculateResellerInvoice = useCallback((resellerUsername: string, monthKey?: string): ResellerInvoiceSummary => {
    const uKey = (resellerUsername || '').toLowerCase();
    const mKey = monthKey || new Date().toISOString().substring(0, 7);
    const reseller = resellers.find(r => (r.username || '').toLowerCase() === uKey);

    const pricing = resellerPricings[uKey] || {
      reseller_username: resellerUsername,
      price_per_client: globalBillingSettings.default_price_per_client,
      price_per_extra_screen: globalBillingSettings.default_price_per_extra_screen,
      due_day: globalBillingSettings.default_due_day,
      include_subreseller_clients: true
    };

    const screensPerCredit = pricing.screens_per_credit !== undefined
      ? Math.max(1, Number(pricing.screens_per_credit))
      : (globalBillingSettings.default_screens_per_credit ? Math.max(1, Number(globalBillingSettings.default_screens_per_credit)) : 1);

    // Clientes diretos ATIVOS do revendedor (clientes vencidos NÃO contabilizam para cobrança)
    const directClients = customers.filter(c => {
      const isOwner = (c.reseller_username || '').toLowerCase() === uKey ||
                      (c.dono || '').toLowerCase() === uKey;
      return isOwner && isCustomerActiveForBilling(c);
    });
    const directClientsCount = directClients.length > 0
      ? directClients.length
      : (reseller?.active_customers_count !== undefined
          ? reseller.active_customers_count
          : Math.max(0, (reseller?.customers_count || 0) - (reseller?.clientes_expirados || 0)));

    // Conexões adicionais (telas extras além do limite incluso por crédito)
    const directExtraScreens = directClients.reduce((acc, c) => {
      const conns = c.conectado || c.max_connections || c.connections_count || 1;
      return acc + Math.max(0, conns - screensPerCredit);
    }, 0);

    // 1. Clientes diretos e seus apps parceiros (ativas a partir de 03/10/2026, com suporte a múltiplos dispositivos)
    const directPartnerAppsList: PartnerAppItemDetail[] = [];
    directClients.forEach(c => {
      const pApps = getCustomerPartnerApps(c, resellerUsername);
      pApps.forEach(p => directPartnerAppsList.push({ ...p, is_subreseller: false }));
    });
    const isAppBillable = (p: PartnerAppItemDetail) => {
      const isMax = p.app_name.toLowerCase().includes('max');
      if (isMax) {
        if (p.is_inactive || p.is_deactivated || p.status === 'inactive' || p.status === 'deactivated') {
          return false;
        }
      }
      return true;
    };
    const directBillablePartnerApps = directPartnerAppsList.filter(isAppBillable);
    const directPartnerAppsCount = directBillablePartnerApps.length;
    const directGerenciaApps = directBillablePartnerApps.filter(p => !p.app_name.toLowerCase().includes('max')).length;
    const directMaxPlayerApps = directBillablePartnerApps.filter(p => p.app_name.toLowerCase().includes('max')).length;

    // Sub-revendas subordinadas (hierárquicas)
    const subresellersDetail: SubresellerDownstreamDetail[] = [];
    const allSubresellersPartnerAppsList: PartnerAppItemDetail[] = [];
    let subresellerClientsCount = 0;
    let subresellerExtraScreens = 0;
    let subresellerPartnerAppsCount = 0;
    let subresellerGerenciaApps = 0;
    let subresellerMaxPlayerApps = 0;

    if (pricing.include_subreseller_clients !== false) {
      const downstreamSubs = resellers.filter(r => {
        if ((r.username || '').toLowerCase() === uKey) return false;
        if ((r.pai_username || '').toLowerCase() === uKey) return true;
        if (r.linhagem && r.linhagem.some(l => l.toLowerCase() === uKey)) return true;
        return false;
      });

      downstreamSubs.forEach(sub => {
        const subUsername = (sub.username || '').toLowerCase();
        const subPricing = resellerPricings[subUsername];
        const subScreensPerCredit = subPricing?.screens_per_credit !== undefined
          ? Math.max(1, Number(subPricing.screens_per_credit))
          : screensPerCredit;

        // Apenas clientes ATIVOS da sub-revenda são cobrados
        const subClients = customers.filter(c => {
          const isOwner = (c.reseller_username || '').toLowerCase() === subUsername ||
                          (c.dono || '').toLowerCase() === subUsername;
          return isOwner && isCustomerActiveForBilling(c);
        });
        const subCount = subClients.length > 0
          ? subClients.length
          : (sub.active_customers_count !== undefined
              ? sub.active_customers_count
              : Math.max(0, (sub.customers_count || 0) - (sub.clientes_expirados || 0)));
        const subScreens = subClients.reduce((acc, c) => {
          const conns = c.conectado || c.max_connections || c.connections_count || 1;
          return acc + Math.max(0, conns - subScreensPerCredit);
        }, 0);

        // Apps parceiros ativos da sub-revenda
        const subPartnerApps: PartnerAppItemDetail[] = [];
        subClients.forEach(c => {
          const pApps = getCustomerPartnerApps(c, sub.username);
          pApps.forEach(p => subPartnerApps.push({ ...p, is_subreseller: true }));
        });
        const subBillablePartnerApps = subPartnerApps.filter(isAppBillable);
        const subPartnerAppsCount = subBillablePartnerApps.length;
        const subGerencia = subBillablePartnerApps.filter(p => !p.app_name.toLowerCase().includes('max')).length;
        const subMax = subBillablePartnerApps.filter(p => p.app_name.toLowerCase().includes('max')).length;

        subresellerClientsCount += subCount;
        subresellerExtraScreens += subScreens;
        subresellerPartnerAppsCount += subPartnerAppsCount;
        subresellerGerenciaApps += subGerencia;
        subresellerMaxPlayerApps += subMax;
        allSubresellersPartnerAppsList.push(...subPartnerApps);

        subresellersDetail.push({
          username: sub.username,
          name: sub.name || sub.username,
          whatsapp: sub.whatsapp,
          nivel: sub.nivel || 2,
          direct_clients: subCount,
          extra_screens: subScreens,
          partner_apps: subPartnerAppsCount,
          partner_apps_detail: subPartnerApps,
          price_per_client: subPricing?.price_per_client || globalBillingSettings.default_price_per_client,
          screens_per_credit: subScreensPerCredit,
          price_per_extra_screen: subPricing?.price_per_extra_screen || globalBillingSettings.default_price_per_extra_screen,
          price_per_partner_app: subPricing?.price_per_partner_app ?? (globalBillingSettings.default_price_per_partner_app ?? 0),
          price_per_gerencia_app: subPricing?.price_per_gerencia_app ?? globalBillingSettings.default_price_per_gerencia_app,
          price_per_maxplayer_app: subPricing?.price_per_maxplayer_app ?? globalBillingSettings.default_price_per_maxplayer_app
        });
      });
    }

    const totalClients = directClientsCount + subresellerClientsCount;
    const totalExtraScreens = directExtraScreens + subresellerExtraScreens;
    const totalPartnerApps = directPartnerAppsCount + subresellerPartnerAppsCount;
    const totalGerenciaApps = directGerenciaApps + subresellerGerenciaApps;
    const totalMaxPlayerApps = directMaxPlayerApps + subresellerMaxPlayerApps;

    const pricePerGerenciaApp = pricing.price_per_gerencia_app !== undefined
      ? Number(pricing.price_per_gerencia_app)
      : (pricing.price_per_partner_app !== undefined
          ? Number(pricing.price_per_partner_app)
          : (globalBillingSettings.default_price_per_gerencia_app !== undefined
              ? Number(globalBillingSettings.default_price_per_gerencia_app)
              : (globalBillingSettings.default_price_per_partner_app !== undefined ? Number(globalBillingSettings.default_price_per_partner_app) : 0)));

    const pricePerMaxPlayerApp = pricing.price_per_maxplayer_app !== undefined
      ? Number(pricing.price_per_maxplayer_app)
      : (pricing.price_per_partner_app !== undefined
          ? Number(pricing.price_per_partner_app)
          : (globalBillingSettings.default_price_per_maxplayer_app !== undefined
              ? Number(globalBillingSettings.default_price_per_maxplayer_app)
              : (globalBillingSettings.default_price_per_partner_app !== undefined ? Number(globalBillingSettings.default_price_per_partner_app) : 0)));

    const pricePerPartnerApp = (pricePerGerenciaApp || pricePerMaxPlayerApp || pricing.price_per_partner_app || globalBillingSettings.default_price_per_partner_app || 0);

    const subtotalClients = Number((totalClients * pricing.price_per_client).toFixed(2));
    const subtotalScreens = Number((totalExtraScreens * pricing.price_per_extra_screen).toFixed(2));
    const subtotalGerenciaApps = Number((totalGerenciaApps * pricePerGerenciaApp).toFixed(2));
    const subtotalMaxPlayerApps = Number((totalMaxPlayerApps * pricePerMaxPlayerApp).toFixed(2));
    const subtotalPartnerApps = Number((subtotalGerenciaApps + subtotalMaxPlayerApps).toFixed(2));
    const totalAmount = Number((subtotalClients + subtotalScreens + subtotalPartnerApps).toFixed(2));

    const allPartnerAppsDetail = [...directPartnerAppsList, ...allSubresellersPartnerAppsList];

    const paymentKey = `${mKey}_${uKey}`;
    const payment = invoicePayments[paymentKey];
    const isPaid = payment?.status === 'PAID';

    return {
      reseller_username: resellerUsername,
      reseller_name: reseller?.name || resellerUsername,
      whatsapp: reseller?.whatsapp,
      status: reseller?.status || 'ACTIVE',
      nivel: reseller?.nivel || 1,
      direct_clients: directClientsCount,
      subreseller_clients: subresellerClientsCount,
      total_clients: totalClients,
      screens_per_credit: screensPerCredit,
      direct_extra_screens: directExtraScreens,
      subreseller_extra_screens: subresellerExtraScreens,
      total_extra_screens: totalExtraScreens,
      direct_partner_apps: directPartnerAppsCount,
      subreseller_partner_apps: subresellerPartnerAppsCount,
      total_partner_apps: totalPartnerApps,
      direct_gerencia_apps: directGerenciaApps,
      direct_maxplayer_apps: directMaxPlayerApps,
      subreseller_gerencia_apps: subresellerGerenciaApps,
      subreseller_maxplayer_apps: subresellerMaxPlayerApps,
      total_gerencia_apps: totalGerenciaApps,
      total_maxplayer_apps: totalMaxPlayerApps,
      price_per_client: pricing.price_per_client,
      price_per_extra_screen: pricing.price_per_extra_screen,
      price_per_partner_app: pricePerPartnerApp,
      price_per_gerencia_app: pricePerGerenciaApp,
      price_per_maxplayer_app: pricePerMaxPlayerApp,
      due_day: pricing.due_day,
      subtotal_clients: subtotalClients,
      subtotal_screens: subtotalScreens,
      subtotal_gerencia_apps: subtotalGerenciaApps,
      subtotal_maxplayer_apps: subtotalMaxPlayerApps,
      subtotal_partner_apps: subtotalPartnerApps,
      total_amount: totalAmount,
      partner_apps_detail: allPartnerAppsDetail,
      subresellers_detail: subresellersDetail,
      is_paid: isPaid,
      paid_at: payment?.paid_at,
      month_key: mKey
    };
  }, [resellers, customers, resellerPricings, globalBillingSettings, invoicePayments]);

  const rankingData = useMemo(() => {
    return calculatePanelGamificationRanking(
      customers,
      resellers,
      profile,
      APP_CONFIG.appName || APP_CONFIG.appShortName || 'Painel',
      (APP_CONFIG.activePresetId || 'default').toLowerCase()
    );
  }, [customers, resellers, profile]);

  return (
    <SigmaStoreContext.Provider
      value={{
        profile,
        customers,
        resellers,
        hierarchyData,
        transactions,
        deletedCustomers,
        liveConnections,
        notices,
        tickets,
        theme,
        apiKey,
        isAuthenticated,
        isLoadingLive,
        liveError,
        isLiveConnected,
        toggleTheme,
        loginWithApiKey,
        loginWithCredentials,
        logout,
        refreshLiveData,
        fetchHierarchy,
        disconnectLiveConnection,
        addCustomer,
        updateCustomer,
        deleteCustomer,
        restoreCustomer,
        renewCustomer,
        addCourtesyDays,
        toggleBlockCustomer,
        reactivateMaxPlayer,
        addReseller,
        deleteReseller,
        addCreditsToReseller,
        toggleBlockReseller,
        addTicket,
        setTwoFactor,
        updateProfile,
        resellerPricings,
        globalBillingSettings,
        invoicePayments,
        updateResellerPricing,
        updateGlobalBillingSettings,
        calculateResellerInvoice,
        toggleInvoicePaid,
        saveCustomerPrice,
        rankingData,
        setResellerBotAccess,
        isDemo,
        enterDemoMode
      }}
    >
      {children}
    </SigmaStoreContext.Provider>
  );
};

export const useSigmaStore = () => {
  const context = useContext(SigmaStoreContext);
  if (!context) {
    throw new Error('useSigmaStore must be used within a SigmaStoreProvider');
  }
  return context;
};
