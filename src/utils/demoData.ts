import { Customer, Reseller, LiveConnection, CreditTransaction } from '../types';
import { HierarchyResponse } from '../services/apiService';

export const checkIsDedicatedDemoPanel = (): boolean => {
  if (typeof window === 'undefined') return false;
  return Boolean(
    (window as any).__APP_CONFIG__?.isDemo ||
    (window as any).__APP_CONFIG__?.isDemoPanel ||
    window.location.hostname.startsWith('demo.') ||
    window.location.hostname.includes('painel-demo')
  );
};

export const DEMO_PROFILE = {
  id: 'res_demo',
  username: 'demo',
  name: 'Administrador Demo',
  whatsapp: '5511999999999',
  role: 'master' as const,
  is_master: true,
  isMaster: true,
  franchise_id: undefined,
  franchiseId: undefined,
  status: 'ACTIVE' as const,
  credits: 450,
  unlimited_credits: false,
  creditos_ilimitados: false,
  membership_expiry_date: '31/12/2026',
  online_users_count: 4,
  two_factor_enabled: false
};

export const DEMO_CUSTOMERS: Customer[] = [
  {
    id: 'demo_c1',
    username: 'carlos.silva',
    name: 'Carlos Alberto Silva',
    whatsapp: '11987654321',
    email: 'carlos.silva@exemplo.com',
    status: 'ACTIVE',
    created_at: '10/01/2026',
    expires_at: '25/11/2026',
    vencimento: '25/11/2026',
    package_name: 'COMPLETO 4K + ADULTOS',
    package: 'COMPLETO 4K + ADULTOS',
    max_connections: 2,
    active_connections: 1,
    connections_count: 1,
    telas_ativas: 1,
    conectado: 1,
    subscription_value: 35.00,
    is_trial: false,
    reseller_username: 'demo'
  },
  {
    id: 'demo_c2',
    username: 'mariana.costa',
    name: 'Mariana Costa',
    whatsapp: '21976543210',
    email: 'mariana.costa@exemplo.com',
    status: 'ACTIVE',
    created_at: '15/02/2026',
    expires_at: '15/10/2026',
    vencimento: '15/10/2026',
    package_name: 'ESPORTES HD & CANAIS',
    package: 'ESPORTES HD & CANAIS',
    max_connections: 1,
    active_connections: 1,
    connections_count: 1,
    telas_ativas: 1,
    conectado: 1,
    subscription_value: 30.00,
    is_trial: false,
    reseller_username: 'demo'
  },
  {
    id: 'demo_c3',
    username: 'felipe.teste',
    name: 'Felipe Santos (Teste)',
    whatsapp: '31965432109',
    status: 'TRIAL',
    created_at: 'Hoje 14:00',
    expires_at: 'Hoje 20:00',
    vencimento: 'Hoje 20:00',
    package_name: 'TESTE VIP 4 HORAS',
    package: 'TESTE VIP 4 HORAS',
    max_connections: 1,
    active_connections: 1,
    connections_count: 1,
    telas_ativas: 1,
    conectado: 1,
    subscription_value: 0,
    is_trial: true,
    reseller_username: 'demo'
  },
  {
    id: 'demo_c4',
    username: 'larissa.oliveira',
    name: 'Larissa Oliveira',
    whatsapp: '41954321098',
    status: 'ACTIVE',
    created_at: '05/03/2026',
    expires_at: '05/12/2026',
    vencimento: '05/12/2026',
    package_name: 'FILMES & SÉRIES VOD',
    package: 'FILMES & SÉRIES VOD',
    max_connections: 2,
    active_connections: 0,
    connections_count: 0,
    telas_ativas: 0,
    conectado: 0,
    subscription_value: 35.00,
    is_trial: false,
    reseller_username: 'demo'
  },
  {
    id: 'demo_c5',
    username: 'rodrigo.lima',
    name: 'Rodrigo Lima',
    whatsapp: '51943210987',
    status: 'EXPIRED',
    created_at: '01/01/2026',
    expires_at: '01/10/2026',
    vencimento: '01/10/2026',
    package_name: 'COMPLETO HD',
    package: 'COMPLETO HD',
    max_connections: 1,
    active_connections: 0,
    connections_count: 0,
    telas_ativas: 0,
    conectado: 0,
    subscription_value: 30.00,
    is_trial: false,
    reseller_username: 'demo'
  },
  {
    id: 'demo_c6',
    username: 'lucas.teste',
    name: 'Lucas Mendes (Teste)',
    whatsapp: '61932109876',
    status: 'TRIAL',
    created_at: 'Hoje 15:30',
    expires_at: 'Hoje 21:30',
    vencimento: 'Hoje 21:30',
    package_name: 'TESTE VIP 4 HORAS',
    package: 'TESTE VIP 4 HORAS',
    max_connections: 1,
    active_connections: 1,
    connections_count: 1,
    telas_ativas: 1,
    conectado: 1,
    subscription_value: 0,
    is_trial: true,
    reseller_username: 'demo'
  },
  {
    id: 'demo_c7',
    username: 'vanessa.souza',
    name: 'Vanessa Souza',
    whatsapp: '71921098765',
    status: 'ACTIVE',
    created_at: '20/04/2026',
    expires_at: '20/11/2026',
    vencimento: '20/11/2026',
    package_name: 'COMPLETO 4K VIP',
    package: 'COMPLETO 4K VIP',
    max_connections: 3,
    active_connections: 0,
    connections_count: 0,
    telas_ativas: 0,
    conectado: 0,
    subscription_value: 45.00,
    is_trial: false,
    reseller_username: 'demo'
  },
  {
    id: 'demo_c8',
    username: 'bruno.ferreira',
    name: 'Bruno Ferreira',
    whatsapp: '81910987654',
    status: 'BLOCKED',
    created_at: '12/02/2026',
    expires_at: '12/05/2026',
    vencimento: '12/05/2026',
    package_name: 'COMPLETO 4K',
    package: 'COMPLETO 4K',
    max_connections: 1,
    active_connections: 0,
    connections_count: 0,
    telas_ativas: 0,
    conectado: 0,
    subscription_value: 30.00,
    is_trial: false,
    reseller_username: 'demo'
  }
];

