export interface Customer {
  id: string;
  username: string;
  password?: string;
  name?: string;
  email?: string;
  whatsapp?: string;
  status: 'ACTIVE' | 'EXPIRED' | 'TRIAL' | 'BLOCKED';
  created_at: string;
  expires_at: string;
  expiresAt?: string | null;
  expiration?: string;
  exp_date?: string;
  vencimento?: string;
  server?: string;
  server_id?: string;
  server_name?: string;
  package?: string;
  package_id?: string;
  package_name?: string;
  max_connections?: number;
  active_connections?: number;
  connections_count?: number;
  connections_max?: number;
  conectado?: number;
  telas_ativas?: number;
  reseller_username?: string;
  reseller_id?: string;
  dono?: string;
  notes?: string;
  subscription_value?: number; // Valor mensal cobrado pelo revendedor ao cliente
  isp_lock?: boolean;
  asn_lock?: boolean;
  restreamer?: boolean;
  is_trial?: boolean;
  m3u_url?: string;
  epg_url?: string;
  partner_app?: {
    mac?: string;
    appId?: string;
    appName?: string;
    appUser?: string;
    appPassword?: string;
    dns?: string;
    userId?: string;
    expiresAt?: string;
    activatedAt?: string;
    reseller_username?: string;
  } | null;
  partnerApp?: {
    mac?: string;
    appId?: string;
    appName?: string;
    appUser?: string;
    appPassword?: string;
    dns?: string;
    userId?: string;
    expiresAt?: string;
    activatedAt?: string;
    reseller_username?: string;
  } | null;
  partnerDevices?: any[];
  mac?: string;
}

export interface Reseller {
  id: string;
  username: string;
  name?: string;
  email?: string;
  whatsapp?: string;
  status: 'ACTIVE' | 'BLOCKED';
  credits: number;
  creditos_ilimitados?: boolean;
  parent_reseller?: string;
  pai_id?: string;
  pai_username?: string;
  linhagem?: string[];
  nivel?: number;
  last_recharge_at?: string;
  ultimo_acesso?: string | null;
  created_at: string;
  dns?: string;
  subresellers_count: number;
  sub_revendas_filhas?: number;
  customers_count: number;
  active_customers_count?: number;
  clientes_expirados?: number;
  notas?: string;
  bot_access?: boolean;
  botAccess?: boolean;
  bot_monthly_credits?: number;
  botMonthlyCredits?: number;
  pricing?: ResellerPricing;
}

export interface CreditTransaction {
  id: string;
  date: string;
  from?: string;
  to?: string;
  amount?: number;
  notes?: string;
  type: 'TRANSFER' | 'PURCHASE' | 'BONUS' | 'RECHARGE' | 'RENEWAL' | 'NEW_CLIENT';
  credits?: string;
  type_label?: string;
  balance_before?: number | string;
  balance_after?: number | string;
  description?: string;
  user?: string;
}

export interface LiveConnection {
  id: string;
  username: string;
  customer_name?: string;
  stream_title: string;
  category?: string;
  type?: 'live' | 'movie' | 'series' | string;
  speed?: string;
  speed_type?: string;
  ip_address: string;
  user_agent: string;
  country: string;
  connected_at: string;
  channel?: string;
  ip?: string;
  player?: string;
  duration?: string;
  server?: string;
}

export interface Notice {
  id: string;
  title: string;
  content: string;
  date: string;
  priority?: 'LOW' | 'NORMAL' | 'HIGH';
  urgency?: 'LOW' | 'NORMAL' | 'HIGH';
  category?: string;
  author?: string;
}

export interface SupportTicket {
  id: string;
  type?: 'report' | 'request';
  contentType?: 'movie' | 'series' | 'channel';
  title?: string;
  subject?: string;
  category?: string;
  description?: string;
  year?: string;
  status: 'OPEN' | 'IN_ANALYSIS' | 'ADDED' | 'RESOLVED' | 'REJECTED' | 'IN_PROGRESS' | 'CLOSED' | 'ANSWERED';
  reportedBy?: string;
  franchiseDomain?: string;
  createdAt?: string;
  created_at?: string;
  last_reply?: string;
  adminReply?: string;
  respondedBy?: string;
  respondedAt?: string;
  messages?: any[];
  messages_count?: number;
}

export interface UserProfile {
  id: string;
  username: string;
  name?: string;
  whatsapp?: string;
  role: string;
  status?: string;
  credits: number | string;
  unlimited_credits?: boolean;
  creditos_ilimitados?: boolean;
  membership_expiry_date?: string;
  membership_expiry_at_formatted?: string;
  membership_expiry_date_days?: number;
  monthly_cost?: number;
  custo_mensal?: number;
  is_master?: boolean;
  isMaster?: boolean;
  is_admin?: boolean;
  isAdmin?: boolean;
  franchise_id?: string;
  franchiseId?: string;
  online_users_count?: number;
  two_factor_enabled?: boolean;
  notes?: string;
  bot_access?: boolean;
  botAccess?: boolean;
  bot_monthly_credits?: number;
  botMonthlyCredits?: number;
  servers?: any[];
  servers_dns?: any;
}