export const DEMO_RESELLERS: Reseller[] = [
  {
    id: 'demo_r1',
    username: 'revenda_ouro',
    name: 'Revenda Ouro Brasil',
    whatsapp: '11998877665',
    email: 'ouro@revendaiptv.com',
    status: 'ACTIVE',
    credits: 140,
    customers_count: 48,
    active_customers_count: 42,
    clientes_expirados: 6,
    subresellers_count: 2,
    sub_revendas_filhas: 2,
    created_at: '01/01/2026',
    ultimo_acesso: 'Hoje 14:10'
  },
  {
    id: 'demo_r2',
    username: 'master_stream',
    name: 'Master Streaming SP',
    whatsapp: '11988776655',
    email: 'contato@masterstream.com',
    status: 'ACTIVE',
    credits: 85,
    customers_count: 29,
    active_customers_count: 26,
    clientes_expirados: 3,
    subresellers_count: 1,
    sub_revendas_filhas: 1,
    created_at: '15/01/2026',
    ultimo_acesso: 'Ontem 18:45'
  },
  {
    id: 'demo_r3',
    username: 'iptv_prime',
    name: 'IPTV Prime Digital',
    whatsapp: '21977665544',
    email: 'prime@iptvprime.net',
    status: 'ACTIVE',
    credits: 22,
    customers_count: 14,
    active_customers_count: 12,
    clientes_expirados: 2,
    subresellers_count: 0,
    sub_revendas_filhas: 0,
    created_at: '02/02/2026',
    ultimo_acesso: 'Hoje 11:20'
  }
];

export const DEMO_LIVE_CONNECTIONS: LiveConnection[] = [
  {
    id: 'conn_demo_1',
    username: 'carlos.silva',
    customer_name: 'Carlos Alberto Silva',
    stream_title: 'GLOBO SP FHD',
    category: 'Canais Ao Vivo',
    type: 'live',
    speed: '8.4 Mbps',
    speed_type: 'Tempo Real',
    user_agent: 'ExoPlayer (Android TV 12)',
    ip_address: '189.40.122.14',
    country: 'BR',
    connected_at: 'Há 42 min',
    duration: '42m'
  },
  {
    id: 'conn_demo_2',
    username: 'mariana.costa',
    customer_name: 'Mariana Costa',
    stream_title: 'PREMIERE CLUBES HD',
    category: 'Esportes Ao Vivo',
    type: 'live',
    speed: '7.1 Mbps',
    speed_type: 'Tempo Real',
    user_agent: 'IPTV Smarters Pro (iOS)',
    ip_address: '177.135.24.89',
    country: 'BR',
    connected_at: 'Há 18 min',
    duration: '18m'
  },
  {
    id: 'conn_demo_3',
    username: 'felipe.teste',
    customer_name: 'Felipe Santos (Teste)',
    stream_title: 'HBO MAX - FILME 4K',
    category: 'Filmes VOD',
    type: 'movie',
    speed: '11.8 Mbps',
    speed_type: 'Tempo Real',
    user_agent: 'Samsung Smart TV (Tizen)',
    ip_address: '201.86.15.201',
    country: 'BR',
    connected_at: 'Há 55 min',
    duration: '55m'
  },
  {
    id: 'conn_demo_4',
    username: 'lucas.teste',
    customer_name: 'Lucas Mendes (Teste)',
    stream_title: 'ESPN BRASIL FHD',
    category: 'Esportes Ao Vivo',
    type: 'live',
    speed: '6.9 Mbps',
    speed_type: 'Tempo Real',
    user_agent: 'TV Box Android 12',
    ip_address: '191.241.200.55',
    country: 'BR',
    connected_at: 'Há 5 min',
    duration: '5m'
  }
];

export const DEMO_TRANSACTIONS: CreditTransaction[] = [
  {
    id: 'tx_demo_1',
    date: 'Hoje 14:00',
    type: 'RECHARGE',
    type_label: 'Recarga',
    credits: '+500',
    balance_before: 0,
    balance_after: 500,
    description: 'Recarga inicial de créditos Demo',
    user: 'Sistema'
  },
  {
    id: 'tx_demo_2',
    date: 'Hoje 14:15',
    type: 'TRANSFER',
    type_label: 'Transferência',
    credits: '-50',
    balance_before: 500,
    balance_after: 450,
    description: 'Créditos para revenda_ouro',
    user: 'demo'
  }
];

export const DEMO_HIERARCHY: HierarchyResponse = {
  ator: {
    id: 'demo',
    username: 'demo',
    name: 'Administrador Demo',
    role: 'master',
    nivel: 0,
    linhagem: ['demo']
  },
  stats_globais: {
    total_revendas: 3,
    total_clientes: 8,
    clientes_ativos: 7
  },
  arvore: {
    id: 'demo',
    username: 'demo',
    name: 'Administrador Demo',
    role: 'master',
    nivel: 0,
    status: 'ACTIVE',
    creditos: 450,
    linhagem: ['demo'],
    total_clientes_diretos: 8,
    clientes_ativos_diretos: 7,
    total_sub_revendas: 3,
    sub_revendas: [
      {
        id: 'demo_r1',
        username: 'revenda_ouro',
        name: 'Revenda Ouro Brasil',
        role: 'reseller',
        nivel: 1,
        status: 'ACTIVE',
        creditos: 140,
        pai_username: 'demo',
        linhagem: ['demo', 'revenda_ouro'],
        total_clientes_diretos: 15,
        clientes_ativos_diretos: 14,
        total_sub_revendas: 0,
        sub_revendas: []
      },
      {
        id: 'demo_r2',
        username: 'master_stream',
        name: 'Master Streaming SP',
        role: 'reseller',
        nivel: 1,
        status: 'ACTIVE',
        creditos: 85,
        pai_username: 'demo',
        linhagem: ['demo', 'master_stream'],
        total_clientes_diretos: 9,
        clientes_ativos_diretos: 8,
        total_sub_revendas: 0,
        sub_revendas: []
      }
    ]
  }
};