export interface ResellerPricing {
  reseller_username: string;
  fixed_monthly_cost?: number; // Valor fixo mensal cobrado pelo Master desta revenda
  price_per_client: number; // R$ por cliente ativo/mês (ex: 1.00)
  screens_per_credit?: number; // Quantas telas inclusas no crédito/ativo padrão da revenda (ex: 1 ou 2)
  price_per_extra_screen: number; // R$ por tela extra/mês além das telas inclusas (ex: 0.50)
  due_day: number; // Dia de vencimento da fatura (ex: 10)
  include_subreseller_clients: boolean; // Se cobra clientes de sub-revendas subordinadas (padrão true)
  pix_key?: string; // Chave PIX personalizada para este revendedor
  pix_name?: string;
  price_per_partner_app?: number; // Preço genérico cobrado por app parceiro (legado)
  price_per_gerencia_app?: number; // Preço cobrado por dispositivo GerenciaApp ativo
  price_per_maxplayer_app?: number; // Preço cobrado por conta MaxPlayer ativa
  bot_access_enabled?: boolean; // Permissão de uso do WhatsApp Bot liberada
  bot_credits_monthly_cost?: number; // Custo mensal em créditos cobrado pelo uso do WhatsApp Bot
  notes?: string;
  updated_at?: string;
}

export interface GlobalBillingSettings {
  default_price_per_client: number; // Padrão: 1.00
  default_screens_per_credit?: number; // Padrão: 1 (ou 2 conforme configurado na franquia)
  default_price_per_extra_screen: number; // Padrão: 0.50
  default_price_per_partner_app?: number; // Padrão: 0.00 ou 5.00
  default_price_per_gerencia_app?: number; // Padrão: 0.00 ou 5.00
  default_price_per_maxplayer_app?: number; // Padrão: 0.00 ou 5.00
  default_due_day: number; // Padrão: 10
  pix_key: string;
  pix_name: string;
  pix_city?: string;
  whatsapp_billing_message_template?: string;
}

export interface PartnerAppItemDetail {
  app_name: string;
  customer_username: string;
  customer_name?: string;
  customer_id?: string;
  reseller_username: string;
  is_subreseller?: boolean;
  mac?: string;
  app_user?: string;
  activated_at?: string;
  expires_at?: string;
  is_client_active?: boolean;
  is_app_expired?: boolean;
  status?: string;
  is_inactive?: boolean;
  is_deactivated?: boolean;
  deactivated_at?: string;
  deactivation_reason?: string;
}

export interface SubresellerDownstreamDetail {
  username: string;
  name?: string;
  whatsapp?: string;
  nivel: number;
  direct_clients: number;
  extra_screens: number;
  partner_apps: number; // Total de apps parceiros ativos desta sub-revenda
  partner_apps_detail?: PartnerAppItemDetail[];
  price_per_client?: number;
  screens_per_credit?: number;
  price_per_extra_screen?: number;
  price_per_partner_app?: number;
  price_per_gerencia_app?: number;
  price_per_maxplayer_app?: number;
}

export interface ResellerInvoiceSummary {
  reseller_username: string;
  reseller_name?: string;
  whatsapp?: string;
  status?: string;
  nivel: number;
  direct_clients: number;
  subreseller_clients: number;
  total_clients: number;
  screens_per_credit: number; // Telas inclusas por crédito/ativo
  direct_extra_screens: number;
  subreseller_extra_screens: number;
  total_extra_screens: number;
  direct_partner_apps: number; // Apps de clientes diretos deste revendedor
  subreseller_partner_apps: number; // Apps das sub-revendas subordinadas
  total_partner_apps: number; // Total consolidado
  direct_gerencia_apps: number;
  direct_maxplayer_apps: number;
  subreseller_gerencia_apps: number;
  subreseller_maxplayer_apps: number;
  total_gerencia_apps: number;
  total_maxplayer_apps: number;
  price_per_client: number;
  price_per_extra_screen: number;
  price_per_partner_app: number;
  price_per_gerencia_app: number;
  price_per_maxplayer_app: number;
  due_day: number;
  subtotal_clients: number;
  subtotal_screens: number;
  subtotal_gerencia_apps: number;
  subtotal_maxplayer_apps: number;
  subtotal_partner_apps: number; // subtotal_gerencia_apps + subtotal_maxplayer_apps
  total_amount: number; // subtotal_clients + subtotal_screens + subtotal_partner_apps
  partner_apps_detail: PartnerAppItemDetail[];
  subresellers_detail: SubresellerDownstreamDetail[];
  is_paid: boolean;
  paid_at?: string;
  month_key: string; // Ex: "2026-09"
}

export interface RankingBadge {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlocked: boolean;
}

export interface ResellerRankingItem {
  id: string;
  username: string;
  displayName: string;
  whatsapp?: string;
  rank: number;
  activeClients: number;
  expiredClients: number;
  trialClients: number;
  totalClients: number;
  newClientsThisMonth: number;
  renewalsThisMonth: number;
  retentionRate: number;
  tier: 'bronze' | 'silver' | 'gold' | 'diamond' | 'master';
  tierName: string;
  nextTierName: string | null;
  nextTierTarget: number;
  tierProgress: number;
  xp: number;
  badges: RankingBadge[];
}

export interface PanelGamificationRanking {
  panelName: string;
  panelSlug: string;
  month: string;
  totalParticipants: number;
  ranking: ResellerRankingItem[];
  currentUserRank?: ResellerRankingItem | null;
}


